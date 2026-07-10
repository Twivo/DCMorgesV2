# Documentation du projet

Cette page est le point d'entrée pour comprendre, maintenir et publier le site du Darts Club Morges.

## Pour les membres du club

- [Guide d'administration](./ADMIN_CLIENT.md) : modifier les contenus, envoyer des fichiers, publier.
- [Fonctionnalités](./FEATURES.md) : ce que contient le site public et l'espace admin.
- [Déploiement GitHub Pages](./DEPLOYMENT_GITHUB.md) : mettre le site public en ligne.

## Pour les développeurs

- [Architecture](./ARCHITECTURE.md) : Astro, données JSON, admin, API, export public.
- [Tests et contrôles](./TESTING.md) : build, QA, sécurité, export statique.
- [Stats live LMF Supabase](./LMF_STATS_SUPABASE.md) : variables, tables, calculs et sécurité RLS.
- [Sécurité](../SECURITY.md) : modèle de menace, secrets, signalement et checklist.
- [Contribution](../CONTRIBUTING.md) : workflow Git, règles de code et revue.

## Pour les IA / agents de maintenance

- [Consignes IA](../AGENTS.md) : règles concrètes avant de modifier le dépôt.
- [Handoff IA](./AI_HANDOFF.md) : résumé technique, fichiers à lire, pièges connus.

## Commandes à retenir

```bash
pnpm install
pnpm run dev
pnpm run check:content
pnpm run build:pages
pnpm run security:check
```

## Ce qui est publié

GitHub Pages ne publie que `public-site/`, généré par `pnpm run build:pages`.
Ce dossier ne contient ni `/admin`, ni `/api`, ni runtime Node.

L'admin reste local ou doit être hébergé séparément sur un service privé Node.
