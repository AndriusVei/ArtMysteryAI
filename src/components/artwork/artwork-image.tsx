"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArtworkImageData, Artwork } from "@/types/artwork";

type Props = {
  artworkId: number;
  image: ArtworkImageData | null;
  title: string;
  artist: string | null;
  unavailableReason: Artwork["imageUnavailableReason"];
};

export function ArtworkImage({ artworkId, image, title, artist, unavailableReason }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!image || failed) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 border border-line bg-white/40 px-7 py-16 text-center sm:min-h-96" role="status">
        <span aria-hidden="true" className="text-4xl text-gold">◇</span>
        <p className="font-semibold">{failed ? "Paveikslo nepavyko įkelti" : "Paveikslas nerodomas"}</p>
        <p className="max-w-sm text-sm leading-7 text-muted">
          {failed ? "Muziejaus vaizdų paslauga gali būti laikinai nepasiekiama. Kūrinio informaciją gali skaityti toliau."
            : unavailableReason === "rights" ? "Šio paveikslo naudojimo teisės nepatvirtintos. Jį gali peržiūrėti muziejaus svetainėje."
            : "Muziejus šiuo metu nepateikia tinkamo šio kūrinio vaizdo."}
        </p>
        {failed && <button type="button" onClick={() => { setLoaded(false); setFailed(false); }}
          className="mt-2 min-h-12 border border-ink px-5 py-3 text-sm hover:bg-ink hover:text-paper">
          Bandyti įkelti paveikslą dar kartą
        </button>}
      </div>
    );
  }

  return (
    <div className="border border-line bg-white/40 p-3 sm:p-6">
      {!loaded && <p role="status" className="pb-3 text-center text-sm text-muted">Įkeliamas muziejaus paveikslas…</p>}
      <Image
        src={`/api/artworks/${artworkId}/image`}
        alt={`${title}${artist ? ` – ${artist}` : ""}. Muziejaus kūrinio reprodukcija.`}
        width={image.width}
        height={image.height}
        unoptimized
        loading="eager"
        className="mx-auto h-auto max-h-[75vh] w-full object-contain"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
