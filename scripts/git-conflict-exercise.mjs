// Tik atskirai patvirtintas vietinis mokomasis Git pratimas. Bendros repo .git neliečiamas.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute, join } from "node:path";

if (process.env.ARTMYSTERY_ALLOW_CONFLICT_EXERCISE !== "YES") {
  console.error("NOT RUN: reikia atskiro leidimo 4 mokomiesiems commit ir vienam merge izoliuotoje saugykloje.");
  process.exit(2);
}
const root = process.cwd(), parent = resolve(root, ".next"), target = resolve(parent, "git-conflict-exercise-20261117");
const rel = relative(parent, target);
assert.ok(rel && !rel.startsWith("..") && !isAbsolute(rel));
assert.ok(!existsSync(target), "Pratimo katalogas jau yra; jo neperrašome.");
const originalHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const originalBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
const originalStatus = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
mkdirSync(target, { recursive: true });
const hooks = join(target, "empty-hooks"); mkdirSync(hooks);
const config = ["-c", `core.hooksPath=${hooks}`, "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false",
  "-c", "user.name=ArtMystery Git Exercise", "-c", "user.email=exercise@example.invalid"];
const git = (...args) => execFileSync("git", [...config, ...args], { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
git("init", "--initial-branch=exercise-base");
writeFileSync(join(target, "lesson.txt"), "Tyrimo pagrindas: muziejaus duomenys.\n");
git("add", "lesson.txt"); git("commit", "-m", "exercise: pradinis mokomasis tekstas");
git("switch", "-c", "exercise-a");
writeFileSync(join(target, "lesson.txt"), "Tyrimo pagrindas: faktai ir saltiniai (A).\n");
git("add", "lesson.txt"); git("commit", "-m", "exercise: A pakeicia tyrimo pagrinda");
git("switch", "-c", "exercise-b", "exercise-base");
writeFileSync(join(target, "lesson.txt"), "Tyrimo pagrindas: klausimai ir hipotezes (B).\n");
git("add", "lesson.txt"); git("commit", "-m", "exercise: B pakeicia ta pacia eilute");
git("switch", "exercise-a");
const merge = spawnSync("git", [...config, "merge", "--no-ff", "--no-commit", "exercise-b"], { cwd: target, encoding: "utf8", windowsHide: true });
assert.equal(merge.status, 1, "Turi susidaryti tikras tekstinis konfliktas.");
assert.equal(git("diff", "--name-only", "--diff-filter=U"), "lesson.txt");
const conflict = readFileSync(join(target, "lesson.txt"), "utf8");
assert.ok(conflict.includes("<<<<<<<") && conflict.includes("=======") && conflict.includes(">>>>>>>"));
writeFileSync(join(parent, "git-conflict-before-resolution.txt"), conflict);
const resolution = "Tyrimo pagrindas: faktai ir saltiniai (A), klausimai ir hipotezes (B).\n";
writeFileSync(join(target, "lesson.txt"), resolution);
git("add", "lesson.txt"); git("commit", "-m", "exercise: isspresti A ir B konflikta islaikant abi idejas");
assert.equal(git("ls-files", "-u"), "");
assert.equal(git("rev-list", "--parents", "-n", "1", "HEAD").split(/\s+/).length, 3);
assert.equal(readFileSync(join(target, "lesson.txt"), "utf8"), resolution);
assert.equal(git("remote"), "");
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), originalHead);
assert.equal(execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim(), originalBranch);
assert.equal(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }), originalStatus);
const report = { result: "PASS", conflictFile: "lesson.txt", commits: 4, merges: 1, mergeCommit: git("rev-parse", "HEAD"),
  originalHead, originalBranch, originalRepositoryUnchanged: true, remoteConfigured: false };
writeFileSync(join(parent, "git-conflict-exercise-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
