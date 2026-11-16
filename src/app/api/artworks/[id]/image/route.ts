import { getArtworkImage, artworkErrorMessages } from "@/lib/artic";
import type { ArtworkImageErrorCode } from "@/types/artwork";

const statuses: Record<ArtworkImageErrorCode, number> = {
  invalid_id: 400, not_found: 404, image_unavailable: 404,
  rate_limited: 429, timeout: 504, unavailable: 502, invalid_response: 502, invalid_image: 502,
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getArtworkImage(id);
  if (!result.ok) {
    const message = result.code === "image_unavailable" ? "Muziejus nepateikia šio kūrinio viešo naudojimo vaizdo."
      : result.code === "invalid_image" ? "Muziejaus vaizdo šiuo metu nepavyksta gauti. Pabandyk vėliau."
      : artworkErrorMessages[result.code];
    return Response.json({ error: { code: result.code, message } }, {
      status: statuses[result.code],
      headers: { "Cache-Control": "no-store", ...(result.code === "rate_limited" ? { "Retry-After": "60" } : {}) },
    });
  }
  return new Response(result.buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(result.buffer.byteLength),
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
