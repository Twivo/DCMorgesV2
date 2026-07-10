# Architecture

## Vue d'ensemble

Le projet est un site Astro hybride :

- site public généré en HTML statique;
- admin locale en SSR Node;
- API locale pour modifier les fichiers JSON;
- export `public-site/` pour GitHub Pages.

Le dépôt Git est la source de vérité. Les contenus édités par l'admin sont écrits dans `src/data/*.json` et les fichiers envoyés dans `public/uploads/`.

## Dossiers principaux

| Chemin | Rôle |
| --- | --- |
| `src/pages/` | Pages Astro publiques, admin et API. |
| `src/components/` | Composants réutilisables du site public. |
| `src/layouts/` | Layout public et layout admin. |
| `src/data/*.json` | Données éditables par l'admin. |
| `src/data/*.ts` | Wrappers typés autour des JSON. |
| `src/lib/collections.ts` | Registre des collections admin et schémas de formulaires. |
| `src/lib/store.ts` | Lecture, validation, normalisation et écriture des JSON. |
| `public/admin/forms.js` | Moteur de formulaires admin côté navigateur. |
| `public/legacy/` | Assets historiques importés depuis l'ancien site. |
| `public/uploads/` | Fichiers ajoutés via l'admin. |
| `scripts/` | Build public, QA, contrôles contenu/sécurité, migration. |
| `.github/workflows/pages.yml` | Déploiement GitHub Pages. |

## Flux public

Les pages publiques importent des données depuis `src/data/*.ts`, puis Astro génère du HTML statique.

Exemples :

- `/` utilise les pages, news, événements, documents en avant et informations du site.
- `/club/` lit `src/data/clubPalmares.json`, groupe les lignes par saison et affiche une ligne par fait d'armes.
- `/sda/` et `/lmf/` lisent leurs cartes documents dédiées.
- `/archives/` lit les groupes d'archives et les carrés archives.
- `/lmf-stats-live/` est une page cachée statique qui lit Supabase côté navigateur.

## Flux admin

L'admin est disponible sur `/admin` quand le serveur Astro Node tourne.

1. `src/lib/collections.ts` décrit les collections éditables.
2. `/admin/[collection]` lit cette description et génère une table + formulaire.
3. `public/admin/forms.js` construit les champs côté navigateur.
4. Les sauvegardes appellent `/api/<collection>` ou `/api/<collection>/<id>`.
5. `src/lib/store.ts` normalise et écrit le JSON.

L'admin et les API sont protégés par `src/middleware.ts` :

- `ADMIN_USER` et `ADMIN_PASSWORD` obligatoires;
- HTTP Basic Auth;
- refus des écritures cross-origin.

## Déploiement GitHub Pages

GitHub Pages ne sait pas exécuter l'admin Node. Le workflow génère donc :

```bash
pnpm run build:pages
```

Cette commande :

1. lance `astro build`;
2. copie `dist/client` vers `public-site/`;
3. supprime toute trace `/admin` et `/api`;
4. ajoute `.nojekyll`;
5. lance `scripts/security-check.mjs`;
6. publie uniquement `public-site/`.

## Données et ordre d'affichage

Plusieurs collections ont un champ `order`.

- Pour les documents SDA/LMF et les archives, l'usage est indiqué dans l'aide admin.
- Pour le palmarès Club, le chiffre le plus élevé remonte en haut.
- Les saisons récentes utilisent des valeurs élevées, par exemple `2025002`.

## Secrets

`.env.local` est ignoré par Git. Ne jamais committer :

- `ADMIN_PASSWORD`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- toute clé privée ou token personnel.

Les variables `PUBLIC_*` sont intégrées au JavaScript public. Elles ne doivent contenir que des valeurs acceptables côté navigateur.
