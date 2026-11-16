"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { InvestigationResponse } from "@/types/investigation";
import { investigationError } from "@/lib/account-investigations";
import { useInvestigations } from "./investigation-provider";
import { useDemoInvestigations } from "./use-demo-investigations";

export function SaveInvestigationButton({ response, artworkTitle }: { response: InvestigationResponse; artworkTitle: string }) {
  const demo = useDemoInvestigations();
  const account = useInvestigations();
  const live = response.mode === "live";
  const { ready, items, error, repository } = live ? account : demo;
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const saved = items.some((item) => live ? item.id === response.generationId : JSON.stringify(item.response) === JSON.stringify(response));
  async function save() {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage(null);
    try { await repository.save(response, artworkTitle); }
    catch (cause) { setMessage(investigationError(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="mt-5 text-sm leading-7">
    <button type="button" onClick={save} disabled={!ready || !!error || pending || saved}
      className="min-h-12 border border-ink px-5 py-3 disabled:opacity-60">
      {saved ? (live ? "Tyrimas išsaugotas paskyroje" : "Pavyzdys išsaugotas šioje naršyklėje") : pending ? "Išsaugoma…" : live ? "Išsaugoti DI tyrimą" : "Išsaugoti pavyzdį"}
    </button>
    <Link href={live ? "/investigations" : "/investigations?mode=demo"} className="ml-4 inline-block py-3 underline underline-offset-4">Mano DI tyrimai</Link>
    <p className="mt-2 text-xs text-muted">{live ? "Tyrimas ir papildomas prašymas bus pasiekiami tavo paskyroje." : "Išsaugomas ir papildomas prašymas. Duomenys nesinchronizuojami su paskyra; išvalius naršyklės saugyklą jie dings."}</p>
    {saved && <p role="status">Išsaugota. Tyrimą rasi puslapyje „Mano DI tyrimai“.</p>}
    {(error || message) && <p role="alert">{error || message}</p>}
  </div>;
}
