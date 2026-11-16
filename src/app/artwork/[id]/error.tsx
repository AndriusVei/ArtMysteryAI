"use client";

export default function ArtworkError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
      <h1 className="text-4xl">Kūrinio puslapio nepavyko atverti.</h1>
      <p role="alert" className="mt-6 leading-8 text-muted">Įvyko netikėta klaida. Gali pabandyti dar kartą.</p>
      <button type="button" onClick={reset} className="mt-7 min-h-12 border border-ink px-6 py-3">Bandyti dar kartą</button>
    </section>
  );
}
