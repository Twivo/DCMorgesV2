# Darts Club Morges - Nouveau site

Site moderne du Darts Club Morges, construit avec Astro et rempli avec les contenus publics récupérés depuis `https://www.dcmorges.ch/`.

Le projet combine :

- un site public statique rapide;
- une administration locale protégée pour modifier les contenus;
- un export GitHub Pages sans admin ni API;
- une page cachée de stats live LMF alimentée par Supabase.

## Démarrage

```bash
pnpm install
cp .env.example .env.local
pnpm run dev
```

Renseigner au minimum dans `.env.local` :

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=un-mot-de-passe-local
```

Site local : `http://127.0.0.1:4321`

Admin locale : `http://127.0.0.1:4321/admin`

## Documentation

Point d'entrée complet : [`docs/README.md`](docs/README.md)

Pour les membres du club :

- [`docs/ADMIN_CLIENT.md`](docs/ADMIN_CLIENT.md) : modifier le site depuis l'admin.
- [`docs/FEATURES.md`](docs/FEATURES.md) : fonctionnalités publiques et administration.
- [`docs/DEPLOYMENT_GITHUB.md`](docs/DEPLOYMENT_GITHUB.md) : publier sur GitHub Pages.

Pour les développeurs :

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture Astro, données, admin, API.
- [`docs/TESTING.md`](docs/TESTING.md) : contrôles, QA, build public.
- [`docs/LMF_STATS_SUPABASE.md`](docs/LMF_STATS_SUPABASE.md) : stats live LMF, Supabase et RLS.
- [`SECURITY.md`](SECURITY.md) : sécurité, secrets, signalement.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) : workflow de contribution.

Pour les IA et agents de maintenance :

- [`AGENTS.md`](AGENTS.md) : règles de travail sur le dépôt.
- [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md) : résumé technique pour reprise rapide.

## Commandes utiles

```bash
pnpm run dev              # serveur local + admin
pnpm run check:content    # UTF-8, liens internes, fichiers référencés
pnpm run build            # build Astro complet
pnpm run build:pages      # export public-site/ + contrôle sécurité
pnpm run preview:public   # aperçu exact de public-site/
pnpm run qa               # QA complète, serveur dev déjà lancé
```

## Publication en ligne

Le site est hybride : les pages publiques sont statiques, mais l'admin et l'API demandent un runtime Node.

Pour GitHub Pages ou un hébergement 100 % statique, publier uniquement le dossier généré `public-site/` :

```bash
SITE_URL=https://www.dcmorges.ch pnpm run build:pages
```

`build:pages` :

1. compile Astro;
2. copie le site public dans `public-site/`;
3. supprime toute trace `/admin` et `/api`;
4. ajoute `.nojekyll`;
5. lance `pnpm run security:check`.

Ne jamais publier `dist/server/`. Il contient les routes serveur de l'admin et de l'API.

## GitHub Pages

Le workflow [`pages.yml`](.github/workflows/pages.yml) publie uniquement `public-site/`.

Dans GitHub :

1. aller dans **Settings -> Pages**;
2. choisir **Source: GitHub Actions**;
3. pousser sur `main`.

Variables GitHub optionnelles :

- `SITE_URL` : URL canonique, par exemple `https://www.dcmorges.ch`.
- `BASE_PATH` : chemin projet GitHub Pages, par exemple `/DCMorgesV2` si le site n'a pas de domaine custom.
- `PAGES_CNAME` : domaine custom à écrire dans `public-site/CNAME`.
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_SUPABASE_SCHEMA` : stats live LMF si elles doivent fonctionner sur le site publié.

## Administration

L'admin sert à gérer le contenu visible du site sans écrire de code :

- textes de pages et bandeaux;
- news, agenda, vidéos, membres, équipes;
- cartes documents Accueil, SDA et LMF;
- palmarès Club ligne par ligne;
- carrés et groupes d'archives;
- blocs contact;
- médiathèque et uploads.

Les modifications sont enregistrées dans `src/data/*.json`. Les fichiers envoyés sont placés dans `public/uploads/`. Après modification, committer les JSON et uploads, puis pousser sur GitHub pour republier le site public.

`/admin` et `/api/*` sont protégés par `ADMIN_USER` / `ADMIN_PASSWORD` et par un contrôle d'origine sur les écritures. Si ces variables manquent, l'admin et l'API refusent de fonctionner.

## Données principales

- Pages visibles : `src/data/pages.json`
- News : `src/data/news.json`
- Agenda : `src/data/events.json`
- Documents globaux : `src/data/documents.json`
- Documents accueil : `src/data/homeDocuments.json`
- Documents SDA : `src/data/sdaDocuments.json`
- Documents LMF : `src/data/lmfDocuments.json`
- Palmarès Club : `src/data/clubPalmares.json`
- Membres : `src/data/members.json`
- Équipes : `src/data/teams.json`
- Saisons : `src/data/seasons.json`
- Archives : `src/data/archives.json`
- Groupes d'archives : `src/data/archiveGroups.json`
- Contact : `src/data/contactBlocks.json`
- Vidéos : `src/data/videos.json`
- Réglages du site : `src/data/site.json`
- Pages sources importées : `src/data/legacyPages.json`

## Pages publiques

- Accueil : `/`
- News : `/news/`
- Détail news : `/news/<slug>/`
- SDA : `/sda/`
- Ligue Morgienne / LMF : `/lmf/`
- Stats live LMF cachées : `/lmf-stats-live/`
- Club / palmarès : `/club/`
- Agenda : `/agenda/`
- Archives : `/archives/`
- Vidéos : `/videos/`
- Contact : `/contact/`
- Anciennes pages importées : `/sources/<slug>/`
