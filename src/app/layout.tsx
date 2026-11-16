import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CollectionProvider } from "@/components/collection/collection-provider";
import { getAccountIdentity } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ArtMystery AI – atrask meno istorijas", template: "%s | ArtMystery AI" },
  description: "Atrask meno šedevrus, tyrinėk jų istorijas ir tapk meno detektyvu.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const identity = await getAccountIdentity();
  return (
    <html lang="lt">
      <body className="flex min-h-screen flex-col">
        <a href="#main-content" className="skip-link">Pereiti prie turinio</a>
        <SiteHeader signedIn={identity.mode === "account"} />
        <CollectionProvider identity={identity}><main id="main-content" tabIndex={-1} className="flex-1">{children}</main></CollectionProvider>
        <footer className="border-t border-line px-6 py-7 text-sm text-muted sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3">
            <span>ArtMystery AI</span>
            <span>Menas prasideda nuo smalsumo.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
