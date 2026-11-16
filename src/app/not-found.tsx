import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="eyebrow">404 · puslapis nerastas</p>
      <h1 className="mt-5 text-4xl sm:text-5xl">Šios istorijos čia nėra.</h1>
      <p className="mt-6 leading-7 text-muted">Patikrink adresą arba grįžk į pradinį puslapį.</p>
      <Link href="/" className="mt-8 inline-block underline underline-offset-8">Grįžti į pradžią</Link>
    </section>
  );
}
