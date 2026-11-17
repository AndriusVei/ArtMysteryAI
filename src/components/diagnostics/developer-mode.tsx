"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { appEndpoint, decodeDiagnostics, diagnosticMethod, diagnosticServices, DIAGNOSTIC_HEADER, MAX_DIAGNOSTICS, safeDiagnostic } from "@/lib/diagnostics-core";
import type { DiagnosticRecord } from "@/lib/diagnostics-core";

type ContextValue = { enabled: boolean; publish: (records: DiagnosticRecord[]) => void; records: DiagnosticRecord[]; setMode: (enabled: boolean) => void; clear: () => void };
const Context = createContext<ContextValue | null>(null);
export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const publish = useCallback((input: DiagnosticRecord[]) => {
    const safe = input.map(safeDiagnostic).filter((item): item is DiagnosticRecord => item !== null);
    if (safe.length) setRecords((current) => [...current, ...safe].slice(-MAX_DIAGNOSTICS));
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const original = window.fetch;
    const observed: typeof fetch = async (input, init) => {
      let endpoint = null;
      try {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
        if (url.origin === location.origin) endpoint = appEndpoint(url.pathname);
      } catch { /* Instrumentavimas negali trukdyti tikrai užklausai. */ }
      if (!endpoint) return original.call(window, input, init);
      const started = performance.now(); let status: number | null = null; let upstream: DiagnosticRecord[] = [];
      try {
        const response = await original.call(window, input, init);
        status = response.status; upstream = decodeDiagnostics(response.headers.get(DIAGNOSTIC_HEADER)); return response;
      } finally {
        const record = safeDiagnostic({ service: "app", endpoint, method: diagnosticMethod(input, init), status,
          durationMs: Math.min(120000, Math.max(0, performance.now() - started)) });
        if (active && record) publish([...upstream, record]);
      }
    };
    window.fetch = observed;
    // <img> užklausos nenaudoja fetch; skaitomi tik tos pačios svetainės HTTP metaduomenys.
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((list) => {
        const images: DiagnosticRecord[] = [];
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          if (entry.initiatorType !== "img") continue;
          try {
            const url = new URL(entry.name);
            const endpoint = appEndpoint(url.pathname);
            if (url.origin !== location.origin || endpoint !== "/api/artworks/:id/image") continue;
            const record = safeDiagnostic({ service: "app", endpoint, method: "GET", status: entry.responseStatus || null,
              durationMs: Math.min(120000, Math.max(0, entry.duration)) });
            if (record) images.push(record);
          } catch { /* Žali adresai ar klaidos nesaugomi. */ }
        }
        if (active) publish(images);
      });
      try { observer.observe({ entryTypes: ["resource"] }); }
      catch { observer.disconnect(); observer = undefined; }
    }
    return () => { active = false; observer?.disconnect(); if (window.fetch === observed) window.fetch = original; };
  }, [enabled, publish]);

  return <Context.Provider value={{ enabled, publish, records, setMode: (value) => { setRecords([]); setEnabled(value); }, clear: () => setRecords([]) }}>{children}</Context.Provider>;
}
export function DeveloperModePanel() {
  const context = useContext(Context);
  if (!context) return null;
  const { enabled, records, setMode, clear } = context;
  return <section aria-labelledby="developer-mode-heading" className="border-b border-line bg-paper px-6 py-2 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 id="developer-mode-heading" className="sr-only">Diagnostika</h2>
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setMode(event.target.checked)} aria-controls="developer-mode-panel" />
          <span>🛠️ Developer Mode</span>
        </label>
        {enabled && <div id="developer-mode-panel">
          <p className="mt-2 text-sm leading-7 text-muted">Tik HTTP metaduomenys: užklausų turinys ir privatūs duomenys nerodomi. Režimas nekeičia prisijungimo, prieigos teisių ar limitų ir nesiunčia bandomųjų užklausų. Laikas apytikris, atsakymas gali būti iš podėlio.</p>
          <button type="button" onClick={clear} className="my-3 min-h-12 border border-line px-4 py-2 text-sm">Išvalyti diagnostiką</button>
          <p role="status" className="text-xs text-muted">Diagnostikos įrašų: {records.length} / {MAX_DIAGNOSTICS}. Būsena žymi HTTP rezultatą, ne duomenų ar prisijungimo teisingumą.</p>
          {records.length === 0 ? <p className="mt-3 text-sm">Įrašų dar nėra. Atverk kūrinį, ieškok arba naudok kolekciją.</p>
            : <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="API diagnostikos lentelė">
              <table className="w-full text-left text-xs leading-6">
                <caption className="sr-only">Paskutinės saugiai užfiksuotos API operacijos</caption>
                <thead><tr>{["Paslauga", "Adreso šablonas", "Metodas", "HTTP", "Rezultatas", "Laikas"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2">{heading}</th>)}</tr></thead>
                <tbody>{records.map((record, index) => <tr key={index}>
                  <td className="border-b border-line px-3 py-2">{diagnosticServices[record.service]}</td>
                  <td className="border-b border-line px-3 py-2"><code>{record.endpoint}</code></td>
                  <td className="border-b border-line px-3 py-2">{record.method}</td>
                  <td className="border-b border-line px-3 py-2">{record.status ?? "—"}</td>
                  <td className="border-b border-line px-3 py-2">{record.status === null ? "Būsena negauta" : record.status < 400 ? "Sėkmė" : "Nesėkmė"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">~{record.durationMs} ms</td>
                </tr>)}</tbody>
              </table>
            </div>}
        </div>}
      </div>
    </section>;
}
export function PublishDiagnostics({ records }: { records: DiagnosticRecord[] }) {
  const context = useContext(Context);
  const last = useRef<DiagnosticRecord[] | null>(null);
  const enabled = context?.enabled, publish = context?.publish;
  useEffect(() => {
    if (!enabled) { last.current = null; return; }
    if (publish && last.current !== records) { last.current = records; publish(records); }
  }, [enabled, publish, records]);
  return null;
}
