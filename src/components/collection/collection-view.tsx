"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CollectionCategory } from "@/types/collection";
import { collectionCategories } from "@/lib/demo-collection";
import { CollectionCard } from "./collection-card";
import { DemoNotice } from "./demo-notice";
import { useCollection } from "./collection-provider";

export function CollectionView() {
  const { ready, items, error, repository, refresh } = useCollection();
  const account = repository.mode === "account";
  const [category, setCategory] = useState<CollectionCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("lt-LT");
    return items.filter((item) => (category === "all" || item.category === category)
      && `${item.title} ${item.artist ?? ""}`.toLocaleLowerCase("lt-LT").includes(term));
  }, [items, category, query]);

  function removed(title: string) {
    setMessage(`Kūrinys „${title}“ pašalintas iš ${account ? "paskyros" : "demonstracinės"} kolekcijos.`);
    heading.current?.focus();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10 sm:pt-16">
      <p className="eyebrow">Tavo meno atradimai</p>
      <h1 ref={heading} tabIndex={-1} className="mt-5 text-4xl sm:text-6xl">Mano kolekcija</h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-muted">Kūriniai, prie kurių norisi sugrįžti. Suskirstyk juos pagal savo smalsumą ir užrašyk, ką pastebėjai.</p>
      <div className="mt-8">{account ? <aside className="border-l-2 border-gold bg-white/50 p-5 text-sm leading-7"><p className="font-semibold">Paskyros kolekcija</p><p>Rodomi tik tavo paskyros kūriniai. Demonstraciniai naršyklės įrašai lieka atskirti.</p></aside> : <DemoNotice />}</div>
      {refresh && <button type="button" onClick={refresh} className="mt-4 min-h-11 underline underline-offset-4">Atnaujinti kolekciją</button>}
      <p role="status" aria-live="polite" className="mt-5 text-sm leading-7">{message}</p>
      {!ready ? <p role="status" className="py-12 text-muted">{account ? "Įkeliama paskyros kolekcija…" : "Įkeliama šios naršyklės kolekcija…"}</p>
        : error ? <div role="alert" className="mt-8 border border-line p-6"><h2 className="text-2xl">Kolekcijos atverti nepavyko</h2><p className="mt-4 leading-8 text-muted">{error}</p></div>
        : items.length === 0 ? <section className="mt-8 border-y border-line py-16 text-center">
          <p className="eyebrow">Pirmas atradimas dar priešakyje</p>
          <h2 className="mt-5 text-3xl">Kuri istorija taps tavo pirmąja?</h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted">Atverk muziejaus kūrinį ir paspausk „{account ? "Išsaugoti į mano kolekciją" : "Išsaugoti į demo kolekciją"}“. Čia atsiras tavo išsaugoti kūriniai.</p>
          <Link href="/artwork/16568" className="mt-7 inline-flex min-h-12 items-center bg-ink px-6 py-3 text-sm text-paper hover:bg-gold">Atrasti Monet „Vandens lelijas“ →</Link>
        </section> : <>
          <div className="mt-8 border-t border-line pt-8">
            <label htmlFor="collection-search" className="mb-3 block text-sm font-semibold">Ieškoti savo kolekcijoje</label>
            <input id="collection-search" type="search" value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)}
              placeholder="Kūrinio pavadinimas arba autorius" className="min-h-12 w-full max-w-lg border border-line bg-white/50 px-4 py-3 text-sm" />
            <div role="group" aria-label="Kolekcijos kategorijos" className="mt-6 flex flex-wrap gap-3">
              {(["all", ...Object.keys(collectionCategories)] as (CollectionCategory | "all")[]).map((value) => (
                <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}
                  className={`min-h-12 border px-4 py-3 text-sm ${category === value ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}>
                  {value === "all" ? "Visi" : collectionCategories[value]} ({value === "all" ? items.length : items.filter((item) => item.category === value).length})
                </button>
              ))}
            </div>
            <p role="status" className="mt-6 text-sm text-muted">Rodoma: {filtered.length} iš {items.length} kūrinių.</p>
          </div>
          {filtered.length === 0 ? <div className="py-14 text-center">
            <h2 className="text-2xl">Šiame pasirinkime kūrinių nėra</h2>
            <p className="mt-4 text-sm text-muted">Pakeisk kategoriją arba paieškos tekstą.</p>
            <button type="button" onClick={() => { setCategory("all"); setQuery(""); }} className="mt-6 min-h-12 border border-ink px-5 py-3 text-sm">Rodyti visą kolekciją</button>
          </div> : <div className="mt-8 grid items-start gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => <CollectionCard key={item.artworkId} item={item} repository={repository} onRemoved={removed} />)}
          </div>}
        </>}
    </div>
  );
}
