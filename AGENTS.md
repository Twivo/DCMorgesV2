# Consignes pour IA et agents de maintenance

Lis d'abord :

1. `README.md`
2. `docs/README.md`
3. `docs/ARCHITECTURE.md`
4. `docs/AI_HANDOFF.md`
5. `docs/TESTING.md`

## Règles fortes

- Ne jamais committer `.env.local`.
- Ne jamais exposer `dist/server/`, `/admin` ou `/api` sur GitHub Pages.
- Ne jamais mettre de clé `service_role` Supabase dans une variable `PUBLIC_*`.
- Ne pas supprimer ou réécrire des données sans comprendre leur source admin.
- Ne pas changer les `id` ou `slug` sans vérifier les liens entrants.
- Garder les fichiers en UTF-8.
- Après un changement de contenu : `pnpm run check:content`.
- Avant un déploiement statique : `pnpm run build:pages`.

## Architecture rapide

- Astro public : `src/pages/*.astro`
- Admin : `src/pages/admin/*`
- API locale : `src/pages/api/*`
- Données : `src/data/*.json`
- Registre admin : `src/lib/collections.ts`
- Store JSON : `src/lib/store.ts`
- Formulaires admin : `public/admin/forms.js`
- Export GitHub Pages : `scripts/export-public.mjs`
- Contrôle sécurité : `scripts/security-check.mjs`

## Travail sur l'admin

L'admin est conçue pour des utilisateurs non techniques.

Quand tu ajoutes un champ :

- libellé clair;
- aide courte si nécessaire;
- pas de JSON brut;
- contrôle de type dans `src/lib/collections.ts`;
- rendu public robuste si le champ est optionnel.

## Travail sur le palmarès Club

`src/data/clubPalmares.json` contient une ligne par fait d'armes.

Champs :

- `season`
- `competition`
- `result`
- `order`

Le plus grand `order` s'affiche en haut.

## Travail sur GitHub Pages

Le workflow publie `public-site/`.

Ne modifie pas le workflow pour publier `dist/` entier. `dist/server/` contient les routes serveur et ne doit pas être publié.

## Validation minimale

```bash
pnpm run check:content
pnpm run build:pages
pnpm run security:check
```

Si tu as touché l'admin ou l'API :

```bash
pnpm run dev
pnpm run qa
```
