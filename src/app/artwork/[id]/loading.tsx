export default function ArtworkLoading() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10" aria-busy="true" aria-label="Įkeliami kūrinio duomenys">
      <p role="status" className="eyebrow">Įkeliama kūrinio istorija…</p>
      <div aria-hidden="true" className="mt-8 space-y-7 motion-safe:animate-pulse">
        <div className="h-14 w-3/4 bg-line" />
        <div className="h-6 w-1/3 bg-line" />
        <div className="h-80 bg-line" />
      </div>
    </section>
  );
}
