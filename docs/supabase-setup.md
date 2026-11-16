# Supabase prijungimas – 3 etapo likusi dalis

## Patikrinta prijungimo būsena (2026-11-16)

- Naudotojas prisijungė per vietinį Supabase CLI, ne per papildinį.
- Rastas ir su šiuo katalogu susietas jo projektas „ArtMysteryAI“.
- URL ir viešas publishable raktas automatiškai įrašyti į ignoruojamą `.env.local`.
  Raktas terminalo ataskaitose nerodomas; secret/service_role nereikėjo.
- Viešas Auth nustatymų adresas grąžino HTTP 200: email registracija įjungta,
  naujų registracijų draudimas išjungtas, automatinis email patvirtinimas išjungtas
  (vartotojas turi patvirtinti laišką).
- Tik skaitymo SQL patvirtino, kad public schemoje lentelių nėra.
- CLI susiejimo metaduomenys `supabase/.temp/` papildomai ignoruojami Git.
- Migracija dar nevykdyta, paskyros ir jų duomenys nekuriami. Prieš migraciją
  reikia atskiro konkretaus leidimo pagal MASTER PROMPT 19 skyrių.

Paruoštas vietinis kodas ir prijungtas projektas. Toliau pateikta bendra instrukcija nėra
automatinis leidimas kurti debesijos išteklius ar vykdyti SQL. Prieš agentui tai
darant reikalingas atskiras aiškus patvirtinimas, kaip numato MASTER PROMPT.
Nenaudoti esamos bazės su svarbiais duomenimis šiai pradinei migracijai.

## Automatizuojamo prijungimo eiga

1. **Vietinė parengtis:** SDK, kodas ir migracija paruošti. Git ignoruojamas
   `.env.local` jau užpildytas per CLI; žr. patikrintą būseną dokumento pradžioje.
2. **Prieiga:** įdiegti Supabase papildinį ir pačiam prisijungti prie savo
   paskyros. Prisijungimo duomenų pokalbyje pateikti nereikia. Jei papildinio
   nenaudojame, projektą vartotojas sukuria Supabase valdymo skydelyje.
3. **Projektas ir konfigūracija:** patikrinti organizaciją, pasirinktą projektą,
   planą bei bazės būklę. Tada užpildyti vietinį URL, publishable raktą ir
   svetainės adresą. Vien papildinio įdiegimas projekto nesukuria.
4. **Migracija ir Auth:** pateikti konkretaus projekto bei SQL migracijos
   patvirtinimą, taikyti migraciją ir patikrinti 3 lenteles / 12 RLS politikų;
   sukonfigūruoti el. pašto patvirtinimą ir tikslų grįžimo adresą.
5. **Priėmimas:** paleisti programą, patikrinti registraciją, sesiją, kolekciją
   ir po atskiro leidimo dviem testiniams naudotojams vykdyti RLS scenarijų.

Agentas automatizuoja veiksmus tik turėdamas patvirtintą prieigą ir atitinkamą
leidimą. Kol papildinys neprijungtas, debesijos pakeitimai nelaikomi įvykdytais.
Mokamas planas, Git publikavimas ir diegimas į šį prijungimą neįtraukti.

## 1. Naujas projektas

Supabase paskyroje sukurti projektą „ArtMystery AI“, pasirenkant tuo metu
galiojantį nemokamą planą ir tinkamą regioną. Prieš sukuriant patikrinti
dashboard rodomas sąlygas ir apribojimus; mokamo plano nejungti automatiškai.
Duomenų bazės slaptažodį saugoti savo slaptažodžių tvarkyklėje. Programai jo
ir `service_role` / `sb_secret_...` raktų nereikia.

Oficialūs šaltiniai:
- https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/auth/server-side/creating-a-client

## 2. Vietinė konfigūracija

Projekto Connect arba Settings / API skiltyje rasti projekto URL ir **publishable**
raktą (`sb_publishable_...`). Šis kodas naudoja naują publishable rakto formatą,
ne seną JWT anon ir jokiu būdu ne administratoriaus raktą.

Tik savo kompiuteryje nukopijuoti `.env.example` į `.env.local` ir įrašyti:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key
SITE_URL=http://localhost:3000
```

Tai vietaženkliai. `.env.local` yra ignoruojamas Git; nekelti jo, ekrano kopijų
su slaptais raktais ar slaptažodžių į pokalbį ir saugyklą. Tikrasis `SITE_URL`
turi sutapti su naudojamu svetainės adresu (localhost ir 127.0.0.1 skiriasi).
Pakeitus aplinką perkrauti dev serverį; produkcinei vietinei patikrai iš naujo
vykdyti `npm.cmd run build` prieš `npm.cmd run start`.

## 3. Migracijos peržiūra ir atskiras patvirtinimas

Peržiūrėti `supabase/migrations/202611160001_private_collections.sql`:

- sukuriamos `profiles`, `saved_artworks` ir `ai_investigations`;
- įjungiama RLS, panaikinamos anoniminės lentelių teisės;
- kiekvienam SELECT / INSERT / UPDATE / DELETE taikomas `auth.uid()`;
- UPDATE tikrina ir seną, ir naują eilutę; negalima pakeisti savininko;
- yra unikalumas, ilgių, kategorijų, klausimų skaičiaus ir vaizdo adreso ribos;
- atnaujinimo laikas nustatomas bazėje, naudojamas konfliktams aptikti.

Pirmiausia SQL Editor tik skaitymo užklausa patikrinti:

```sql
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'saved_artworks', 'ai_investigations');
```

Naujoje bazėje turi būti 0 eilučių. Jei lentelės jau yra, sustoti ir palyginti
schemas – jų netrinti ar neperrašyti. Prieš keičiant esamą bazę reikalingas
atsarginės kopijos / eksporto ir atkūrimo planas.

Tik atskirai patvirtinus, naujos tuščios bazės SQL Editor vykdyti **visą vieną
migracijos failą**, kuris turi `begin` / `commit`. Nevartoti atsitiktinių senų
SQL fragmentų. Jei užklausa nepavyko, nelaikyti migracijos pritaikyta; surasti
priežastį ir patikrinti, ar transakcija atšaukta. Migracija nedaro DROP ar RESET.
Po sėkmės patikrinti visas 12 politikų ir 3 lentelių RLS būseną:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('profiles', 'saved_artworks', 'ai_investigations');
select relname, relrowsecurity from pg_class
where oid in ('public.profiles'::regclass, 'public.saved_artworks'::regclass,
              'public.ai_investigations'::regclass);
```

## 4. Autentifikacijos nustatymai

Authentication skiltyje įjungti email/password ir el. pašto patvirtinimą.
URL Configuration: Site URL `http://localhost:3000`; leidžiamas grįžimo adresas
`http://localhost:3000/auth/confirm`. Kitą adresą leisti tik jei jį tikrai naudoji.
Nenaudoti laisvo `*` produkciniams grįžimo adresams.

Authentication / Email Templates / Confirm signup laiško nuoroda turi naudoti
token hash ir serverio endpointą, o ne vien numatytą kliento fragmentą:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Patvirtinti el. paštą</a>
```

Patikrinti realų laiškų pristatymą ir siuntimo ribas. Šis etapas neįgyvendina
slaptažodžio atkūrimo; jo nereikia nurodyti kaip veikiančio.
Dokumentacija: https://supabase.com/docs/guides/auth/passwords .

## 5. Tikras funkcinis bandymas

Paleisti `npm.cmd run dev`, atverti `/register`, užsiregistruoti su savo
patvirtinamu el. paštu, patvirtinti laišką ir prisijungti. Patikrinti:

1. Navigacijoje atsiranda „Mano paskyra“; po puslapio atnaujinimo sesija išlieka.
2. `/artwork/16568` → „Išsaugoti į mano kolekciją“ → `/collection`.
3. Pakeisti kategoriją ir pastabą, atnaujinti puslapį; pakeitimai turi išlikti.
4. Pakartotinai išsaugoti kūrinį – nedubliuojama ir pastaba neperrašoma.
5. Dviejuose languose redaguoti tą patį įrašą: pasenęs pakeitimas gauna 409.
6. Pašalinti tik pasirinktą įrašą po patvirtinimo.
7. Atsijungti `/profile`: paskyros duomenys nerodomi, lieka aiškiai atskirta
   demo kolekcija. Vėl prisijungus paskyros įrašai nepasikeičia.

Demo kolekcija automatiškai neimportuojama. AI forma ir išsaugoti AI pavyzdžiai
šiame etape vis dar demonstraciniai; jų paskyros adapteris priklauso 4 etapui.

## 6. Dviejų tikrų naudotojų RLS testas

Tai būtinas likęs 3 etapo priėmimo kriterijus. Vienetinių testų nepakanka.
Paruošti dvi naujas patvirtintas **tik testams skirtas** paskyras be duomenų.
Neįrašyti į jas asmeninių užrašų. Skriptas tikrina visas tris lenteles tiesiogiai
su viešu raktu ir tikrais naudotojų tokenais, be `service_role`.

Po atskiro leidimo testui sukurti ignoruojamą `.env.rls-tests.local` su:

```dotenv
ARTMYSTERY_ALLOW_REMOTE_TESTS=YES
ARTMYSTERY_TEST_USER_A_EMAIL=replace_a
ARTMYSTERY_TEST_USER_A_PASSWORD=replace_a_password
ARTMYSTERY_TEST_USER_B_EMAIL=replace_b
ARTMYSTERY_TEST_USER_B_PASSWORD=replace_b_password
```

Tuomet:

```powershell
node --use-system-ca --env-file=.env.local --env-file=.env.rls-tests.local scripts/check-supabase-rls.mjs
```

Jis tikrina savo CRUD, svetimų SELECT/UPDATE/DELETE izoliaciją, svetimo savininko
INSERT, savininko pakeitimą ir anoniminius bandymus. Naudoja aiškiai pažymėtus
testinius kūrinių numerius; tai ne produkciniai paieškos rezultatai.
`finally` šalina tik jo paties sukurtus įrašus, ne paskyras ar senesnius duomenis.
Nutraukus procesą išoriškai, patikrinti tik šias testines paskyras dėl likusių
testinių eilučių. Slaptažodžiai ir tokenai rezultatų ataskaitoje nespausdinami.

Papildomai du atskiri naršyklių profiliai turi patvirtinti, kad A išsaugotas
kūrinys nematomas B paskyroje, o B pakeitimai nepaveikia A. Naudotojo ID
pakeitimas tiesioginėje `/api/collection` užklausoje negali suteikti prieigos.
Užrašyti tikslų tikėtą ir faktinį rezultatą, datą bei aplinką.
Tik po šių patikrų galima laikyti 3 etapo priėmimą užbaigtu.
