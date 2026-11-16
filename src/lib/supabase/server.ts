import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { boundedSupabaseFetch, configuredSiteOrigin, supabaseConfiguration } from "./config";
import type { Database } from "@/types/database";

export async function createSupabaseServer() {
  const config = supabaseConfiguration();
  if (config.status !== "ready") return null;
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: boundedSupabaseFetch },
    cookieOptions: { httpOnly: true, sameSite: "lax", path: "/", secure: configuredSiteOrigin()?.startsWith("https:") ?? process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components slapukus atnaujina src/proxy.ts. */ }
      },
    },
  });
}

export type AccountIdentity = { mode: "demo" | "guest" | "unavailable" } | { mode: "account"; userId: string };

// React cache galioja vieno serverio renderio užklausai, ne bendram naudotojų podėliui.
export const getAccountIdentity = cache(async (): Promise<AccountIdentity> => {
  const config = supabaseConfiguration();
  if (config.status === "missing") return { mode: "demo" };
  if (config.status === "invalid") return { mode: "unavailable" };
  try {
    const client = await createSupabaseServer();
    if (!client) return { mode: "unavailable" };
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") return { mode: "unavailable" };
    return data.user ? { mode: "account", userId: data.user.id } : { mode: "guest" };
  } catch { return { mode: "unavailable" }; }
});
