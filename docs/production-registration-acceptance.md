# Production registracijos adresų patikra

2026-11-17. Užbaigta adresų konfigūracija ir pakartotinis publikavimas pagal
atskirą vartotojo prašymą. Tai nėra viso 6 etapo ar registracijos laiško E2E priėmimas.

## Rezultatas

- Svetainė: https://artmystery-ai.vercel.app
- Vercel projektas `andriusprojects/artmystery-ai`, patikrintas Hobby planas.
- Galutinis deploy `dpl_2pYWA12JhL7Lcegi1cb5Qp2jzcru`, būsena READY, Production.
- Diegimo URL: https://artmystery-aeeuncomj-andriusprojects.vercel.app
- Kodo HEAD `dda2d5f` (`main`). Publikavimo metu buvo ankstesnis vartotojo
  `.gitignore` pakeitimas; jo nekeitėme. Naujas commit / push nevykdytas.
- Vercel `SITE_URL=https://artmystery-ai.vercel.app`.
- Supabase ArtMysteryAI Site URL toks pats; leidžiami callback:
  `http://localhost:3000/auth/confirm` ir
  `https://artmystery-ai.vercel.app/auth/confirm`.
- Prieš / po nuskaitytos Auth konfigūracijos palyginimas patvirtino, kad
  pasikeitė tik `site_url` ir `additional_redirect_urls`. Kiti Auth laukai nepakeisti.

## Rastas ir pataisytas blokavimas

Po pirmo pakartotinio deploy `dpl_HZSHTQwdvnRWZyMbx3kwE279Px1F` puslapiai
atsidarė, tačiau prisijungimo / registracijos formos buvo išjungtos, o
kolekcijos ir tyrimų API grąžino 503. Vien adresų pataisos neužteko.

Vercel `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` buvo netinkamo formato ir
nesutapo su vietiniu viešu raktu. Vietinio rakto formatas patikrintas;
Supabase Auth settings GET jį priėmė HTTP 200. Vartotojas atskirai patvirtino
vieno viešo rakto pakeitimą ir dar vieną Production publikavimą.
Pakeistas tik šis Vercel raktas, naujų raktų nekurta. Reikšmė perduota CLI
per stdin, neįrašyta į komandą, ataskaitą ar Git. HMAC / Gemini raktai nekeisti.

## Galutinė HTTP patikra

| Scenarijus | Tikėtinas ir faktinis rezultatas | Būsena |
| --- | --- | --- |
| `/` | 200 | PASS |
| `/login` | 200, formos įjungtos | PASS |
| `/register` | 200, registracijos forma įjungta | PASS |
| `/auth/confirm` be kodo | 303 į tos pačios svetainės `/auth/error` | PASS |
| `/profile` be sesijos | 307 į `/login` | PASS |
| `/api/collection` be sesijos | 401 | PASS |
| `/api/investigations` be sesijos | 401 | PASS |
| `/auth/error` | 200 | PASS |

Galutinė baigtis **8 PASS, 0 FAIL**. Pradiniai 503 / išjungtų formų rezultatai
neištrinami ir nepateikiami kaip sėkmė. Tai HTTP konfigūracijos scenarijai,
ne 100 reprezentatyvių visos programos E2E bandymų ar 99 % prieinamumo įrodymas.

Prieš publikavimą `deploy --dry --json` patvirtino 150 siunčiamų failų,
0 `.env*`, `.git`, `.next`, `node_modules` ar logų tarp siunčiamų failų.
Pirmas vietinis tikrinimo scenarijus klaidingai įtraukė `ignored` sąrašą;
patikslinus tikrintas tik `files` sąrašas. Privačių failų siuntimas nevykdytas.

Vietiniai įrodymai ignoruojamame `.next/`: `production-registration-smoke.json`,
`production-registration-final.json`, `production-upload-verified.json`,
`production-public-key-validation.json`. Supabase konfigūracijos atsarginė
kopija laikoma privačiame laikiname kataloge, ne Git ar diegimo pakete.

## Ribos

Registracijos / pakartotinio patvirtinimo laiškų 0, Gemini užklausų 0, naujų
paskyrų 0, DB migracijų 0. Tikro laiško gavimas, jo PKCE nuorodos sėkmė,
prisijungusio naudotojo saugojimas ir Production dviejų paskyrų atskyrimas
šiame bandyme **NOT VERIFIED**. GitHub CI, 100 E2E matrica ir visas 6 etapas
šia adresų patikra neužbaigiami. Programos kodas ir paketai nekeisti.
