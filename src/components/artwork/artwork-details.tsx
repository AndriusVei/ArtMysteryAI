"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "@/types/artwork";
import type { ArtworkTranslation } from "@/types/artwork-translation";
import { ArtworkImage } from "./artwork-image";
import { SaveArtworkButton } from "@/components/collection/save-artwork-button";
import { InvestigationPanel } from "@/components/investigation/investigation-panel";

export function ArtworkDetails({ artwork, translation }: { artwork: Artwork; translation: ArtworkTranslation | null }) {
  const [language, setLanguage] = useState<"lt" | "en">(translation ? "lt" : "en");
  const [availableTranslation, setAvailableTranslation] = useState(translation);
  const [loading, setLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const translated = language === "lt" && availableTranslation !== null;
  const text = translated ? { ...artwork, ...availableTranslation.text } : artwork;
  const textLanguage = translated ? "lt" : "en";

  async function selectLithuanian() {
    if (availableTranslation) { setLanguage("lt"); return; }
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setTranslationError(null);
    try {
      const response = await fetch(`/api/artworks/${artwork.id}/translation`, { signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error || "Vertimo nepavyko gauti. Pabandyk dar kartą.");
      if (data.translation?.language !== "lt" || typeof data.translation.text?.title !== "string") {
        throw new Error("Vertimo nepavyko gauti. Pabandyk dar kartą.");
      }
      setAvailableTranslation(data.translation);
      setLanguage("lt");
    } catch (error) {
      if (!controller.signal.aborted) setTranslationError(error instanceof Error ? error.message : "Vertimo nepavyko gauti. Pabandyk dar kartą.");
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }

  function selectOriginal() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setTranslationError(null);
    setLanguage("en");
  }
  const facts = [
    ["Autorius", text.artistDisplay ?? artwork.artist],
    ["Sukūrimo data", text.date],
    ["Technika", text.medium],
    ["Matmenys", text.dimensions],
    ["Kūrinio tipas", text.type],
  ];

  return (
    <article className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <Link href="/explore" className="text-sm underline decoration-gold underline-offset-8">← Atrasti meną</Link>
        <div role="group" aria-label="Kūrinio teksto kalba" className="flex flex-wrap border border-line text-sm">
          <button type="button" onClick={selectLithuanian} disabled={loading} aria-pressed={translated} aria-busy={loading}
            className={`min-h-12 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50 ${translated ? "bg-ink text-paper" : "hover:bg-line"}`}>
            {loading ? "Verčiama…" : "Lietuviškai"}
          </button>
          <button type="button" onClick={selectOriginal} aria-pressed={!translated}
            className={`min-h-12 px-5 py-3 ${!translated ? "bg-ink text-paper" : "hover:bg-line"}`}>
            Originalo kalba
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-5 text-sm leading-7 text-muted">
        {loading ? "Ruošiamas lietuviškas vertimas. Gali užtrukti iki minutės. Kol lauki, gali skaityti originalą."
          : translationError ?? (!availableTranslation ? "Pasirink „Lietuviškai“, kad perskaitytum automatinį kūrinio teksto vertimą." : "")}
      </p>
      <header className="pb-10 pt-10 sm:pb-14">
        <p className="eyebrow">Art Institute of Chicago · kūrinys #{artwork.id}</p>
        <h1 lang={textLanguage} className="mt-5 break-words text-4xl sm:text-6xl lg:text-7xl">{text.title}</h1>
        <p className="mt-5 text-lg text-muted">{artwork.artist ?? "Autorius nenurodytas"}{text.date ? ` · ${text.date}` : ""}</p>
        <p role="status" className="mt-4 text-xs leading-6 text-muted">
          {translated ? availableTranslation.automatic
            ? "Automatinis vertimas į lietuvių kalbą („MyMemory“). Gali pasitaikyti netikslumų; originalą gali peržiūrėti bet kada."
            : "Lietuviškas muziejaus teksto vertimas. Tai nėra oficialus muziejaus vertimas."
            : "Originalūs muziejaus duomenys anglų kalba."}
        </p>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        <figure className="min-w-0">
          <ArtworkImage key={artwork.id} artworkId={artwork.id} image={artwork.image} title={text.title} artist={artwork.artist} unavailableReason={artwork.imageUnavailableReason} />
          <figcaption className="mt-4 space-y-2 text-xs leading-6 text-muted">
            <p>Šaltinis: Art Institute of Chicago.</p>
            {text.creditLine && <p lang={textLanguage}>{text.creditLine}</p>}
            {artwork.image && <p>Paveikslas: viešo naudojimo (CC0).</p>}
            {artwork.copyrightNotice && <p lang="en">{artwork.copyrightNotice}</p>}
          </figcaption>
        </figure>
        <section aria-labelledby="facts-heading" className="min-w-0 border-t border-line pt-6">
          <p className="eyebrow">Kūrinio duomenys</p>
          <h2 id="facts-heading" className="mt-4 text-3xl">Atidžiau pažvelgus</h2>
          <dl className="mt-7 divide-y divide-line">
            {facts.map(([label, value]) => (
              <div key={label} className="py-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
                <dd className="mt-2 break-words text-sm leading-7" lang={value ? textLanguage : "lt"}>{value ?? "Muziejus duomenų nepateikė"}</dd>
              </div>
            ))}
          </dl>
          <SaveArtworkButton artwork={{ artworkId: artwork.id, title: text.title, artist: artwork.artist, hasImage: Boolean(artwork.image) }} />
          <a href={artwork.museumUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-4 border border-ink px-5 py-3 text-sm hover:bg-ink hover:text-paper">
            Peržiūrėti muziejuje <span aria-hidden="true">↗</span><span className="sr-only"> (naujame skirtuke)</span>
          </a>
        </section>
      </div>
      <section aria-labelledby="story-heading" className="mt-14 grid gap-6 border-t border-line pt-10 md:grid-cols-[1fr_2fr] md:gap-12">
        <div>
          <p className="eyebrow">Muziejaus pasakojimas</p>
          <h2 id="story-heading" className="mt-4 text-3xl">Ką žinome apie kūrinį?</h2>
        </div>
        <div className="min-w-0">
          {text.description ? <>
            <div lang={textLanguage} className="space-y-5 break-words text-base leading-8 text-muted">
              {text.description.split(/\n\s*\n|\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
            <p className="mt-7 text-xs leading-6 text-muted">
              Aprašymo šaltinis: <a className="underline underline-offset-4" href={artwork.museumUrl}>Art Institute of Chicago</a>.
              {" "}Licencija: <a className="underline underline-offset-4" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
              {" "}{translated ? "Tekstas išverstas į lietuvių kalbą; originalą gali peržiūrėti pasirinkęs „Originalo kalba“." : "Pateikta kaip paprastas tekstas, pašalinus HTML formatavimą."}
            </p>
          </> : <p className="leading-8 text-muted">Muziejus šio kūrinio aprašymo nepateikė. Papildomos istorijos ar autoriaus ketinimų nepridedame.</p>}
        </div>
      </section>
      <InvestigationPanel key={artwork.id} artwork={artwork} />
    </article>
  );
}
