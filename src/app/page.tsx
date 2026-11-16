import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <section className="max-w-4xl pb-16 pt-20 sm:pb-24 sm:pt-28">
        <p className="eyebrow">Menas · istorijos · atradimai</p>
        <h1 className="mt-7 max-w-3xl text-5xl sm:text-7xl lg:text-8xl">
          Kiekvienas paveikslas <span className="italic text-gold">slepia istoriją.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-muted">
          Atrask meno šedevrus, tyrinėk jų paslaptis ir tapk meno detektyvu su dirbtiniu intelektu.
        </p>
        <Link href="/explore" className="mt-9 inline-flex min-h-12 items-center gap-6 bg-ink px-7 py-4 text-sm text-paper hover:bg-gold">
          Pradėti tyrinėti <span aria-hidden="true">↗</span>
        </Link>
        <p className="mt-5 text-sm text-muted">Ieškok pagal kūrinio pavadinimą, raktažodį arba autorių.</p>
      </section>
      <section aria-labelledby="journey-title" className="border-t border-line py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <p className="eyebrow">Tavo pažintis su menu</p>
            <h2 id="journey-title" className="mt-4 text-3xl">Nuo žvilgsnio<br />iki atradimo.</h2>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3">
            {[
              ["01", "Atrask", "Tikrų muziejaus kūrinių paieška ir jų istorijos."],
              ["02", "Kolekcionuok", "Asmeninė kolekcija, kategorijos ir tavo pastabos."],
              ["03", "Tyrinėk", "Meno detektyvo klausimai pagal tavo smalsumą."],
            ].map(([number, title, description]) => (
              <li key={number}>
                <span className="text-xs text-gold">{number}</span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
