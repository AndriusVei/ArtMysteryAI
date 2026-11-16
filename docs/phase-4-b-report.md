# 4 etapo B dalis: DI parametrų pasirinkimo sąsaja

Data: 2026-11-16. Windows / PowerShell, Node.js 26.13.0, npm 11.20.0,
Next.js 16.4.6. Šaka `feature/developer-b`, bazinis commit `93bb19e`.
Šiame etape naujas commit, push, merge, deploy ar mokama užklausa neatlikti.

## Kas atlikta

Pridėta B forma kūrinio detalių puslapyje: žinių lygis, tyrimo režimas,
3 / 5 klausimai ir neprivalomas iki 1000 ženklų prašymas.
Kūrinio ID susiejamas automatiškai, metaduomenų kopijuoti nereikia.
Rodomas aiškiai pažymėtas vietinis mokomasis pavyzdys su muziejaus duomenimis,
tyrimo ribomis, tiksliai pasirinktu klausimų skaičiumi ir išskleidžiamais atsakymais.

Demo nėra Gemini, vaizdo analizė ar naujas istorinis tyrimas. Papildomas prašymas
rodomas kaip tekstas, tačiau nekeičia šablono; šis apribojimas matomas sąsajoje.
Rezultatas ir prašymas dar neišsaugomi, dingsta atnaujinus puslapį.
Pakeitus parametrus senas pavyzdys pašalinamas, o naujo rezultato antraštė gauna fokusą.

## Nauji ir pakeisti failai

| Failas | Paskirtis |
| --- | --- |
| `src/types/investigation.ts` | Parametrų, užklausos, atsakymo ir service sutartys |
| `src/lib/investigation.ts` | Griežtas įvesties / rezultato tikrinimas ir atskiras demo adapteris |
| `src/components/investigation/investigation-panel.tsx` | Forma, validavimo klaidos ir pavyzdžio peržiūra |
| `src/components/artwork/artwork-details.tsx` | Formos prijungimas kūrinio puslapyje |
| `tests/investigation.test.mjs` | 25 nauji testai, įskaitant 18 parametrų kombinacijų |
| `scripts/check-investigation-browser.mjs` | Izoliuotas Edge scenarijus |
| `docs/developer-b-investigation.md` | Konkreti integracijos sutartis A |
| `README.md`, `docs/integration-contract.md`, ši ataskaita | Būsenos ir patikrų dokumentacija |

A paieška, autentifikacija, `/api/ai`, Gemini serveris ir diagnostika nekeisti.
Supabase, SQL, globalūs stiliai, package.json ir lock failas nekeisti.
Naujų priklausomybių ar raktų nėra.

## Faktiškai atliktos patikros

| Patikra | Rezultatas |
| --- | --- |
| Vietinis git status ir istorija | PASS: pradžioje švaru, bazė 93bb19e |
| Naujausios nuotolinės būsenos fetch | NOT VERIFIED: leidimas nesuteiktas, nebandyta apeiti ar kartoti |
| npm test | 62 PASS, 0 FAIL |
| npm run lint (įskaitant browser scriptą) | PASS |
| npm run typecheck | PASS |
| npm run build | PASS |
| HTTP kūrinio puslapis su forma | PASS: 200, formos laukai ir demo žyma |
| Numatyti pasirinkimai ir demo žyma naršyklėje | PASS |
| Ekspertas / simbolika / 5 klausimai ir greiti paspaudimai | PASS: vienas rezultato blokas, 5 klausimai |
| Papildomo prašymo HTML rodomas kaip tekstas | PASS: script nevykdomas |
| Fokusas perkeliamas į rezultato antraštę | PASS |
| Atsakymo išskleidimas | PASS |
| Pakeisti parametrai pašalina ankstesnį pavyzdį | PASS |
| Vaikas / istorija / 3 klausimai ir teisingas šaltinis | PASS |
| Prašymo ilgio riba ir runtime validavimas | PASS |
| 375 px ir 1440 px be horizontalaus slinkimo | PASS, 2 scenarijai |
| Atnaujinimas neišsaugo demo prašymo / rezultato | PASS |
| Jokios užklausos į Gemini ar `/api/ai` | PASS |

Tikro Edge scenarijus: **12 PASS, 0 FAIL**, atskirame laikiname profilyje.
Pirmas paleidimas sustojo su `Page.navigate` laukimo limitu prieš scenarijus
(0 atliktų PASS, 1 techninis FAIL). Vietinio serverio patikroje pradinis puslapis
pirmiausia viršijo 6 s, kūrinio puslapis atsakė 200. Pakartotinis browser
paleidimas atliko visas 12 patikrų. Programos kodas dėl šio limito nekeistas.

Vienetiniai testai apima netinkamas enum reikšmes ir tipus, ID neatitikimą,
1000 / 1001 ženklų ribą, trūkstamus metaduomenis, atšauktus prašymus,
neteisingą rezultato struktūrą, šaltinį ir klausimų skaičių. Demo testas taip pat
draudžia fetch ir patvirtina, kad ši funkcija nedaro tinklo užklausų.

`npm ci` nekartota: priklausomybės / lock failas nepasikeitė ir ankstesnio etapo
atkuriamas diegimas jau buvo patikrintas. Lieka žinomas Node automatinio ES modulio
atpažinimo įspėjimas, kuris testų nestabdo. Nuotolinės CI rezultato šiam kodui nėra.
Rezultatai nėra 99 % patikimumo ar viso projekto užbaigimo įrodymas.

## Kaip patikrinti

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Atverti http://localhost:3000/artwork/16568, jei reikia Ctrl+F5.
Puslapio apačioje rasti „Meno detektyvas“, pakeisti parametrus ir spausti
„✨ Pradėti meno detektyvo tyrimą“. Patikrinti klausimų skaičių ir atsakymų išskleidimą.

Papildomai, kai vietinis serveris veikia:
`node scripts/check-investigation-browser.mjs`.
Naudotojo naršyklės profilis neliečiamas, laikinas Edge procesas uždaromas,
naudotojo dev serveris nestabdomas. Duomenys nesiunčiami Gemini ar saugojimui.

## Git veiksmai ir ką turi padaryti A

Prieš atskirai patvirtintą commit / push: peržiūrėti git status, konkrečių failų
diff, įtraukus failus patikrinti `git diff --cached --check` ir `git diff --cached`,
atlikti paslapčių patikrą. Pirmiausia vėl patikrinti naujausią nuotolinę šaką,
nes šio etapo pradžioje fetch nebuvo leistas.
Siūloma commit žinutė: `feat: pridėti B tyrimo parametrų sąsają`.

A turi peržiūrėti `docs/developer-b-investigation.md`, sutarti užklausos / atsakymo
JSON ir įgyvendinti autentifikuotą Gemini serverį su validavimu, limito, laiko ir
sąnaudų apsaugomis. Pirmas realus nemokamos kvotos bandymas – tik atskirai
patvirtinus jos sąlygas ir gavus leidimą. Joks mokamas fallback neleidžiamas.
Istorinių teiginių tiesos vien struktūros tikrinimas nepatvirtina.

## Kitas B darbas ir ribos

Išsaugotų DI tyrimų sąsaja – atskiras būsimas B darbas. Ji dar neįgyvendinta.
Gemini, tikra autentifikacija, Supabase tyrimų saugojimas ir RLS – NOT VERIFIED,
A integracija neprijungta. Visas bendras 4 etapas dar nėra baigtas.
Pilnas klaviatūros / ekrano skaitytuvo auditas ir kitų naršyklių patikra neatlikti.
