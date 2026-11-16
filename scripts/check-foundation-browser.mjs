// Tik vietinis serveris ir atskiras laikinas Edge profilis; paskyros duomenys neliečiami.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3187");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "Leidžiamas tik vietinis serveris.");
assert.equal(base.protocol, "http:");
assert.ok(!base.username && !base.password && !base.search && !base.hash && base.pathname === "/");
const pages = ["/", "/explore", "/collection", "/investigations", "/login", "/neegzistuojantis-puslapis"];
let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };

for (const path of pages) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  assert.equal(response.status, path === pages.at(-1) ? 404 : 200);
  assert.ok(html.includes('<html lang="lt"') && html.includes("<h1"));
  if (response.status === 404) assert.ok(html.includes("Šios istorijos čia nėra."));
  pass(`HTTP ${path}: ${response.status}`);
}
const invalid = await fetch(new URL("/api/artworks/abc", base), { signal: AbortSignal.timeout(15000) });
assert.equal(invalid.status, 400);
assert.equal((await invalid.json()).error.code, "invalid_id");
pass("Netinkamas kūrinio ID: 400 invalid_id");

const edge = process.env.ARTMYSTERY_BROWSER_PATH ?? [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
assert.ok(edge, "Edge nerastas; nurodyk ARTMYSTERY_BROWSER_PATH. Nauji paketai nediegiami.");
const profile = mkdtempSync(join(tmpdir(), "artmystery-a-foundation-"));
const browser = spawn(edge, [
  "--headless=new", "--disable-gpu", "--disable-background-networking",
  "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
], { windowsHide: true, stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pending = new Map();
let ws;
try {
  let port;
  for (let i = 0; i < 150; i++) {
    try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); break; }
    catch { await sleep(100); }
  }
  assert.ok(port, "Nepavyko paleisti Edge diagnostikos.");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Edge ryšio laikas baigėsi.")), 15000);
    ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Edge ryšio klaida.")); }, { once: true });
  });
  let id = 0;
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`Edge neatsakė: ${method}`)); }, 15000);
    pending.set(next, { resolve, reject, timer });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, "Naršyklės vertinimo klaida.");
    return result.result.value;
  };
  const navigate = async (path) => {
    await send("Page.navigate", { url: new URL(path, base).href });
    for (let i = 0; i < 150; i++) {
      if (await evaluate(`document.readyState === 'complete' && document.querySelectorAll('main').length === 1 && location.pathname === ${JSON.stringify(path)}`)) return;
      await sleep(100);
    }
    throw new Error(`Puslapis neįsikrovė: ${path}`);
  };
  await send("Page.enable"); await send("Runtime.enable");
  for (const width of [375, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const path of pages) {
      await navigate(path);
      const state = await evaluate(`({ lang: document.documentElement.lang, h1: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        links: [...document.querySelectorAll('nav a')].map(a => a.getAttribute('href')) })`);
      assert.equal(state.lang, "lt"); assert.equal(state.h1, 1); assert.equal(state.overflow, false);
      assert.deepEqual(state.links, ["/explore", "/collection", "/investigations", "/login"]);
      pass(`Edge ${path}, ${width}px: struktūra, navigacija ir plotis`);
    }
  }
  await navigate("/");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement?.getAttribute('href')"), "#main-content");
  pass("Pirmas Tab pasiekia turinio praleidimo nuorodą");
  console.log(`Iš viso: ${passed} PASS, 0 FAIL. Laikinas profilis: ${profile}`);
} finally {
  for (const request of pending.values()) clearTimeout(request.timer);
  ws?.close(); browser.kill();
}
