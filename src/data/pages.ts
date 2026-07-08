import type { PageAction, SitePageContent, SitePageSection } from "./types";
import data from "./pages.json";

export const sitePages = data as SitePageContent[];

export const getSitePage = (id: string): SitePageContent =>
  sitePages.find((page) => page.id === id) ?? {
    id,
    label: id,
    path: "/",
    seoTitle: id,
    seoDescription: "",
    heroTitle: id,
    heroDescription: "",
    sections: []
  };

export const getPageSection = (page: SitePageContent, id: string): SitePageSection =>
  page.sections.find((section) => section.id === id) ?? {
    id,
    title: id
  };

export const formatPageText = (
  value = "",
  vars: Record<string, string | number | undefined> = {}
): string =>
  Object.entries(vars).reduce(
    (text, [key, replacement]) => text.replaceAll(`{{${key}}}`, String(replacement ?? "")),
    value
  );

export const formatPageSection = (
  section: SitePageSection,
  vars: Record<string, string | number | undefined> = {}
): SitePageSection => ({
  ...section,
  eyebrow: formatPageText(section.eyebrow, vars),
  title: formatPageText(section.title, vars),
  description: formatPageText(section.description, vars)
});

export const formatPageActions = (
  actions: PageAction[] = [],
  vars: Record<string, string | number | undefined> = {}
): PageAction[] =>
  actions.map((action) => ({
    ...action,
    label: formatPageText(action.label, vars),
    href: formatPageText(action.href, vars),
    description: formatPageText(action.description, vars)
  }));
