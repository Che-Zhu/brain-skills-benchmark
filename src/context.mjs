import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function resolveDataDir() {
  const fromEnv = process.env.BENCHMARK_DATA_DIR;
  if (fromEnv) return resolve(fromEnv);
  return join(REPO_ROOT, ".data");
}

/**
 * Shared state for a benchmark batch run.
 * Steps read/write fields on ctx only; orchestration stays in src/run.mjs.
 */
export function createContext() {
  const dataDir = resolveDataDir();
  mkdirSync(dataDir, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = join(dataDir, `benchmark-${runId}.csv`);

  return {
    queue: [],
    current: null,
    devboxId: null,
    startedAt: null,
    finishedAt: null,
    status: null,
    csvPath,
  };
}
