# Fonctionnalités du site - Darts Club Morges

Récapitulatif du site public, de l'administration et des contrôles de publication.

## Site public

Pages statiques, rapides, responsive et en français.

| Page | Adresse | Contenu |
| --- | --- | --- |
| Accueil | `/` | Bandeau, présentation du club, accès rapides, news, événements, documents mis en avant |
| News | `/news/` | Liste des actualités, triées de la plus récente à la plus ancienne |
| Détail news | `/news/<slug>/` | Article complet, photo, légende, texte et documents liés |
| SDA | `/sda/` | Saison, équipes SDA et cartes documents entièrement éditables |
| LMF | `/lmf/` | Ligue Morgienne, équipe LMF et cartes documents entièrement éditables |
| Stats live LMF | `/lmf-stats-live/` | Page cachée Supabase : classements, historique, matchs, manches, visites et 180s |
| Club | `/club/` | Palmarès du club groupé par saison, une ligne par fait d'armes |
| Agenda | `/agenda/` | Événements à venir puis passés |
| Archives | `/archives/` | Carrés archives, documents, liens historiques et groupes |
| Vidéos | `/videos/` | Vidéos du club |
| Contact | `/contact/` | Coordonnées, IBAN, locaux et capitaines |
| Pages sources | `/sources/<slug>/` | Anciennes pages importées : textes, tableaux, images, documents et liens |
| Page 404 | - | Page d'erreur personnalisée |

## Détails publics importants

- Les news sont triées automatiquement.
- L'agenda sépare les événements à venir et passés.
- Les pages SDA et LMF affichent des cartes documents dédiées, indépendantes de la bibliothèque globale.
- Le bouton d'accueil **Palmarès** mène à `/club/`; le bouton **Archives** mène à `/archives/`.
- Le palmarès Club est groupé par saison et chaque fait d'armes occupe une ligne.
- Les archives sont construites avec des carrés éditables : titre, texte, pastilles, documents et liens.
- Les liens dangereux de type `javascript:` sont neutralisés.

## Stats live LMF

La page `/lmf-stats-live/` n'est pas liée dans le menu public. Elle est statique mais lit Supabase côté navigateur avec une clé anon publique.

Elle affiche :

- classement de ligue;
- Best Player;
- classement MVP;
- High finish;
- classement des 180s;
- historique filtrable des rencontres;
- détail des parties, manches et visites.

Les règles détaillées sont dans [`LMF_STATS_SUPABASE.md`](./LMF_STATS_SUPABASE.md).

## Administration

L'admin `/admin` est pensée pour un usage non technique. Elle est protégée par `ADMIN_USER` et `ADMIN_PASSWORD`.

Point d'entrée recommandé : `/admin/content`.

Rubriques principales :

- **Pages du site** : textes, bandeaux, boutons et sections visibles.
- **Accueil** : texte sous "Le Club", boutons, accès rapides et documents en avant.
- **SDA** : textes, équipes et cartes documents.
- **LMF** : textes, équipe et cartes documents.
- **Club** : textes, membres, équipes et lignes du palmarès.
- **Archives** : carrés archives, groupes et documents liés.
- **News** : articles, images, résumés, textes et documents liés.
- **Agenda** : dates, lieux, horaires, types et liens.
- **Documents** : bibliothèque globale de PDF et fichiers.
- **Membres** : fiches membres, rôles, équipes et photos.
- **Équipes** : équipes SDA/LMF, saison, description et joueurs.
- **Saisons** : saison courante utilisée par le site.
- **Vidéos** : titre, année, description, lien et vignette.
- **Contact** : blocs de coordonnées.
- **Pages sources** : anciennes pages importées.
- **Médiathèque** : upload autonome et URL réutilisable.
- **Réglages du site** : logo, image d'accueil, adresse, e-mail, menu et accès rapides.

Confort d'utilisation :

- aucun JSON à saisir;
- listes avec boutons Ajouter/Supprimer;
- cases à cocher pour les références;
- upload de fichiers depuis les formulaires;
- recherche dans les longues listes;
- aides courtes sur les champs sensibles.

## Sécurité

- `/admin` et `/api/*` demandent HTTP Basic Auth.
- L'admin et l'API échouent fermement si `ADMIN_USER` ou `ADMIN_PASSWORD` manque.
- Les écritures cross-origin sont refusées.
- Les uploads sont limités aux PDF, images et vidéos.
- SVG, HTML et JS sont refusés en upload.
- Le site public exporté ne contient ni `/admin`, ni `/api`, ni `dist/server`.
- La clé Supabase `service_role` ne doit jamais être exposée dans une variable `PUBLIC_*`.

Voir [`../SECURITY.md`](../SECURITY.md).

## Publication et maintenance

Commandes courantes :

```bash
pnpm run dev
pnpm run check:content
pnpm run build:pages
pnpm run preview:public
pnpm run qa
```

`pnpm run build:pages` génère `public-site/`, ajoute `.nojekyll`, retire toute trace admin/API et lance le contrôle sécurité.

Le workflow GitHub Pages publie uniquement `public-site/`.

## Point vidéo

Les vidéos historiques locales dans `public/legacy/videos/` sont lourdes. Pour alléger le site publié, la meilleure option reste de les héberger sur YouTube ou Vimeo, puis de remplacer les liens dans l'admin rubrique **Vidéos**.
