"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { InvestigationResponse } from "@/types/investigation";
import { investigationStorageMessage } from "@/lib/investigation";
import { useDemoInvestigations } from "./use-demo-investigations";

export function SaveInvestigationButton({ response, artworkTitle }: { response: InvestigationResponse; artworkTitle: string }) {
  const { ready, items, error, repository } = useDemoInvestigations();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const saved = items.some((item) => JSON.stringify(item.response) === JSON.stringify(response));
  async function save() {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage(null);
    try { await repository.save(response, artworkTitle); }
    catch (cause) { setMessage(investigationStorageMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="mt-5 text-sm leading-7">
    <button type="button" onClick={save} disabled={!ready || !!error || pending || saved}
      className="min-h-12 border border-ink px-5 py-3 disabled:opacity-60">
      {saved ? "Pavyzdys išsaugotas šioje naršyklėje" : pending ? "Išsaugoma…" : "Išsaugoti pavyzdį"}
    </button>
    <Link href="/investigations" className="ml-4 inline-block py-3 underline underline-offset-4">Mano DI tyrimai</Link>
    <p className="mt-2 text-xs text-muted">Išsaugomas ir papildomas prašymas. Duomenys nesinchronizuojami su paskyra; išvalius naršyklės saugyklą jie dings.</p>
    {saved && <p role="status">Išsaugota. Tyrimą rasi puslapyje „Mano DI tyrimai“.</p>}
    {(error || message) && <p role="alert">{error || message}</p>}
  </div>;
}
