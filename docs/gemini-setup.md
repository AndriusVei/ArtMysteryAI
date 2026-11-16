# Gemini prijungimas — 4 etapas

2026-11-16–17. 4 etapo funkcinis priėmimas užbaigtas, raktas prijungtas.
Dabartinis modelis `gemini-3.5-flash-lite`: tikras 5 klausimų paskyros srautas praėjo.
Naujausi rezultatai `docs/phase-4-e2e-acceptance.md`; ankstesnis standalone
`gemini-4-hydrogen` bandymas aprašytas `docs/phase-4-gemini-acceptance.md`.
Toliau pateikti rakto sukūrimo žingsniai palikti naujai aplinkai.
AI migracija jau atskirai patvirtinta ir pritaikyta; rezultatai:
`docs/phase-4-migration-acceptance.md`.
Atnaujinimas: vartotojas nurodė įrašęs raktą ir pasirinkęs Free planą.
Paslauga priėmė raktą pirmame patvirtintame bandyme. Projekto billing / kvotų
administravimo nevykdyta. Nustatytas `GEMINI_MODEL=gemini-3.5-flash-lite`,
`AI_LIVE_ENABLED=false`; programos generavimas išjungtas.
Pagal 2026-11-16 [Google dokumentaciją](https://aistudio.google.com/docs/models)
2.5 šeimos prieiga ribojama ankstesniems naudotojams, 2.5 Flash nebėra siūlomas
naujiems projektams ir yra deprecated. Pirmojo bandymo modelis buvo
`gemini-4-hydrogen`: [JSON palaikymas](https://aistudio.google.com/docs/models/gemini-4-hydrogen)
ir [Free kainodara](https://aistudio.google.com/docs/pricing#gemini-4-hydrogen)
patikrinti dokumentacijoje, o šio rakto prieiga patvirtinta viena sėkminga užklausa.
Modelio pakeitimas ir pirmas bandymas jau atskirai patvirtinti ir atlikti;
vėliau du 4 Hydrogen bandymai nepavyko, bent viename gautas Google HTTP 503.
Po naujo atskiro leidimo 3.5 Flash-Lite tikras generavimas ir jo išsaugojimo
srautas patikrinti sėkmingai. Papildomoms modelio užklausoms reikia naujo leidimo.
Ši instrukcija nėra leidimas mokamai užklausai, debesijos migracijai ar publikavimui.

## 1. Raktas ir nemokamas planas

1. Atverk https://aistudio.google.com/api-keys ir prisijunk prie savo Google paskyros.
2. Jei numatytas projektas ir raktas jau yra, patikrink juos. Kitu atveju rinkis
   **Create API key** ir sukurk projektą / rakto bei projekto porą.
   Projektui galima duoti pavadinimą `ArtMysteryAI`.
3. Projekto plano / billing skiltyje patikrink, ar jis **Free**, ar **Paid**.
   Šiam darbui mokėjimo neįjunk ir kortelės nepridėk. Jei pasirinktam modeliui
   reikalaujamas mokamas planas, sustokime ir pasirinkime kitą galimą modelį.
4. Rakto nesiųsk pokalbyje, laiške ar ekrano nuotraukoje. Įrašyk jį tik vietinio,
   Git ignoruojamo `.env.local` eilutėje `GEMINI_API_KEY=...`.
   Nenaudok `NEXT_PUBLIC_` priešdėlio. Venk komandų, kurios raktą įrašytų į terminalo istoriją.
5. Pranešk tik „raktas įrašytas“ ir projekto planą. Konkretų prieinamą modelio ID,
   JSON struktūros palaikymą, tuo metu galiojančias kvotas bei kainą patikrinkime
   prieš atskirai patvirtindami pirmą užklausą. Automatinio numatytojo modelio nėra.

Google dokumentacija: [API raktai](https://ai.google.dev/gemini-api/docs/api-key),
[pradžia](https://aistudio.google.com/docs/get-started),
[mokėjimas](https://ai.google.dev/gemini-api/docs/billing),
[limitai](https://ai.google.dev/gemini-api/docs/rate-limits).
Nemokamas planas nereiškia, kad kiekvienas modelis turi nemokamą kvotą.
`store:false` išjungia Interactions istorijos saugojimą; tai savaime nepakeičia
kitų Google paslaugos duomenų naudojimo sąlygų.

## 2. Atskirai patvirtinamas vienas standalone bandymas

Suderinę modelį ir jo planą, `.env.local` nustatome `GEMINI_MODEL=<tikslus-ID>`.
`AI_LIVE_ENABLED` lieka `false`. Atskirai patvirtinus **vieną užklausą** su
6000 išvesties tokenų riba, galima naudoti:

```powershell
$env:ARTMYSTERY_ALLOW_LIVE_GEMINI='YES'
$env:ARTMYSTERY_GEMINI_MAX_REQUESTS='1'
$env:ARTMYSTERY_GEMINI_APPROVED_MODEL='<atskirai patvirtintas tikslus modelio ID>'
node --use-system-ca scripts/check-gemini-live.mjs
Remove-Item Env:ARTMYSTERY_ALLOW_LIVE_GEMINI
Remove-Item Env:ARTMYSTERY_GEMINI_MAX_REQUESTS
Remove-Item Env:ARTMYSTERY_GEMINI_APPROVED_MODEL
```

Scenarijus siunčia vieną viešų Monet metaduomenų užklausą, be asmeninio prašymo;
nekuria DB įrašų, nedaro retries ar automatinio tęsimo, nerodo rakto ir DI turinio.
Vieną kartą paleistas scenarijus daro daugiausia vieną kvietimą. Pakartotinis jo
paleidimas būtų dar viena užklausa ir reikalauja naujo leidimo. Tikro atsakymo
turinio edukacinė kokybė turi būti papildomai peržiūrėta saugioje programos sąsajoje.

## 3. Atskirai patvirtinama Supabase migracija

Peržiūrai paruošta `supabase/migrations/202611160002_ai_limits_and_saved_results.sql`.
Ji nekeičia paskyros kolekcijos ar profilių: papildo `ai_investigations` generavimo
parašu, modeliu, užklausos ID ir išsaugojimo data; prideda dvi kvotų / užraktų lenteles
bei dvi tik autentifikuotiems naudotojams prieinamas funkcijas. Esamų įrašų netrina.
Tikslinis projektas `ArtMysteryAI` (`qjqkjtqqvzbzihueuqzu`).

Vartotojo atskiras leidimas gautas. Nuotolinės DB būklė ir dry-run patikrinti;
pritaikyta tik ši migracija. Tikros DB kvotų, užraktų ir dviejų SQL tapatybių RLS
patikros praėjo vienoje ROLLBACK transakcijoje. Vienalaikių atskirų jungčių
apkrovos testas dar neatliktas. Dviejų naršyklės sesijų integracija vėliau
patikrinta pagal `docs/phase-4-e2e-acceptance.md`.

## 4. Programos įjungimas ir priėmimas

Sugeneruoti stabilų atsitiktinį `AI_SERVER_SECRET` (bent 32 simboliai) ir laikyti
tik `.env.local` / serverio paslapčių saugykloje. Neįrašyti į Git. Pakeitus ar
praradus šį raktą, ankstesnių rezultatų parašai nebegalios; saugoti jo kopiją.
Šioje darbo vietoje šis vidinis parašo raktas jau paruoštas privačiame `.env.local`;
jo kopijuoti į pokalbį ar generuoti iš naujo nereikia.
Tik pritaikius migraciją nustatyti `AI_STORAGE_ENABLED=true`.
Šioje darbo vietoje po patvirtintos migracijos jis jau įjungtas.
Tik po modelio, plano ir užklausų ribos patvirtinimo įjungti `AI_LIVE_ENABLED=true`.
Po env pakeitimų serverį paleisti iš naujo.

Prisijungus: kūrinys → tyrimo parametrai → generavimas → išsaugojimas →
`/investigations` → perkrovimas → šalinimas su patvirtinimu. Patikrinti 3 ir
5 klausimus, faktų bei interpretacijų atskyrimą, kitą naudotoją ir klaidų būsenas.
Šios darbo vietos 4 etapo priėmimas jau atliktas: 3 klausimų tikras standalone,
3/5 klausimų UI su fixture modeliu ir tikras 5 klausimų paskyros srautas.
Vykdant naujoje aplinkoje patikras pakartoti tik su nauju konkrečiu leidimu.

Kvotos įgyvendintos DB fiksuotais UTC intervalais: naudotojui 2/min ir 10/dieną,
IP 5/min ir 20/dieną, visam projektui 20/dieną; viena aktyvi užklausa naudotojui.
Bandymas kvotą sunaudoja ir nesėkmės atveju. Tai užklausų ribos, ne pinigų biudžetas
ir ne Google nemokamo plano garantija. Google kvotas tikrinti atskirai.
Serverio rezultatas iki 128000 baitų; SDK JSON iki 256000 baitų; 6000 išvesties
tokenų; Gemini laikas 25 s, viso srauto 45 s; retries ir automatinis tęsimas išjungti.

IP šaltinis: vietoje visi bandymai dalijasi viena localhost kvota; Vercel naudojama
platformos `x-vercel-forwarded-for` antraštė. Kitoje talpinimo aplinkoje generavimas
uždraustas, kol neįgyvendintas patikimo proxy adapteris. Publikavimas šiame etape nevykdomas.
Juodraščiai lieka DB, kol jų nepašalina savininkas; automatinio galiojimo termino nėra.
Paskyros sąraše rodomi tik vartotojo aiškiai išsaugoti rezultatai.

Išjungimas: `AI_LIVE_ENABLED=false` sustabdo naujus modelio kvietimus;
palikus `AI_STORAGE_ENABLED=true`, ankstesni paskyros tyrimai lieka pasiekiami.
Demo pavyzdžiai saugomi atskirai naršyklėje ir į paskyrą automatiškai neperkeliami.
