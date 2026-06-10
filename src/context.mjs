import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBenchmarkRunId } from "./lib/local-time.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Shared state for a benchmark batch run.
 * Steps read/write fields on ctx only; orchestration stays in src/run.mjs.
 */
export function createContext() {
  const reportDir = join(REPO_ROOT, ".report");
  mkdirSync(reportDir, { recursive: true });
  const runId = createBenchmarkRunId();
  const csvPath = join(reportDir, `benchmark-${runId}.csv`);

  return {
    runId,
    queue: [],
    current: null,
    repoUrl: null,
    runtimeName: null,
    runtimeNamespace: null,
    gatewayUrl: null,
    gatewayAuthToken: null,
    gatewaySessionId: null,
    gatewayLastTurnStatus: null,
    gatewayThreadId: null,
    gatewaySelectedModel: null,
    workspaceReady: false,
    startedAt: null,
    finishedAt: null,
    status: null,
    error: null,
    cleanupError: null,
    templateYamlPath: null,
    templateYamlLocalPath: null,
    templateYamlContent: null,
    templateYaml: null,
    templateYamlError: null,
    templateDryRun: null,
    templateDryRunStatus: null,
    templateDryRunError: null,
    csvPath,
  };
}
