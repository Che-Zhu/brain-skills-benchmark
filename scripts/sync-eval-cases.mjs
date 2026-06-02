#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSealosDeployDir } from "../src/lib/skill-path.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const evalsPath = path.join(resolveSealosDeployDir(), "evals", "evals.json");
const evals = JSON.parse(fs.readFileSync(evalsPath, "utf8"));

const cases = evals.evals.map((entry) => {
  const repoMatch = entry.prompt.match(/\/sealos-deploy\s+(\S+)\s+(\S+)/);
  const expectation =
    entry.assertions?.some((assertion) => assertion.name.includes("stop")) ||
    entry.expected_output?.includes("failed")
      ? "should-fail"
      : "should-succeed";

  return {
    id: entry.id,
    name: repoMatch ? `${repoMatch[1]}@${repoMatch[2]}` : `eval-${entry.id}`,
    prompt: entry.prompt,
    expectation,
    assertionNames: (entry.assertions ?? []).map((assertion) => assertion.name),
    notes: entry.expected_output,
  };
});

const manifest = {
  skill_name: evals.skill_name,
  source: path.relative(REPO_ROOT, evalsPath),
  synced_at: new Date().toISOString(),
  cases,
};

const outPath = path.join(REPO_ROOT, "cases", "manifest.json");
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`synced ${cases.length} cases to cases/manifest.json`);
