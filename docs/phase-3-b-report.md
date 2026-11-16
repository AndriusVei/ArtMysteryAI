# 3 etapo B dalis: kolekcija, kategorijos ir pastabos

Data: 2026-11-16. Windows / PowerShell, Node.js 26.13.0, npm 11.20.0,
Next.js 16.4.6. Šaka `feature/developer-b`, bazinis commit `3fd2182`.
Naujas commit, push, merge ar deploy šiame etape neatlikti.

## Kas atlikta

Demonstracinė kolekcija, išsaugojimas iš detalių puslapio, trys kategorijos,
pastabų redagavimas, kategorijos ir teksto filtrai, pašalinimas su patvirtinimu.
Saugoma tik dabartinėje naršyklėje; nėra fiktyvaus prisijungimo ar tikros paskyros.
Duomenų adapteris ir TypeScript sutartis atskirti būsimai A Supabase integracijai.

## Nauji ir pakeisti failai

- `src/types/collection.ts`: kategorijos, įrašai, keitimai ir repository sutartis.
- `src/lib/demo-collection.ts`: tikrinamas demo saugojimas ir CRUD.
- `src/components/collection/use-demo-collection.ts`: rodinio atnaujinimas po
  sėkmingo įrašo, SSR įkėlimo būsena ir saugyklos klaidos.
- `src/components/collection/demo-notice.tsx`: aiški demo žyma.
- `src/components/collection/save-artwork-button.tsx`: išsaugojimas, apsauga nuo dublikavimo.
- `src/components/collection/collection-card.tsx`: vaizdas, kategorija, pastaba, redagavimas, pašalinimas.
- `src/components/collection/collection-view.tsx`: kolekcijos sąrašas, filtrai ir tuščios / klaidos būsenos.
- `src/app/collection/page.tsx`: kolekcijos puslapis vietoje informacinio karkaso.
- `src/components/artwork/artwork-details.tsx`: pridėtas išsaugojimo mygtukas.
- `tests/demo-collection.test.mjs`: 11 naujų saugojimo ir klaidų testų.
- `scripts/check-collection-browser.mjs`: pakartojamas izoliuotas Edge scenarijus.
- `README.md`, `docs/integration-contract.md`, `docs/developer-b-collection.md`,
  ši ataskaita: paleidimas, integracija ir patikrų įrodymai.

Paieškos, autentifikacijos, DI, bendrų stilių ir konfigūracijų A failai nekeisti.
Priklausomybės, package.json ir package-lock.json nekeisti. Mokamų užklausų nėra.

## Faktiškai atliktos patikros

| Patikra | Rezultatas |
| --- | --- |
| git fetch ir šakos palyginimas | PASS: vietinė ir nuotolinė bazė sutapo, A naujų pakeitimų nėra |
| npm test | 37 PASS, 0 FAIL po pataisymo |
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm run build | PASS |
| Tuščia kolekcija atskirame profilyje | PASS |
| Išsaugoti iš tikro kūrinio puslapio, neleisti dublikato | PASS |
| Keisti kategoriją ir pastabą; HTML pateikti tekstu | PASS |
| Puslapio atnaujinimas išsaugo duomenis | PASS |
| Kategorijų filtrai ir jų tuščia būsena | PASS |
| Paieška savo kolekcijoje | PASS |
| 375 px ir 1440 px: nėra horizontalaus slinkimo | PASS, 2 patikros |
| Atšaukti pašalinimą išsaugant įrašą | PASS |
| Patvirtinti pašalinimą, grąžinti fokusą, išlaikyti po atnaujinimo | PASS |
| Sugadinti duomenys lieka neperrašyti, rodoma klaida | PASS |
| Blokuota naršyklės saugykla | PASS |
| Kvotos klaida nesukuria tariamo sėkmingo išsaugojimo | PASS |

Browser scenarijus: **13 PASS, 0 FAIL** tikrame paslėptame Edge lange su atskiru
laikinu profiliu. Naudotojo duomenys ir naršyklės profilis nebuvo naudojami.
Vienetiniai testai apima ir pasenusių versijų konfliktą, 100 kūrinių ribą,
2000 ženklų pastabą, klaidingas įvestis bei neegzistuojantį įrašą.

Pirmas testų paleidimas: 26 ankstesni testai PASS, kolekcijos testų failas FAIL,
nes Node strip-only režimas nepalaiko TypeScript konstruktoriaus parameter property.
Laukas pakeistas į įprastą deklaraciją; pakartotinis paleidimas: 37 PASS / 0 FAIL.
Lieka jau žinomas Node modulio atpažinimo įspėjimas, testų jis nestabdo.

`npm ci` šiame papildyme nekartota: priklausomybės ir lock failas nepasikeitė;
ankstesnio etapo atkuriamas diegimas buvo patikrintas. Nuotolinės CI šio etapo
rezultatų dar nėra, nes pakeitimai neįkelti. Tai nėra 99 % patikimumo įvertinimas.

## Kaip patikrinti

Naudoti `docs/developer-b-collection.md` komandas. Rankiniu būdu:
`/artwork/16568` → išsaugoti → `/collection` → redaguoti → pakeisti kategoriją,
įrašyti pastabą → išsaugoti → F5 → filtruoti → atšaukti ir patvirtinti pašalinimą.

## Git veiksmai ir perdavimas A

Prieš atskirai patvirtintą commit / push: `git status`, konkrečių failų `git add`,
`git diff --cached --check`, `git diff --cached` ir paslapčių patikra.
Siūloma commit žinutė: `feat: pridėti demonstracinę kolekciją ir pastabas`.

A turi peržiūrėti `CollectionRepository` sutartį ir implementuoti atskirą account
adapterį su serverio tapatybės tikrinimu, Supabase ir RLS. Demo įrašų automatiškai
neperkelti į paskyrą. Pakeitimų gavimas galimas tik po atskirai patvirtinto push.

## Nepatikrinta / apribojimai ir kitas etapas

Tikros paskyros, Supabase, SQL migracijos ir dviejų naudotojų RLS: NOT VERIFIED,
neįgyvendinta A dalis. Visas bendro MASTER PROMPT 3 etapas dar nėra baigtas.
localStorage nėra transakcinė saugykla ir neužtikrina visiškai vienalaikių
kelių langų įrašymų izoliacijos. Demo nėra apsaugota asmeninė paskyros kolekcija.
Pilnas klaviatūros, ekrano skaitytuvo, kelių naršyklių ir prieinamumo auditas
neatliktas; patikrintas pašalinimo fokuso grąžinimas ir nurodyti ekranų pločiai.

Kitas B etapas, tik atskirai patvirtinus: trijų DI parametrų sąsaja su aiškiai
atskirtais demonstraciniais tyrimais. Gemini serverio A dalies nedubliuoti.
