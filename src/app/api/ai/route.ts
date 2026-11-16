import { randomUUID } from "node:crypto";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireSameOrigin, readCollectionBody, AccountCollectionError } from "@/lib/account-collection";
import { AIError, aiConfiguration, strictAIRequest } from "@/lib/ai-core";
import { aiFailure, aiJSON } from "@/lib/ai-http";
import { trustedIPHash } from "@/lib/ai-signature";
import { AI_COLUMNS, responseFromRow, rowFromGeneration } from "@/lib/ai-records";
import { getArtwork } from "@/lib/artic";
import { createGeminiGenerator } from "@/lib/gemini";
import { runAIWorkflow } from "@/lib/ai-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    try { requireSameOrigin(request); } catch { throw new AIError("forbidden"); }
    const client = await createSupabaseServer();
    if (!client) throw new AIError("not_configured");
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new AIError("unauthorized");
    const owner = data.user.id;
    let input;
    try { input = strictAIRequest(await readCollectionBody(request)); }
    catch (cause) { if (cause instanceof AccountCollectionError) throw new AIError("invalid"); throw cause; }
    const config = aiConfiguration();
    if (!config.liveEnabled) throw new AIError("not_configured");
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45000)]);
    const result = await runAIWorkflow(input, request.headers.get("Idempotency-Key") ?? "", trustedIPHash(request, config.secret), signal, {
      async find(key) {
        const { data, error } = await client.from("ai_investigations").select(AI_COLUMNS).eq("user_id", owner).eq("request_key", key).maybeSingle();
        if (error) throw new AIError("unavailable");
        return data ? responseFromRow(data, owner, config.secret) : null;
      },
      async reserve(ipHash, key) { const { data, error } = await client.rpc("reserve_ai_quota", { ip_hash: ipHash, request_id: key }); if (error) throw new AIError("unavailable"); return data; },
      async release(key) { const { error } = await client.rpc("release_ai_quota", { request_id: key }); if (error) throw new AIError("unavailable"); },
      async artwork(id) { const result = await getArtwork(id); if (!result.ok) throw new AIError("museum"); return result.artwork; },
      generate: createGeminiGenerator(config),
      async persist(response, title, key) {
        const row = rowFromGeneration(response, title, owner, key, config.model, config.secret);
        const { data, error } = await client.from("ai_investigations").insert(row).select(AI_COLUMNS).single();
        if (error || !data) throw new AIError("unavailable");
        return responseFromRow(data, owner, config.secret);
      },
      newId: randomUUID,
    });
    return aiJSON({ data: result });
  } catch (cause) { return aiFailure(cause); }
}
