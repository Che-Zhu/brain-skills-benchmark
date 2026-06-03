#!/usr/bin/env node
/**
 * Purpose: List deployable repos from Top 1000 analysis (rank order).
 * Requires: 2000-repos/top1000-analysis-v3.json; BENCHMARK_LIMIT in .env (default 5).
 * Expected: stdout JSON array, up to LIMIT deployable repo records (same fields as input).
 */

import { loadEnvFile } from "../src/lib/load-env.mjs";
import {
  loadDeployableRepos,
  parseBenchmarkLimit,
} from "../src/lib/deployable-queue.mjs";

loadEnvFile();
const limit = parseBenchmarkLimit();
const result = loadDeployableRepos({ limit });

console.log(JSON.stringify(result, null, 2));
