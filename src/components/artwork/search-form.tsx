"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SearchForm({ q, artist }: { q: string; artist: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = useRef(false);
  useEffect(() => { if (!pending) active.current = false; }, [pending]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const values = new FormData(event.currentTarget);
    const params = new URLSearchParams({ q: String(values.get("q") ?? "").trim(), artist: String(values.get("artist") ?? "").trim(), submitted: "1" });
    active.current = true;
    const href = `/explore?${params.toString()}`;
    startTransition(() => {
      if (window.location.pathname + window.location.search === href) router.refresh();
      else router.push(href);
    });
  }

  return <form action="/explore" method="get" onSubmit={submit} aria-busy={pending} className="mt-9 border-y border-line py-7">
    <input type="hidden" name="submitted" value="1" />
    <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <legend className="sr-only">Muziejaus kūrinių paieška</legend>
      <div>
        <label htmlFor="search-query" className="mb-3 block text-sm font-semibold">Pavadinimas arba raktažodis</label>
        <input id="search-query" name="q" type="search" defaultValue={q} maxLength={120} placeholder="Pavyzdžiui: water lilies" className="min-h-12 w-full border border-line bg-white/50 px-4 py-3" />
      </div>
      <div>
        <label htmlFor="search-artist" className="mb-3 block text-sm font-semibold">Autorius</label>
        <input id="search-artist" name="artist" type="search" defaultValue={artist} maxLength={120} placeholder="Pavyzdžiui: Claude Monet" className="min-h-12 w-full border border-line bg-white/50 px-4 py-3" />
      </div>
      <button type="submit" className="min-h-12 bg-ink px-7 py-3 text-paper hover:bg-gold disabled:cursor-wait disabled:opacity-60">{pending ? "Ieškoma…" : "Ieškoti kūrinių"}</button>
    </fieldset>
    <p className="mt-4 text-sm leading-6 text-muted">Užpildyk bent vieną lauką. Užpildžius abu, raktažodis ir autorius derinami. Ieškoma originalo kalba; geriausia pradėti nuo angliško pavadinimo arba autoriaus pavardės.</p>
    <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">{pending ? "Ieškoma muziejuje… Ankstesni rezultatai bus pakeisti baigus paiešką." : ""}</p>
  </form>;
}
