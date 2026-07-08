import type { APIRoute } from "astro";
import { getCollection } from "../../../lib/collections";
import { updateItem, deleteItem, HttpError } from "../../../lib/store";

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export const PUT: APIRoute = async ({ params, request }) => {
  const def = getCollection(params.collection ?? "");
  if (!def) return json({ error: "Collection inconnue." }, 404);
  try {
    const payload = await request.json();
    const item = await updateItem(def, params.id ?? "", payload);
    return json(item);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "JSON invalide dans un champ." }, 400);
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const def = getCollection(params.collection ?? "");
  if (!def) return json({ error: "Collection inconnue." }, 404);
  if (def.allowDelete === false) return json({ error: "La suppression est désactivée pour cette collection." }, 405);
  try {
    await deleteItem(def, params.id ?? "");
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
};
