"use client";

import { useMemo, useSyncExternalStore } from "react";
import { collectionErrorMessage, createDemoCollectionRepository, decodeDemoCollection, DEMO_COLLECTION_KEY } from "@/lib/demo-collection";

const CHANGE_EVENT = "artmystery:demo-collection-changed";
const STORAGE_ERROR = "\u0000storage-error";
const EMPTY_COLLECTION = "\u0000empty-collection";

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === DEMO_COLLECTION_KEY || event.key === null) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CHANGE_EVENT, callback); };
}
function getSnapshot(): string {
  try { return window.localStorage.getItem(DEMO_COLLECTION_KEY) ?? EMPTY_COLLECTION; } catch { return STORAGE_ERROR; }
}
function getServerSnapshot(): undefined { return undefined; }

export function useDemoCollection() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const repository = useMemo(() => createDemoCollectionRepository(() => window.localStorage,
    () => window.dispatchEvent(new Event(CHANGE_EVENT))), []);
  const state = useMemo(() => {
    if (snapshot === undefined) return { ready: false, items: [], error: null };
    if (snapshot === STORAGE_ERROR) return { ready: true, items: [], error: "Naršyklės saugykla nepasiekiama. Kolekcija negali būti išsaugota." };
    try { return { ready: true, items: decodeDemoCollection(snapshot === EMPTY_COLLECTION ? null : snapshot), error: null }; }
    catch (error) { return { ready: true, items: [], error: collectionErrorMessage(error) }; }
  }, [snapshot]);
  return { ...state, repository };
}
