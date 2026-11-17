# Vercel publikavimo planas

2026-11-17. Vartotojas turi Vercel paskyrą, projekto nėra. Tai planas:
projektas nesukurtas, deploy nevykdytas, viešas URL nežinomas. 6 etapo
leidimas apima vietinį pasiruošimą; publikavimui reikia atskiro leidimo.

## Pasirinktas pirmas žingsnis

Siūlomas projektas `artmystery-ai` (vardo prieinamumas dar nepatikrintas).
Po atskiro leidimo patikrinti paskyros savininką / Hobby planą, sukurti vieną
projektą ir vieną **Preview** su demo funkcijomis, be Supabase ir Gemini raktų.
Nejungti Pro trial, mokėjimo ar GitHub automatinio diegimo. Dashboard pirmas
„Import → Deploy“ gali būti Production: jo nelaikyti Preview garantija.
Rinktis aiškiai Preview skirtą CLI eigą be `--prod`, prieš tai patikrinus
įdiegto CLI pagalbą ir paskyros savininką. CLI dar neįdiegtas / neprijungtas.

Saugykla privati `mudramas1/mano-saugykla1`; dabartinė šaka
`feature/a-diagnostics`. B šaka neperrašoma. Commit, push ir PR vartotojas
pasirinko atlikti pats; prieš PR merge būtinas GitHub Actions PASS atitinkamam
commit. Vietinis Windows CI ir Vercel build jo nepakeičia.

## Vercel nustatymai

| Nustatymas | Reikšmė |
| --- | --- |
| Framework | Next.js |
| Root Directory | `.` |
| Node | `26.x`; projektas reikalauja `>=26.13.0 <27` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | framework numatytasis |

Dabartinis oficialus Vercel puslapis patvirtina Node 26.x palaikymą; konkretų
build Node patikrinti jo žurnale. `output: export` netinka serverio Auth / API.
`/api/ai` jau turi Node runtime ir maxDuration 60 s; realų plano limitą patikrinti
paskyroje. Modelio timeout 25 s, visos operacijos 45 s. Paketų nekeisti.

Hobby skirtas asmeniniam nekomerciniam naudojimui. Ribos gali sustabdyti
paslaugą; Gemini ir Supabase limitai atskiri. Paskyros plano / naudojimo
likutis dar nepatikrintas. Privataus Git repo autorių prieigos taisykles
patikrinti prieš jungiant integraciją; nekeisti autorystės ar repo matomumo
tam apeiti. Mokamo plano automatiškai nejungti.

## Aplinkos kintamieji

Tikros reikšmės lieka privačiai. Neimportuoti viso `.env.local`.

| Kintamasis | Pirmas demo Preview | Production po atskiro leidimo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | nepridėti | esamo ArtMysteryAI URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | nepridėti | esamas viešas publishable raktas |
| `SITE_URL` | nepridėti | tikslus galutinis HTTPS origin, be kelio |
| `AI_STORAGE_ENABLED` | `false` | `true` tik patikrinus migracijas ir HMAC |
| `AI_LIVE_ENABLED` | `false` | pradžioje `false`; įjungimas atskirai |
| `AI_SERVER_SECRET` | nepridėti | esamas stabilus privatus HMAC raktas |
| `GEMINI_API_KEY` | nepridėti | serveriui tik jei leidžiamas gyvas DI |
| `GEMINI_MODEL` | nepridėti | patvirtintas `gemini-3.5-flash-lite`, jei leidžiamas DI |

`NEXT_PUBLIC_*` reikšmės patenka į naršyklės bundle build metu: pakeitus
reikia naujo build. HMAC rakto nekeisti: ankstesnių tyrimų parašai nebegaliotų.
Nenaudoti service_role. Privatiems kintamiesiems naudoti Sensitive parinktį,
kur prieinama. `VERCEL` ir `x-vercel-forwarded-for` teikia platforma.
Vartotojo vietinis `AI_LIVE_ENABLED=true` nekeičiamas.

Prieš siuntimą patikrinti tikslų pasirinktų failų sąrašą. Nesiųsti `.env*`
(išskyrus šabloną), `.next`, `node_modules`, `.git`, browser profilių, privačių
testų žurnalų. Jei reikia, paruošti atskirą švarų eksportą. `.vercel` ryšio
failus ignoruoti prieš link, jų necommitinti.

## Patikros ir paskyrų prijungimas

Gavus tikrą Preview URL patikrinti HTTPS, paiešką, detales, paveikslą, demo
kolekciją ir tyrimą, diagnostiką, 375/1440 px, 404, JS klaidas. Paskyrų ir
tikro DI šiame demo Preview netikrinti ir nežymėti veikiančiais.

Po Preview pasirinkti stabilų Production domeną, atskirai patvirtinti
Production publikavimą, aplinkos kintamuosius ir Supabase Auth pakeitimą:

1. Programos `SITE_URL=https://<tikras-domenas>`.
2. Supabase Authentication → URL Configuration → Site URL tas pats origin.
3. Redirect URLs pridėti tikslų `https://<tikras-domenas>/auth/confirm`.
4. Išlaikyti naudojamą `http://localhost:3000/auth/confirm`; plačių
   `https://**` leidimų nepridėti. Seną konfigūraciją užfiksuoti privačiai.
5. Kitų Auth nustatymų ir SQL lentelių nekeisti. Tai nėra nauja migracija.

Auth Preview reikėtų atskiro tikslaus SITE_URL ir callback leidimo.
Esami browser scenarijai sąmoningai priima tik vietinį origin: šių apsaugų
neapeiti. Production scenarijų ruošti konkrečiam patvirtintam HTTPS origin.
Po atskiro leidimo naudoti dvi laikinas paskyras, patikrinti tiesioginių
read/update/delete atskyrimą abiem kryptimis, refresh ir logout, pašalinti tik
bandymo sukurtus duomenis. Registracijos laiškui reikia atskiro leidimo siųsti.

Tikram Gemini bandymui atskirai suderinti modelį, kvietimų skaičių, 6000 tokenų
ir 25 s ribą, be kartojimo. Viešas pirmas leidimas gali turėti paskyras su DI
išjungtu. Free planas nėra neribotų kvietimų garantija; kvotų neatstatyti.

## Grąžinimas ir demonstracija

Prieš Production užrašyti commit, deploy ID, URL, datą, ankstesnį patikrintą
deploy. Su atitinkamu leidimu Vercel Instant Rollback Hobby plane leidžia
grįžti į ankstesnį Production deploy. Pirmajam deploy ankstesnio gali nebūti;
tada stabdymo / prieigos ribojimo veiksmą suderinti atskirai. DB automatiškai
negrąžinti. Rollback neatkuria Supabase Auth nustatymų ir nepritaiko naujų env
senam build; atskirai patikrinti callback ir HMAC suderinamumą.

Demonstracija: paieška → kūrinio šaltinis → login → kolekcijos išsaugojimas /
redagavimas → tyrimas, jei leidžiamas → išsaugoti tyrimai → Developer Mode →
logout → kito naudotojo atskyrimas. Nerodyti dashboard raktų ar slapukų.

## Oficialūs šaltiniai, tikrinti 2026-11-17

- [Node versijos](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel aplinkos](https://vercel.com/docs/deployments/environments)
- [Hobby sąlygos ir ribos](https://vercel.com/docs/plans/hobby)
- [Privatūs Git projektai ir autorių prieiga](https://vercel.com/docs/git)
- [Instant Rollback](https://vercel.com/docs/instant-rollback)
- [Supabase redirect URL](https://supabase.com/docs/guides/auth/redirect-urls)
