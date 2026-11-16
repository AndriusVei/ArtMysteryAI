import type { InvestigationRepository, InvestigationService, SavedInvestigation } from "@/types/investigation";
import { validateInvestigationResponse } from "./investigation.ts";
import { AIError, aiMessages, uuid, type AIErrorCode } from "./ai-errors.ts";

export function investigationError(cause: unknown) {
  return cause instanceof Error ? cause.message : aiMessages.unavailable;
}
async function api(fetcher: typeof fetch, path: string, method: string, body?: unknown, signal?: AbortSignal, key?: string): Promise<unknown> {
  try {
    const response = await fetcher(path, { method, credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(key ? { "Idempotency-Key": key } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: signal ?? AbortSignal.timeout(20000) });
    const payload = await response.json();
    if (!response.ok) {
      const code = payload?.error?.code;
      throw new AIError(typeof code === "string" && Object.hasOwn(aiMessages, code) ? code as AIErrorCode : "unavailable");
    }
    if (!payload || typeof payload !== "object" || !("data" in payload)) throw new AIError("invalid_response");
    return payload.data;
  } catch (cause) {
    if (cause instanceof AIError) throw cause;
    if (signal?.aborted) throw new AIError("timeout");
    throw new AIError("unavailable");
  }
}
export function createLiveInvestigationService(fetcher: typeof fetch = fetch): InvestigationService {
  return { mode: "live", async generate(request, signal) {
    const data = await api(fetcher, "/api/ai", "POST", request, signal ?? AbortSignal.timeout(50000), crypto.randomUUID());
    try {
      const value = validateInvestigationResponse(data, request);
      if (value.mode !== "live" || !uuid(value.generationId)) throw new Error();
      return value;
    } catch { throw new AIError("invalid_response"); }
  } };
}
export function parseSavedInvestigation(input: unknown): SavedInvestigation {
  try {
    if (!input || typeof input !== "object") throw new Error();
    const item = input as SavedInvestigation;
    if (!uuid(item.id) || typeof item.artworkTitle !== "string" || !item.artworkTitle.trim() || item.artworkTitle.length > 2000
      || typeof item.savedAt !== "string" || new Date(item.savedAt).toISOString() !== item.savedAt) throw new Error();
    const response = validateInvestigationResponse(item.response, item.response.request);
    if (response.mode !== "live" || response.generationId !== item.id) throw new Error();
    return { id: item.id, artworkTitle: item.artworkTitle, savedAt: item.savedAt, response };
  } catch { throw new AIError("invalid_response"); }
}
export function createAccountInvestigations(notify: () => void, fetcher: typeof fetch = fetch): InvestigationRepository {
  return { mode: "account",
    async list() {
      const data = await api(fetcher, "/api/investigations", "GET");
      if (!Array.isArray(data) || data.length > 1000) throw new AIError("invalid_response");
      const items = data.map(parseSavedInvestigation);
      if (new Set(items.map((item) => item.id)).size !== items.length) throw new AIError("invalid_response");
      return items;
    },
    async save(response) {
      if (response.mode !== "live" || !uuid(response.generationId)) throw new AIError("invalid");
      const item = parseSavedInvestigation(await api(fetcher, "/api/investigations", "POST", { generationId: response.generationId }));
      notify(); return item;
    },
    async remove(id) {
      if (!uuid(id)) throw new AIError("invalid");
      const data = await api(fetcher, "/api/investigations", "DELETE", { generationId: id });
      if (!data || typeof data !== "object" || !("removed" in data) || data.removed !== true) throw new AIError("invalid_response");
      notify();
    },
  };
}
