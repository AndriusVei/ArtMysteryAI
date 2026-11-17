import test from "node:test";
import assert from "node:assert/strict";
import { splitTranslationText, translateArtwork } from "../src/lib/translate-artwork.ts";

const artwork = {
  id: 111628, title: "Nighthawks", artist: "Edward Hopper", artistDisplay: null,
  date: "1942", medium: "Oil on canvas", dimensions: null, type: "Painting",
  description: "First paragraph.\n\nSecond paragraph.", creditLine: null,
  copyrightNotice: null, isPublicDomain: true, museumUrl: "https://www.artic.edu/artworks/111628",
  image: null, imageUnavailableReason: "missing",
};

test("translation chunks preserve Unicode, whitespace and the API byte limit", () => {
  for (const source of ["ą🙂 文 ".repeat(250), "x".repeat(1600), "one\n\ntwo", ""]) {
    const chunks = splitTranslationText(source);
    assert.equal(chunks.join(""), source);
    assert.ok(chunks.every(chunk => Buffer.byteLength(chunk, "utf8") <= 450));
    assert.ok(chunks.every(chunk => !/[\uD800-\uDBFF]$/.test(chunk)));
  }
});

test("any artwork can be translated without changing original data or missing fields", async () => {
  const before = structuredClone(artwork);
  const inputs = [];
  const result = await translateArtwork(artwork, async (url) => {
    assert.equal(url.origin, "https://api.mymemory.translated.net");
    assert.equal(url.searchParams.get("langpair"), "en|lt");
    const source = url.searchParams.get("q");
    inputs.push(source);
    return Response.json({ responseStatus: 200, responseData: { translatedText: `LT ${source}` } });
  });
  assert.equal(result.automatic, true);
  assert.equal(result.text.title, "LT Nighthawks");
  assert.equal(result.text.date, "1942");
  assert.equal(result.text.artistDisplay, null);
  assert.equal(result.text.description, "LT First paragraph.\n\nLT Second paragraph.");
  assert.ok(!inputs.includes("1942"));
  assert.deepEqual(artwork, before);
});

test("quota, malformed responses and network errors never become translated artwork", async () => {
  for (const [fetcher, code] of [
    [async () => Response.json({}, { status: 429 }), "rate_limited"],
    [async () => Response.json({ responseStatus: 403, quotaFinished: true }), "rate_limited"],
    [async () => Response.json({ responseStatus: 200, responseData: { translatedText: "" } }), "unavailable"],
    [async () => { throw new Error("private upstream error"); }, "unavailable"],
  ]) {
    await assert.rejects(translateArtwork(artwork, fetcher), error => error.code === code && !error.message.includes("private"));
  }
});
