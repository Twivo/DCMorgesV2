// Copies the static public site (dist/client) to a clearly named `public-site/`
// folder ready to upload to any web host. This folder contains ONLY the public
// pages — never the admin or the API server.
import { rm, cp, access, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const src = resolve(root, "dist", "client");
const dest = resolve(root, "public-site");
const rawBase = process.env.BASE_PATH?.trim() || "";
const basePath = rawBase ? `/${rawBase.replace(/^\/+|\/+$/g, "")}` : "";
const siteUrl = process.env.SITE_URL?.trim();

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

const textExtensions = new Set([".css", ".html", ".js", ".json", ".txt", ".webmanifest", ".xml"]);

async function* walk(dir) {
  for (const entry of await readdir(dir)) {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

function prefixProjectPath(content) {
  if (!basePath) return content;
  const baseSegment = basePath.slice(1);
  const prefixPath = (path) => (
    path === baseSegment || path.startsWith(`${baseSegment}/`) ? `/${path}` : `${basePath}/${path}`
  );
  return content
    .replace(/\b(href|src|action|poster)=(["'])\/(?!\/)([^"']*)/g, (_match, attr, quote, path) =>
      `${attr}=${quote}${prefixPath(path)}`
    )
    .replace(/\bsrcset=(["'])([^"']+)\1/g, (_match, quote, value) => {
      const prefixed = value.replace(/(^|,\s*)\/(?!\/)([^,\s]+)/g, (_item, prefix, path) =>
        `${prefix}${prefixPath(path)}`
      );
      return `srcset=${quote}${prefixed}${quote}`;
    })
    .replace(/url\((["']?)\/(?!\/)([^)"']*)/g, (_match, quote, path) =>
      `url(${quote}${prefixPath(path)}`
    )
    .replace(/url\(&quot;\/(?!\/)([^&]*)/g, (_match, path) =>
      `url(&quot;${prefixPath(path)}`
    );
}

for await (const file of walk(dest)) {
  if (!textExtensions.has(extname(file))) continue;
  let content = await readFile(file, "utf8");
  content = prefixProjectPath(content);
  if (siteUrl && file.endsWith("robots.txt")) {
    content = content.replace(/^Sitemap: .+$/m, `Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap-index.xml`);
  }
  await writeFile(file, content);
}

console.log("✓ Site public exporté dans : public-site/");
if (basePath) {
  console.log(`  → Chemins publics préfixés pour GitHub Pages : ${basePath}/`);
}
console.log("  → Téléverse le contenu de ce dossier à la racine de ton hébergeur.");
console.log("  ⚠ Ne mets JAMAIS en ligne dist/server (il contient l'admin et les API serveur).");
