# Handoff IA et maintenance

## Résumé rapide

Site Astro/TypeScript du Darts Club Morges.

- Site public statique.
- Admin locale Node sur `/admin`.
- API locale sur `/api/*`.
- Données éditables dans `src/data/*.json`.
- Uploads admin dans `public/uploads/`.
- Export GitHub Pages dans `public-site/`.
- Workflow Pages : `.github/workflows/pages.yml`.

## Fichiers à lire en premier

1. `README.md`
2. `AGENTS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/TESTING.md`
5. `src/lib/collections.ts`
6. `src/lib/store.ts`
7. `src/pages/admin/[collection].astro`
8. `public/admin/forms.js`
9. `src/middleware.ts`

## Règles non négociables

- Ne jamais publier `dist/server`.
- Ne jamais publier `/admin` ou `/api` sur GitHub Pages.
- Ne jamais committer `.env.local`.
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`.
- Ne pas changer les `id` ou `slug` sans vérifier les références.
- Garder les contenus en UTF-8.
- Lancer `pnpm run check:content` après un changement de contenu.
- Lancer `pnpm run build:pages` avant un déploiement statique.

## Admin

Le registre admin est `src/lib/collections.ts`.

Chaque collection définit :

- `name`;
- `label`;
- fichier JSON cible;
- clé d'identifiant;
- colonnes de liste;
- champs de formulaire;
- règles de création/suppression;
- éventuellement `orderDirection`.

Les formulaires sont générés par `public/admin/forms.js`.

## Données importantes

| Donnée | Fichier |
| --- | --- |
| Pages visibles | `src/data/pages.json` |
| News | `src/data/news.json` |
| Agenda | `src/data/events.json` |
| Documents globaux | `src/data/documents.json` |
| Documents accueil | `src/data/homeDocuments.json` |
| Documents SDA | `src/data/sdaDocuments.json` |
| Documents LMF | `src/data/lmfDocuments.json` |
| Palmarès Club | `src/data/clubPalmares.json` |
| Archives | `src/data/archives.json` |
| Groupes archives | `src/data/archiveGroups.json` |
| Contact | `src/data/contactBlocks.json` |
| Réglages site | `src/data/site.json` |

## Palmarès Club

`src/data/clubPalmares.json` contient une ligne par fait d'armes.

Champs :

- `season`;
- `competition`;
- `result`;
- `order`.

Le plus grand `order` s'affiche en haut. Les lignes sont groupées par saison sur `/club/`.

## Stats live LMF

Page : `/lmf-stats-live/`.

Fichier : `src/pages/lmf-stats-live.astro`.

Variables publiques :

- `PUBLIC_SUPABASE_URL`;
- `PUBLIC_SUPABASE_ANON_KEY`;
- `PUBLIC_SUPABASE_SCHEMA`.

Ne jamais utiliser de clé service role dans le navigateur.

## Sécurité

`src/middleware.ts` protège `/admin` et `/api` :

- fail closed si `ADMIN_USER` ou `ADMIN_PASSWORD` manque;
- HTTP Basic Auth;
- refus des écritures cross-origin.

`scripts/security-check.mjs` vérifie que l'artefact public ne contient pas de routes admin/API ni de secrets serveur.

## Commandes

```bash
pnpm run dev
pnpm run check:content
pnpm run build:pages
pnpm run security:check
pnpm run qa
```

## Pièges connus

- GitHub Pages ne peut pas faire tourner l'admin.
- Un upload fait sur un serveur distant ne crée pas automatiquement un commit Git.
- `legacyPages.json` est une archive volumineuse, pas un modèle à recopier.
- Les scripts de migration peuvent réécrire beaucoup de données.
- Les variables `PUBLIC_*` sont publiques.
