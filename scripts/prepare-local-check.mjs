import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { resolve, join } from "node:path";

export function prepareLocalCheck(name = "phase5-workspace") {
  assert.ok(["phase4-workspace", "phase5-workspace", "phase5-build"].includes(name));
  const workspace = resolve(".next", name);
  mkdirSync(workspace, { recursive: true });
  for (const path of ["src", "public", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"])
    if (existsSync(path)) cpSync(path, join(workspace, path), { recursive: true });
  if (!existsSync(join(workspace, "node_modules"))) symlinkSync(resolve("node_modules"), join(workspace, "node_modules"), "junction");
  return workspace;
}
