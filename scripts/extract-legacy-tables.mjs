// Re-crawls each legacy page's original HTML, extracts the real <table> data as
// structured rows, and rewrites src/data/legacyPages.ts so the /sources/<slug>/
// pages can render clean tables instead of flattened text.
//
// Usage: node scripts/extract-legacy-tables.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFile = resolve(__dirname, "../src/data/legacyPages.ts");

// --- HTML entity decoding (site is ISO-8859-1 / latin1) ---
const DEC = (s) => s
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
  .replace(/&eacute;/gi, "é").replace(/&egrave;/gi, "è").replace(/&ecirc;/gi, "ê")
  .replace(/&agrave;/gi, "à").replace(/&acirc;/gi, "â").replace(/&ccedil;/gi, "ç")
  .replace(/&ocirc;/gi, "ô").replace(/&ugrave;/gi, "ù").replace(/&icirc;/gi, "î")
  .replace(/&iuml;/gi, "ï").replace(/&euml;/gi, "ë").replace(/&uuml;/gi, "ü")
  .replace(/&ouml;/gi, "ö").replace(/&auml;/gi, "ä").replace(/&deg;/gi, "°")
  .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&apos;/gi, "'")
  .replace(/&laquo;/gi, "«").replace(/&raquo;/gi, "»").replace(/&trade;/gi, "™")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");

const cellText = (h) => {
  const text = DEC(
    h.replace(/<br\s*\/?>/gi, " ").replace(/<img[^>]*>/gi, "").replace(/<[^>]+>/g, "")
  ).replace(/\s+/g, " ").trim();
  // Old FrontPage separator cells like "-----" carry no information.
  return /^[-–—\s]+$/.test(text) ? "" : text;
};

// Parse all <table> elements (nesting-aware) into raw rows of cells.
function extractRawTables(html) {
  const re = /<(\/?)(table|tr|td|th)\b([^>]*)>/gi;
  let m, cellOpen = null;
  const stack = [];
  const finished = [];
  while ((m = re.exec(html))) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrs = m[3] || "";
    const pos = m.index;
    const end = re.lastIndex;
    if (tag === "table") {
      if (!closing) stack.push({ rows: [] });
      else { const t = stack.pop(); if (t) finished.push(t); }
    } else if (tag === "tr") {
      const t = stack[stack.length - 1];
      if (!t) continue;
      if (!closing) t._row = [];
      else if (t._row) { t.rows.push(t._row); t._row = null; }
    } else if (tag === "td" || tag === "th") {
      const t = stack[stack.length - 1];
      if (!t || !t._row) continue;
      if (!closing) cellOpen = { tag, attrs, start: end, t };
      else if (cellOpen) {
        const inner = html.slice(cellOpen.start, pos);
        const cs = parseInt((cellOpen.attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || "1", 10);
        cellOpen.t._row.push({
          text: cellText(inner),
          header: cellOpen.tag === "th",
          cs,
          nested: /<table\b/i.test(inner)
        });
        cellOpen = null;
      }
    }
  }
  return finished;
}

// Turn a raw table into a compact, faithful model, or null if it is a layout
// table / not a real data grid.
function toModel(raw) {
  const rows = raw.rows.filter((r) => r.length);
  if (rows.length < 2) return null;
  if (Math.max(...rows.map((r) => r.length)) < 2) return null;
  if (rows.some((r) => r.some((c) => c.nested))) return null; // layout table
  const out = [];
  for (const r of rows) {
    const cells = r.map((c) => c.text);
    if (cells.every((c) => c === "")) continue; // skip fully empty rows
    const row = { c: cells };
    if (r.every((c) => c.header)) row.h = true;
    const spans = r.map((c) => c.cs);
    if (spans.some((s) => s > 1)) row.s = spans;
    out.push(row);
  }
  if (out.length < 2) return null;
  if (!out.some((r) => !r.h)) return null; // must have >=1 data row
  return { rows: out };
}

async function fetchLatin1(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString("latin1");
}

// Load current legacy pages via a regex-free dynamic import.
const mod = await import(`file://${dataFile.replace(/\\/g, "/")}`);
const pages = mod.legacyPages;

let withTables = 0;
for (const p of pages) {
  try {
    const html = await fetchLatin1(p.sourceUrl);
    const tables = extractRawTables(html).map(toModel).filter(Boolean);
    if (tables.length) {
      p.tables = tables;
      p.content = []; // flattened table text is now redundant garbage
      withTables += 1;
      console.log(`✓ ${p.slug} — ${tables.length} table(s), ${tables.reduce((a, t) => a + t.rows.length, 0)} rows`);
    } else {
      delete p.tables;
      console.log(`· ${p.slug} — no data table`);
    }
  } catch (e) {
    console.log(`✗ ${p.slug} — ${e.message} (kept as-is)`);
  }
}

// Serialize back to TS with a stable key order.
const KEY_ORDER = ["slug", "title", "sourceUrl", "destination", "summary", "content", "tables", "documents", "images", "externalLinks", "sourceLinks"];
const ordered = pages.map((p) => {
  const o = {};
  for (const k of KEY_ORDER) if (p[k] !== undefined) o[k] = p[k];
  return o;
});

const body = `import type { LegacyPage } from "./types";

export const legacyPages: LegacyPage[] = ${JSON.stringify(ordered, null, 2)};

export const getLegacyPagesByDestination = (destination: string) =>
  legacyPages.filter((page) => page.destination === destination);
`;

await writeFile(dataFile, body, "utf8");
console.log(`\nDone. ${withTables}/${pages.length} pages now have structured tables.`);
