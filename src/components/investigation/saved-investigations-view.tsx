"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { investigationModes, investigationStorageMessage, knowledgeLevels } from "@/lib/investigation";
import type { SavedInvestigation } from "@/types/investigation";
import { useDemoInvestigations } from "./use-demo-investigations";
import { InvestigationResultView } from "./investigation-result-view";

function SavedCard({ item, remove }: { item: SavedInvestigation; remove: (id: string) => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const cancelFocus = useRef<HTMLButtonElement>(null);
  const cancelConfirmation = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirm) cancelConfirmation.current?.focus(); }, [confirm]);
  async function deleteItem() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try { await remove(item.id); }
    catch (cause) { setError(investigationStorageMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  return <article className="min-w-0 break-words border border-line bg-white/40 p-5 sm:p-8">
    <p className="eyebrow">Išsaugotas demonstracinis pavyzdys</p>
    <h2 className="mt-4 break-words text-2xl">{item.artworkTitle}</h2>
    <p className="mt-3 text-sm leading-7 text-muted">{knowledgeLevels[item.response.request.knowledgeLevel]} · {investigationModes[item.response.request.investigationMode]} · {item.response.request.questionCount} klausimai</p>
    <p className="mt-2 text-xs text-muted">Išsaugota: <time dateTime={item.savedAt}>{new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.savedAt))}</time></p>
    <Link href={`/artwork/${item.response.request.artworkId}`} className="mt-3 inline-block min-h-11 py-3 text-sm underline underline-offset-4">Atverti kūrinį</Link>
    <details className="mt-3">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">Peržiūrėti visą tyrimą</summary>
      <InvestigationResultView response={item.response} headingId={`result-${item.id}`} />
    </details>
    {!confirm ? <button ref={cancelFocus} type="button" onClick={() => setConfirm(true)} className="mt-4 min-h-12 border border-line px-4 py-3 text-sm">Pašalinti tyrimą</button>
      : <div role="group" aria-label="Tyrimo šalinimo patvirtinimas" className="mt-4 border-t border-line pt-4 text-sm">
        <p>Ar pašalinti kūrinio „{item.artworkTitle}“ tyrimą iš šios naršyklės?</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button disabled={pending} onClick={deleteItem} className="min-h-12 bg-ink px-4 py-3 text-paper disabled:opacity-60">{pending ? "Šalinama…" : "Taip, pašalinti"}</button>
          <button ref={cancelConfirmation} disabled={pending} onClick={() => { setConfirm(false); setError(null); requestAnimationFrame(() => cancelFocus.current?.focus()); }} className="min-h-12 border border-line px-4 py-3">Atšaukti</button>
        </div>
      </div>}
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
  </article>;
}

export function SavedInvestigationsView() {
  const { ready, items, error, repository } = useDemoInvestigations();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("");
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const filtered = items.filter((item) => (!mode || item.response.request.investigationMode === mode)
    && `${item.artworkTitle} ${item.response.result.title}`.toLocaleLowerCase("lt-LT").includes(query.trim().toLocaleLowerCase("lt-LT")));
  async function remove(id: string) {
    await repository.remove(id);
    setMessage("Tyrimas pašalintas iš šios naršyklės.");
    heading.current?.focus();
  }
  return <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
    <p className="eyebrow">Asmeninė tyrimų užrašinė</p>
    <h1 ref={heading} tabIndex={-1} className="mt-5 text-4xl sm:text-6xl">Mano DI tyrimai</h1>
    <aside aria-label="Tyrimų saugyklos demonstracinis režimas" className="mt-7 border-l-2 border-gold bg-white/50 p-5 text-sm leading-7">
      <p className="font-semibold">Demonstracinė saugykla · tik ši naršyklė</p>
      <p className="text-muted">Čia saugomi mokomieji pavyzdžiai, ne Gemini sugeneruoti tyrimai. Supabase neprijungtas. Duomenys nesinchronizuojami tarp įrenginių ir dings išvalius naršyklės saugyklą. Išsaugomas ir papildomas prašymas – nerašyk jautrių duomenų. Mokamų užklausų nėra.</p>
    </aside>
    {message && <p role="status" className="mt-5 text-sm">{message}</p>}
    {!ready ? <p role="status" className="mt-8">Įkeliami išsaugoti tyrimai…</p> : error ? <p role="alert" className="mt-8">{error}</p>
      : items.length === 0 ? <div className="mt-10 border border-line p-7"><h2 className="text-2xl">Išsaugotų tyrimų dar nėra</h2><p className="mt-4 leading-7 text-muted">Atverk kūrinį, paruošk tyrimo pavyzdį ir paspausk „Išsaugoti pavyzdį“.</p><Link href="/artwork/16568" className="mt-5 inline-block min-h-12 bg-ink px-5 py-3 text-sm text-paper">Tyrinėti Monet „Vandens lelijas“</Link></div>
      : <>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="text-sm">Ieškoti pagal pavadinimą<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} type="search" className="mt-2 min-h-12 w-full border border-line bg-paper px-3 py-3" /></label>
          <label className="text-sm">Tyrimo režimas<select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 min-h-12 w-full border border-line bg-paper px-3 py-3"><option value="">Visi režimai</option>{Object.entries(investigationModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <p role="status" className="mt-5 text-sm text-muted">Rodoma {filtered.length} iš {items.length} išsaugotų tyrimų (iki 30).</p>
        {filtered.length ? <div className="mt-6 space-y-6">{filtered.map((item) => <SavedCard key={item.id} item={item} remove={remove} />)}</div> : <p className="mt-8">Pagal pasirinktus filtrus tyrimų nėra.</p>}
      </>}
  </div>;
}
