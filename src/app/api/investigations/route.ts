import { createSupabaseServer } from "@/lib/supabase/server";
import { readCollectionBody, requireSameOrigin } from "@/lib/account-collection";
import { AIError, aiConfiguration, uuid } from "@/lib/ai-core";
import { AI_COLUMNS, responseFromRow, savedFromRow } from "@/lib/ai-records";
import { aiFailure, aiJSON } from "@/lib/ai-http";

export const dynamic = "force-dynamic";
async function handle(request: Request, method: "GET" | "POST" | "DELETE") {
  try {
    if (method !== "GET") { try { requireSameOrigin(request); } catch { throw new AIError("forbidden"); } }
    const client = await createSupabaseServer(); if (!client) throw new AIError("not_configured");
    const { data: identity, error } = await client.auth.getUser();
    if (error || !identity.user) throw new AIError("unauthorized");
    const owner = identity.user.id, config = aiConfiguration();
    if (!config.storageEnabled) throw new AIError("not_configured");
    if (method === "GET") {
      const { data, error, count } = await client.from("ai_investigations").select(AI_COLUMNS, { count: "exact" }).eq("user_id", owner).not("saved_at", "is", null).order("saved_at", { ascending: false }).limit(1000);
      if (error || !data || (count ?? 0) > 1000) throw new AIError("unavailable");
      return aiJSON({ data: data.map((row) => savedFromRow(row, owner, config.secret)) });
    }
    let value: unknown;
    try { value = await readCollectionBody(request); } catch { throw new AIError("invalid"); }
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || !("generationId" in value) || !uuid(value.generationId)) throw new AIError("invalid");
    const id = value.generationId;
    const found = await client.from("ai_investigations").select(AI_COLUMNS).eq("id", id).eq("user_id", owner).maybeSingle();
    if (found.error) throw new AIError("unavailable");
    if (!found.data) throw new AIError("missing");
    responseFromRow(found.data, owner, config.secret); // Neužtenka turėti svetimą ar suklastotą naršyklės rezultatą.
    if (method === "DELETE") {
      const deleted = await client.from("ai_investigations").delete().eq("id", id).eq("user_id", owner).select("id").maybeSingle();
      if (deleted.error) throw new AIError("unavailable");
      if (!deleted.data) throw new AIError("missing");
      return aiJSON({ data: { removed: true } });
    }
    if (found.data.saved_at) return aiJSON({ data: savedFromRow(found.data, owner, config.secret) });
    const updated = await client.from("ai_investigations").update({ saved_at: new Date().toISOString() }).eq("id", id).eq("user_id", owner).select(AI_COLUMNS).single();
    if (updated.error || !updated.data) throw new AIError("unavailable");
    return aiJSON({ data: savedFromRow(updated.data, owner, config.secret) });
  } catch (cause) { return aiFailure(cause); }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const DELETE = (request: Request) => handle(request, "DELETE");
