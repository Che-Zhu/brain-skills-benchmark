#!/usr/bin/env node
/**
 * Purpose: List deployable repos from Top 1000 analysis (rank order).
 * Requires: 2000-repos/top1000-representative-deployable-apps.json; optional BENCHMARK_LIMIT in .env.
 * Expected: stdout JSON array of curated repo records (truncated when LIMIT is set).
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
