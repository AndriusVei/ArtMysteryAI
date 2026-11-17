import { diagnosticFetch } from "../diagnostics-server.ts";
import { supabaseEndpoint } from "../diagnostics-core.ts";
export type SupabaseConfiguration = { status: "missing" | "invalid" } | { status: "ready"; url: string; key: string };

export function supabaseConfiguration(env: Record<string, string | undefined> = process.env): SupabaseConfiguration {
  const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return { status: "missing" };
  if (!url || !key) return { status: "invalid" };
  try {
    const parsed = new URL(url);
    const local = ["127.0.0.1", "localhost"].includes(parsed.hostname);
    if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))
      || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return { status: "invalid" };
    // Ši integracija naudoja tik naują viešą publishable raktą, niekada secret/service_role.
    if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return { status: "invalid" };
    return { status: "ready", url: parsed.origin, key };
  } catch { return { status: "invalid" }; }
}

export function configuredSiteOrigin(value = process.env.SITE_URL): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
      || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.origin;
  } catch { return null; }
}

export const boundedSupabaseFetch: typeof fetch = (input, init) => diagnosticFetch(fetch, "supabase", supabaseEndpoint(input))(input, {
  ...init, cache: "no-store", signal: init?.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
});
