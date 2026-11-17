import type { Artwork } from "../types/artwork.ts";
import type { ArtworkText, ArtworkTranslation } from "../types/artwork-translation.ts";
import { artworkTextFingerprint, getArtworkTranslation } from "./artwork-translations.ts";

export class TranslationError extends Error {
  code: "rate_limited" | "unavailable";
  constructor(code: "rate_limited" | "unavailable") { super(code); this.code = code; }
}

const segments = new Map<string, { text: string; expires: number }>();
const pending = new Map<string, Promise<ArtworkTranslation>>();

/** MyMemory accepts at most 500 UTF-8 bytes. Preserve whitespace between chunks. */
export function splitTranslationText(text: string): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const token of text.match(/\S+\s*|\s+/gu) ?? []) {
    for (const char of token) {
      if (Buffer.byteLength(chunk + char, "utf8") > 450) {
        const boundary = chunk.lastIndexOf(" ");
        if (boundary > 0) {
          chunks.push(chunk.slice(0, boundary + 1));
          chunk = chunk.slice(boundary + 1);
        } else { chunks.push(chunk); chunk = ""; }
      }
      chunk += char;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

async function translateSegment(source: string, fetcher: typeof fetch): Promise<string> {
  if (!source.trim() || !/[a-z]/i.test(source)) return source;
  const cached = segments.get(source);
  if (fetcher === fetch && cached && cached.expires > Date.now()) return cached.text;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", source.trim());
  url.searchParams.set("langpair", "en|lt");
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(12000), redirect: "error", cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (response.status === 429) throw new TranslationError("rate_limited");
  if (!response.ok) throw new TranslationError("unavailable");
  const data = await response.json();
  if (Number(data.responseStatus) === 429 || data.quotaFinished === true) throw new TranslationError("rate_limited");
  const translated: unknown = data.responseData?.translatedText;
  if (Number(data.responseStatus) !== 200 || typeof translated !== "string" || !translated.trim() || translated.length > 10000) {
    throw new TranslationError("unavailable");
  }
  // Render as React text, never HTML. Decode common entities returned by the service.
  const decoded = translated.replace(/&(amp|quot|apos|lt|gt|#39);/g, (entity) =>
    ({ "&amp;": "&", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">" })[entity] ?? entity);
  const text = (source.match(/^\s*/u)?.[0] ?? "") + decoded.trim() + (source.match(/\s*$/u)?.[0] ?? "");
  if (fetcher === fetch) {
    if (segments.size >= 1000) segments.delete(segments.keys().next().value!);
    segments.set(source, { text, expires: Date.now() + 86400000 });
  }
  return text;
}

export async function translateArtwork(artwork: Artwork, fetcher: typeof fetch = fetch): Promise<ArtworkTranslation> {
  const reviewed = getArtworkTranslation(artwork);
  if (reviewed) return reviewed;
  const fingerprint = artworkTextFingerprint(artwork);
  if (fetcher === fetch && pending.has(fingerprint)) return pending.get(fingerprint)!;
  if (pending.size >= 20) throw new TranslationError("rate_limited");
  const work = async (): Promise<ArtworkTranslation> => {
    const text: ArtworkText = {
      title: artwork.title, artistDisplay: artwork.artistDisplay, date: artwork.date,
      medium: artwork.medium, dimensions: artwork.dimensions, type: artwork.type,
      creditLine: artwork.creditLine, description: artwork.description,
    };
    try {
      for (const key of Object.keys(text) as (keyof ArtworkText)[]) {
        const source = text[key];
        if (source === null) continue;
        const translated: string[] = [];
        for (const paragraph of source.split(/(\n+)/u)) {
          for (const chunk of splitTranslationText(paragraph)) translated.push(await translateSegment(chunk, fetcher));
        }
        text[key] = translated.join("");
      }
      return { language: "lt", sourceFingerprint: fingerprint, automatic: true, text };
    } catch (error) {
      throw error instanceof TranslationError ? error : new TranslationError("unavailable");
    }
  };
  const result = work();
  if (fetcher === fetch) pending.set(fingerprint, result);
  try { return await result; }
  finally { if (fetcher === fetch) pending.delete(fingerprint); }
}
