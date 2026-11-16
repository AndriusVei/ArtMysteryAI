# Kolekcijos išsaugojimo 403 vietoje

2026-11-16 vartotojas pranešė apie „Ši užklausa neleidžiama“ adresu
`http://127.0.0.1:3187/artwork/27954`.

Atkartota be sesijos ir be DB pakeitimų: POST į `/api/collection`, kai Origin
atitinka naršyklės adresą, per `127.0.0.1:3187` grąžino 403 `forbidden`, o per
`localhost:3187` — 401 `unauthorized`. 401 šiame bandyme reiškia, kad kilmės
patikra praėjo ir pasiekta sesijos patikra. Tas pats skirtumas matytas 3000 prievadu.

Priežastis: įdiegtas Next.js `NextURL` loopback IP pakeičia į `localhost`;
po proxy perduoto `request.url` kilmė nebesutampa su tikru naršyklės Origin.
Tai ne muziejaus ar Supabase RLS klaida — užklausa atmetama prieš DB veiksmą.

`requireSameOrigin` papildytas siaura vietine išimtimi: abu adresai turi būti
loopback, tas pats protokolas ir prievadas, o tikras Host turi sutapti su
Origin. `cross-site`, trūkstamas Origin, kitas Host, prievadas, protokolas,
nevietinis domenas ir suklastotos Forwarded antraštės lieka atmetami.
Tas pats helper naudojamas kolekcijos ir DI API.

115 vienetinių testų PASS, įskaitant tikro įdiegto NextURL normalizavimo atvejį
ir neigiamus saugumo atvejus. Lint ir typecheck PASS. Gemini nekviestas.
Prisijungusio vartotojo kolekcijos įrašai nekurti ir nekeisti.

Jau veikiančio vartotojo 3187 serverio procesas nestabdytas ir jo produkcinis
surinkimas neperrašytas. `next start` procesui reikia naujo build ir paleidimo,
kad naudotų pataisytą kodą. Iki to galima naudoti `http://localhost:3187`;
slapukai tarp localhost ir 127.0.0.1 nesidalija, todėl gali reikėti prisijungti iš naujo.

Vėlesnė 4 etapo patikra: izoliuotame 127.0.0.1:3194 serveryje tikros laikinos
paskyros sėkmingai išsaugojo kūrinį 27954 per B mygtuką. Ankstesnė 403 klaida
nepasikartojo. Šie bandymo įrašai pašalinti kartu su tik jų laikinais savininkais.
