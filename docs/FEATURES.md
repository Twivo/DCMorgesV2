# Fonctionnalités du site — Darts Club Morges

Récapitulatif complet de ce que fait le site, côté public et côté administration.

---

## 1. Site public

Pages statiques, rapides, responsive (mobile/tablette/ordinateur), en français.

| Page | Adresse | Contenu |
| --- | --- | --- |
| Accueil | `/` | Bandeau, infos club, accès rapides, 3 dernières news, prochains événements, 6 documents mis en avant |
| News | `/news/` | Liste des actualités (triées de la plus récente à la plus ancienne) |
| Détail news | `/news/<slug>/` | Article complet : photo + légende, texte, documents liés |
| SDA | `/sda/` | Saison, équipes SDA, documents officiels |
| LMF | `/lmf/` | Ligue Morgienne : team, documents, archives |
| LMF stats live | `/lmf-stats-live/` | Page cachée Supabase : classement ligue, best player, MVP, high finish, most MVP, historique filtrable et 180s |
| Club | `/club/` | Palmarès du club |
| Agenda | `/agenda/` | Événements **à venir** puis **passés** |
| Archives | `/archives/` | Catégories d'archives, documents et pages historiques |
| Vidéos | `/videos/` | Vidéos du club (⚠ voir note en fin de document) |
| Contact | `/contact/` | Coordonnées, IBAN, locaux, capitaines |
| Pages sources | `/sources/<slug>/` | 73 anciennes pages importées (textes, **tableaux Hall of Fame reconstruits**, images, documents) |
| Page 404 | — | Page d'erreur personnalisée |

**Détails notables**
- **News** triées automatiquement (plus récentes en haut) ; chaque article accepte photo + légende, texte en paragraphes et documents liés.
- **Agenda** : les événements à venir s'affichent en premier ; les événements passés sont regroupés en dessous ; message clair quand il n'y a rien à venir.
- **Archives** : les tableaux « Hall of Fame » de l'ancien site (championnats, coupes, palmarès) ont été reconstruits en vrais tableaux lisibles, avec des noms de pages précis.
- **LMF stats live** : page cachée non liée au menu, alimentée par les tables Supabase LMF via clé anon publique et RLS, avec historique filtrable des matchs et classement des 180s.
- **Liens sécurisés** : les liens d'un contenu ne peuvent pas exécuter de code (protection `javascript:`).

---

## 2. Administration (`/admin`)

Interface simple, **sans code**, pensée pour un usage non technique. Chaque
modification est enregistrée directement et visible sur le site après
régénération.

### Point d'entrée
- **Gestion du contenu** (`/admin/content`) : choisir une rubrique du site
  (Documents, News, Agenda, Vidéo, Club, SDA, LMF, Archives) et accéder
  directement à tout ce qui est modifiable pour elle.

### Rubriques gérables
- **Pages du site** : textes des bandeaux, boutons et titres de sections de chaque page.
- **Documents en avant (accueil)** : les 6 cartes de la page d'accueil (texte, fichier, saison, catégorie).
- **News** : articles, photo + légende, texte, catégorie, documents liés.
- **Agenda** : événements (date, heure, lieu, type, description).
- **Documents** : PDF/fichiers officiels (titre, type, saison, compétition, fichier).
- **Membres** : prénom, nom, rôle, équipe, photo.
- **Équipes** : nom, compétition, saison, joueurs.
- **Saisons** : la saison cochée « en cours » se répercute partout automatiquement.
- **Vidéos** : titre, année, description, lien, vignette.
- **Archives** / **Groupes d'archives** : catégories, documents et organisation.
- **Blocs contact** : locaux, capitaines, coordonnées.
- **Pages sources** : anciennes pages (textes, tableaux, images, documents, liens).
- **Médiathèque** : envoyer un fichier seul et récupérer son URL.
- **Réglages du site** : nom, adresse, e-mail, logo, image d'accueil, menu, IBAN…

### Confort d'utilisation
- **Champs simples** : aucun code ni JSON à saisir. Listes avec boutons
  Ajouter/Supprimer, cases à cocher, sélection de documents dans une liste.
- **Upload de fichiers** : bouton « Choisir un fichier » avec aperçu. Seuls
  **PDF, images et vidéos** sont acceptés (sécurité).
- **Recherche** : dans les longues listes (Membres, Documents, Pages sources),
  un champ filtre les résultats instantanément.
- **Accents** gérés directement (é, è, à, ç, ô…).
- **Variables de texte** : `{{currentSeason}}`, `{{newsCount}}`,
  `{{activeMembersCount}}`, `{{formerMembersCount}}`.

---

## 3. SEO & performance

- **Génération statique** : pages HTML pré-calculées, très rapides.
- **Images optimisées** : photos de membres converties en JPEG, image d'accueil
  en WebP (~66 Ko au lieu de 1,7 Mo). ~4 Mo économisés sur les pages courantes.
- **Sitemap** (`/sitemap-index.xml`) + **robots.txt** générés au build.
- **Balises canoniques + Open Graph + Twitter** sur chaque page (partage réseaux).
- **Données structurées JSON-LD** (`SportsClub` avec adresse) pour le
  référencement local (Google, Maps).

---

## 4. Sécurité

- **Upload restreint** aux formats sûrs (PDF, images, vidéos).
- **Anti-XSS** : contenus échappés côté admin, liens `javascript:` neutralisés côté public.
- **Protection CSRF** sur les envois de fichiers.
- **Erreurs internes non divulguées** (messages génériques).
- ⚠️ **L'admin n'a pas de mot de passe** : elle ne doit tourner qu'en **local**.
  On publie uniquement le site public statique (voir §5).

---

## 5. Publication & maintenance

- `pnpm run dev` → éditer le contenu en local (`http://127.0.0.1:4321/admin`).
- `pnpm run build:public` → génère le dossier **`public-site/`** à téléverser.
- `pnpm run preview:public` → aperçu exact de ce qui sera publié.
- `pnpm run qa` → teste toutes les fonctionnalités (103 vérifications).
- `pnpm run check:content` → vérifie accents, fichiers et liens internes.

Détails : voir `README.md` (« Publication en ligne ») et `docs/TESTING.md`.

---

## ⚠️ Point à régler avant la mise en ligne : les vidéos

Les 4 vidéos sont **hébergées localement** dans `public/legacy/videos/` et pèsent
**~407 Mo au total** (une seule fait **332 Mo**). Le dossier à publier fait donc
**~429 Mo**, ce qui est trop lourd pour la plupart des hébergeurs et très lent
pour les visiteurs.

**Recommandation** : mettre ces vidéos sur **YouTube** (ou Vimeo), puis remplacer
leur « Lien de la vidéo » dans l'admin (rubrique **Vidéos**) par le lien YouTube,
et supprimer les fichiers `.mp4` locaux. Le site publié tomberait alors de
**~429 Mo à ~2 Mo**.

> Ce point n'a pas été modifié automatiquement car il s'agit d'un choix
> d'hébergement des vidéos. Dis-le si tu veux que je bascule les vidéos vers
> YouTube et que je retire les fichiers locaux.
