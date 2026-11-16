import { AIError, aiMessages, type AIErrorCode } from "./ai-core.ts";
const statuses: Record<AIErrorCode, number> = { unauthorized: 401, invalid: 400, forbidden: 403, not_configured: 503,
  rate_limited: 429, busy: 409, timeout: 504, credentials: 502, unavailable: 503, invalid_response: 502, museum: 502, missing: 404 };
export function aiJSON(value: unknown, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", ...headers } });
}
export function aiFailure(cause: unknown) {
  const code = cause instanceof AIError ? cause.code : "unavailable";
  return aiJSON({ error: { code, message: aiMessages[code] } }, statuses[code], code === "rate_limited" ? { "Retry-After": "60" } : {});
}
