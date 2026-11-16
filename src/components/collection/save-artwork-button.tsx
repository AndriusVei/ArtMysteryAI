"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { SaveArtworkInput } from "@/types/collection";
import { collectionErrorMessage } from "@/lib/demo-collection";
import { useDemoCollection } from "./use-demo-collection";

export function SaveArtworkButton({ artwork }: { artwork: SaveArtworkInput }) {
  const { ready, items, error, repository } = useDemoCollection();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const saved = items.some((item) => item.artworkId === artwork.artworkId);

  async function save() {
    if (busy.current || saved || !ready || error) return;
    busy.current = true; setPending(true); setMessage(null);
    try { await repository.save(artwork); setMessage("Kūrinys išsaugotas šios naršyklės demonstracinėje kolekcijoje."); }
    catch (cause) { setMessage(collectionErrorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <div className="mt-8 border-t border-line pt-7">
      <button type="button" onClick={save} disabled={!ready || pending || saved || Boolean(error)} aria-busy={pending}
        className="min-h-12 w-full bg-ink px-5 py-3 text-sm text-paper hover:bg-gold disabled:cursor-default disabled:opacity-60">
        {pending ? "Išsaugoma…" : !ready ? "Tikrinama kolekcija…" : saved ? "Jau demonstracinėje kolekcijoje" : "Išsaugoti į demo kolekciją"}
      </button>
      <p className="mt-3 text-xs leading-6 text-muted">Demonstracinis režimas · tik šioje naršyklėje.</p>
      {(error || message) && <p role="status" className="mt-3 text-sm leading-7">{error ?? message}</p>}
      <Link href="/collection" className="mt-4 inline-block text-sm underline underline-offset-8">Peržiūrėti mano kolekciją →</Link>
    </div>
  );
}
