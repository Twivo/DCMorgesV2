import type { VideoItem } from "./types";
import data from "./videos.json";

// Newest videos first, by year.
export const videos = (data as VideoItem[])
  .slice()
  .sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
