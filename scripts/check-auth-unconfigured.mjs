// Neprisijungusio, dar nesukonfigūruoto projekto HTTP patikra; išorinių resursų nekuria.
import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3189");
assert.ok(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname));
let passed = 0; const pass = (name) => { passed++; console.log(`PASS ${name}`); };
for (const path of ["/login", "/register"]) {
  const response = await fetch(new URL(path, base)); const html = await response.text();
  assert.equal(response.status, 200);
  assert.ok(/<fieldset[^>]*disabled/.test(html), "Nesukonfigūruota registracija ir prisijungimas turi būti aiškiai neprieinami.");
  assert.ok(html.includes('name="password"') && html.includes('type="password"') && html.includes('name="email"'));
  pass(`${path}: 200, pažymėta nesukonfigūruota forma, slaptažodis ne paprasto teksto lauke`);
}
const profile = await fetch(new URL("/profile", base), { redirect: "manual" });
assert.equal(profile.status, 307); assert.equal(profile.headers.get("location"), "/login?next=%2Fprofile");
pass("Profilis neleidžia prieigos be patvirtintos sesijos");
const confirm = await fetch(new URL("/auth/confirm?type=admin&token_hash=not-a-token&next=https://evil.example", base), { redirect: "manual" });
assert.equal(confirm.status, 303); assert.equal(new URL(confirm.headers.get("location")).pathname, "/auth/error");
assert.ok(confirm.headers.get("cache-control").includes("no-store"));
pass("Blogas patvirtinimas nenukreipia į išorinį URL ir nėra talpinamas podėlyje");
const collection = await fetch(new URL("/api/collection", base));
assert.equal(collection.status, 503); assert.equal((await collection.json()).error.code, "unavailable");
assert.ok(collection.headers.get("cache-control").includes("no-store"));
pass("Be Supabase nėra fiktyvios paskyros kolekcijos ar privataus HTTP podėlio");
for (const method of ["POST", "PATCH", "DELETE"]) {
  const r = await fetch(new URL("/api/collection", base), { method, headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(r.status, 403); pass(`${method}: svetima kilmė atmetama`);
}
const demo = await fetch(new URL("/collection", base));
assert.equal(demo.status, 200); assert.ok((await demo.text()).includes("Demonstracinė kolekcija"));
pass("Demo kolekcija be konfigūracijos išlieka pasiekiama");
console.log(`${passed} PASS, 0 FAIL. Tikra autentifikacija ir RLS šiuo scenarijumi nepatvirtinami.`);
