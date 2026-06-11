#!/usr/bin/env node
/**
 * Dry-run a saved template YAML against SEALOS_TEMPLATE_API_URL_DEPLOY.
 *
 * Usage:
 *   node scripts/template-dryrun-from-file.mjs .report/templates/.../index.yaml
 */

import { readFileSync } from "node:fs";
import { loadEnvFile } from "../src/lib/load-env.mjs";
import { dryRunTemplateYaml } from "../src/lib/sealos/template-dryrun.mjs";

loadEnvFile();

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/template-dryrun-from-file.mjs <path-to-index.yaml>");
  process.exit(1);
}

const yaml = readFileSync(filePath, "utf8");
console.log(`Dry-running ${filePath} (${yaml.length} chars)`);

const result = await dryRunTemplateYaml(yaml);
if (result.ok) {
  console.log(`OK  HTTP ${result.status}`);
  console.log(JSON.stringify(result.data, null, 2));
  process.exit(0);
}

console.error(`FAIL HTTP ${result.status}: ${result.error}`);
if (result.data) {
  console.error(JSON.stringify(result.data, null, 2));
}
process.exit(1);
