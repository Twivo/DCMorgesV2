# Darts Club Morges - Nouveau site

Ce projet contient la version moderne du site du Darts Club Morges, remplie avec les contenus publics récupérés depuis `https://www.dcmorges.ch/`.

## Commandes

```bash
pnpm install
pnpm run dev
pnpm run check:content
pnpm run build
```

Les pages publiques sont générées en statique par Astro. Une interface d'administration
(SSR via l'adaptateur `@astrojs/node`) permet de gérer tous les contenus.

Documentation utile :

- Liste des fonctionnalités : `docs/FEATURES.md`
- Guide client de l'admin : `docs/ADMIN_CLIENT.md`
- Stats live LMF Supabase : `docs/LMF_STATS_SUPABASE.md`
- Tests (`check:content` et `qa`) : `docs/TESTING.md`
- Déploiement GitHub : `docs/DEPLOYMENT_GITHUB.md`
- Reprise par une autre IA : `docs/AI_HANDOFF.md`

## Publication en ligne (sans authentification)

Le site est **hybride** : les pages publiques sont statiques, l'admin + l'API
tournent sur Node **sans mot de passe**. On ne publie donc **que le site public
statique** ; l'admin reste un outil **local**.

```bash
# 1) Générer le dossier à mettre en ligne
SITE_URL=https://mon-domaine.ch pnpm run build:public   # -> crée public-site/
#    (sans SITE_URL, le domaine par défaut est https://www.dcmorges.ch)

# 2) (optionnel) Prévisualiser exactement ce qui sera publié
pnpm run preview:public                                  # http://127.0.0.1:4322

# 3) Téléverser le CONTENU de public-site/ à la racine de l'hébergeur
```

`public-site/` est un site 100 % statique (HTML, images, PDF, sitemap, robots) :
il fonctionne sur n'importe quel hébergeur (Infomaniak, Netlify, GitHub Pages,
o2switch…) **sans serveur**. Il ne contient **aucune trace de l'admin**.

> ⚠️ **Ne jamais mettre `dist/server/` en ligne** : il contient l'admin ouvert
> sans mot de passe. Pour éditer le contenu, lance l'admin **en local**
> (`pnpm run dev` → `http://127.0.0.1:4321/admin`), puis régénère et republie
> `public-site/`. Si tu changes de domaine, adapte `SITE_URL` et la ligne
> `Sitemap:` de `public/robots.txt`.

## Administration

Interface d'admin pour gérer l'ensemble du contenu visible du site :
pages, news, agenda, documents, membres, équipes, saisons, vidéos, archives,
groupes d'archives, blocs contact, pages sources, médiathèque et réglages du site.

- URL : `/admin` — à utiliser **en local uniquement** via `pnpm run dev`
  (écoute sur `127.0.0.1`, non exposé). N'expose pas le serveur Node en ligne :
  l'admin n'a pas de mot de passe.
- Les modifications sont enregistrées **directement dans les données du site**
  (`src/data/*.json`) : ajout, édition et suppression en direct.
- La rubrique **Pages du site** pilote les textes de bandeau, boutons et sections
  des pages publiques. Les fiches de contenu (news, documents, membres, etc.)
  sont gérées dans leurs rubriques dédiées.
- La rubrique **Pages sources** rend administrables les anciennes pages importées
  sous `/sources/<slug>/`, y compris textes, tableaux, images, documents et liens.
- La **Médiathèque** permet d'envoyer un fichier et de réutiliser son URL partout
  dans l'admin.
- Interface pensée pour un usage non technique : **aucun JSON à saisir**. Les
  fichiers (PDF, photos) s'ajoutent par **upload** (`POST /api/upload` →
  `public/uploads/`), les documents liés se **cochent dans une liste**, et les
  listes (paragraphes, joueurs, menus…) s'éditent avec des boutons Ajouter/Supprimer.
- Les fichiers ajoutés dans `public/uploads/` sont versionnés dans Git afin
  d'être déployés avec les données JSON modifiées.
- Protection optionnelle en production : définir `ADMIN_USER` et `ADMIN_PASSWORD`
  pour protéger `/admin` et `/api/*` par authentification HTTP Basic.
- API REST sous-jacente : `GET/POST /api/<collection>`, `PUT/DELETE /api/<collection>/<id>`,
  et `GET/PUT /api/site` pour les réglages.
- Registre des collections et schémas de formulaires : `src/lib/collections.ts` ;
  lecture/écriture fichier : `src/lib/store.ts`.

> Pour un hébergement 100 % statique, on continue d'utiliser `pnpm run build` (les pages
> publiques restent statiques) ; l'admin nécessite un runtime Node.

## Données principales

- News : `src/data/news.ts`
- Pages visibles du site : `src/data/pages.ts`
- Événements : `src/data/events.ts`
- Documents PDF : `src/data/documents.ts`
- Membres : `src/data/members.ts`
- Équipes : `src/data/teams.ts`
- Saisons : `src/data/seasons.ts`
- Archives : `src/data/archives.ts`
- Groupes d'archives : `src/data/archiveGroups.ts`
- Blocs contact : `src/data/contactBlocks.ts`
- Vidéos : `src/data/videos.ts`
- Informations de contact : `src/data/site.ts`
- Pages sources importées : `src/data/legacyPages.ts`

## Assets importés

Les PDF, images et vidéos détectés sur le site actuel ont été copiés sous `public/legacy/` en conservant l'arborescence d'origine.

Inventaires de migration :

- `migration/inventory.md`
- `migration/pdf-inventory.md`
- `migration/non-integrated.md`
- `migration/downloaded-assets.json`

## Pages disponibles

- Accueil : `/`
- News : `/news/`
- Détail news : `/news/<slug>/`
- SDA : `/sda/`
- Ligue Morgienne / LMF : `/lmf/`
- Stats live LMF cachees : `/lmf-stats-live/`
- Club / palmares : `/club/`
- Agenda : `/agenda/`
- Archives : `/archives/`
- Vidéos : `/videos/`
- Contact : `/contact/`
- Fiches des anciennes pages importées : `/sources/<slug>/`
