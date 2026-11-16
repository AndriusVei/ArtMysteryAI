import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDemoInvestigationRepository, createDemoInvestigationService, decodeDemoInvestigations,
  defaultResearchSettings, DEMO_INVESTIGATIONS_KEY, InvestigationStorageError } from "../src/lib/investigation.ts";

const artwork = JSON.parse(readFileSync(new URL("./fixtures/monet.json", import.meta.url), "utf8"));
const response = await createDemoInvestigationService(artwork).generate({ artworkId: artwork.id, ...defaultResearchSettings, userPrompt: "<script>test()</script>" });
function setup(initial = null) {
  let raw = initial; let writes = 0; let events = 0;
  const storage = { getItem(key) { assert.equal(key, DEMO_INVESTIGATIONS_KEY); return raw; },
    setItem(key, value) { assert.equal(key, DEMO_INVESTIGATIONS_KEY); raw = value; writes++; } };
  const repository = createDemoInvestigationRepository(() => storage, () => events++);
  return { repository, storage, raw: () => raw, writes: () => writes, events: () => events };
}

test("tyrimo rezultatas ir prašymas išlieka po naujo adapterio sukūrimo; dublikatų nėra", async () => {
  const state = setup();
  assert.deepEqual(await state.repository.list(), []);
  const saved = await state.repository.save(response, artwork.title);
  assert.equal(saved.response.request.userPrompt, "<script>test()</script>");
  const copy = createDemoInvestigationRepository(() => state.storage);
  assert.deepEqual(await copy.list(), [saved]);
  assert.deepEqual(await copy.save(response, artwork.title), saved);
  assert.equal(state.writes(), 1); assert.equal(state.events(), 1);
  // Grąžintų objektų pakeitimai saugyklos nepakeičia.
  saved.response.result.title = "Pakeista tik kopija";
  assert.equal((await copy.list())[0].response.result.title, response.result.title);
});

test("atskiri parametrai išsaugomi kaip atskiri tyrimai; šalinamas tik pasirinktas", async () => {
  const state = setup();
  const first = await state.repository.save(response, artwork.title);
  const changed = await createDemoInvestigationService(artwork).generate({ ...response.request, questionCount: 5 });
  const second = await state.repository.save(changed, artwork.title);
  assert.notEqual(first.id, second.id);
  await state.repository.remove(first.id);
  assert.deepEqual(await state.repository.list(), [second]);
  await assert.rejects(state.repository.remove(first.id), InvestigationStorageError);
  assert.equal(state.writes(), 3);
});

test("sugadintas, ne demo ir nepatikimų nuorodų turintis turinys neperrašomas", async () => {
  const good = setup(); await good.repository.save(response, artwork.title);
  const data = JSON.parse(good.raw());
  const badLink = structuredClone(data);
  badLink.items[0].response.result.historicalContext[0].sourceUrl = "javascript:alert(1)";
  const live = structuredClone(data); live.items[0].response.mode = "live";
  const duplicate = structuredClone(data); duplicate.items.push(duplicate.items[0]);
  const badDate = structuredClone(data); badDate.items[0].savedAt = "yesterday";
  for (const raw of ["", "{", "null", JSON.stringify({ version: 2, items: [] }), JSON.stringify(badLink), JSON.stringify(live), JSON.stringify(duplicate), JSON.stringify(badDate), "x".repeat(2000001)]) {
    const state = setup(raw);
    assert.throws(() => decodeDemoInvestigations(raw), InvestigationStorageError);
    await assert.rejects(state.repository.save(response, artwork.title));
    await assert.rejects(state.repository.remove(data.items[0].id));
    assert.equal(state.raw(), raw); assert.equal(state.writes(), 0);
  }
});

test("demo adapteris nepriima live rezultato, tuščio pavadinimo ar netaisyklingos schemos", async () => {
  const state = setup();
  for (const input of [{ ...response, mode: "live" }, { ...response, result: { ...response.result, questions: [] } }]) {
    await assert.rejects(state.repository.save(input, artwork.title));
  }
  await assert.rejects(state.repository.save(response, " "));
  await assert.rejects(state.repository.save(response, "x".repeat(2001)));
  assert.equal(state.writes(), 0);
});

test("saugyklos blokavimas ir kvotos klaida nepraneša apie sėkmę", async () => {
  let events = 0;
  const blocked = createDemoInvestigationRepository(() => { throw new Error("blocked"); }, () => events++);
  await assert.rejects(blocked.list(), InvestigationStorageError);
  await assert.rejects(blocked.save(response, artwork.title), InvestigationStorageError);
  const quota = createDemoInvestigationRepository(() => ({ getItem: () => null, setItem() { throw new DOMException("Full", "QuotaExceededError"); } }), () => events++);
  await assert.rejects(quota.save(response, artwork.title), InvestigationStorageError);
  assert.equal(events, 0);
});

test("30 tyrimų limitas atmeta naują įrašą, bet leidžia skaityti ir grąžinti dublikatą", async () => {
  const state = setup();
  for (let index = 0; index < 30; index++) {
    await state.repository.save({ ...response, request: { ...response.request, userPrompt: String(index) } }, artwork.title);
  }
  assert.equal((await state.repository.list()).length, 30);
  await assert.rejects(state.repository.save(response, artwork.title), /30/);
  await state.repository.save({ ...response, request: { ...response.request, userPrompt: "0" } }, artwork.title);
  assert.equal(state.writes(), 30);
});
