import data from "./clubPalmares.json";

export interface ClubPalmaresLine {
  id: string;
  order?: number;
  season: string;
  competition: string;
  result: string;
}

export const clubPalmaresLines = data as ClubPalmaresLine[];
