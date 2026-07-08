# Tests

Deux vérifications automatiques sont fournies.

## 1. Contrôle du contenu — `pnpm run check:content`

Vérifie, sans serveur, l'intégrité des données :

- encodage UTF-8 des fichiers `src/data/*.json` (accents non cassés) ;
- existence des fichiers locaux référencés (PDF, images) ;
- validité des liens de documents internes.

À lancer avant chaque `build` / déploiement.

## 2. Suite fonctionnelle — `pnpm run qa`

Teste toutes les fonctionnalités contre le serveur en marche.

```bash
# terminal 1
pnpm run dev
# terminal 2
pnpm run qa
```

Résultat attendu : `RÉSULTAT: 103 OK / 0 échec(s)` (code de sortie `0`).

Couverture :

| Bloc | Ce qui est testé |
| --- | --- |
| 1. Pages publiques | Accueil, News, SDA, LMF, Club, Agenda, Archives, Vidéos, Contact, page source, `robots.txt`, favicon, logo, page 404 |
| 2. Pages admin | Tableau de bord, Gestion du contenu, Réglages, Médiathèque, les 13 collections, deep-link `?edit=` |
| 3. CRUD API | Création → lecture → modification → suppression pour **chaque** collection (nettoyé automatiquement) |
| 4. Champs structurés | Paragraphes (ligne vide = nouveau paragraphe), répéteurs (lignes vides ignorées) |
| 5. Validation & permissions | Champ requis manquant → 400, collection inconnue → 404, création/suppression interdites (`pages`) → 405 |
| 6. Upload | `.png` accepté (201), `.svg` refusé (400), envoi sans `Origin` refusé (403 — protection CSRF) |
| 7. Réglages du site | Lecture puis écriture (aller-retour neutre) de `/api/site` |

La suite ne modifie **aucune donnée réelle** : elle crée des éléments jetables
qu'elle supprime, et nettoie le fichier de test envoyé.

### Notes

- `pnpm run qa` doit tourner contre un serveur (`pnpm run dev` ou le serveur
  compilé). En mode `dev`, chaque écriture déclenche un rechargement Vite ; la
  suite ré-essaie automatiquement en cas de coupure passagère.
- `/sitemap-index.xml` n'existe **qu'après un build** (`pnpm run build`), pas en
  mode `dev` — c'est normal.
- Cibler un autre serveur : `QA_BASE=http://127.0.0.1:4325 node scripts/qa.mjs`.

## 3. Aperçu du site publié — `pnpm run preview:public`

Après `pnpm run build:public`, sert le dossier `public-site/` en statique pur
(sans admin) sur `http://127.0.0.1:4322` pour vérifier exactement ce qui sera
mis en ligne.
