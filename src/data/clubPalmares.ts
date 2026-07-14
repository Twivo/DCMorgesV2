import data from "./clubPalmares.json";

export interface ClubPalmaresLine {
  id: string;
  order?: number;
  season: string;
  competition: string;
  result: string;
}

export const clubPalmaresLines = data as ClubPalmaresLine[];

// Canonical palmarès ordering (newest season first). Sorted once and shared
// so pages don't re-implement the comparator or copy the array to sort it.
export const clubPalmaresLinesSorted = [...clubPalmaresLines].sort(
  (a, b) =>
    (b.order ?? Number.NEGATIVE_INFINITY) - (a.order ?? Number.NEGATIVE_INFINITY) ||
    b.season.localeCompare(a.season, "fr") ||
    a.competition.localeCompare(b.competition, "fr")
);
