// One-off image optimisation:
//  - converts every heavy .bmp portrait under public/ to .jpg (jimp reads BMP),
//  - converts the large hero PNG to WebP (sharp),
//  - repoints all references in the data files,
//  - deletes the originals only after a successful conversion.
// Usage: node scripts/optimize-images.mjs
import { readFile, writeFile, readdir, stat, rm } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { Jimp } from "jimp";
import sharp from "sharp";

const root = process.cwd();
const publicDir = resolve(root, "public");
const dataDir = resolve(root, "src", "data");

const toUrl = (filePath) => filePath.slice(publicDir.length).replace(/\\/g, "/");

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = await walk(publicDir);
const bmps = all.filter((f) => extname(f).toLowerCase() === ".bmp");
console.log(`Photos .bmp trouvées : ${bmps.length}`);

// slug -> { from, to } url replacements applied to the data files
const replacements = [];
let converted = 0, failed = 0, savedBytes = 0;

for (const bmp of bmps) {
  const jpg = bmp.slice(0, -4) + ".jpg";
  try {
    const before = (await stat(bmp)).size;
    const img = await Jimp.read(bmp);
    if (img.bitmap.width > 1000) img.resize({ w: 1000 });
    const buf = await img.getBuffer("image/jpeg", { quality: 82 });
    if (!buf || buf.length === 0) throw new Error("buffer vide");
    await writeFile(jpg, buf);
    const after = (await stat(jpg)).size;
    savedBytes += before - after;
    replacements.push({ from: toUrl(bmp), to: toUrl(jpg) });
    await rm(bmp, { force: true });
    converted += 1;
  } catch (e) {
    failed += 1;
    console.log(`  ✗ ${toUrl(bmp)} — ${e.message}`);
  }
}

// Hero PNG -> WebP
const heroPng = resolve(publicDir, "images", "darts-hero.png");
try {
  const before = (await stat(heroPng)).size;
  const heroWebp = resolve(publicDir, "images", "darts-hero.webp");
  await sharp(heroPng).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 78 }).toFile(heroWebp);
  const after = (await stat(heroWebp)).size;
  savedBytes += before - after;
  replacements.push({ from: "/images/darts-hero.png", to: "/images/darts-hero.webp" });
  await rm(heroPng, { force: true });
  console.log(`Hero : ${Math.round(before / 1024)} Ko PNG -> ${Math.round(after / 1024)} Ko WebP`);
} catch (e) {
  console.log(`  ✗ hero — ${e.message}`);
}

// Apply reference replacements to the data files.
const dataFiles = ["members.json", "legacyPages.json", "site.json"];
let refUpdates = 0;
for (const file of dataFiles) {
  const path = resolve(dataDir, file);
  let text = await readFile(path, "utf8");
  let n = 0;
  for (const { from, to } of replacements) {
    const parts = text.split(from);
    n += parts.length - 1;
    text = parts.join(to);
  }
  if (n > 0) { await writeFile(path, text, "utf8"); refUpdates += n; console.log(`  ${file}: ${n} référence(s) mises à jour`); }
}

console.log(`\n✓ Converties : ${converted} | échecs : ${failed} | références mises à jour : ${refUpdates}`);
console.log(`  Espace économisé : ${(savedBytes / 1024 / 1024).toFixed(1)} Mo`);
