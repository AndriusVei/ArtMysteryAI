// Vietinė patikra atskirame laikiname Edge profilyje. Naudotojo kolekcija neliečiama.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const base = process.argv[2] ?? process.env.ARTMYSTERY_TEST_URL ?? "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Patikra leidžiama tik vietiniam serveriui.");
const edge = process.env.ARTMYSTERY_BROWSER_PATH ?? [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
assert.ok(edge, "Nerastas Edge. Nurodyk ARTMYSTERY_BROWSER_PATH; naršyklė automatiškai neįdiegiama.");
const profile = mkdtempSync(join(tmpdir(), "artmystery-b-accessibility-"));
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
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`CDP timeout: ${method}`)); }, 45000);
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
  const key = async (key, code, windowsVirtualKeyCode) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, ...(key === "Enter" ? { text: "\r" } : {}) });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
  };
  const keyboardActivate = async (text) => {
    await evaluate(`([...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)})).focus()`);
    await key("Enter", "Enter", 13);
  };
  const checkStructure = async () => {
    assert.equal(await evaluate("document.querySelectorAll('main').length"), 1, "Vienas pagrindinio turinio orientyras");
    assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1, "Viena puslapio antraštė");
    assert.equal(await evaluate("document.documentElement.lang"), "lt");
    assert.ok(await evaluate("[...document.querySelectorAll('input, select, textarea')].every(e => e.labels?.length > 0 || e.getAttribute('aria-label'))"), "Formos valdikliai turi pavadinimus");
    const duplicates = await evaluate("(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.filter((id, i) => ids.indexOf(id) !== i); })()");
    assert.deepEqual(duplicates, [], "Nėra pasikartojančių ID");
  };
  const checkWidths = async (page) => {
    for (const width of [320, 375, 768, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))");
      const overflow = await evaluate("[...document.querySelectorAll('#main-content *')].filter(e => e.getClientRects().length && (e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1)).map(e => ({tag:e.tagName,id:e.id,class:e.className})).slice(0,5)");
      assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), `${page} ${width}px: ${JSON.stringify(overflow)}`);
      assert.deepEqual(overflow, [], `${page} valdikliai telpa ${width}px`);
      pass(`${page} layout at ${width}px`);
      if (width === 375 || width === 1440) {
        const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
        writeFileSync(join(profile, `${page}-${width}.png`), Buffer.from(shot.data, "base64"));
      }
    }
  };
  await navigate(`${base}/artwork/16568`);
  await waitFor("document.querySelector('#research-level')?.value === 'beginner'");
  await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent === 'Išsaugoti į demo kolekciją' && !b.disabled)");
  await waitFor("document.querySelector('figure img')?.naturalWidth > 0");
  pass("real museum image loads through the server proxy");
  await checkStructure();
  pass("artwork landmarks, language, form labels and unique IDs");
  // Tikra klaviatūros įvestis: pirmas Tab ir Enter turi pasiekti pagrindinį turinį.
  await evaluate("document.body.tabIndex = -1; document.body.focus()");
  await key("Tab", "Tab", 9);
  assert.equal(await evaluate("document.activeElement.getAttribute('href')"), "#main-content");
  assert.ok(await evaluate("document.activeElement.getBoundingClientRect().top >= 0"));
  assert.ok(await evaluate("parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2"));
  await key("Enter", "Enter", 13);
  await waitFor("document.activeElement.id === 'main-content'");
  pass("visible keyboard focus and skip link reach main content");
  await keyboardActivate("Originalo kalba");
  await waitFor("document.querySelector('h1').lang === 'en'");
  await keyboardActivate("Lietuviškai");
  await waitFor("document.querySelector('h1').lang === 'lt'");
  pass("language selection works with keyboard");
  await click("Išsaugoti į demo kolekciją");
  await waitFor("document.body.textContent.includes('Jau demonstracinėje kolekcijoje')");
  await setField("#research-prompt", "IlgasTekstas".repeat(80));
  await click("✨ Pradėti meno detektyvo tyrimą");
  await waitFor("document.querySelector('#research-result-heading') !== null");
  await checkWidths("artwork");
  await click("Išsaugoti pavyzdį");
  await waitFor("document.body.textContent.includes('Pavyzdys išsaugotas šioje naršyklėje')");

  await navigate(`${base}/collection`);
  await waitFor("document.querySelectorAll('article').length === 1");
  await checkStructure();
  pass("collection landmarks, labels and unique IDs");
  await keyboardActivate("Redaguoti");
  await waitFor("document.activeElement.id === 'collection-16568-category'");
  pass("keyboard editing moves focus to category field");
  await setField("#collection-16568-notes", "PastabaBeTarpų".repeat(140));
  await checkWidths("collection-edit");
  await keyboardActivate("Atšaukti redagavimą");
  await waitFor("document.activeElement.textContent === 'Redaguoti'");
  pass("cancel editing restores focus to edit button");
  await keyboardActivate("Redaguoti");
  await waitFor("document.activeElement.id === 'collection-16568-category'");
  await setField("#collection-16568-notes", "PastabaBeTarpų".repeat(140));
  await keyboardActivate("Išsaugoti pakeitimus");
  await waitFor("document.activeElement.textContent === 'Redaguoti'");
  pass("successful save restores focus");
  await checkWidths("collection");
  await keyboardActivate("Pašalinti");
  await waitFor("document.activeElement.textContent === 'Atšaukti pašalinimą'");
  await key("Enter", "Enter", 13);
  await waitFor("document.activeElement.textContent === 'Pašalinti'");
  pass("collection confirmation starts on cancel and restores focus");
  await keyboardActivate("Redaguoti");
  await waitFor("document.activeElement.id === 'collection-16568-category'");
  await setField("#collection-16568-notes", "Pakeista pastaba");
  await evaluate("window.__originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException('Full', 'QuotaExceededError'); }");
  await keyboardActivate("Išsaugoti pakeitimus");
  await waitFor("document.querySelector('article [role=alert]') !== null");
  assert.ok(await evaluate("document.querySelector('#collection-16568-notes') !== null"));
  await evaluate("Storage.prototype.setItem = window.__originalSet");
  pass("collection write error announced as alert and edit remains open");

  await navigate(`${base}/investigations`);
  await waitFor("document.querySelectorAll('article').length === 1");
  await checkStructure();
  const tree = await send("Accessibility.getFullAXTree");
  assert.equal(tree.nodes.filter(n => !n.ignored && n.role?.value === "main").length, 1);
  assert.ok(tree.nodes.some(n => !n.ignored && n.role?.value === "searchbox" && n.name?.value === "Ieškoti pagal pavadinimą"));
  pass("saved research has one accessibility main landmark and named searchbox");
  await evaluate("document.querySelector('article > details > summary').focus()");
  await key("Enter", "Enter", 13);
  assert.equal(await evaluate("document.querySelector('article > details').open"), true);
  await evaluate("document.querySelector('ol summary').focus()");
  await key("Enter", "Enter", 13);
  assert.equal(await evaluate("document.querySelector('ol details').open"), true);
  pass("saved research and answers expand with keyboard");
  await checkWidths("investigations");
  await keyboardActivate("Pašalinti tyrimą");
  await waitFor("document.activeElement.textContent === 'Atšaukti'");
  await key("Enter", "Enter", 13);
  await waitFor("document.activeElement.textContent === 'Pašalinti tyrimą'");
  pass("research confirmation starts on cancel and restores focus");
  assert.equal(aiRequests, 0);
  pass("no Gemini or AI endpoint requests");
  console.log(`Screenshots: ${profile}`);
  console.log(`Browser checks: ${passed} PASS, 0 FAIL`);
} catch (error) {
  console.error(error.message); console.error(`Browser checks completed: ${passed} PASS, 1 FAIL`); process.exitCode = 1;
} finally {
  if (send) await send("Browser.close").catch(() => {});
  ws?.close(); browser.kill();
}
