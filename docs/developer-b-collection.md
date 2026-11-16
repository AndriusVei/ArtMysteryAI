# Kūrėjo B demonstracinė kolekcija

## Naudotojo kelias

1. Atverti `/artwork/16568` ir spausti „Išsaugoti į demo kolekciją“.
2. Atverti `/collection`: kūrinys rodomas kategorijoje „Mėgstamiausi“.
3. „Redaguoti“ leidžia pasirinkti „Mėgstamiausi“, „Noriu tyrinėti“, „Ištyrinėti“
   ir pridėti pastabą. „Išsaugoti pakeitimus“ patvirtina įrašymą tik jam pavykus.
4. Filtruoti kategorija, ieškoti pavadinimo / autoriaus, atverti kūrinio detales.
5. „Pašalinti“ prašo patvirtinimo. Atšaukus niekas nekeičiama; patvirtinus
   pašalinamas tik pasirinktas demo kūrinys ir jo pastaba.

Aiškiai matomas demonstracinis režimas: nėra prisijungimo, paskyros saugojimo
ar sinchronizavimo tarp įrenginių. Informacija saugoma tik dabartinės svetainės
origin naršyklės localStorage. `localhost:3000` ir `127.0.0.1:3000` yra skirtingos
saugyklos. Išvalius naršyklės duomenis demo kolekcija prarandama.
Jokie pastabų tekstai nesiunčiami į muziejų, DI ar kitas išorines paslaugas.

## Sutartis su A

`src/types/collection.ts` aprašo:

- `SaveArtworkInput`: artworkId, title, artist, hasImage (be user_id).
- `CollectionItem`: id, muziejaus numeris, rodymo momentu išsaugotas pavadinimas,
  autorius, vaizdo prieinamumo žyma, category, notes, createdAt, updatedAt.
- `CollectionRepository`: asinchroniniai list, save, update ir remove; mode demo / account.
- `CollectionChanges`: category ir notes. Update / remove priima expectedUpdatedAt,
  kad pasenusi forma tyliai neperrašytų naujesnių duomenų.

Demo id `demo-<artworkId>` nėra Supabase įrašo ID ir netinka naudotojo tapatybei.
Pavadinimas išsaugomas ta kalba, kuri pasirinkta detalių puslapyje. Kalbą vėliau
pakeitus esamos kolekcijos pastabos, kategorija ir pavadinimas automatiškai nekeičiami.

A turi įgyvendinti atskirą account adapterį su Supabase, serveriu patikrinta
tapatybe ir RLS. Naudotojo ID nepriimti iš vietinės kolekcijos kaip tapatybės įrodymo.
Muziejaus ID bei metaduomenis tikrinti serveryje. DB constraint: vienas kūrinys
vienam naudotojui (`user_id`, `artwork_id`), leistinos kategorijos ir pastabos riba.
Atnaujinimai turi patikrinti įrašo versiją ir serverio teises.

Prijungiant account adapterį keisti duomenų hook / provider ir režimo tekstus;
nepalikti demo žymos ant tikros paskyros ir nerodyti paskyros būsenos demo duomenims.
`use-demo-collection.ts` šiuo metu sąmoningai naudoja tik demo adapterį.
Demo → account perkėlimas neįgyvendintas ir neturi vykti automatiškai.
Supabase projektas, SQL migracijos, autentifikacija ir RLS šiame etape nekeičiami.

## Ribos ir klaidos

- Schema: `{ version: 1, items: CollectionItem[] }`.
- Raktas: `artmystery:demo:collection:v1`, kiti localStorage duomenys neliečiami.
- Iki 100 kūrinių, 2000 ženklų pastaba, ribotas bendras JSON dydis.
- ID, kategorija, tekstų dydžiai, datos ir dublikatai tikrinami vykdymo metu.
- Sugadinta ar nežinomos versijos saugykla neperrašoma ir automatiškai netrinama.
- Blokuota saugykla / QuotaExceededError nerodomi kaip sėkmė.
- Sėkmės pranešimas ir rodinio atnaujinimas vyksta po sėkmingo setItem.
- Pakartotinis save išlaiko esamas kategorijas ir pastabas; deduplikacija pagal artworkId.
- Keitimai tame pačiame lange atnaujina bendrą hook; kitame lange gaunami storage įvykiai.
- expectedUpdatedAt aptinka jau įvykusį kito lango pakeitimą. localStorage nėra
  transakcinė duomenų bazė: visiškai vienalaikių kelių langų įrašymų izoliacija
  negarantuojama. Tikrą konkurencijos valdymą turi užtikrinti A account adapteris.
- Pastabos ir saugomi pavadinimai pateikiami kaip React tekstas, ne HTML.
- Vaizdui naudojamas tik mūsų `/api/artworks/<id>/image`; jo serveris iš naujo
  tikrina muziejaus teises. Saugyklos hasImage nėra naudojimo teisių įrodymas.

## Patikros

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Naršyklės patikra (vietinis serveris turi veikti):

```powershell
node scripts/check-collection-browser.mjs
```

Ji naudoja atskirą laikiną Edge profilį ir neliečia naudotojo kolekcijos.
Naršyklės paketai neįdiegiami; neradus Edge patikra praneša apie apribojimą.
Galima nurodyti `ARTMYSTERY_BROWSER_PATH` ir vietinį `ARTMYSTERY_TEST_URL`.
Neleidžiamas testavimas produkcinio URL. Laikinas profilis paliekamas OS temp
kataloge; atskiras naršyklės procesas uždaromas, naudotojo dev serveris nestabdomas.
CI šiuo metu vykdo vienetinius testus, o šis Edge scenarijus paleidžiamas atskirai.

Prieš realų publikavimą A papildomai turi patikrinti dvi tikras paskyras,
RLS SELECT/INSERT/UPDATE/DELETE izoliaciją ir autentifikacijos būsenas.
