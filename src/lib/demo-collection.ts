import type { CollectionCategory, CollectionChanges, CollectionItem, CollectionRepository, SaveArtworkInput } from "@/types/collection";

export const DEMO_COLLECTION_KEY = "artmystery:demo:collection:v1";
export const MAX_COLLECTION_ITEMS = 100;
export const MAX_NOTE_LENGTH = 2000;
const MAX_STORAGE_LENGTH = 500000;

export const collectionCategories: Record<CollectionCategory, string> = {
  favorites: "Mėgstamiausi",
  to_explore: "Noriu tyrinėti",
  explored: "Ištyrinėti",
};

type ErrorCode = "storage" | "corrupt" | "quota" | "limit" | "invalid" | "missing" | "conflict";
const messages: Record<ErrorCode, string> = {
  storage: "Naršyklės saugykla nepasiekiama. Pakeitimai neišsaugoti. Patikrink naršyklės nustatymus.",
  corrupt: "Kolekcijos duomenų nepavyko perskaityti. Jie neperrašyti. Pabandyk kitą naršyklę arba kreipkis pagalbos.",
  quota: "Naršyklės saugykloje trūksta vietos. Pakeitimai neišsaugoti.",
  limit: "Demonstracinėje kolekcijoje gali būti iki 100 kūrinių.",
  invalid: "Patikrink duomenis: pasirink galiojančią kategoriją ir iki 2000 ženklų pastabą.",
  missing: "Šio kūrinio kolekcijoje nebėra. Atnaujink sąrašą.",
  conflict: "Šis įrašas jau pakeistas kitame lange. Atšauk redagavimą ir atverk jį iš naujo, kad neprarastum naujesnių pakeitimų.",
};

export class CollectionError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) { super(messages[code]); this.code = code; this.name = "CollectionError"; }
}

export function collectionErrorMessage(error: unknown): string {
  return error instanceof CollectionError ? error.message : messages.storage;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 999999999;
}
function validText(value: unknown, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= 2000 && (allowEmpty || value.trim().length > 0);
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 24) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function validCategory(value: unknown): value is CollectionCategory {
  return value === "favorites" || value === "to_explore" || value === "explored";
}

export function decodeDemoCollection(raw: string | null): CollectionItem[] {
  if (raw === null) return [];
  try {
    if (raw.length > MAX_STORAGE_LENGTH) throw new Error();
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_COLLECTION_ITEMS) throw new Error();
    const ids = new Set<number>();
    return data.items.map((item: unknown): CollectionItem => {
      if (!record(item) || !validId(item.artworkId) || item.id !== `demo-${item.artworkId}`
        || !validText(item.title) || !(item.artist === null || validText(item.artist))
        || typeof item.hasImage !== "boolean" || !validCategory(item.category)
        || !validText(item.notes, true) || !validDate(item.createdAt) || !validDate(item.updatedAt)
        || item.updatedAt < item.createdAt || ids.has(item.artworkId)) throw new Error();
      ids.add(item.artworkId);
      // Įtraukiami tik sutarti laukai, jokie saugyklos URL ar naudotojo ID neperkeliami.
      return { id: item.id as string, artworkId: item.artworkId, title: item.title,
        artist: item.artist, hasImage: item.hasImage, category: item.category, notes: item.notes,
        createdAt: item.createdAt, updatedAt: item.updatedAt };
    });
  } catch { throw new CollectionError("corrupt"); }
}

interface StorageAccess { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** Tik demo. account adapteris kuriamas atskirai; jokio automatinio duomenų perkėlimo. */
export function createDemoCollectionRepository(storage: () => StorageAccess, onChange: () => void = () => {}): CollectionRepository {
  const read = (): CollectionItem[] => {
    let raw: string | null;
    try { raw = storage().getItem(DEMO_COLLECTION_KEY); } catch { throw new CollectionError("storage"); }
    return decodeDemoCollection(raw);
  };
  const write = (items: CollectionItem[]) => {
    const raw = JSON.stringify({ version: 1, items });
    if (raw.length > MAX_STORAGE_LENGTH) throw new CollectionError("quota");
    try { storage().setItem(DEMO_COLLECTION_KEY, raw); }
    catch (error) { throw new CollectionError(error instanceof Error && error.name === "QuotaExceededError" ? "quota" : "storage"); }
    onChange();
  };
  const find = (items: CollectionItem[], id: number, expected: string) => {
    const item = items.find((entry) => entry.artworkId === id);
    if (!item) throw new CollectionError("missing");
    if (item.updatedAt !== expected) throw new CollectionError("conflict");
    return item;
  };

  return {
    mode: "demo",
    async list() { return read(); },
    async save(input: SaveArtworkInput) {
      if (!record(input) || !validId(input.artworkId) || !validText(input.title)
        || !(input.artist === null || validText(input.artist)) || typeof input.hasImage !== "boolean") throw new CollectionError("invalid");
      const items = read();
      const existing = items.find((item) => item.artworkId === input.artworkId);
      if (existing) return existing;
      if (items.length >= MAX_COLLECTION_ITEMS) throw new CollectionError("limit");
      const now = new Date().toISOString();
      const item: CollectionItem = { id: `demo-${input.artworkId}`, artworkId: input.artworkId,
        title: input.title.trim(), artist: input.artist?.trim() ?? null, hasImage: input.hasImage,
        category: "favorites", notes: "", createdAt: now, updatedAt: now };
      write([item, ...items]);
      return item;
    },
    async update(artworkId: number, changes: CollectionChanges, expectedUpdatedAt: string) {
      if (!validId(artworkId) || !record(changes) || !validCategory(changes.category) || !validText(changes.notes, true)) throw new CollectionError("invalid");
      const items = read();
      const item = find(items, artworkId, expectedUpdatedAt);
      const updated: CollectionItem = { ...item, category: changes.category, notes: changes.notes,
        updatedAt: new Date(Math.max(Date.now(), new Date(item.updatedAt).getTime() + 1)).toISOString() };
      write(items.map((entry) => entry.artworkId === artworkId ? updated : entry));
      return updated;
    },
    async remove(artworkId: number, expectedUpdatedAt: string) {
      if (!validId(artworkId)) throw new CollectionError("invalid");
      const items = read();
      find(items, artworkId, expectedUpdatedAt);
      write(items.filter((entry) => entry.artworkId !== artworkId));
    },
  };
}
