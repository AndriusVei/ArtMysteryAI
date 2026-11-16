import Link from "next/link";

export default function ArtworkNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10">
      <p className="eyebrow">Kūrinys nerastas</p>
      <h1 className="mt-5 text-4xl sm:text-5xl">Šio kūrinio muziejus nepateikė.</h1>
      <p className="mt-6 leading-8 text-muted">Patikrink kūrinio numerį. Nuorodą į kūrinį reikėtų atverti iš meno paieškos rezultatų.</p>
      <Link href="/explore" className="mt-8 inline-block underline underline-offset-8">Grįžti į meno paiešką</Link>
    </section>
  );
}
