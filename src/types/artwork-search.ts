import type { Artwork } from "./artwork";

export interface ArtworkSearchQuery { q: string; artist: string; page: number }
export interface ArtworkSearchData {
  items: Artwork[];
  total: number;
  page: number;
  totalPages: number;
}
export type ArtworkSearchErrorCode = "invalid_query" | "rate_limited" | "timeout" | "unavailable" | "invalid_response";
export type ArtworkSearchResult = { ok: true; data: ArtworkSearchData } | { ok: false; code: ArtworkSearchErrorCode };
