# Galutinio vertinimo matrica

2026-11-17. Tai būsimų bandymų protokolas, ne įvykdymo ataskaita.
125 ankstesni automatizuoti testai ir 91 browser assertion nėra 100
reprezentatyvių E2E bandymų. Viešas Vercel URL dar nepaskelbtas.

## Kontroliuojamų E2E bandymų planas

Kiekvienas bandymas apima visą srautą ir rezultato patikrinimą. 20 scenarijų
× 5 variantai = 100 **planuojamų, dar neatliktų** bandymų. Variantai: skirtingi
kūriniai, 3/5 klausimai, tuščias / užpildytas sąrašas, 375/1440 px. Vien
mechaninis to paties mygtuko assertion kartojimas nelaikomas E2E srautu.

| ID | Srautas ir laukiamas rezultatas | Kiekis / aplinka |
| --- | --- | --- |
| 01 | Paieška → rezultatai → detalės, sutampa muziejaus ID | 5 / tikras muziejus |
| 02 | Autoriaus filtras → detalės, filtras išlaikytas | 5 / tikras muziejus |
| 03 | Nėra rezultatų → kita užklausa → rezultatai | 5 / tikras muziejus |
| 04 | Nėra vaizdo / metaduomenų → aiški būsena → grįžimas | 5 / muziejaus imitacija |
| 05 | Login → profilis → refresh, savo sesija išlieka | 5 / izoliuotos paskyros |
| 06 | Blogas slaptažodis → geras, saugi klaida ir sesija | 5 / izoliuotos paskyros |
| 07 | Logout → refresh → privatus puslapis neprieinamas | 5 / izoliuotos paskyros |
| 08 | Išsaugoti kūrinį → refresh → tik savo kolekcijoje | 5 / reali DB |
| 09 | Kategorija / pastaba → keisti → refresh, teisingi duomenys | 5 / reali DB |
| 10 | Šalinimą atšaukti → patvirtinti → refresh | 5 / reali DB |
| 11 | A kūrinys → B read/update/delete draudimai → A nepakitęs | 5 / reali DB, kritinis |
| 12 | B kūrinys → A read/update/delete draudimai → B nepakitęs | 5 / reali DB, kritinis |
| 13 | DI 3/5 → išsaugoti → refresh → peržiūrėti | 5 / modelio imitacija, reali DB |
| 14 | Tyrimas → šalinimą atšaukti / patvirtinti → refresh | 5 / modelio imitacija, reali DB |
| 15 | Kito savininko tyrimo read/update/delete draudimai | 5 / reali DB, kritinis |
| 16 | Modelio 403/503/timeout → LT klaida, nėra fallback | 5 / HTTP imitacija |
| 17 | Modelio 429 → ribos klaida, nėra kartojimo | 5 / HTTP imitacija |
| 18 | Blogas modelio JSON → atmestas, nesaugomas kaip sėkmė | 5 / HTTP imitacija |
| 19 | Developer Mode → paieška / klaida → išvalyti, tik saugūs laukai | 5 / secret canary |
| 20 | Mobile / desktop klaviatūra → kolekcija / tyrimai, teisingas fokusas | 5 / Edge |

Vykdymas vietinėje kontroliuojamoje aplinkoje. 05–18 naudojamos tik bandymui
sukurtos paskyros; realių DB įrašų kūrimas / valymas pagal atskirai suderintą
leidimą. Modelio imitacija nesikreipia į Gemini; realūs kvietimai atskirai.
Nekeisti vartotojo įprasto serverio ar gyvo DI jungiklio.

## Kiekvieno bandymo žurnalas

Vienas įrašas: scenarijaus ID / variantas, ISO data, commit, aplinka / URL be
privačių parametrų, viewport, realios / imituotos priklausomybės, pradinė
būsena, žingsniai, tikėtinas ir faktinis rezultatas, PASS / FAIL / NOT RUN,
įrodymo failas ir ar kritinis saugumo gedimas. Paskyros žymimos A/B; jokių
slaptažodžių, tokenų ar raktų žurnale.

Rodiklis = sėkmingi / pradėti × 100. Kiekvieną nesėkmę išlaikyti; kartojimas
yra naujas įrašas, ankstesnio FAIL nepanaikina. NOT RUN nėra PASS.
Infrastruktūros / scenarijaus klaidų neslėpti vardiklyje. Tikslas ≥99 %, bent
100 bandymų ir **0 kritinių saugumo gedimų**. Tai nėra gamybinio prieinamumo
ar visų modelio atsakymų teisingumo garantija.

## Papildomas tikras Vercel priėmimas

| Patikra | Būsena dabar |
| --- | --- |
| Build / funkcijų Node 26, teisingas commit ir env | NOT VERIFIED |
| HTTPS, API, vaizdas, 404, 375/1440 px ir klaviatūra | NOT VERIFIED |
| Tikslus Supabase callback ir registracijos laiško grįžimas | NOT VERIFIED |
| Login, refresh, logout tikrame HTTPS | NOT VERIFIED |
| Dviejų paskyrų kolekcijos / tyrimų tiesioginis RLS atskyrimas | NOT VERIFIED |
| Serverio raktų nebuvimas kliento JS ir atsakymuose | NOT VERIFIED |
| Tikras Gemini rezultatas, jei atskirai leidžiamas | NOT VERIFIED |
| Rollback tikslas ir patikra po grąžinimo | NOT VERIFIED |
| GitHub PR Actions jungiamam commit | NOT VERIFIED |

Žr. [publikavimo planą](vercel-deployment.md). Kol bandymai ir Production
patikros neatliktos, 6 etapas ir 99 % tikslas nežymimi pasiektais.
