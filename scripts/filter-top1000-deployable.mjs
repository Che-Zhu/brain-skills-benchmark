#!/usr/bin/env node
/**
 * Purpose: List deployable repos from Top 1000 analysis (rank order).
 * Requires: 2000-repos/top1000-analysis-v3.json; LIMIT (below).
 * Expected: stdout JSON array, up to LIMIT deployable repo records (same fields as input).
 */

import { readFileSync } from "node:fs";

const LIMIT = 5;

const INPUT = new URL("../2000-repos/top1000-analysis-v3.json", import.meta.url);

const repos = JSON.parse(readFileSync(INPUT, "utf8"));
const deployable = repos.filter((repo) => repo.deployable === true);
const result = deployable.slice(0, LIMIT);

console.log(JSON.stringify(result, null, 2));
