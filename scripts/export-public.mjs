// Copies the static public site (dist/client) to a clearly named `public-site/`
// folder ready to upload to any web host. This folder contains ONLY the public
// pages — never the admin or the API server.
import { rm, cp, access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const src = resolve(root, "dist", "client");
const dest = resolve(root, "public-site");

try {
  await access(src);
} catch {
  console.error("✗ dist/client introuvable. Lance d'abord « pnpm run build ».");
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });

// Strip any admin/API footprint that public/ assets may have copied in
// (e.g. public/admin/forms.js). The admin must leave no trace online.
for (const leftover of ["admin", "api"]) {
  await rm(resolve(dest, leftover), { recursive: true, force: true });
}

// GitHub Pages runs Jekyll by default; this keeps Astro assets copied exactly.
await writeFile(resolve(dest, ".nojekyll"), "");

const cname = process.env.PAGES_CNAME?.trim();
if (cname) {
  await writeFile(resolve(dest, "CNAME"), `${cname}\n`);
}

console.log("✓ Site public exporté dans : public-site/");
console.log("  → Téléverse le contenu de ce dossier à la racine de ton hébergeur.");
console.log("  ⚠ Ne mets JAMAIS en ligne dist/server (il contient l'admin et les API serveur).");
