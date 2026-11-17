export const DIAGNOSTIC_HEADER = "X-ArtMystery-Diagnostics";
export const MAX_DIAGNOSTICS = 30;
export const MAX_RESPONSE_DIAGNOSTICS = 12;
export const diagnosticServices = { app: "Programa", artic: "Art Institute of Chicago", supabase: "Supabase", gemini: "Gemini" } as const;
export type DiagnosticService = keyof typeof diagnosticServices;
export const diagnosticEndpoints = ["/api/artworks", "/api/artworks/:id", "/api/artworks/:id/image", "/api/collection", "/api/ai", "/api/investigations",
  "/login", "/register", "/profile", "/artworks/search", "/artworks/:id", "/iiif/2/:image", "/interactions",
  "/auth/v1/user", "/auth/v1/token", "/auth/v1/signup", "/auth/v1/logout", "/auth/v1/verify", "/auth/v1/resend", "/auth/v1/.well-known/jwks.json",
  "/rest/v1/profiles", "/rest/v1/saved_artworks", "/rest/v1/ai_investigations", "/rest/v1/rpc/reserve_ai_quota", "/rest/v1/rpc/release_ai_quota", "/supabase/operation"] as const;
export type DiagnosticEndpoint = typeof diagnosticEndpoints[number];
export type DiagnosticMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT" | "HEAD" | "OPTIONS";
export type DiagnosticRecord = { service: DiagnosticService; endpoint: DiagnosticEndpoint; method: DiagnosticMethod; status: number | null; durationMs: number };
const methods = ["GET", "POST", "PATCH", "DELETE", "PUT", "HEAD", "OPTIONS"];
export function safeDiagnostic(value: unknown): DiagnosticRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.service !== "string" || !Object.hasOwn(diagnosticServices, input.service)
    || !diagnosticEndpoints.includes(input.endpoint as DiagnosticEndpoint) || !methods.includes(input.method as string)
    || !(input.status === null || (typeof input.status === "number" && Number.isInteger(input.status) && input.status >= 100 && input.status <= 599))
    || typeof input.durationMs !== "number" || !Number.isFinite(input.durationMs) || input.durationMs < 0 || input.durationMs > 120000) return null;
  // Griežta projekcija: papildomi laukai, body, headers, ID ar klaidos niekada negrąžinami.
  return { service: input.service as DiagnosticService, endpoint: input.endpoint as DiagnosticEndpoint,
    method: input.method as DiagnosticMethod, status: input.status as number | null, durationMs: Math.round(input.durationMs) };
}
export function decodeDiagnostics(value: string | null): DiagnosticRecord[] {
  if (!value || value.length > 5000) return [];
  try {
    const data: unknown = JSON.parse(value);
    if (!Array.isArray(data) || data.length > MAX_RESPONSE_DIAGNOSTICS) return [];
    return data.map(safeDiagnostic).filter((item): item is DiagnosticRecord => item !== null);
  } catch { return []; }
}
export function appEndpoint(pathname: string): DiagnosticEndpoint | null {
  if (["/api/artworks", "/api/collection", "/api/ai", "/api/investigations", "/login", "/register", "/profile"].includes(pathname)) return pathname as DiagnosticEndpoint;
  if (/^\/api\/artworks\/[^/]+\/image$/.test(pathname)) return "/api/artworks/:id/image";
  if (/^\/api\/artworks\/[^/]+$/.test(pathname)) return "/api/artworks/:id";
  return null;
}
export function supabaseEndpoint(input: RequestInfo | URL): DiagnosticEndpoint {
  try {
    const path = new URL(typeof input === "string" || input instanceof URL ? input : input.url).pathname;
    if (diagnosticEndpoints.includes(path as DiagnosticEndpoint) && (path.startsWith("/auth/v1/") || path.startsWith("/rest/v1/"))) return path as DiagnosticEndpoint;
  } catch { /* Nežinomo adreso nededame į diagnostiką. */ }
  return "/supabase/operation";
}
export function diagnosticMethod(input: RequestInfo | URL, init?: RequestInit): DiagnosticMethod {
  const value = init?.method ?? (input instanceof Request ? input.method : "GET");
  return methods.includes(value.toUpperCase()) ? value.toUpperCase() as DiagnosticMethod : "GET";
}
