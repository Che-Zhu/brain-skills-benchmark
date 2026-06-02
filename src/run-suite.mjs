import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./lib/skill-path.mjs";
import { validateWorkspace } from "./validate-workspace.mjs";

export async function runFixtureSuite(options = {}) {
  const fixturesRoot = path.join(REPO_ROOT, "fixtures");
  const profile = options.profile ?? "contract";
  const names = fs
    .readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const cases = [];
  for (const name of names) {
    const workspace = path.join(fixturesRoot, name);
    const report = await validateWorkspace(workspace, { profile });
    cases.push({ name, ...report });
  }

  const valid = cases.every((entry) => entry.valid);
  return { profile, valid, cases };
}
