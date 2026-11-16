# 5 B etapas: išsaugotų tyrimų sąsaja

Įgyvendinta tik B sritis: demonstracinių tyrimų išsaugojimas šioje naršyklėje,
sąrašas `/investigations`, pilnas rezultatas ir parametrai, kūrinio nuoroda,
pavadinimo paieška, režimo filtras, šalinimas su patvirtinimu ir atšaukimu.
UI lietuviška. Gemini / Supabase neprijungti, jokių mokamų užklausų.

## Patikros šiame etape

- `npm.cmd test`: 68 PASS, 0 FAIL (6 nauji saugyklos testai).
- `npm.cmd run lint`: PASS, pakartota pridėjus naršyklės scenarijų.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run build`: PASS.
- `node scripts/check-saved-investigations-browser.mjs`: 12 PASS, 0 FAIL,
  tikrame vietiniame Edge su atskiru laikinu profiliu. Patikrintas išsaugojimas,
  visas rezultatas, parametrai, teksto saugus rodymas, puslapio atnaujinimas,
  filtrai, šalinimo atšaukimas / patvirtinimas, fokuso grąžinimas, sugadinta
  saugykla, kvotos klaida ir 375 / 1440 px plotis be horizontalaus slinkimo.
  Užklausų į Gemini ar `/api/ai` nepastebėta.
- `git diff --check`: PASS. Galimi LF → CRLF informaciniai pranešimai.
- Priklausomybės nepasikeitė, `npm ci` šiame etape nekartotas.
- Išlieka ankstesnis Node perspėjimas `MODULE_TYPELESS_PACKAGE_JSON`;
  bendras projekto modulių režimas nekeistas.

Tai tik pasirinktų kelių patikra, ne visų telefonų, naršyklių ar viso projekto
galutinio tinkamumo patvirtinimas. Platesnis B dizaino / prieinamumo testavimas
lieka kitam etapui. Autentifikacijos, RLS ir tikro Gemini testai neatlikti.

## Pakeisti failai

- `README.md`
- `docs/integration-contract.md`
- `docs/developer-b-saved-investigations.md` (naujas)
- `docs/phase-5-b-report.md` (naujas)
- `src/app/investigations/page.tsx`
- `src/types/investigation.ts`
- `src/lib/investigation.ts`
- `src/components/investigation/investigation-panel.tsx`
- `src/components/investigation/investigation-result-view.tsx` (naujas, bendras rezultato rodinys)
- `src/components/investigation/save-investigation-button.tsx` (naujas)
- `src/components/investigation/saved-investigations-view.tsx` (naujas)
- `src/components/investigation/use-demo-investigations.ts` (naujas)
- `tests/saved-investigations.test.mjs` (naujas)
- `scripts/check-saved-investigations-browser.mjs` (naujas)

## A perdavimas ir Git

A prijungs `InvestigationRepository` paskyros adapterį, Supabase autentifikaciją
ir RLS bei Gemini serverį. Demo rezultatai automatiškai į paskyrą neperkeliami.
Sutartis ir žinomi vietinės saugyklos apribojimai:
[išsaugotų tyrimų integracija](developer-b-saved-investigations.md).

Pradžioje vietinė Git būsena buvo švari. `commit`, `push`, `merge` ir `deploy`
neatlikti. Nuotolinės saugyklos būklė šiame etape iš naujo netikrinta;
ankstesnio `fetch` atsisakymo nepaisyta nebuvo. Prieš įkėlimą būtina peržiūrėti
šio etapo diff ir gauti atskirą naudotojo patvirtinimą.
