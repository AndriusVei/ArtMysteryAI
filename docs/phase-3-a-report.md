# Kūrėjas A: 3 etapo vietinė dalis

Atnaujinimas po naudotojo prisijungimo per terminalą (2026-11-16): Supabase CLI
prieiga patvirtinta, projektas „ArtMysteryAI“ rastas ir susietas su šiuo katalogu.
Vieša konfigūracija įrašyta į ignoruojamą `.env.local`; Auth nustatymų HTTP 200
patikra praėjo. Public schema pagal tik skaitymo SQL tuščia. Migracija vis dar
nevykdyta, tikri auth/CRUD/RLS priėmimo scenarijai neatlikti. Toliau esanti
vietinės dalies ataskaita aprašo pradinę būseną prieš šį prijungimą.

Data: 2026-11-16. Patvirtinimas: „PATVIRTINU 3 ETAPĄ“.
Pradinis commit: `75f5ef87eb4c648e8a49ebb5979f53d5d86222fa`.
Vietinė šaka: `feature/a-auth-collection`.
Aplinka: Windows, PowerShell, Node.js 26.13.0, npm 12.2.2, Next.js 16.4.6, Edge.

**3 etapo priėmimas dar neužbaigtas.** Naudotojas patvirtino, kad Supabase
projekto dar nėra. Lokalus kodas, testai ir migracija paruošti; tikros
registracijos, el. pašto, sesijų, bazės saugojimo ir dviejų naudotojų RLS
patikros neatliktos. 4 etapas nepradedamas.

## Kas padaryta

- Įdiegti tiksliai užfiksuoti oficialūs `@supabase/ssr` 0.12.7 ir
  `@supabase/supabase-js` 2.119.0. Versijos bei suderinamumas tikrinti npm registre.
- `/register`, `/login`, `/profile`, registracija, prisijungimas, vietinis
  atsijungimas ir el. pašto patvirtinimo endpointas įgyvendinti vietiniame kode.
- Registracijos nukreipimas imamas tik iš patikrinto `SITE_URL`; grįžimas po
  prisijungimo ribojamas vidinių adresų sąrašu. Tiekėjo klaidos ir tokenai nerodomi.
- Supabase klientas kuriamas serveryje kiekvienai užklausai su `getAll/setAll`
  slapukais. Sesijos laikomos HttpOnly, SameSite=Lax slapukuose; HTTPS atveju
  taikomas Secure. Naršyklėje Supabase auth klientas ir jo localStorage nenaudojami.
- Next.js `src/proxy.ts` atnaujina slapukus per `getClaims`; tikroji prieiga
  papildomai tikrinama serverio `getUser`, niekada ne kliento `user_id` ar getSession.
- Privataus kolekcijos API atsakymai ir sukonfigūruotų puslapių proxy turi
  `private, no-store`. SDK tinklo užklausoms taikoma 10 s riba ir no-store.
- Paskyros kolekcijos adapteris įgyvendina esamą B `CollectionRepository`.
  B sąsaja, fokusas ir formos išlaikytos; pakeisti duomenų hook ir režimo tekstai.
- Save siunčia tik `artworkId`; serveris iš naujo gauna muziejaus metaduomenis.
  Dublikatas grąžina esamą įrašą, neperrašo kategorijos ar pastabos.
- PATCH/DELETE tikrina `updated_at` versiją SQL užklausoje. Svetimas, pašalintas
  ar pasenęs įrašas nesukelia sėkmės; grąžinamas 409. Nuosavybė tikrinama ir API,
  ir paruoštose RLS politikose. Mutacijos reikalauja tos pačios kilmės Origin.
- Duomenų formatas ir JSON įvesties dydis tikrinami vykdymo metu.
  Vienoje paskyros peržiūroje palaikoma iki 1000 įrašų; viršijimas aiškiai atmetamas,
  duomenys netrinami ir tyliai nenukerpami.
- Demo įrašai automatiškai neimportuojami. Prisijungus pasikeičia provider ir jo
  raktas, todėl vienos paskyros būsena nepernaudojama kitai. Sesijos sutrikimo
  atveju paskyros rodinys nerodo demo kaip paskyros duomenų.
- Sukurta pradinė SQL migracija trims lentelėms su apribojimais, indeksais,
  12 nuosavybės politikų ir anoniminės prieigos atšaukimu.
- Paskyros AI rezultatų saugojimas dar nejungiamas: B AI pavyzdžiai lieka demo.

## Faktiškai įvykdytos patikros

| Patikra | Rezultatas | Ribos |
| --- | --- | --- |
| `npm install` su tiksliais Supabase SDK | PASS | Jokio cloud projekto nekūrė |
| Švarus `npm ci` su dabartiniais manifestais atskirame OS temp kataloge | PASS | Projekto node_modules nedubliavo ir netrynė |
| `npm.cmd run lint` | PASS | Po nepanaudotų parametrų pašalinimo |
| `npm.cmd run typecheck` | PASS | Next maršrutų tipai ir tsc |
| `npm.cmd test` | **94 PASS, 0 FAIL** | 81 ankstesnis ir 13 naujų; išorinių paslaugų nėra |
| `npm.cmd run build` | PASS | Be Supabase konfigūracijos |
| Nesukonfigūruotos autentifikacijos HTTP patikra | **9 PASS, 0 FAIL** | Žemiau aprašytas vietinis scenarijus |
| Pagrindo HTTP ir Edge regresija | **20 PASS, 0 FAIL** | 375/1440 px, navigacija ir klaviatūra |
| Esamas B prieinamumo/demo scenarijus | **30 PASS, 0 FAIL** | Tikras muziejaus vaizdas, demo redagavimas, fokusas ir tyrimai |
| `npm audit --omit=dev` | 0 žinomų spragų | Nėra viso saugumo garantija |
| Visas npm audit | 7 moderate, 0 high, 0 critical | minimatch ir ESLint/TypeScript kūrimo įrankių grandinė |
| Supabase migracija ir reali SQL vykdymo patikra | **NOT TESTED** | Nėra projekto ar vietinio PostgreSQL; SQL nevykdytas |
| Tikra registracija, laiškas, login/logout, sesija po refresh | **NOT TESTED** | Reikia prijungto Supabase |
| Dviejų tikrų naudotojų RLS ir CRUD | **NOT TESTED** | Paruoštas scenarijus; nepaleistas |

HTTP scenarijus patikrino: login/register formos rodomos aiškiai išjungtos be
konfigūracijos; `/profile` nukreipia į login; netinkamas patvirtinimas nukreipia
tik į vidinį klaidos puslapį; kolekcijos API grąžina kontroliuojamą 503 be
fiktyvios tapatybės; svetimos kilmės POST/PATCH/DELETE gauna 403; demo veikia.
Tai neįrodo veikiančio prisijungimo ar 401 elgesio su tikru Supabase.

Vienetinių testų pirmas paleidimas nepavyko dėl mano naujoje klasėje panaudotos
Node strip-only režimui netinkamos TS parametrų savybių sintaksės. Pakeista į
įprastas savybes ir priskyrimus konstruktoriuje; visas rinkinys po pataisos praėjo.
Ankstesnis `MODULE_TYPELESS_PACKAGE_JSON` perspėjimas lieka.

## Failai

- `src/lib/supabase/config.ts`, `server.ts`, `src/proxy.ts`: viešos konfigūracijos
  tikrinimas, serverio klientas, tapatybė ir slapukų atnaujinimas.
- `src/lib/auth-validation.ts`, `src/app/auth/actions.ts`,
  `src/components/auth/auth-form.tsx`: formų validavimas ir serverio veiksmai.
- `src/app/login`, `register`, `profile`, `auth/confirm`, `auth/error`: paskyrų kelias.
- `src/app/api/collection/route.ts`, `src/lib/account-collection.ts`,
  `account-collection-repository.ts`: paskyros kolekcijos API ir adapteris.
- `src/components/collection/collection-provider.tsx`: aiškus demo ir paskyros
  saugyklų parinkimas. Atitinkamai pakeisti B collection view/card/save/notice,
  `src/lib/demo-collection.ts` papildytas paskyros klaidų atpažinimu.
- `src/app/layout.tsx`, `src/components/site-header.tsx`: provider ir paskyros nuoroda.
- `src/types/database.ts`: naudojamos kolekcijos lentelės tipai; vėliau suderinti
  su iš tikros DB generuotais tipais. Tai dar ne visų būsimos AI sistemos lentelių SDK tipai.
- `supabase/migrations/202611160001_private_collections.sql`: peržiūrima migracija.
- `.env.example`, `package.json`, `package-lock.json`, `tsconfig.json`: vieši
  vietaženkliai, SDK ir `.ts` importų leidimas Node testams be naujo transpiliatoriaus.
- `tests/auth-and-account.test.mjs`, `scripts/check-auth-unconfigured.mjs`,
  `scripts/check-supabase-rls.mjs`: vietinės ir būsimos realios RLS patikros.
- README, integracijos susitarimas, ši ataskaita ir `docs/supabase-setup.md`:
  faktinė būklė ir prijungimo instrukcija.

## Kaip patikrinti dabar

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Tada atskirame terminale:

```powershell
node --use-system-ca node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3189
```

Kitame terminale (kol Supabase dar neprijungtas):

```powershell
node scripts/check-auth-unconfigured.mjs http://127.0.0.1:3189
node scripts/check-foundation-browser.mjs http://127.0.0.1:3189
node scripts/check-b-accessibility-browser.mjs http://127.0.0.1:3189
```

Realus RLS scenarijus į šias komandas neįtrauktas. Jis rašys ir šalins tik savo
testinius įrašus; jam reikia atskiro leidimo, dviejų izoliuotų paskyrų ir aiškaus
`ARTMYSTERY_ALLOW_REMOTE_TESTS=YES`. Žr. `docs/supabase-setup.md`.

## Git, partneris ir likęs priėmimas

Naujo commit, push, merge, deploy, cloud projekto ar tikros DB pakeitimo nėra.
Pakeitimai vietiniai ir neįtraukti į staging. Siūloma commit žinutė tik po
atskiro patvirtinimo: `feat: paruošti Supabase autentifikaciją ir paskyros kolekciją`.
Prieš commit: `git status`, konkrečių failų diff ir paslapčių patikra; po
pasirinktų failų staging – `git diff --cached --check` ir `git diff --cached`.
Partneris šių pakeitimų dar nemato; paskelbus patvirtintą šaką jis turi pakartoti
patikras ir abiejų naudotojų izoliaciją. B demo komponentų iš naujo nekurti.

Visi 3 etapo kriterijai priimami tik sukūrus/prijungus Supabase, atskirai
patvirtinus migraciją ir tikrus testinius įrašus bei įvykdžius setup dokumento
funkcinį ir dviejų naudotojų scenarijų. Iki tol 4 etapo patvirtinimo neprašoma.
Prieš publikavimą lieka realūs saugumo bandymai, auth/collection užklausų
piktnaudžiavimo ribojimas, CAPTCHA poreikio įvertinimas ir žinomos kūrimo
įrankių audito grandinės atnaujinimas. Slaptažodžio atkūrimas šiame MVP etape
neįgyvendintas. 99 % priėmimo tikslas ir produkcija nepatikrinti.
