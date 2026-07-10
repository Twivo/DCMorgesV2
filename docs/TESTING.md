# Tests et contrôles

## Contrôle contenu

```bash
pnpm run check:content
```

Vérifie :

- encodage UTF-8;
- caractères Unicode cassés;
- séquences d'encodage suspectes;
- fichiers locaux référencés;
- documents liés aux news et archives;
- images, vidéos et vignettes.

À lancer après toute modification de `src/data/*.json`, `public/uploads/` ou `public/legacy/`.

## Build public GitHub Pages

```bash
pnpm run build:pages
```

Cette commande compile, exporte `public-site/`, puis lance le contrôle sécurité.

## Contrôle sécurité

```bash
pnpm run security:check
```

Vérifie notamment :

- pas de `public-site/admin`;
- pas de `public-site/api`;
- présence de `public-site/.nojekyll`;
- absence de traces `ADMIN_PASSWORD` ou `SUPABASE_SERVICE_ROLE_KEY` dans l'artefact public;
- absence d'appels API admin dans l'artefact publié.

## QA fonctionnelle

```bash
# terminal 1
pnpm run dev

# terminal 2
pnpm run qa
```

Pré-requis :

- `.env.local` contient `ADMIN_USER` et `ADMIN_PASSWORD`;
- ou les variables sont disponibles dans l'environnement;
- le serveur tourne sur `QA_BASE` ou `http://127.0.0.1:4321`.

La QA teste :

- pages publiques;
- pages admin;
- CRUD de toutes les collections;
- champs structurés;
- validations;
- permissions;
- upload;
- réglages du site;
- protection CSRF.

Pour cibler un autre serveur :

```bash
QA_BASE=http://127.0.0.1:4325 pnpm run qa
```

## Aperçu de l'artefact publié

```bash
pnpm run build:pages
pnpm run preview:public
```

Ouvrir `http://127.0.0.1:4322`.

Cet aperçu sert exactement `public-site/`, sans admin ni API.

## Checklist avant merge

```bash
pnpm run check:content
pnpm run build:pages
git diff --check
git status --short
```

Ajouter `pnpm run qa` si l'admin, les API, `src/lib/store.ts`, `src/lib/collections.ts` ou `public/admin/forms.js` ont changé.
