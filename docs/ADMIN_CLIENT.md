# Guide d'administration client

L'admin est disponible sur `/admin`. Elle est prévue pour gérer le site sans modifier le code.

## Par où commencer

- **Gestion du contenu** (`/admin/content`) : le point d'entrée le plus simple.
  Choisis une rubrique du site (Documents, News, Agenda, Vidéo, Club, SDA, LMF,
  Archives) et tu accèdes directement à tout ce qui est modifiable pour elle.

## Rubriques principales

- **Pages du site** : titres SEO, bandeaux, boutons et textes de sections pour Accueil, News, SDA, LMF, Club, Agenda, Archives, Vidéos et Contact.
- **Documents en avant (accueil)** : les 6 cartes de documents affichées sur la page d'accueil (texte, fichier, saison, catégorie).
- **Réglages du site** : nom du club, adresse, e-mail, logo, image d'accueil, menu et accès rapides.
- **Médiathèque** : envoi de fichiers seuls pour récupérer une URL réutilisable dans les formulaires.
- **News** : articles, images, textes, catégories et documents liés.
- **Agenda** : événements, dates, lieux et liens.
- **Documents** : PDF et fichiers officiels SDA, LMF, archives ou autres.
- **Membres** : fiches membres, rôles, équipes et photos.
- **Équipes** : équipes SDA/LMF, saison, description et joueurs.
- **Saisons** : saison courante utilisée automatiquement par les pages SDA, LMF, Club et Accueil.
- **Vidéos** : vidéos locales ou liens externes, descriptions et vignettes.
- **Archives** : catégories d'archives, documents liés et liens historiques.
- **Groupes d'archives** : organisation des catégories sur la page Archives.
- **Blocs contact** : locaux de jeu, capitaines, contacts SDA/LMF.
- **Pages sources** : anciennes pages importées visibles sous `/sources/<slug>/`, avec textes, tableaux, images, documents et liens.

## Règles simples

- Ne change pas les identifiants techniques (`id`, `slug`) sauf si tu veux aussi changer l'URL ou la structure.
- Pour changer la saison affichée, va dans **Saisons** et coche une seule saison comme saison courante.
- Pour ajouter un PDF ou une image, utilise le champ fichier du formulaire ou la **Médiathèque**.
- Les champs acceptent les accents directement : écris `é`, `è`, `à`, `ç`, `ô`, etc. normalement.
- Les textes de page peuvent utiliser des variables comme `{{currentSeason}}`, `{{newsCount}}`, `{{activeMembersCount}}` ou `{{formerMembersCount}}`.
- Dans les longues listes (Membres, Documents, Pages sources…), un champ **Rechercher** apparaît en haut pour filtrer instantanément.
- Seuls des fichiers **PDF, images et vidéos** peuvent être envoyés (les autres types sont refusés pour la sécurité).

## Avant livraison ou déploiement

Vérifier le contenu et compiler :

```bash
pnpm run check:content   # accents, fichiers et liens internes
pnpm run qa              # teste toutes les fonctionnalités (serveur `pnpm run dev` lancé à côté)
pnpm run build           # compile le site
```

Publier en ligne (voir `README.md` › « Publication en ligne ») :

```bash
pnpm run build:public    # génère le dossier public-site/ à téléverser
pnpm run preview:public  # aperçu local de ce qui sera publié
```

> ⚠️ L'admin n'a pas de mot de passe : ne mets jamais en ligne le serveur Node,
> uniquement le dossier `public-site/`. L'édition se fait en local.
