// server.js — Backend pentru aplicația de știri.
//
// Ce face:
//   1. Proxy pentru feed-uri RSS (rezolvă CORS + parsează XML -> JSON).
//   2. Traducere "la cerere" prin Gemini (titlu + text).
//   3. Rezumat prin Gemini.
//   4. Servește lista de categorii/teme către aplicație.
//
// Cheia Gemini stă DOAR aici, într-o variabilă de mediu (GEMINI_API_KEY),
// niciodată în aplicația Android. Așa nimeni nu ți-o poate fura din APK.
//
// Deploy pe Render: vezi README.md.

const express = require("express");
const Parser = require("rss-parser");
const cors = require("cors");
const { CATEGORIES } = require("./feeds");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsHub/1.0)" },
});

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-1.5-flash"; // rapid și gratuit pe nivelul free
const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

// ---- Cache simplu în memorie pentru feed-uri (reduce cereri repetate) ----
const feedCache = new Map(); // url -> { at, items }
const FEED_TTL_MS = 5 * 60 * 1000; // 5 minute

// ---------------------------------------------------------------------------
// 1. Lista de categorii/teme (fără linkurile brute — doar ce-i trebuie app-ului)
// ---------------------------------------------------------------------------
app.get("/api/categories", (_req, res) => {
  const out = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    topics: c.topics.map((t) => ({ id: t.id, name: t.name })),
  }));
  res.json(out);
});

// Găsește o temă după id (caută în toate categoriile).
function findTopic(topicId) {
  for (const c of CATEGORIES) {
    const t = c.topics.find((x) => x.id === topicId);
    if (t) return t;
  }
  return null;
}

// Parsează un feed cu cache.
async function fetchFeed(url) {
  const cached = feedCache.get(url);
  if (cached && Date.now() - cached.at < FEED_TTL_MS) return cached.items;
  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).map((it) => ({
      title: it.title || "",
      link: it.link || "",
      // descrierea: preferă contentSnippet (text curat), altfel content
      summary: (it.contentSnippet || it.content || "").slice(0, 600),
      date: it.isoDate || it.pubDate || null,
      source: feed.title || "",
    }));
    feedCache.set(url, { at: Date.now(), items });
    return items;
  } catch (e) {
    return []; // feed mort/indisponibil -> gol, nu dărâmă fluxul
  }
}

// ---------------------------------------------------------------------------
// 2. Fluxul unei teme: combină Google News + RSS directe, sortat pe dată.
// ---------------------------------------------------------------------------
app.get("/api/feed/:topicId", async (req, res) => {
  const topic = findTopic(req.params.topicId);
  if (!topic) return res.status(404).json({ error: "Temă necunoscută" });

  const urls = [topic.gnews, ...(topic.rss || [])].filter(Boolean);
  const results = await Promise.all(urls.map(fetchFeed));

  // Combină + deduplică după titlu + sortează descrescător pe dată.
  const seen = new Set();
  const all = [];
  for (const items of results) {
    for (const it of items) {
      const key = (it.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      all.push(it);
    }
  }
  all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  res.json({ topic: topic.name, count: all.length, items: all.slice(0, 100) });
});

// ---------------------------------------------------------------------------
// 3. Helper Gemini
// ---------------------------------------------------------------------------
async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY lipsește din mediul serverului.");
  const resp = await fetch(GEMINI_URL(GEMINI_MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Răspuns Gemini gol.");
  return text.trim();
}

// ---------------------------------------------------------------------------
// 4. Traducere "la cerere" (titlu + text) -> română
// ---------------------------------------------------------------------------
app.post("/api/translate", async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "Lipsește 'text'." });
  try {
    const prompt =
      "Tradu următorul text în limba română, natural și fluent. " +
      "Răspunde DOAR cu traducerea, fără alte comentarii:\n\n" + text;
    const translated = await callGemini(prompt);
    res.json({ translated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Rezumat în română
// ---------------------------------------------------------------------------
app.post("/api/summarize", async (req, res) => {
  const { title, text } = req.body || {};
  const body = [title, text].filter(Boolean).join("\n\n");
  if (!body) return res.status(400).json({ error: "Lipsește conținutul." });
  try {
    const prompt =
      "Rezumă în limba română, în 2-3 propoziții clare, următoarea știre. " +
      "Răspunde DOAR cu rezumatul:\n\n" + body;
    const summary = await callGemini(prompt);
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Verificare feed-uri (diagnostic — vezi care RSS direct e mort)
// ---------------------------------------------------------------------------
app.get("/api/health-feeds", async (_req, res) => {
  const report = [];
  for (const c of CATEGORIES) {
    for (const t of c.topics) {
      for (const url of t.rss || []) {
        const items = await fetchFeed(url);
        report.push({ topic: t.id, url, ok: items.length > 0, items: items.length });
      }
    }
  }
  res.json({ checked: report.length, dead: report.filter((r) => !r.ok), report });
});

app.get("/", (_req, res) => res.send("News backend OK. Vezi /api/categories"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend pornit pe portul ${PORT}`));
