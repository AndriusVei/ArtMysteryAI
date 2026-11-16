"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SavedInvestigation, InvestigationRepository } from "@/types/investigation";
import type { AccountIdentity } from "@/lib/supabase/server";
import { createAccountInvestigations, investigationError } from "@/lib/account-investigations";

type State = { ready: boolean; items: SavedInvestigation[]; error: string | null };
type ContextState = State & { repository: InvestigationRepository; liveEnabled: boolean; accountEnabled: boolean };
const Context = createContext<ContextState | null>(null);
function Provider({ signedIn, storageEnabled, liveEnabled, children }: {
  signedIn: boolean; storageEnabled: boolean; liveEnabled: boolean; children: React.ReactNode;
}) {
  const accountEnabled = signedIn && storageEnabled;
  const [state, setState] = useState<State>({ ready: false, items: [], error: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const repository = useMemo(() => createAccountInvestigations(refresh), [refresh]);
  useEffect(() => {
    if (!accountEnabled) return;
    let active = true;
    let latest = 0;
    const load = async () => {
      const request = ++latest;
      try {
        const items = await repository.list();
        if (active && latest === request) setState({ ready: true, items, error: null });
      } catch (cause) {
        if (active && latest === request) setState({ ready: true, items: [], error: investigationError(cause) });
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, [accountEnabled, repository, revision]);
  return <Context.Provider value={{ ...state, repository, accountEnabled, liveEnabled: signedIn && liveEnabled }}>{children}</Context.Provider>;
}
export function InvestigationProvider({ identity, ...props }: {
  identity: AccountIdentity; storageEnabled: boolean; liveEnabled: boolean; children: React.ReactNode;
}) {
  return <Provider key={identity.mode === "account" ? identity.userId : identity.mode} signedIn={identity.mode === "account"} {...props} />;
}
export function useInvestigations() {
  const value = useContext(Context);
  if (!value) throw new Error("Tyrimų kontekstas neprijungtas.");
  return value;
}
