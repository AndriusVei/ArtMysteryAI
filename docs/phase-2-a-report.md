# Kūrėjas A: 2 etapas – tikra meno paieška

Data: 2026-11-16. Patvirtinimas: „PATVIRTINU 2 ETAPĄ“.
Aplinka: Windows, Node.js 26.13.0, npm 12.2.2, Next.js 16.4.6, Edge.
Pradinis commit: `e85f80f704867a9c9b273a26e509a63bcb4a6850`.
Darbo šaka: vietinė `feature/a-search`, sukurta nuo A pagrindo.
Naujo commit, push, merge, deploy ar debesijos pakeitimų agentas neatliko.

## Kas įgyvendinta

- `/explore` leidžia ieškoti pavadinimo / raktažodžio ir filtruoti pagal autorių.
  Užpildžius abu laukus, taikomi abu kriterijai. Tuščia forma nedaro muziejaus užklausos.
- Kriterijai ir puslapis saugomi URL. Naršyklės istorija ir tiesioginės nuorodos
  leidžia grįžti prie paieškos. Pakeitus kriterijus pradedama nuo pirmo puslapio.
- Rodomi 9 kūriniai puslapyje, daugiausia 50 puslapių (450 rezultatų);
  didesnę paiešką prašoma patikslinti. Tai ne visos muziejaus kolekcijos eksportas.
- Kortelės pateikia originalų pavadinimą, autorių, datą, ID ir vaizdą.
  Kūrinio ID iš paieškos tiesiogiai naudojamas nuorodoje `/artwork/{id}`.
- Detalės, paveikslų tarpinis serveris, vertimai, demo kolekcija ir tyrimai
  išlaikyti. B metaduomenų ir teisių normalizavimas naudojamas ir paieškai.
- Viešas `GET /api/artworks?q=...&artist=...&page=...` naudoja tą pačią
  serverio funkciją kaip paieškos puslapis. Puslapis nekviečia savo HTTP API.
- Yra pradinis paaiškinimas, įkėlimo būsena, tušti rezultatai, suprantamos klaidos,
  paveikslo klaidos būsena ir pakartojimas. Greiti formos submit ribojami;
  pakartojus tą pačią paiešką prašoma atnaujinti dabartinį puslapį.

## API, validavimas ir ribos

Oficiali dokumentacija: https://api.artic.edu/docs/ . Naudojamas jos aprašytas
GET su visu URL koduotu `params` JSON. Pradinė atskiro `query` parametro
patikra neatfiltravo autoriaus; šis būdas programoje nenaudojamas.
Raktažodis apdorojamas kaip tekstas pavadinimo ir autoriaus laukuose;
autoriaus filtras – `match_phrase` lauke `artist_title`. Vartotojas negali
perduoti savo Elasticsearch struktūros, URL ar papildomų laukų į upstream užklausą.

- Kiekvienas teksto laukas iki 120 ženklų; bent vienas netuščias.
- Netinkami puslapiai, pasikartojantys parametrai, masyvai, objektai ir
  valdymo simboliai atmetami serveryje.
- Vieši muziejaus atsakymai talpinami 1 valandai; užklausos laiko riba 10 s.
- Tikrinama JSON MIME antraštė, ne didesnis kaip 128 000 baitų skaitomas srautas,
  rezultatų schema, teigiami ID, dublikatai ir puslapiavimas.
- Muziejuje taikomi `is_public_domain` ir `image_id` filtrai. B parseris papildomai
  tikrina IIIF domeną, vaizdo ID bei prieštaraujančias teises; nepatvirtintas
  vaizdas nerodomas. Vaizdas pateikiamas per esamą B `/api/artworks/{id}/image`.
- Atsakymai: 400 netinkamai įvesčiai, 429 limitui su `Retry-After: 60`,
  504 laikui, 502 netinkamam atsakymui arba nepasiekiamam muziejui.
  Klaidos JSON atsakymai turi `no-store`; automatinio užklausų kartojimo nėra.
- Paieškos puslapio srautinio HTML atsakymo būsena nėra JSON API klaidų kodo
  garantija; HTTP kodams tikrinti naudoti `/api/artworks`.
- Naudojami originalūs metaduomenys; lietuviški terminai automatiškai neverčiami.
  Nurodytas muziejus ir jo naudojimo sąlygos. Raktų ir mokamų paslaugų nėra.

## Patikros ir tikri duomenys

| Scenarijus | Tikėtasi | Faktinis rezultatas |
| --- | --- | --- |
| `GET /api/artworks?q=monet` | Vieši Monet paieškos rezultatai | 46 rezultatai, pirmame puslapyje 9; tarp ID 16568 |
| `GET /api/artworks?artist=Vincent+van+Gogh` | Tik šio autoriaus rezultatai | 19 rezultatų; visi 9 pirmo puslapio įrašai – Vincent van Gogh |
| `GET /api/artworks?q=bedroom&artist=Vincent+van+Gogh` | Abu kriterijai taikomi kartu | 1 rezultatas, ID 28560 |
| Paieškos ID → B detalių API | Tas pats kūrinys | ID 28560, „The Bedroom“ |
| B vaizdo API | Tikras JPEG | HTTP 200, image/jpeg, 235077 baitų |
| Neatitinkantis paieškos tekstas | Sėkmė su 0 rezultatų | 0, lietuviškas paaiškinimas naršyklėje |
| Tuščia / per ilga / pasikartojanti įvestis, puslapis 0 | HTTP 400 | `invalid_query`, muziejus nekviečiamas |
| Forma ir du greiti submit | Viena paieškos navigacija, vienas rezultatas | PASS, tiksliai 1 navigacijos užklausa pagal tinklo įvykius |
| Vaizdo klaida ir pakartojimas | Rezultatai išlieka, vaizdą galima įkelti | Blokuotas vaizdas pateikia klaidą; atblokavus įsikrauna tikras vaizdas |
| Kortelė → detalės | B puslapis ir jo tyrimo forma | Atveriamas 28560, autorius ir tyrimo forma išlieka |
| Kitas puslapis | Kriterijus išlieka URL | `q=monet`, page=2 ir antro puslapio turinys |
| 375 ir 1440 px | Be horizontalaus perpildymo | PASS, vienas main, įvestys turi etiketes |

Vienetiniai testai: **81 PASS, 0 FAIL** (68 esami B testai ir 13 naujų paieškos).
Tikrinami ir imituoti 403/404/429/500, tinklo bei laiko sutrikimai, netinkamas JSON,
per didelis srautas, dublikatai ir netinkamos vaizdų teisės. Jie nesukelia tikrų
429 ar mokamų užklausų. Lint, TypeScript ir produkcinis surinkimas praėjo.
Pirmas Edge scenarijaus bandymas sustojo, nes laukimo sąlyga grąžino DOM objektą
vietoje loginės reikšmės. Scenarijus pataisytas; nesėkmingas paleidimas nelaikomas
praėjusia patikra. Galutinėje surinktoje versijoje: **17 paieškos integracijos
patikrų PASS, 0 FAIL** ir **20 pagrindo regresijos patikrų PASS, 0 FAIL**.
Patvirtinta ir galimybė pakartoti tą pačią paiešką. Šių skirtingos apimties
testų procentas nelaikomas visos programos patikimumo matu.
Desktop ekrano kopija peržiūrėta; ji laikoma OS laikiname patikros profilyje.

## Failai

- `src/app/explore/page.tsx`, `loading.tsx`: puslapis, būsenos ir puslapiavimas.
- `src/components/artwork/search-form.tsx`, `search-card.tsx`: forma ir kortelės.
- `src/app/api/artworks/route.ts`: naujas paieškos JSON adresas.
- `src/lib/artic.ts`: tik papildytas paieškos funkcijomis; B funkcijų realizacijos nekeistos.
- `src/types/artwork-search.ts`: paieškos duomenų ir klaidų tipai.
- `tests/artwork-search.test.mjs`: serverio duomenų ir klaidų testai.
- `scripts/check-search-browser.mjs`: tikras vietinis integracijos scenarijus.
- `src/app/page.tsx`: pasenusi žinutė apie būsimą paiešką pakeista jos naudojimo aprašu.
- `README.md`, `docs/integration-contract.md`, ši ataskaita: dabartinė būklė ir perdavimas.

## Kaip pakartoti ir parodyti

Priklausomybės nekeistos, `npm ci` šiame etape nekartotas. Naudotas 1 etape
patikrintas diegimas. Naujoje kopijoje prieš patikras vykdyti `npm.cmd ci`.

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Tuomet atskirame terminale (laisvame 3188 prievade):

```powershell
node --use-system-ca node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3188
```

Kitame terminale:

```powershell
node scripts/check-search-browser.mjs http://127.0.0.1:3188
node scripts/check-foundation-browser.mjs http://127.0.0.1:3188
```

`--use-system-ca` reikalingas šio kompiuterio sertifikatų aplinkai; TLS tikrinimas
neišjungiamas. Naršyklės scenarijus leidžia tik vietinį HTTP serverį, naudoja
atskirą Edge profilį ir tikrą viešą muziejaus API. Įprastame `npm test` tinklo nėra.
Rankinis kelias: `/explore` → raktažodis Monet → paieška; tada tik autorius;
tada bedroom + Vincent van Gogh → The Bedroom → B detalės.

## Git ir partneris

Pakeitimai vietiniai, neįtraukti į staging. Atskiro leidimo commit ir push nebuvo.
Prieš juos peržiūrėti `git status`, konkrečius diff, paslaptis ir tik tada
pasirinktų failų staging bei `git diff --cached --check` / `git diff --cached`.
Siūloma commit žinutė: `feat: prijungti muziejaus paiešką ir autoriaus filtrą`.
Tai pasiūlymas, ne leidimas vykdyti commit. Po atskirai patvirtinto publikavimo
partneris galės pasiimti A šaką ir pakartoti scenarijus prieš bet kokį PR jungimą.
B neturi perrašyti `src/lib/artic.ts` savo senesne kopija: čia pridėtos naujos funkcijos.

## Likę klausimai ir kitas etapas

Tai nėra 99 % patikimumo arba gamybinio saugumo garantija. 100 reprezentatyvių
bandymų, fiziniai telefonai, kitos naršyklės, pilnas prieinamumas ir produkcija
netikrinti. Prieš publikavimą lieka suderinti AIC-User-Agent kontaktą, viešų
adresų piktnaudžiavimo ribojimą bei stebėseną. Dabartinis UI deduplikavimas
neatstoja serverio kvotų apsaugos. Lieka ankstesnis modulių perspėjimas ir
dokumentuotas ESLint palaikymo klausimas; paketai automatiškai neatnaujinami.

Kitas etapas tik gavus „PATVIRTINU 3 ETAPĄ“: Supabase SSR autentifikacija,
SQL migracijos, paskyros saugojimo adapteriai ir dviejų naudotojų RLS patikros.
Tikriems debesijos duomenims, migracijoms ar išteklių kūrimui reikės atskiro leidimo.
