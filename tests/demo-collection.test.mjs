import test from "node:test";
import assert from "node:assert/strict";
import { CollectionError, createDemoCollectionRepository, decodeDemoCollection, DEMO_COLLECTION_KEY } from "../src/lib/demo-collection.ts";

const artwork = { artworkId: 16568, title: "Vandens lelijos", artist: "Claude Monet", hasImage: true };

function memoryStorage(initial = null) {
  let value = initial, blocked = false, quota = false, changes = 0;
  const access = {
    getItem(key) { assert.equal(key, DEMO_COLLECTION_KEY); if (blocked) throw new Error("privatu"); return value; },
    setItem(key, next) { assert.equal(key, DEMO_COLLECTION_KEY); if (quota) throw new DOMException("privatu", "QuotaExceededError"); if (blocked) throw new Error("privatu"); value = next; },
  };
  return { repository: createDemoCollectionRepository(() => access, () => changes++),
    raw: () => value, changes: () => changes, setBlocked: (next) => { blocked = next; }, setQuota: (next) => { quota = next; } };
}

test("kolekcijos kelias: išsaugoti, redaguoti, atverti iš naujo ir pašalinti", async () => {
  const storage = memoryStorage();
  assert.deepEqual(await storage.repository.list(), []);
  const item = await storage.repository.save(artwork);
  assert.equal(item.category, "favorites");
  assert.equal(item.notes, "");
  const changed = await storage.repository.update(item.artworkId, { category: "to_explore", notes: "Noriu atidžiau tyrinėti atspindžius." }, item.updatedAt);
  assert.ok(changed.updatedAt > item.updatedAt);
  const fresh = memoryStorage(storage.raw());
  assert.deepEqual(await fresh.repository.list(), [changed]);
  await fresh.repository.remove(item.artworkId, changed.updatedAt);
  assert.deepEqual(await fresh.repository.list(), []);
});

test("pakartotinis ar greitas išsaugojimas nedubliuoja ir nepanaikina pastabos", async () => {
  const storage = memoryStorage();
  const [first, second] = await Promise.all([storage.repository.save(artwork), storage.repository.save(artwork)]);
  assert.equal(first.id, second.id);
  const updated = await storage.repository.update(first.artworkId, { category: "explored", notes: "Mano pastaba" }, first.updatedAt);
  const duplicate = await storage.repository.save({ ...artwork, title: "Water Lilies" });
  assert.deepEqual(duplicate, updated);
  assert.equal((await storage.repository.list()).length, 1);
  assert.equal(storage.changes(), 2);
});

test("kitas langas negali tyliai perrašyti naujesnės pastabos ar pašalinti pakeisto įrašo", async () => {
  const storage = memoryStorage();
  const original = await storage.repository.save(artwork);
  const newest = await storage.repository.update(16568, { category: "explored", notes: "Naujausia pastaba" }, original.updatedAt);
  const before = storage.raw();
  await assert.rejects(storage.repository.update(16568, { category: "favorites", notes: "Pasenęs tekstas" }, original.updatedAt), { code: "conflict" });
  await assert.rejects(storage.repository.remove(16568, original.updatedAt), { code: "conflict" });
  assert.equal(storage.raw(), before);
  assert.equal((await storage.repository.list())[0].updatedAt, newest.updatedAt);
});

test("atmetamos netinkamos įvestys ir per ilgos pastabos, duomenys nekinta", async () => {
  const storage = memoryStorage();
  const item = await storage.repository.save(artwork);
  const before = storage.raw();
  for (const invalid of [null, { ...artwork, artworkId: -1 }, { ...artwork, title: " " }, { ...artwork, hasImage: "true" }]) {
    await assert.rejects(storage.repository.save(invalid), { code: "invalid" });
  }
  for (const invalid of [null, { category: "admin", notes: "x" }, { category: "favorites", notes: "x".repeat(2001) }]) {
    await assert.rejects(storage.repository.update(16568, invalid, item.updatedAt), { code: "invalid" });
  }
  assert.equal(storage.raw(), before);
});

test("2000 ženklų ir tuščia pastaba leidžiamos; HTML lieka tekstu", async () => {
  const storage = memoryStorage();const item = await storage.repository.save(artwork);
  const long = await storage.repository.update(16568, { category: "favorites", notes: "ą".repeat(2000) }, item.updatedAt);
  const html = await storage.repository.update(16568, { category: "favorites", notes: "<script>alert(1)</script>" }, long.updatedAt);
  assert.equal((await storage.repository.list())[0].notes, "<script>alert(1)</script>");
  const empty = await storage.repository.update(16568, { category: "favorites", notes: "" }, html.updatedAt);
  assert.equal(empty.notes, "");
});

test("užblokuota saugykla neimituoja sėkmingo išsaugojimo", async () => {
  const storage = memoryStorage();storage.setBlocked(true);
  await assert.rejects(storage.repository.list(), { code: "storage" });
  await assert.rejects(storage.repository.save(artwork), { code: "storage" });
  assert.equal(storage.raw(), null);assert.equal(storage.changes(), 0);
});

test("išnaudota kvota nepakeičia esamų duomenų ir neišsiunčia sėkmės pranešimo", async () => {
  const storage = memoryStorage();const item = await storage.repository.save(artwork);const before = storage.raw();
  storage.setQuota(true);
  await assert.rejects(storage.repository.update(16568, { category: "explored", notes: "Nauja" }, item.updatedAt), { code: "quota" });
  assert.equal(storage.raw(), before);assert.equal(storage.changes(), 1);
});

test("sugadinti, nežinomos versijos ar pasikartojantys duomenys neperrašomi", async () => {
  const valid = memoryStorage();const item = await valid.repository.save(artwork);
  const corrupt = ["", "not json", JSON.stringify({ version: 2, items: [] }),
    JSON.stringify({ version: 1, items: [item, item] }),
    JSON.stringify({ version: 1, items: [{ ...item, updatedAt: "ne data" }] }),
    JSON.stringify({ version: 1, items: [{ ...item, category: "admin" }] }),
    JSON.stringify({ version: 1, items: [{ ...item, notes: "x".repeat(2001) }] })];
  for (const raw of corrupt) {
    const storage = memoryStorage(raw);
    await assert.rejects(storage.repository.list(), { code: "corrupt" });
    await assert.rejects(storage.repository.save(artwork), { code: "corrupt" });
    assert.equal(storage.raw(), raw);assert.equal(storage.changes(), 0);
  }
});

test("papildomi saugyklos URL ar naudotojo laukai neperkeliami į įrašą", async () => {
  const valid = memoryStorage();const item = await valid.repository.save(artwork);
  const [parsed] = decodeDemoCollection(JSON.stringify({ version: 1, items: [{ ...item, imageUrl: "https://example.com", userId: "fake" }] }));
  assert.ok(!("imageUrl" in parsed));assert.ok(!("userId" in parsed));
});

test("100 kūrinių riba palieka jau išsaugotą kolekciją nepakitusią", async () => {
  const storage = memoryStorage();
  for (let id = 1; id <= 100; id++) await storage.repository.save({ ...artwork, artworkId: id });
  const before = storage.raw();
  await assert.rejects(storage.repository.save({ ...artwork, artworkId: 101 }), { code: "limit" });
  assert.equal(storage.raw(), before);assert.equal((await storage.repository.list()).length, 100);
});

test("neegzistuojančio įrašo keitimas nesukuria naujo kūrinio", async () => {
  const storage = memoryStorage();
  await assert.rejects(storage.repository.update(16568, { category: "favorites", notes: "x" }, ""), { code: "missing" });
  await assert.rejects(storage.repository.remove(16568, ""), { code: "missing" });
  assert.equal(storage.raw(), null);
  assert.ok(new CollectionError("corrupt").message.length > 0);
});
