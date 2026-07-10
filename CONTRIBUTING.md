# Contribuer

Merci de garder ce dépôt simple à maintenir : le club doit pouvoir modifier le site sans dépendre d'un développeur au quotidien.

## Préparer l'environnement

```bash
pnpm install
cp .env.example .env.local
```

Renseigner dans `.env.local` au minimum :

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=un-mot-de-passe-local
```

Lancer le site :

```bash
pnpm run dev
```

Admin locale : `http://127.0.0.1:4321/admin`

## Avant de proposer un changement

```bash
pnpm run check:content
pnpm run build:pages
```

Si le changement touche l'admin ou les API :

```bash
pnpm run qa
```

`pnpm run qa` demande un serveur déjà lancé et des identifiants admin disponibles dans `.env.local` ou dans l'environnement.

## Règles de contenu

- Ne pas casser les accents : tous les fichiers texte sont en UTF-8.
- Ne pas modifier un `slug` ou un `id` sans comprendre l'URL ou la référence associée.
- Les fichiers ajoutés via l'admin dans `public/uploads/` doivent être commités.
- Une ligne du palmarès Club représente un seul fait d'armes.
- Ne jamais mettre une clé Supabase `service_role` dans une variable `PUBLIC_*`.

## Règles de code

- Suivre les patterns existants dans `src/lib/collections.ts` et `src/lib/store.ts`.
- Garder l'admin accessible à des non-techniciens : champs simples, pas de JSON brut à saisir.
- Pour un ajout de collection, ajouter :
  - le fichier JSON dans `src/data/`;
  - un wrapper TypeScript si le site public l'importe;
  - la définition dans `src/lib/collections.ts`;
  - le rendu public si nécessaire.
- Pour un changement de déploiement, vérifier que `public-site/` ne contient pas `/admin` ni `/api`.

## Branches et pull requests

Une PR devrait expliquer :

- ce qui change côté public;
- ce qui change côté admin;
- les commandes de validation lancées;
- les éventuelles limites ou actions manuelles après merge.

Utiliser le template de PR du dépôt.
