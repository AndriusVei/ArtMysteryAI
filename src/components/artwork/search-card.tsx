"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Artwork } from "@/types/artwork";

export function SearchCard({ artwork }: { artwork: Artwork }) {
  const [failed, setFailed] = useState(false);
  return <li className="min-w-0 border border-line bg-white/30">
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-white/50">
      {artwork.image && !failed ? <Image src={`/api/artworks/${artwork.id}/image`} alt={`${artwork.title}${artwork.artist ? ` – ${artwork.artist}` : ""}. Kūrinio reprodukcija.`}
        fill unoptimized loading="lazy" sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-contain p-4" onError={() => setFailed(true)} />
        : <p className="p-6 text-center text-sm leading-6 text-muted">{failed ? "Paveikslo nepavyko įkelti. Kūrinio informaciją gali skaityti toliau." : "Muziejus nepateikia patvirtinto viešo naudojimo vaizdo."}</p>}
    </div>
    <div className="p-5 [overflow-wrap:anywhere]">
      <p className="text-xs text-muted">Muziejaus ID: {artwork.id}</p>
      <h2 className="mt-3 text-2xl"><Link prefetch={false} href={`/artwork/${artwork.id}`} className="underline-offset-4 hover:underline">{artwork.title}</Link></h2>
      <p className="mt-3 text-sm leading-6">{artwork.artist ?? "Autorius nenurodytas"}</p>
      <p className="mt-1 text-sm text-muted">{artwork.date ?? "Data nenurodyta"}</p>
      {failed && <button type="button" onClick={() => setFailed(false)} className="mt-4 min-h-11 underline underline-offset-4">Bandyti paveikslą dar kartą</button>}
    </div>
  </li>;
}
