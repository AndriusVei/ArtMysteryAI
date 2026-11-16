# 4 etapo baigiamoji integracijos patikra

2026-11-16–17. Vartotojas paprašė užbaigti 4 etapą ir atskirai leido iki dviejų
papildomų `gemini-4-hydrogen` generavimo užklausų: 3 ir 5 klausimai, iki 6000
išvesties tokenų ir 25 s kiekvienai, be automatinio kartojimo. Leista naudoti ir
po patikros pašalinti dvi izoliuotas Supabase bandymo paskyras be laiškų.

**4 etapo funkcinis priėmimas užbaigtas.** Po dviejų nesėkmingų `gemini-4-hydrogen`
bandymų vartotojas atskirai patvirtino `gemini-3.5-flash-lite` ir dar vieną
5 klausimų bandymą. Jis sėkmingai praėjo visą tikro generavimo ir paskyros srautą.
Įprastas generavimas lieka išjungtas, nes leidimai apėmė tik ribotus bandymus.

## Bandymo paruošimas

`scripts/check-ai-live.mjs` sukuria laikinus naudotojus, jungiasi per tikrą
prisijungimo formą ir naudoja esamus B komponentus atskirose Edge sesijose.
Admin raktas tik stdin / proceso atmintyje; nėra failuose ar išvestyje.
`scripts/ai-test-server.mjs` paleidžia tik izoliuotą vietinį serverį 3194 prievadu.
Transportas riboja tikrų Gemini kvietimų skaičių; SDK retries / tęsiniai išjungti.

Kad nestabdytume vartotojo veikiančio Next dev proceso ir nekeistume jo build,
šaltiniai bei vieši failai kopijuojami į Git ignoruojamą `.next/phase4-workspace`.
`.env` ir `.git` nekopijuojami. `node_modules` pasiekiamas per junction;
serverio raktai perduodami tik proceso aplinkoje. Live jungiklis įjungiamas tik
šio serverio procese. Įprastas `.env.local` lieka su `AI_LIVE_ENABLED=false`.

Pradiniai bandymai sustojo iki modelio kvietimo dėl Next dev vieno proceso
užrakto ir nesutapusio dev serverio hostname. Pastarasis blokavo HMR ir
klientinių komponentų inicializavimą. Izoliuotas katalogas ir `127.0.0.1`
hostname išsprendė bandymo aplinką. Šie nesėkmingi paleidimai Gemini nekvietė;
visos jų laikinos paskyros pašalintos.

## Praėjęs visas srautas su imituotu modeliu

`ARTMYSTERY_AI_FIXTURE_ONLY=YES` pakeičia tik testinio serverio modelio transportą.
Visi tikri Gemini kvietimai šiame režime užblokuoti; modelio atsakymas yra aiškiai
testinis JSON. Produkciniame kode mock režimo ar automatinio fallback nepridėta.
Supabase, autentifikacija, muziejaus duomenys, API, parašas ir UI buvo tikri.

**16 PASS, 0 FAIL; tikrų modelio kvietimų 0.** Patikrinta:

- Dvi atskiros prisijungusios paskyros ir iš pradžių tušti tyrimų sąrašai.
- Kūrinio 27954 išsaugojimas į kolekciją per `127.0.0.1` be ankstesnio 403.
- 3 ir 5 klausimų tyrimai su skirtingais lygiais / režimais; fokusas perkeliamas
  į rezultatą, juodraštis nepatenka į išsaugotų tyrimų sąrašą.
- Tas pats idempotency raktas grąžina tą patį rezultatą be naujo modelio kvietimo.
- Išsaugojimas per UI, pakartotinis save nekeičia datos ir nekuria dublikato.
- Kita paskyra nemato, negali išsaugoti ar pašalinti svetimo tyrimo; abi kryptys.
- Perkrovus lieka visas rezultatas ir prašyti 3 / 5 klausimai; atskirti muziejaus
  duomenys bei interpretacijos; rodinys telpa 375 ir 1440 px pločiuose.
- Šalinimo atšaukimas / patvirtinimas, tik savininko įrašo pašalinimas, kitos
  paskyros tyrimo išsaugojimas; atsijungus API grąžina 401.

Tai ne tikro modelio turinio ar 5 klausimų Gemini atsakymo kokybės patikra.

## Tikri generavimo bandymai

| Bandymas | Tikrų modelio kvietimų | Rezultatas |
| --- | --- | --- |
| 3 klausimai per `/api/ai` | 1 | Programos API 503 `unavailable`; upstream HTTP atskirai dar nefiksuotas |
| 5 klausimai per `/api/ai` | 1 | Patvirtintas Google API HTTP 503; programos API 503 `unavailable` |
| 5 klausimai su atskirai patvirtintu `gemini-3.5-flash-lite` | 1 | PASS: tikras generavimas ir visas paskyros srautas, 10 patikrų |

Pirmas nesėkmingas 3 klausimų bandymas automatiškai nekartotas. Diagnostika su
fixture modelio kvietimų nesunaudojo; antras bandymas apribotas likusiu vienu
kvietimu ir skirtas penkiems klausimams. Bendra papildomų kvietimų riba **2/2**
neviršyta. Vėliau gautas naujas atskiras leidimas **1/1** kvietimui su
`gemini-3.5-flash-lite`, jis panaudotas tik vienam sėkmingam generavimui.
Ankstesnis atskirai patvirtintas standalone 3 klausimų bandymas lieka
PASS, aprašytas `phase-4-gemini-acceptance.md`.

Google [API klaidų dokumentacija](https://ai.google.dev/gemini-api/docs/api-errors)
503 apibūdina kaip laikiną paslaugos perkrovą / neprieinamumą. Konkreti šių
užklausų tiekėjo priežastis iš privataus body neregistruota; visuotinis sutrikimas
nepatvirtintas. Viešo API domeno HEAD be rakto atsakė 404 — tai tik TLS / tinklo
ryšio patikra, ne modelio veikimo įrodymas ir ne generavimo kvietimas.

## Galutinės vietinės patikros ir valymas

- 115 vienetinių testų PASS; lint PASS.
- Izoliuoto kodo produkcinis `next build --webpack` PASS, įskaitant TypeScript.
  Build vykdytas be kopijuoto `.env.local`, todėl tai surinkimo patikra, ne
  produkcinės autentifikacijos konfigūracijos ar Vercel priėmimas.
- Tikra baigiamoji DB užklausa: bandymo paskyrų 0, jų tyrimų 0, aktyvių AI
  užraktų 0. Tik savo bandymo paskyros šalintos; asmeninės paskyros nenaudotos.
  Kvotų skaitikliai neatstatyti; bandymai kvotą sunaudoja ir nesėkmės atveju.
- Įprasto `.env.local`: `AI_STORAGE_ENABLED=true`, `AI_LIVE_ENABLED=false`.
- Commit, push, merge, deploy ir mokėjimo įjungimo nevykdyta. 5 etapas nepradėtas.

## Tikro rezultato priėmimas ir turinio ribos

Tikras `gemini-3.5-flash-lite` rezultatas: **10 PASS, 0 FAIL**, vienas modelio
kvietimas. 5 klausimai, expert / symbolism parametrai, juodraščio atskyrimas,
pakartojimas su tuo pačiu raktu, išsaugojimas, nepakitusi pakartotinio save data,
svetimo skaitymo / išsaugojimo / šalinimo draudimas, perkrovimas, 375 / 1440 px,
šalinimo atšaukimas ir patvirtinimas, atsijungus 401. Po jo valymo būklė dar kartą
tikrinta tikroje DB: bandymo paskyrų 0, jų tyrimų 0, aktyvių užraktų 0.

Sąsajoje peržiūrėtos realaus rezultato interpretacijų, penkių klausimų,
galimų atsakymų ir santraukos dalys. Tekstas lietuviškas, akcentuoja hipotezes,
šaltinis rodomas atskirai, muziejaus faktų bloką sudaro serveris. Tai vieno
pavyzdžio peržiūra, ne visų modelio istorinių teiginių patvirtinimas.

Pastebėtos kokybės ribos: „murals“ vietomis pavadinta freskomis; vienos
1903–1908 m. darbų grupės datos priskirtos platesnei serijai; apraše nepateikta
informacija vietomis apibendrinta kaip visuotinė dokumentavimo stoka.
Po peržiūros vietinė sisteminė instrukcija patikslinta, kad išlaikytų meno
terminų reikšmę ir šaltinio teiginio apimtį. Po šio teksto patikslinimo vienetiniai
testai, lint, typecheck ir surinkimas patikrinti, bet naujas tikras generavimas
nedarytas, nes papildomas leidimas jau panaudotas. Poveikis turinio kokybei dar
nepatvirtintas. Platesnis turinio ir klaidų vertinimas lieka 5 / 6 etapams.

Dabartinis vietinis modelis — vartotojo patvirtintas `gemini-3.5-flash-lite`.
[Google kainodaroje](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite)
nurodyta nemokama įvestis / išvestis Free pakopoje,
[modelio dokumentacijoje](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite)
patvirtintas struktūruotas JSON. Raktas šiam modeliui realiame bandyme priimtas;
paskyros billing neadministruotas. Bet kokiems naujiems modelio bandymams ar
įprasto generavimo įjungimui reikia naujo leidimo. 5 etapas nepradėtas.
