export interface NavItem {
  label: string;
  href: string;
}

export interface LinkItem {
  label: string;
  href: string;
  description?: string;
}

export interface PageAction extends LinkItem {
  variant?: "primary" | "secondary";
}

export interface NewsItem {
  slug: string;
  title: string;
  date: string;
  category: string;
  image?: string;
  caption?: string;
  summary: string;
  content?: string[];
  documents?: string[];
  sourceUrl?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string; // ISO YYYY-MM-DD
  time?: string; // e.g. "20h"
  location: string;
  type: string;
  description: string;
  url?: string;
  sourceUrl?: string;
}

export interface DocumentItem {
  id: string;
  order?: number;
  title: string;
  type: string;
  season: string;
  competition: string;
  date?: string;
  url?: string;
  sourceUrl?: string;
  actionLabel?: string;
  downloadLabel?: string;
}

export interface TeamItem {
  id: string;
  name: string;
  competition: string;
  season: string;
  description: string;
  members: string[];
}

export interface MemberItem {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  team?: string;
  photo?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  year: string;
  description: string;
  url?: string;
  thumbnail?: string;
}

export interface ArchiveCategory {
  id: string;
  order?: number;
  title: string;
  description: string;
  seasons: string[];
  documentIds: string[];
  links: LinkItem[];
}

export interface SeasonItem {
  id: string;
  label: string;
  isCurrent?: boolean;
}

export interface SitePageSection {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
}

export interface SitePageContent {
  id: string;
  label: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  heroEyebrow?: string;
  heroTitle: string;
  heroDescription: string;
  actions?: PageAction[];
  sections: SitePageSection[];
}

export interface ContactLine {
  label: string;
  value: string;
  href?: string;
}

export interface ContactBlock {
  id: string;
  title: string;
  items: ContactLine[];
}

export interface ArchiveGroup {
  id: string;
  title: string;
  description: string;
  archiveIds: string[];
}

export interface LegacyTableRow {
  /** Cell texts, left to right. */
  c: string[];
  /** True when the whole row is a header row (rendered with <th>). */
  h?: boolean;
  /** Per-cell colspan; present only when at least one cell spans > 1 column. */
  s?: number[];
}

export interface LegacyTable {
  /** Optional caption shown above the table. */
  caption?: string;
  rows: LegacyTableRow[];
}

export interface LegacyPage {
  slug: string;
  title: string;
  sourceUrl: string;
  destination: string;
  summary: string;
  content: string[];
  tables?: LegacyTable[];
  documents: DocumentItem[];
  images: string[];
  externalLinks: LinkItem[];
  sourceLinks: LinkItem[];
}
