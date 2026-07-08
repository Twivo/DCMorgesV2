# Handoff pour IA et maintenance

## Resume rapide

Site Astro/TypeScript du Darts Club Morges.

- Front public : pages Astro statiques dans `src/pages`.
- Admin : pages `/admin/*` en SSR Node.
- API admin : `/api/<collection>`, `/api/<collection>/<id>`, `/api/site`, `/api/upload`.
- Donnees : JSON dans `src/data/*.json`, importees par des wrappers TypeScript.
- Pages visibles : `src/data/pages.json`, editable depuis `/admin/pages`.
- Page cachee live : `/lmf-stats-live/`, fichier `src/pages/lmf-stats-live.astro`, alimentee par Supabase cote navigateur.
- Blocs contact : `src/data/contactBlocks.json`, editable depuis `/admin/contact-blocks`.
- Groupes d'archives : `src/data/archiveGroups.json`, editable depuis `/admin/archive-groups`.
- Pages sources historiques : `src/data/legacyPages.json`, editable depuis `/admin/legacy-pages`.
- Mediatheque : `/admin/media`, fichiers dans `public/uploads`.
- Assets historiques : `public/legacy`.
- Uploads admin : `public/uploads`, versionnes dans Git.
- Auth admin optionnelle : `ADMIN_USER` et `ADMIN_PASSWORD` protegent `/admin` et `/api/*`.

## Fichiers a lire en premier

- `README.md`
- `src/data/types.ts`
- `src/data/pages.ts`
- `src/lib/collections.ts`
- `src/lib/store.ts`
- `src/pages/admin/[collection].astro`
- `src/pages/admin/media.astro`
- `src/pages/lmf-stats-live.astro`
- `public/admin/forms.js`
- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`

## Regles de modification

- Garder les fichiers en UTF-8.
- Ne jamais remplacer les accents par des entites HTML dans les JSON.
- Ne pas changer les `slug` de news sauf demande explicite : ils definissent les URLs.
- Ne pas changer les `id` des pages ou des sections dans `pages.json` sans adapter les imports Astro correspondants.
- Les champs `{{currentSeason}}`, `{{newsCount}}`, `{{activeMembersCount}}` et `{{formerMembersCount}}` sont remplaces par `src/data/pages.ts`.
- Quand une news lie des documents, utiliser les ids presents dans `src/data/documents.json`.
- Quand un groupe d'archives reference des categories, utiliser les ids presents dans `src/data/archives.json`.
- Quand un fichier est ajoute via admin ou a la main, verifier qu'il existe sous `public/uploads` ou `public/legacy` et qu'il est committe.
- Les pages SDA/LMF/Club/Accueil utilisent la saison marquee `isCurrent` dans `src/data/seasons.json`.
- La page `/lmf-stats-live/` utilise seulement des variables `PUBLIC_SUPABASE_*`; ne jamais mettre une cle service role dans une variable `PUBLIC_*`.
- `/lmf-stats-live/` lit actuellement les tables Supabase `seasons`, `teams`, `players`, `team_players`, `encounters`,
  `matches` et `match_players`, puis calcule les classements cote navigateur. Il n'y a pas de fichier `.sql` versionne
  pour ces vues/tableaux dans le repo.
- Regles LMF codees dans `src/pages/lmf-stats-live.astro` : victoire equipe = 3 points, nul = 1, defaite = 0; simple
  gagne = 1 point MVP; double gagne = 0,5 point par joueur gagnant; Best Player = ratio de legs en simples avec
  affichage provisoire si aucun joueur n'atteint encore 20 simples; high finish et 180s reconstruits depuis les visites
  501; historique filtrable cote navigateur avec rencontres, parties, manches et visites.
- `pnpm run seed:lmf-live` peut creer des donnees de test LMF mais demande `SUPABASE_SERVICE_ROLE_KEY` en local. La cle
  anon publique ne peut pas ecrire dans `encounters` a cause de RLS.

## Commandes de controle

```bash
pnpm run check:content
pnpm run build
```

`check:content` doit rester vert avant un deploiement. Il signale :

- les caracteres de remplacement Unicode (`U+FFFD`);
- les sequences d'encodage suspectes;
- les images, PDF, videos ou vignettes manquants;
- les ids de documents inexistants dans les news ou archives;
- les ids d'archives inexistants dans les groupes d'archives.

## Architecture des donnees

`src/lib/collections.ts` est la source centrale pour l'admin :

- nom de collection;
- fichier JSON cible;
- cle d'identifiant (`id` ou `slug`);
- colonnes de liste;
- schema des champs du formulaire.

`src/lib/store.ts` lit, normalise, valide et ecrit les JSON. L'update preserve les champs historiques non declares dans le schema, pour eviter de perdre du contenu migre.

`public/admin/forms.js` gere les formulaires sans JSON brut : scalaires, paragraphes, listes, references, repetitions, fichier unique et listes de fichiers.

## Pieges connus

- GitHub Pages ne suffit pas pour l'admin : il faut un runtime Node.
- Un upload fait sur un serveur de production n'est pas pousse tout seul sur GitHub.
- `legacyPages.json` est volumineux : c'est une archive structuree de l'ancien site, pas un module de logique.
- Les anciens scripts de migration peuvent regenerer beaucoup de fichiers; ne les lancer que si le but est vraiment de refaire la migration.
