# Kūrėjas A: 1 etapas – esamo pagrindo perėmimas

Data: 2026-11-16. Šis etapas patvirtintas komanda „PATVIRTINU 1 ETAPĄ“.
Apimtis: perimti jau sukurtą projektą, patikrinti pagrindą ir paruošti A darbo šaką.
Paieška, Supabase, Gemini ir diegimas šiame etape neįgyvendinami.

## Kas atlikta

- Tiesioginė `git ls-remote --symref origin HEAD "refs/heads/*"` patikra patvirtino
  vieną nuotolinę šaką `feature/developer-b`; ji yra ir numatytoji šaka.
- Pradinis commit: `f62e47586aa506657c842617b9fecd14d46c5bcb` („Pakeistas package-lock.json“).
  Vietinė ir nuotolinė B šakos patikros metu sutapo.
- Prieš darbą darbinis katalogas buvo švarus. Anksčiau rastas lock failo
  pakeitimas jau įtrauktas į pradinį commit; atstatymo ar atsarginės kopijos neprireikė.
- Nuo šio commit sukurta tik vietinė `feature/developer-a-foundation` šaka.
- Projekto inicializavimas nekartotas. B detalės, kolekcija, formos, tyrimai,
  vertimai, dizainas, priklausomybės ir duomenų sutartys nekeisti.
- Perskaitytas `AGENTS.md` ir įdiegto Next.js diegimo bei Node serverio vadovai.
- Patikrintas produkcinis surinkimas ir vietinis serveris `127.0.0.1:3187`.
- Pridėtas pakartojamas pagrindo HTTP ir Edge scenarijus be papildomų paketų.

## Aplinka ir diegimas

Windows, PowerShell, Node.js 26.13.0, npm 12.2.2, Next.js 16.4.6.
Ankstesnis projekto README mini npm 11; ši patikra atlikta su jau įdiegtu npm 12.
Paketų ar npm versijos šio etapo metu nekeistos.

Naudotojas šiame kataloge jau įvykdė `npm.cmd ci`. Vietinis npm žurnalas
`2026-11-16T16_32_35_390Z-debug-0.log` patvirtino komandą ir `exit 0`.
Ankstesni bandymai baigėsi `EPERM`, nes nepavyko pašalinti native priklausomybės.
Agentas sėkmingo diegimo nekartojo; testai ir surinkimas naudojo esamą diegimą.
Diegimo sėkmė savaime nepatvirtina saugumo audito išvadų.

## Patikrų rezultatai

| Patikra | Tikėtasi | Faktinis rezultatas |
| --- | --- | --- |
| `npm.cmd run lint` | Be lint klaidų | PASS, exit 0 |
| `npm.cmd run typecheck` | Sugeneruoti maršrutų tipai, be TS klaidų | PASS, exit 0 |
| `npm.cmd test` | Visi esami vienetiniai testai praeina | 68 PASS, 0 FAIL |
| `npm.cmd run build` | Sėkmingas produkcinis surinkimas | PASS, exit 0 |
| `/`, `/explore`, `/collection`, `/investigations`, `/login` | HTTP 200, LT dokumentas ir antraštė | 5 PASS |
| `/neegzistuojantis-puslapis` | HTTP 404 ir lietuviškas paaiškinimas | PASS |
| `/api/artworks/abc` | HTTP 400, `invalid_id` | PASS |
| Šeši puslapiai po 375 ir 1440 px | Vienas main ir h1, lang=lt, teisingos navigacijos nuorodos, nėra horizontalaus perpildymo | 12 PASS |
| Klaviatūros pirmas Tab pradiniame puslapyje | Fokusas ant turinio praleidimo nuorodos | PASS |

Galutinis pagrindo scenarijus: **20 PASS, 0 FAIL**, įskaitant 7 HTTP patikras.
Tai nėra 100 reprezentatyvių viso produkto bandymų ar 99 % patikimumo vertinimas.
Vienetiniai testai naudoja imituotus išorinių paslaugų atsakymus.

Pirmas laikinas HTTP scenarijus sustojo ties lietuviško teksto palyginimu,
perduodamu per PowerShell stdin; galutinis UTF-8 failas šią patikrą praėjo.
Apribotoje aplinkoje pirmas Edge bandymas baigėsi `Page.enable` laiko klaida.
Galutinis scenarijus paleistas su išplėstine prieiga ir praėjo; nesėkmingi
ankstesni paleidimai nepriskirti prie sėkmingų patikrų.
GitHub ryšys taip pat veikė su išplėstine prieiga.

## Kaip pakartoti

Kai projekto serveriai sustabdyti, prireikus įdiegti priklausomybes:

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Atskirame terminale paleisti surinktą versiją laisvame prievade:

```powershell
npm.cmd run start -- --hostname 127.0.0.1 --port 3187
```

Kitame terminale:

```powershell
node scripts/check-foundation-browser.mjs http://127.0.0.1:3187
```

Scenarijus naudoja įdiegtą Edge su `--headless=new`, tik vietinį adresą ir atskirą
OS laikiną profilį. Naudotojo naršyklės kolekcija neliečiama, paketai nediegiami,
bandymo naršyklė uždaroma, profilis paliekamas OS temp kataloge.
Jei Edge kitur, nustatyti `ARTMYSTERY_BROWSER_PATH`.
Ranka atverti tuos pačius puslapius ir patikrinti išdėstymą bei Tab navigaciją.

## Failai ir bendro darbo ribos

- `scripts/check-foundation-browser.mjs`: vietinis pagrindo patikros scenarijus.
- `docs/phase-1-a-report.md`: A perdavimo rezultatai ir tolesnių etapų ribos.
- B programos ir bendri konfigūracijos failai nekeisti.
- A peržiūrėjo `docs/integration-contract.md` ir priima esamus adresus, tipus,
  temos žetonus bei adapterių atskyrimą kaip tolesnio darbo pagrindą.
  Tai nėra B patvirtinimas: prieš keičiant bendrus failus reikia suderinti darbus.
- A paieška naudos esamą `/artwork/[id]` ir `src/lib/artic.ts`.
- Paskyros saugyklos įgyvendins esamus repository tipus, o Gemini paslauga –
  `InvestigationService`. Demo įrašai automatiškai į paskyrą nekeliami.

## Git veiksmai ir partneris

Commit, push, merge, pull, deploy ar debesijos pakeitimai nevykdyti.
Nuotolinė A šaka nesukurta. Naujo commit identifikatoriaus nėra.
Prieš siūlomą commit patikrinti `git status`, konkrečius failus ir paslapčių nebuvimą.
Tik gavus atskirą leidimą commit būtų galima paruošti taip:

```powershell
git add -- docs/phase-1-a-report.md scripts/check-foundation-browser.mjs
git diff --cached --check
git diff --cached
```

Siūloma commit žinutė: `chore: patikrinti Kūrėjo A projekto pagrindą`.
Šios komandos čia tik pasiūlytos. Push ir jungimui reikės atskirų leidimų.
Partneris šių vietinių pakeitimų GitHub dar nemato. Paskelbus patvirtintą šaką,
partneris turėtų ją peržiūrėti atskiroje šakoje ir pakartoti nurodytas patikras.
Nekeisti bendrų failų lygiagrečiai; main kūrimą ir PR bazę suderinti atskirai.

## Ribos ir kitas etapas

Neatlikta: GitHub bendradarbių rašymo teisių, Actions vykdymų, apsaugų ar kvotų
patikra; tikra muziejaus paieška ir vaizdai; autentifikacija; Supabase ir dviejų
naudotojų RLS; Gemini; fiziniai telefonai; pilnas WCAG auditas; Vercel.
Viešo paskelbimo URL nėra.
Lieka ankstesnis `MODULE_TYPELESS_PACKAGE_JSON` perspėjimas ir B dokumentuose
užfiksuotas ESLint palaikymo klausimas. Priklausomybės šio etapo metu neatnaujintos.

Kitas etapas tik gavus „PATVIRTINU 2 ETAPĄ“: raktažodžių paieška ir autoriaus
filtravimas, rezultatų kortelės, perėjimas į esamas B detales, loading/empty/error
būsenos, trys tikros paieškos ir ID perdavimo į detales demonstravimas.
