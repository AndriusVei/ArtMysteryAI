import { AsyncLocalStorage } from "node:async_hooks";
import { DIAGNOSTIC_HEADER, MAX_RESPONSE_DIAGNOSTICS, safeDiagnostic, diagnosticMethod } from "./diagnostics-core.ts";
import type { DiagnosticEndpoint, DiagnosticRecord, DiagnosticService } from "./diagnostics-core.ts";

// Tik vienos operacijos kontekstas; nėra bendro skirtingų paskyrų žurnalo.
const storage = new AsyncLocalStorage<DiagnosticRecord[]>();
export async function collectDiagnostics<T>(operation: () => Promise<T>) {
  const records: DiagnosticRecord[] = [];
  const value = await storage.run(records, operation);
  return { value, records };
}
export function diagnosticFetch(fetcher: typeof fetch, service: DiagnosticService, endpoint: DiagnosticEndpoint): typeof fetch {
  return async (input, init) => {
    const records = storage.getStore();
    if (!records) return fetcher(input, init);
    const started = performance.now(); let status: number | null = null;
    try {
      const response = await fetcher(input, init);
      status = response.status; return response;
    } finally {
      const record = safeDiagnostic({ service, endpoint, method: diagnosticMethod(input, init), status,
        durationMs: Math.min(120000, Math.max(0, performance.now() - started)) });
      if (record && records.length < MAX_RESPONSE_DIAGNOSTICS) records.push(record);
    }
  };
}
export function traceRoute<T extends unknown[]>(handler: (request: Request, ...args: T) => Promise<Response>) {
  return async (request: Request, ...args: T) => {
    const { value, records } = await collectDiagnostics(() => handler(request, ...args));
    // Tik saugūs metaduomenys; originalūs statusas, body, cache ir slapukai nekeičiami.
    if (records.length) value.headers.set(DIAGNOSTIC_HEADER, JSON.stringify(records));
    return value;
  };
}
