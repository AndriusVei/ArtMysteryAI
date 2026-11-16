// Atskirai leidžiami izoliuoti tikri Auth/RLS/UI bandymai. Admin raktas tik per stdin, niekada į failą ar logą.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { browserTestSession } from "./browser-test-session.mjs";

assert.equal(process.env.ARTMYSTERY_ALLOW_REMOTE_TESTS, "YES", "Reikia atskiro tikrų testinių paskyrų ir įrašų bandymo leidimo.");
let raw = ""; for await (const chunk of process.stdin) raw += chunk;
const { adminKey } = JSON.parse(raw); raw = "";
assert.ok(typeof adminKey === "string" && adminKey.length > 30);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const base = process.argv[2] ?? "http://localhost:3191";
assert.ok(url && key);
const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const tag = randomUUID();
const accounts = ["a", "b"].map((label) => ({ email: `artmystery-test-${label}-${tag}@example.com`, password: randomBytes(30).toString("base64url") + "Aa1!" }));
const created = []; let a, b, passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
async function login(browser, account) {
  await browser.navigate("/login"); await browser.field("#auth-email", account.email); await browser.field("#auth-password", account.password);
  await browser.click("Prisijungti"); await browser.waitFor("location.pathname === '/profile' && document.body.innerText.includes('Esi prisijungęs')");
}
try {
  const first = await admin.auth.admin.generateLink({ type: "signup", email: accounts[0].email, password: accounts[0].password });
  assert.ok(!first.error && first.data.user && first.data.properties?.hashed_token, "Testinės patvirtinimo nuorodos generavimas nepavyko; tiekėjo turinys nerodomas.");
  created.push(first.data.user.id);
  const second = await admin.auth.admin.createUser({ ...accounts[1], email_confirm: true, user_metadata: { purpose: "artmystery-isolated-test" } });
  assert.ok(!second.error && second.data.user, "Antros izoliuotos paskyros kūrimas nepavyko."); created.push(second.data.user.id);
  pass("Sukurtos dvi izoliuotos tikros Supabase tapatybės; laiškai nesiunčiami");
  const publicClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const unconfirmed = await publicClient.auth.signInWithPassword(accounts[0]);
  assert.equal(unconfirmed.error?.code, "email_not_confirmed"); pass("Nepatvirtintas el. paštas nesuteikia sesijos");
  a = await browserTestSession(base); b = await browserTestSession(base);
  await a.navigate(`/auth/confirm?token_hash=${encodeURIComponent(first.data.properties.hashed_token)}&type=email`, "/profile");
  await a.waitFor("document.body.innerText.includes('Esi prisijungęs')");
  pass("Tikras vienkartinis patvirtinimo tokenas sukuria HttpOnly serverio sesiją");
  const cookies = (await a.send("Network.getCookies")).cookies.filter((cookie) => cookie.name.startsWith("sb-"));
  assert.ok(cookies.length && cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax"));
  pass("Sesijos slapukai HttpOnly ir SameSite=Lax; jų reikšmės nerodomos");
  const replay = await a.evaluate(`(async()=>{const r=await fetch(${JSON.stringify(`/auth/confirm?token_hash=${encodeURIComponent(first.data.properties.hashed_token)}&type=email`)},{redirect:'follow'});return new URL(r.url).pathname;})()`);
  assert.equal(replay, "/auth/error"); pass("Pakartotinai panaudotas patvirtinimo tokenas atmetamas");
  const rls = execFileSync(process.execPath, ["--use-system-ca", "scripts/check-supabase-rls.mjs"], { encoding: "utf8", env: {
    ...process.env, ARTMYSTERY_ALLOW_REMOTE_TESTS: "YES", ARTMYSTERY_TEST_USER_A_EMAIL: accounts[0].email, ARTMYSTERY_TEST_USER_A_PASSWORD: accounts[0].password,
    ARTMYSTERY_TEST_USER_B_EMAIL: accounts[1].email, ARTMYSTERY_TEST_USER_B_PASSWORD: accounts[1].password,
  }, stdio: ["ignore", "pipe", "pipe"] });
  console.log(rls.trim()); pass("Tiesioginis visų 3 lentelių dviejų tikrų naudotojų RLS scenarijus baigtas");
  await login(b, accounts[1]); pass("Kitas naudotojas prisijungia atskirame naršyklės profilyje");
  await a.navigate("/profile"); assert.equal((await a.api()).status, 200); pass("Sesija išlieka po naujo puslapio įkėlimo");
  await a.navigate("/artwork/16568"); await a.click("Išsaugoti į mano kolekciją");
  await a.waitFor("document.body.innerText.includes('Jau mano kolekcijoje')");
  const saved = await a.api(); assert.equal(saved.status, 200); assert.equal(saved.body.data.length, 1);
  const oldVersion = saved.body.data[0].updatedAt;
  pass("B kūrinio puslapis išsaugo tikrus muziejaus duomenis į A paskyrą");
  assert.equal((await b.api()).body.data.length, 0);
  assert.equal((await b.api("GET", undefined, `?user_id=${created[0]}`)).body.data.length, 0);
  const spoof = await b.api("POST", { artworkId: 16568, user_id: created[0] }); assert.equal(spoof.status, 400);
  const attack = await b.api("DELETE", { artworkId: 16568, expectedUpdatedAt: oldVersion }); assert.equal(attack.status, 409);
  assert.equal((await a.api()).body.data.length, 1);
  pass("B nemato A kolekcijos; tiesioginės user_id ir DELETE užklausos nesuteikia prieigos");
  await a.navigate("/collection"); await a.waitFor("document.querySelector('article')"); await a.click("Redaguoti");
  await a.field("#collection-16568-category", "explored"); await a.field("#collection-16568-notes", "Izoliuota A paskyros pastaba <script>window.artmysteryInjected=true</script>");
  await a.click("Išsaugoti pakeitimus"); await a.waitFor("document.body.innerText.includes('Kategorija ir pastaba išsaugotos paskyroje.')");
  const updated = (await a.api()).body.data[0]; assert.equal(updated.category, "explored"); assert.ok(updated.notes.includes("Izoliuota A"));
  assert.equal(await a.evaluate("window.artmysteryInjected === true"), false);
  pass("B redagavimo forma išsaugo paskyros kategoriją ir pastabą kaip tekstą");
  const stale = await a.api("PATCH", { artworkId: 16568, category: "favorites", notes: "Pasenęs pakeitimas", expectedUpdatedAt: oldVersion }); assert.equal(stale.status, 409);
  const duplicate = await a.api("POST", { artworkId: 16568 }); assert.equal(duplicate.status, 200); assert.equal(duplicate.body.data.notes, updated.notes);
  pass("Pasenęs PATCH gauna 409; pakartotinis save nedubliuoja ir neperrašo pastabos");
  await a.navigate("/collection"); await a.waitFor("document.querySelector('article')");
  assert.ok(await a.evaluate("document.querySelector('article').innerText.includes('Izoliuota A paskyros pastaba')"));
  pass("Kolekcijos pakeitimai išlieka po atnaujinimo");
  const ownB = await b.api("POST", { artworkId: 16568 }); assert.equal(ownB.status, 201);
  assert.notEqual(ownB.body.data.id, updated.id); assert.equal(ownB.body.data.notes, "");
  pass("Abu naudotojai nepriklausomai saugo tą patį kūrinį");
  for (const width of [375, 1440]) {
    await a.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await a.evaluate("document.documentElement.scrollWidth > innerWidth"), false); pass(`Paskyros kolekcija telpa ${width}px`);
  }
  await a.click("Pašalinti"); await a.click("Atšaukti pašalinimą"); assert.equal((await a.api()).body.data.length, 1);
  await a.click("Pašalinti"); await a.click("Taip, pašalinti"); await a.waitFor("!document.querySelector('article')");
  assert.equal((await a.api()).body.data.length, 0); assert.equal((await b.api()).body.data.length, 1);
  pass("Šalinimo atšaukimas ir patvirtinimas veikia, kitos paskyros įrašas išlieka");
  await a.navigate("/profile"); await a.click("Atsijungti šiame įrenginyje"); await a.waitFor("location.pathname === '/login'");
  assert.equal((await a.api()).status, 401); assert.equal((await b.api()).status, 200);
  await a.navigate("/collection"); await a.waitFor("document.body.innerText.includes('Demonstracinė kolekcija')");
  assert.equal((await a.api()).status, 401);
  pass("Atsijungimas panaikina A prieigą, demo režimas atskirtas, B sesija išlieka");
  await login(a, accounts[0]); assert.equal((await a.api()).status, 200); pass("Patvirtintos paskyros prisijungimas su slaptažodžiu veikia");
  console.log(`Auth/UI scenarijus: ${passed} PASS, 0 FAIL. Laiško pristatymas į realią dėžutę tikrinamas atskirai.`);
} catch (error) {
  // SDK ir CDP išimtyse gali būti užklausų duomenų: spausdinama tik saugi testo žyma.
  console.error(`Auth/UI scenarijus sustojo po ${passed} PASS. Klaidos klasė: ${error?.name ?? "Error"}; privatūs parametrai nerodomi.`);
  if (error?.message && !/sb_|eyJ|token_hash|password|@example/.test(error.message)) console.error(error.message.slice(0,500));
  process.exitCode = 1;
} finally {
  a?.close(); b?.close();
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) { console.error("Nepavyko pašalinti tik šio bandymo sukurtos paskyros; kitų paskyrų neliečiame."); process.exitCode = 1; }
  }
  console.log(`Izoliuoto bandymo paskyrų valymas baigtas (${created.length}); kitų naudotojų duomenys nekeisti.`);
}
