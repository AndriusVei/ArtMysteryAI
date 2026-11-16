import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm, ConfirmationResendForm } from "@/components/auth/auth-form";
import { getAccountIdentity } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth-validation";
import { supabaseConfiguration } from "@/lib/supabase/config";

export const metadata = { title: "Prisijungti" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeAuthNext((await searchParams).next), identity = await getAccountIdentity();
  if (identity.mode === "account") redirect(next);
  const enabled = supabaseConfiguration().status === "ready";
  return <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10"><p className="eyebrow">Tavo meno atradimai</p><h1 className="mt-5 text-4xl sm:text-5xl">Prisijungti</h1>
    <p className="mt-6 leading-8 text-muted">Prisijunk, kad kolekcija būtų saugoma tavo paskyroje. Demonstraciniai įrašai automatiškai neperkeliami.</p>
    {!enabled && <p role="status" className="mt-6 border-l-2 border-gold p-4">Paskyros dar neprijungtos. Gali tyrinėti meną ir naudoti demonstracinę kolekciją.</p>}
    {identity.mode === "unavailable" && enabled && <p role="alert" className="mt-6">Paskyrų paslauga šiuo metu nepasiekiama. Pabandyk vėliau.</p>}
    <AuthForm mode="login" next={next} enabled={enabled} />
    <Link href="/register" className="mt-7 inline-block underline underline-offset-4">Dar neturi paskyros? Registruotis</Link>
    <ConfirmationResendForm enabled={enabled} />
  </section>;
}
