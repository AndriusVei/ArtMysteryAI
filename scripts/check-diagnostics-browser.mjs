// Vietinė Edge patikra. Nėra Gemini kvietimų, paskyrų kūrimo ar DB pakeitimų.
import assert from "node:assert/strict";
import { browserTestSession } from "./browser-test-session.mjs";
const b = await browserTestSession(process.argv[2] ?? "http://127.0.0.1:3194");
const checkbox = 'input[aria-controls="developer-mode-panel"]';
let passed = 0;
const pass = (name) => { passed++; console.log(`PASS ${name}`); };
try {
  await b.navigate("/artwork/16568"); await b.waitFor(`document.querySelector(${JSON.stringify(checkbox)})`);
  assert.equal(await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).checked`), false);
  assert.equal(await b.evaluate("!!document.querySelector('#developer-mode-panel')"), false);
  pass("Matomas jungiklis, diagnostika pradžioje išjungta");
  await b.evaluate(`(() => {window.phase5Requests=0;window.phase5Inject=false;window.phase5Reject=false;const original=window.fetch.bind(window);
    window.fetch=async(input,init)=>{window.phase5Requests++; const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;
      if(path==='/api/private/TEST_USER')return Response.json({token:'TEST_PRIVATE_RESPONSE'});
      if(window.phase5Reject)throw new Error('TEST_PRIVATE_ERROR');
      if(window.phase5Inject&&path==='/api/collection')return Response.json({data:[],body:'TEST_PRIVATE_RESPONSE'}, {headers:{'X-ArtMystery-Diagnostics':JSON.stringify([
        {service:'supabase',endpoint:'/auth/v1/user',method:'GET',status:200,durationMs:1,token:'TEST_SECRET',user_id:'TEST_USER'},
        {service:'gemini',endpoint:'/interactions?key=TEST_SECRET',method:'POST',status:200,durationMs:2}])}});
      return original(input,init);};})()`);
  const before = await b.evaluate("window.phase5Requests");
  await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).focus()`);
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
  await b.waitFor("document.querySelector('#developer-mode-panel table')");
  assert.equal(await b.evaluate("window.phase5Requests"), before);
  let text = await b.evaluate("document.querySelector('#developer-mode-panel').innerText");
  assert.ok(text.includes("Art Institute of Chicago") && text.includes("/artworks/:id"));
  assert.ok(!text.includes("16568"));
  pass("Jungiklis veikia klaviatūra, rodo SSR muziejaus metaduomenis ir pats užklausų nesiunčia");
  await b.click("Išvalyti diagnostiką");
  await b.evaluate("fetch('/api/artworks/PRIVATE_ID?key=TEST_SECRET&userPrompt=TEST_PROMPT').then(r=>r.json())");
  await b.waitFor("document.querySelector('#developer-mode-panel table')");
  text = await b.evaluate("document.querySelector('#developer-mode-panel').innerText");
  assert.ok(text.includes("400") && text.includes("Nesėkmė"));
  assert.ok(!/TEST_|PRIVATE_ID|userPrompt|\?key/.test(text));
  pass("Netinkama API užklausa rodoma kaip 400; ID ir query reikšmės neatskleidžiamos");
  await b.evaluate("window.phase5Inject=true;fetch('/api/collection').then(r=>r.json())");
  await b.waitFor("document.querySelector('#developer-mode-panel').innerText.includes('Supabase')");
  text = await b.evaluate("document.querySelector('#developer-mode-panel').innerText");
  assert.ok(text.includes("/auth/v1/user")); assert.ok(!/TEST_|user_id|token|\?key/.test(text));
  pass("Tik saugūs atsakymo antraštės laukai; netikras endpoint ir papildomos paslaptys atmetami");
  const countBeforeUnknown = await b.evaluate("document.querySelectorAll('#developer-mode-panel tbody tr').length");
  await b.evaluate("fetch('/api/private/TEST_USER?token=TEST_SECRET').then(r=>r.json())");
  assert.equal(await b.evaluate("document.querySelectorAll('#developer-mode-panel tbody tr').length"), countBeforeUnknown);
  await b.evaluate("window.phase5Reject=true;fetch('/api/artworks/PRIVATE_ID').catch(()=>null)");
  await b.waitFor("document.querySelector('#developer-mode-panel').innerText.includes('Būsena negauta')");
  assert.ok(!(await b.evaluate("document.querySelector('#developer-mode-panel').innerText")).includes("TEST_PRIVATE_ERROR"));
  await b.evaluate("window.phase5Reject=false;window.phase5Inject=false");
  pass("Nežinomi endpoint nefiksuojami; tinklo klaida nerodo išimties teksto");
  await b.click("Išvalyti diagnostiką");
  await b.evaluate("(async()=>{for(let i=0;i<35;i++)await fetch('/api/artworks/invalid');})()");
  await b.waitFor("document.querySelectorAll('#developer-mode-panel tbody tr').length === 30");
  pass("Atminties žurnalas apribotas iki 30 įrašų");
  for (const width of [375, 1440]) {
    await b.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await b.evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    assert.equal(await b.evaluate("document.querySelector('table').closest('[tabindex]').getAttribute('role')"), "region");
    pass(`Diagnostikos lentelė pasiekiama klaviatūra ir telpa ${width}px lange`);
  }
  await b.evaluate("document.querySelector('header a[href=\"/explore\"]').click()");
  await b.waitFor("location.pathname === '/explore'");
  assert.equal(await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).checked`), true);
  pass("Režimas išlieka per įprastą Next navigaciją");
  await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).click()`);
  await b.waitFor("!document.querySelector('#developer-mode-panel')");
  const blocked = await b.api("POST", { artworkId: 16568 });
  assert.equal(blocked.status, 401);
  await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).click()`);
  const blockedOn = await b.api("POST", { artworkId: 16568 }); assert.equal(blockedOn.status, 401);
  pass("Įjungimas / išjungimas nekeičia neprisijungusio naudotojo 401 ir nesuteikia teisių");
  await b.navigate("/artwork/16568");
  assert.equal(await b.evaluate(`document.querySelector(${JSON.stringify(checkbox)}).checked`), false);
  pass("Po pilno perkrovimo diagnostikos istorija neišlieka");
  console.log(`Developer Mode browser: ${passed} PASS, 0 FAIL. Gemini ir DB pakeitimų nėra.`);
} catch {
  console.error(`Developer Mode browser FAIL po ${passed} PASS; privatūs parametrai nerodomi.`); process.exitCode = 1;
} finally { b.close(); }
