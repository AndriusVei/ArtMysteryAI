# Saugus Git konflikto pratimas — 5 etapas

Paruoštas `scripts/git-conflict-exercise.mjs`. Prieš vykdymą būtinas atskiras
vartotojo leidimas: **4 mokomieji commit ir 1 merge izoliuotoje vietinėje saugykloje**.
5 etapo leidimas pats savaime šių veiksmų nepatvirtina pagal MASTER PROMPT.

Pratimo vieta: `.next/git-conflict-exercise-20261117`. Jei katalogas jau yra,
scenarijus sustoja; nieko netrina ir neperrašo. Nekeičiama bendro projekto `.git`,
HEAD, šaka, indeksas ar darbo failai. Push, tinklo ryšio ir remote nėra.
Globalūs Git nustatymai nekeičiami, commit hooks ir GPG pasirašymas pratimui
išjungiami tik vienos komandos konfigūracija. Naudojama aiški mokomoji autoriaus tapatybė.

Eiga: pradinis vienos eilutės `lesson.txt` commit → A šakos pakeitimas → B šakos
tos pačios eilutės pakeitimas → merge su tikru konfliktu → išsprendimas išsaugant
abi idėjas → merge commit. Tai imituotos A / B rolės, ne tikro B autoriaus commit.

Po patvirtinimo:

```powershell
$env:ARTMYSTERY_ALLOW_CONFLICT_EXERCISE='YES'
node scripts/git-conflict-exercise.mjs
Remove-Item Env:ARTMYSTERY_ALLOW_CONFLICT_EXERCISE
```

Įrodymai: `.next/git-conflict-before-resolution.txt` su `<<<<<<<`, `=======`,
`>>>>>>>`; galutinis `lesson.txt` su abiem idėjomis; dviejų tėvų merge commit;
tuščias `git ls-files -u`; `.next/git-conflict-exercise-report.json` su rezultatu
ir patvirtinimu, kad bendra saugykla nepakeista. Tikras įvykdymas ir commit ID
registruojami tik po sėkmingo patvirtinto vykdymo.

## Atliktas 2026-11-17

Vartotojas atskirai patvirtino pratimą. Rezultatas PASS: 4 commit, 1 merge.
Mokomasis merge commit `906f235aff1fff59cbb5069d39f02b73ddf62e09` turi du tėvus;
unmerged failų nebeliko. Bendro projekto HEAD liko `6d6851ace4148705fce888a990d9e5b255c92598`,
šaka `feature/a-diagnostics`, darbo medis per pratimą nepakeistas. Remote nėra.

Tikras prieš išsprendimą išsaugotas konfliktas:

```text
<<<<<<< HEAD
Tyrimo pagrindas: faktai ir saltiniai (A).
=======
Tyrimo pagrindas: klausimai ir hipotezes (B).
>>>>>>> exercise-b
```

Galutinis tekstas:

```text
Tyrimo pagrindas: faktai ir saltiniai (A), klausimai ir hipotezes (B).
```

Pirminiai artefaktai išliko lokaliai `.next/git-conflict-exercise-report.json`
ir `.next/git-conflict-before-resolution.txt`; jie nėra bendro Git istorijos dalis.
