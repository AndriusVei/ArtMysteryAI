import { traceRoute } from "@/lib/diagnostics-server";
import { searchArtworks, artworkSearchErrorMessages } from "@/lib/artic";
import type { ArtworkSearchErrorCode } from "@/types/artwork-search";

const statuses: Record<ArtworkSearchErrorCode, number> = {
  invalid_query: 400, rate_limited: 429, timeout: 504, unavailable: 502, invalid_response: 502,
};

export const GET = traceRoute(async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const field = (key: string) => params.getAll(key).length > 1 ? params.getAll(key) : params.get(key) ?? undefined;
  const result = await searchArtworks({ q: field("q"), artist: field("artist"), page: field("page") });
  if (!result.ok) return Response.json({ error: { code: result.code, message: artworkSearchErrorMessages[result.code] } }, {
    status: statuses[result.code],
    headers: { "Cache-Control": "no-store", ...(result.code === "rate_limited" ? { "Retry-After": "60" } : {}) },
  });
  return Response.json({ data: result.data }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
});
