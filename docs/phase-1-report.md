# 1 etapo ataskaita

Data: 2026-11-16. Aplinka: Windows, PowerShell, Node.js 26.13.0, npm 11.20.0,
Git 2.56.0. Vietinis aplankas `projektas4`, šaka `main`, commit dar nėra.

## Kas atlikta

Next.js App Router, griežtas TypeScript, Tailwind, lietuviškas pradinis puslapis,
prisitaikanti navigacija, informaciniai būsimų skyrių puslapiai, lietuviškas 404.
Nėra paieškos, autentifikacijos, kolekcijos saugojimo ar DI integracijos.
Puslapiuose aiškiai nurodyta, kad funkcijos kuriamos ir duomenys nesaugomi.

## Nauji failai

- `package.json`, `package-lock.json`: tiksliai fiksuotos priklausomybės ir komandos.
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`: konfigūracijos.
- `.gitignore`, `.env.example`: generuojamų failų ir aplinkos paslapčių atskyrimas.
- `.github/workflows/checks.yml`: būsimos PR patikros (nuotoliniu būdu nevykdytos).
- `src/app/layout.tsx`, `src/app/globals.css`: bendras išdėstymas, tema, prieinamumo pagrindas.
- `src/app/page.tsx`, `src/app/not-found.tsx`: pradinis ir 404 puslapiai.
- `src/app/explore/page.tsx`, `src/app/login/page.tsx`: aiškūs informaciniai A skyrių puslapiai.
- `src/app/collection/page.tsx`, `src/app/investigations/page.tsx`: B skyrių navigacijos pradžia.
- `src/components/site-header.tsx`, `src/components/feature-introduction.tsx`: bendri komponentai.
- `src/lib/navigation.ts`: bendras puslapių adresų sąrašas.
- `README.md`, `docs/integration-contract.md`, ši ataskaita: paleidimas ir perdavimas.

## Faktiškai atliktos patikros

| Patikra | Rezultatas |
| --- | --- |
| `git ls-remote --symref origin` prieš kūrimą | PASS, saugykla negrąžino šakų ar žymų |
| `npm ci --no-audit --no-fund` | PASS, atkuriamas diegimas |
| Tiesioginių versijų palyginimas su lock failu | PASS |
| `npm run lint` po pataisymo | PASS, 0 klaidų ir 0 įspėjimų |
| `npm run typecheck` | PASS |
| `npm run build` po konfigūracijos pataisymo | PASS, 0 įspėjimų; surinkimo metu pakartotinai patikrintas TypeScript |
| `npm run start -- --hostname 127.0.0.1 --port 3100` | PASS, serveris paleistas vietoje |
| `/`, `/explore`, `/collection`, `/investigations`, `/login` | PASS, 5/5 HTTP 200; `lang=lt`, pagrindinio turinio sritis ir viewport |
| `/neegzistuojantis-puslapis` | PASS, 1/1 HTTP 404 ir lietuviškas klaidos tekstas |
| Pradinio puslapio navigacija ir CSS | PASS, visos 4 nuorodos yra; CSS grąžino 200 ir turi media taisykles |
| `git diff --check` | PASS; failai dar neįtraukti į Git indeksą |
| `.env.local`, `.env.production`, `node_modules` ignoravimas | PASS; `.env.example` neignoruojamas |

HTTP puslapių scenarijų rezultatas: **6 PASS, 0 FAIL** viename vietiniame vykdyme.
Tai nėra 99 % patikimumo ar galutinės programos veikimo įrodymas.
Automatinių funkcinių testų rinkinio šiame etape nesukurta; HTTP patikra buvo
vienkartinis scenarijus, ne testavimo infrastruktūra.

## Nepatikrinta ir likę apribojimai

- Naršyklės vizualinė peržiūra, tikras 375/1440 px vaizdas ir klaviatūros naudojimas:
  NOT VERIFIED (sesijoje nėra naršyklės valdymo įrankio).
- GitHub Actions: NOT VERIFIED, niekas neišsiųsta į GitHub.
- Kolegos A nepaskelbtas kodas ir jo pritarimas sutarčiai: NOT VERIFIED.
- Muziejaus integracija šiame etape nekuriama; tikrų vaizdų UI dar nėra.
- Supabase, RLS, Gemini ir Vercel: NOT VERIFIED, neprijungta.
- ESLint 9.39.5 turi npm nebepalaikomos versijos įspėjimą. Pasirinkta dėl papildinių
  suderinamumo; tai dokumentuota integracijos sutartyje. Naujesnę įrankių grupę
  reikės patikrinti kartu su A prieš galutinį vertinimą.

Pradinė npm sertifikato klaida pašalinta naudojant `NODE_OPTIONS=--use-system-ca`
tik terminalo sesijai. TLS tikrinimas neišjungtas. Pirmos lint ir surinkimo patikros
turėjo įspėjimų; po konfigūracijos pataisymo galutinės patikros jų nebeturėjo.

## Kaip patikrinti ir perduoti A

Naudoti README komandas. Naršyklėje papildomai patikrinti 375 px ir 1440 px vaizdą,
Tab navigaciją, praleidimo nuorodą ir 404. Klaidą ar horizontalų slinkimą užfiksuoti.
A turi peržiūrėti `docs/integration-contract.md`, naudoti šį pagrindą ir `npm ci`,
prieš pradėdamas paiešką bei autentifikaciją.

Git indeksas tuščias, commit, push, merge ir deploy nevykdyti. Git komandas ir
siūlomą commit žinutę pateikia README. Prieš šiuos veiksmus reikia atskiro leidimo.
Mokamų užklausų ir debesijos išteklių nebuvo. Paleistas patikrų serveris sustabdomas
baigiant darbą; naudotojas gali paleisti programą su `npm.cmd run dev`.

## Kitas etapas

Tik gavus atskirą patvirtinimą: B kūrinio detalės `/artwork/[id]`, tikra muziejaus
API informacija, IIIF vaizdai su teisių informacija, duomenų sąsajos ir klaidų būsenos.
Paieškos funkcija lieka A atsakomybė; bus suderintas ID perdavimas į detalių puslapį.
