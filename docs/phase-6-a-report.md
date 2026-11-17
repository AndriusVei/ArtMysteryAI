# 6 A etapas: pasiruošimas publikavimui

2026-11-17. **Vietinis planas paruoštas; publikavimas ir galutinis vertinimas
dar neatlikti.** Vartotojas turi Vercel paskyrą, projekto nėra.
Pradinė šaka `feature/a-diagnostics`, HEAD `0dc28f7` („5 etapo pabaiga“),
darbo medis prieš pradžią švarus.

## Atlikta

- Perskaitytas MASTER PROMPT 6 etapo mastas ir įdiegtos Next versijos diegimo / env gairės.
- Patikrinti paketai, Next config, PR workflow, Auth origin, AI Node runtime / timeout ir IP sąlyga.
- Oficialus dabartinis Vercel Node puslapis patvirtina 26.x palaikymą.
- Git seka tik `.env.example`, ne privačius env failus.
- Paruoštas [publikavimo / env / rollback planas](vercel-deployment.md) ir [vertinimo matrica](final-evaluation.md).

Pakeitimai: trys nauji docs dokumentai ir README nuoroda. Paketai, lockfile,
B komponentai, DB ir programos elgesys nekeisti. Tikrų Gemini užklausų 0.
Vartotojo vietinis gyvo DI jungiklis nekeistas.

## Patikros ir ribos

5 etapo [ataskaitoje](phase-5-a-report.md) užfiksuota švari npm ci / lint /
typecheck / 125 testų / build seka PASS. Tai nėra naujas 6 etapo, GitHub
Linux runner ar Vercel vykdymas. Šio etapo `git diff --check`: PASS; trijų
naujų dokumentų vietinės nuorodos ir eilučių tarpai: PASS. Programos build
nekartojamas, nes kodas / paketai nekeisti. `.vercel/` jau ignoruojamas Git.

Likę: atskirai patvirtintas vienas demo Preview, tada konkretus Production
domenas ir atskiras publikavimo / Supabase Auth leidimas. Po jo – tikros
Production ir dviejų naudotojų patikros, matricos ≥100 bandymų, rezultatai
ir demonstracija. 100 matricos bandymų dabar NOT RUN; URL nėra.

Commit / push / PR vartotojas atlieka pats. Merge, deploy, debesijos
nustatymai ir kredencialų pakeitimai šiuo pasiruošimu nevykdyti.
