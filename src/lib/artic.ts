import { diagnosticFetch } from "./diagnostics-server.ts";
import type { Artwork, ArtworkErrorCode, ArtworkResult, ArtworkImageResult } from "@/types/artwork";
import type { ArtworkSearchQuery, ArtworkSearchData, ArtworkSearchResult, ArtworkSearchErrorCode } from "@/types/artwork-search";

const API_BASE = "https://api.artic.edu/api/v1";
const FIELDS = [
  "id", "title", "artist_title", "artist_display", "date_display",
  "medium_display", "dimensions", "artwork_type_title", "description",
  "short_description", "image_id", "is_public_domain", "copyright_notice",
  "credit_line", "thumbnail",
].join(",");

export const SEARCH_PAGE_SIZE = 9;
export const MAX_SEARCH_PAGE = 50;
export const MAX_SEARCH_TEXT = 120;

/** Nepriimame masyvų, objektų ar neapdorotų Elasticsearch užklausų iš naršyklės. */
export function validateArtworkSearch(input: { q?: unknown; artist?: unknown; page?: unknown }): ArtworkSearchQuery | null {
  const clean = (value: unknown): string | null => value === undefined ? ""
    : typeof value === "string" && value.length <= MAX_SEARCH_TEXT && !/[\u0000-\u001f\u007f]/.test(value)
      ? value.trim().replace(/\s+/g, " ") : null;
  const q = clean(input.q), artist = clean(input.artist);
  const rawPage = input.page ?? "1";
  if (q === null || artist === null || (!q && !artist)
    || typeof rawPage !== "string" || !/^[1-9]\d?$/.test(rawPage)) return null;
  const page = Number(rawPage);
  return page <= MAX_SEARCH_PAGE ? { q, artist, page } : null;
}

export const artworkSearchErrorMessages: Record<ArtworkSearchErrorCode, string> = {
  invalid_query: "Įrašyk raktažodį arba autorių (iki 120 ženklų). Puslapio numeris turi būti nuo 1 iki 50.",
  rate_limited: "Muziejaus užklausų limitas pasiektas. Palauk minutę ir bandyk dar kartą.",
  timeout: "Paieška užtruko per ilgai. Pabandyk dar kartą po kelių akimirkų.",
  unavailable: "Šiuo metu muziejaus paieška nepasiekiama. Pabandyk vėliau.",
  invalid_response: "Muziejus grąžino neatpažįstamus paieškos duomenis. Pabandyk vėliau.",
};

export function parseArtworkSearchResponse(payload: unknown, page: number): ArtworkSearchData {
  if (!record(payload) || !Array.isArray(payload.data) || !record(payload.pagination)
    || payload.data.length > SEARCH_PAGE_SIZE) throw new Error("invalid_response");
  const pagination = payload.pagination;
  if (!Number.isSafeInteger(pagination.total) || (pagination.total as number) < payload.data.length
    || pagination.current_page !== page || pagination.limit !== SEARCH_PAGE_SIZE) throw new Error("invalid_response");
  const seen = new Set<number>();
  const items = payload.data.map((data: unknown) => {
    if (!record(data) || typeof data.id !== "number" || parseArtworkId(data.id) === null || seen.has(data.id)) {
      throw new Error("invalid_response");
    }
    seen.add(data.id);
    // B tikrinimas išlaiko vienodas metaduomenų, teisių ir IIIF taisykles.
    return parseArtworkResponse({ data, config: payload.config }, data.id);
  });
  const total = pagination.total as number;
  return { items, total, page, totalPages: Math.min(MAX_SEARCH_PAGE, Math.ceil(total / SEARCH_PAGE_SIZE)) };
}

/** Užklausa sudaroma tik serveryje iš patikrintų teksto laukų. */
export async function searchArtworks(input: { q?: unknown; artist?: unknown; page?: unknown }, fetcher: typeof fetch = fetch): Promise<ArtworkSearchResult> {
  const query = validateArtworkSearch(input);
  if (!query) return { ok: false, code: "invalid_query" };
  const filter: object[] = [{ term: { is_public_domain: true } }, { exists: { field: "image_id" } }];
  if (query.artist) filter.push({ match_phrase: { artist_title: query.artist } });
  const url = new URL(`${API_BASE}/artworks/search`);
  url.searchParams.set("params", JSON.stringify({
    fields: ["id", "title", "artist_title", "date_display", "image_id", "is_public_domain", "copyright_notice", "thumbnail"],
    limit: SEARCH_PAGE_SIZE, page: query.page,
    query: { bool: { filter, ...(query.q ? { must: [{ multi_match: { query: query.q, fields: ["title^3", "artist_title"], operator: "and" } }] } : {}) } },
  }));
  try {
    const response = await diagnosticFetch(fetcher, "artic", "/artworks/search")(url.href, {
      headers: { Accept: "application/json", "AIC-User-Agent": "ArtMystery AI" },
      signal: AbortSignal.timeout(10000), redirect: "error", next: { revalidate: 3600 },
    });
    if (response.status === 429) { await response.body?.cancel(); return { ok: false, code: "rate_limited" }; }
    if (!response.ok) { await response.body?.cancel(); return { ok: false, code: "unavailable" }; }
    const maxBytes = 128000;
    if (!response.body || !response.headers.get("content-type")?.toLowerCase().includes("application/json")
      || Number(response.headers.get("content-length")) > maxBytes) {
      await response.body?.cancel(); return { ok: false, code: "invalid_response" };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "", size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return { ok: false, code: "invalid_response" }; }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try { return { ok: true, data: parseArtworkSearchResponse(JSON.parse(text) as unknown, query.page) }; }
    catch { return { ok: false, code: "invalid_response" }; }
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, code: timeout ? "timeout" : "unavailable" };
  }
}

export function parseArtworkId(value: string | number): number | null {
  const text = String(value);
  if (!/^[1-9]\d{0,8}$/.test(text)) return null;
  return Number(text);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, limit = 2000): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > limit) throw new Error("invalid_response");
  return value.trim() || null;
}

/** Tik tekstas: rezultatas visada pateikiamas per React, niekada kaip HTML. */
export function museumTextToPlainText(html: string): string {
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  };
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/(?:p|div|li)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name.startsWith("#")) {
        const code = name[1].toLowerCase() === "x"
          ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code) : "�";
      }
      return entities[name.toLowerCase()] ?? entity;
    })
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

function validIiifBase(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.origin !== "https://www.artic.edu" || url.pathname.replace(/\/$/, "") !== "/iiif/2"
      || url.username || url.password || url.search || url.hash) return null;
    return "https://www.artic.edu/iiif/2";
  } catch { return null; }
}

/** Išorinis JSON netampa Artwork, kol nepatikrinta struktūra, ID ir vaizdo teisės. */
export function parseArtworkResponse(payload: unknown, expectedId: number): Artwork {
  if (!record(payload) || !record(payload.data) || payload.data.id !== expectedId) {
    throw new Error("invalid_response");
  }
  const data = payload.data;
  const copyrightNotice = optionalText(data.copyright_notice);
  const isPublicDomain = data.is_public_domain === true;
  const imageId = optionalText(data.image_id, 100);
  const iiifBase = record(payload.config) ? validIiifBase(payload.config.iiif_url) : null;
  const permitted = isPublicDomain && !copyrightNotice;
  const usableImageId = imageId && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(imageId);
  const hasImage = permitted && usableImageId && iiifBase;
  const thumb = record(data.thumbnail) ? data.thumbnail : {};
  const hasDimensions = typeof thumb.width === "number" && Number.isFinite(thumb.width)
    && thumb.width > 0 && typeof thumb.height === "number" && Number.isFinite(thumb.height)
    && thumb.height > 0 && thumb.height / thumb.width >= 0.05 && thumb.height / thumb.width <= 20;
  const height = hasDimensions ? Math.round(843 * (thumb.height as number) / (thumb.width as number)) : 843;
  const description = optionalText(data.description, 50000) ?? optionalText(data.short_description, 50000);

  return {
    id: expectedId,
    title: optionalText(data.title) ?? "Pavadinimas nepateiktas",
    artist: optionalText(data.artist_title),
    artistDisplay: optionalText(data.artist_display),
    date: optionalText(data.date_display),
    medium: optionalText(data.medium_display),
    dimensions: optionalText(data.dimensions),
    type: optionalText(data.artwork_type_title),
    description: description ? museumTextToPlainText(description) || null : null,
    creditLine: optionalText(data.credit_line),
    copyrightNotice,
    isPublicDomain,
    museumUrl: `https://www.artic.edu/artworks/${expectedId}`,
    image: hasImage ? { url: `${iiifBase}/${imageId}/full/843,/0/default.jpg`, width: 843, height } : null,
    imageUnavailableReason: hasImage ? null : !permitted ? "rights" : !usableImageId ? "missing" : "configuration",
  };
}

/** Tik vieši muziejaus duomenys. Jokių raktų, paskyrų ar mokamų užklausų. */
export async function getArtwork(value: string | number, fetcher: typeof fetch = fetch): Promise<ArtworkResult> {
  const id = parseArtworkId(value);
  if (id === null) return { ok: false, code: "invalid_id" };
  try {
    const response = await diagnosticFetch(fetcher, "artic", "/artworks/:id")(`${API_BASE}/artworks/${id}?fields=${FIELDS}`, {
      headers: { Accept: "application/json", "AIC-User-Agent": "ArtMystery AI" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
    if (response.status === 404) return { ok: false, code: "not_found" };
    if (response.status === 429) return { ok: false, code: "rate_limited" };
    if (!response.ok) return { ok: false, code: "unavailable" };
    const text = await response.text();
    if (text.length > 128000) return { ok: false, code: "invalid_response" };
    try {
      return { ok: true, artwork: parseArtworkResponse(JSON.parse(text) as unknown, id) };
    } catch { return { ok: false, code: "invalid_response" }; }
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, code: timeout ? "timeout" : "unavailable" };
  }
}

export const artworkErrorMessages: Record<ArtworkErrorCode, string> = {
  invalid_id: "Kūrinio numeris netinkamas. Atverk kūrinį iš paieškos rezultatų.",
  not_found: "Muziejus tokio kūrinio nerado. Patikrink kūrinio numerį.",
  rate_limited: "Muziejaus užklausų limitas pasiektas. Palauk minutę ir bandyk dar kartą.",
  timeout: "Muziejus neatsakė laiku. Pabandyk dar kartą po kelių akimirkų.",
  unavailable: "Šiuo metu nepavyksta susisiekti su muziejumi. Pabandyk vėliau.",
  invalid_response: "Muziejus grąžino neatpažįstamus duomenis. Pabandyk vėliau.",
};

/** Vaizdo adresas gaunamas tik iš patikrinto muziejaus atsakymo, ne iš naršyklės URL. */
export async function getArtworkImage(value: string | number, fetcher: typeof fetch = fetch): Promise<ArtworkImageResult> {
  const result = await getArtwork(value, fetcher);
  if (!result.ok) return result;
  if (!result.artwork.image) return { ok: false, code: "image_unavailable" };

  const maxBytes = 8 * 1024 * 1024;
  try {
    const response = await diagnosticFetch(fetcher, "artic", "/iiif/2/:image")(result.artwork.image.url, {
      headers: { Accept: "image/jpeg", "AIC-User-Agent": "ArtMystery AI" },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      next: { revalidate: 3600 },
    });
    if (response.status === 429) return { ok: false, code: "rate_limited" };
    if (!response.ok) return { ok: false, code: "unavailable" };
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    const contentLength = Number(response.headers.get("content-length"));
    if (contentType !== "image/jpeg" || contentLength > maxBytes || !response.body) {
      await response.body?.cancel();
      return { ok: false, code: "invalid_image" };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, code: "invalid_image" };
      }
      chunks.push(chunk);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    // Nepersiųsti HTML patikros puslapio net jei šaltinis neteisingai nurodo MIME tipą.
    if (size < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return { ok: false, code: "invalid_image" };
    }
    return { ok: true, buffer: bytes.buffer };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, code: timeout ? "timeout" : "unavailable" };
  }
}
