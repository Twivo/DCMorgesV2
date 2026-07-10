import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicSite = path.join(root, "public-site");
const errors = [];

const exists = (target) => fs.existsSync(path.join(root, target));

const walk = (target) => {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((name) => walk(path.join(target, name)));
};

const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt",
  ".ts",
  ".xml",
  ".yml",
  ".yaml"
]);

if (exists(".env")) errors.push(".env ne doit pas etre present dans le depot.");
if (exists(".env.local") && !fs.readFileSync(path.join(root, ".gitignore"), "utf8").includes(".env.*")) {
  errors.push(".env.local existe mais .gitignore ne couvre pas .env.*.");
}

if (fs.existsSync(publicSite)) {
  for (const forbidden of ["admin", "api", "server"]) {
    if (fs.existsSync(path.join(publicSite, forbidden))) {
      errors.push(`public-site/${forbidden} ne doit pas etre publie sur GitHub Pages.`);
    }
  }

  if (!fs.existsSync(path.join(publicSite, ".nojekyll"))) {
    errors.push("public-site/.nojekyll est manquant.");
  }

  const publicFiles = walk(publicSite).filter((file) => textExtensions.has(path.extname(file)));
  for (const file of publicFiles) {
    const rel = path.relative(root, file).replaceAll(path.sep, "/");
    const text = fs.readFileSync(file, "utf8");
    for (const forbidden of ["ADMIN_PASSWORD", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_WRITE_KEY"]) {
      if (text.includes(forbidden)) {
        errors.push(`${rel}: contient une reference serveur interdite (${forbidden}).`);
      }
    }
    if (/\/api\/(upload|site|pages|news|events|documents|members|teams|seasons|videos|archives)/.test(text)) {
      errors.push(`${rel}: contient un appel API admin qui ne doit pas etre publie.`);
    }
  }
}

const repoFiles = [
  ...walk(path.join(root, "src")),
  ...walk(path.join(root, "scripts")),
  ...walk(path.join(root, ".github"))
].filter((file) => textExtensions.has(path.extname(file)));

for (const file of repoFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const text = fs.readFileSync(file, "utf8");
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ/.test(text)) {
    errors.push(`${rel}: semble contenir une cle Supabase service role.`);
  }
  if (/ADMIN_PASSWORD\s*=\s*(?!change-me\b).{8,}/.test(text)) {
    errors.push(`${rel}: semble contenir un mot de passe admin reel.`);
  }
}

if (errors.length) {
  console.error("Controle securite echoue:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("OK: controle securite local et export public.");
