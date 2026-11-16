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
const profile = mkdtempSync(join(tmpdir(), "artmystery-collection-"));
const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--disable-background-networking",
  "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const key = "artmystery:demo:collection:v1";
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
  const items = `JSON.parse(localStorage.getItem(${JSON.stringify(key)}) ?? '{"items":[]}').items`;
  const mainText = "document.querySelector('main')?.textContent";
  await send("Page.enable"); await send("Runtime.enable");
  await navigate(`${base}/collection`);
  await waitFor(`${mainText}?.includes('Kuri istorija taps tavo pirmąja?')`);
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), null);
  pass("empty demo collection, isolated profile");

  await navigate(`${base}/artwork/16568`);
  await click("Išsaugoti į demo kolekciją");
  await waitFor(`${items}.length === 1`);
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.disabled && b.textContent.includes('Jau demonstracinėje'))`);
  assert.equal(await evaluate(`${items}.length`), 1);
  pass("save artwork and prevent duplicate clicks");

  await navigate(`${base}/collection`);
  await waitFor("document.querySelectorAll('article').length === 1");
  await click("Redaguoti");
  const note = "Testo pastaba apie atspindžius. <script>window.__collectionXss=true</script>";
  await setField("select", "to_explore", "change"); await setField("textarea", note);
  await click("Išsaugoti pakeitimus");
  await waitFor(`${items}[0]?.category === 'to_explore' && ${items}[0]?.notes === ${JSON.stringify(note)}`);
  assert.equal(await evaluate("window.__collectionXss === undefined"), true);
  await waitFor(`document.querySelector('article')?.textContent.includes(${JSON.stringify(note)}) && !document.querySelector('textarea')`);
  pass("edit category and notes, render HTML as text");

  await navigate();
  await waitFor(`document.querySelector('article')?.textContent.includes(${JSON.stringify(note)})`);
  pass("persist notes and category after reload");
  await click("Mėgstamiausi (0)"); await waitFor("document.querySelectorAll('article').length === 0");
  await click("Noriu tyrinėti (1)"); await waitFor("document.querySelectorAll('article').length === 1");
  pass("category filters and empty filtered state");
  await setField("#collection-search", "nerastas-kurinys"); await waitFor("document.querySelectorAll('article').length === 0");
  await setField("#collection-search", ""); await waitFor("document.querySelectorAll('article').length === 1");
  pass("search inside collection");

  for (const width of [375, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await evaluate("new Promise(resolve => requestAnimationFrame(() => resolve(true)))");
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"));
    pass(`no horizontal overflow at ${width}px`);
  }
  await click("Pašalinti"); await click("Atšaukti pašalinimą");
  assert.equal(await evaluate(`${items}.length`), 1);
  pass("cancel deletion preserves artwork and notes");
  await click("Pašalinti"); await click("Taip, pašalinti");
  await waitFor(`${items}.length === 0 && ${mainText}?.includes('Kuri istorija taps tavo pirmąja?')`);
  assert.equal(await evaluate("document.activeElement.tagName"), "H1");
  await navigate(); await waitFor(`${mainText}?.includes('Kuri istorija taps tavo pirmąja?')`);
  pass("confirmed deletion, focus restoration and persistence");

  await evaluate(`localStorage.setItem(${JSON.stringify(key)}, '{')`); await navigate();
  await waitFor("document.querySelector('[role=alert]')?.textContent.includes('neperrašyti')");
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`), "{");
  pass("corrupt storage reported and preserved");
  await evaluate(`window.__testGet = Storage.prototype.getItem; Storage.prototype.getItem = function(k) { if(k === ${JSON.stringify(key)}) throw new DOMException('blocked','SecurityError'); return window.__testGet.call(this,k); }; window.dispatchEvent(new Event('artmystery:demo-collection-changed'));`);
  await waitFor("document.querySelector('[role=alert]')?.textContent.includes('nepasiekiama')");
  pass("blocked storage produces controlled UI error");

  await evaluate(`Storage.prototype.getItem = window.__testGet; localStorage.setItem(${JSON.stringify(key)}, JSON.stringify({version:1,items:[]}));`);
  await navigate(`${base}/artwork/16568`);
  await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Išsaugoti į demo kolekciją' && !b.disabled)");
  await evaluate(`const originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k === ${JSON.stringify(key)}) throw new DOMException('quota','QuotaExceededError'); return originalSet.call(this,k,v); };`);
  await click("Išsaugoti į demo kolekciją"); await waitFor(`${mainText}?.includes('trūksta vietos')`);
  assert.equal(await evaluate(`${items}.length`), 0);
  pass("quota failure does not claim save success");
  console.log(`Browser checks: ${passed} PASS, 0 FAIL`);
} catch (error) {
  console.error(error.message); console.error(`Browser checks completed: ${passed} PASS, 1 FAIL`); process.exitCode = 1;
} finally {
  if (send) await send("Browser.close").catch(() => {});
  ws?.close(); browser.kill();
}
