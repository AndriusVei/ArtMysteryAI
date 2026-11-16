import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getAccountIdentity } from "@/lib/supabase/server";
import { configuredSiteOrigin, supabaseConfiguration } from "@/lib/supabase/config";

export const metadata = { title: "Registruotis" };
export default async function RegisterPage() {
  if ((await getAccountIdentity()).mode === "account") redirect("/profile");
  const enabled = supabaseConfiguration().status === "ready" && Boolean(configuredSiteOrigin());
  return <section className="mx-auto max-w-3xl px-6 py-16 sm:px-10"><p className="eyebrow">Asmeninė meno kolekcija</p><h1 className="mt-5 text-4xl sm:text-5xl">Sukurti paskyrą</h1>
    <p className="mt-6 leading-8 text-muted">Išsaugok atradimus paskyroje ir pasiek juos kituose įrenginiuose.</p>
    {!enabled && <p role="status" className="mt-6 border-l-2 border-gold p-4">Registracija dar neprijungta. Demo kolekcija toliau veikia be paskyros.</p>}
    <AuthForm mode="register" enabled={enabled} /><Link href="/login" className="mt-7 inline-block underline underline-offset-4">Jau turi paskyrą? Prisijungti</Link>
  </section>;
}
