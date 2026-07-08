import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { slugify } from "../../lib/collections";

export const prerender = false;

const uploadsDir = resolve(process.cwd(), "public", "uploads");
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// Only allow inert document / raster-image / video types. SVG, HTML, JS, etc.
// are excluded: served from our own origin they could run scripts (stored XSS)
// or host malicious content on the club's domain.
const ALLOWED_EXT = new Set([
  ".pdf",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp",
  ".mp4", ".webm", ".mov", ".m4v", ".ogg", ".ogv"
]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Aucun fichier reçu." }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Fichier trop volumineux (max 25 Mo)." }, 400);
    }

    const ext = extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
    if (!ALLOWED_EXT.has(ext)) {
      return json(
        { error: "Type de fichier non autorisé. Formats acceptés : PDF, images (JPG, PNG, GIF, WEBP…) et vidéos (MP4, WEBM…)." },
        400
      );
    }
    const base = slugify(basename(file.name, extname(file.name))) || "fichier";
    const name = `${base}-${randomBytes(4).toString("hex")}${ext}`;

    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(resolve(uploadsDir, name), buffer);

    return json({ url: `/uploads/${name}`, name: file.name, size: file.size }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};
