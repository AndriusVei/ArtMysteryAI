// Vietinė patikra atskirame laikiname Edge profilyje. Naudotojo kolekcija neliečiama.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const base = process.env.ARTMYSTERY_TEST_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Patikra leidžiama tik vietiniam serveriui.");
const edge = process.env.ARTMYSTERY_BROWSER_PATH ?? [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
assert.ok(edge, "Nerastas Edge. Nurodyk ARTMYSTERY_BROWSER_PATH; naršyklė automatiškai neįdiegiama.");
const profile = mkdtempSync(join(tmpdir(), "artmystery-saved-investigations-"));
const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--disable-background-networking",
  "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws, send, passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };

try {
  let port;
  for (let i = 0; i < 150; i++) {
    try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); break; }
    catch { await sleep(100); }
  }
  assert.ok(port, "Nepavyko paleisti naršyklės.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  let id = 0, loads = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Page.loadEventFired") loads++;
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
  });
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(next, { resolve, reject, timer }); ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Naršyklės vertinimo klaida.");
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error(`Nesulaukta naršyklės būsenos: ${expression.slice(0, 120)}`);
  };
  const navigate = async (url) => {
    const previous = loads;
    await send(url ? "Page.navigate" : "Page.reload", url ? { url } : {});
    for (let i = 0; i < 300; i++) { if (loads > previous) return; await sleep(100); }
    throw new Error("Nesulaukta puslapio įkėlimo pabaigos.");
  };
  const click = async (text) => {
    await waitFor(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b || b.disabled) return false; b.click(); return true; })()`);
  };
  const setField = async (selector, value, type = "input") => {
    await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const p = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event(${JSON.stringify(type)}, { bubbles: true })); })()`);
  };
  let aiRequests = 0;
  // Šis stebėjimas taikomas tik atskiram testų profiliui, užklausų turinys nespausdinamas.
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Network.requestWillBeSent") {
      const url = new URL(message.params.request.url);
      if (url.pathname === "/api/ai" || url.hostname.includes("generativelanguage.googleapis.com")) aiRequests++;
    }
  });
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await navigate(`${base}/investigations`);
  await waitFor("document.body.textContent.includes('Išsaugotų tyrimų dar nėra')");
  pass("empty state and isolated demo storage");
  await navigate(`${base}/artwork/16568`);
  await waitFor("document.querySelector('#research-level')?.value === 'beginner'");
  const prompt = "Mano pastaba <script>window.__savedXss=true</script>";
  await setField("#research-prompt", prompt);
  await click("✨ Pradėti meno detektyvo tyrimą");
  await waitFor("document.querySelector('#research-result-heading') !== null");
  await click("Išsaugoti pavyzdį");
  await waitFor("document.body.textContent.includes('Pavyzdys išsaugotas šioje naršyklėje')");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('artmystery:demo:investigations:v1')).items.length"), 1);
  pass("save preview and report success after persistence");
  await navigate(`${base}/investigations`);
  await waitFor("document.querySelectorAll('article').length === 1");
  await evaluate("document.querySelector('article > details > summary').click()");
  assert.equal(await evaluate("document.querySelectorAll('ol[aria-label=\"Tyrimo klausimai\"] > li').length"), 3);
  assert.ok(await evaluate(`document.querySelector('article').textContent.includes(${JSON.stringify(prompt)})`));
  assert.equal(await evaluate("window.__savedXss === undefined && document.querySelector('article').querySelectorAll('script').length === 0"), true);
  assert.equal(await evaluate("document.querySelector('article > a').getAttribute('href')"), "/artwork/16568");
  pass("full saved result, parameters, artwork link and escaped prompt");
  await navigate();
  await waitFor("document.querySelectorAll('article').length === 1");
  pass("saved result survives page reload");
  await setField('input[type="search"]', "nerasti123");
  await waitFor("document.querySelectorAll('article').length === 0");
  await setField('input[type="search"]', "");
  await waitFor("document.querySelectorAll('article').length === 1");
  await setField('select', "symbolism_analysis", "change");
  await waitFor("document.querySelectorAll('article').length === 0");
  await setField('select', "", "change");
  await waitFor("document.querySelectorAll('article').length === 1");
  pass("title search and mode filter");
  await click("Pašalinti tyrimą");
  await click("Atšaukti");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 1);
  pass("cancel deletion preserves result");
  for (const width of [375, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await evaluate("document.querySelector('article > details').open = true");
    await evaluate("new Promise(resolve => requestAnimationFrame(() => resolve(true)))");
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"));
    pass(`saved result has no horizontal overflow at ${width}px`);
  }
  await click("Pašalinti tyrimą");
  await click("Taip, pašalinti");
  await waitFor("document.body.textContent.includes('Išsaugotų tyrimų dar nėra')");
  await waitFor("document.activeElement.tagName === 'H1'");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('artmystery:demo:investigations:v1')).items.length"), 0);
  pass("confirmed deletion removes only stored result and restores focus");
  await evaluate("localStorage.setItem('artmystery:demo:investigations:v1', '{broken')");
  await navigate();
  await waitFor("document.querySelector('[role=alert]')?.textContent.includes('neperrašyti')");
  assert.equal(await evaluate("localStorage.getItem('artmystery:demo:investigations:v1')"), "{broken");
  pass("corrupt storage is reported and left intact");
  await evaluate("localStorage.removeItem('artmystery:demo:investigations:v1')");
  await navigate(`${base}/artwork/16568`);
  await waitFor("document.querySelector('#research-level')?.value === 'beginner'");
  await click("✨ Pradėti meno detektyvo tyrimą");
  await waitFor("document.querySelector('#research-result-heading') !== null");
  await evaluate("Storage.prototype.setItem = function() { throw new DOMException('Full', 'QuotaExceededError'); }");
  await click("Išsaugoti pavyzdį");
  await waitFor("document.querySelector('[role=alert]')?.textContent.includes('Pakeitimai neišsaugoti')");
  assert.equal(await evaluate("localStorage.getItem('artmystery:demo:investigations:v1')"), null);
  assert.equal(await evaluate("document.body.textContent.includes('Pavyzdys išsaugotas šioje naršyklėje')"), false);
  pass("quota error does not claim successful save");
  assert.equal(aiRequests, 0);
  pass("no Gemini or AI backend request");
  console.log(`Browser checks: ${passed} PASS, 0 FAIL`);
} catch (error) {
  console.error(error.message); console.error(`Browser checks completed: ${passed} PASS, 1 FAIL`); process.exitCode = 1;
} finally {
  if (send) await send("Browser.close").catch(() => {});
  ws?.close(); browser.kill();
}
