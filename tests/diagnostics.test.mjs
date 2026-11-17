import test from "node:test";
import assert from "node:assert/strict";
import { collectDiagnostics, diagnosticFetch, traceRoute } from "../src/lib/diagnostics-server.ts";
import { appEndpoint, safeDiagnostic, decodeDiagnostics, supabaseEndpoint, DIAGNOSTIC_HEADER } from "../src/lib/diagnostics-core.ts";
import { getArtwork } from "../src/lib/artic.ts";
import { createGeminiGenerator } from "../src/lib/gemini.ts";

const record = { service: "gemini", endpoint: "/interactions", method: "POST", status: 429, durationMs: 25 };
test("diagnostika priima tik fiksuotus laukus ir atmeta paslaptis / žalius endpoint", () => {
  const privateValues = { token: "TEST_SECRET", body: { userPrompt: "TEST_PROMPT" }, headers: { authorization: "TEST_TOKEN" }, user_id: "TEST_USER" };
  assert.deepEqual(safeDiagnostic({ ...record, ...privateValues }), record);
  for (const change of [{ endpoint: "/interactions?key=TEST_SECRET" }, { endpoint: "https://private.example/user/TEST_USER" },
    { service: "TEST_SECRET" }, { durationMs: Infinity }, { durationMs: -1 }, { method: "TEST_PROMPT" }, { status: 999 }]) assert.equal(safeDiagnostic({ ...record, ...change }), null);
  assert.deepEqual(decodeDiagnostics(JSON.stringify([{ ...record, ...privateValues }])), [record]);
  for (const value of ["not JSON", "x".repeat(5001), JSON.stringify(Array(13).fill(record))]) assert.deepEqual(decodeDiagnostics(value), []);
});
test("adreso klasifikacija niekada negrąžina paieškos, ID ar Supabase filtrų", () => {
  assert.equal(appEndpoint("/api/artworks/TEST_PRIVATE_ID"), "/api/artworks/:id");
  assert.equal(appEndpoint("/api/artworks/16568/image"), "/api/artworks/:id/image");
  assert.equal(appEndpoint("/auth/confirm"), null);
  assert.equal(supabaseEndpoint("https://project.example/rest/v1/saved_artworks?user_id=eq.TEST_USER&notes=TEST_PROMPT"), "/rest/v1/saved_artworks");
  assert.equal(supabaseEndpoint("https://project.example/auth/v1/admin/users/TEST_USER"), "/supabase/operation");
});
test("lygiagrečios serverio operacijos negali perskaityti viena kitos įrašų", async () => {
  const fetcher = async () => { await new Promise((resolve) => setTimeout(resolve, 5)); return new Response("TEST_PRIVATE_BODY", { status: 200 }); };
  const results = await Promise.all(["/artworks/:id", "/artworks/search"].map((endpoint) => collectDiagnostics(async () => {
    const r = await diagnosticFetch(fetcher, "artic", endpoint)("https://example.test/private?key=TEST_SECRET");
    assert.equal(await r.text(), "TEST_PRIVATE_BODY"); return endpoint;
  })));
  for (const result of results) { assert.equal(result.records.length, 1); assert.equal(result.records[0].endpoint, result.value); assert.ok(!JSON.stringify(result.records).includes("TEST_")); }
  const empty = await collectDiagnostics(async () => 1); assert.deepEqual(empty.records, []);
});
test("įdėtinis rinkimas atskirtas; tinklo klaida neužpildo įrašo išimties tekstu", async () => {
  const outer = await collectDiagnostics(async () => {
    const inner = await collectDiagnostics(async () => {
      await assert.rejects(diagnosticFetch(async () => { throw new Error("TEST_SECRET"); }, "supabase", "/auth/v1/user")("https://example.test"));
    });
    assert.equal(inner.records.length, 1); assert.equal(inner.records[0].status, null);
    assert.ok(!JSON.stringify(inner.records).includes("TEST_SECRET"));
  });
  assert.deepEqual(outer.records, []);
});
test("Response wrapper išlaiko body, statusą, slapuką ir private cache; riboja metaduomenų dydį", async () => {
  const route = traceRoute(async () => {
    for (let i = 0; i < 20; i++) await diagnosticFetch(async () => new Response("TEST_PRIVATE"), "artic", "/artworks/:id")("https://example.test");
    return Response.json({ userPrompt: "TEST_PRIVATE" }, { status: 201, headers: { "Set-Cookie": "test=TEST_PRIVATE; HttpOnly", "Cache-Control": "private, no-store" } });
  });
  const response = await route(new Request("http://localhost/api/collection"));
  assert.equal(response.status, 201); assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.deepEqual(await response.json(), { userPrompt: "TEST_PRIVATE" });
  const header = response.headers.get(DIAGNOSTIC_HEADER); assert.ok(!header.includes("TEST_PRIVATE")); assert.equal(decodeDiagnostics(header).length, 12);
});
test("invalid muziejaus ID nesukuria netikros upstream operacijos", async () => {
  const result = await collectDiagnostics(() => getArtwork("invalid", async () => { throw new Error("must not call"); }));
  assert.equal(result.value.code, "invalid_id"); assert.deepEqual(result.records, []);
});
for (const [status, expected] of [[401, "credentials"], [403, "credentials"], [429, "rate_limited"], [503, "unavailable"]]) {
  test(`SDK HTTP ${status}: saugi diagnostika, 1 bandymas, be tikro modelio`, async () => {
    let calls = 0;
    const generate = createGeminiGenerator({ apiKey: "test-only-key", model: "gemini-test" }, async () => {
      calls++; return Response.json({ error: { message: "TEST_SECRET_PROVIDER_BODY" } }, { status });
    });
    const result = await collectDiagnostics(async () => {
      await assert.rejects(generate({ id: 1, title: "Test" }, { artworkId: 1, questionCount: 3 }, new AbortController().signal), (error) => error.code === expected);
    });
    assert.equal(calls, 1); assert.equal(result.records.length, 1); assert.equal(result.records[0].status, status);
    assert.equal(result.records[0].method, "POST"); assert.ok(!JSON.stringify(result.records).includes("TEST_SECRET"));
  });
}
