# 4 etapo AI migracijos priėmimas

2026-11-16 vartotojas atskirai patvirtino migraciją
`202611160002_ai_limits_and_saved_results.sql` projekte `ArtMysteryAI`.
Tai nebuvo leidimas Gemini užklausoms, mokėjimo įjungimui ar publikavimui.

Tikslas patvirtintas CLI: projektas `ArtMysteryAI`, ref `qjqkjtqqvzbzihueuqzu`,
production DB. Prieš vykdymą dry-run rodė tik vieną patvirtintą migraciją.
Vykdyta `db push --remote=qjqkjtqqvzbzihueuqzu --skip-vault --yes`;
migracija sėkmingai pritaikyta. Istorijoje yra `202611160001` ir `202611160002`.
Baigiamasis dry-run: `upToDate:true`, laukiančių migracijų nėra.

## Tikros DB rezultatai

- Keturi nauji `ai_investigations` stulpeliai yra DB.
- Abi kvotų / užraktų lentelės turi įjungtą RLS; `anon` ir `authenticated`
  neturi tiesioginės prieigos prie jų. Autentifikuotas naudotojas turi teisę
  kviesti kvotos rezervavimo funkciją; anoniminis — neturi.
- `scripts/check-ai-database.sql` įvykdytas tikroje DB vienoje transakcijoje,
  baigtoje `ROLLBACK`. Dvi laikinos `auth.users` tapatybės sukurtos tik šioje
  transakcijoje; registracijos laiškų nesiųsta. Privatūs naudotojų duomenys neskaityti.
- Patikrintas anoniminio funkcijų kvietimo, tuščios tapatybės ir netinkamo IP
  maišos formato draudimas; tiesioginio kvotų skaitymo bei užraktų trynimo draudimas.
- Pirmas rezervavimas leidžiamas, aktyvus rezervavimas grąžina `busy`;
  kitas užklausos ID arba kitas savininkas užrakto neatlaisvina. Teisingas
  atlaisvinimas veikia, pasibaigęs užraktas neblokuoja naujos užklausos.
- Patikrinti naudotojo minutės / dienos, IP minutės / dienos ir viso projekto
  dienos limitai. Dienos bei IP riboms kvotų skaitikliai paruošti tik bandymo
  transakcijoje; viskas atšaukta. Faktinio paros laukimo ar Gemini kvietimų nebuvo.
- Tikra `authenticated` DB role patikrinta savo įrašo skaitymo ir šalinimo teisė;
  svetimo skaitymo, keitimo, šalinimo ir įterpimo draudimas. Skaitymo izoliacija
  patikrinta abiem kryptimis. Patikrintas unikalus savininko užklausos ID ir
  draudimas pažymėti nepasirašytą įrašą išsaugotu.
- Bandymo JSON buvo `{}` — tai tik DB RLS ir apribojimų patikra, ne tikro
  DI rezultato ar serverio HMAC patikra. HMAC tikrinamas vietiniais vienetiniais testais.

Baigiama tikra DB patikra: `ai_investigations=0`, `ai_request_buckets=0`,
`ai_request_locks=0`. Bandymo naudotojų įterpimas atšauktas toje pačioje
transakcijoje. Esamų projekto įrašų migracija netrynė.

## Dar nepatikrinta

Vienalaikių skirtingų DB jungčių apkrovos bandymas neatliktas; patikrinti nuoseklūs
užrakto scenarijai ir funkcijos bendras transakcijos advisory lock.
Tai SQL tapatybių testas, ne dviejų realių naršyklės sesijų live Gemini testas.
Tikras Gemini, modelio atsakymo kokybė bei visas generavimo → išsaugojimo →
perkrovimo → šalinimo srautas laukia rakto, modelio ir atskiro užklausų leidimo.
`AI_LIVE_ENABLED=false` išlieka; jokių modelio užklausų neatlikta.
