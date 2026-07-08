// Central registry describing every editable data collection: its JSON file,
// identifier key, table columns and per-field form schema. Shared by the API
// routes (server) and the admin UI (rendered server-side + client form library).

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "lines" // string[] edited with an easy add/remove list
  | "paragraphs" // string[] edited as one textarea, blank line = new paragraph
  | "file" // uploaded file (or pasted URL) -> stores a URL string
  | "files" // string[] with upload/pasted URL rows
  | "reference" // pick one or more items from another collection -> string[] of ids
  | "repeater"; // array of sub-objects edited with add/remove rows

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  accept?: string; // for "file": e.g. "image/*" or "application/pdf"
  refCollection?: string; // for "reference": the collection name to pick from
  subfields?: Field[]; // for "repeater": the sub-object schema
}

export interface CollectionDef {
  name: string; // URL slug, e.g. "documents"
  label: string; // human label
  file: string; // JSON file name without extension, under src/data/
  idKey: string; // "id" | "slug"
  titleKey: string; // field used as the item title / id source
  listColumns: string[]; // columns shown in the admin table
  allowCreate?: boolean; // defaults to true
  allowDelete?: boolean; // defaults to true
  fields: Field[];
}

const linkFields: Field[] = [
  { key: "label", label: "Texte du lien", type: "text", required: true },
  { key: "href", label: "Adresse (URL)", type: "text", required: true },
  { key: "description", label: "Description (optionnel)", type: "textarea" }
];

const contactLineFields: Field[] = [
  { key: "label", label: "Libellé", type: "text", required: true },
  { key: "value", label: "Texte affiché", type: "text", required: true },
  { key: "href", label: "Lien optionnel", type: "text", help: "Ex : mailto:contact@example.ch ou https://..." }
];

const embeddedDocumentFields: Field[] = [
  { key: "id", label: "Identifiant technique", type: "text", help: "Optionnel pour les documents intégrés aux pages sources." },
  { key: "title", label: "Titre", type: "text", required: true },
  { key: "type", label: "Type", type: "text" },
  { key: "season", label: "Saison", type: "text" },
  { key: "competition", label: "Compétition", type: "text" },
  { key: "date", label: "Date", type: "text" },
  { key: "url", label: "Fichier ou lien", type: "file", accept: "application/pdf,image/*" },
  { key: "sourceUrl", label: "Lien source", type: "text" },
  { key: "actionLabel", label: "Texte du bouton", type: "text" }
];

const tableRowFields: Field[] = [
  { key: "c", label: "Cellules de la ligne", type: "lines", required: true, help: "Une cellule par ligne." },
  { key: "h", label: "Ligne d'en-tête", type: "boolean" },
  { key: "s", label: "Largeur des cellules", type: "lines", help: "Optionnel : une valeur colspan par cellule." }
];

export const collections: CollectionDef[] = [
  {
    name: "pages",
    label: "Pages du site",
    file: "pages",
    idKey: "id",
    titleKey: "label",
    listColumns: ["label", "path", "heroTitle"],
    allowCreate: false,
    allowDelete: false,
    fields: [
      { key: "label", label: "Nom affiché dans l'admin", type: "text", required: true },
      { key: "path", label: "Adresse de la page", type: "text", required: true, help: "Ex : /sda/" },
      { key: "seoTitle", label: "Titre SEO / onglet navigateur", type: "text", required: true },
      { key: "seoDescription", label: "Description SEO", type: "textarea" },
      { key: "heroEyebrow", label: "Sur-titre du bandeau", type: "text" },
      { key: "heroTitle", label: "Titre du bandeau", type: "text", required: true },
      { key: "heroDescription", label: "Texte du bandeau", type: "textarea" },
      {
        key: "actions",
        label: "Boutons du bandeau",
        type: "repeater",
        help: "Boutons optionnels affichés dans le bandeau de la page.",
        subfields: [
          { key: "label", label: "Texte du bouton", type: "text", required: true },
          { key: "href", label: "Adresse (URL)", type: "text", required: true },
          { key: "variant", label: "Style", type: "text", help: "primary ou secondary" }
        ]
      },
      {
        key: "sections",
        label: "Sections de la page",
        type: "repeater",
        help: "Chaque section correspond à un titre/texte visible sur la page publique. Ne changez l'identifiant que si le code de la page a été adapté.",
        subfields: [
          { key: "id", label: "Identifiant technique", type: "text", required: true },
          { key: "eyebrow", label: "Sur-titre", type: "text" },
          { key: "title", label: "Titre", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" }
        ]
      }
    ]
  },
  {
    name: "news",
    label: "News",
    file: "news",
    idKey: "slug",
    titleKey: "title",
    listColumns: ["date", "category", "title"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "category", label: "Catégorie", type: "text" },
      { key: "image", label: "Photo", type: "file", accept: "image/*" },
      { key: "caption", label: "Légende de la photo", type: "text" },
      { key: "summary", label: "Résumé (court, affiché dans la liste des news)", type: "textarea" },
      {
        key: "content",
        label: "Texte de l'article",
        type: "paragraphs",
        help: "Laissez une ligne vide entre deux paragraphes."
      },
      { key: "documents", label: "Documents liés", type: "reference", refCollection: "documents" },
      { key: "slug", label: "Identifiant dans l'adresse (laisser vide = automatique)", type: "text" }
    ]
  },
  {
    name: "events",
    label: "Agenda",
    file: "events",
    idKey: "id",
    titleKey: "title",
    listColumns: ["date", "type", "title"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "time", label: "Heure", type: "text", help: "Ex : 20h" },
      { key: "location", label: "Lieu", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "url", label: "Lien (optionnel)", type: "text" },
      { key: "sourceUrl", label: "Lien source (optionnel)", type: "text" }
    ]
  },
  {
    name: "documents",
    label: "Documents",
    file: "documents",
    idKey: "id",
    titleKey: "title",
    listColumns: ["competition", "season", "title"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "type", label: "Type", type: "text", help: "Ex : Calendrier, Classement, Règlement…" },
      { key: "season", label: "Saison", type: "text", help: "Ex : 2025-26" },
      { key: "competition", label: "Compétition", type: "text", help: "Ex : SDA, LMF…" },
      { key: "date", label: "Date (optionnel)", type: "text" },
      { key: "url", label: "Fichier PDF", type: "file", accept: "application/pdf" },
      { key: "actionLabel", label: "Texte du bouton (optionnel)", type: "text" },
      { key: "sourceUrl", label: "Lien source (optionnel)", type: "text" }
    ]
  },
  {
    name: "home-documents",
    label: "Documents en avant (accueil)",
    file: "homeDocuments",
    idKey: "id",
    titleKey: "title",
    listColumns: ["competition", "season", "title"],
    fields: [
      { key: "title", label: "Texte affiché", type: "text", required: true },
      { key: "url", label: "Fichier associé", type: "file", accept: "application/pdf,image/*" },
      { key: "season", label: "Saison", type: "text", help: "Ex : 2025-26" },
      { key: "competition", label: "Catégorie", type: "text", help: "Ex : SDA, LMF…" },
      { key: "type", label: "Type (optionnel)", type: "text", help: "Ex : Calendrier, Classement…" },
      { key: "actionLabel", label: "Texte du bouton (optionnel)", type: "text" }
    ]
  },
  {
    name: "members",
    label: "Membres",
    file: "members",
    idKey: "id",
    titleKey: "lastName",
    listColumns: ["firstName", "lastName", "role"],
    fields: [
      { key: "firstName", label: "Prénom", type: "text", required: true },
      { key: "lastName", label: "Nom", type: "text", required: true },
      { key: "role", label: "Rôle", type: "text", help: "Ex : Membre actif 2025-26 / Ancien membre" },
      { key: "team", label: "Équipe (optionnel)", type: "text" },
      { key: "photo", label: "Photo", type: "file", accept: "image/*" }
    ]
  },
  {
    name: "teams",
    label: "Équipes",
    file: "teams",
    idKey: "id",
    titleKey: "name",
    listColumns: ["name", "competition", "season"],
    fields: [
      { key: "name", label: "Nom", type: "text", required: true },
      { key: "competition", label: "Compétition", type: "text" },
      { key: "season", label: "Saison", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "members", label: "Joueurs", type: "lines" }
    ]
  },
  {
    name: "seasons",
    label: "Saisons",
    file: "seasons",
    idKey: "id",
    titleKey: "label",
    listColumns: ["id", "label", "isCurrent"],
    fields: [
      { key: "label", label: "Libellé", type: "text", required: true, help: "Ex : 2025-26" },
      { key: "isCurrent", label: "Saison en cours", type: "boolean" }
    ]
  },
  {
    name: "videos",
    label: "Vidéos",
    file: "videos",
    idKey: "id",
    titleKey: "title",
    listColumns: ["year", "title"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "year", label: "Année", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "url", label: "Lien de la vidéo (YouTube, etc.)", type: "text" },
      { key: "thumbnail", label: "Image de la vignette", type: "file", accept: "image/*" }
    ]
  },
  {
    name: "archives",
    label: "Archives",
    file: "archives",
    idKey: "id",
    titleKey: "title",
    listColumns: ["id", "title"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "seasons", label: "Saisons concernées", type: "lines" },
      { key: "documentIds", label: "Documents", type: "reference", refCollection: "documents" },
      {
        key: "links",
        label: "Pages liées",
        type: "repeater",
        subfields: [
          { key: "label", label: "Texte du lien", type: "text", required: true },
          { key: "href", label: "Adresse (URL)", type: "text", required: true },
          { key: "description", label: "Description (optionnel)", type: "text" }
        ]
      }
    ]
  },
  {
    name: "archive-groups",
    label: "Groupes d'archives",
    file: "archiveGroups",
    idKey: "id",
    titleKey: "title",
    listColumns: ["title", "description"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "archiveIds", label: "Catégories d'archives", type: "reference", refCollection: "archives" },
      { key: "id", label: "Identifiant dans l'adresse (laisser vide = automatique)", type: "text" }
    ]
  },
  {
    name: "contact-blocks",
    label: "Blocs contact",
    file: "contactBlocks",
    idKey: "id",
    titleKey: "title",
    listColumns: ["title"],
    fields: [
      { key: "title", label: "Titre du bloc", type: "text", required: true },
      {
        key: "items",
        label: "Lignes de contact",
        type: "repeater",
        subfields: contactLineFields
      },
      { key: "id", label: "Identifiant dans l'adresse (laisser vide = automatique)", type: "text" }
    ]
  },
  {
    name: "legacy-pages",
    label: "Pages sources",
    file: "legacyPages",
    idKey: "slug",
    titleKey: "title",
    listColumns: ["destination", "title", "summary"],
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "destination", label: "Rubrique du site", type: "text", required: true, help: "Ex : Club, News, Agenda, Archives, LMF, Vidéos, Contact" },
      { key: "summary", label: "Résumé", type: "textarea" },
      { key: "sourceUrl", label: "Adresse de la source originale", type: "text" },
      { key: "content", label: "Texte de la page", type: "paragraphs" },
      {
        key: "tables",
        label: "Tableaux",
        type: "repeater",
        help: "Ajoutez les lignes une par une. Dans une ligne, écrivez une cellule par ligne.",
        subfields: [
          { key: "caption", label: "Titre du tableau", type: "text" },
          { key: "rows", label: "Lignes", type: "repeater", subfields: tableRowFields }
        ]
      },
      { key: "documents", label: "Documents liés", type: "repeater", subfields: embeddedDocumentFields },
      { key: "images", label: "Images liées", type: "files", accept: "image/*" },
      { key: "externalLinks", label: "Liens externes", type: "repeater", subfields: linkFields },
      { key: "sourceLinks", label: "Pages sources liées", type: "repeater", subfields: linkFields },
      { key: "slug", label: "Identifiant dans l'adresse (laisser vide = automatique)", type: "text" }
    ]
  }
];

// The site settings form reuses the same field system.
export const siteInfoFields: Field[] = [
  { key: "name", label: "Nom complet", type: "text", required: true },
  { key: "shortName", label: "Nom court", type: "text" },
  { key: "tagline", label: "Slogan", type: "text" },
  { key: "description", label: "Description (pour Google)", type: "textarea" },
  { key: "address", label: "Adresse", type: "text" },
  { key: "location", label: "Lieu de jeu", type: "text" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "website", label: "Site web", type: "text" },
  { key: "iban", label: "IBAN", type: "text" },
  { key: "logo", label: "Logo", type: "file", accept: "image/*" },
  { key: "heroImage", label: "Grande image d'accueil", type: "file", accept: "image/*" },
  { key: "update", label: "Date de mise à jour affichée", type: "text" }
];

export const siteNavigationField: Field = {
  key: "navigation",
  label: "Menu de navigation",
  type: "repeater",
  subfields: [
    { key: "label", label: "Texte du menu", type: "text", required: true },
    { key: "href", label: "Adresse (URL)", type: "text", required: true }
  ]
};

export const siteQuickLinksField: Field = {
  key: "quickLinks",
  label: "Accès rapides (page d'accueil)",
  type: "repeater",
  subfields: [
    { key: "label", label: "Titre", type: "text", required: true },
    { key: "href", label: "Adresse (URL)", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" }
  ]
};

export const getCollection = (name: string): CollectionDef | undefined =>
  collections.find((collection) => collection.name === name);

export const slugify = (value: string): string =>
  value
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "item";
