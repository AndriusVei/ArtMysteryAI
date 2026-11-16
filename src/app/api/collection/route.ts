import { createSupabaseServer } from "@/lib/supabase/server";
import { AccountCollectionError, parseAccountCollectionItem, readCollectionBody, requireSameOrigin, validateCollectionMutation } from "@/lib/account-collection";
import { getArtwork } from "@/lib/artic";
import type { SavedArtworkRow } from "@/types/database";

export const dynamic = "force-dynamic";
const columns = "id,artwork_id,title,artist,has_image,category,notes,created_at,updated_at";
function item(row: Pick<SavedArtworkRow, "id" | "artwork_id" | "title" | "artist" | "has_image" | "category" | "notes" | "created_at" | "updated_at">) {
  return parseAccountCollectionItem({ id: row.id, artworkId: row.artwork_id, title: row.title, artist: row.artist,
    hasImage: row.has_image, category: row.category, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at });
}
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });

async function handle(request: Request, method: "GET" | "POST" | "PATCH" | "DELETE") {
  try {
    if (method !== "GET") requireSameOrigin(request);
    const client = await createSupabaseServer();
    if (!client) throw new AccountCollectionError("unavailable");
    const { data: identity, error: authError } = await client.auth.getUser();
    if (authError && (authError.name === "AuthRetryableFetchError" || (authError.status ?? 0) >= 500)) throw new AccountCollectionError("unavailable");
    if (!identity.user || authError) throw new AccountCollectionError("unauthorized", 401);
    const owner = identity.user.id; // Niekuomet neimamas iš kliento įvesties.
    if (method === "GET") {
      const { data, error, count } = await client.from("saved_artworks").select(columns, { count: "exact" }).eq("user_id", owner).order("created_at", { ascending: false }).limit(1000);
      if (error || !data) throw new AccountCollectionError("unavailable");
      if ((count ?? 0) > 1000) throw new AccountCollectionError("limit", 413);
      return response({ data: data.map(item) });
    }
    const input = validateCollectionMutation(await readCollectionBody(request), method);
    if (method === "POST") {
      const artwork = await getArtwork(input.artworkId);
      if (!artwork.ok) throw new AccountCollectionError("museum", 502);
      const value = artwork.artwork;
      const inserted = await client.from("saved_artworks").insert({ user_id: owner, artwork_id: value.id, title: value.title,
        artist: value.artist, has_image: Boolean(value.image), image_url: value.image ? `/api/artworks/${value.id}/image` : null }).select(columns).single();
      if (inserted.error?.code === "23505") {
        const existing = await client.from("saved_artworks").select(columns).eq("user_id", owner).eq("artwork_id", value.id).single();
        if (existing.error || !existing.data) throw new AccountCollectionError("unavailable");
        return response({ data: item(existing.data) }); // Pakartojimas nekeičia pastabų ir kategorijos.
      }
      if (inserted.error || !inserted.data) throw new AccountCollectionError("unavailable");
      return response({ data: item(inserted.data) }, 201);
    }
    const query = method === "PATCH" ? client.from("saved_artworks").update(input.changes!) : client.from("saved_artworks").delete();
    const { data, error } = await query.eq("user_id", owner).eq("artwork_id", input.artworkId).eq("updated_at", input.expectedUpdatedAt!).select(columns).maybeSingle();
    if (error) throw new AccountCollectionError("unavailable");
    if (!data) throw new AccountCollectionError("conflict", 409);
    return response({ data: method === "DELETE" ? { removed: true } : item(data) });
  } catch (cause) {
    const error = cause instanceof AccountCollectionError ? cause : new AccountCollectionError("unavailable");
    return response({ error: { code: error.code, message: error.message } }, error.status);
  }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const PATCH = (request: Request) => handle(request, "PATCH");
export const DELETE = (request: Request) => handle(request, "DELETE");
