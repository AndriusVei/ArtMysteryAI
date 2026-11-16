# Kūrėjo B kūrinio detalės – integracija su A

## Kas paruošta

- Puslapis `/artwork/[id]` gauna tikrus duomenis serveryje per `getArtwork(id)`.
- `GET /api/artworks/[id]` suteikia tą patį normalizuotą rezultatą JSON formatu.
- `GET /api/artworks/[id]/image` pateikia patikrintą JPEG iš muziejaus per mūsų serverį.
- `src/types/artwork.ts`: `Artwork`, `ArtworkImageData`, `ArtworkResult`, `ArtworkErrorCode`.
- `src/lib/artic.ts`: ID ir muziejaus atsakymo tikrinimas, duomenų normalizavimas,
  patikimo IIIF adreso sudarymas, viešų duomenų podėlis (1 val.), 10 s užklausos riba.
- Nekartojamos nesėkmingos užklausos automatiškai. 429 atveju prašoma palaukti.
- Nėra Supabase, Gemini, prisijungimo imitavimo ar mokamų paslaugų.

## Kaip A prijungti paiešką

Paieškos rezultato `id` yra kūrinio numeris. Jo nekonvertuoti į paveikslo `image_id`:

```tsx
<Link href={`/artwork/${result.id}`}>Peržiūrėti kūrinį</Link>
```

Pavyzdys, tikrai patikrintas 2026-11-16:
`/artworks/search?q=monet` → ID `16568` → `/artwork/16568` →
muziejaus `/artworks/16568?fields=...`.
Paieškos A faile, prisijungime, globaliuose stiliuose ir Next konfigūracijoje
B pakeitimų neatliko. `package.json` papildytas tik `test` komanda;
CI papildytas jos paleidimu, priklausomybių versijos nekeistos.

Serverio pusėje galima naudoti `getArtwork(id)`. Naršyklės komponentui –
`fetch('/api/artworks/' + id)`. Nelaukti, kad muziejaus žaliavinis atsakymas ir
mūsų API atsakymas sutaps: mūsų laukų pavadinimai camelCase, trūkstami tekstai null.
API atsakymą naršyklėje taip pat reikia tikrinti, ne vien priskirti TypeScript tipą.
`Artwork.image.url` lieka originalus IIIF šaltinio adresas. Paveikslui sąsajoje
naudoti `/api/artworks/${id}/image`, kad naršyklė nesikreiptų tiesiogiai į IIIF.

Sėkmingas atsakymas: `{ data: Artwork }`, HTTP 200.
Klaida: `{ error: { code, message } }`, žinutė lietuviška.

| code | Mūsų HTTP būsena |
| --- | --- |
| invalid_id | 400 |
| not_found | 404 |
| rate_limited | 429, Retry-After: 60 |
| timeout | 504 |
| unavailable / invalid_response | 502 |

Klaidų atsakymai nesaugomi HTTP podėlyje. API leidžia GET (kitus metodus riboja Next).
Klaidos puslapis neatskleidžia neapdorotų muziejaus atsakymų ar stack trace.
Dėl Next puslapio srautinio įkėlimo kūrinio neradimo turinio HTTP būsena gali būti
200; tiksliam 400/404 patikrinimui naudoti JSON API. Puslapyje tikrinti ir klaidos turinį.

## Paveikslai ir šaltiniai

Naudojamas muziejaus grąžintas `config.iiif_url`, tik leidžiamas
`https://www.artic.edu/iiif/2`, patikrintas UUID `image_id` ir dydis `843,`.
Vaizdas pateikiamas tik kai `is_public_domain === true` ir nėra prieštaraujančio
`copyright_notice`. Kai teisės nepatvirtintos, metaduomenis vis tiek galima skaityti.
Trūkstamas ID nepakeičiamas kitu paveikslu ar dirbtiniu vaizdu.

Next Image naudojamas su `unoptimized`: IIIF jau pateikia parinkto dydžio vaizdą,
papildomas Vercel vaizdų apdorojimas nejungiamas. Naršyklė gauna JPEG iš mūsų
`/api/artworks/[id]/image` adreso. Serveris pirmiausia tikrina muziejaus duomenis
ir teises, tada atlieka įprastą IIIF užklausą su `AIC-User-Agent: ArtMystery AI`.
Neleidžiami vartotojo URL ar šaltinio peradresavimai, nustatyta 15 s riba ir 8 MiB
failo riba. Tikrinamas MIME tipas ir JPEG pradžios baitai; HTML nepersiunčiamas.
Sėkmės atsakymas `image/jpeg` su 1 val. viešu podėliu ir `nosniff`; klaida – JSON
su `no-store`. Vaizdo klaida pakeičia jį lietuvišku paaiškinimu bei pakartojimo
mygtuku ir nesustabdo detalių puslapio.

Pataisos priežastis: tiesioginės užklausos grąžino Cloudflare HTTP 403, o įprasta
Node serverio užklausa grąžino 200. Naudojamas viešai pasiekiamas serverio atsakymas,
Cloudflare patikros neapeinamos. Po pataisos vietinis image adresas grąžino tikrą
278626 baitų JPEG; sharp dekodavimas patvirtino 843 × 809 dydį.

Sąsajos tekstai lietuviški. Originalūs muziejaus pavadinimai ir aprašymai
paliekami šaltinio kalba, pažymėti kaip originalūs duomenys; jų DI neverčia.
Aprašymas pateikiamas kaip React tekstas, pašalinant HTML formatavimą;
`dangerouslySetInnerHTML` nenaudojamas. Nurodyta CC BY 4.0 ir muziejaus nuoroda,
paveikslui – viešo naudojimo žyma, kai tai patvirtina metaduomenys.

Oficialūs šaltiniai: [API dokumentacija](https://api.artic.edu/docs/),
[muziejaus sąlygos](https://www.artic.edu/terms),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Muziejaus AIC-User-Agent dabar nurodo projekto vardą. Prieš publikavimą A turi
pridėti suderintą kontaktą pagal muziejaus mandagumo rekomendaciją; asmeninis
el. paštas šiame etape nekuriamas ir nespėjamas.

## Kaip patikrinti

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

- `/artwork/16568`: tikri Monet duomenys, aprašymas ir paveikslas arba jo klaidos būsena.
- `/artwork/27992`: kitas tikras kūrinys (duomenis tikrinti internetu).
- `/artwork/abc`: kūrinio neradimo pranešimas, muziejaus užklausa nevykdoma.
- `/api/artworks/abc`: HTTP 400 ir lietuviška klaida.
- `/api/artworks/999999999`: neegzistuojančio ID klaida (priklauso nuo muziejaus pasiekiamumo).
- Naršyklėje tikrinti 375 px ir 1440 px, ilgus tekstus, Tab, praleidimo nuorodą,
  naršyklės tinklo skydelyje užblokuotą IIIF užklausą ir įkėlimo būseną.

Automatiniai testai naudoja izoliuotą muziejaus atsakymo formos imitaciją,
nepakeičia gamybinio API ir nekuria fiktyvių kūrinių programoje.

## Kūrinio teksto kalbos pasirinkimas

`ArtworkDetails` yra kliento komponentas su „Lietuviškai“ ir „Originalo kalba“
mygtukais. Kai vertimas prieinamas, iš pradžių rodomas lietuviškas tekstas;
mygtukais perjungiami pavadinimas, aprašymas, technika, autoriaus informacija,
matmenys ir kolekcijos kreditas. Sąsajos užrašai lieka lietuviški.
Paveikslas, ID, originalios teisės ir nuoroda į muziejų nekeičiami.

Vietinis muziejaus teksto vertimas paruoštas tik kūriniui 16568.
Kitiems kūriniams lietuvių pasirinkimas neaktyvus ir paaiškinama, kad vertimo dar
nėra. Tai nėra visų kūrinių automatinis vertimas. Vertimas pažymėtas kaip neoficialus,
palikta originalo peržiūra, muziejaus nuoroda ir CC BY licencija.

`ArtworkTranslation` sutartis yra `src/types/artwork-translation.ts`.
`src/lib/artwork-translations.ts` saugo vertimą atskirai nuo originalių duomenų.
Serveris tikrina šaltinio teksto ir metaduomenų SHA-256 atspaudą: šaltiniui pasikeitus,
senas vertimas neberodomas, kol jis neperžiūrėtas. Tai nereikalauja papildomų API,
mokėjimų ar raktų. Automatinio vertimo ir Gemini serverio B nekuria.
A gali vėliau prijungti kitą peržiūrėtų vertimų šaltinį per šią pačią sutartį;
muziejaus `getArtwork` ir JSON API toliau pateikia originalius duomenis.

Nauji failai: `artwork-details.tsx`, `artwork-translations.ts`,
`artwork-translation.ts`, `tests/artwork-translations.test.mjs` ir viešų muziejaus
duomenų bandymo pavyzdys `tests/fixtures/monet.json`. `page.tsx` paliktas serverio
duomenų gavimui, matomas turinys perkeltas į `ArtworkDetails`.

Faktiškai patikrinta 2026-11-16:

- `npm test`: 26 PASS, 0 FAIL; tikrinamas originalo išsaugojimas, vertimo susiejimas
  su kūriniu ir saugus atsisakymas rodyti pasenusį vertimą.
- Lint, TypeScript ir produkcinis surinkimas: PASS.
- Tikrame paslėptame Edge lange: numatytas LT pavadinimas, perjungimas į originalą
  ir atgal su technikos pasikeitimu – PASS.
- 375 ir 1440 px: horizontalaus slinkimo nėra – PASS.
- Tikras paveikslas naršyklėje: HTTP 200 JPEG, `naturalWidth=843` – PASS.

Pirmame browser bandyme vaizdo tikrinimas atliktas dar nebaigus jo atsisiųsti;
palaukus `complete` / `naturalWidth`, pakartotinė vaizdo patikra praėjo.
Tai nėra visos programos prieinamumo ar visų ekranų dizaino sertifikavimas.
