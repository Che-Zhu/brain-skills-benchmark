#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { REPO_ROOT } from "../src/lib/skill-path.mjs";
import { runFixtureSuite } from "../src/run-suite.mjs";
import { validateWorkspace } from "../src/validate-workspace.mjs";

const [, , command, ...rest] = process.argv;

function usage() {
  console.error(`用法:
  brain-skills-benchmark validate [--profile contract|full] <workspace>
  brain-skills-benchmark suite [--profile contract|full]
  brain-skills-benchmark cases list
  brain-skills-benchmark cases sync

端到端跑测请使用: npm run deploy -- --namespace <ns> --repo <owner/repo> --project-name <name>`);
}

function parseProfile(args) {
  const profileIndex = args.indexOf("--profile");
  if (profileIndex === -1) {
    return { profile: "contract", positional: args };
  }
  const profile = args[profileIndex + 1];
  if (profile !== "contract" && profile !== "full") {
    throw new Error('--profile 必须是 "contract" 或 "full"');
  }
  const positional = args.filter(
    (_, index) => index !== profileIndex && index !== profileIndex + 1
  );
  return { profile, positional };
}

async function cmdValidate(args) {
  const { profile, positional } = parseProfile(args);
  const workspace = positional[0];
  if (!workspace) {
    usage();
    process.exit(1);
  }
  const report = await validateWorkspace(workspace, { profile });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.valid ? 0 : 1);
}

async function cmdSuite(args) {
  const { profile } = parseProfile(args);
  const report = await runFixtureSuite({ profile });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.valid ? 0 : 1);
}

function cmdCasesList() {
  const manifestPath = path.join(REPO_ROOT, "cases", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const entry of manifest.cases) {
    console.log(`${entry.id}\t${entry.name}\t${entry.expectation}`);
  }
}

async function cmdCasesSync() {
  const script = path.join(REPO_ROOT, "scripts", "sync-eval-cases.mjs");
  const child = spawn(process.execPath, [script], { stdio: "inherit" });
  await new Promise((resolve, reject) => {
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`cases sync 失败: ${code}`))
    );
  });
}

async function main() {
  if (!command) {
    usage();
    process.exit(1);
  }

  if (command === "validate") {
    await cmdValidate(rest);
    return;
  }

  if (command === "suite") {
    await cmdSuite(rest);
    return;
  }

  if (command === "cases" && rest[0] === "list") {
    cmdCasesList();
    return;
  }

  if (command === "cases" && rest[0] === "sync") {
    await cmdCasesSync();
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
