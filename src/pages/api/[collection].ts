import type { APIRoute } from "astro";
import { getCollection } from "../../lib/collections";
import { readAll, createItem, HttpError } from "../../lib/store";

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export const GET: APIRoute = async ({ params }) => {
  const def = getCollection(params.collection ?? "");
  if (!def) return json({ error: "Collection inconnue." }, 404);
  try {
    return json(await readAll(def));
  } catch (error) {
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const def = getCollection(params.collection ?? "");
  if (!def) return json({ error: "Collection inconnue." }, 404);
  if (def.allowCreate === false) return json({ error: "La création est désactivée pour cette collection." }, 405);
  try {
    const payload = await request.json();
    const item = await createItem(def, payload);
    return json(item, 201);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "JSON invalide dans un champ." }, 400);
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};
