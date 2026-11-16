# Pirmas tikras Gemini bandymas

2026-11-16 vartotojas atskirai patvirtino vietinį modelio pakeitimą iš
`gemini-2.5-flash` į `gemini-4-hydrogen` ir vieną tikrą užklausą.
Patvirtintos ribos: 1 užklausa, 6000 išvesties tokenų, 25 s, jokių pakartojimų
ir jokių DB įrašų. Mokėjimo ar bendro generavimo programoje įjungimas nepatvirtintas.

## Vykdymas ir rezultatas

- `.env.local` modelis pakeistas į patvirtintą `gemini-4-hydrogen`;
  raktas neparodytas ir neįrašytas į Git.
- Vykdytas `scripts/check-gemini-live.mjs` su trimis aiškiais bandymo leidimo
  aplinkos parametrais. Jie nustatyti tik atskirame bandymo procese.
- Scenarijus papildomai riboja HTTP transportą iki vieno kvietimo.
- Įvestis: vieši Monet kūrinio `16568` metaduomenys iš esamo testinio failo,
  `beginner`, `detective_mystery`, 3 klausimai, tuščias asmeninis prašymas.
- Naudotas tikras oficialus SDK ir tikra Gemini paslauga. `store:false`,
  `automatic_continuation:false`, retries išjungti; įrankių ir paveikslo nebuvo.
- **PASS**: atsakymo statusas `completed`, grąžintas JSON, patikrintas dydis,
  struktūra ir tiksliai trys klausimai su paaiškinimais. Muziejaus faktų blokas
  sudarytas serveryje iš įvesties metaduomenų. Raktas šiam modeliui buvo priimtas.
- Atsakymo turinys nebuvo parodytas terminale ar išsaugotas į failą / DB.
  Pakartotinių modelio užklausų nebuvo. Patvirtintas vieno kvietimo leidimas sunaudotas.
- 6000 yra nustatytas išvesties limitas, ne faktiškai sunaudotų tokenų ataskaita.
  Vartotojas nurodė Free planą; paskyros billing tiesiogiai nebuvo administruojamas.

## Kas dar nepriimta

Tai šio pirmo standalone bandymo apimties ribos. Vėliau 4 etapo tikras paskyros
srautas priimtas su atskirai patvirtintu `gemini-3.5-flash-lite`;
naujausi rezultatai yra `docs/phase-4-e2e-acceptance.md`.

Tai standalone integracijos bandymas. Jis nepatvirtina viso naršyklės
`/api/ai` → DB juodraščio → išsaugojimo → perkrovimo → pašalinimo srauto,
dviejų naršyklės paskyrų izoliacijos ar 5 klausimų tikro generavimo.
Turinio edukacinė kokybė ir faktinis tikslumas nebuvo peržiūrėti; patikrintas formatas.
Šie likę 4 etapo bandymai reikalauja atskiro konkretaus papildomų modelio kvietimų leidimo.
`AI_LIVE_ENABLED=false` paliktas, mokėjimas nejungtas. Commit, push, merge ir deploy nevykdyti.
