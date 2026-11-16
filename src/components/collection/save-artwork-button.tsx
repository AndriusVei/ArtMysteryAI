"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { SaveArtworkInput } from "@/types/collection";
import { collectionErrorMessage } from "@/lib/demo-collection";
import { useCollection } from "./collection-provider";

export function SaveArtworkButton({ artwork }: { artwork: SaveArtworkInput }) {
  const { ready, items, error, repository } = useCollection();
  const account = repository.mode === "account";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const busy = useRef(false);
  const saved = items.some((item) => item.artworkId === artwork.artworkId);

  async function save() {
    if (busy.current || saved || !ready || error) return;
    busy.current = true; setPending(true); setMessage(null); setHasError(false);
    try { await repository.save(artwork); setMessage(account ? "Kūrinys išsaugotas tavo paskyros kolekcijoje." : "Kūrinys išsaugotas šios naršyklės demonstracinėje kolekcijoje."); }
    catch (cause) { setHasError(true); setMessage(collectionErrorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <div className="mt-8 border-t border-line pt-7">
      <button type="button" onClick={save} disabled={!ready || pending || saved || Boolean(error)} aria-busy={pending}
        className="min-h-12 w-full bg-ink px-5 py-3 text-sm text-paper hover:bg-gold disabled:cursor-default disabled:opacity-60">
        {pending ? "Išsaugoma…" : !ready ? "Tikrinama kolekcija…" : saved ? account ? "Jau mano kolekcijoje" : "Jau demonstracinėje kolekcijoje" : account ? "Išsaugoti į mano kolekciją" : "Išsaugoti į demo kolekciją"}
      </button>
      <p className="mt-3 text-xs leading-6 text-muted">{account ? "Paskyros kolekcija · demo įrašai neperkeliami." : "Demonstracinis režimas · tik šioje naršyklėje."}</p>
      {(error || message) && <p role={error || hasError ? "alert" : "status"} className="mt-3 text-sm leading-7">{error ?? message}</p>}
      <Link href="/collection" className="mt-4 inline-block text-sm underline underline-offset-8">Peržiūrėti mano kolekciją →</Link>
    </div>
  );
}
