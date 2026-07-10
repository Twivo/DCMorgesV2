// Server-side data store: reads and writes the JSON files under src/data/ that
// back each collection. Used only by the admin API routes (Node runtime).
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CollectionDef, Field } from "./collections";
import { slugify } from "./collections";
import { writeJsonAtomic } from "./fs";

const dataDir = resolve(process.cwd(), "src", "data");
const fileFor = (def: CollectionDef) => resolve(dataDir, `${def.file}.json`);

export type Item = Record<string, unknown>;

export async function readAll(def: CollectionDef): Promise<Item[]> {
  const raw = await readFile(fileFor(def), "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeAll(def: CollectionDef, items: Item[]): Promise<void> {
  await writeJsonAtomic(fileFor(def), items);
}

const toLines = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value === undefined || value === null) return [];
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

// Coerce a raw form value into the type described by its field. Scalar optional
// values become undefined when empty (so we never store noise like ""); array
// fields always return an array (possibly empty) so page rendering is safe.
function coerceField(field: Field, value: unknown): unknown {
  switch (field.type) {
    case "number": {
      if (value === "" || value === undefined || value === null) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? undefined : n;
    }
    case "boolean":
      return value === true || value === "true" || value === "on" || value === 1;
    case "lines":
    case "files":
      return toLines(value);
    case "paragraphs": {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
      return String(value ?? "")
        .split(/\r?\n\s*\r?\n+/) // blank line separates paragraphs
        .map((p) => p.trim())
        .filter(Boolean);
    }
    case "reference":
      return toLines(value); // array of ids
    case "repeater": {
      const rows = Array.isArray(value) ? value : [];
      const sub = field.subfields ?? [];
      return rows
        .map((row) => {
          const obj: Item = {};
          for (const f of sub) {
            const c = coerceField(f, (row as Item)?.[f.key]);
            if (c !== undefined) obj[f.key] = c;
          }
          return obj;
        })
        .filter((obj) => Object.keys(obj).length > 0);
    }
    default: {
      // text, textarea, date, file
      if (value === undefined || value === null) return undefined;
      const s = String(value).trim();
      return s === "" ? undefined : s;
    }
  }
}

const ARRAY_TYPES = new Set(["lines", "files", "paragraphs", "reference", "repeater"]);

// Build a clean item from a raw payload according to the schema.
export function normalize(def: CollectionDef, payload: Item): Item {
  const out: Item = {};
  for (const field of def.fields) {
    const coerced = coerceField(field, payload[field.key]);
    // Keep array fields even when empty; drop empty scalar optionals.
    if (coerced !== undefined || ARRAY_TYPES.has(field.type)) {
      out[field.key] = coerced ?? [];
    }
  }
  return out;
}

export function validate(def: CollectionDef, item: Item): string | null {
  for (const field of def.fields) {
    if (field.required && (item[field.key] === undefined || item[field.key] === "")) {
      return `Le champ « ${field.label} » est obligatoire.`;
    }
  }
  return null;
}

function makeId(def: CollectionDef, item: Item, existing: Item[]): string {
  const base = slugify(String(item[def.titleKey] ?? item[def.idKey] ?? "item"));
  const taken = new Set(existing.map((i) => String(i[def.idKey])));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function createItem(def: CollectionDef, payload: Item): Promise<Item> {
  const items = await readAll(def);
  const item = normalize(def, payload);
  const error = validate(def, item);
  if (error) throw new HttpError(400, error);
  const providedId = item[def.idKey] ? slugify(String(item[def.idKey])) : "";
  const id = providedId && !items.some((i) => String(i[def.idKey]) === providedId)
    ? providedId
    : makeId(def, item, items);
  item[def.idKey] = id;
  items.push(item);
  await writeAll(def, items);
  return item;
}

export async function updateItem(def: CollectionDef, id: string, payload: Item): Promise<Item> {
  const items = await readAll(def);
  const index = items.findIndex((i) => String(i[def.idKey]) === id);
  if (index === -1) throw new HttpError(404, "Élément introuvable.");
  // Preserve any stored fields that are not part of the current form schema
  // (e.g. legacy article paragraphs) so editing never silently drops them.
  const existing = items[index];
  const schemaKeys = new Set(def.fields.map((f) => f.key));
  const preserved: Item = {};
  for (const key of Object.keys(existing)) {
    if (!schemaKeys.has(key) && key !== def.idKey) preserved[key] = existing[key];
  }
  const item = { ...preserved, ...normalize(def, payload) };
  const error = validate(def, item);
  if (error) throw new HttpError(400, error);
  item[def.idKey] = id; // id is immutable via update
  items[index] = item;
  await writeAll(def, items);
  return item;
}

export async function deleteItem(def: CollectionDef, id: string): Promise<void> {
  const items = await readAll(def);
  const next = items.filter((i) => String(i[def.idKey]) !== id);
  if (next.length === items.length) throw new HttpError(404, "Élément introuvable.");
  await writeAll(def, next);
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
