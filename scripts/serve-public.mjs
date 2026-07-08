// Serves the exported `public-site/` folder as plain static files (no Astro, no
// Node adapter) to preview exactly what will be published online.
// Usage: node scripts/serve-public.mjs  (then open http://127.0.0.1:4322)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, join, normalize } from "node:path";

const rootDir = resolve(process.cwd(), "public-site");
const port = Number(process.env.PORT) || 4322;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

const send = (res, status, body, type) => {
  res.writeHead(status, { "content-type": type || "text/plain; charset=utf-8" });
  res.end(body);
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    // Prevent path traversal.
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(rootDir, safe);
    if (safe.endsWith("/") || extname(safe) === "") filePath = join(filePath, "index.html");
    try {
      const data = await readFile(filePath);
      send(res, 200, data, TYPES[extname(filePath)] || "application/octet-stream");
    } catch {
      const notFound = await readFile(join(rootDir, "404.html")).catch(() => "404");
      send(res, 404, notFound, "text/html; charset=utf-8");
    }
  } catch (error) {
    send(res, 500, String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Aperçu du site public : http://127.0.0.1:${port}`);
});
