import type { DocumentItem } from "./types";
import data from "./documents.json";

export const documents = data as DocumentItem[];

export const getDocumentsByCompetition = (competition: string) =>
  documents.filter((document) => document.competition === competition);
