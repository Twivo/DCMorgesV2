# Deploiement GitHub

Ce projet est un site Astro avec deux modes d'usage :

- pages publiques prerenderisees, servies depuis `dist/client`;
- admin et API en runtime Node, servies par `dist/server/entry.mjs`.

## Verification avant push

```bash
pnpm install
pnpm run check:content
pnpm run build
```

`pnpm run check:content` verifie les caracteres Unicode casses (`U+FFFD`), les sequences d'encodage suspectes et les references vers les fichiers publics locaux.

## Contenu et uploads

Les donnees modifiables sont dans `src/data/*.json`. L'admin couvre notamment :

- pages visibles du site;
- news, agenda, documents, membres, equipes, saisons, videos;
- archives et groupes d'archives;
- blocs contact;
- pages sources historiques;
- reglages du site et navigation.

Les fichiers envoyes par l'admin vont dans `public/uploads/`. Ce dossier est volontairement versionne : quand une image ou un PDF est ajoute, il faut committer le fichier upload avec les donnees JSON modifiees.

La page `/admin/media` permet aussi d'envoyer un fichier seul et de copier son URL.

La page cachee `/lmf-stats-live/` est publique si son URL est connue. Elle lit Supabase cote navigateur et demande ces variables au build :

```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=ey...
PUBLIC_SUPABASE_SCHEMA=public
```

Elle calcule ses classements depuis les tables `seasons`, `teams`, `players`, `team_players`, `encounters`, `matches`
et `match_players`, puis affiche aussi un historique filtrable par rencontre avec detail des parties/manches et le classement des 180s. Ne jamais utiliser une cle
`service_role` dans une variable `PUBLIC_*`.

Sur GitHub Actions, definir ces valeurs comme variables/secrets de build si la page live doit fonctionner dans la
version publiee. La cle anon est integree au JavaScript public : c'est normal uniquement si RLS limite les donnees a ce
qui peut etre lu publiquement.

Le script `pnpm run seed:lmf-live` est reserve au local et demande `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`. Ne pas
ajouter cette cle dans GitHub Pages ou dans une variable publique.

Commande utile avant commit :

```bash
git status --short
```

Verifier en particulier :

- `src/data/*.json`
- `public/uploads/*`
- eventuellement `public/legacy/*` si un fichier historique est ajoute manuellement

## Deploiement statique seul

Pour un hebergement type GitHub Pages, Netlify statique ou serveur web simple :

```bash
pnpm run build
```

Publier uniquement `dist/client`.

Attention : dans ce mode, les pages publiques fonctionnent, mais l'admin et les routes `/api/*` ne peuvent pas enregistrer de changements.

## Deploiement avec admin

Pour garder l'admin fonctionnelle, il faut un runtime Node :

```bash
pnpm run build
node ./dist/server/entry.mjs
```

Le serveur Node sert les pages SSR et les API. Les changements faits via l'admin ecrivent dans les fichiers du projet (`src/data/*.json` et `public/uploads/`).

En production, proteger l'admin avec deux variables d'environnement :

```bash
ADMIN_USER=client
ADMIN_PASSWORD=mot-de-passe-long
```

Quand ces variables sont definies, `/admin` et `/api/*` demandent une authentification HTTP Basic. En local, si elles sont absentes, l'admin reste ouverte pour faciliter le developpement.

Important : si l'admin tourne sur un serveur de production, ces changements restent sur le disque du serveur. Ils ne sont pas automatiquement pousses sur GitHub. Pour garder GitHub comme source de verite, utiliser l'un de ces flux :

- faire les modifications en local via `/admin`, puis commit/push;
- ou ajouter plus tard une integration GitHub API qui cree un commit apres chaque sauvegarde admin.

## Exemple GitHub Actions

```yaml
name: build

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.7.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run check:content
      - run: pnpm run build
```
