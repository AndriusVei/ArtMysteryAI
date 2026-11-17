// Du tikri generavimai, izoliuotas vietinis Next serveris ir dvi laikinos paskyros.
// Admin raktas tik stdin; slapti duomenys, modelio JSON ir naudotojo tekstai nespausdinami.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { validateInvestigationResponse } from "../src/lib/investigation.ts";
import { browserTestSession } from "./browser-test-session.mjs";
import { prepareLocalCheck } from "./prepare-local-check.mjs";

const fixtureOnly = process.env.ARTMYSTERY_AI_FIXTURE_ONLY === "YES";
const checkDiagnostics = process.env.ARTMYSTERY_TEST_DIAGNOSTICS === "YES";
const fixtureError = fixtureOnly && [401, 403, 429, 503].includes(Number(process.env.ARTMYSTERY_TEST_GEMINI_ERROR)) ? Number(process.env.ARTMYSTERY_TEST_GEMINI_ERROR) : 0;
const counts = process.env.ARTMYSTERY_AI_ONLY_COUNT === "5" ? [5] : [3, 5];
const approvedModel = process.env.ARTMYSTERY_GEMINI_APPROVED_MODEL;
if ((!fixtureOnly && (process.env.ARTMYSTERY_ALLOW_LIVE_GEMINI !== "YES" || process.env.ARTMYSTERY_GEMINI_MAX_REQUESTS !== String(counts.length)
  || !["gemini-4-hydrogen", "gemini-3.5-flash-lite"].includes(approvedModel)))
  || process.env.ARTMYSTERY_ALLOW_REMOTE_TESTS !== "YES") {
  console.error("NOT RUN: reikia atskiro leidimo dviem Gemini užklausoms ir izoliuotoms bandymo paskyroms.");
  process.exit(2);
}
try { process.loadEnvFile(".env.local"); } catch { /* Konfigūracija iš proceso. */ }
if (!fixtureOnly) assert.equal(process.env.GEMINI_MODEL, approvedModel);
let stdin = ""; for await (const chunk of process.stdin) stdin += chunk;
const { adminKey } = JSON.parse(stdin); stdin = "";
assert.ok(typeof adminKey === "string" && adminKey.length > 30);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key && new URL(url).hostname === "qjqkjtqqvzbzihueuqzu.supabase.co");
const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const base = "http://127.0.0.1:3194";
const accounts = ["a", "b"].map((label) => ({ email: `artmystery-ai-test-${label}-${randomUUID()}@example.com`, password: randomBytes(30).toString("base64url") + "Aa1!" }));
const created = [], browsers = [], generations = [];
let server, modelCalls = 0, fixtureCalls = 0, providerStatus = null, passed = 0, checkpoint = "initialization", generationStatus = null, generationCode = "none";
let startupDiagnostic = "";
const pass = (label) => { passed++; console.log(`PASS ${label}`); };
const api = (browser, path, method = "GET", body, extraHeaders = {}) => browser.evaluate(`(async()=>{
  const r=await window.fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},cache:'no-store',
  headers:${JSON.stringify({ ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders })},
  ${body ? `body:${JSON.stringify(JSON.stringify(body))},` : ""}});
  return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};})()`);
async function login(browser, account) {
  await browser.navigate("/login");
  await browser.waitFor("Object.keys(document.querySelector('#auth-email') ?? {}).some(key=>key.startsWith('__reactProps'))");
  await browser.field("#auth-email", account.email); await browser.field("#auth-password", account.password);
  await browser.click("Prisijungti"); await browser.waitFor("location.pathname === '/profile' && document.body.innerText.includes('Esi prisijungęs')");
}
async function enableDiagnostics(browser) {
  if (!checkDiagnostics) return;
  await browser.waitFor(`Object.keys(document.querySelector('input[aria-controls="developer-mode-panel"]') ?? {}).some(key=>key.startsWith('__reactProps'))`);
  await browser.evaluate(`(() => {const input=document.querySelector('input[aria-controls="developer-mode-panel"]');if(!input.checked)input.click();})()`);
  await browser.waitFor("document.querySelector('#developer-mode-panel')");
}
async function screenshot(browser, name, selector) {
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
  await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
  mkdirSync(".next/phase4-review", { recursive: true });
  const shot = await browser.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`.next/phase4-review/${name}.png`, Buffer.from(shot.data, "base64"));
}
try {
  checkpoint = "isolated server";
  // Atskiras projektinis katalogas apeina Next dev vieno proceso užraktą.
  // Kopijuojamas tik kodas / vieši failai, jokie .env ar .git duomenys.
  const workspace = prepareLocalCheck(checkDiagnostics ? "phase5-workspace" : "phase4-workspace");
  server = fork(new URL("./ai-test-server.mjs", import.meta.url), [], { cwd: workspace, silent: true, windowsHide: true });
  // Next logai neskleidžiami: juose gali atsirasti privatūs parametrai.
  server.stdout.resume(); server.stderr.on("data", (chunk) => { startupDiagnostic = (startupDiagnostic + String(chunk)).slice(-5000); });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server startup timeout")), 60000);
    server.on("message", (message) => {
      if (message.type === "generation") modelCalls = message.calls;
      if (message.type === "fixture_generation") fixtureCalls = message.calls;
      if (message.type === "generation_response") providerStatus = message.status;
      if (message.type === "ready") { clearTimeout(timer); resolve(); }
    });
    server.once("exit", () => { clearTimeout(timer); reject(new Error("Server stopped")); });
  });
  pass(fixtureOnly ? "Izoliuotas serveris su imituotu modeliu; tikros Gemini užklausos užblokuotos" : `Atskiras vietinis serveris; Gemini kvietimų riba: ${counts.length}`);
  checkpoint = "temporary accounts";
  for (const account of accounts) {
    checkpoint = `temporary account ${created.length + 1}: creation`;
    const { data, error } = await admin.auth.admin.createUser({ ...account, email_confirm: true, user_metadata: { purpose: checkDiagnostics ? "phase5-isolated-test" : "phase4-isolated-test" } });
    assert.ok(!error && data.user, "Temporary account failed"); created.push(data.user.id);
    checkpoint = `temporary account ${created.length}: browser`;
    const browser = await browserTestSession(base); browsers.push(browser);
    checkpoint = `temporary account ${created.length}: login`;
    await login(browser, account);
    checkpoint = `temporary account ${created.length}: initial list`;
    assert.deepEqual((await api(browser, "/api/investigations")).body.data, []);
  }
  const [a, b] = browsers;
  pass("Dvi tikros atskiros sesijos, paskyrų tyrimų sąrašai tušti; laiškai nesiųsti");
  checkpoint = "origin collection regression";
  await a.navigate("/artwork/27954");
  await a.evaluate(`(() => { const original=window.fetch.bind(window); window.phase4CollectionStatus=null;
    window.fetch=async(input,init)=>{const r=await original(input,init);
      if(new URL(typeof input==='string'?input:input.url,location.href).pathname==='/api/collection' && init?.method==='POST')
        window.phase4CollectionStatus={status:r.status,code:(await r.clone().json()).error?.code ?? 'none'}; return r;};})()`);
  await a.click("Išsaugoti į mano kolekciją");
  await a.waitFor("document.body.innerText.includes('Jau mano kolekcijoje')");
  const artworkSaved = (await a.api()).body.data[0]; assert.equal(artworkSaved.artworkId, 27954);
  pass("127.0.0.1 adresu kūrinys 27954 išsaugomas be ankstesnės Origin klaidos");
  assert.equal((await b.api()).body.data.length, 0);

  for (const count of counts) {
    const index = count === 5 ? 1 : 0;
    checkpoint = `generation ${index + 1}`;
    const browser = browsers[index], other = browsers[1 - index];
    await browser.navigate("/artwork/16568");
    checkpoint = `generation ${index + 1}: hydration`;
    await browser.waitFor("Object.keys(document.querySelector('#research-level') ?? {}).some(key=>key.startsWith('__reactProps'))");
    checkpoint = `generation ${index + 1}: diagnostics`;
    await enableDiagnostics(browser);
    checkpoint = `generation ${index + 1}: settings`;
    await browser.waitFor("document.querySelector('[aria-label=\"Tikras DI tyrimas\"]')");
    await browser.field("#research-level", index ? "expert" : "child");
    await browser.field("#research-mode", index ? "symbolism_analysis" : "detective_mystery");
    await browser.field("#research-count", String(count));
    await browser.field("#research-prompt", checkDiagnostics ? "TEST_PRIVATE_PROMPT <script>window.testInjected=true</script>" : "Padėk atskirti muziejaus duomenis nuo interpretacijų.");
    // Fiksuojama tik bandymo naršyklės atmintyje; į logą / failą JSON nekeliauja.
    await browser.evaluate(`(() => {const original=window.fetch.bind(window); window.phase4Capture=null;
      window.fetch=async(input,init)=>{const r=await original(input,init);
        if(new URL(typeof input==='string'?input:input.url,location.href).pathname==='/api/ai')
          window.phase4Capture={status:r.status,key:init.headers['Idempotency-Key'],payload:await r.clone().json()}; return r;};})()`);
    checkpoint = `generation ${index + 1}: response`;
    await browser.evaluate("document.querySelector('section[aria-labelledby=\"investigation-heading\"] button[type=submit]').click(); document.querySelector('section[aria-labelledby=\"investigation-heading\"] button[type=submit]').click()");
    await browser.waitFor("window.phase4Capture !== null");
    const capture = await browser.evaluate("window.phase4Capture");
    generationStatus = capture.status;
    const code = capture.payload?.error?.code;
    generationCode = ["unauthorized", "invalid", "forbidden", "not_configured", "rate_limited", "busy", "timeout", "credentials", "unavailable", "invalid_response", "museum", "missing"].includes(code) ? code : "none";
    if (checkDiagnostics) {
      await browser.waitFor("document.querySelector('#developer-mode-panel').innerText.includes('/interactions')");
      const text = await browser.evaluate("document.querySelector('#developer-mode-panel').innerText");
      assert.ok(text.includes("Gemini") && text.includes("Supabase") && text.includes("POST"));
      assert.ok(!text.includes("TEST_PRIVATE_PROMPT") && !text.includes("TEST_SECRET_PROVIDER_BODY") && created.every((id) => !text.includes(id)));
      assert.equal(await browser.evaluate("window.testInjected === true"), false);
      pass("Diagnostika rodo tikrus šio scenarijaus Supabase / modelio transporto metaduomenis be prašymo ar paskyros ID");
    }
    if (fixtureError) {
      assert.equal(capture.status, [401, 403].includes(fixtureError) ? 502 : fixtureError);
      assert.equal(generationCode, [401, 403].includes(fixtureError) ? "credentials" : fixtureError === 429 ? "rate_limited" : "unavailable");
      await browser.waitFor("document.querySelector('section[aria-labelledby=\"investigation-heading\"] [role=alert]') && !document.querySelector('section[aria-labelledby=\"investigation-heading\"] fieldset').disabled");
      assert.equal(await browser.evaluate("!!document.querySelector('#research-result-heading')"), false);
      assert.equal((await api(browser, "/api/investigations")).body.data.length, 0);
      pass(`Imituota modelio HTTP ${fixtureError}: lietuviška klaida, nėra demo fallback ar išsaugoto rezultato`);
      continue;
    }
    assert.equal(capture.status, 200, "Generation did not return 200");
    const value = validateInvestigationResponse(capture.payload.data, capture.payload.data.request);
    assert.equal(value.mode, "live"); assert.equal(value.result.questions.length, count);
    assert.equal(value.request.knowledgeLevel, index ? "expert" : "child");
    assert.equal(value.request.investigationMode, index ? "symbolism_analysis" : "detective_mystery");
    assert.ok(value.generationId); generations.push(value.generationId);
    await browser.waitFor("document.activeElement?.id === 'research-result-heading'");
    assert.equal((await api(browser, "/api/investigations")).body.data.length, 0);
    pass(`${fixtureOnly ? "Imituotas" : "Tikras"} ${count} klausimų tyrimas, pasirinkimai, fokusas ir juodraščio atskyrimas`);
    // Pakartojama ta pati API užklausa su tuo pačiu raktu: naujo modelio kvietimo neturi būti.
    const repeated = await api(browser, "/api/ai", "POST", value.request, { "Idempotency-Key": capture.key });
    assert.equal(repeated.status, 200); assert.equal(repeated.body.data.generationId, value.generationId);
    pass(`${count} klausimų pakartojimas grąžina tą patį generavimą`);
    await screenshot(browser, `${fixtureOnly ? "fixture" : "live"}-result-${count}-intro`, "#research-result-heading");
    await browser.evaluate("document.querySelectorAll('section[aria-labelledby=\"research-result-heading\"] details').forEach(e=>e.open=true)");
    await screenshot(browser, `${fixtureOnly ? "fixture" : "live"}-result-${count}-questions`, "section[aria-labelledby=\"research-result-heading\"] ol");
    await browser.click("Išsaugoti DI tyrimą");
    await browser.waitFor("document.body.innerText.includes('Tyrimas išsaugotas paskyroje')");
    const saved = await api(browser, "/api/investigations");
    assert.equal(saved.status, 200); assert.equal(saved.body.data.length, 1); assert.equal(saved.body.data[0].id, value.generationId);
    assert.match(saved.cache, /private, no-store/);
    const duplicate = await api(browser, "/api/investigations", "POST", { generationId: value.generationId });
    assert.equal(duplicate.status, 200); assert.equal(duplicate.body.data.savedAt, saved.body.data[0].savedAt);
    pass(`${count} klausimų išsaugojimas ir pakartotinio save nedubliavimas`);
    const otherItems = (await api(other, "/api/investigations")).body.data;
    assert.ok(!otherItems.some((item) => item.id === value.generationId));
    for (const method of ["POST", "DELETE"]) assert.equal((await api(other, "/api/investigations", method, { generationId: value.generationId })).status, 404);
    pass(`${count} klausimų svetimas skaitymas, išsaugojimas ir šalinimas uždrausti`);
    await browser.navigate("/investigations"); await browser.waitFor("document.querySelectorAll('article').length === 1");
    await browser.evaluate("document.querySelector('article > details').open=true");
    assert.equal(await browser.evaluate("document.querySelectorAll('article ol li').length"), count);
    assert.ok(await browser.evaluate("document.body.innerText.includes('Muziejaus pateikti duomenys') && document.body.innerText.includes('Tyrimo ribos ir interpretacijos')"));
    for (const width of [375, 1440]) {
      await browser.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      assert.equal(await browser.evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    }
    pass(`${count} klausimų tyrimas išlieka po perkrovimo ir telpa 375 / 1440 px`);
  }
  checkpoint = "delete and sessions";
  if (!fixtureError) {
  if (counts.includes(3)) {
    await a.click("Pašalinti tyrimą"); await a.click("Atšaukti"); assert.equal((await api(a, "/api/investigations")).body.data.length, 1);
    await a.click("Pašalinti tyrimą"); await a.click("Taip, pašalinti");
    await a.waitFor("!document.querySelector('article')");
    pass("A tyrimo šalinimo atšaukimas / patvirtinimas neliečia B tyrimo");
  }
  assert.equal((await api(a, "/api/investigations")).body.data.length, 0);
  assert.equal((await api(b, "/api/investigations")).body.data.length, 1);
  await b.navigate("/investigations"); await b.waitFor("document.querySelector('article')");
  await b.click("Pašalinti tyrimą"); await b.click("Atšaukti"); assert.equal((await api(b, "/api/investigations")).body.data.length, 1);
  await b.click("Pašalinti tyrimą"); await b.click("Taip, pašalinti"); await b.waitFor("!document.querySelector('article')");
  assert.equal((await api(b, "/api/investigations")).body.data.length, 0);
  pass("B pašalina tik savo tyrimą");
  }
  await a.navigate("/profile"); await a.click("Atsijungti šiame įrenginyje"); await a.waitFor("location.pathname === '/login'");
  if (checkDiagnostics) assert.equal(await a.evaluate("document.querySelector('input[aria-controls=\"developer-mode-panel\"]').checked"), false);
  assert.equal((await api(a, "/api/investigations")).status, 401);
  assert.equal((await api(a, "/api/ai", "POST", { artworkId: 16568 })).status, 401);
  pass("Atsijungus paskyros tyrimų API nepasiekiama");
  assert.equal(modelCalls, fixtureOnly ? 0 : counts.length, "Unexpected model call count");
  if (fixtureOnly) assert.equal(fixtureCalls, counts.length);
  console.log(`AI ${fixtureOnly ? "FIXTURE" : "LIVE"} end-to-end: ${passed} PASS, 0 FAIL; tikri modelio kvietimai: ${modelCalls}. Turinys ir paslaptys nespausdinami.`);
} catch {
  if (checkpoint === "origin collection regression" && browsers[0]) {
    const state = await browsers[0].evaluate("window.phase4CollectionStatus ?? null").catch(() => null);
    if (state) console.error(`Collection regression HTTP ${Number(state.status)}; code ${["forbidden", "unauthorized", "museum", "unavailable", "invalid"].includes(state.code) ? state.code : "none"}`);
    await screenshot(browsers[0], "collection-failure", "h1").catch(() => undefined);
  }
  if (checkpoint === "isolated server" && modelCalls === 0) {
    // Iki serverio paleidimo dar nėra prisijungimų ar privataus DI turinio.
    // Konfigūracijos reikšmės vis tiek pašalinamos prieš startup diagnostiką.
    for (const [name, value] of Object.entries(process.env)) if (/KEY|SECRET|TOKEN|PASSWORD/i.test(name) && value?.length > 8) startupDiagnostic = startupDiagnostic.replaceAll(value, "[REDACTED]");
    console.error(startupDiagnostic.slice(-1600));
  }
  console.error(`AI ${fixtureOnly ? "FIXTURE" : "LIVE"} end-to-end FAIL po ${passed} PASS; žingsnis: ${checkpoint}; modelio kvietimai: ${modelCalls}; tiekėjo HTTP ${providerStatus ?? "negautas"}; generavimo HTTP ${generationStatus ?? "negautas"}, kodas ${generationCode}. Automatinio kartojimo nėra, privatūs duomenys nerodomi.`);
  process.exitCode = 1;
} finally {
  for (const browser of browsers) browser.close();
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) { console.error("Bandymo paskyros valymas nepavyko; reikia atskiros patikros. Kitų paskyrų neliečiame."); process.exitCode = 1; }
  }
  console.log(`Tik šio bandymo paskyrų valymas: ${created.length}; kvotų skaitikliai neatstatomi.`);
  if (server?.connected) {
    server.send({ type: "shutdown" });
    await new Promise((resolve) => { const timer = setTimeout(() => { server.kill(); resolve(); }, 5000); server.once("exit", () => { clearTimeout(timer); resolve(); }); });
  } else server?.kill();
}
