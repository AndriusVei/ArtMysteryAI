# Kūrėjo B DI parametrų sąsaja

## Apimtis

Kūrinio puslapyje, po muziejaus pasakojimo, pridėta „Meno detektyvo“ forma:

- Žinių lygis: Vaikui / Pradedančiajam / Ekspertui.
- Režimas: Detektyvinė paslaptis / Istorinis pasakojimas / Simbolikos analizė.
- Ilgis: 3 arba 5 klausimai.
- Neprivalomas papildomas prašymas iki 1000 ženklų.

Kūrinio ID ir demo metaduomenys gaunami iš atverto puslapio, nereikia jų kopijuoti.
UI lietuviška, šaltinio kūrinio duomenys gali būti ta kalba, kuri pasirinkta
detalių puslapyje. Įvestys ir sugeneruotas pavyzdys šiame etape nesaugomi.
Formoje ir atsakyme aiškiai pažymėtas demonstracinis režimas.

`src/lib/investigation.ts` pateikia vietinį mokomąjį šabloną – tai nėra Gemini,
meno vaizdo analizė ar savarankiškas istorinis tyrimas. Lygis pakeičia klausimų
stilių, režimas – jų temą, ilgis – tikslų skaičių. Papildomas prašymas parodomas
kaip tekstas, bet šablone neapdorojamas; šis apribojimas matomas formoje.
Demo neturi tinklo užklausų, modelio rakto ar mokamos alternatyvos.

## TypeScript sutartys A integracijai

`src/types/investigation.ts`:

```ts
interface InvestigationRequest {
  artworkId: number;
  knowledgeLevel: "child" | "beginner" | "expert";
  investigationMode: "detective_mystery" | "historical_storytelling" | "symbolism_analysis";
  questionCount: 3 | 5;
  userPrompt: string;
}
```

`ResearchSettings` aprašo tris privalomus pasirinkimus.
`InvestigationService` aprašo asinchroninį `generate(request, signal)` ir demo / live
režimą. Demo adapteris yra `createDemoInvestigationService(artwork)`.

`InvestigationResponse` sudaro mode, normalizuota request, ISO generatedAt ir result:
title, introduction, historicalContext (tekstai su šaltiniais), observations,
questions (question + suggestedAnswer), summary.

`validateInvestigationRequest` tikrina tik leistinas literalų reikšmes, teigiamą
skaitinį ID ir prašymo ilgį, apkarpo jo kraštinius tarpus. Nenaudojama įvesties
objektų konversija į String leistinoms reikšmėms apeiti.
`validateInvestigationResponse` tikrina struktūrą, laukų ribas, tikslų 3 / 5
klausimų skaičių, pasirinktų parametrų atitikimą, datą ir šaltinio URL.
Jis NEPATVIRTINA istorinių teiginių tiesos. Dabartinės demo faktų eilutės sudaromos
tik iš realių puslapio metaduomenų, nepridedant trūkstamų istorijų.
Visas turinys rodomas kaip React tekstas; HTML nevykdomas.

## Ką prijungia A

A valdo `POST /api/ai`, Gemini SDK, raktus, autentifikaciją ir serverio limitus.
B šių failų ar infrastruktūros nekūrė. A galės pateikti live paslaugos adapterį
ir sąmoningai pakeisti dabartinio demo pasirinkimą bei režimo tekstus.
Joks automatinis perjungimas į realų modelį dabar nevyksta.

Prieš realią integraciją A turi:

1. Patikrinti tikrą sesiją serveryje ir taikyti per-user / per-IP limitus.
2. Patikrinti parametrus serveryje, pagal artworkId gauti muziejaus metaduomenis;
   nepasitikėti naršyklės siunčiamu autoriaus ar aprašymo tekstu.
3. Grąžinti suderintą JSON, kontroliuoti laiką, dydį, tokenus, 429 ir ribotus
   pakartojimus. Nesiųsti nepatikrinto modelio turinio tiesiai į sąsają.
4. Modelio istorinių teiginių nepateikti kaip muziejaus patvirtintų faktų, jei
   šaltinis jų nepagrindžia. Interpretacijas laikyti atskirai. Jei modelis negavo
   vaizdo, nekurti tariamos vizualinės analizės.
5. Naudoti tik serverio raktą, patikrinti nemokamo naudojimo sąlygas, kvotas ir
   vartojimo ribas. Pirmas realus modelio bandymas reikalauja atskiro leidimo.
   Automatiškai pereiti į mokamą paslaugą negalima.

B UI užklausos metu neleidžia pakartotinio submit, turi AbortSignal sutartį ir
atšaukia užduotį komponentui užsidarius. Backend apsaugų tai neatstoja.
Pakeitus formos parametrus senas pavyzdys pašalinamas, kad nebūtų pateikiamas
kaip naujo pasirinkimo rezultatas. Pasibaigus generavimui fokusas perkeliamas
į rezultato antraštę. Atsakymai prie klausimų išskleidžiami su details / summary.

## Kaip patikrinti

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Atverti `/artwork/16568`, nuslinkti iki „Meno detektyvas“, pasirinkti parametrus
ir pradėti tyrimo pavyzdį. Patikrinti 3 ir 5 klausimus, kitą lygį / režimą,
atsakymų išskleidimą, laukų etiketes ir mobilų išdėstymą.

Izoliuotas naršyklės scenarijus, kai vietinis serveris veikia:

```powershell
node scripts/check-investigation-browser.mjs
```

Jis naudoja įdiegtą Edge atskirame laikiname profilyje. Naudotojo naršyklės
profilis ir duomenys neliečiami, nauji naršyklės paketai neįdiegiami.
Galimi `ARTMYSTERY_BROWSER_PATH` ir vietinis `ARTMYSTERY_TEST_URL`.
Scriptas neleidžia produkcinio URL. Jo duomenys nenaudojami produkto rezultatams.

## Kitas B darbas

Išsaugotų tyrimų sąsaja – atskiras būsimas darbas. Ją prijungiant reikės
aiškiai atskirti demo tyrimų saugojimą nuo A autentifikuoto Supabase saugojimo.
Dabartinis pavyzdys dar nesaugomas į `/investigations`.
