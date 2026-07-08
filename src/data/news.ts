import type { NewsItem } from "./types";
import data from "./news.json";

// Always expose the news newest-first, sorted by ISO publication date, so new
// items added via the admin appear at the top regardless of insertion order.
export const newsItems = (data as NewsItem[])
  .slice()
  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
