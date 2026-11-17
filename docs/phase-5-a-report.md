# 5 etapo A vietinės patikros ataskaita

2026-11-17. Šaka `feature/a-diagnostics`, pradinis bendro projekto commit
`6d6851ace4148705fce888a990d9e5b255c92598`. Prieš pakeitimus darbo medis buvo
švarus ir GitHub `feature/a-gemini` rodė tą patį commit. B darbai neperrašyti.

Ši ataskaita fiksuoja vietinį įgyvendinimą ir patikras prieš publikavimą.
**GitHub CI dar nepaleistas.** Saugykla privati, skaitymo metu Actions vykdymų
`total_count=0`. Workflow paleidžiamas tik su pull_request. Jo / naujo PR
paskelbimui reikalingas atskiras leidimas commit / push / PR, o Actions naudojimui
— patvirtinta nemokama apimtis. Nuotolinio CI rezultato negalima pakeisti vietinių
komandų rezultatu; prieš galutinį 5 etapo uždarymą jį reikia užfiksuoti PR Checks.
Vartotojas pasirinko: **„Commit, push ir PR atliksiu pats“**. Bendro projekto
publikavimo agentas nevykdo; nemokamų Actions minučių likutis nepatvirtintas.
6 etapas nepradėtas; publikavimo į Vercel nebuvo.

## Kas įgyvendinta

- Matomas, klaviatūra valdomas Developer Mode su ribotu saugiu HTTP žurnalu.
- Request scope serverio surinkimas, saugi API atsakymo antraštė ir SSR metaduomenys;
  Art Institute, Supabase ir Gemini transporto matavimai. Kliento fetch / vaizdų
  stebėjimas tik žinomiems tos pačios svetainės endpoint.
- Griežta laukų / endpoint projekcija, jokių body, filtrų, prompt, API raktų,
  slapukų, paskyrų ID ar stack trace. Iki 12 serverio ir 30 naršyklės įrašų;
  istorija RAM, išjungimas / tapatybės pakeitimas ją išvalo.
- Autorizacija, RLS, request validavimas, private no-store, slapukai, kvotos,
  pakartojimų ribos ir demo / paskyros atskyrimas nekeičiami.
- Patikrintas ir atskirai patvirtintas tikras izoliuotas Git konflikto pratimas.
  Bendro projekto commit / merge juo nebuvo atliekami.

## Pakeisti failai

| Failai | Paskirtis |
| --- | --- |
| `src/lib/diagnostics-core.ts`, `diagnostics-server.ts` | allowlist / projekcija ir vienos operacijos serverio kontekstas |
| `src/components/diagnostics/developer-mode.tsx`, `src/app/layout.tsx` | jungiklis, lentelė ir būsenos gyvavimo ciklas |
| `src/lib/artic.ts`, `gemini.ts`, `supabase/config.ts` | transporto metaduomenys, nekeičiant body ar fetch parametrų |
| `src/app/api/artworks/**`, `api/collection`, `api/ai`, `api/investigations` | saugūs metaduomenys esamuose API atsakymuose |
| `src/app/explore/page.tsx`, `src/app/artwork/[id]/page.tsx` | SSR muziejaus metaduomenys |
| `tests/diagnostics.test.mjs` | privatumas, lygiagretumas, header / body išsaugojimas, SDK klaidos |
| `scripts/check-diagnostics-browser.mjs`, `check-ai-live.mjs`, `ai-test-server.mjs`, `prepare-local-check.mjs` | saugios naršyklės, paskyrų ir imituotų klaidų patikros |
| `scripts/git-conflict-exercise.mjs`, `docs/git-conflict-exercise.md` | mokomasis konfliktas ir jo įrodymai |

Paketai / lock ir SQL schema šiame etape nekeisti. Naujos trečiųjų šalių
priklausomybės nereikėjo.

## Patikrinti rezultatai

| Patikra | Rezultatas |
| --- | --- |
| Native Node vienetiniai testai | 125 PASS, 0 FAIL (115 esamų + 10 diagnostikos) |
| Developer Mode naršyklėje | 11 PASS, 0 FAIL; saugūs laukai, canary slėpimas, keyboard, 375 / 1440 px, history limit, nepakitęs 401 |
| Bendras pagrindas / navigacija | 20 PASS, 0 FAIL; 404, kalba, plotis, skip link |
| B prieinamumo regresija | 30 PASS, 0 FAIL; tikras vaizdas, formų žymės, unikalūs ID, klaviatūra / fokusas, 320 / 375 / 768 / 1440 px |
| Dvi tikros Supabase paskyros + fixture modelis | 18 PASS, 0 FAIL; 3/5 klausimai, diagnostika be prompt / ID, CRUD, idempotency, svetimos prieigos draudimas, logout |
| Netinkamas modelio raktas, fixture HTTP 403 | 6 PASS, 0 FAIL; SDK diagnostika, lietuviška klaida, nėra demo fallback / išsaugoto rezultato |
| Fixture HTTP 429 | 6 PASS, 0 FAIL; limitų klaida ir diagnostika, nėra rezultato / klaidingo save |
| SDK 401 / 403 / 429 / 503 | 4 iš naujų unit testų; kiekvienam 1 imituotas transporto kvietimas, be retries ir privataus tiekėjo body |
| Tikra DB RLS / kvotų / užraktų patikra | PASS; `check-ai-database.sql`, visa transakcija atšaukta ROLLBACK |
| Lint / typecheck | PASS |
| Produkcinis Next 16.4.6 Turbopack build | PASS izoliuotoje kopijoje |
| Kliento bundle patikra | 17 failų, tikrų GEMINI_API_KEY / AI_SERVER_SECRET reikšmių nerasta |
| Source / build atitiktis | 73 source failai sutampa su patikrinta build kopija |
| Produkcinių priklausomybių npm audit | 0 info / low / moderate / high / critical |
| Visų priklausomybių npm audit | 7 moderate, 0 high / critical; esama ESLint / TypeScript dev grandinė, paketai nekeisti |
| Tikro Gemini naudojimas šiame etape | 0 kvietimų; visos modelio klaidos / atsakymai imituoti |
| Nuotolinis GitHub Actions šiems pakeitimams | NOT RUN / NOT VERIFIED |

Iš viso naršyklės scenarijų skaitikliai: **91 PASS, 0 FAIL** (11+20+30+18+6+6).
Tai nėra 100 reprezentatyvių galutinio vertinimo užduočių rinkinys.

## Git konflikto pratimas

Vartotojas atskirai leido 4 mokomuosius commit ir 1 merge.
`.next/git-conflict-exercise-20261117`: PASS, tikras vienos eilutės konfliktas,
abi idėjos išlaikytos, nebeliko unmerged įrašų, merge commit turi du tėvus.
Mokomasis merge commit: `906f235aff1fff59cbb5069d39f02b73ddf62e09`.
Remote nėra. Pratimas nepakeitė bendro HEAD, `feature/a-diagnostics` šakos ar
to momento darbo medžio. Tai imituotos A / B rolės, ne B autoriaus realūs commit.
Įrodymai ir atkūrimas: `docs/git-conflict-exercise.md`.

## Aplinka, valymas ir ribos

Windows / PowerShell, Node v26.13.0, npm 12.2.2, Git 2.56.1.windows.1,
įdiegta Edge. Izoliuotas serveris 127.0.0.1:3194; vartotojo serveris nestabdytas.
Source / public / konfigūracija kopijuota į `.next/phase5-workspace` ir
`.next/phase5-build`, jokie `.env` / `.git` nekopijuoti. Build kopijoje tik
Turbopack root nukreiptas į tikrą workspace, kad veiktų node_modules junction;
bendro projekto `next.config.ts` nekeistas. Build be env tikrina surinkimą,
ne Vercel ar produkcinės autentifikacijos konfigūraciją.

Pirminis integracijos bandymas sustojo prieš inicijuojant React formos / jungiklio
event handlers; 429 scenarijaus pirmas paleidimas sustojo sesijos paruošime.
Pataisytas testinio scenarijaus laukimas iki hydration ir realiai pakartota:
galutiniai rezultatai aukščiau. Tarpiniai testiniai naudotojai taip pat išvalyti.

Galutinis realus DB valymas: bandymo paskyrų 0, jų kolekcijos įrašų 0, jų
AI tyrimų 0, aktyvių užraktų 0. Asmeninės paskyros nenaudotos. Kvotų skaitikliai
neatstatyti. Įprastas Gemini jungiklis lieka išjungtas pagal ankstesnių leidimų ribas.

Neatlikta: GitHub CI naujam PR, fizinių telefonų / ekrano skaitytuvų patikra,
visas WCAG auditas, platesnis tikro modelio turinio vertinimas ir Vercel.
Nėra naujo bendro projekto commit / push ar merge; mokomieji commit atskiri.
Galutinis 5 etapo uždarymas laukia nuotolinio CI arba aiškaus vartotojo sprendimo
publikavimą / CI atlikti savarankiškai.

## Perdavimas vartotojui

Vietiniai darbai ir numatytos vietinės patikros baigti. Vartotojas pats kurs
commit, push ir PR. Šaka `feature/a-diagnostics`, siūloma PR bazė
`feature/a-gemini`; bendrų šakų merge nepatvirtintas. Paruoštas PR aprašas
`.next/phase5-pr-description.md`. Siūloma commit žinutė:

```text
feat: pridėti saugų Developer Mode ir 5 etapo patikras
```

Pakartotinė vietinė patikra:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Naršyklėje įjungti **🛠️ Developer Mode**, atverti kūrinį arba atlikti paiešką;
patikrinti saugius endpoint šablonus ir „Išvalyti diagnostiką“. Automatizuotos
naršyklės patikros komanda yra `docs/developer-mode.md`.

Iki nuotolinio CI rezultato 5 etapas nežymimas visiškai priimtu GitHub aplinkoje.
7 moderate dev audito radiniai fiksuoti; automatinio audit fix ar paketų / peer
priklausomybių perkeitimo šiame etape nedaryta. 6 etapui leidimas negautas.
