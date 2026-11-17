import assert from "node:assert/strict";
import { browserTestSession } from "./browser-test-session.mjs";

const session = await browserTestSession(process.argv[2] ?? "http://localhost:3000");
const { navigate, evaluate, click, waitFor } = session;
try {
  await navigate("/artwork/16568");
  await waitFor(`document.querySelector('h1')?.textContent === 'Vandens lelijos'`);
  await click("Originalo kalba");
  await waitFor(`document.querySelector('h1')?.textContent === 'Water Lilies'`);
  await click("Lietuviškai");
  await waitFor(`document.querySelector('h1')?.textContent === 'Vandens lelijos'`);
  console.log("PASS reviewed translation switches both ways");

  await navigate("/artwork/111628");
  await waitFor(`document.querySelector('h1')?.textContent === 'Nighthawks'`);
  await click("Lietuviškai");
  await waitFor(`document.querySelector('h1')?.lang === 'lt' || document.body.textContent.includes('Vertimas šiuo metu nepasiekiamas') || document.body.textContent.includes('vertimo limitas')`);
  assert.equal(await evaluate(`document.querySelector('h1').lang`), "lt", await evaluate(`document.querySelector('article [role=status]').textContent`));
  const translated = await evaluate(`document.querySelector('h1').textContent`);
  assert.notEqual(translated, "Nighthawks");
  await click("Originalo kalba");
  await waitFor(`document.querySelector('h1')?.textContent === 'Nighthawks'`);
  await click("Lietuviškai");
  assert.equal(await evaluate(`document.querySelector('h1').textContent`), translated);
  console.log("PASS live automatic translation and cached switch back to Lithuanian");

  await navigate("/artwork/111628");
  await waitFor(`document.querySelector('h1')?.lang === 'en'`);
  await evaluate(`window.fetch = async () => new Response(JSON.stringify({error:'Šiandienos nemokamo vertimo limitas pasiektas.'}), {status:429, headers:{'Content-Type':'application/json'}})`);
  await click("Lietuviškai");
  await waitFor(`document.body.textContent.includes('vertimo limitas')`);
  assert.equal(await evaluate(`document.querySelector('h1').lang`), "en");
  await evaluate(`window.fetch = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError'))))`);
  await click("Lietuviškai");
  await waitFor(`document.querySelector('button[aria-busy=true]')`);
  await click("Originalo kalba");
  await waitFor(`!document.querySelector('button[aria-busy=true]')`);
  assert.equal(await evaluate(`document.querySelector('h1').lang`), "en");
  console.log("PASS quota failure keeps original; loading can be cancelled");
} finally { session.close(); }
