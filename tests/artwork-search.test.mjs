import test from "node:test";
import assert from "node:assert/strict";
import { validateArtworkSearch, searchArtworks, parseArtworkSearchResponse, SEARCH_PAGE_SIZE } from "../src/lib/artic.ts";

const fixture = (overrides = {}) => ({
  data: [{ id: 16568, title: "Water Lilies", artist_title: "Claude Monet", is_public_domain: true,
    image_id: "3c27b499-af56-f0d5-93b5-a7f2f1ad5813", copyright_notice: null }],
  config: { iiif_url: "https://www.artic.edu/iiif/2" },
  pagination: { total: 1, limit: SEARCH_PAGE_SIZE, current_page: 1 }, ...overrides,
});

test("paieška priima vieną ar abu teksto laukus ir normalizuoja tarpus", () => {
  assert.deepEqual(validateArtworkSearch({ q: "  water   lilies ", artist: " Monet " }), { q: "water lilies", artist: "Monet", page: 1 });
  assert.deepEqual(validateArtworkSearch({ artist: "Monet", page: "50" }), { q: "", artist: "Monet", page: 50 });
  assert.ok(validateArtworkSearch({ q: "a".repeat(120) }));
});

test("tuščios, per ilgos, pasikartojančios ir netinkamos įvestys nepasiekia muziejaus", async () => {
  let calls = 0;
  for (const input of [{}, { q: "  " }, { q: ["Monet"] }, { artist: {} }, { q: "a".repeat(121) },
    { q: "a\u0000" }, ...["0", "01", "51", "1.5", "1e1", 1, ["1"]].map((page) => ({ q: "Monet", page }))]) {
    assert.deepEqual(await searchArtworks(input, async () => { calls++; throw new Error(); }), { ok: false, code: "invalid_query" });
  }
  assert.equal(calls, 0);
});

test("autoriaus ir raktažodžio filtrai serverio sudaromi params JSON, tekstas nevirsta DSL", async () => {
  const text = 'Monet"}&query=bad';
  let calls = 0;
  const result = await searchArtworks({ q: text, artist: "Claude Monet" }, async (url, options) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.artic.edu");
    assert.equal(parsed.pathname, "/api/v1/artworks/search");
    assert.deepEqual([...parsed.searchParams.keys()], ["params"]);
    const params = JSON.parse(parsed.searchParams.get("params"));
    assert.equal(params.query.bool.must[0].multi_match.query, text);
    assert.deepEqual(params.query.bool.filter, [{ term: { is_public_domain: true } }, { exists: { field: "image_id" } }, { match_phrase: { artist_title: "Claude Monet" } }]);
    assert.equal(params.limit, SEARCH_PAGE_SIZE);
    assert.equal(params.page, 1);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.redirect, "error");
    assert.equal(options.next.revalidate, 3600);
    return Response.json(fixture());
  });
  assert.equal(result.ok, true); assert.equal(calls, 1);
  assert.equal(result.data.items[0].id, 16568);
});

test("autorius veikia ir be raktažodžio, puslapis perduodamas muziejui", async () => {
  const result = await searchArtworks({ artist: "Monet", page: "2" }, async (url) => {
    const params = JSON.parse(new URL(url).searchParams.get("params"));
    assert.equal(params.query.bool.must, undefined);
    assert.equal(params.page, 2);
    return Response.json(fixture({ pagination: { total: 20, limit: SEARCH_PAGE_SIZE, current_page: 2 } }));
  });
  assert.equal(result.data.page, 2); assert.equal(result.data.totalPages, 3);
});

test("tušti rezultatai yra sėkminga paieška, trūkstami tekstai neišgalvojami", () => {
  assert.deepEqual(parseArtworkSearchResponse(fixture({ data: [], pagination: { total: 0, limit: SEARCH_PAGE_SIZE, current_page: 1 } }), 1), { items: [], total: 0, page: 1, totalPages: 0 });
  const data = parseArtworkSearchResponse(fixture({ data: [{ id: 16568 }] }), 1);
  assert.equal(data.items[0].artist, null); assert.equal(data.items[0].image, null);
});

test("B vaizdų teisių ir IIIF taisyklės galioja ir paieškoje", () => {
  const original = fixture();
  assert.ok(parseArtworkSearchResponse(original, 1).items[0].image);
  for (const override of [{ is_public_domain: false }, { image_id: null }, { copyright_notice: "Copyright" }]) {
    assert.equal(parseArtworkSearchResponse(fixture({ data: [{ ...original.data[0], ...override }] }), 1).items[0].image, null);
  }
  assert.equal(parseArtworkSearchResponse(fixture({ config: { iiif_url: "https://evil.example/iiif/2" } }), 1).items[0].image, null);
});

test("neteisingi ID, dublikatai, per daug rezultatų ir netinkama puslapiavimo schema atmetami", () => {
  const original = fixture();
  for (const value of [null, { data: [] }, fixture({ data: [{}] }), fixture({ data: [{ id: "16568" }] }),
    fixture({ data: [original.data[0], original.data[0]], pagination: { total: 2, limit: SEARCH_PAGE_SIZE, current_page: 1 } }),
    fixture({ data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })) }),
    ...[{ total: -1 }, { total: "1" }, { current_page: 2 }, { limit: 100 }].map((p) => fixture({ pagination: { ...original.pagination, ...p } }))]) {
    assert.throws(() => parseArtworkSearchResponse(value, 1));
  }
});

for (const [status, code] of [[403, "unavailable"], [404, "unavailable"], [429, "rate_limited"], [500, "unavailable"]]) {
  test(`paieškos HTTP ${status} grąžina kontroliuojamą klaidą be pakartojimų`, async () => {
    let calls = 0;
    assert.deepEqual(await searchArtworks({ q: "Monet" }, async () => { calls++; return new Response(null, { status }); }), { ok: false, code });
    assert.equal(calls, 1);
  });
}

test("HTML, sugadintas JSON ir per didelis srautas nerodomi kaip rezultatai", async () => {
  for (const response of [new Response("<html>bad</html>"),
    new Response("{", { headers: { "Content-Type": "application/json" } }),
    new Response(" ".repeat(128001), { headers: { "Content-Type": "application/json" } }),
    new Response("{}", { headers: { "Content-Type": "application/json", "Content-Length": "128001" } }),
    Response.json({ data: "bad" })]) {
    assert.deepEqual(await searchArtworks({ q: "Monet" }, async () => response), { ok: false, code: "invalid_response" });
  }
});

test("tinklo ir laiko klaidos neatskleidžia vidinių duomenų", async () => {
  for (const [name, code] of [["Error", "unavailable"], ["TimeoutError", "timeout"], ["AbortError", "timeout"]]) {
    assert.deepEqual(await searchArtworks({ q: "Monet" }, async () => { const error = new Error("privatus turinys"); error.name = name; throw error; }), { ok: false, code });
  }
});
