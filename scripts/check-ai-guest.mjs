// Tik vietinis serveris, be paskyros, Gemini rakto ar mokamų užklausų.
import assert from "node:assert/strict";
const base = new URL(process.argv[2] ?? "http://localhost:3192");
assert.ok(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname));
let passed = 0;
for (const path of ["/api/ai", "/api/investigations"]) {
  for (const origin of [undefined, "https://other.example", base.origin]) {
    const response = await fetch(new URL(path, base), { method: "POST", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: "{}" });
    assert.equal(response.status, origin === base.origin ? 401 : 403);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
    const payload = await response.json();
    assert.equal(payload.error.code, origin === base.origin ? "unauthorized" : "forbidden");
    passed++;
  }
}
const saved = await fetch(new URL("/api/investigations", base));
assert.equal(saved.status, 401); passed++;
console.log(`AI guest/origin/cache checks: ${passed} PASS, 0 FAIL. Gemini nekviestas.`);
