import type { DocumentItem } from "./types";
import data from "./homeDocuments.json";

// The (up to 6) document cards featured in the "Documents" section of the home
// page. Curated from the admin so the club chooses exactly what is highlighted.
export const homeDocuments = data as DocumentItem[];
