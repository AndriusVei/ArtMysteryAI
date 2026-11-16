# 4 etapo A vietinės integracijos ataskaita

2026-11-16–17. Šaka `feature/a-gemini`, pagrindas `62030fd`.
Vartotojas patvirtino 4 etapą ir atskirai patvirtino AI debesijos migraciją.
Migracija pritaikyta ir DB patikros praėjo; žr. `docs/phase-4-migration-acceptance.md`.
Vartotojas vėliau įrašė Gemini raktą, nurodė Free planą ir atskirai patvirtino
modelio pakeitimą bei vieną tikrą bandymą. Bandymas PASS; leidimas sunaudotas.
Pirmo bandymo rezultatai: `docs/phase-4-gemini-acceptance.md`.
Atnaujinimas: vėliau atskirai patvirtinti du papildomi kvietimai jau panaudoti;
abu bandymai nepavyko, antrajame patvirtintas Google HTTP 503. Tikras Supabase / UI
srautas su imituotu modeliu: 16 PASS. Naujausia būsena ir įrodymai:
`docs/phase-4-e2e-acceptance.md`. Po to vartotojas atskirai patvirtino
`gemini-3.5-flash-lite` ir vieną papildomą kvietimą: tikras 5 klausimų srautas
praėjo 10 patikrų. Visi suteikti kvietimų leidimai panaudoti.
**4 etapo funkcinis priėmimas užbaigtas.**
Commit, push, merge ir deploy agentas nevykdė. 5 etapas nepradėtas.

## Kas įgyvendinta

- Oficialus `@google/genai` SDK 3.3.0. `package-lock.json` pakito dėl šio naujo
  paketo ir jo priklausomybių, ne dėl pakartotinio projekto kūrimo.
- `POST /api/ai`: same-origin, serverio `getUser`, griežtas užklausos formatas
  ir iki 16000 baitų kūnas; muziejaus metaduomenys imami serveryje pagal ID.
- Gemini Interactions: JSON schema, tiksliai 3 arba 5 klausimai; nepatikimas tekstas
  perduodamas kaip JSON duomenys. Nėra įrankių, vaizdo analizės ar automatinio
  papildomų kvietimų tęsimo. Sisteminė instrukcija atskiria faktus nuo hipotezių.
  Vien instrukcija negarantuoja modelio faktinio tikslumo — reikalinga tikro turinio peržiūra.
- Muziejaus faktų bloką ir šaltinių URL sudaro serveris. Modeliui neleidžiama
  pakeisti šio bloko. Sugadinti / per dideli atsakymai neįrašomi ir nerodomi.
- Atskirai patvirtinta ir pritaikyta DB migracija: atominių naudotojo, IP bei bendrų kvotų funkcija,
  viena aktyvi užklausa naudotojui, 90 s užrakto galiojimas. Ne in-memory skaitikliai.
- Užklausos ID apsaugo nuo jau sėkmingai įrašyto generavimo pakartojimo. Tas pats
  ID su kitu prašymu atmetamas. Klaidos automatiškai nekartojamos. Nesėkmė tarp
  modelio atsakymo ir DB įrašo gali sunaudoti paslaugos kvotą nepalikdama rezultato.
- `GET/POST/DELETE /api/investigations`: tik savininko paskyra ir RLS;
  išsaugojimui naršyklė siunčia tik generavimo ID. Rezultato kilmę patikrina HMAC,
  todėl savininko tiesiogiai DB įrašytas netikras JSON nepriimamas kaip serverio generavimas.
- Esami B `InvestigationService`, `InvestigationRepository` ir komponentai
  papildyti live / account adapteriais. Formos pasirinkimai, rezultatų struktūra,
  filtrai, fokusas ir šalinimo patvirtinimas išsaugoti. Demo adapteriai palikti.
- `generationId` neprivalomas bendrame tipe dėl suderinamumo su B demo įrašais;
  tikrame adapteryje UUID privalomas. Demo į paskyrą nekeliamas.
- `AI_LIVE_ENABLED` ir `AI_STORAGE_ENABLED` atskirti. Be konfigūracijos rodoma
  aiški demonstracija. Live klaida tyliai nepakeičiama demo rezultatu.
  Privačiame `.env.local` pridėtos trūkstamos AI eilutės ir atsitiktinis HMAC raktas;
  Vėliau vartotojas įrašė raktą; po atskirų patvirtinimų dabartinis modelis
  `gemini-3.5-flash-lite`.
  Po patvirtintos migracijos paskyros saugykla įjungta vietoje;
  `AI_LIVE_ENABLED=false`. Esamos Supabase reikšmės neperrašytos.
- Instrukcija `docs/gemini-setup.md` ir atskirai leidžiamas vienos tikros užklausos
  scenarijus `scripts/check-gemini-live.mjs`; pagal nutylėjimą kvietimas užblokuotas.

## Patikros

| Patikra | Rezultatas / tikroji apimtis |
| --- | --- |
| Vienetiniai testai | 115 PASS, iš jų 16 DI testų ir loopback Origin regresija; Gemini HTTP imituotas |
| SDK importas ir imitacija | PASS; tikra SDK serializacija, atsakymo normalizavimas, 429 be retries ir tęsinio atsisakymas |
| `lint`, `typecheck`, produkcinis `build` | PASS |
| B tyrimo naršyklės scenarijai | 12 PASS; tikra Edge, aiški demo būsena, 3/5 klausimai, fokusas, 375/1440 px |
| B išsaugojimo naršyklės scenarijai | 12 PASS; išsaugojimas, perkrovimas, filtrai, šalinimas, sugadinta / pilna localStorage |
| Bendras pagrindas / navigacija | 20 PASS; HTTP, 404, plotis ir turinio praleidimo nuoroda |
| Nauji API svečiui / kilmė / cache | 7 PASS; 401/403, privatūs necache'inami atsakymai |
| Tikro Gemini bandymo apsauga | PASS: be rakto ir atskiro leidimo `NOT RUN`, jokio API kvietimo |
| Kliento produkciniai JS failai | Nerasta `GEMINI_API_KEY`, `AI_SERVER_SECRET`, `sb_secret_`, `service_role` |
| Naujos migracijos vykdymas ir kvotos tikroje DB | PASS; atskirai patvirtinta migracija pritaikyta, SQL RLS / kvotų patikros atšauktos ROLLBACK |
| Tikras Gemini standalone | PASS; viena atskirai patvirtinta tikra užklausa, 3 klausimai, formatas patikrintas |
| Tikro modelio turinio edukacinė kokybė | Ribota vieno realaus 5 klausimų rezultato peržiūra; pastebėti terminų / teiginių apimties netikslumai aprašyti E2E ataskaitoje |
| Paskyros UI / tikros DB srautas dviem naudotojams su fixture modeliu | 16 PASS; 3/5 klausimai, save, reload, RLS, delete; Gemini nekviestas |
| Visas srautas su tikru modelio rezultatu | 10 PASS su `gemini-3.5-flash-lite`; 1 atskirai patvirtintas tikras kvietimas |

Pirmi Edge paleidimai sandbox aplinkoje negavo CDP atsakymo. Pakartojus tuos
pačius scenarijus su leidžiamu vietinės naršyklės paleidimu visi praėjo.
Naršyklės naudojo atskirus laikinus profilius; asmeninės kolekcijos nekeistos.
Projekto serveris testuotas atskiru `localhost:3192` adresu; vartotojo 3000 serveris nestabdytas.
3 etapo tikros Supabase patikros lieka istoriniu įrodymu, jos neatstoja naujos migracijos testų.

## Ribos ir kitas žingsnis

Pridėta viena tiesioginė priklausomybė. npm diegimo metu užblokavo `protobufjs`
postinstall; apsauga neapeita. SDK importas, imituotas HTTP ir build praėjo,
ir pirmas tikros paslaugos bandymas praėjo. Ankstesni 7 moderate dev priklausomybių audit
radiniai automatiškai netaisyti. Node įspėjimas apie TS modulio tipą nedaro testų nesėkmingais.

Visos kvotų ir užklausų ribos nurodytos prijungimo instrukcijoje. Jos nėra pinigų
biudžetas; mokėjimo nejungti automatiškai. Rakto / modelio reikšmės neturi numatytų
tikrų reikšmių. `AI_SERVER_SECRET` turi būti stabilus ir saugomas privačiai.
Neišsaugoti generavimai lieka privačiais DB juodraščiais; TTL nėra.
Vercel patikimo IP antraštė aprašyta
[platformos dokumentacijoje](https://vercel.com/docs/headers/request-headers);
jos veikimas bus tikrinamas publikavimo etape. Kitam proxy adapteris dar neįgyvendintas.

Raktas prijungtas, vartotojas nurodė Free planą; tikri 3 klausimų standalone ir
5 klausimų paskyros srauto bandymai praėjo. Tarp jų du 4 Hydrogen bandymai
nepavyko, bent viename patvirtintas tiekėjo HTTP 503; klaidos nepaslėptos demo.
`202611160002_ai_limits_and_saved_results.sql` migracija projekte `ArtMysteryAI`
jau atskirai patvirtinta ir patikrinta. Tikras visas paskyros srautas patikrintas
su 3.5 Flash-Lite. 4 etapas užbaigtas; įprastas generavimas paliktas išjungtas
pagal suteiktų bandymo leidimų ribas. 5 etapui reikia „PATVIRTINU 5 ETAPĄ“.
