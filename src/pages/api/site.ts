import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { writeJsonAtomic } from "../../lib/fs";

export const prerender = false;

const file = resolve(process.cwd(), "src", "data", "site.json");

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export const GET: APIRoute = async () => {
  try {
    return json(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !body.info) {
      return json({ error: "Structure invalide (info manquant)." }, 400);
    }
    const next = {
      info: body.info,
      navigation: Array.isArray(body.navigation) ? body.navigation : [],
      quickLinks: Array.isArray(body.quickLinks) ? body.quickLinks : []
    };
    await writeJsonAtomic(file, next);
    return json(next);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON invalide." }, 400);
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};
