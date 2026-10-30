// App.js — Aplicația "Știri Hub".
//
// Trei ecrane simple, fără librării de navigație (ca să rămână ușor de compilat):
//   1. Listă de teme (grupate pe categorii).
//   2. Fluxul unei teme (știri agregate, pull-to-refresh, căutare).
//   3. Detaliu articol (cu butoanele "Tradu" și "Rezumat").
//
// Tot ce ține de rețea trece prin backend-ul tău (config.js -> BACKEND_URL).

import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Linking, ScrollView,
  StatusBar, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "./config";

// ---------- Culori ----------
const C = {
  bg: "#f2f4f7", card: "#ffffff", primary: "#0d6efd", text: "#1b1f24",
  muted: "#6b7280", border: "#e5e7eb", accent: "#0a58ca", chip: "#eef2ff",
};

// ---------- Helpers ----------
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "acum";
  if (diff < 3600) return `acum ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `acum ${Math.floor(diff / 3600)} h`;
  return `acum ${Math.floor(diff / 86400)} zile`;
}

async function api(path, opts) {
  const res = await fetch(`${BACKEND_URL}${path}`, opts);
  if (!res.ok) {
    let msg = `Eroare ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

// =====================================================================
//  ECRAN 1 — Lista de teme
// =====================================================================
function TopicsScreen({ onOpenTopic, favorites, toggleFavorite }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/api/categories")
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Centered><ActivityIndicator size="large" color={C.primary} /><Text style={s.muted}>Se încarcă temele…</Text></Centered>;
  if (error) return <Centered><Text style={s.errTitle}>Nu mă pot conecta la backend</Text><Text style={s.muted}>{error}</Text><Text style={[s.muted, { marginTop: 8 }]}>Verifică BACKEND_URL din config.js</Text></Centered>;

  // Construiește o listă plată: antete de categorie + teme.
  const favTopics = [];
  categories.forEach((c) => c.topics.forEach((t) => { if (favorites[t.id]) favTopics.push(t); }));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      {favTopics.length > 0 && (
        <View style={{ marginBottom: 18 }}>
          <Text style={s.catTitle}>⭐ Favorite</Text>
          <View style={s.grid}>
            {favTopics.map((t) => (
              <TopicChip key={"fav" + t.id} topic={t} onOpen={onOpenTopic} fav toggleFavorite={toggleFavorite} />
            ))}
          </View>
        </View>
      )}
      {categories.map((cat) => (
        <View key={cat.id} style={{ marginBottom: 18 }}>
          <Text style={s.catTitle}>{cat.name}</Text>
          <View style={s.grid}>
            {cat.topics.map((t) => (
              <TopicChip key={t.id} topic={t} onOpen={onOpenTopic} fav={!!favorites[t.id]} toggleFavorite={toggleFavorite} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function TopicChip({ topic, onOpen, fav, toggleFavorite }) {
  return (
    <TouchableOpacity style={s.chip} onPress={() => onOpen(topic)} activeOpacity={0.7}>
      <Text style={s.chipText} numberOfLines={2}>{topic.name}</Text>
      <TouchableOpacity onPress={() => toggleFavorite(topic.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ fontSize: 16 }}>{fav ? "⭐" : "☆"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// =====================================================================
//  ECRAN 2 — Fluxul unei teme
// =====================================================================
function FeedScreen({ topic, onBack, onOpenArticle }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api(`/api/feed/${topic.id}`);
      setItems(data.items || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [topic.id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = query.trim()
    ? items.filter((it) => (it.title || "").toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <View style={{ flex: 1 }}>
      <Header title={topic.name} onBack={onBack} />
      <View style={s.searchBar}>
        <Text style={{ color: C.muted, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Caută în această temă…"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {loading ? (
        <Centered><ActivityIndicator size="large" color={C.primary} /><Text style={s.muted}>Se adună știrile…</Text></Centered>
      ) : error ? (
        <Centered><Text style={s.errTitle}>Eroare la încărcare</Text><Text style={s.muted}>{error}</Text></Centered>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ListEmptyComponent={<Centered><Text style={s.muted}>Nicio știre găsită.</Text></Centered>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.article} onPress={() => onOpenArticle(item)} activeOpacity={0.7}>
              <Text style={s.articleTitle}>{item.title}</Text>
              {!!item.summary && <Text style={s.articleSummary} numberOfLines={2}>{item.summary}</Text>}
              <View style={s.articleMeta}>
                <Text style={s.metaSource} numberOfLines={1}>{item.source || "sursă"}</Text>
                <Text style={s.metaTime}>{timeAgo(item.date)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// =====================================================================
//  ECRAN 3 — Detaliu articol (cu Tradu + Rezumat)
// =====================================================================
function ArticleScreen({ article, onBack }) {
  const [translated, setTranslated] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(null); // "tr" | "sum" | null
  const [err, setErr] = useState(null);

  const doTranslate = async () => {
    setBusy("tr"); setErr(null);
    try {
      const body = [article.title, article.summary].filter(Boolean).join("\n\n");
      const data = await api("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      setTranslated(data.translated);
    } catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  const doSummarize = async () => {
    setBusy("sum"); setErr(null);
    try {
      const data = await api("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, text: article.summary }),
      });
      setSummary(data.summary);
    } catch (e) { setErr(e.message); }
    finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Articol" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.detailTitle}>{article.title}</Text>
        <View style={s.articleMeta}>
          <Text style={s.metaSource}>{article.source || "sursă"}</Text>
          <Text style={s.metaTime}>{timeAgo(article.date)}</Text>
        </View>

        {!!article.summary && <Text style={s.detailBody}>{article.summary}</Text>}

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={doTranslate} disabled={busy !== null}>
            {busy === "tr" ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>🌐 Tradu în română</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnDark]} onPress={doSummarize} disabled={busy !== null}>
            {busy === "sum" ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>✨ Rezumat</Text>}
          </TouchableOpacity>
        </View>

        {!!err && <Text style={[s.errTitle, { marginTop: 14 }]}>{err}</Text>}

        {!!translated && (
          <View style={s.aiBox}>
            <Text style={s.aiLabel}>🌐 Traducere</Text>
            <Text style={s.aiText}>{translated}</Text>
          </View>
        )}
        {!!summary && (
          <View style={s.aiBox}>
            <Text style={s.aiLabel}>✨ Rezumat</Text>
            <Text style={s.aiText}>{summary}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.btn, s.btnOutline, { marginTop: 20 }]} onPress={() => Linking.openURL(article.link)}>
          <Text style={[s.btnText, { color: C.primary }]}>Deschide articolul complet ↗</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ---------- Componente comune ----------
function Header({ title, onBack }) {
  return (
    <View style={s.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>‹ Înapoi</Text>
        </TouchableOpacity>
      )}
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 60 }} />
    </View>
  );
}
function Centered({ children }) {
  return <View style={s.centered}>{children}</View>;
}

// =====================================================================
//  ROOT — gestionează navigarea simplă între ecrane
// =====================================================================
export default function App() {
  const [screen, setScreen] = useState("topics"); // topics | feed | article
  const [topic, setTopic] = useState(null);
  const [article, setArticle] = useState(null);
  const [favorites, setFavorites] = useState({});

  useEffect(() => {
    AsyncStorage.getItem("favorites").then((v) => { if (v) setFavorites(JSON.parse(v)); });
  }, []);

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      AsyncStorage.setItem("favorites", JSON.stringify(next));
      return next;
    });
  };

  return (
    <SafeAreaView style={s.app}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={s.appBar}>
        <Text style={s.appBarText}>📰 Știri Hub</Text>
      </View>

      {screen === "topics" && (
        <TopicsScreen
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          onOpenTopic={(t) => { setTopic(t); setScreen("feed"); }}
        />
      )}
      {screen === "feed" && (
        <FeedScreen
          topic={topic}
          onBack={() => setScreen("topics")}
          onOpenArticle={(a) => { setArticle(a); setScreen("article"); }}
        />
      )}
      {screen === "article" && (
        <ArticleScreen article={article} onBack={() => setScreen("feed")} />
      )}
    </SafeAreaView>
  );
}

// ---------- Stiluri ----------
const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  appBar: { backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 16 },
  appBarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700", color: C.text },
  back: { color: C.primary, fontSize: 15, fontWeight: "600", width: 60 },
  catTitle: { fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.primary, paddingLeft: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: C.card, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "48%", minHeight: 52 },
  chipText: { fontSize: 13, fontWeight: "600", color: C.text, flex: 1, marginRight: 6 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, margin: 12, marginBottom: 0, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, paddingVertical: 10, color: C.text },
  article: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  articleTitle: { fontSize: 15, fontWeight: "700", color: C.text, lineHeight: 21 },
  articleSummary: { fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 18 },
  articleMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, alignItems: "center" },
  metaSource: { fontSize: 11, color: C.accent, fontWeight: "600", flex: 1, marginRight: 8 },
  metaTime: { fontSize: 11, color: C.muted },
  detailTitle: { fontSize: 20, fontWeight: "800", color: C.text, lineHeight: 28 },
  detailBody: { fontSize: 15, color: C.text, lineHeight: 23, marginTop: 14 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: C.primary },
  btnDark: { backgroundColor: "#1b1f24" },
  btnOutline: { borderWidth: 1.5, borderColor: C.primary, backgroundColor: "transparent" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  aiBox: { backgroundColor: C.chip, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#dbe4ff" },
  aiLabel: { fontSize: 12, fontWeight: "800", color: C.accent, marginBottom: 6 },
  aiText: { fontSize: 15, color: C.text, lineHeight: 23 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  muted: { color: C.muted, fontSize: 14, textAlign: "center" },
  errTitle: { color: "#dc2626", fontSize: 15, fontWeight: "700", textAlign: "center" },
});
