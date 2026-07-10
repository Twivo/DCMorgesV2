# Déploiement GitHub Pages

Le dépôt est prêt pour GitHub Pages via `.github/workflows/pages.yml`.

Le workflow publie uniquement `public-site/`, jamais `dist/server/`.

## Résumé

```bash
pnpm install
pnpm run build:pages
```

`build:pages` :

1. compile Astro;
2. exporte `dist/client` vers `public-site/`;
3. supprime toute trace `/admin` et `/api`;
4. ajoute `.nojekyll`;
5. lance `security:check`.

## Configuration GitHub

Dans le dépôt GitHub :

1. Aller dans **Settings → Pages**.
2. Mettre **Source** sur **GitHub Actions**.
3. Pousser sur `main`.

Le workflow se lance aussi manuellement via **Actions → Deploy GitHub Pages → Run workflow**.

## Variables GitHub

Dans **Settings → Secrets and variables → Actions → Variables** :

| Variable | Obligatoire | Exemple | Rôle |
| --- | --- | --- | --- |
| `SITE_URL` | Recommandé | `https://www.dcmorges.ch` | URL canonique et sitemap. |
| `BASE_PATH` | Projet sans domaine custom | `/DCMorgesV2` | Préfixe les liens/assets pour `https://twivo.github.io/DCMorgesV2/`. |
| `PAGES_CNAME` | Si domaine custom | `www.dcmorges.ch` | Génère `public-site/CNAME`. |
| `PUBLIC_SUPABASE_URL` | Si stats live actives | `https://xxxxx.supabase.co` | Endpoint Supabase public. |
| `PUBLIC_SUPABASE_ANON_KEY` | Si stats live actives | `ey...` | Clé anon publique Supabase. |
| `PUBLIC_SUPABASE_SCHEMA` | Optionnel | `public` | Schéma REST Supabase. |

Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` dans GitHub Pages.

## Ce qui est publié

GitHub Pages reçoit :

- HTML statique;
- CSS/JS public;
- images, PDF, vidéos;
- sitemap;
- robots.txt;
- `.nojekyll`;
- éventuellement `CNAME`.

GitHub Pages ne reçoit pas :

- `/admin`;
- `/api`;
- `dist/server`;
- `.env.local`;
- secrets admin;
- clé Supabase service role.

## Vérification locale

```bash
pnpm run build:pages
pnpm run preview:public
```

Ouvrir ensuite `http://127.0.0.1:4322`.

Contrôles utiles :

```bash
Test-Path public-site/admin
Test-Path public-site/api
Test-Path public-site/.nojekyll
```

Les deux premiers doivent être `False`, le dernier `True`.

## Admin

L'admin ne fonctionne pas sur GitHub Pages. Pour modifier le contenu :

1. lancer `pnpm run dev`;
2. ouvrir `/admin` en local;
3. modifier les contenus;
4. vérifier `git status --short`;
5. committer les JSON et uploads;
6. pousser sur `main`.

## Domaine custom

Si `PAGES_CNAME` est défini, le workflow écrit le fichier `CNAME`.

Il faut aussi configurer le DNS chez le registrar/hébergeur selon la documentation GitHub Pages.

## Supabase et stats live

La page `/lmf-stats-live/` est statique mais lit Supabase dans le navigateur.

La clé `anon` sera visible publiquement. C'est normal uniquement si Supabase RLS limite les lectures aux données publiques.

Checklist :

- RLS activé sur les tables;
- policies de lecture strictes;
- aucune clé service role côté public;
- pas d'écriture autorisée à la clé anon si non voulue.
