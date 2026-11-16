# Integracijos susitarimas su Kūrėju A

Tai siūloma suderinamumo sutartis pagal MASTER PROMPT. A dar jos neperžiūrėjo.
Pagrindas paruoštas viename projekte, naudojant `src/`, App Router ir `@/*` aliasą.
Nenaudojami Prisma, Redux, Docker ar papildomi UI karkasai.

Priklausomybių apribojimas: npm perspėja, kad ESLint 9.39.5 nebepalaikomas.
Jis pasirinktas dėl Next.js ESLint papildinių suderinamumo (ESLint 10 diegiant
buvo peerDependencies įspėjimų). Tai tik kūrimo įrankis; A turi suplanuoti
jo ir Next.js papildinių atnaujinimą kartu, prieš galutinį projekto vertinimą.

## Atsakomybės ir adresai

| Sritis | Atsakingas | Adresas / failas |
| --- | --- | --- |
| Paieška | A | `/explore`, `src/app/explore/page.tsx` |
| Detalės ir vaizdai | B | `/artwork/[id]`, `GET /api/artworks/[id]` |
| Kolekcija, kategorijos, pastabos | B | `/collection` |
| DI parametrų sąsaja | B | Kūrinio detalių puslapyje |
| Išsaugotų tyrimų sąsaja | B | `/investigations` |
| Autentifikacija | A | `/login`, vėliau `/register` |
| Gemini serveris | A | `POST /api/ai` |
| Diagnostika ir Vercel | A | Vėlesni etapai |

`/explore` ir `/login` dabar turi tik informacinius puslapius, kad navigacija
nevestų į klaidas. A pakeis jų turinį; paieškos ir autentifikacijos logikos nėra.
Nekurti pakartotinio Next.js pagrindo kitame kataloge.

## Bendri failai

Prieš keičiant `package.json`, `package-lock.json`, `src/app/layout.tsx`,
`src/app/globals.css`, `src/lib/navigation.ts` ar konfigūracijas, suderinti su kolega.
`src/components/site-header.tsx` yra bendroji navigacija.
Temos spalvos apibrėžtos `globals.css`; naudoti esamus `paper`, `ink`, `muted`,
`gold`, `line` žetonus. Sąsaja ir dokumentacija lietuviška, identifikatoriai angliški.

## Būsimų duomenų sutarčių planas

TypeScript sąsajos bus kuriamos kartu su jas naudojančiomis funkcijomis:
`Artwork`, `CollectionItem`, `Category`, `Note`, `ResearchSettings`, `SavedResearch`.
Muziejaus `artwork_id` yra skaičius; paieškos rezultato `id` turi tapti
`/artwork/[id]` įvestimi. API atsakymai tikrinami vykdymo metu, ne vien TypeScript.
Detalių duomenų gavimą sutelkti `src/lib/artic.ts`, nedubliuoti kiekviename puslapyje.

2 etapo B detalės paruoštos. `Artwork` ir `ArtworkResult` tipai yra
`src/types/artwork.ts`; muziejaus duomenys tikrinami `src/lib/artic.ts`.
Paieškos kortelė turi naudoti `<Link href={\`/artwork/${result.id}\`}>`.
API atsakymų ir bandymų sutartis: `docs/developer-b-artwork-details.md`.

Supabase adapterį ir serveriu patikrintą naudotojo tapatybę prijungs A.
B demonstraciniai adapteriai bus atskirti nuo tikro saugojimo ir aiškiai pažymėti UI;
localStorage duomenys nėra paskyros duomenys. Nekurti fiktyvios autentifikacijos.
Kolekcijos demo adapteris jau paruoštas: `src/lib/demo-collection.ts` ir
`CollectionRepository` sutartis `src/types/collection.ts`. Detalės A integracijai
ir apribojimai: `docs/developer-b-collection.md`. Demo įrašai automatiškai į paskyrą neperkeliami.
Gemini adapteris naudos A serverio sąsają; joks raktas nekeliauja į naršyklę.
DI rezultatų schemą ir klaidų formatą A ir B suderins prieš integraciją.
Paruošta B parametrų forma ir demo adapteris. Sutartys:
`src/types/investigation.ts`, tikrinimas ir vietinis šablonas `src/lib/investigation.ts`.
Integracijos detalės: `docs/developer-b-investigation.md`. A `/api/ai` B nekūrė.

## Nemokamas režimas

Muziejaus vieša API naudojama su talpinimu podėlyje ir ribotomis užklausomis.
Paveikslai tik su patikrintu `image_id` ir teisių informacija.
Supabase ir Gemini pradžioje demonstraciniai: nėra tikrų užklausų ar sąnaudų.
Prieš tikrą integraciją patikrinti tuo metu galiojančias nemokamas kvotas;
viršijus limitą rodyti klaidą, automatiškai nepereiti į mokamą paslaugą.

## Perdavimas ir patikros

Prieš jungimą A turi peržiūrėti pagrindą, patvirtinti Node versiją ir adresus,
paleisti README nurodytas patikras bei palyginti savo turimą vietinį kodą.
Pull Request patikrų aprašas yra `.github/workflows/checks.yml`. GitHub jis dar
nepaleistas. A turi patikrinti Actions prieinamumą ir nemokamą kvotą prieš PR;
nemokamai kvotai pasibaigus mokamų vykdymų nejungti. Dviejų tikrų vartotojų RLS testai, Gemini klaidos ir
galutinis 100 bandymų vertinimas neatlikti ir nepriklauso 1 etapui.
