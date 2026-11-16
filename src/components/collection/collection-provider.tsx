"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CollectionItem, CollectionRepository } from "@/types/collection";
import type { AccountIdentity } from "@/lib/supabase/server";
import { useDemoCollection } from "./use-demo-collection";
import { createAccountCollectionRepository } from "@/lib/account-collection-repository";
import { AccountCollectionError } from "@/lib/account-collection";

type CollectionState = { ready: boolean; items: CollectionItem[]; error: string | null; repository: CollectionRepository; refresh?: () => void };
const Context = createContext<CollectionState | null>(null);
function DemoProvider({ children }: { children: React.ReactNode }) {
  const state = useDemoCollection();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
function AccountProvider({ children, blocked }: { children: React.ReactNode; blocked: boolean }) {
  const [state, setState] = useState({ ready: false, items: [] as CollectionItem[], error: null as string | null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const repository = useMemo(() => createAccountCollectionRepository(refresh), [refresh]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (blocked) throw new AccountCollectionError("unavailable");
        const items = await repository.list();
        if (active) setState({ ready: true, items, error: null });
      } catch (cause) {
        if (active) setState({ ready: true, items: [], error: cause instanceof AccountCollectionError ? cause.message : "Paskyros kolekcijos atverti nepavyko." });
      }
    };
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, [blocked, repository, revision]);
  return <Context.Provider value={{ ...state, repository, refresh }}>{children}</Context.Provider>;
}
export function CollectionProvider({ identity, children }: { identity: AccountIdentity; children: React.ReactNode }) {
  return identity.mode === "account" || identity.mode === "unavailable"
    ? <AccountProvider key={identity.mode === "account" ? identity.userId : "unavailable"} blocked={identity.mode === "unavailable"}>{children}</AccountProvider>
    : <DemoProvider>{children}</DemoProvider>;
}
export function useCollection() {
  const state = useContext(Context);
  if (!state) throw new Error("Kolekcijos kontekstas neprijungtas.");
  return state;
}
