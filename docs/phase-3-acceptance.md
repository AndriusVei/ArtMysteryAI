# 3 etapo tikros priėmimo patikros

**3 etapas užbaigtas.** Tikra registracija, laiško pristatymas ir jo numatytasis
PKCE patvirtinimas, sesijos, paskyros kolekcija bei dviejų naudotojų RLS patikrinti.
4 etapas nepradėtas.

Data: 2026-11-16. Projektas „ArtMysteryAI“, atskira vietinė surinkta versija,
Windows, Node.js 26.13.0, Supabase CLI 3.2.0, Edge atskiruose laikinuose profiliuose.
Tikros bazės migracija pritaikyta pagal ankstesnį atskirą patvirtinimą.
Naudotojui paprašius „užbaik 3 etapą“, atlikti izoliuoti Auth, kolekcijos ir
RLS bandymai, taip pat jo pateiktu adresu užsakyta viena tikra registracija.
Asmeniniai adresai, slaptažodžiai, tokenai ir administratoriaus raktai šiame faile
nesaugomi. Naujo commit, Git push/merge ar deploy agentas nevykdė.

## Tikri dviejų naudotojų bandymai

`scripts/check-auth-live.mjs` sukūrė dvi izoliuotas tikras Supabase Auth tapatybes
be laiškų siuntimo. Serverio administratoriaus raktas gautas per CLI ir perduotas
tik proceso stdin; į failus, naršyklę, programą ar ataskaitas neįrašytas.
RLS ir UI bandymai vykdyti su viešu raktu ir įprastomis šių naudotojų sesijomis,
ne su administratoriaus prieiga. `finally` pašalino tik to paleidimo testines
paskyras. Atskira SQL patikra patvirtino 0 likusių izoliuotų paskyrų ir 0 eilučių
visose trijose testuotose lentelėse.

| Scenarijus | Tikėtasi | Faktinis rezultatas |
| --- | --- | --- |
| Nepatvirtinta tapatybė | Slaptažodžio login nesuteikia sesijos | PASS, `email_not_confirmed` |
| Galiojantis vienkartinis tokenas | Serveris patvirtina ir nustato sesiją | PASS, `/profile`, API 200 |
| To paties tokeno pakartojimas | Nesuteikia naujos sesijos per patvirtinimą | PASS, kontroliuojamas klaidos puslapis |
| Slapukai | HttpOnly ir SameSite=Lax | PASS abiejų realių sesijų kelyje |
| Puslapio atnaujinimas | Tapatybė ir kolekcija išlieka | PASS |
| B kūrinio puslapio save | Tikri muziejaus duomenys iš serverio | PASS, kūrinys 16568 |
| A ir B tas pats kūrinys | Atskiri įrašai ir pastabos | PASS, skirtingi įrašai |
| Kategorija ir pastaba | Išsaugoma paskyroje, išlieka po refresh | PASS |
| HTML pastaboje | Tekstas, nevykdomas kodas | PASS |
| Pasenęs atnaujinimas | Nieko neperrašo | PASS, HTTP 409 |
| Pakartotinis save | Nedubliuoja ir neištrina pastabos | PASS |
| Svetimas user_id ir DELETE per programos API | Neatskleidžia ir nekeičia A duomenų | PASS, netinkama įvestis 400 / svetimas ar pasenęs įrašas 409 |
| Šalinimo atšaukimas ir patvirtinimas | Tik pasirinktas savo įrašas | PASS, B įrašas išlieka |
| Atsijungimas | A API 401, B toliau prisijungęs | PASS |
| Pakartotinis login su slaptažodžiu | Tikra patvirtinta paskyra prisijungia | PASS |
| 375 / 1440 px paskyros kolekcija | Nėra horizontalaus perpildymo | PASS |

Auth/UI scenarijus: **19 PASS, 0 FAIL**.
Jo viduje paleistas atskiras `scripts/check-supabase-rls.mjs`:
**11 PASS, 0 FAIL**. Visoms trims lentelėms su dviem skirtingais tikrais
naudotojais patikrinti savo SELECT/INSERT/UPDATE/DELETE, svetimi SELECT/UPDATE/
DELETE, svetimo savininko INSERT, user_id pakeitimas ir anoniminis CRUD.
Nuosavybės pažeidimams tikrinamas RLS kodas `42501`, ne vien bet kokia SQL klaida.

## Numatytojo laiško ir PKCE kelias

Pradinė Auth konfigūracijos peržiūra parodė, kad callback allowlist tuščias.
Pridėtas tikslus vietinis `/auth/confirm` adresas. Individualų lietuvišką laiško
šabloną serveris atmetė dėl nemokamo plano / numatytojo laiškų tiekėjo apribojimo.
Planas, mokėjimai, SMTP ir kredencialai nekeisti. Programa papildyta PKCE kodo
keitimu į sesiją, todėl gali naudoti numatytą `ConfirmationURL` be mokamo šablono.
Ankstesnis token_hash kelias paliktas galimam savo SMTP šablonui.

Nauji `tests/auth-confirmation.test.mjs` tikrina PKCE, token_hash, dublikatus,
mišrius parametrus, netinkamus tokenus ir jų klaidas. Visas vienetinių testų
rinkinys: **98 PASS, 0 FAIL**; TypeScript ir produkcinis build praėjo.

Tikros registracijos forma naudotojo pateiktu adresu jau pateikta vieną kartą.
Sugeneruotas slaptažodis saugomas tik ignoruojamame `.env.auth-verification.local`.
Registracijos paskyra paliekama naudotojui, nevaloma kaip dvi izoliuotos tapatybės.
Pirmo laiško kopijuota nuoroda grąžino `otp_expired`; paskyra tada liko
nepatvirtinta. Pradinis laukimo procesas buvo pasibaigęs; atkūrimo scenarijus
pataisytas, kad tikrintų slapukus vietinės svetainės, ne about:blank kontekste.
Šie nesėkmingi bandymai neįskaičiuoti kaip sėkmingi.

Naudotojas atskirai leido vieną naują laišką. Pridėta `resendConfirmation`
serverio funkcija ir lietuviška pakartotinio patvirtinimo forma prisijungimo
puslapyje. SDK `resend` sukūrė naują PKCE verifier ir užsakė vieną naują laišką
esamai paskyrai, nekurdamas jos iš naujo ir nekeisdamas slaptažodžio.
Naudotojas gavo laišką ir atskirai leido panaudoti jo nukopijuotą naują nuorodą.
Nuoroda patikrinta pagal konkretų Supabase hostą ir /auth/v1/verify kelią;
jos turinys nespausdintas ir neįrašytas į Git. Laikinas nuorodos failas sunaudotas
ir pašalintas tik bandymo scenarijaus.

**Galutinis laiško / PKCE scenarijus: 8 PASS, 0 FAIL.**

| Scenarijus | Tikėtasi | Faktinis rezultatas |
| --- | --- | --- |
| Pakartotinė patvirtinimo užklausa | Vienas naujas laiškas esamai paskyrai | PASS |
| Naujausio tikro laiško ConfirmationURL | PKCE kodas keičiamas į serverio sesiją | PASS, /profile |
| Adresas po patvirtinimo | Nelieka kodo ar tokeno | PASS |
| Paskyros API ir slapukai | 200, HttpOnly, SameSite=Lax | PASS |
| Puslapio atnaujinimas | Sesija išlieka | PASS |
| Atsijungimas | API 401 | PASS |
| Netinkamas slaptažodis | Lietuviška klaida, sesijos nėra | PASS |
| Pakartotinis login teisingu slaptažodžiu | API 200 | PASS |

Baigiant scenarijų vartotojas atsijungtas. Tik skaitymo SQL patvirtino, kad jo
paskyros email_confirmed_at nustatytas, izoliuotų testinių paskyrų nėra,
visose trijose lentelėse nėra bandymų eilučių. Asmeninė patvirtinta paskyra palikta.

Bandymui laikinai pridėtas tikslus `http://localhost:3191/auth/confirm`, kad
nebūtų stabdomas naudotojo serveris užimtame 3000 prievade. Užbaigus laiško
patikrą testinis callback pašalintas, paliktas `http://localhost:3000/auth/confirm`.
Galutinė CLI Auth konfigūracijos diff patikra: 0 skirtumų.

Po pakeitimų: lint, TypeScript ir produkcinis build PASS; 98 vienetiniai testai
PASS, 0 FAIL. Pagrindo Edge / HTTP regresija pakartota: 20 PASS, 0 FAIL.
Įsidiegusios bibliotekos, schema ir RLS nebuvo papildomai keičiamos šiame
baigiamajame bandyme. Žinomi kūrimo įrankių audito įrašai, 100 reprezentatyvių
galutinio vertinimo bandymų ir produkcija priklauso vėlesniems etapams;
99 % patikimumo ar visos gamybinės saugos garantija neteikiama.
