#!/usr/bin/env node
/**
 * Purpose: Fetch paginated API usage overview records.
 * Requires: .env CODEX_GATEWAY_OPENAI_API_KEY; network; PAGE, PAGE_SIZE (below).
 * Expected: stdout JSON { page, pageSize, total, items[] }; errors → stderr, exit 1.
 */

import { readFileSync } from "node:fs";

const PAGE = 1;
const PAGE_SIZE = 20;

const API_URL =
  "https://sub2api-rank-uqloyzdq.usw-1.sealos.app/api/overview/records";

const ENV_FILE = new URL("../.env", import.meta.url);

function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const apiKey = loadEnvFile(ENV_FILE).CODEX_GATEWAY_OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing CODEX_GATEWAY_OPENAI_API_KEY in .env");
  process.exit(1);
}

const response = await fetch(API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey, page: PAGE, pageSize: PAGE_SIZE }),
});

const text = await response.text();
if (!response.ok) {
  console.error(`HTTP ${response.status} ${response.statusText}`);
  console.error(text);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Response is not JSON:");
  console.error(text);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
