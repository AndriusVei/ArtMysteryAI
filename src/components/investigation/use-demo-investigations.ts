"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createDemoInvestigationRepository, decodeDemoInvestigations, DEMO_INVESTIGATIONS_KEY, investigationStorageMessage } from "@/lib/investigation";

const CHANGE_EVENT = "artmystery:demo-investigations-changed";
const EMPTY = "\u0000empty";
const BLOCKED = "\u0000blocked";
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === DEMO_INVESTIGATIONS_KEY || event.key === null) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CHANGE_EVENT, callback); };
}
function snapshot() {
  try { return window.localStorage.getItem(DEMO_INVESTIGATIONS_KEY) ?? EMPTY; } catch { return BLOCKED; }
}
function serverSnapshot(): undefined { return undefined; }

export function useDemoInvestigations() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const repository = useMemo(() => createDemoInvestigationRepository(() => window.localStorage,
    () => window.dispatchEvent(new Event(CHANGE_EVENT))), []);
  const state = useMemo(() => {
    if (raw === undefined) return { ready: false, items: [], error: null };
    if (raw === BLOCKED) return { ready: true, items: [], error: "Naršyklės saugykla nepasiekiama. Tyrimų perskaityti ir išsaugoti negalima." };
    try { return { ready: true, items: decodeDemoInvestigations(raw === EMPTY ? null : raw), error: null }; }
    catch (cause) { return { ready: true, items: [], error: investigationStorageMessage(cause) }; }
  }, [raw]);
  return { ...state, repository };
}
