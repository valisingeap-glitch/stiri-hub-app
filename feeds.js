// feeds.js — Sursele de știri grupate pe teme.
//
// Fiecare temă are:
//   - "gnews": o interogare Google News RO. Aceasta agregă automat ZECI de
//     publicații românești pe tema respectivă și NU se strică în timp.
//   - "rss": feed-uri RSS directe (branduri unde vrem fluxul lor pur).
//
// Sursele EN rămân în EN; traducerea se face "la cerere" din aplicație.
//
// NOTĂ: linkurile RSS directe sunt verificate tehnic la pornirea backend-ului
// (vezi server.js -> /api/health-feeds). Dacă vreunul e mort, apare în log și
// îl poți scoate. Canalele "gnews" sunt întotdeauna valide.

// Helper: construiește un URL Google News RSS pentru o interogare, în română.
function gnews(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=ro&gl=RO&ceid=RO:ro`;
}

// Helper: Google News pe subiect/secțiune pentru o publicație anume.
function gnewsSite(query, extra = "") {
  return gnews(`${query} ${extra}`.trim());
}

const CATEGORIES = [
  {
    id: "actualitate",
    name: "📰 Actualitate & Politică",
    topics: [
      { id: "ro-general", name: "Știri România", gnews: gnews("România știri"),
        rss: [
          "https://www.g4media.ro/feed",
          "https://hotnews.ro/feed",
          "https://spotmedia.ro/feed",
          "https://www.digi24.ro/rss",
        ] },
      { id: "breaking", name: "Ultimă oră", gnews: gnews("ultima oră România"), rss: [] },
      { id: "politica-interna", name: "Politică internă", gnews: gnews("politică România Parlament Guvern"),
        rss: ["https://pressone.ro/feed"] },
      { id: "administratie", name: "Administrație locală", gnews: gnews("primărie administrație locală România"), rss: [] },
      { id: "justitie", name: "Justiție & Anticorupție", gnews: gnews("DNA justiție corupție România"), rss: [] },
      { id: "alegeri", name: "Alegeri & sondaje", gnews: gnews("alegeri sondaj România"), rss: [] },
      { id: "externe", name: "Politică externă / Diplomație", gnews: gnews("politică externă diplomație"), rss: [] },
      { id: "geopolitica", name: "Geopolitică", gnews: gnews("geopolitică analiză"),
        rss: ["https://www.aljazeera.com/xml/rss/all.xml"] },
      { id: "ue", name: "Uniunea Europeană", gnews: gnews("Uniunea Europeană Bruxelles"), rss: [] },
      { id: "nato", name: "NATO & apărare", gnews: gnews("NATO apărare armată"), rss: [] },
      { id: "ucraina", name: "Război Ucraina", gnews: gnews("Ucraina război"), rss: [] },
      { id: "sua", name: "SUA", gnews: gnews("Statele Unite SUA politică"), rss: [] },
      { id: "orientul-mijlociu", name: "Orientul Mijlociu", gnews: gnews("Orientul Mijlociu"), rss: [] },
      { id: "asia", name: "Asia (China, India)", gnews: gnews("China India Asia"), rss: [] },
      { id: "africa-latina", name: "Africa & America Latină", gnews: gnews("Africa America Latină"), rss: [] },
    ],
  },
  {
    id: "tehnologie",
    name: "💻 Tehnologie & Știință",
    topics: [
      { id: "tech-general", name: "Tehnologie", gnews: gnews("tehnologie"),
        rss: [
          "https://techcrunch.com/feed/",
          "https://www.engadget.com/rss.xml",
        ] },
      { id: "ai", name: "Inteligență artificială", gnews: gnews("inteligență artificială AI"),
        rss: [
          "https://www.technologyreview.com/feed/",
        ] },
      { id: "smartphone", name: "Smartphone & gadgeturi", gnews: gnews("telefon smartphone gadget"), rss: [] },
      { id: "hardware", name: "Laptopuri & hardware", gnews: gnews("laptop hardware PC"), rss: [] },
      { id: "programare", name: "Programare / Dev", gnews: gnews("programare software dezvoltare"),
        rss: ["https://news.ycombinator.com/rss"] },
      { id: "opensource", name: "Open source & Linux", gnews: gnews("open source Linux"), rss: [] },
      { id: "securitate", name: "Securitate cibernetică", gnews: gnews("securitate cibernetică hacking"),
        rss: ["https://krebsonsecurity.com/feed/"] },
      { id: "bigtech", name: "Big Tech", gnews: gnews("Apple Google Microsoft Meta"), rss: [] },
      { id: "spatiu", name: "Spațiu & explorare", gnews: gnews("spațiu NASA SpaceX rachetă"),
        rss: ["https://www.nasa.gov/feed/", "https://www.space.com/feeds/all"] },
      { id: "astronomie", name: "Astronomie", gnews: gnews("astronomie telescop planetă"), rss: [] },
      { id: "stiinta", name: "Știință", gnews: gnews("știință cercetare descoperire"),
        rss: ["https://www.sciencedaily.com/rss/all.xml", "https://phys.org/rss-feed/"] },
      { id: "fizica", name: "Fizică & cercetare", gnews: gnews("fizică cercetare"),
        rss: ["https://www.quantamagazine.org/feed/"] },
      { id: "biologie", name: "Biologie & genetică", gnews: gnews("biologie genetică ADN"), rss: [] },
      { id: "robotica", name: "Robotică & automatizare", gnews: gnews("robotică automatizare robot"), rss: [] },
      { id: "energie-nuclear", name: "Energie & nuclear", gnews: gnews("energie nucleară reactor"), rss: [] },
    ],
  },
  {
    id: "economie",
    name: "💰 Bani & Economie",
    topics: [
      { id: "eco-ro", name: "Economie România", gnews: gnews("economie România"),
        rss: ["https://www.profit.ro/rss", "https://www.zf.ro/rss", "https://economedia.ro/feed"] },
      { id: "eco-global", name: "Economie globală / Macro", gnews: gnews("economie globală macroeconomie"), rss: [] },
      { id: "burse", name: "Piețe & burse", gnews: gnews("bursă acțiuni piețe financiare"), rss: [] },
      { id: "crypto", name: "Crypto & blockchain", gnews: gnews("crypto blockchain"),
        rss: ["https://www.coindesk.com/arc/outboundfeeds/rss/", "https://cointelegraph.com/rss"] },
      { id: "bitcoin", name: "Bitcoin", gnews: gnews("Bitcoin"), rss: [] },
      { id: "investitii", name: "Investiții & finanțe personale", gnews: gnews("investiții finanțe personale economisire"), rss: [] },
      { id: "afaceri", name: "Afaceri & corporate", gnews: gnews("afaceri companii corporate"), rss: [] },
      { id: "startups", name: "Startups & VC", gnews: gnews("startup finanțare venture capital"),
        rss: ["https://www.start-up.ro/feed/"] },
      { id: "imobiliare", name: "Imobiliare", gnews: gnews("imobiliare apartamente preț"), rss: [] },
      { id: "inflatie", name: "Inflație & bănci centrale", gnews: gnews("inflație BNR bancă centrală dobândă"), rss: [] },
      { id: "petrol", name: "Energie & petrol (prețuri)", gnews: gnews("petrol gaze preț energie"), rss: [] },
      { id: "munca", name: "Muncă & joburi", gnews: gnews("locuri de muncă salariu angajări"), rss: [] },
    ],
  },
  {
    id: "sport",
    name: "⚽ Sport",
    topics: [
      { id: "sport-general", name: "Sport", gnews: gnews("sport România"), rss: [] },
      { id: "fotbal-ro", name: "Fotbal românesc", gnews: gnews("fotbal românesc Liga 1 națională"), rss: [] },
      { id: "fotbal-int", name: "Fotbal internațional", gnews: gnews("fotbal Champions League"), rss: [] },
      { id: "premier-league", name: "Premier League", gnews: gnews("Premier League"), rss: [] },
      { id: "la-liga", name: "La Liga / Serie A / Bundesliga", gnews: gnews("La Liga Serie A Bundesliga"), rss: [] },
      { id: "transferuri", name: "Transferuri fotbal", gnews: gnews("transferuri fotbal"), rss: [] },
      { id: "tenis", name: "Tenis", gnews: gnews("tenis ATP WTA"), rss: [] },
      { id: "f1", name: "Formula 1", gnews: gnews("Formula 1"),
        rss: ["https://www.motorsport.com/rss/f1/news/"] },
      { id: "nba", name: "Baschet / NBA", gnews: gnews("baschet NBA"), rss: [] },
      { id: "handbal", name: "Handbal", gnews: gnews("handbal"), rss: [] },
      { id: "mma-box", name: "MMA / Box", gnews: gnews("MMA box UFC"), rss: [] },
      { id: "ciclism", name: "Ciclism", gnews: gnews("ciclism"), rss: [] },
      { id: "olimpiada", name: "Jocuri Olimpice", gnews: gnews("Jocuri Olimpice"), rss: [] },
    ],
  },
  {
    id: "cultura",
    name: "🎬 Cultură & Divertisment",
    topics: [
      { id: "filme", name: "Filme & cinema", gnews: gnews("filme cinema premieră"),
        rss: ["https://variety.com/feed/", "https://www.hollywoodreporter.com/feed/"] },
      { id: "seriale", name: "Seriale & streaming", gnews: gnews("seriale Netflix HBO streaming"), rss: [] },
      { id: "muzica", name: "Muzică", gnews: gnews("muzică"), rss: [] },
      { id: "muzica-ro", name: "Muzică românească", gnews: gnews("muzică românească artist"), rss: [] },
      { id: "gaming", name: "Gaming", gnews: gnews("jocuri video gaming"),
        rss: ["https://feeds.feedburner.com/ign/games-all", "https://kotaku.com/rss"] },
      { id: "gaming-lansari", name: "Gaming (recenzii & lansări)", gnews: gnews("joc lansare recenzie gaming"),
        rss: ["https://www.pcgamer.com/rss/"] },
      { id: "esports", name: "Esports", gnews: gnews("esports competiție gaming"), rss: [] },
      { id: "carti", name: "Cărți & literatură", gnews: gnews("cărți literatură autor"), rss: [] },
      { id: "arta", name: "Artă & design", gnews: gnews("artă expoziție design"), rss: [] },
      { id: "teatru", name: "Teatru & spectacole", gnews: gnews("teatru spectacol"), rss: [] },
      { id: "monden", name: "Celebrități & monden", gnews: gnews("celebrități vedete monden"), rss: [] },
    ],
  },
  {
    id: "sanatate",
    name: "🏥 Viață & Sănătate",
    topics: [
      { id: "sanatate", name: "Sănătate & medicină", gnews: gnews("sănătate medicină"), rss: [] },
      { id: "nutritie", name: "Nutriție & alimentație", gnews: gnews("nutriție alimentație dietă"), rss: [] },
      { id: "fitness", name: "Fitness & antrenamente", gnews: gnews("fitness antrenament sport sală"), rss: [] },
      { id: "psihologie", name: "Sănătate mintală & psihologie", gnews: gnews("psihologie sănătate mintală"), rss: [] },
      { id: "dezvoltare", name: "Dezvoltare personală", gnews: gnews("dezvoltare personală productivitate"), rss: [] },
      { id: "parenting", name: "Parenting & familie", gnews: gnews("parenting copii familie"), rss: [] },
      { id: "relatii", name: "Relații", gnews: gnews("relații cuplu"), rss: [] },
      { id: "somn", name: "Somn & wellbeing", gnews: gnews("somn odihnă wellbeing"), rss: [] },
    ],
  },
  {
    id: "lifestyle",
    name: "🌍 Lifestyle & Diverse",
    topics: [
      { id: "calatorii", name: "Călătorii & turism", gnews: gnews("călătorii turism destinații"), rss: [] },
      { id: "auto", name: "Auto & mașini", gnews: gnews("auto mașini"),
        rss: ["https://www.autoblog.com/rss.xml"] },
      { id: "ev", name: "Mașini electrice & EV", gnews: gnews("mașini electrice EV"),
        rss: ["https://electrek.co/feed/", "https://insideevs.com/rss/articles/all/"] },
      { id: "moda", name: "Modă & stil", gnews: gnews("modă stil fashion"), rss: [] },
      { id: "gastronomie", name: "Gastronomie & rețete", gnews: gnews("gastronomie rețete bucătărie"), rss: [] },
      { id: "mediu", name: "Mediu & schimbări climatice", gnews: gnews("mediu climă schimbări climatice"),
        rss: ["https://grist.org/feed/"] },
      { id: "natura", name: "Natură & animale", gnews: gnews("natură animale sălbăticie"), rss: [] },
      { id: "educatie", name: "Educație & școală", gnews: gnews("educație școală învățământ"), rss: [] },
      { id: "agricultura", name: "Agricultură", gnews: gnews("agricultură fermieri"), rss: [] },
      { id: "amenajari", name: "Imobiliare & amenajări", gnews: gnews("amenajări locuință design interior"), rss: [] },
      { id: "meteo", name: "Meteo", gnews: gnews("meteo vreme prognoză România"), rss: [] },
      { id: "religie", name: "Religie & spiritualitate", gnews: gnews("religie spiritualitate biserică"), rss: [] },
      { id: "istorie", name: "Istorie", gnews: gnews("istorie descoperire istorică"),
        rss: ["https://www.smithsonianmag.com/rss/history/"] },
      { id: "foto-video", name: "Fotografie & video", gnews: gnews("fotografie aparat foto video"), rss: [] },
      { id: "diy", name: "DIY & meșterit", gnews: gnews("DIY meșterit"), rss: [] },
      { id: "gradinarit", name: "Grădinărit", gnews: gnews("grădinărit plante"), rss: [] },
    ],
  },
];

module.exports = { CATEGORIES };
