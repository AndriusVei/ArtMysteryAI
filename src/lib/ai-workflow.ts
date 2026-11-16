import type { Artwork } from "@/types/artwork";
import type { InvestigationRequest, InvestigationResponse } from "@/types/investigation";
import { AIError, parseModelResult, strictAIRequest, uuid } from "./ai-core.ts";

export interface AIWorkflow {
  find: (key: string) => Promise<InvestigationResponse | null>;
  reserve: (ipHash: string, key: string) => Promise<string>;
  release: (key: string) => Promise<void>;
  artwork: (id: number) => Promise<Artwork>;
  generate: (artwork: Artwork, request: InvestigationRequest, signal: AbortSignal) => Promise<string>;
  persist: (response: InvestigationResponse, title: string, key: string) => Promise<InvestigationResponse>;
  newId: () => string;
}
export async function runAIWorkflow(input: unknown, key: string, ipHash: string, signal: AbortSignal, deps: AIWorkflow) {
  const request = strictAIRequest(input);
  if (!uuid(key)) throw new AIError("invalid");
  const existing = await deps.find(key);
  if (existing) {
    if (JSON.stringify(existing.request) !== JSON.stringify(request)) throw new AIError("invalid");
    return existing;
  }
  const reserved = await deps.reserve(ipHash, key);
  if (reserved === "busy") throw new AIError("busy");
  if (reserved === "rate_limited") throw new AIError("rate_limited");
  if (reserved !== "allowed") throw new AIError("unavailable");
  try {
    if (signal.aborted) throw new AIError("timeout");
    const artwork = await deps.artwork(request.artworkId);
    if (artwork.id !== request.artworkId) throw new AIError("museum");
    const raw = await deps.generate(artwork, request, signal);
    if (signal.aborted) throw new AIError("timeout");
    const response = parseModelResult(raw, artwork, request, deps.newId());
    return await deps.persist(response, artwork.title, key);
  } finally {
    // Praradus DB ryšį užraktas vis tiek baigsis po 90 s; kvotos neatstatomos.
    await deps.release(key).catch(() => undefined);
  }
}
