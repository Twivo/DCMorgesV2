# Sécurité

## Périmètre

Ce dépôt contient :

- un site public statique;
- une admin locale Node;
- des API locales d'écriture sur fichiers JSON;
- une page cachée de stats live qui lit Supabase côté navigateur.

GitHub Pages doit publier uniquement `public-site/`.

## Modèle de sécurité

### Site public

Le site public est statique. Il ne contient pas `/admin` ni `/api`.

Contrôle :

```bash
pnpm run build:pages
pnpm run security:check
```

### Admin et API

`/admin` et `/api/*` sont protégés par :

- `ADMIN_USER`;
- `ADMIN_PASSWORD`;
- HTTP Basic Auth;
- refus des écritures cross-origin.

Si les identifiants ne sont pas définis, l'admin et l'API répondent en erreur et ne doivent pas être utilisés.

### Uploads

Les uploads acceptent uniquement des formats inertes ou médias :

- PDF;
- images raster;
- vidéos.

SVG, HTML et JS sont refusés pour éviter les XSS stockées.

### Supabase

La page `/lmf-stats-live/` utilise uniquement des variables `PUBLIC_SUPABASE_*`.
Ces valeurs sont visibles dans le navigateur. Il faut donc protéger les données avec Supabase RLS.

Ne jamais exposer :

- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_WRITE_KEY`;
- toute clé privée.

## Checklist avant push

```bash
pnpm run check:content
pnpm run build:pages
pnpm run security:check
git status --short
```

Vérifier aussi :

- `.env.local` n'est pas suivi par Git;
- `public-site/admin` n'existe pas;
- `public-site/api` n'existe pas;
- `public-site/.nojekyll` existe;
- aucun secret réel dans `.env.example`.

## Signaler une faille

Ne pas ouvrir une issue publique avec un secret ou une faille exploitable.

Prévenir le mainteneur du site par un canal privé, avec :

- description du problème;
- étapes de reproduction;
- impact estimé;
- fichiers ou routes concernés;
- correctif proposé si possible.

## Limites connues

- HTTP Basic Auth doit être utilisé derrière HTTPS si l'admin est un jour exposée hors local.
- GitHub Pages ne peut pas faire tourner l'admin.
- Un upload fait sur une instance Node distante ne crée pas automatiquement un commit Git.
