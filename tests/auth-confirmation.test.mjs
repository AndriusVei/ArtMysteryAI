import test from "node:test";
import assert from "node:assert/strict";
import { confirmAuthRequest } from "../src/lib/auth-confirmation.ts";
test("numatyto laiško PKCE kodas keičiamas į serverio sesiją", async () => {
  let calls = 0;
  assert.equal(await confirmAuthRequest(new URLSearchParams({ code: "test-code-123", next: "https://evil.example" }), {
    async exchangeCodeForSession(code) { calls++; assert.equal(code, "test-code-123"); return { error: null }; },
    async verifyOtp() { assert.fail("PKCE kelias neturi naudoti OTP"); },
  }), true);
  assert.equal(calls, 1);
});
test("individualaus šablono token_hash palaikomas atskirai", async () => {
  assert.equal(await confirmAuthRequest(new URLSearchParams({ token_hash: "test-hash-123", type: "email" }), {
    async exchangeCodeForSession() { assert.fail(); },
    async verifyOtp(value) { assert.deepEqual(value, { token_hash: "test-hash-123", type: "email" }); return { error: null }; },
  }), true);
});
test("dublikatai, mišrūs būdai, valdymo simboliai ir blogi tipai nedaro Auth užklausų", async () => {
  const auth = { async exchangeCodeForSession() { assert.fail(); }, async verifyOtp() { assert.fail(); } };
  for (const query of ["", "code=short", "code=test-code-123&code=other-code", "code=test-code-123&token_hash=test-hash-123", "code=test-code-123&type=email", "code=test-code-123&error=denied", "token_hash=test-hash-123&type=admin", "token_hash=test-hash-123&type=email&type=signup", "code=test%0Acode", `code=${"a".repeat(2049)}`]) {
    assert.equal(await confirmAuthRequest(new URLSearchParams(query), auth), false);
  }
});
test("negaliojantis arba jau panaudotas kodas nėra sėkmė", async () => {
  const auth = { async exchangeCodeForSession() { return { error: { code: "invalid_code" } }; }, async verifyOtp() { return { error: { code: "otp_expired" } }; } };
  assert.equal(await confirmAuthRequest(new URLSearchParams({ code: "test-code-123" }), auth), false);
  assert.equal(await confirmAuthRequest(new URLSearchParams({ token_hash: "test-hash-123", type: "email" }), auth), false);
});
