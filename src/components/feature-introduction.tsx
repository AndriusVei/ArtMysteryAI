import Link from "next/link";

type FeatureIntroductionProps = {
  title: string;
  description: string;
};

export function FeatureIntroduction({ title, description }: FeatureIntroductionProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 sm:px-10 sm:py-28">
      <p className="eyebrow">ArtMystery AI · kuriama</p>
      <h1 className="mt-5 text-4xl sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{description}</p>
      <p className="mt-5 text-sm leading-7 text-muted">
        Šiuo metu paruoštas svetainės pagrindas. Ši funkcija dar neveikia ir duomenys nesaugomi.
      </p>
      <Link href="/" className="mt-9 inline-block underline decoration-gold underline-offset-8">
        Grįžti į pradžią →
      </Link>
    </section>
  );
}
