import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function browserTestSession(base, { reuseProfile } = {}) {
  const origin = new URL(base);
  assert.ok(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname), "Tik vietinis serveris.");
  const edge = process.env.ARTMYSTERY_BROWSER_PATH ?? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  assert.ok(edge, "Edge nerastas.");
  if (reuseProfile) {
    assert.equal(dirname(resolve(reuseProfile)).toLowerCase(), resolve(tmpdir()).toLowerCase());
    assert.ok(basename(reuseProfile).startsWith("artmystery-auth-test-") && existsSync(reuseProfile), "Galima tęsti tik šio bandymo laikiną profilį.");
    const portFile = join(reuseProfile, "DevToolsActivePort");
    if (existsSync(portFile)) unlinkSync(portFile); // Tik ankstesnio, jau sustojusio bandymo diagnostikos failas.
  }
  const profile = reuseProfile ?? mkdtempSync(join(tmpdir(), "artmystery-auth-test-"));
  const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let ws, id = 0; const pending = new Map();
  const close = () => { for (const request of pending.values()) clearTimeout(request.timer); ws?.close(); browser.kill(); };
  try {
    let port;
    for (let i = 0; i < 150; i++) { try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]); break; } catch { await sleep(100); } }
    assert.ok(port, "Edge nepasileido.");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Edge ryšio laikas baigėsi.")), 15000);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Edge ryšio klaida.")); }, { once: true });
    });
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data), request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error("Edge diagnostikos komanda nepavyko.")); else request.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const next = ++id, timer = setTimeout(() => { pending.delete(next); reject(new Error(`Edge neatsakė: ${method}`)); }, 30000);
      pending.set(next, { resolve, reject, timer }); ws.send(JSON.stringify({ id: next, method, params }));
    });
    const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); assert.ok(!r.exceptionDetails, "Naršyklės scenarijus nepavyko; išraiška su galimais slaptais duomenimis nerodoma."); return r.result.value; };
    const waitFor = async (expression) => { for (let i = 0; i < 300; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); } throw new Error("Nesulaukta tikėtinos naršyklės būsenos; slapti parametrai nerodomi."); };
    const navigate = async (path, expected = new URL(path, origin).pathname) => {
      const url = new URL(path, origin); assert.equal(url.origin, origin.origin);
      await send("Page.navigate", { url: url.href });
      await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(expected)}`);
    };
    const field = async (selector, value) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const proto = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    const click = async (label) => { await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled)`); await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim() === ${JSON.stringify(label)}).click()`); };
    const api = async (method = "GET", body, query = "") => evaluate(`(async()=>{const r=await fetch('/api/collection' + ${JSON.stringify(query)}, {method:${JSON.stringify(method)}, cache:'no-store', ${body ? `headers:{'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(body))},` : ""}});return {status:r.status,body:await r.json()};})()`);
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
    return { send, evaluate, waitFor, navigate, field, click, api, close, profile };
  } catch (error) { close(); throw error; }
}
