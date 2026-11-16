import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getArtworkTranslation } from "../src/lib/artwork-translations.ts";

const artwork = JSON.parse(readFileSync(new URL("./fixtures/monet.json", import.meta.url), "utf8"));

test("lietuviškas vertimas susietas su tikru muziejaus tekstu ir nekeičia originalo", () => {
  const before = JSON.stringify(artwork);
  const result = getArtworkTranslation(artwork);
  assert.equal(result.language, "lt");
  assert.equal(result.text.title, "Vandens lelijos");
  assert.equal(result.text.medium, "Aliejus ant drobės");
  assert.ok(result.text.description.includes("Claude Monet"));
  assert.equal(result.text.description.split("\n\n").length, 2);
  assert.equal(JSON.stringify(artwork), before);
  assert.equal(artwork.title, "Water Lilies");
});

test("kitam kūriniui nepriskiriamas Monet vertimas", () => {
  assert.equal(getArtworkTranslation({ ...artwork, id: 27992 }), null);
});

test("pasikeitus šaltinio aprašymui ar faktams senas vertimas nerodomas", () => {
  for (const key of ["title", "artistDisplay", "date", "medium", "dimensions", "type", "description", "creditLine"]) {
    assert.equal(getArtworkTranslation({ ...artwork, [key]: "Pasikeitę muziejaus duomenys" }), null);
  }
});
