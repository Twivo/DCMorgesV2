import type { LinkItem, NavItem } from "./types";
import data from "./site.json";

export const siteInfo = data.info;
export const navigation = data.navigation as NavItem[];
export const quickLinks = data.quickLinks as LinkItem[];
