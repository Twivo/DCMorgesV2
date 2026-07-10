// Smoke-test suite for the running dev server.
//   1) Lance le serveur :  pnpm run dev
//   2) Dans un autre terminal :  pnpm run qa   (ou: node scripts/qa.mjs)
//
// Exerce toutes les pages publiques, toutes les pages admin, le CRUD complet de
// chaque collection (création/modification/suppression, nettoyés), les champs
// structurés, la validation, les permissions, l'upload et les réglages du site.
// Aucune donnée réelle n'est modifiée (round-trips sur des éléments jetables).
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.env.QA_BASE || "http://127.0.0.1:4321";
const ORIGIN = BASE;
let pass = 0, fail = 0;
const failures = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^["']|["']$/g, "")];
      })
  );
}

const localEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
const adminUser = process.env.ADMIN_USER || process.env.QA_ADMIN_USER || localEnv.ADMIN_USER;
const adminPassword = process.env.ADMIN_PASSWORD || process.env.QA_ADMIN_PASSWORD || localEnv.ADMIN_PASSWORD;
const authHeader = adminUser && adminPassword
  ? `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString("base64")}`
  : "";

const protectedPath = (path) => path.startsWith("/admin") || path.startsWith("/api");

function once(method, path, { json } = {}) {
  return new Promise((done) => {
    const body = json !== undefined ? JSON.stringify(json) : undefined;
    const u = new URL(BASE + path);
    const headers = {
      origin: ORIGIN,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(authHeader && protectedPath(path) ? { authorization: authHeader } : {})
    };
    const r = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
        headers },
      (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => done({ status: res.statusCode, body: d })); }
    );
    r.on("error", (e) => done({ status: 0, body: String(e) }));
    if (body) r.write(body);
    r.end();
  });
}

// Retry on connection failure so a dev-server HMR restart doesn't cause flaky
// failures (the built server does not have this).
async function req(method, path, opts) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await once(method, path, opts);
    if (res.status !== 0) return res;
    await sleep(400);
  }
  return { status: 0, body: "connexion impossible" };
}
function check(name, cond, detail = "") {
  if (cond) pass++;
  else { fail++; failures.push(`${name} ${detail}`); console.log("  ✗ " + name + " " + detail); }
}
const jparse = (s) => { try { return JSON.parse(s); } catch { return null; } };

console.log("\n[1] Pages publiques");
for (const p of ["/", "/news/", "/sda/", "/lmf/", "/club/", "/agenda/", "/archives/", "/videos/", "/contact/",
  "/sources/archives-halloffame-lmf-championnat-htm/", "/robots.txt", "/favicon.ico", "/logo.gif"]) {
  const r = await req("GET", p);
  check("GET " + p, r.status === 200, "-> " + r.status);
}
check("GET 404", (await req("GET", "/page-inexistante-xyz/")).status === 404);

console.log("\n[2] Pages admin");
const collections = [
  "pages",
  "news",
  "events",
  "documents",
  "home-documents",
  "sda-documents",
  "lmf-documents",
  "members",
  "club-palmares",
  "teams",
  "seasons",
  "videos",
  "archives",
  "archive-groups",
  "contact-blocks",
  "legacy-pages"
];
for (const p of ["/admin","/admin/content","/admin/site","/admin/media", ...collections.map((c) => "/admin/" + c), "/admin/pages?edit=sda"]) {
  const r = await req("GET", p);
  check("GET " + p, r.status === 200, "-> " + r.status);
}

console.log("\n[3] CRUD API (create/update/delete)");
const specs = {
  news: { idKey: "slug", create: { title: "__qa_test__", date: "2019-01-01", content: "P1.\n\nP2.", documents: [] } },
  events: { idKey: "id", create: { title: "__qa_test__", date: "2019-01-01", time: "20h" } },
  documents: { idKey: "id", create: { title: "__qa_test__", competition: "QA", season: "2019-20" } },
  "home-documents": { idKey: "id", create: { title: "__qa_test__", competition: "QA", season: "2019-20" } },
  "sda-documents": { idKey: "id", create: { title: "__qa_test__", competition: "SDA", season: "2019-20", order: 1 } },
  "lmf-documents": { idKey: "id", create: { title: "__qa_test__", competition: "LMF", season: "2019-20", order: 1 } },
  members: { idKey: "id", create: { firstName: "__qa__", lastName: "__test__" } },
  "club-palmares": { idKey: "id", create: { season: "2099 / 2100", competition: "__qa_test__", result: "__qa_result__", order: 999999 } },
  teams: { idKey: "id", create: { name: "__qa_test__", members: ["A", "B"] } },
  seasons: { idKey: "id", create: { label: "__qa_test__" } },
  videos: { idKey: "id", create: { title: "__qa_test__", year: "2019" } },
  archives: { idKey: "id", create: { title: "__qa_test__", documentIds: [], links: [{ label: "L", href: "/x" }] } },
  "archive-groups": { idKey: "id", create: { title: "__qa_test__", archiveIds: [] } },
  "contact-blocks": { idKey: "id", create: { title: "__qa_test__", items: [{ label: "Tel", value: "123" }] } },
  "legacy-pages": { idKey: "slug", create: { title: "__qa_test__", destination: "Club", content: "X." } }
};
for (const [name, spec] of Object.entries(specs)) {
  const created = jparse((await req("POST", "/api/" + name, { json: spec.create })).body);
  const id = created && created[spec.idKey];
  check(`POST ${name}`, Boolean(id));
  if (!id) continue;
  const list = jparse((await req("GET", "/api/" + name)).body) || [];
  check(`GET ${name} contient l'élément`, list.some((x) => x[spec.idKey] === id));
  const upd = await req("PUT", `/api/${name}/${encodeURIComponent(id)}`, { json: { ...spec.create, title: "__qa_upd__", name: "__qa_upd__", label: "__qa_upd__", lastName: "__qa_upd__" } });
  check(`PUT ${name}`, upd.status === 200, "-> " + upd.status);
  check(`DELETE ${name}`, (await req("DELETE", `/api/${name}/${encodeURIComponent(id)}`)).status === 200);
  const list2 = jparse((await req("GET", "/api/" + name)).body) || [];
  check(`${name} supprimé`, !list2.some((x) => x[spec.idKey] === id));
}

console.log("\n[4] Champs structurés");
{
  const it = jparse((await req("POST", "/api/legacy-pages", { json: { title: "__qa_struct__", destination: "Club", content: "A.\n\nB.\n\nC." } })).body);
  check("paragraphs -> 3 paragraphes", Array.isArray(it?.content) && it.content.length === 3);
  if (it?.slug) await req("DELETE", "/api/legacy-pages/" + it.slug);
  const it2 = jparse((await req("POST", "/api/archives", { json: { title: "__qa_rep__", documentIds: [], links: [{ label: "A", href: "/a" }, { label: "", href: "" }] } })).body);
  check("repeater ignore les lignes vides", Array.isArray(it2?.links) && it2.links.length === 1);
  if (it2?.id) await req("DELETE", "/api/archives/" + it2.id);
}

console.log("\n[5] Validation & permissions");
check("champ requis manquant -> 400", (await req("POST", "/api/news", { json: { date: "2020-01-01" } })).status === 400);
check("collection inconnue -> 404", (await req("GET", "/api/collection-inexistante")).status === 404);
check("pages: création interdite -> 405", (await req("POST", "/api/pages", { json: { label: "x", path: "/x", seoTitle: "x", heroTitle: "x" } })).status === 405);
check("pages: suppression interdite -> 405", (await req("DELETE", "/api/pages/home")).status === 405);

console.log("\n[6] Upload");
function uploadOnce(filename, content, withOrigin = true) {
  return new Promise((done) => {
    const boundary = "----qa" + Date.now();
    const buf = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      Buffer.from(content), Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    const u = new URL(BASE + "/api/upload");
    const headers = { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": buf.length };
    if (withOrigin) headers.origin = ORIGIN;
    if (authHeader) headers.authorization = authHeader;
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: "POST", headers },
      (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => done({ status: res.statusCode, body: d })); });
    r.on("error", (e) => done({ status: 0, body: String(e) }));
    r.write(buf); r.end();
  });
}
async function uploadRaw(filename, content, withOrigin = true) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await uploadOnce(filename, content, withOrigin);
    if (res.status !== 0) return res;
    await sleep(400);
  }
  return { status: 0, body: "connexion impossible" };
}
const okPng = await uploadRaw("qa.png", Buffer.from("\x89PNG fake"));
check("upload .png -> 201", okPng.status === 201);
check("upload .svg refusé -> 400", (await uploadRaw("qa.svg", Buffer.from("<svg/>"))).status === 400);
check("upload sans Origin refusé -> 403", (await uploadRaw("qa.png", Buffer.from("x"), false)).status === 403);
// Nettoyage du fichier test uploadé (accès disque local).
const upUrl = jparse(okPng.body)?.url;
if (upUrl) await rm(resolve(process.cwd(), "public", upUrl.replace(/^\//, "")), { force: true }).catch(() => {});

console.log("\n[7] Réglages du site");
const site = jparse((await req("GET", "/api/site")).body);
check("GET /api/site", Boolean(site?.info?.name));
if (site?.info) check("PUT /api/site (no-op)", (await req("PUT", "/api/site", { json: site })).status === 200);

console.log(`\n===== RÉSULTAT: ${pass} OK / ${fail} échec(s) =====`);
if (failures.length) { console.log("Échecs:"); failures.forEach((f) => console.log("  - " + f)); }
process.exit(fail ? 1 : 0);
