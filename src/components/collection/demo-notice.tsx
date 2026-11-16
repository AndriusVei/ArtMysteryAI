import Link from "next/link";
export function DemoNotice() {
  return (
    <aside aria-label="Demonstracinis režimas" className="border-l-2 border-gold bg-white/50 px-5 py-4 text-sm leading-7">
      <p className="font-semibold">Demonstracinė kolekcija</p>
      <p className="text-muted">Duomenys saugomi tik šioje naršyklėje. Tai nėra paskyros kolekcija ir tarp įrenginių nesinchronizuojama. Išvalius naršyklės duomenis kolekcija bus prarasta.</p>
      <Link href="/login?next=%2Fcollection" className="mt-2 inline-block underline underline-offset-4">Prisijungti prie paskyros kolekcijos</Link>
    </aside>
  );
}
