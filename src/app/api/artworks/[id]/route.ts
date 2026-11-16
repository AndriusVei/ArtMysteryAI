import { getArtwork, artworkErrorMessages } from "@/lib/artic";
import type { ArtworkErrorCode } from "@/types/artwork";

const statusCodes: Record<ArtworkErrorCode, number> = {
  invalid_id: 400, not_found: 404, rate_limited: 429,
  timeout: 504, unavailable: 502, invalid_response: 502,
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getArtwork(id);
  if (!result.ok) {
    return Response.json({ error: { code: result.code, message: artworkErrorMessages[result.code] } }, {
      status: statusCodes[result.code],
      headers: { "Cache-Control": "no-store", ...(result.code === "rate_limited" ? { "Retry-After": "60" } : {}) },
    });
  }
  return Response.json({ data: result.artwork }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
}
