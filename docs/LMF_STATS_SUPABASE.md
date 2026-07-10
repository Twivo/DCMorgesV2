# LMF stats live - Supabase

La page cachée est disponible sur `/lmf-stats-live/`.

Elle n'est pas ajoutée au menu public ni au sitemap. Elle est générée comme page statique, puis lit Supabase côté navigateur avec la clé anon publique. Elle peut donc être publiée avec le site public sans serveur Node.

## Variables d'environnement

Obligatoires pour afficher les statistiques :

```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=ey...
PUBLIC_SUPABASE_SCHEMA=public
```

Optionnel, uniquement pour le script local de seed :

```bash
SUPABASE_SERVICE_ROLE_KEY=ey...
```

La clé anon est visible côté navigateur. Ne jamais utiliser une clé `service_role` dans une variable `PUBLIC_*`.

## Tables Supabase utilisées

La page lit les tables REST Supabase suivantes :

- `seasons`
- `teams`
- `players`
- `team_players`
- `encounters`
- `matches`
- `match_players`

Les vues SQL personnalisées ne sont pas requises. Aucun fichier `.sql` n'est actuellement versionné dans le dépôt.

## Fonctionnalités de la page

- classement de la ligue;
- Best Player;
- classement MVP;
- High finish groupé par joueur;
- classement des 180s;
- historique filtrable des rencontres de championnat;
- détail des 10 parties d'une rencontre;
- détail des manches et des visites.

## Règles de calcul actuelles

Les classements sont calculés dans `src/pages/lmf-stats-live.astro`.

- Saison : filtre sur `seasons.is_current = true` si une saison courante existe.
- Matchs pris en compte : `matches.status = GAME_OVER`, `is_training = false`, avec `encounter_id`.
- Rencontres prises en compte : `encounters.status = FINISHED` ou rencontre avec score, gagnant ou date de fin.
- Classement de ligue : victoire = 3 points, nul = 1, défaite = 0.
- Parties gagnées/perdues : calculées depuis `matches.winner_participant`.
- Legs : reconstruits depuis `matches.events` en rejouant les visites 501 jusqu'à zéro.
- Best Player : simples uniquement, tri par ratio de legs gagnés, puis ratio de matchs gagnés, puis nombre de matchs. Si aucun joueur n'atteint encore le seuil officiel de 20 simples, la page affiche un classement provisoire avec les données disponibles.
- MVP : 1 match simple gagné = 1 point; 1 match double gagné = 0,5 point par joueur gagnant.
- High finish : un joueur apparaît une seule fois; son meilleur finish est affiché en principal, puis ses deux meilleurs suivants.
- 180s : chaque visite à 180 dans `matches.events` compte pour le joueur concerné.

## Sécurité Supabase

La clé anon publique finit dans le JavaScript envoyé au navigateur. La sécurité doit donc venir de Supabase :

- RLS activé sur les tables lues;
- policies de lecture limitées aux données réellement publiques;
- aucune écriture autorisée à la clé anon si elle n'est pas voulue;
- aucune clé `service_role` dans GitHub Pages ou dans le site public.

## Données de test

Commande locale :

```bash
pnpm run seed:lmf-live
```

Cette commande écrit dans Supabase et demande `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`. La clé anon publique ne suffit pas si les politiques RLS bloquent l'insertion dans `encounters`.

## Points métier à confirmer

- points de classement équipe si la LMF n'utilise pas 3/1/0;
- maintien du seuil de 20 simples pour le Best Player officiel;
- traitement souhaité des matchs abandonnés ou d'entraînement;
- niveau exact de données visibles publiquement via RLS.

## Déploiement

En local, mettre les variables publiques dans `.env.local`. Ce fichier est ignoré par Git.

Pour GitHub Actions, Netlify ou un autre build en ligne, définir `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` et `PUBLIC_SUPABASE_SCHEMA` dans les variables ou secrets du service de build. La clé anon finira dans le JavaScript public, ce qui est normal pour une clé anon de lecture avec RLS correctement configurée.
