import test from "node:test";
import assert from "node:assert/strict";
import { getArtwork, getArtworkImage, parseArtworkId, parseArtworkResponse, museumTextToPlainText } from "../src/lib/artic.ts";

// Tik testų duomenys, niekada nenaudojami programos rezultatams.
function fixture(overrides = {}, config = { iiif_url: "https://www.artic.edu/iiif/2" }) {
  return {
    data: {
      id: 16568, title: "Water Lilies", artist_title: "Claude Monet",
      date_display: "1906", medium_display: "Oil on canvas",
      is_public_domain: true, copyright_notice: null,
      image_id: "3c27b499-af56-f0d5-93b5-a7f2f1ad5813",
      thumbnail: { width: 8808, height: 8460 },
      description: "<p>Muziejaus tekstas &amp; šaltinis.</p>",
      ...overrides,
    }, config,
  };
}

test("ID priima tik teigiamus riboto ilgio sveikuosius skaičius", () => {
  assert.equal(parseArtworkId("16568"), 16568);
  assert.equal(parseArtworkId(16568), 16568);
  for (const value of ["0", "-1", "1.5", "1e3", "001", " 12", "12/../", "abc", "9999999999"]) {
    assert.equal(parseArtworkId(value), null);
  }
});

test("normalizuoja tikro atsakymo formą ir sudaro IIIF adresą", () => {
  const artwork = parseArtworkResponse(fixture(), 16568);
  assert.equal(artwork.id, 16568);
  assert.equal(artwork.artist, "Claude Monet");
  assert.equal(artwork.image.url, "https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/full/843,/0/default.jpg");
  assert.ok(artwork.image.height > 0);
  assert.equal(artwork.description, "Muziejaus tekstas & šaltinis.");
  assert.equal(artwork.museumUrl, "https://www.artic.edu/artworks/16568");
});

test("trūkstami metaduomenys nevirsta išgalvotais faktais", () => {
  const artwork = parseArtworkResponse({ data: { id: 16568, title: null } }, 16568);
  assert.equal(artwork.title, "Pavadinimas nepateiktas");
  assert.equal(artwork.artist, null);
  assert.equal(artwork.date, null);
  assert.equal(artwork.description, null);
  assert.equal(artwork.image, null);
});

test("HTML paliekamas tik kaip paprastas tekstas, pavojingi blokai pašalinami", () => {
  assert.equal(museumTextToPlainText('<p>A &lt; B &#38; C</p><script>secret()</script><style>body{}</style><p>D &#x2014; E</p>'), "A < B & C\nD — E");
  assert.equal(museumTextToPlainText("&#999999999;"), "�");
});

test("nerodo vaizdo, kai teisių nėra arba jų duomenys prieštaringi", () => {
  for (const overrides of [{ is_public_domain: false }, { is_public_domain: "true" }, { copyright_notice: "Copyright" }]) {
    const artwork = parseArtworkResponse(fixture(overrides), 16568);
    assert.equal(artwork.image, null);
    assert.equal(artwork.imageUnavailableReason, "rights");
  }
});

test("trūkstamas ar sugadintas image_id nesukuria išgalvoto paveikslo", () => {
  for (const image_id of [null, "", "../../other", "not-an-image"]) {
    const artwork = parseArtworkResponse(fixture({ image_id }), 16568);
    assert.equal(artwork.image, null);
    assert.equal(artwork.imageUnavailableReason, "missing");
  }
});

test("neleidžia nepatikimo IIIF domeno, prisijungimo duomenų ar užklausos parametrų", () => {
  for (const iiif_url of ["http://www.artic.edu/iiif/2", "https://evil.example/iiif/2", "https://www.artic.edu.evil.example/iiif/2", "https://u:p@www.artic.edu/iiif/2", "https://www.artic.edu/iiif/2?x=1"]) {
    assert.equal(parseArtworkResponse(fixture({}, { iiif_url }), 16568).image, null);
  }
});

test("atmeta kitą ID, netinkamą JSON struktūrą ir klaidingus laukų tipus", () => {
  for (const payload of [null, [], { data: [] }, fixture({ id: 2 }), fixture({ artist_title: 123 }), fixture({ title: "x".repeat(2001) })]) {
    assert.throws(() => parseArtworkResponse(payload, 16568));
  }
});

test("neteisingas ID nepasiekia muziejaus", async () => {
  let calls = 0;
  const result = await getArtwork("../123", async () => { calls++; throw new Error(); });
  assert.deepEqual(result, { ok: false, code: "invalid_id" });
  assert.equal(calls, 0);
});

test("detalių užklausa naudoja ID, būtinus laukus, podėlį ir laiko ribą", async () => {
  const result = await getArtwork(16568, async (url, options) => {
    assert.match(url, /\/artworks\/16568\?fields=/);
    assert.ok(url.includes("is_public_domain"));
    assert.equal(options.next.revalidate, 3600);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(fixture());
  });
  assert.equal(result.ok, true);
  assert.equal(result.artwork.id, 16568);
});

for (const [status, code] of [[404, "not_found"], [429, "rate_limited"], [403, "unavailable"], [500, "unavailable"]]) {
  test(`HTTP ${status} grąžina kontroliuojamą klaidą be pakartojimų`, async () => {
    let calls = 0;
    const result = await getArtwork(16568, async () => { calls++; return new Response(null, { status }); });
    assert.deepEqual(result, { ok: false, code });
    assert.equal(calls, 1);
  });
}

test("sugadintas, per didelis JSON ar kitas ID nepasiekia sąsajos", async () => {
  for (const body of ["not json", JSON.stringify(fixture({ id: 2 })), " ".repeat(128001)]) {
    assert.deepEqual(await getArtwork(16568, async () => new Response(body)), { ok: false, code: "invalid_response" });
  }
});

test("laiko ir tinklo klaidose neatskleidžiamos vidinės klaidos", async () => {
  for (const [name, code] of [["TimeoutError", "timeout"], ["AbortError", "timeout"], ["TypeError", "unavailable"]]) {
    const result = await getArtwork(16568, async () => { const error = new Error("privati klaidos informacija"); error.name = name; throw error; });
    assert.deepEqual(result, { ok: false, code });
    assert.ok(!JSON.stringify(result).includes("privati"));
  }
});

function imageFetcher(imageResponse, overrides = {}) {
  return async (url, options) => {
    if (url.startsWith("https://api.artic.edu/")) return Response.json(fixture(overrides));
    assert.equal(url, "https://www.artic.edu/iiif/2/3c27b499-af56-f0d5-93b5-a7f2f1ad5813/full/843,/0/default.jpg");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Accept, "image/jpeg");
    assert.ok(options.signal instanceof AbortSignal);
    return typeof imageResponse === "function" ? imageResponse() : imageResponse;
  };
}

test("serveris grąžina tik patikrintą muziejaus JPEG", async () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 0xff, 0xd9]);
  const result = await getArtworkImage(16568, imageFetcher(new Response(bytes, { headers: { "Content-Type": "image/jpeg" } })));
  assert.equal(result.ok, true);
  assert.deepEqual(new Uint8Array(result.buffer), bytes);
});

test("nepatvirtintos teisės nesukelia paveikslo užklausos", async () => {
  let calls = 0;
  const result = await getArtworkImage(16568, async (url) => {
    calls++; assert.ok(url.startsWith("https://api.artic.edu/"));
    return Response.json(fixture({ is_public_domain: false }));
  });
  assert.deepEqual(result, { ok: false, code: "image_unavailable" });
  assert.equal(calls, 1);
});

test("paveikslo užklausa nepriima vartotojo URL", async () => {
  let calls = 0;
  const result = await getArtworkImage("https://example.com", async () => { calls++; throw new Error(); });
  assert.deepEqual(result, { ok: false, code: "invalid_id" });
  assert.equal(calls, 0);
});

test("HTML, klaidinga MIME antraštė ir netikras JPEG nepersiunčiami kaip vaizdas", async () => {
  for (const response of [
    new Response("<html>challenge</html>", { headers: { "Content-Type": "text/html" } }),
    new Response("<html>challenge</html>", { headers: { "Content-Type": "image/jpeg" } }),
    new Response(new Uint8Array(), { headers: { "Content-Type": "image/jpeg" } }),
  ]) assert.deepEqual(await getArtworkImage(16568, imageFetcher(response)), { ok: false, code: "invalid_image" });
});

test("per didelis paveikslas atmetamas tiek su Content-Length, tiek be jo", async () => {
  for (const response of [
    new Response("x", { headers: { "Content-Type": "image/jpeg", "Content-Length": "9000000" } }),
    new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/jpeg" } }),
  ]) assert.deepEqual(await getArtworkImage(16568, imageFetcher(response)), { ok: false, code: "invalid_image" });
});

test("paveikslo 403 ir 429 nevirsta HTML vaizdu ar begaliniais pakartojimais", async () => {
  for (const [status, code] of [[403, "unavailable"], [429, "rate_limited"]]) {
    assert.deepEqual(await getArtworkImage(16568, imageFetcher(new Response(null, { status }))), { ok: false, code });
  }
});

test("paveikslo laiko ir tinklo klaidos yra kontroliuojamos", async () => {
  for (const [name, code] of [["TimeoutError", "timeout"], ["TypeError", "unavailable"]]) {
    const result = await getArtworkImage(16568, imageFetcher(() => { const error = new Error("vidinė informacija"); error.name = name; throw error; }));
    assert.deepEqual(result, { ok: false, code });
  }
});
