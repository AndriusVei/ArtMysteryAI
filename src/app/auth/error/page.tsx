import Link from "next/link";
export default function AuthErrorPage() {
  return <section className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-4xl">Paskyros patvirtinti nepavyko</h1><p className="mt-6 leading-8">Nuoroda gali būti netinkama, jau panaudota arba nebegaliojanti. Jei el. paštą jau patvirtinai, pabandyk prisijungti.</p><Link href="/login" className="mt-7 inline-block underline underline-offset-4">Grįžti prie prisijungimo</Link></section>;
}
