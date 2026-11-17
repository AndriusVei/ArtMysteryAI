import { diagnosticFetch } from "./diagnostics-server.ts";
import { GoogleGenAI } from "@google/genai";
import type { Artwork } from "@/types/artwork";
import type { InvestigationRequest } from "@/types/investigation";
import { AIError, AI_OUTPUT_TOKENS, AI_SYSTEM_INSTRUCTION, modelPrompt, modelSchema } from "./ai-core.ts";

/** Ribotas tik JSON atsakymas; API raktas lieka serverio antraštėje. */
export function boundedGeminiFetch(fetcher: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await diagnosticFetch(fetcher, "gemini", "/interactions")(input, { ...init, cache: "no-store", redirect: "error" });
    const max = 256000;
    if (Number(response.headers.get("content-length")) > max || !response.body) { await response.body?.cancel(); throw new AIError("invalid_response"); }
    const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new AIError("invalid_response"); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
export function geminiError(cause: unknown): AIError {
  // SDK gali apgaubti fetch klaidą; žiūrimi tik tipai / statusai, ne privatūs tekstai.
  for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
    if (cause instanceof AIError) return cause;
    const value = cause as Record<string, unknown>;
    const status = value.status ?? value.statusCode;
    if (status === 429) return new AIError("rate_limited");
    if (status === 401 || status === 403) return new AIError("credentials");
    if (["AbortError", "TimeoutError", "RequestTimeoutError", "APIConnectionTimeoutError", "APIUserAbortError", "RequestAbortedError"].includes(String(value.name))) return new AIError("timeout");
    cause = value.cause;
  }
  return new AIError("unavailable");
}
export function createGeminiGenerator(config: { apiKey: string; model: string }, fetcher: typeof fetch = fetch) {
  const client = new GoogleGenAI({ apiKey: config.apiKey, httpOptions: { fetch: boundedGeminiFetch(fetcher), timeout: 25000 } });
  return async (artwork: Artwork, request: InvestigationRequest, signal: AbortSignal) => {
    try {
      const result = await client.interactions.create({ model: config.model, input: modelPrompt(artwork, request),
        system_instruction: AI_SYSTEM_INSTRUCTION, store: false, automatic_continuation: false,
        generation_config: { max_output_tokens: AI_OUTPUT_TOKENS, temperature: 0.5 },
        response_format: { type: "text", mime_type: "application/json", schema: modelSchema(request.questionCount) },
      }, { signal, timeout_ms: 25000, retries: { strategy: "none" } });
      if (result.status !== "completed" || !result.output_text || result.errors?.length) throw new AIError("invalid_response");
      return result.output_text;
    } catch (cause) { throw signal.aborted ? new AIError("timeout") : geminiError(cause); }
  };
}
