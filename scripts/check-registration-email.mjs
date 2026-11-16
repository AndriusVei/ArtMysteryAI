// Vienas registracijos laiškas naudotojo aiškiai pateiktu adresu; slaptažodis tik ignoruojamame vietiniame faile.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { browserTestSession } from "./browser-test-session.mjs";

assert.equal(process.env.ARTMYSTERY_ALLOW_REMOTE_TESTS, "YES");
const email = process.env.ARTMYSTERY_REGISTRATION_EMAIL;
assert.ok(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
const credentialFile = ".env.auth-verification.local", linkFile = ".env.auth-confirmation-url.local";
execFileSync("git", ["check-ignore", "-q", credentialFile]); execFileSync("git", ["check-ignore", "-q", linkFile]);
const resending = process.argv.includes("--resend");
const resuming = process.argv.includes("--resume") || resending;
let password, reuseProfile;
if (resuming) {
  assert.ok(existsSync(credentialFile) && process.env.ARTMYSTERY_REGISTRATION_PASSWORD, "Tęsimui reikia ankstesnių vietinių bandymo duomenų.");
  password = process.env.ARTMYSTERY_REGISTRATION_PASSWORD;
  const state = JSON.parse(readFileSync(".env.auth-verification-state.local", "utf8"));
  assert.equal(state.purpose, "registration-confirmation-resume"); reuseProfile = state.profile;
} else {
  assert.ok(!existsSync(credentialFile), "Vietinis bandymo slaptažodžio failas jau yra; automatiškai jo neperrašome ir registracijos nekartojame.");
  assert.ok(!existsSync(linkFile), "Senas patvirtinimo nuorodos failas nepernaudojamas.");
  password = randomBytes(30).toString("base64url") + "Aa1!";
  writeFileSync(credentialFile, `# Tik vietinis registracijos bandymas. Nekelti i Git ir nespausdinti ataskaitose.\nARTMYSTERY_REGISTRATION_EMAIL=${email}\nARTMYSTERY_REGISTRATION_PASSWORD=${password}\n`, { mode: 0o600 });
}
const browser = await browserTestSession(process.argv[2] ?? "http://localhost:3191", { reuseProfile });
let passed = 0; const pass = (name) => { passed++; console.log(`PASS ${name}`); };
try {
  if (resending) {
    assert.ok(!existsSync(linkFile), "Sena nuoroda nenaudojama naujam laiško bandymui.");
    await browser.navigate("/login");
    await browser.evaluate("document.querySelector('details[data-resend]').open = true");
    await browser.field("#resend-email", email); await browser.click("Siųsti patvirtinimo laišką");
    await browser.waitFor("[...document.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('Patvirtinimo laiško užklausa priimta')) || document.querySelector('details[data-resend] [role=alert]')");
    assert.equal(await browser.evaluate("Boolean(document.querySelector('details[data-resend] [role=alert]'))"), false, "Pakartotinio laiško užklausa nepavyko; tiekėjo detalės nerodomos.");
    pass("Vienas naujas patvirtinimo laiškas užsakytas esamai paskyrai su nauju PKCE verifier");
  } else if (!resuming) {
  await browser.navigate("/register"); await browser.field("#auth-email", email); await browser.field("#auth-password", password);
  await browser.click("Sukurti paskyrą");
  await browser.waitFor("[...document.querySelectorAll('[role=status],[role=alert]')].some(e=>e.textContent.includes('Jei registracija priimta') || e.getAttribute('role') === 'alert')");
  const status = await browser.evaluate("document.querySelector('[role=alert]') ? 'error' : 'requested'");
  assert.equal(status, "requested", "Registracijos serverio veiksmas grąžino kontroliuojamą klaidą; tiekėjo detalės ir slaptažodis nerodomi.");
  pass("Tikra registracijos forma priėmė užklausą; paskyros slaptažodis išsaugotas tik vietoje");
  } else {
    await browser.navigate("/register");
    const cookies = (await browser.send("Network.getCookies")).cookies;
    assert.ok(cookies.some((cookie) => cookie.name.includes("code-verifier")), "Tęsiamoje naršyklėje nėra ankstesnio PKCE verifier; nuoroda dar nenaudojama.");
    pass("Ankstesnės registracijos naršyklė atkurta su PKCE verifier; naujo laiško nėra");
  }
  writeFileSync(".env.auth-verification-state.local", JSON.stringify({ profile: browser.profile, base: process.argv[2] ?? "http://localhost:3191", purpose: "registration-confirmation-resume" }), { mode: 0o600 });
  console.log("WAITING_FOR_CONFIRMATION_EMAIL: patvirtinimo nuorodą reikia įrašyti į ignoruojamą .env.auth-confirmation-url.local; jos pokalbyje nespausdinti.");
  const deadline = Date.now() + 45 * 60 * 1000;
  while (!existsSync(linkFile) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 500));
  assert.ok(existsSync(linkFile), "Laiško nuorodos nesulaukta. Registracija automatiškai nekartojama.");
  const link = readFileSync(linkFile, "utf8").trim(); unlinkSync(linkFile);
  const url = new URL(link);
  assert.equal(url.origin, process.env.NEXT_PUBLIC_SUPABASE_URL); assert.equal(url.pathname, "/auth/v1/verify");
  assert.ok(url.searchParams.has("token") || url.searchParams.has("token_hash"));
  await browser.send("Page.navigate", { url: url.href });
  await browser.waitFor("location.pathname === '/profile' && document.body.innerText.includes('Esi prisijungęs')");
  pass("Tikro laiško numatytoji ConfirmationURL su PKCE kodu patvirtino el. paštą ir serverio sesiją");
  assert.equal(await browser.evaluate("location.search"), "");
  assert.equal((await browser.api()).status, 200); pass("Patvirtinimo kodas pašalintas iš adreso; paskyros API pasiekiamas");
  const cookies = (await browser.send("Network.getCookies")).cookies.filter((cookie) => cookie.name.startsWith("sb-"));
  assert.ok(cookies.length && cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")); pass("Tikros registracijos sesija turi HttpOnly ir SameSite=Lax slapukus");
  await browser.navigate("/profile"); assert.equal((await browser.api()).status, 200); pass("Registracijos sesija išlieka atnaujinus puslapį");
  await browser.click("Atsijungti šiame įrenginyje"); await browser.waitFor("location.pathname === '/login'");
  assert.equal((await browser.api()).status, 401); pass("Tikros paskyros atsijungimas panaikina prieigą");
  await browser.field("#auth-email", email); await browser.field("#auth-password", "wrong-" + randomBytes(12).toString("hex")); await browser.click("Prisijungti");
  await browser.waitFor("document.querySelector('[role=alert]')?.textContent.includes('Patikrink el. paštą ir slaptažodį')");
  assert.equal((await browser.api()).status, 401); pass("Klaidingas slaptažodis atmetamas lietuviškai ir nesukuria sesijos");
  await browser.field("#auth-email", email); await browser.field("#auth-password", password); await browser.click("Prisijungti");
  await browser.waitFor("location.pathname === '/profile' && document.body.innerText.includes('Esi prisijungęs')");
  assert.equal((await browser.api()).status, 200); pass("Po el. pašto patvirtinimo galima vėl prisijungti su slaptažodžiu");
  await browser.click("Atsijungti šiame įrenginyje"); await browser.waitFor("location.pathname === '/login'");
  console.log(`Registracijos laiško scenarijus: ${passed} PASS, 0 FAIL. Paskyra palikta naudotojui; slaptažodis yra tik ${credentialFile}.`);
} catch (error) {
  console.error(`Registracijos laiško scenarijus sustojo po ${passed} PASS; klaidos klasė ${error?.name ?? "Error"}. Privatūs parametrai nerodomi.`);
  if (error?.message && !/sb_|eyJ|token_hash|password|@/.test(error.message)) console.error(error.message.slice(0, 400));
  process.exitCode = 1;
} finally { browser.close(); }
