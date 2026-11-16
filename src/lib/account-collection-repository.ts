import type { CollectionItem, CollectionRepository } from "@/types/collection";
import { AccountCollectionError, accountCollectionMessages, parseAccountCollectionItem } from "./account-collection.ts";

export function createAccountCollectionRepository(notify: () => void, fetcher: typeof fetch = fetch): CollectionRepository {
  async function request(method: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try { response = await fetcher("/api/collection", { method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: body ? { "Content-Type": "application/json" } : {}, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new AccountCollectionError("unavailable"); }
    let payload;
    try { payload = await response.json(); } catch { throw new AccountCollectionError("unavailable"); }
    if (!response.ok) {
      const code = payload?.error?.code;
      throw new AccountCollectionError(typeof code === "string" && Object.hasOwn(accountCollectionMessages, code) ? code as keyof typeof accountCollectionMessages : "unavailable", response.status);
    }
    if (!payload || typeof payload !== "object" || !("data" in payload)) throw new AccountCollectionError("unavailable");
    return payload.data;
  }
  const changed = (value: unknown): CollectionItem => { const item = parseAccountCollectionItem(value); notify(); return item; };
  return {
    mode: "account",
    async list() { const data = await request("GET"); if (!Array.isArray(data) || data.length > 1000) throw new AccountCollectionError("unavailable"); return data.map(parseAccountCollectionItem); },
    async save(input) { return changed(await request("POST", { artworkId: input.artworkId })); },
    async update(artworkId, changes, expectedUpdatedAt) { return changed(await request("PATCH", { artworkId, ...changes, expectedUpdatedAt })); },
    async remove(artworkId, expectedUpdatedAt) {
      const data = await request("DELETE", { artworkId, expectedUpdatedAt });
      if (!data || typeof data !== "object" || !("removed" in data) || data.removed !== true) throw new AccountCollectionError("unavailable");
      notify();
    },
  };
}
