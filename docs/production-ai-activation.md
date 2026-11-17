# Tikro DI režimo įjungimas Production

2026-11-17. Vartotojas paprašė įjungti tikrą „Meno detektyvo“ tyrimą.
Jis patvirtino, kad Gemini projektas tebėra Free, mokėjimas neįjungtas,
ir leido tik konfigūraciją bei publikavimą: **tikrą generavimą bandys pats**.
Automatizuotas modelio bandymas ir laikinos paskyros nepatvirtinti ir nevykdyti.

## Priežastis ir pataisa

Vercel Production trūko `GEMINI_API_KEY` ir `GEMINI_MODEL`, o į naršyklę
siunčiamas konfigūracijos požymis buvo `liveEnabled=false`. Tyrimų saugojimas
jau veikė (`storageEnabled=true`). Demo pranešimas nebuvo Gemini klaida.

Pagal atskirą vartotojo leidimą:

- Esamas vietinis `GEMINI_API_KEY` perkeltas į Vercel Production kaip Secret.
  Reikšmė perduota CLI per stdin; neįrašyta į komandą, Git ar ataskaitą.
- `GEMINI_MODEL=gemini-3.5-flash-lite`.
- `AI_LIVE_ENABLED=true`.
- HMAC, Supabase raktai, `AI_STORAGE_ENABLED`, DB migracijos ir kvotos nekeisti.
  Mokėjimo ar mokamo fallback nejungta.

Patikrintas [oficialus modelio kainų puslapis](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite):
modelis turi Free pakopą. Konkretaus projekto Free būseną patvirtino vartotojas;
Google paskyros atsiskaitymo nustatymų agentas neskaitė ir nekeitė.

## Publikavimas

- Production: https://artmystery-ai.vercel.app
- Deploy ID: `dpl_8VcWuonXQUamKN4pYGGAuor4c61m`, READY / Production.
- Diegimo URL: https://artmystery-4xut2kpx1-andriusprojects.vercel.app
- Publikuotas `main` HEAD `baea2591b0d0dc147187b586590a6ff7424067ac`.
- Prieš siuntimą `deploy --dry --json`: 151 failas, 0 privačių `.env`,
  `.git`, `.next`, `node_modules` ar logų tarp siunčiamų failų.
- Aplikacijos kodas, paketai ir vietinis `.env.local` nekeisti. Naujas
  commit / push nevykdytas; šis dokumentas yra po publikavimo parengtas įrodymas.

## Patikros be Gemini generavimo

| Patikra | Faktinis rezultatas |
| --- | --- |
| Production vieši konfigūracijos požymiai | `liveEnabled=true`, `storageEnabled=true` |
| Prisijungimo forma | 200, įjungta |
| Galiojanti `/api/ai` užklausa be sesijos | 401 prieš generavimą |
| `/api/ai` su svetimu Origin | 403 prieš generavimą |
| Išsaugotų tyrimų API be sesijos | 401 |
| Tikro Gemini rakto paieška viešame HTML ir 9 JS failuose | nerastas |

**6 PASS, 0 FAIL. Tikrų Gemini užklausų 0, naujų bandymo paskyrų 0, laiškų 0.**
Įrodymai ignoruojamame `.next/production-ai-activation-check.json`,
`production-ai-upload-check.json` ir `production-ai-env-updates.json`.
Šios patikros neįrodo tikro modelio atsakymo sėkmės ar jo turinio teisingumo.

## Vartotojo bandymas

1. Atverti Production svetainę ir prisijungti prie savo paskyros.
2. Pilnai atnaujinti puslapį (`Ctrl+F5`), atverti kūrinį.
3. Tyrimo forma turi rodyti „Gemini DI tyrimas · paskyros režimas“.
   Svečiai ir toliau naudoja aiškiai pažymėtą demo režimą.
4. Įrašyti savo prašymą, pasirinkti 3 arba 5 klausimus ir pradėti tyrimą.
5. Patikrinti rezultatą, išsaugojimą ir peržiūrą savo tyrimų sąraše.

Esamos programos ribos: naudotojui 2/min ir 10/UTC parą; IP 5/min ir
20/UTC parą; visai programai 20/UTC parą, vienas aktyvus tyrimas naudotojui.
Vienam modelio kvietimui iki 6000 išvesties tokenų, 25 s, be automatinio
kartojimo. Google taikomos atskiros Free kvotos. Sėkmingai rezervuotą kvotą
sunaudoja ir vėliau nepavykęs generavimas; skaitikliai neatstatyti.

Tikro Production generavimo / išsaugojimo E2E šiame darbe **NOT VERIFIED**:
vartotojas pasirinko bandyti pats. Visas 6 etapas ir 100 bandymų matrica šiuo
įjungimu nežymimi užbaigtais.
