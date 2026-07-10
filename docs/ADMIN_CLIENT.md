# Guide d'administration client

L'administration permet de modifier le site sans ouvrir le code. Elle s'utilise en local sur `/admin`.

## Connexion

1. Lancer le site avec `pnpm run dev`.
2. Ouvrir `http://127.0.0.1:4321/admin`.
3. Se connecter avec les identifiants définis dans `.env.local` :

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=un-mot-de-passe-local
```

Si les identifiants ne sont pas définis, l'admin et l'API refusent de fonctionner.

## Par où commencer

Utilise **Modifier le site** ou **Gestion du contenu** (`/admin/content`). C'est le point d'entrée le plus simple : les contenus sont rangés par rubrique visible du site.

Les raccourcis les plus utiles :

- **Accueil** : textes du bandeau, boutons, texte sous "Le Club" et cartes documents.
- **SDA** : textes de page, équipes et cartes documents SDA.
- **LMF** : textes de page, équipe et cartes documents LMF.
- **Club** : textes de page, membres, équipes et lignes du palmarès.
- **Archives** : textes de page, carrés archives, documents et groupes.
- **News / Agenda / Vidéos / Contact** : contenus courants du site.

## Contenus modifiables

- **Pages du site** : titres SEO, bandeaux, boutons et textes de sections pour Accueil, News, SDA, LMF, Club, Agenda, Archives, Vidéos et Contact.
- **Texte sous "Le Club" sur l'accueil** : ouvrir **Accueil -> Textes de page**, puis modifier la section concernée.
- **Documents en avant (accueil)** : les cartes de documents visibles sur la page d'accueil.
- **Cartes documents SDA** : titre, texte, type, saison, fichier affiché, bouton ouvrir, bouton télécharger et ordre.
- **Cartes documents LMF** : même principe que SDA, avec contenu propre à la page LMF.
- **Palmarès Club** : une entrée = une ligne de palmarès. Les lignes sont groupées par saison sur la page Club.
- **Carrés archives** : titre, texte, pastilles, documents affichés et liens.
- **Groupes d'archives** : organisation des carrés sur la page Archives.
- **News** : articles, images, textes, catégories et documents liés.
- **Agenda** : événements, dates, lieux et liens.
- **Documents globaux** : PDF et fichiers réutilisables dans les autres rubriques.
- **Membres** : fiches membres, rôles, équipes et photos.
- **Équipes** : équipes SDA/LMF, saison, description et joueurs.
- **Saisons** : saison courante utilisée automatiquement par plusieurs pages.
- **Vidéos** : liens vidéo, descriptions et vignettes.
- **Blocs contact** : locaux de jeu, capitaines, contacts SDA/LMF.
- **Pages sources** : anciennes pages importées sous `/sources/<slug>/`.
- **Médiathèque** : envoi d'un fichier seul pour récupérer une URL réutilisable.
- **Réglages du site** : nom du club, adresse, e-mail, logo, image d'accueil, menu et accès rapides.

## Règles simples

- Ne change pas les identifiants techniques (`id`, `slug`) sauf si tu veux aussi changer l'URL ou la référence.
- Pour changer la saison affichée, va dans **Saisons** et coche une seule saison comme saison courante.
- Pour ajouter un PDF ou une image, utilise le champ fichier du formulaire ou la **Médiathèque**.
- Seuls les PDF, images et vidéos sont acceptés en upload.
- Les textes de page peuvent utiliser `{{currentSeason}}`, `{{newsCount}}`, `{{activeMembersCount}}` ou `{{formerMembersCount}}`.
- Dans le palmarès Club, le champ **Classement d'affichage** fonctionne à l'envers des autres listes : le chiffre le plus élevé remonte en haut.
- Dans les cartes SDA/LMF et les carrés archives, un chiffre d'ordre plus petit apparaît plus tôt.
- Dans les longues listes, le champ **Rechercher** filtre instantanément.

## Publier après modification

Les changements de l'admin modifient les fichiers du dépôt (`src/data/*.json` et parfois `public/uploads/`). Pour les publier :

```bash
pnpm run check:content
pnpm run build:pages
```

Puis committer et pousser les fichiers modifiés sur GitHub.

Pour vérifier exactement ce qui sera publié :

```bash
pnpm run preview:public
```

Ouvrir ensuite `http://127.0.0.1:4322`.

GitHub Pages ne publie pas l'admin. Le site en ligne reçoit uniquement `public-site/`.
