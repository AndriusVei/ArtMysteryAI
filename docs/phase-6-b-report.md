# 6 B etapas: dizainas ir prieinamumas

Apimtis: `/artwork/16568`, `/collection`, `/investigations`. A paieška,
autentifikacija, Gemini serveris, Supabase ir diegimas nekeisti.

## Rastos ir pataisytos problemos

1. Išsaugotų tyrimų komponentas kūrė antrą `main` viduje bendro `main`.
   Jis pakeistas į `div`; lieka vienas pagrindinio turinio orientyras.
2. Kolekcijoje pradėjus redagavimą fokusas nepersikeldavo į formą; uždarius
   formą likdavo ant pašalinto valdiklio. Dabar fokusas perkeliamas į kategoriją,
   o po išsaugojimo ar atšaukimo grąžinamas į „Redaguoti“.
3. Abiejų B sąrašų šalinimo patvirtinime fokusas dabar nukreipiamas į atšaukimą.
   Atšaukus grąžinamas į šalinimo mygtuką. Tai vietinis patvirtinimo blokas,
   ne modalinis dialogas: fokuso spąstų nėra ir jie nereikalingi.
4. Kolekcijos išsaugojimo / redagavimo klaidos dabar turi `role="alert"`,
   sėkmės pranešimai – `role="status"`.
5. Kolekcijos kortelei pritaikytas ilgų žodžių laužymas.

Bendri `layout.tsx`, `globals.css`, navigacija, paketai ir konfigūracijos nekeisti.

## Galutiniai rezultatai

- `npm.cmd test`: 68 PASS, 0 FAIL.
- `npm.cmd run lint`: PASS.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run build`: PASS po galutinio komponentų pakeitimo.
- Galutinė Edge patikra šviežiai surinktoje versijoje: **30 PASS, 0 FAIL**.
  Įsikrovė tikras muziejaus paveikslas per vietinį serverio proxy.
- Peržiūrėtos patikrų ekrano kopijos; ilgi tekstai telpa, fokusas matomas.
- `git diff --check`: PASS (tik informaciniai LF → CRLF perspėjimai).
- `npm ci` nekartotas, priklausomybės nepasikeitė. Lieka ankstesnis Node
  `MODULE_TYPELESS_PACKAGE_JSON` perspėjimas; modulių režimas nekeistas.

## Naršyklės tikrinimo apimtis

Scenarijus `scripts/check-b-accessibility-browser.mjs` paleidžia įdiegtą Edge
atskirame laikiname profilyje. Naudotojo kolekcija ir tyrimai neliečiami.
Naudojama tikra CDP klaviatūros įvestis, ne vien programinis mygtuko `click()`.

- Keturios B būsenos: kūrinys su tyrimu, kolekcijos redagavimas, kolekcijos
  peržiūra ir išskleistas išsaugotas tyrimas.
- Kiekvienai 320, 375, 768 ir 1440 CSS px plotis: nėra horizontalaus slinkimo
  ar valdiklių išėjimo už ekrano. Tikrinti ir ilgi tekstai be tarpų.
- Vienas `main`, viena `h1`, `lang="lt"`, unikalūs ID ir formų etiketės.
- Matomas klaviatūros fokusas ir „Pereiti prie turinio“ nuoroda.
- LT / originalo pasirinkimas, redagavimas, išsaugojimas, atšaukimas ir
  tyrimo / atsakymų išskleidimas klaviatūra.
- Fokuso perkėlimas pradėjus ir baigus redagavimą, abiejų sąrašų šalinimo
  atšaukimas, kolekcijos įrašymo klaidos paskelbimas.
- Chromium prieinamumo medyje vienas `main` ir pavadintas tyrimų paieškos laukas.
- Nemokama muziejaus API ir vietiniai demo adapteriai; Gemini / `/api/ai`
  užklausų nedaroma.

Temos teksto kontrastas su `paper` fonu apskaičiuotas pagal sRGB santykinį
skaistį: `ink` 13,57:1, `muted` 5,92:1, `gold` 5,14:1.
Tai bazinių teksto spalvų skaičiavimas, ne pilnas kiekvienos būsenos kontrasto auditas.

## Aplinkos pastabos

Pradiniai naršyklės paleidimai 3000 prievade sustojo dėl navigacijos laiko arba
neinteraktyvios sąsajos. Per HTTP puslapis ir patikrinti JS failai grąžino 200;
tiksli seno serverio būklės priežastis nenustatyta. Jo nestabdėme ir nekeitėme
naudotojo failų dėl šio trikdžio. Patikra perkelta į atskirą šviežiai surinktą
versiją 3100 prievade, kur klaviatūros patikros praėjo.

Apribotoje patikrų aplinkoje muziejaus vaizdo užklausa buvo blokuota `EACCES`,
už jos ribų šis kompiuteris reikalavo sistemos CA sertifikatų. TLS tikrinimas
neišjungiamas; vietiniam patikrų serveriui naudojamas Node `--use-system-ca`.
Šie paleidimo trikdžiai nėra nutylėti ar įskaičiuoti kaip praėję testai.

## Pakartojimas

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
# Atskirame terminale, kai nėra kito serverio 3100 prievade:
node --use-system-ca node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
# Kitame terminale:
node scripts/check-b-accessibility-browser.mjs http://127.0.0.1:3100
```

Scenarijus leidžia tik loopback adresus. Ekrano kopijos įrašomos į atskirą
laikiną patikrų profilį; jo kelias išspausdinamas pabaigoje, į Git jos nekeliamos.

## Pakeisti failai ir A perdavimas

- `src/components/collection/collection-card.tsx`
- `src/components/collection/save-artwork-button.tsx`
- `src/components/investigation/saved-investigations-view.tsx`
- `scripts/check-b-accessibility-browser.mjs` (naujas)
- `docs/phase-6-b-report.md` (naujas)
- `README.md`

A prijungs ankstesnėse sutartyse aprašytus Supabase ir Gemini adapterius.
Keisdamas duomenų gavimą turi išlaikyti formų etiketes, loading / error būsenas,
fokuso perkėlimą ir nepridėti antro `main`. Peržiūros paskyroje turi būti
testuojamos iš naujo jau su tikrais teisių ir kvotų atsakymais.

Fizinio telefono, Safari / Firefox, ekrano skaitytuvo ir visos WCAG atitikties
auditas neatlikti. Tai naršyklės plotis ir parinkti prieinamumo keliai, ne visų
įrenginių sertifikavimas ar pilna projekto pabaiga. RLS, tikra autentifikacija,
Gemini ir galutinis MASTER PROMPT vertinimas lieka po A integracijų.

Pradžioje vietinė Git būsena buvo švari. `commit`, `push`, `merge` ar `deploy`
neatlikti; nuotolinė būklė šiame etape netikrinta. Įkėlimui reikės atskiro patvirtinimo.
