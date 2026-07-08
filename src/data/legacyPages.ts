import type { LegacyPage } from "./types";
import data from "./legacyPages.json";

export const legacyPages = data as LegacyPage[];

export const getLegacyPagesByDestination = (destination: string) =>
  legacyPages.filter((page) => page.destination === destination);
