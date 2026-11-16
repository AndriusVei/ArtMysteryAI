# B: išsaugotų tyrimų sąsaja

Kūrinio puslapyje paruošus demonstracinį tyrimą, „Išsaugoti pavyzdį“ išsaugo
visą validuotą rezultatą, parametrus, papildomą prašymą, kūrinio ID ir pavadinimą.
`/investigations` pateikia sąrašą, paiešką pagal pavadinimą, režimo filtrą,
visą tyrimą su išskleidžiamais atsakymais, kūrinio nuorodą ir šalinimo patvirtinimą.
Neišsaugota peržiūra po atnaujinimo dingsta; išsaugotas įrašas lieka toje naršyklėje.
Tai papildymas ankstesniam parametrų etapui, kuriame saugojimo dar nebuvo.

## Duomenų sutartis

`SavedInvestigation`: `id`, `artworkTitle`, `savedAt`, `response: InvestigationResponse`.
`InvestigationRepository`: `mode: demo | account`, asinchroniniai `list`,
`save(response, artworkTitle)` ir `remove(id)`. UI naudoja demo kablį
`useDemoInvestigations`; A sukurs atskirą paskyros duomenų kablį / adapterį.
Demo realizacija ir jos runtime validavimas yra `src/lib/investigation.ts`,
kad būtų naudojama ta pati tyrimų atsakymų schema ir Node testai be naujų įrankių.

Saugyklos raktas `artmystery:demo:investigations:v1`, formatas `{version:1, items}`.
Iki 30 tyrimų, iki 2 000 000 serializuotos eilutės UTF-16 vienetų (ne baitų).
Naršyklės bendra kvota gali baigtis anksčiau. Kiekvienas rezultatas validuojamas
esama schema, pavadinimas iki 2000 ženklų, ISO datos, unikalūs demo UUID.
Papildomi laukai atmetami. Leidžiami tik `demo` rezultatai, šaltinių nuorodos tik
kanoninės atitinkamo kūrinio `https://www.artic.edu/artworks/{id}` nuorodos.
Tekstas rodomas React teksto mazgais, ne HTML. Schemos validacija nepatvirtina faktų.

Vienodo rezultato pakartotinis išsaugojimas grąžina esamą įrašą. Naujas tyrimas
su kita data / parametrais gali būti atskiras. Prieš rašant ar trinant vėl skaitoma
saugykla. Sugadintas turinys neperrašomas; kvotos / prieigos klaidų atveju sėkmė
nerodoma. Pakeitimai atnaujinami tame pačiame ir kituose languose per įvykius.
`localStorage` nėra transakcinė duomenų bazė: visiškai vienalaikiai kelių langų
rašymai gali vienas kitą pakeisti. Tai demo apribojimas, ne paskyros saugojimo garantija.
Demo duomenys nėra slapti ar patikimi; naudotojui rodoma, kad papildomas prašymas
taip pat išsaugomas ir jautrių duomenų rašyti nereikia.

## Ką prijungs A

- Supabase autentifikaciją ir paskyros adapterį, serveriu patvirtintą tapatybę,
  lentelės schemą, RLS, dviejų vartotojų prieigos ir šalinimo patikras.
- Gemini per serverio `/api/ai`, rezultatų validavimą, klaidų ir nemokamų kvotų
  kontrolę. B nekuria šio endpointo ir nedaro Gemini užklausų.
- Tikrų rezultatų saugojimą atskirai nuo demo. Prieš įrašant serveryje būtina
  validuoti schemą ir teises; naršyklės ID / turinys neįrodo nuosavybės.
- Demo perkėlimas į paskyrą automatiškai nevykdomas. Jei vėliau reikės importo,
  tam būtinas atskiras aiškus naudotojo veiksmas ir serverio validacija.

B nekeičia priklausomybių, konfigūracijų, autentifikacijos, paieškos ar diegimo.

## Patikra

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
# Kai atskirame terminale paleistas npm.cmd run dev:
node scripts/check-saved-investigations-browser.mjs
```

Naršyklės patikra naudoja įdiegtą Edge atskirame laikiname profilyje ir tik
localhost. Neliečia naudotojo naršyklės duomenų, neįdiegia naršyklės ir nestabdo
naudotojo serverio. Testai: išsaugojimas, pilnas tekstas / parametrai, persikrovimas,
filtrai, šalinimo atšaukimas ir patvirtinimas, XSS tekstas, kvota, sugadinti duomenys,
375 / 1440 px plotis ir jokių Gemini / `/api/ai` užklausų.
