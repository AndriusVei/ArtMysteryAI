import test from "node:test";
import assert from "node:assert/strict";
import { validateCredentials, validateEmail, safeAuthNext, authErrorMessage } from "../src/lib/auth-validation.ts";
import { supabaseConfiguration, configuredSiteOrigin } from "../src/lib/supabase/config.ts";
import { AccountCollectionError, parseAccountCollectionItem, validateCollectionMutation, readCollectionBody, requireSameOrigin } from "../src/lib/account-collection.ts";
import { createAccountCollectionRepository } from "../src/lib/account-collection-repository.ts";
import { createRequire } from "node:module";
const { NextURL } = createRequire(import.meta.url)("next/dist/server/web/next-url.js");

const item = { id: "11111111-1111-4111-8111-111111111111", artworkId: 16568, title: "Water Lilies", artist: "Claude Monet", hasImage: true,
  category: "favorites", notes: "", createdAt: "2026-11-16T12:00:00.000000+00:00", updatedAt: "2026-11-16T12:00:00.000001+00:00" };

test("el. paštas normalizuojamas, slaptažodžio tarpai nekeičiami", () => {
  assert.equal(validateEmail(" A@Example.com "), "a@example.com");
  for (const value of [null, ["a@b.c"], "bad", "x".repeat(250) + "@example.com"]) assert.equal(validateEmail(value), null);
  assert.deepEqual(validateCredentials(" A@Example.com ", " secret "), { email: "a@example.com", password: " secret " });
  assert.ok(validateCredentials("a@example.com", "x".repeat(12), true));
  for (const [email, password, register] of [["bad", "secret"], [[], "secret"], ["a@b.c", ""], ["a@b.c", "x".repeat(129)], ["a@b.c", "short", true]]) assert.equal(validateCredentials(email, password, register), null);
});
test("prisijungimo grįžimo adresas neleidžia išorinių URL ar kodo", () => {
  assert.equal(safeAuthNext("/collection"), "/collection"); assert.equal(safeAuthNext("/artwork/16568"), "/artwork/16568");
  for (const value of ["//evil.example", "https://evil.example", "javascript:alert(1)", "/\\evil.example", "/profile?next=//evil", ["/collection"]]) assert.equal(safeAuthNext(value), "/profile");
});
test("autentifikacijos klaidos nerodo tiekėjo vidinių pranešimų", () => {
  assert.ok(authErrorMessage("invalid_credentials").includes("Patikrink"));
  assert.ok(authErrorMessage("email_not_confirmed").includes("patvirtink"));
  assert.ok(authErrorMessage("unknown", 429).includes("per daug"));
  assert.equal(authErrorMessage("private error details"), authErrorMessage());
});
test("konfigūracija skiria trūkumą, blogą URL ir slaptą raktą", () => {
  assert.equal(supabaseConfiguration({}).status, "missing");
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_" + "x".repeat(24) };
  assert.equal(supabaseConfiguration(env).status, "ready");
  for (const url of ["http://example.supabase.co", "https://user:pass@example.supabase.co", "https://example.supabase.co/?q=x", "https://example.supabase.co/path"]) assert.equal(supabaseConfiguration({ ...env, NEXT_PUBLIC_SUPABASE_URL: url }).status, "invalid");
  for (const key of ["sb_secret_private", "service_role", "", "eyJ.not.a.public.key"]) assert.equal(supabaseConfiguration({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }).status, "invalid");
});
test("laiškų nukreipimo adresas imamas tik iš patikrintos konfigūracijos", () => {
  assert.equal(configuredSiteOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(configuredSiteOrigin("https://app.example/"), "https://app.example");
  for (const value of ["", "http://public.example", "https://app.example/path", "https://user:pass@app.example"]) assert.equal(configuredSiteOrigin(value), null);
});
test("kolekcijos įvestis nepriima user_id, svetimo URL ar kliento metaduomenų", () => {
  assert.equal(validateCollectionMutation({ artworkId: 16568 }, "POST").artworkId, 16568);
  for (const extra of [{ user_id: "another-user" }, { title: "fake" }, { imageUrl: "https://evil.example" }]) assert.throws(() => validateCollectionMutation({ artworkId: 16568, ...extra }, "POST"), AccountCollectionError);
  for (const artworkId of [0, -1, "16568", 1.5, 1000000000]) assert.throws(() => validateCollectionMutation({ artworkId }, "POST"));
});
test("redagavimas ir šalinimas reikalauja versijos, kategorijos bei pastabos ribos", () => {
  const value = { artworkId: 16568, category: "explored", notes: "x".repeat(2000), expectedUpdatedAt: item.updatedAt };
  assert.equal(validateCollectionMutation(value, "PATCH").changes.notes.length, 2000);
  for (const override of [{ category: "admin" }, { notes: "x".repeat(2001) }, { expectedUpdatedAt: "bad" }, { expectedUpdatedAt: undefined }]) assert.throws(() => validateCollectionMutation({ ...value, ...override }, "PATCH"));
  assert.throws(() => validateCollectionMutation({ artworkId: 16568 }, "DELETE"));
});
test("paskyros įrašas tikrinamas vykdymo metu ir neatiduoda papildomų laukų", () => {
  assert.deepEqual(parseAccountCollectionItem({ ...item, user_id: "private", imageUrl: "https://evil.example" }), item);
  for (const override of [{ id: "demo-16568" }, { artworkId: "16568" }, { hasImage: "true" }, { category: "other" }, { notes: "x".repeat(2001) }, { updatedAt: "bad" }]) assert.throws(() => parseAccountCollectionItem({ ...item, ...override }));
});
test("mutacijos priima tik tos pačios svetainės užklausas", () => {
  requireSameOrigin(new Request("http://localhost:3000/api/collection", { headers: { Origin: "http://localhost:3000" } }));
  for (const headers of [{}, { Origin: "https://evil.example" }, { Origin: "http://localhost:3000", "Sec-Fetch-Site": "cross-site" }]) assert.throws(() => requireSameOrigin(new Request("http://localhost:3000/api/collection", { headers })), AccountCollectionError);
});

test("NextURL normalizuotas localhost leidžia tik tikrą tos pačios loopback svetainės Host", () => {
  const target = "http://localhost:3187/api/collection";
  for (const host of ["127.0.0.1:3187", "[::1]:3187"]) {
    const normalized = new NextURL(`http://${host}/api/collection`).toString();
    requireSameOrigin(new Request(normalized, { headers: { Origin: `http://${host}`, Host: host, "Sec-Fetch-Site": "same-origin" } }));
  }
  for (const headers of [
    { Origin: "http://127.0.0.1:3187" },
    { Origin: "http://127.0.0.1:3187", Host: "localhost:3187" },
    { Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000" },
    { Origin: "https://127.0.0.1:3187", Host: "127.0.0.1:3187" },
    { Origin: "http://evil.example:3187", Host: "evil.example:3187" },
    { Origin: "http://127.0.0.1:3187/path", Host: "127.0.0.1:3187" },
    { Origin: "http://127.0.0.1:3187", Host: "127.0.0.1:3187", "Sec-Fetch-Site": "cross-site" },
    { Origin: "https://evil.example", Host: "localhost:3187", "X-Forwarded-Host": "evil.example", "X-Forwarded-Proto": "https" },
  ]) assert.throws(() => requireSameOrigin(new Request(target, { headers })), AccountCollectionError);
  assert.throws(() => requireSameOrigin(new Request("https://app.example/api/collection", {
    headers: { Origin: "http://127.0.0.1:3187", Host: "127.0.0.1:3187" },
  })), AccountCollectionError);
});
test("JSON dydis, tipas ir sugadintas turinys ribojami prieš mutaciją", async () => {
  const request = (body, headers = { "Content-Type": "application/json" }) => new Request("http://localhost/api/collection", { method: "POST", headers, body });
  assert.deepEqual(await readCollectionBody(request('{"artworkId":16568}')), { artworkId: 16568 });
  for (const r of [request("bad"), request("{}", {}), request(" ".repeat(16001)), request("{}", { "Content-Type": "application/json", "Content-Length": "16001" })]) await assert.rejects(readCollectionBody(r), AccountCollectionError);
});
test("paskyros adapteris siunčia tik artworkId, slapukai tos pačios svetainės, be user_id", async () => {
  let events = 0;
  const repository = createAccountCollectionRepository(() => events++, async (url, options) => {
    assert.equal(url, "/api/collection"); assert.equal(options.credentials, "same-origin"); assert.equal(options.cache, "no-store");
    assert.deepEqual(JSON.parse(options.body), { artworkId: 16568 }); return Response.json({ data: item });
  });
  assert.equal(repository.mode, "account");
  assert.deepEqual(await repository.save({ artworkId: 16568, title: "untrusted", artist: "fake", hasImage: false, user_id: "attacker" }), item);
  assert.equal(events, 1);
});
test("nepavykęs įrašymas, sesija, konfliktas ir netinkamas atsakymas neimituoja sėkmės", async () => {
  for (const response of [Response.json({ error: { code: "unauthorized" } }, { status: 401 }), Response.json({ error: { code: "conflict" } }, { status: 409 }), Response.json({ data: { ...item, id: "bad" } }), new Response("<html>bad</html>")]) {
    let events = 0;
    const repository = createAccountCollectionRepository(() => events++, async () => response);
    await assert.rejects(repository.save({ artworkId: 16568 }), AccountCollectionError); assert.equal(events, 0);
  }
});
test("adapterio update/delete išsaugo serverio mikrosekundžių versiją ir praneša tik po sėkmės", async () => {
  const methods = []; let events = 0;
  const repository = createAccountCollectionRepository(() => events++, async (_url, options) => {
    methods.push(options.method); const body = JSON.parse(options.body); assert.equal(body.expectedUpdatedAt, item.updatedAt);
    return Response.json({ data: options.method === "DELETE" ? { removed: true } : item });
  });
  await repository.update(16568, { category: "favorites", notes: "" }, item.updatedAt);
  await repository.remove(16568, item.updatedAt);
  assert.deepEqual(methods, ["PATCH", "DELETE"]); assert.equal(events, 2);
});
