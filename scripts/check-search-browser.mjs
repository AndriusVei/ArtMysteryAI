// Tik vietinis serveris, tikra nemokama muziejaus API ir atskiras laikinas Edge profilis.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3188");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname) && base.protocol === "http:");
assert.ok(!base.username && !base.password && !base.search && !base.hash && base.pathname === "/");
let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
const json = async (path, status = 200) => {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, path);
  return response.json();
};
for (const [query, artist] of [["q=monet", ""], ["artist=Vincent+van+Gogh", "Vincent van Gogh"], ["q=bedroom&artist=Vincent+van+Gogh", "Vincent van Gogh"]]) {
  const { data } = await json(`/api/artworks?${query}`);
  assert.ok(data.total > 0 && data.items.length > 0);
  if (artist) assert.ok(data.items.every((item) => item.artist === artist));
  console.log(JSON.stringify({ query, total: data.total, ids: data.items.map((item) => item.id) }));
  pass(`Tikra paieška: ${query}`);
}
const combined = (await json("/api/artworks?q=bedroom&artist=Vincent+van+Gogh")).data;
assert.equal(combined.items[0].id, 28560);
const detail = (await json(`/api/artworks/${combined.items[0].id}`)).data;
assert.equal(detail.id, 28560); assert.equal(detail.title, "The Bedroom");
pass("Paieškos ID 28560 perduotas B detalių API");
const image = await fetch(new URL(`/api/artworks/${detail.id}/image`, base), { signal: AbortSignal.timeout(40000) });
assert.equal(image.status, 200); assert.ok(image.headers.get("content-type").includes("image/jpeg"));
const bytes = new Uint8Array(await image.arrayBuffer()); assert.ok(bytes.length > 1000 && bytes[0] === 255 && bytes[1] === 216);
pass(`Tikras muziejaus JPEG: ${bytes.length} baitų`);
assert.equal((await json("/api/artworks?q=zzzzartmysterynomatch918273")).data.total, 0);
pass("Tuščia tikra paieška");
for (const query of ["", "q=", "q=monet&page=0", "q=monet&q=vangogh", `q=${"a".repeat(121)}`]) {
  assert.equal((await json(`/api/artworks?${query}`, 400)).error.code, "invalid_query");
}
pass("Tuščios, pasikartojančios, per ilgos įvestys ir netinkamas puslapis: HTTP 400");

const edge = process.env.ARTMYSTERY_BROWSER_PATH ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert.ok(edge, "Nerastas Edge; nurodyk ARTMYSTERY_BROWSER_PATH.");
const profile = mkdtempSync(join(tmpdir(), "artmystery-a-search-"));
const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pending = new Map(); let ws;
try {
  let port;
  for (let i = 0; i < 150; i++) { try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); break; } catch { await sleep(100); } }
  assert.ok(port, "Nepavyko paleisti Edge.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Edge ryšio laikas baigėsi.")), 15000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Edge ryšio klaida.")); }, { once: true });
  });
  let id = 0, combinedRequests = 0;
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Network.requestWillBeSent") {
      const url = new URL(message.params.request.url);
      if (url.pathname === "/explore" && url.searchParams.get("q") === "bedroom" && url.searchParams.get("artist") === "Vincent van Gogh") combinedRequests++;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id, timer = setTimeout(() => { pending.delete(next); reject(new Error(`Edge neatsakė: ${method}`)); }, 30000);
    pending.set(next, { resolve, reject, timer }); ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); assert.ok(!result.exceptionDetails, "Naršyklės klaida."); return result.result.value; };
  const waitFor = async (expression) => { for (let i = 0; i < 300; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error(`Nesulaukta: ${expression}`); };
  const navigate = async (path) => { await send("Page.navigate", { url: new URL(path, base).href }); await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(new URL(path, base).pathname)} && document.querySelector('form')`); };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  // Tinkle blokuojami kortelių vaizdai, kad kartojami maketo bandymai neeikvotų muziejaus kvotos.
  // Vienas tikras JPEG patikrintas aukščiau ir atskirai naršyklėje žemiau.
  await send("Network.setBlockedURLs", { urls: ["*/api/artworks/*/image"] });
  await navigate("/explore");
  await waitFor("document.querySelector('form').getAttribute('aria-busy') === 'false'");
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("document.querySelector('[role=alert]') && document.querySelector('form').getAttribute('aria-busy') === 'false'");
  pass("Naršyklė: tuščia forma pateikia suprantamą klaidą");
  await evaluate("document.querySelector('#search-query').value='bedroom'; document.querySelector('#search-artist').value='Vincent van Gogh'; document.querySelector('form').requestSubmit(); document.querySelector('form').requestSubmit()");
  await waitFor("document.querySelector('a[href=\"/artwork/28560\"]') && document.querySelector('form').getAttribute('aria-busy') === 'false'");
  assert.equal(await evaluate("document.querySelectorAll('ul[aria-label=\"Paieškos rezultatai\"] > li').length"), 1);
  assert.ok(await evaluate("location.search.includes('artist=Vincent+van+Gogh')"));
  assert.equal(combinedRequests, 1, "Du greiti submit turi sukelti tik vieną naršyklės paieškos užklausą.");
  pass("Naršyklė: forma, abu filtrai, pakartotinis submit, rezultato nuoroda ir URL");
  await evaluate("document.querySelector('form').requestSubmit()");
  await waitFor("document.querySelector('form').getAttribute('aria-busy') === 'false' && document.querySelector('a[href=\"/artwork/28560\"]')");
  await waitFor("document.querySelector('button[type=submit]').disabled === false");
  pass("Naršyklė: tą pačią paiešką galima pakartoti");
  await waitFor("document.querySelector('ul button')");
  pass("Naršyklė: paveikslo klaida nesustabdo rezultatų, yra pakartojimo mygtukas");
  for (const width of [375, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    assert.equal(await evaluate("document.querySelectorAll('main').length"), 1);
    assert.ok(await evaluate("[...document.querySelectorAll('input:not([type=hidden])')].every(e=>e.labels.length>0)"));
    pass(`Rezultatai ${width}px: plotis, pagrindinis turinys ir etiketės`);
  }
  await send("Network.setBlockedURLs", { urls: [] });
  await evaluate("document.querySelector('ul button').click()");
  await waitFor("document.querySelector('ul img')?.complete && document.querySelector('ul img')?.naturalWidth > 0");
  pass("Naršyklė: po pakartojimo įsikrovė tikras muziejaus vaizdas");
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  const screenshotPath = join(profile, "search-desktop.png");
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  console.log(`Ekrano kopija: ${screenshotPath}`);
  await evaluate("document.querySelector('a[href=\"/artwork/28560\"]').click()");
  await waitFor("location.pathname === '/artwork/28560' && document.body.innerText.includes('Vincent van Gogh') && document.querySelector('#investigation-heading')");
  pass("Naršyklė: paieškos kortelė atveria esamas B detales ir tyrimo formą");
  await navigate("/explore?q=monet");
  await waitFor("document.querySelector('nav[aria-label=\"Paieškos puslapiai\"] a')");
  await evaluate("[...document.querySelectorAll('nav[aria-label=\"Paieškos puslapiai\"] a')].find(a=>a.textContent.includes('Kitas')).click()");
  await waitFor("location.search.includes('page=2') && document.body.innerText.includes('Puslapis 2.')");
  pass("Naršyklė: puslapiavimas išlaiko paieškos kriterijų");
  await navigate("/explore?q=zzzzartmysterynomatch918273");
  await waitFor("document.body.innerText.includes('Kūrinių pagal šiuos kriterijus nerasta')");
  pass("Naršyklė: nėra rezultatų, pateiktas kitas veiksmas");
  console.log(`Iš viso: ${passed} PASS, 0 FAIL. Profilis: ${profile}`);
} finally {
  for (const request of pending.values()) clearTimeout(request.timer);
  ws?.close(); browser.kill();
}
