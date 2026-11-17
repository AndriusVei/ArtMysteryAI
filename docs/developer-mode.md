# Developer Mode

Jungiklis **🛠️ Developer Mode** matomas po pagrindine navigacija. Pradžioje
išjungtas. Jį įjungus ir atlikus operaciją rodomi tik paslauga, fiksuotas adreso
šablonas, HTTP metodas / būsena, HTTP sėkmė arba nesėkmė ir apytikris laikas ms.
Tai nėra prisijungimo ar duomenų teisingumo patvirtinimas; pvz., HTTP 200
gali reikšti pristatytą, bet verslo validavimo neatitikusį atsakymą.

Paslaugos: Programa, Art Institute of Chicago, Supabase ir Gemini. Serverio
operacijos renkamos vieno request kontekste per AsyncLocalStorage, iki 12 įrašų.
API grąžina saugų JSON `X-ArtMystery-Diagnostics` antraštėje. Paieškos / kūrinio
SSR puslapiai perduoda tik tokio paties tipo įrašus. Vaizdo užklausai naršyklėje
naudojamas Resource Timing: jei HTTP būsena neprieinama, ji neišgalvojama.
Laikas apytikris, matuojamas iki atsakymo antraščių, gali būti paveiktas podėlio.

Saugumo taisyklės:

- Nėra endpoint su query, ID ar laisvu tekstu: tik allowlist, pvz.
  `/api/artworks/:id`, `/rest/v1/ai_investigations`, `/interactions`.
- Nerenkami request / response body, slapukai, Authorization, API raktai,
  slaptažodžiai, prompt tekstai, paskyrų ID ar išimčių / stack trace tekstai.
- Naršyklė dar kartą validuoja serverio metaduomenis ir atmeta papildomus laukus.
- Istorija tik RAM, iki 30 įrašų. Išjungiant valoma, po pilno perkrovimo dingsta;
  pasikeitus autentifikacijos tapatybei provider sukuriamas iš naujo.
- Jungiklis nesiunčia testinių API užklausų, nekeičia RLS, sesijos, autorizacijos,
  kvotų, mokėjimo ar Gemini jungiklio. Serveris nenaudoja kliento diagnostikos
  parinkties kaip prieigos teisės. Nežinomi / kitų domenų adresai nefiksuojami.

Jungiklis ir išvalymo mygtukas valdomi klaviatūra. Lentelė turi caption, stulpelių
antraštes ir fokusuojamą horizontalaus slinkimo sritį mažame ekrane.

## Patikra

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Kai vietinis serveris veikia (tik localhost / 127.0.0.1):

```powershell
node scripts/check-diagnostics-browser.mjs http://127.0.0.1:3000
```

Atverk `/artwork/16568`, Tab pasiek jungiklį ir paspausk Space. Pamatysi tik
muziejaus adreso šabloną; išvalyk istoriją. Naršyklės konsolėje atlikus
`fetch('/api/artworks/invalid')` turėtų pasirodyti HTTP 400 be žalių parametrų.
Prisijungus naudojamos kolekcijos užklausos pateiks Supabase metaduomenis.
Gemini operacijos atsiranda tik iš tikro leidžiamo generavimo; diagnostika jo
neįjungia ir nekviečia. 5 etape Gemini metaduomenys patikrinti su testiniu
transportu ir tikromis laikinomis Supabase paskyromis, be tikrų modelio kvietimų.
