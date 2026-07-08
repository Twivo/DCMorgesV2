import fs from "node:fs";
import path from "node:path";

const textExtensions = new Set([
  ".astro",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts"
]);

const roots = ["src", "public/admin", "scripts", "README.md", "docs"];
const errors = [];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const mojibakePattern = /Ã|Â|â[\u0080-\u00bf\u20ac\u0152\u0153\u2122\u2019\u201c\u201d\u2013\u2014]/u;
const hasMojibake = (value) => mojibakePattern.test(value);

const checkTextValue = (value, label) => {
  if (typeof value === "string") {
    if (value.includes("\uFFFD")) {
      errors.push(`${label}: contient le caractere de remplacement Unicode U+FFFD.`);
    }
    if (hasMojibake(value)) {
      errors.push(`${label}: contient une sequence d'encodage suspecte.`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => checkTextValue(item, `${label}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      checkTextValue(child, `${label}.${key}`);
    }
  }
};

const walk = (target) => {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  return fs.readdirSync(target).flatMap((name) => walk(path.join(target, name)));
};

const publicFileExists = (url) => {
  if (!url || typeof url !== "string" || !url.startsWith("/")) return true;
  const localPath = path.join("public", ...url.split("/").filter(Boolean));
  return fs.existsSync(localPath);
};

for (const file of roots.flatMap(walk)) {
  if (!textExtensions.has(path.extname(file))) continue;

  const text = fs.readFileSync(file, "utf8");
  if (text.includes("\uFFFD")) {
    errors.push(`${file}: contient le caractere de remplacement Unicode U+FFFD.`);
  }
}

const documents = readJson("src/data/documents.json");
const documentIds = new Set(documents.map((document) => document.id));

for (const dataFile of [
  "archiveGroups",
  "archives",
  "contactBlocks",
  "documents",
  "events",
  "legacyPages",
  "members",
  "news",
  "pages",
  "seasons",
  "site",
  "teams",
  "videos"
]) {
  checkTextValue(readJson(`src/data/${dataFile}.json`), dataFile);
}

for (const page of readJson("src/data/pages.json")) {
  const pageText = JSON.stringify(page);
  if (/\p{L}\?\p{L}|\s\?\s|\?\d/u.test(pageText)) {
    errors.push(`Point d'interrogation suspect dans la page ${page.id}.`);
  }
}

for (const document of documents) {
  if (!publicFileExists(document.url)) {
    errors.push(`Document introuvable: ${document.id} -> ${document.url}`);
  }
}

for (const news of readJson("src/data/news.json")) {
  const newsText = JSON.stringify(news);
  if (/\p{L}\?\p{L}|\s\?\s|\?\d/u.test(newsText)) {
    errors.push(`Point d'interrogation suspect dans la news ${news.slug}.`);
  }

  if (!publicFileExists(news.image)) {
    errors.push(`Image de news introuvable: ${news.slug} -> ${news.image}`);
  }

  for (const id of news.documents ?? []) {
    if (!documentIds.has(id)) {
      errors.push(`Document lie introuvable dans la news ${news.slug}: ${id}`);
    }
  }
}

for (const archive of readJson("src/data/archives.json")) {
  for (const id of archive.documentIds ?? []) {
    if (!documentIds.has(id)) {
      errors.push(`Document lie introuvable dans l'archive ${archive.id}: ${id}`);
    }
  }
}

const archiveIds = new Set(readJson("src/data/archives.json").map((archive) => archive.id));
for (const group of readJson("src/data/archiveGroups.json")) {
  for (const id of group.archiveIds ?? []) {
    if (!archiveIds.has(id)) {
      errors.push(`Archive introuvable dans le groupe ${group.id}: ${id}`);
    }
  }
}

for (const block of readJson("src/data/contactBlocks.json")) {
  for (const item of block.items ?? []) {
    if (!publicFileExists(item.href)) {
      errors.push(`Lien contact introuvable: ${block.id} -> ${item.href}`);
    }
  }
}

for (const page of readJson("src/data/legacyPages.json")) {
  for (const image of page.images ?? []) {
    if (!publicFileExists(image)) {
      errors.push(`Image de page source introuvable: ${page.slug} -> ${image}`);
    }
  }

  for (const document of page.documents ?? []) {
    if (!publicFileExists(document.url)) {
      errors.push(`Document de page source introuvable: ${page.slug} -> ${document.url}`);
    }
  }
}

for (const member of readJson("src/data/members.json")) {
  if (!publicFileExists(member.photo)) {
    errors.push(`Photo de membre introuvable: ${member.id} -> ${member.photo}`);
  }
}

for (const video of readJson("src/data/videos.json")) {
  if (!publicFileExists(video.url)) {
    errors.push(`Video introuvable: ${video.id} -> ${video.url}`);
  }
  if (!publicFileExists(video.thumbnail)) {
    errors.push(`Vignette video introuvable: ${video.id} -> ${video.thumbnail}`);
  }
}

const site = readJson("src/data/site.json");
if (!publicFileExists(site.info.logo)) {
  errors.push(`Logo introuvable: ${site.info.logo}`);
}
if (!publicFileExists(site.info.heroImage)) {
  errors.push(`Image hero introuvable: ${site.info.heroImage}`);
}

if (errors.length > 0) {
  console.error("Controle contenu echoue:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: contenu UTF-8 et references locales valides.");
