import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = "https://www.dcmorges.ch/";
const outputDir = path.resolve("migration");
const publicBase = new URL(baseUrl);
const htmlExtensions = new Set(["", ".html", ".htm", ".shtml", ".php", ".asp"]);
const assetExtensions = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".mp4",
  ".mov",
  ".avi",
  ".wmv"
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeResponse = async (response) => {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = response.headers.get("content-type") ?? "";
  let charset = header.match(/charset=([^;\s]+)/i)?.[1]?.trim().toLowerCase();

  if (!charset) {
    const ascii = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
    charset = ascii.match(/charset=["']?([^"'>;\s]+)/i)?.[1]?.trim().toLowerCase();
  }

  const decoder = new TextDecoder(charset || "windows-1252");
  return decoder.decode(bytes);
};

const stripHash = (url) => {
  const value = new URL(url);
  value.hash = "";
  return value.toString();
};

const normalizeInternalUrl = (raw, sourceUrl) => {
  if (!raw || raw.startsWith("#")) return undefined;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
  if (/^(mailto|tel|javascript):/i.test(trimmed)) return undefined;

  try {
    const url = new URL(trimmed, sourceUrl);
    if (url.hostname !== publicBase.hostname) return url.toString();
    return stripHash(url.toString());
  } catch {
    return undefined;
  }
};

const extensionOf = (url) => path.extname(new URL(url).pathname).toLowerCase();

const isHtmlUrl = (url) => {
  const ext = extensionOf(url);
  return htmlExtensions.has(ext);
};

const isAssetUrl = (url) => assetExtensions.has(extensionOf(url));

const extractAttributes = (html, attr) => {
  const results = [];
  const pattern = new RegExp(`${attr}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "gi");
  let match;
  while ((match = pattern.exec(html))) {
    results.push(match[1] || match[2] || match[3]);
  }
  return results;
};

const cleanText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|tr|td|th|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const pageTitle = (html, fallback) => {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanText(title || "") || path.basename(new URL(fallback).pathname) || "Accueil";
};

const classifyDestination = (url, title, text) => {
  const haystack = `${url} ${title} ${text.slice(0, 1200)}`.toLowerCase();
  if (haystack.includes("news")) return "News";
  if (haystack.includes("sda") || haystack.includes("interregio")) return "SDA";
  if (haystack.includes("lmf") || haystack.includes("ligue morgienne") || haystack.includes("ligue vaudoise")) return "LMF";
  if (haystack.includes("club") || haystack.includes("membre") || haystack.includes("joueur")) return "Club";
  if (haystack.includes("agenda") || haystack.includes("calendrier") || haystack.includes("tournoi")) return "Agenda";
  if (haystack.includes("archive") || haystack.includes("ancien") || haystack.includes("palmar")) return "Archives";
  if (haystack.includes("video") || haystack.includes("youtube")) return "Vidéos";
  if (haystack.includes("contact") || haystack.includes("@") || haystack.includes("iban")) return "Contact";
  return "Accueil";
};

const pages = new Map();
const assets = new Map();
const externalLinks = new Map();
const queue = [baseUrl];
const seen = new Set();

while (queue.length && seen.size < 500) {
  const current = queue.shift();
  if (!current || seen.has(current) || !isHtmlUrl(current)) continue;
  seen.add(current);

  let response;
  try {
    response = await fetch(current, {
      headers: { "user-agent": "DCMorgesContentMigration/1.0" },
      redirect: "follow"
    });
  } catch (error) {
    pages.set(current, { url: current, status: "fetch-error", error: String(error) });
    continue;
  }

  if (!response.ok) {
    pages.set(current, { url: current, status: response.status, error: response.statusText });
    continue;
  }

  const html = await decodeResponse(response);
  const title = pageTitle(html, current);
  const text = cleanText(html);
  const hrefs = extractAttributes(html, "href").map((href) => normalizeInternalUrl(href, current)).filter(Boolean);
  const srcs = extractAttributes(html, "src").map((src) => normalizeInternalUrl(src, current)).filter(Boolean);
  const internalLinks = [];
  const pageAssets = [];
  const pageExternal = [];

  for (const url of [...hrefs, ...srcs]) {
    const parsed = new URL(url);
    if (parsed.hostname === publicBase.hostname) {
      if (isHtmlUrl(url)) {
        internalLinks.push(url);
        if (!seen.has(url) && !queue.includes(url)) queue.push(url);
      } else if (isAssetUrl(url)) {
        pageAssets.push(url);
        const item = assets.get(url) ?? { url, extension: extensionOf(url), sources: [] };
        item.sources.push(current);
        assets.set(url, item);
      }
    } else {
      pageExternal.push(url);
      const item = externalLinks.get(url) ?? { url, sources: [] };
      item.sources.push(current);
      externalLinks.set(url, item);
    }
  }

  pages.set(current, {
    url: current,
    status: response.status,
    title,
    destination: classifyDestination(current, title, text),
    text,
    internalLinks: [...new Set(internalLinks)],
    assets: [...new Set(pageAssets)],
    externalLinks: [...new Set(pageExternal)]
  });

  await sleep(70);
}

const pageList = [...pages.values()].sort((a, b) => a.url.localeCompare(b.url));
const assetList = [...assets.values()]
  .map((asset) => ({ ...asset, sources: [...new Set(asset.sources)] }))
  .sort((a, b) => a.url.localeCompare(b.url));
const externalList = [...externalLinks.values()]
  .map((link) => ({ ...link, sources: [...new Set(link.sources)] }))
  .sort((a, b) => a.url.localeCompare(b.url));

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "crawl.json"), JSON.stringify({ pages: pageList, assets: assetList, externalLinks: externalList }, null, 2), "utf8");

const markdown = [
  "# Inventaire initial du site actuel",
  "",
  `Source racine : ${baseUrl}`,
  `Pages HTML analysées : ${pageList.length}`,
  `Assets publics détectés : ${assetList.length}`,
  `Liens externes détectés : ${externalList.length}`,
  "",
  "## Pages",
  "",
  "| Source | Type | Destination proposée | PDF liés | Images liées | Remarques |",
  "| --- | --- | --- | --- | --- | --- |",
  ...pageList.map((page) => {
    const pdfs = (page.assets ?? []).filter((url) => extensionOf(url) === ".pdf").map((url) => path.basename(new URL(url).pathname)).join("<br>") || "-";
    const images = (page.assets ?? []).filter((url) => [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(extensionOf(url))).map((url) => path.basename(new URL(url).pathname)).join("<br>") || "-";
    const remark = page.status === 200 ? page.title : `${page.status}: ${page.error ?? ""}`;
    return `| ${page.url} | HTML | ${page.destination ?? "-"} | ${pdfs} | ${images} | ${remark.replace(/\|/g, "\\|")} |`;
  }),
  "",
  "## Documents et médias",
  "",
  "| URL | Type | Sources |",
  "| --- | --- | --- |",
  ...assetList.map((asset) => `| ${asset.url} | ${asset.extension || "-"} | ${asset.sources.join("<br>")} |`),
  "",
  "## Liens externes",
  "",
  "| URL | Sources |",
  "| --- | --- |",
  ...externalList.map((link) => `| ${link.url} | ${link.sources.join("<br>")} |`)
];

await fs.writeFile(path.join(outputDir, "inventory.md"), markdown.join("\n"), "utf8");

console.log(JSON.stringify({ pages: pageList.length, assets: assetList.length, externalLinks: externalList.length }, null, 2));
