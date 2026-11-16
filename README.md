# ArtMystery AI

## Dabartinė būsena

1 etapas: vietinis Next.js App Router, TypeScript ir Tailwind pagrindas.
Pradinis puslapis ir navigacija veikia; kiti skyriai paaiškina, kad funkcijos dar kuriamos.
Muziejaus API, kolekcijos saugojimas, autentifikacija ir DI šiame etape neprijungti.
Nėra mokamų užklausų, raktų ar automatinių publikavimo veiksmų.

Faktiškai atliktos patikros ir apribojimai: [1 etapo ataskaita](docs/phase-1-report.md).

## Paleidimas Windows aplinkoje

Reikalinga Node.js 26 LTS (26.13.0 arba naujesnė 26.x versija) ir npm 11.
Kitose sistemose vietoje `npm.cmd` naudokite `npm`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Atverkite http://localhost:3000. Aplinkos kintamųjų 1 etapui nereikia.
Jeigu npm praneša `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, šiame kompiuteryje padėjo
`$env:NODE_OPTIONS = '--use-system-ca'` (tik dabartinei terminalo sesijai).
Neišjunkite TLS sertifikatų tikrinimo.

## Patikros

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

Patikrinkite pradinį puslapį, visas keturias navigacijos nuorodas ir
`/neegzistuojantis-puslapis` (lietuviškas 404). Naršyklėje patikrinkite 375 px ir
1440 px pločius, Tab navigaciją bei nuorodą „Pereiti prie turinio“.
Automatinių funkcinių testų šiame etape nėra; šios komandos jų neatstoja.

## Darbas su kolega A

Žr. [integracijos susitarimą](docs/integration-contract.md). Pagrindą sukūrė B,
nes A šiuo metu negali inicializuoti projekto. Tai bendras pagrindas, ne antra programa.
Paketų versijos tikslios; `package-lock.json` turi keliauti kartu su `package.json`.
Kolega turi naudoti `npm ci`, o ne iš naujo generuoti projektą su `create-next-app`.

Kai bus atskirai patvirtintas pirmas commit ir push, kolega galės pradėti taip:

```powershell
git clone https://github.com/mudramas1/mano-saugykla1.git
cd mano-saugykla1
npm.cmd ci
git switch -c feature/a-search
```

Šios instrukcijos nėra patvirtinimas vykdyti commit ar push.
Prieš siūlomą commit: `git status`, tik konkrečių failų `git add`, tada
`git diff --cached --check` ir `git diff --cached`. Patikrinti, kad nėra paslapčių.
Siūloma pirmo commit žinutė: `chore: paruošti ArtMystery AI pagrindą`.

Kai bendra pagrindinė šaka jau egzistuos, prieš naują darbą naudokite
`git switch main`, `git pull --ff-only`, tuomet kurkite atskirą funkcijos šaką.
Pakeitimus jungti per Pull Request po peržiūros ir patikrų. Jei kolega turi
nepaskelbtą vietinį projektą, pirmiausia palyginti failus ir priklausomybes;
nenaudoti priverstinio push ar automatinio nesusijusių istorijų sujungimo.

Tikri raktai laikomi tik ignoruojamame `.env.local`; Git saugomas tik `.env.example`.
Supabase ir Gemini integracija bei debesijos pakeitimai atliekami vėlesniuose etapuose.
