# ArtMystery AI

## Dabartinė būsena

B darbai: kūrinio detalės su tikra muziejaus API informacija ir demonstracinė kolekcija.
Atverkite `/artwork/16568`, pavyzdžiui, http://localhost:3000/artwork/16568.
Vaizdą iš muziejaus IIIF gauna mūsų serveris ir naršyklei pateikia per
`/api/artworks/[id]/image`; jam nepasiekiamam rodomas paaiškinimas ir pakartojimo mygtukas.
`/collection` veikia demonstraciniu režimu: išsaugojimas šioje naršyklėje,
kategorijos, pastabos, filtrai ir pašalinimas su patvirtinimu.
Kūrinio puslapyje pridėta „Meno detektyvo“ parametrų forma ir vietinis tyrimo
pavyzdys. Gemini neprijungtas, mokamų užklausų nėra. Mygtukas „Išsaugoti pavyzdį“
išsaugo rezultatą šioje naršyklėje; `/investigations` leidžia peržiūrėti visą tyrimą,
filtruoti ir pašalinti su patvirtinimu. Tai demonstraciniai, ne paskyros duomenys.
A paieška veikia `/explore`: raktažodis, autoriaus filtras, abu kriterijai kartu,
rezultatų kortelės ir puslapiavimas. Paspaudus pavadinimą atveriamos esamos B
detalės. Kriterijai saugomi URL; rodomi originalo kalbos metaduomenys ir
viešo naudojimo kūriniai su vaizdo identifikatoriumi.
3 etapo vietinis autentifikacijos ir paskyros kolekcijos kodas paruoštas:
`/register`, `/login`, `/profile` ir atskiras Supabase saugojimo adapteris.
Supabase projektas prijungtas, patvirtinta migracija pritaikyta: 3 lentelės,
12 RLS politikų, anoniminė prieiga uždrausta ir patikrinta tiesiogiai.
Tikros sesijos ir dviejų prisijungusių naudotojų izoliacija dar nepatikrinti.
Be konfigūracijos išlieka demo režimas.
Prijungimas: [Supabase instrukcija](docs/supabase-setup.md).
Gemini ir tikrų AI tyrimų paskyros saugojimas priklauso 4 etapui.
Kūrinio puslapyje yra „Lietuviškai / Originalo kalba“ pasirinkimas. Monet
„Water Lilies“ (16568) turi vietinį lietuvišką vertimą. Kitiems kūriniams, kol
vertimų nėra, aiškiai rodomas originalas. Mokamų ar automatinių vertimo API nėra.
Nėra mokamų užklausų, raktų ar automatinių publikavimo veiksmų.

Faktiškai atliktos patikros ir apribojimai: [1 etapo ataskaita](docs/phase-1-report.md).
Naujausi B detalių rezultatai: [2 etapo ataskaita](docs/phase-2-report.md).
Kolekcija: [3 etapo B ataskaita](docs/phase-3-b-report.md) ir
[integracijos sutartis](docs/developer-b-collection.md).
DI parametrų sąsaja: [B integracijos sutartis](docs/developer-b-investigation.md).
Išsaugoti tyrimai: [B saugojimo sutartis](docs/developer-b-saved-investigations.md).
Dizaino ir prieinamumo patikra: [6 etapo B ataskaita](docs/phase-6-b-report.md).
A paieška ir tikros integracijos rezultatai: [2 etapo A ataskaita](docs/phase-2-a-report.md).
Autentifikacijos parengimas ir nepatikrinti kriterijai: [3 etapo A ataskaita](docs/phase-3-a-report.md).

## Paleidimas Windows aplinkoje

Reikalinga Node.js 26 LTS (26.13.0 arba naujesnė 26.x versija).
B pagrindas tikrintas su npm 11; A etapai patikrinti su npm 12.2.2.
Kitose sistemose vietoje `npm.cmd` naudokite `npm`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Atverkite http://localhost:3000/explore. 1 ir 2 etapams API raktų nereikia.
Jeigu npm praneša `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, šiame kompiuteryje padėjo
`$env:NODE_OPTIONS = '--use-system-ca'` (tik dabartinei terminalo sesijai).
Neišjunkite TLS sertifikatų tikrinimo.

## Patikros

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run start
```

Patikrinkite pradinį puslapį, visas keturias navigacijos nuorodas ir
`/neegzistuojantis-puslapis` (lietuviškas 404). Naršyklėje patikrinkite 375 px ir
1440 px pločius, Tab navigaciją bei nuorodą „Pereiti prie turinio“.
`npm test` tikrina muziejaus atsakymų validavimą ir klaidų atvejus be tinklo užklausų.
Tai nėra naršyklės ar visos programos funkcinių testų rinkinys.

Kai serveris veikia vietoje, paieškos patikrą galima paleisti atskirame terminale:

```powershell
node scripts/check-search-browser.mjs http://127.0.0.1:3000
```

Ji naudoja tikrą nemokamą muziejaus API ir įdiegtą Edge atskirame laikiname
profilyje. Neleisti produkciniame URL; scenarijus tik vietinis. Internetas
būtinas. Automatinio mokamų paslaugų naudojimo nėra.

Detalių integracija A kolegai: [B detalių sutartis](docs/developer-b-artwork-details.md).

## Darbas su kolega A

Žr. [integracijos susitarimą](docs/integration-contract.md). Pagrindą sukūrė B,
nes A šiuo metu negali inicializuoti projekto. Tai bendras pagrindas, ne antra programa.
Paketų versijos tikslios; `package-lock.json` turi keliauti kartu su `package.json`.
Kolega turi naudoti `npm ci`, o ne iš naujo generuoti projektą su `create-next-app`.

Kai bus atskirai patvirtintas pirmas commit ir push, kolega galės pradėti taip:

```powershell
git clone https://github.com/mudramas1/mano-saugykla1.git
cd mano-saugykla1
npm.cmd ci
git switch -c feature/a-search
```

Šios instrukcijos nėra patvirtinimas vykdyti commit ar push.
Prieš siūlomą commit: `git status`, tik konkrečių failų `git add`, tada
`git diff --cached --check` ir `git diff --cached`. Patikrinti, kad nėra paslapčių.
Siūloma pirmo commit žinutė: `chore: paruošti ArtMystery AI pagrindą`.

Kai bendra pagrindinė šaka jau egzistuos, prieš naują darbą naudokite
`git switch main`, `git pull --ff-only`, tuomet kurkite atskirą funkcijos šaką.
Pakeitimus jungti per Pull Request po peržiūros ir patikrų. Jei kolega turi
nepaskelbtą vietinį projektą, pirmiausia palyginti failus ir priklausomybes;
nenaudoti priverstinio push ar automatinio nesusijusių istorijų sujungimo.

Tikri raktai laikomi tik ignoruojamame `.env.local`; Git saugomas tik `.env.example`.
Supabase ir Gemini integracija bei debesijos pakeitimai atliekami vėlesniuose etapuose.
