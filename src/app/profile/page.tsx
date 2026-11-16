import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountIdentity } from "@/lib/supabase/server";
import { LogoutForm } from "@/components/auth/auth-form";

export const metadata = { title: "Mano paskyra" };
export default async function ProfilePage() {
  const identity = await getAccountIdentity();
  if (identity.mode !== "account") redirect("/login?next=%2Fprofile");
  return <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10"><p className="eyebrow">Tavo paskyra</p><h1 className="mt-5 text-4xl sm:text-5xl">Mano paskyra</h1>
    <p className="mt-6 leading-8 text-muted">Esi prisijungęs. Kolekcija saugoma tavo paskyroje; demonstraciniai įrašai lieka atskirti.</p>
    <Link href="/collection" className="mt-7 inline-block underline underline-offset-4">Atverti mano kolekciją</Link><LogoutForm />
  </section>;
}
