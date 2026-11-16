// Tik atskirai patvirtintiems izoliuotiems testiniams naudotojams, ne asmeninėms paskyroms.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

assert.equal(process.env.ARTMYSTERY_ALLOW_REMOTE_TESTS, "YES", "Tikras RLS testas rašo testinius duomenis. Reikalingas atskiras leidimas ir ARTMYSTERY_ALLOW_REMOTE_TESTS=YES.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key?.startsWith("sb_publishable_"), "Reikalinga vieša Supabase konfigūracija, ne administratoriaus raktas.");
assert.ok(process.env.ARTMYSTERY_TEST_USER_A_EMAIL && process.env.ARTMYSTERY_TEST_USER_A_PASSWORD && process.env.ARTMYSTERY_TEST_USER_B_EMAIL && process.env.ARTMYSTERY_TEST_USER_B_PASSWORD, "Reikalingos dvi atskiros patvirtintos testinės paskyros aplinkos kintamuosiuose.");
const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const clients = [makeClient(), makeClient()], anon = makeClient();
let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
const records = [];
let owners;
try {
  const signed = [];
  for (const [index, label] of ["A", "B"].entries()) {
    const { data, error } = await clients[index].auth.signInWithPassword({ email: process.env[`ARTMYSTERY_TEST_USER_${label}_EMAIL`], password: process.env[`ARTMYSTERY_TEST_USER_${label}_PASSWORD`] });
    assert.ok(!error && data.user, `Nepavyko prisijungti testiniam naudotojui ${label}; raktai ir tiekėjo klaida nespausdinami.`);
    signed.push(data.user.id);
  }
  owners = signed; assert.notEqual(owners[0], owners[1]); pass("Dvi tikros skirtingos patvirtintos tapatybės");
  // Prieš rašymą tikriname, kad tai tuščios, specialiai šiam bandymui skirtos paskyros.
  for (const client of clients) for (const table of ["profiles", "saved_artworks", "ai_investigations"]) {
    const result = await client.from(table).select("*", { count: "exact", head: true });
    assert.ok(!result.error && result.count === 0, `Testui reikia tuščių paskyrų ir veikiančios lentelės ${table}. Esami duomenys netrinami.`);
  }
  pass("Testinių paskyrų lentelės tuščios");
  for (const table of ["profiles", "saved_artworks", "ai_investigations"]) {
    const rows = owners.map((user_id, index) => table === "profiles" ? { user_id, display_name: "RLS bandymas" }
      : table === "saved_artworks" ? { id: randomUUID(), user_id, artwork_id: 900000000 + index, title: "Izoliuotas RLS bandymas", has_image: false, image_url: null }
      : { id: randomUUID(), user_id, artwork_id: 900000000 + index, artwork_title: "Izoliuotas RLS bandymas", knowledge_level: "beginner", investigation_mode: "detective_mystery", question_count: 3, ai_result: { test: true } });
    const idColumn = table === "profiles" ? "user_id" : "id";
    for (const [index, client] of clients.entries()) {
      const inserted = await client.from(table).insert(rows[index]).select("*").single();
      assert.ok(!inserted.error && inserted.data, `Nepavyko įrašyti savo ${table} įrašo.`);
      records.push({ client, table, idColumn, id: rows[index][idColumn] });
    }
    pass(`${table}: abu naudotojai įrašo savo duomenis`);
    for (const [index, client] of clients.entries()) {
      const ownId = rows[index][idColumn], foreignId = rows[1 - index][idColumn];
      const list = await client.from(table).select("*");
      assert.ok(!list.error && list.data.length === 1 && list.data[0].user_id === owners[index]);
      const other = await client.from(table).select("*").eq(idColumn, foreignId);
      assert.ok(!other.error && other.data.length === 0);
      const changes = table === "profiles" ? { display_name: "Savo pakeitimas" } : table === "saved_artworks" ? { notes: "Savo pastaba" } : { user_prompt: "Savo prašymas" };
      const ownUpdate = await client.from(table).update(changes).eq(idColumn, ownId).select("*");
      assert.ok(!ownUpdate.error && ownUpdate.data.length === 1);
      const otherUpdate = await client.from(table).update(changes).eq(idColumn, foreignId).select("*");
      assert.ok(!otherUpdate.error && otherUpdate.data.length === 0);
      const otherDelete = await client.from(table).delete().eq(idColumn, foreignId).select("*");
      assert.ok(!otherDelete.error && otherDelete.data.length === 0);
      const ownership = await client.from(table).update({ user_id: owners[1 - index] }).eq(idColumn, ownId).select("*");
      assert.equal(ownership.error?.code, "42501", "Nuosavybės pakeitimą turi atmesti RLS.");
      const spoof = { ...rows[index], user_id: owners[1 - index], ...(table === "profiles" ? {} : { id: randomUUID(), artwork_id: 900000100 + index }) };
      const spoofed = await client.from(table).insert(spoof);
      assert.equal(spoofed.error?.code, "42501", "Svetimo user_id INSERT turi atmesti RLS.");
    }
    pass(`${table}: savo SELECT/UPDATE veikia, svetimi SELECT/UPDATE/DELETE, INSERT ir nuosavybės pakeitimas uždrausti`);
    for (const method of ["select", "insert", "update", "delete"]) {
      const query = method === "select" ? anon.from(table).select("*") : method === "insert" ? anon.from(table).insert(rows[0])
        : method === "update" ? anon.from(table).update({ user_id: owners[0] }).eq(idColumn, rows[0][idColumn])
        : anon.from(table).delete().eq(idColumn, rows[0][idColumn]);
      const result = await query;
      assert.ok(result.error, `Anoniminis ${method} ${table} turi būti uždraustas.`);
    }
    pass(`${table}: anoniminiai SELECT/INSERT/UPDATE/DELETE uždrausti`);
  }
  console.log(`RLS patikra: ${passed} PASS, 0 FAIL. Tai nepakeičia programos sesijų ir UI testų.`);
} finally {
  let cleanupFailed = false;
  // Šalinami tik šio paleidimo sukurti įrašai, ne vartotojai ar senesni duomenys.
  for (const row of records.reverse()) {
    const result = await row.client.from(row.table).delete().eq(row.idColumn, row.id).select(row.idColumn);
    if (result.error || result.data?.length !== 1) { cleanupFailed = true; console.error(`Nepavyko pašalinti šio bandymo įrašo lentelėje ${row.table}; patikrink tik testines paskyras.`); }
  }
  for (const client of clients) await client.auth.signOut({ scope: "local" });
  if (cleanupFailed) process.exitCode = 1;
}
