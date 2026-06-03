import { readFileSync } from "node:fs";

export const DEFAULT_ANALYSIS_FILE = new URL(
  "../../2000-repos/top1000-analysis-v3.json",
  import.meta.url,
);

const DEFAULT_LIMIT = 5;

export function parseBenchmarkLimit(env = process.env) {
  const raw = env.BENCHMARK_LIMIT;
  if (raw === undefined || raw === "") return DEFAULT_LIMIT;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(
      `Invalid BENCHMARK_LIMIT "${raw}" (expected a positive integer)`,
    );
  }
  return limit;
}

export function loadDeployableRepos({ limit, inputFile = DEFAULT_ANALYSIS_FILE }) {
  const repos = JSON.parse(readFileSync(inputFile, "utf8"));
  const deployable = repos.filter((repo) => repo.deployable === true);
  return deployable.slice(0, limit);
}
