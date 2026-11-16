import Link from "next/link";
import { SearchForm } from "@/components/artwork/search-form";
import { SearchCard } from "@/components/artwork/search-card";
import { artworkSearchErrorMessages, searchArtworks, SEARCH_PAGE_SIZE, MAX_SEARCH_PAGE } from "@/lib/artic";

export const metadata = { title: "Atrasti meną" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const artist = typeof params.artist === "string" ? params.artist.slice(0, 120) : "";
  const submitted = ["q", "artist", "page", "submitted"].some((key) => params[key] !== undefined);
  const result = submitted ? await searchArtworks({ q: params.q, artist: params.artist, page: params.page }) : null;
  const pageUrl = (page: number) => `/explore?${new URLSearchParams({ q, artist, page: String(page) })}`;

  return <section className="mx-auto max-w-6xl px-6 py-14 sm:px-10 sm:py-20">
    <p className="eyebrow">Art Institute of Chicago</p>
    <h1 className="mt-4 text-4xl sm:text-6xl">Atrasti meną</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Atrask tikrus muziejaus kūrinius pagal pavadinimą, raktažodį ar autorių. Pasirink kūrinį ir atverk jo istoriją.</p>
    <SearchForm key={`${q}\u0000${artist}`} q={q} artist={artist} />
    {!result && <p className="mt-9 leading-8 text-muted">Nuo ko pradėsi? Pabandyk „Monet“, „water lilies“ arba autoriaus lauke įrašyk „Vincent van Gogh“.</p>}
    {result && !result.ok && <div role="alert" className="mt-9 border-l-2 border-gold bg-white/40 p-6">
      <h2 className="text-2xl">Paieškos užbaigti nepavyko</h2>
      <p className="mt-3 leading-7">{artworkSearchErrorMessages[result.code]}</p>
      <p className="mt-2 text-sm text-muted">Patikrink laukus ir naudok mygtuką „Ieškoti kūrinių“, kad pabandytum dar kartą.</p>
    </div>}
    {result?.ok && <div className="mt-9">
      <p role="status" className="leading-7 text-muted">{result.data.total === 0 ? "Kūrinių pagal šiuos kriterijus nerasta. Pabandyk kitą žodį, trumpesnį autoriaus vardą arba išvalyk vieną lauką."
        : `Rasta kūrinių: ${result.data.total}. Puslapis ${result.data.page}.`}</p>
      {result.data.total > 0 && result.data.items.length === 0 && <p className="mt-4">Šiame puslapyje rezultatų nėra. Grįžk į <Link href={pageUrl(1)} prefetch={false} className="underline underline-offset-4">pirmą puslapį</Link>.</p>}
      <ul aria-label="Paieškos rezultatai" className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.items.map((artwork) => <SearchCard key={artwork.id} artwork={artwork} />)}
      </ul>
      {result.data.totalPages > 1 && <nav aria-label="Paieškos puslapiai" className="mt-9 flex flex-wrap items-center gap-6">
        {result.data.page > 1 && <Link prefetch={false} href={pageUrl(result.data.page - 1)} className="min-h-12 border border-line px-5 py-3">Ankstesnis puslapis</Link>}
        <span className="text-sm text-muted">{result.data.page} / {result.data.totalPages}</span>
        {result.data.page < result.data.totalPages && <Link prefetch={false} href={pageUrl(result.data.page + 1)} className="min-h-12 border border-line px-5 py-3">Kitas puslapis</Link>}
      </nav>}
      {result.data.total > SEARCH_PAGE_SIZE * MAX_SEARCH_PAGE && <p className="mt-5 text-sm text-muted">Rodomi pirmi {SEARCH_PAGE_SIZE * MAX_SEARCH_PAGE} rezultatų. Patikslink raktažodį arba autorių.</p>}
    </div>}
    <p className="mt-12 border-t border-line pt-6 text-xs leading-6 text-muted">Šaltinis: <a href="https://www.artic.edu" className="underline underline-offset-4">Art Institute of Chicago</a>. Rodomi originalūs muziejaus metaduomenys ir viešo naudojimo kūriniai su vaizdo identifikatoriumi. Galutinės vaizdo teisės tikrinamos prieš jį pateikiant. <a href="https://www.artic.edu/terms" className="underline underline-offset-4">Naudojimo sąlygos</a>.</p>
  </section>;
}
