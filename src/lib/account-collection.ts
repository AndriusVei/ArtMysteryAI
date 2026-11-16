import type { CollectionCategory, CollectionChanges, CollectionItem } from "@/types/collection";

export const accountCollectionMessages = {
  unauthorized: "Sesija nebegalioja. Prisijunk ir pabandyk dar kartą.",
  unavailable: "Paskyros kolekcija šiuo metu nepasiekiama. Pakeitimų sėkmė nepatvirtinta; atnaujink sąrašą prieš kartodamas.",
  invalid: "Patikrink kūrinio numerį, kategoriją ir pastabą (iki 2000 ženklų).",
  conflict: "Įrašas jau pakeistas arba pašalintas. Atnaujink kolekciją ir atverk redagavimą iš naujo.",
  forbidden: "Ši užklausa neleidžiama. Atverk kolekciją šios svetainės lange.",
  museum: "Kūrinio duomenų muziejuje patikrinti nepavyko. Pabandyk vėliau.",
  limit: "Kolekcijos įrašų per daug vienai peržiūrai. Kreipkis į projekto administratorių.",
};
export class AccountCollectionError extends Error {
  readonly code: keyof typeof accountCollectionMessages;
  readonly status: number;
  constructor(code: keyof typeof accountCollectionMessages, status = 503) {
    super(accountCollectionMessages[code]); this.name = "AccountCollectionError"; this.code = code; this.status = status;
  }
}
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const validAccountArtworkId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 999999999;
const category = (value: unknown): value is CollectionCategory => typeof value === "string" && ["favorites", "to_explore", "explored"].includes(value);
const date = (value: unknown): value is string => typeof value === "string" && value.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const text = (value: unknown, empty = false): value is string => typeof value === "string" && value.length <= 2000 && (empty || value.trim().length > 0);

export function validateCollectionMutation(value: unknown, method: "POST" | "PATCH" | "DELETE") {
  if (!object(value) || !validAccountArtworkId(value.artworkId)) throw new AccountCollectionError("invalid", 400);
  const allowed = method === "POST" ? ["artworkId"] : method === "PATCH" ? ["artworkId", "category", "notes", "expectedUpdatedAt"] : ["artworkId", "expectedUpdatedAt"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new AccountCollectionError("invalid", 400);
  if (method !== "POST" && !date(value.expectedUpdatedAt)) throw new AccountCollectionError("invalid", 400);
  if (method === "PATCH" && (!category(value.category) || !text(value.notes, true))) throw new AccountCollectionError("invalid", 400);
  return { artworkId: value.artworkId, expectedUpdatedAt: value.expectedUpdatedAt as string | undefined,
    changes: method === "PATCH" ? { category: value.category, notes: value.notes } as CollectionChanges : undefined };
}

export function parseAccountCollectionItem(value: unknown): CollectionItem {
  if (!object(value) || typeof value.id !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value.id)
    || !validAccountArtworkId(value.artworkId) || !text(value.title) || (value.artist !== null && !text(value.artist))
    || typeof value.hasImage !== "boolean" || !category(value.category) || !text(value.notes, true)
    || !date(value.createdAt) || !date(value.updatedAt)) throw new AccountCollectionError("unavailable");
  return { id: value.id, artworkId: value.artworkId, title: value.title, artist: value.artist as string | null,
    hasImage: value.hasImage, category: value.category, notes: value.notes, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

export async function readCollectionBody(request: Request): Promise<unknown> {
  const maxBytes = 16000;
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
    || Number(request.headers.get("content-length")) > maxBytes || !request.body) throw new AccountCollectionError("invalid", 400);
  const reader = request.body.getReader(), decoder = new TextDecoder(); let raw = "", size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new AccountCollectionError("invalid", 400); }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  try { return JSON.parse(raw) as unknown; } catch { throw new AccountCollectionError("invalid", 400); }
}

export function requireSameOrigin(request: Request) {
  const denied = () => { throw new AccountCollectionError("forbidden", 403); };
  if (request.headers.get("sec-fetch-site") === "cross-site") return denied();
  const value = request.headers.get("origin");
  if (!value) return denied();
  const target = new URL(request.url);
  if (value === target.origin) return;
  try {
    const origin = new URL(value);
    const loopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    // NextURL normalizuoja loopback IP į localhost. Originalų naršyklės adresą
    // šiuo vienu atveju tikriname pagal Host, nekeisdami protokolo ar prievado.
    // Forwarded antraštės šiai išimčiai nenaudojamos.
    if (value === origin.origin && loopback(target.hostname) && loopback(origin.hostname)
      && origin.protocol === target.protocol && origin.port === target.port
      && request.headers.get("host")?.toLowerCase() === origin.host) return;
  } catch { /* Netinkamas Origin atmetamas. */ }
  return denied();
}
