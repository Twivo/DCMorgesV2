import fs from "node:fs/promises";
import path from "node:path";

const crawl = JSON.parse(await fs.readFile("migration/crawl.json", "utf8"));
const outputRoot = path.resolve("public", "legacy");
const base = new URL("https://www.dcmorges.ch/");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const localPathForUrl = (url) => {
  const parsed = new URL(url);
  const decodedPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  return path.join(outputRoot, decodedPath);
};

const publicPathForUrl = (url) => {
  const parsed = new URL(url);
  const decodedPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  return `/legacy/${decodedPath.split(path.sep).join("/")}`;
};

const results = [];

for (const asset of crawl.assets) {
  const url = asset.url;
  const parsed = new URL(url);
  if (parsed.hostname !== base.hostname) continue;

  const filePath = localPathForUrl(url);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const response = await fetch(url, {
      headers: { "user-agent": "DCMorgesContentMigration/1.0" },
      redirect: "follow"
    });

    if (!response.ok) {
      results.push({ url, status: response.status, error: response.statusText });
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    await fs.writeFile(filePath, bytes);
    results.push({ url, status: response.status, bytes: bytes.length, localPath: publicPathForUrl(url) });
  } catch (error) {
    results.push({ url, status: "error", error: String(error) });
  }

  await sleep(40);
}

await fs.writeFile("migration/downloaded-assets.json", JSON.stringify(results, null, 2), "utf8");

const ok = results.filter((item) => item.status === 200).length;
const failed = results.length - ok;
console.log(JSON.stringify({ total: results.length, ok, failed }, null, 2));
