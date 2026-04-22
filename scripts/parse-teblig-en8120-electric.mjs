#!/usr/bin/env node
/**
 * Parses public Tebliğ-style periodic checklist scrape (electric / TS EN 81-20 scope)
 * into revision_articles JSON for import-revision-articles.mjs.
 *
 * Tier heuristic (NOT normative — A tipi kuruluş kararı geçerlidir):
 * - Title ends with **  → ticket_tier red   (kritik güvenlik / güvensiz riski yüksek)
 * - Title ends with *   → ticket_tier yellow (önemli uygunsuzluk / kusur bandı)
 * - else                → ticket_tier blue   (hafif kusur / idari-teknik düzeltme sıklığı)
 *
 * Usage:
 *   node scripts/parse-teblig-en8120-electric.mjs > data/en8120-teblig-ek1-electric.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = path.join(__dirname, "..", "data", "sources", "arge7-en8120-electric-raw.txt");

const text = fs.readFileSync(rawPath, "utf8");
const lines = text.split(/\r?\n/);

/** Main checklist row: "1.1.Foo*" / "2.12. Bar" / "1.30Priz" — not "4.1- bullet" */
function matchHeader(line) {
  const t = line.trim();
  if (!t || t.startsWith("#") || t.startsWith("[")) return null;
  // Sub-bullets like "4.1- En az IP"
  if (/^\d+\.\d+-/.test(t)) return null;
  const m = t.match(/^(\d+\.\d+)([\s.]*)(.+)$/);
  if (!m) return null;
  const code = m[1];
  let title = (m[3] ?? "").trim();
  if (!title) return null;
  // Skip table header row
  if (code === "1.1" && title.startsWith("Makina") === false && title.includes("Kontrol Kriteri")) return null;
  return { code, title };
}

function tierFromTitle(title) {
  let t = title.trim();
  let tier = "blue";
  if (t.endsWith("**")) {
    tier = "red";
    t = t.slice(0, -2).trim();
  } else if (/\*\s*["\u201c\u00ab]/.test(t) || /\*\s*$/.test(t)) {
    tier = "yellow";
    t = t.replace(/\*\s*/, " ").trim();
  }
  t = t.replace(/^["«»]+|["«»]+$/g, "").trim();
  t = t.replace(/\s+"Türkçe\s*$/i, " (Türkçe)");
  return { cleanTitle: t, tier };
}

const headers = [];
for (const line of lines) {
  const h = matchHeader(line);
  if (h) headers.push(h);
}

const disclaimer =
  "Kaynak: Kamuya açık Tebliğ Ek-1 (elektrik tahrikli / TS EN 81-20) kontrol kriteri özetleri ve uygunsuzluk tanımları (üçüncü taraf web derlemesi). " +
  "TS EN 81-20 tam metni ve A tipi muayene kuruluşu değerlendirmesi esastır. " +
  "ticket_tier: liste başlığındaki * sayısına göre otomatik tahmin (**: kırmızı banda yakın kritik, *: sarı banda yakın, yok: mavi banda yakın).";

const articles = [];
const seen = new Set();
for (let i = 0; i < headers.length; i++) {
  const { code, title: rawTitle } = headers[i];
  if (seen.has(code)) continue;
  seen.add(code);
  const { cleanTitle, tier } = tierFromTitle(rawTitle);
  const start = lines.findIndex((l) => {
    const x = l.trim();
    return x.startsWith(`${code}.`) || x.startsWith(`${code} `) || x.startsWith(`${code}"`);
  });
  let body = "";
  if (start >= 0) {
    const buf = [];
    for (let j = start + 1; j < lines.length; j++) {
      const ln = lines[j];
      if (matchHeader(ln)) break;
      if (ln.trim()) buf.push(ln.trim());
    }
    body = buf.join("\n").slice(0, 4000);
  }
  articles.push({
    article_code: code,
    title: cleanTitle,
    description: [disclaimer, body ? `\n\nUygunsuzluk örnekleri (özet):\n${body}` : ""].join("").trim(),
    default_cost_try: null,
    ticket_tier: tier,
  });
}

articles.sort((a, b) => {
  const pa = a.article_code.split(".").map(Number);
  const pb = b.article_code.split(".").map(Number);
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    const da = pa[k] ?? 0;
    const db = pb[k] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
});

process.stdout.write(JSON.stringify(articles, null, 2) + "\n");
