#!/usr/bin/env node
/**
 * Add category + deploy_difficulty columns to an existing benchmark CSV
 * using top1000-representative-deployable-apps.json metadata.
 *
 * Usage: node scripts/enrich-benchmark-csv.mjs .report/benchmark-2026-06-05_12-02-05.csv
 */

import { readFileSync, writeFileSync } from "node:fs";
import { loadDeployableRepos } from "../src/lib/deployable-queue.mjs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/enrich-benchmark-csv.mjs <csv-path>");
  process.exit(1);
}

const metaByName = new Map(
  loadDeployableRepos({}).map((repo) => [repo.full_name, repo]),
);

function parseCsvRecords(raw) {
  const records = [];
  let fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else if (ch === "\n") {
      fields.push(current);
      records.push(fields);
      fields = [];
      current = "";
    } else if (ch === "\r") {
      // handled by following \n
    } else {
      current += ch;
    }
  }

  if (current.length > 0 || fields.length > 0) {
    fields.push(current);
    records.push(fields);
  }

  return records;
}

const raw = readFileSync(csvPath, "utf8");
const records = parseCsvRecords(raw);
if (records.length < 1) {
  throw new Error("CSV is empty");
}

const header = records[0];
const fullNameIdx = header.indexOf("full_name");
if (fullNameIdx === -1) {
  throw new Error("CSV missing full_name column");
}

const hasCategory = header.includes("category");
const hasDifficulty = header.includes("deploy_difficulty");

let newHeader;
if (hasCategory && hasDifficulty) {
  newHeader = header;
} else if (!hasCategory && !hasDifficulty) {
  newHeader = [
    ...header.slice(0, fullNameIdx + 1),
    "category",
    "deploy_difficulty",
    ...header.slice(fullNameIdx + 1),
  ];
} else {
  throw new Error("CSV partially enriched; manual fix required");
}

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const out = [newHeader.map(escapeCsv).join(",")];
for (let i = 1; i < records.length; i += 1) {
  const fields = records[i];
  const fullName = fields[fullNameIdx];
  const meta = metaByName.get(fullName);
  if (!meta) {
    throw new Error(`no queue metadata for ${fullName}`);
  }

  if (hasCategory && hasDifficulty) {
    out.push(fields.map(escapeCsv).join(","));
    continue;
  }

  const enriched = [
    ...fields.slice(0, fullNameIdx + 1),
    meta.category ?? "",
    meta.deploy_difficulty ?? "",
    ...fields.slice(fullNameIdx + 1),
  ];
  out.push(enriched.map(escapeCsv).join(","));
}

writeFileSync(csvPath, `${out.join("\n")}\n`);
console.info(`wrote ${out.length - 1} data rows to ${csvPath}`);
