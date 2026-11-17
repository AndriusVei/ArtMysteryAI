import { getArtwork } from "@/lib/artic";
import { translateArtwork, TranslationError } from "@/lib/translate-artwork";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getArtwork(id);
  if (!result.ok) return Response.json({ error: "Kūrinio duomenų nepavyko gauti. Pabandyk dar kartą." },
    { status: result.code === "invalid_id" ? 400 : result.code === "not_found" ? 404 : 503 });
  try {
    return Response.json({ translation: await translateArtwork(result.artwork) }, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    const limited = error instanceof TranslationError && error.code === "rate_limited";
    return Response.json({ error: limited
      ? "Šiandienos nemokamo vertimo limitas pasiektas. Bandyk vėliau arba skaityk originalą."
      : "Vertimas šiuo metu nepasiekiamas. Pabandyk dar kartą arba skaityk originalą." },
    { status: limited ? 429 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
