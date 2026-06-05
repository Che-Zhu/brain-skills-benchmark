import { readFileSync } from "node:fs";

export const DEFAULT_QUEUE_FILE = new URL(
  "../../2000-repos/top1000-representative-deployable-apps.json",
  import.meta.url,
);

export function parseBenchmarkLimit(env = process.env) {
  const raw = env.BENCHMARK_LIMIT;
  if (raw === undefined || raw === "") return undefined;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(
      `Invalid BENCHMARK_LIMIT "${raw}" (expected a positive integer)`,
    );
  }
  return limit;
}

/** Curated deployable repos (pre-filtered). Omit `limit` to load the full file. */
export function loadDeployableRepos({ limit, inputFile = DEFAULT_QUEUE_FILE } = {}) {
  const repos = JSON.parse(readFileSync(inputFile, "utf8"));
  if (!Array.isArray(repos)) {
    throw new Error(`Expected JSON array in ${inputFile.pathname ?? inputFile}`);
  }
  return limit === undefined ? repos : repos.slice(0, limit);
}
