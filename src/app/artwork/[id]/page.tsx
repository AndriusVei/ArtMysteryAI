import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtwork, artworkErrorMessages } from "@/lib/artic";
import { ArtworkDetails } from "@/components/artwork/artwork-details";
import { getArtworkTranslation } from "@/lib/artwork-translations";
import { ArtworkRetry } from "@/components/artwork/artwork-retry";

export const metadata = { title: "Kūrinio istorija" };

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getArtwork(id);
  if (!result.ok) {
    if (result.code === "invalid_id" || result.code === "not_found") notFound();
    return (
      <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
        <p className="eyebrow">Muziejaus duomenys nepasiekiami</p>
        <h1 className="mt-5 text-4xl sm:text-5xl">Istorijai reikia akimirkos.</h1>
        <p role="status" className="mt-6 text-lg leading-8 text-muted">{artworkErrorMessages[result.code]}</p>
        <ArtworkRetry />
        <Link href="/explore" className="mt-7 block underline underline-offset-8">Grįžti į meno paiešką</Link>
      </section>
    );
  }
  const { artwork } = result;
  return <ArtworkDetails key={artwork.id} artwork={artwork} translation={getArtworkTranslation(artwork)} />;
}
