# 2 etapo Kūrėjo B ataskaita

Data: 2026-11-16. Aplinka: Windows / PowerShell, Node.js 26.13.0, npm 11.20.0,
Next.js 16.4.6. Šaka `feature/developer-b`, bazinis commit `c7f2d8c`.
Šio etapo pakeitimams naujas commit nesukurtas, push, merge ir deploy nevykdyti.

## Kalbos pasirinkimo papildymas

Pridėti „Lietuviškai / Originalo kalba“ mygtukai ir vietinis neoficialus Monet
kūrinio 16568 muziejaus teksto vertimas. Originalūs API duomenys išsaugoti.
Vertimų neturintiems kūriniams rodoma aiški originalo būsena; nėra automatinio
visų kūrinių vertimo ar papildomų mokamų užklausų. Pasikeitus šaltiniui senas
vertimas atmetamas pagal jo atspaudą.

Nauji / pakeisti failai ir integracijos sutartis aprašyti
`docs/developer-b-artwork-details.md` skyriuje „Kūrinio teksto kalbos pasirinkimas“.

Naujausios patikros: **26 testai PASS, 0 FAIL**, lint, TypeScript ir build PASS.
Tikroje Edge naršyklėje LT → originalas → LT perjungimai ir technikos tekstas PASS.
375 / 1440 px pločiai be horizontalaus slinkimo PASS. Sulaukus atsisiuntimo pabaigos,
tikras paveikslas naršyklėje taip pat įkeltas (HTTP 200 JPEG, naturalWidth 843).
Toliau aprašyti ankstesni NOT VERIFIED vaizdo ir pločių punktai yra istoriniai;
dabartinę būseną nurodo šis papildymas. Pilna klaviatūros ir prieinamumo patikra
dar neatlikta. Naudotojo dev serveris ir naršyklės profilis nepakeisti.

## Paveikslo įkėlimo pataisa po naudotojo patikros

Naudotojas patvirtino, kad paveikslas naršyklėje neįsikėlė. Tiesioginės užklausos
buvo blokuojamos, tačiau įprasta Node užklausa su AIC-User-Agent gavo 200 JPEG.
Pridėtas `/api/artworks/[id]/image` serverio adresas; naršyklė vaizdą gauna iš jo.
Metaduomenys ir teisės tikrinami iš naujo, šaltinis tik iš patikrinto muziejaus
atsakymo; neleidžiami vartotojo URL ar peradresavimai. Tikrinamas MIME tipas,
JPEG pradžia, dydis (iki 8 MiB) ir laikas (15 s), taikomas viešas 1 val. podėlis.
Komponente pridėtas paveikslo įkėlimo pakartojimo mygtukas.

Po pataisos faktiškai atlikta:

- `npm test`: **23 PASS, 0 FAIL**, įskaitant 7 naujus vaizdo testus.
- Lint, TypeScript ir produkcinis surinkimas (`npm run build`): PASS.
- Veikiančiame naudotojo serveryje `localhost:3000` image adresas: HTTP 200,
  `image/jpeg`, 278626 baitų. sharp sėkmingai dekodavo tikrą 843 × 809 JPEG.
- Puslapio `<img>` naudoja vietinį image adresą: PASS.
- Netinkamas vaizdo ID: HTTP 400, `no-store`; POST: HTTP 405. Abu PASS.
- Vizualus naršyklės vaizdas po pataisos: dar reikia naudotojo patvirtinimo.

Tai papildo toliau pateiktą pirminę etapo ataskaitą; ankstesni tiesioginio
vaizdo 403 rezultatai nepanaikinami. Naudotojo paleistas dev serveris nestabdytas.

## Kas atlikta

Tik B detalių dalis: `/artwork/[id]` ir `GET /api/artworks/[id]`, tikri muziejaus
duomenys, IIIF vaizdo komponentas, šaltinis ir teisės, trūkstami duomenys,
įkėlimo, nerasto kūrinio, vaizdo klaidos ir API klaidos būsenos.
Pridėti vykdymo metu tikrinami duomenys ir `Artwork` integracijos tipai.
Paieška, autentifikacija, Supabase, Gemini ir diagnostika nepradėti.

Originalūs muziejaus tekstai neverčiami ir aiškiai pažymėti kaip šaltinio duomenys.
DI nenaudojamas. Kolekcijos ar tyrimų imitacijų šiame etape dar nereikia.

## Pakeisti ir sukurti failai

| Failas | Paskirtis |
| --- | --- |
| `src/types/artwork.ts` | Duomenų ir rezultatų TypeScript sutartys |
| `src/lib/artic.ts` | Tikrinimas, normalizavimas, užklausos ir klaidos |
| `src/app/artwork/[id]/page.tsx` | Kūrinio detalės ir muziejaus pasakojimas |
| `src/app/artwork/[id]/loading.tsx` | Prieinama įkėlimo būsena |
| `src/app/artwork/[id]/not-found.tsx` | Nerasto / netinkamo ID turinys |
| `src/app/artwork/[id]/error.tsx` | Nenumatytos klaidos riba |
| `src/app/api/artworks/[id]/route.ts` | GET detalių API |
| `src/app/api/artworks/[id]/image/route.ts` | Patikrinto muziejaus JPEG pateikimas per mūsų serverį |
| `src/components/artwork/artwork-image.tsx` | Tikras vaizdas arba aiškus paaiškinimas |
| `src/components/artwork/artwork-retry.tsx` | Pakartojimas su neaktyviu mygtuku užklausos metu |
| `tests/artic.test.mjs` | 23 izoliuoti tikrinimo, klaidų ir vaizdo testai |
| `package.json` | Tik pridėta `test` komanda |
| `.github/workflows/checks.yml` | Pridėtas testų paleidimas būsimiems PR |
| `README.md` | Dabartinė būsena, paleidimas ir patikros |
| `docs/integration-contract.md` | Papildyta B integracijos informacija |
| `docs/developer-b-artwork-details.md` | Konkreti sutartis A paieškai ir API |
| `docs/phase-2-report.md` | Ši ataskaita |

Priklausomybės ir `package-lock.json` nekeisti. A paieškos bei prisijungimo
puslapiai, bendri stiliai ir Next konfigūracija nekeisti.

## Faktiškai atliktos patikros

| Patikra | Rezultatas |
| --- | --- |
| `git fetch origin` ir nuotolinių šakų palyginimas | PASS: A naujo kodo nėra, remote vis dar `c7f2d8c` |
| Tikra paieška `monet` → ID 16568 → detalių užklausa | PASS: gauti Monet kūrinio duomenys ir teisės |
| `npm test` | PASS: 16 PASS, 0 FAIL, jokių tinklo užklausų |
| `npm run lint` | PASS, 0 klaidų / įspėjimų |
| `npm run typecheck` | PASS |
| `npm ci --no-audit --no-fund` | PASS |
| `npm run build` | PASS: dinaminis puslapis ir API surinkti |
| Produkcinis serveris 127.0.0.1:3100 | PASS |
| `GET /api/artworks/16568` | PASS: 200, ID, autorius, pavadinimas, tikras IIIF URL, paprastas tekstas |
| `GET /artwork/16568` | PASS: 200, tikri duomenys, vaizdo URL ir šaltinio licencija HTML atsakyme |
| `GET /api/artworks/abc` | PASS: 400, `invalid_id`, `no-store` |
| `GET /api/artworks/999999999` | PASS: 404, `not_found` |
| `GET /artwork/abc` | PASS: lietuviškas nerasto kūrinio turinys (HTTP 200 dėl srautinio įkėlimo) |
| `POST /api/artworks/16568` | PASS: 405 |
| `GET /` | PASS: 200 |
| Tikro IIIF paveikslo HEAD ir GET iš terminalo | FAIL / aplinkos apribojimas: Cloudflare 403 |
| Tikro paveikslo rodymas naršyklėje | NOT VERIFIED |
| 375 px / 1440 px vizualinė peržiūra ir klaviatūra | NOT VERIFIED: nėra naršyklės valdymo įrankio |
| GitHub Actions | NOT VERIFIED: vietiniai pakeitimai neįkelti |
| Paslapčių požymių paieška 35 failuose | PASS po peržiūros: vienas sintetinės neleistino URL testinės įvesties radinys, 0 neišspręstų radinių |

Galutiniai vietiniai HTTP scenarijai: **7 PASS, 0 neišspręstų scenarijų klaidų**.
Pirmas vykdymas: 5 PASS, 2 FAIL dėl PowerShell į Node siunčiamų lietuviškų
testavimo simbolių pakeitimo į `?`. Pakartojus tas dvi patikras su Unicode kodais,
abi praėjo; programos failai dėl šios priežasties nekeisti.
Tai nėra 99 % patikimumo įvertinimas ar viso projekto priėmimas.

Testų paleidimas pateikė Node `MODULE_TYPELESS_PACKAGE_JSON` įspėjimą:
Node atpažįsta mūsų TypeScript failą kaip ES modulį. Testai praėjo; globalus
projekto modulio režimas nekeistas, kad nebūtų netikėtai paveiktas A kodas.
`npm ci` pateikė jau dokumentuotą ESLint 9 nepalaikomos versijos įspėjimą.

## Kaip patikrinti

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Atverti http://localhost:3000/artwork/16568. Patikrinti paveikslą, visus duomenis,
nuorodą į muziejų ir http://localhost:3000/artwork/abc.
Paslėpti paveikslo užklausą naršyklės tinklo priemonėmis, patikrinti atsarginę būseną.
Įvertinti 375 px / 1440 px ir Tab navigaciją.
Jei paveikslas gauna 403 ir įprastoje naršyklėje, tai lieka išorinio šaltinio
prieinamumo defektas. Jo nepažymėti kaip sėkmingo paveikslo rodymo.

Patikrų serveris sustabdomas baigiant darbą. Mokamų užklausų, raktų ar debesijos
pakeitimų nebuvo. Patikros naudojo tik viešą muziejaus API ir vietinius testus.

## Git ir perdavimas A

Failai neįtraukti į indeksą, commit ir push šiame etape nevykdyti. Gavus atskirą
leidimą pirmiausia peržiūrėti `git status`, konkrečių pakeitimų `git diff` ir
įtrauktų failų `git diff --cached`, dar kartą patikrinti paslaptis.
Siūloma commit žinutė: `feat: pridėti muziejaus kūrinio detales`.

A paieškos kortelėje naudoti `<Link href={\`/artwork/${result.id}\`}>`.
Peržiūrėti `docs/developer-b-artwork-details.md`; detalių gavimo nekopijuoti
į paieškos puslapį. Po atskiro patvirtinto push A galės peržiūrėti šakos pakeitimus
ir pakartoti testus savo aplinkoje. Prieš sujungimą reikalinga PR peržiūra.

## Likę darbai ir kitas etapas

B detalių kodas ir duomenų kelias patikrinti. Vaizdo rodymas tikroje naršyklėje ir
vizualus pritaikymas dar nepatikrinti, todėl viso 2 etapo priėmimas dalinis.
A paieška taip pat dar neprijungta. Iki kito etapo reikia užfiksuoti vaizdo
patikros rezultatą ir gauti atskirą patvirtinimą.

Kitas B darbas: asmeninės kolekcijos sąsaja su aiškiai pažymėtu demonstraciniu
adapteriu, kategorijomis bei pastabomis. Tikrą autentifikaciją, Supabase saugojimą
ir RLS prijungs A; demonstracinės kolekcijos nelaikyti paskyros duomenimis.
