import Link from "next/link";
import { navigation } from "@/lib/navigation";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-6 sm:px-10">
        <Link href="/" aria-label="ArtMystery AI – pradžia" className="brand text-2xl">
          ArtMystery <span className="text-gold">AI</span>
        </Link>
        <nav aria-label="Pagrindinė navigacija" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href === "/login" && signedIn ? "/profile" : item.href} className="nav-link">
              {item.href === "/login" && signedIn ? "Mano paskyra" : item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
