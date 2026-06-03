import { DevboxApiError, execDevbox, getDevbox } from "./client.mjs";
import { getBrainSandboxSkillsGit } from "./config.mjs";

const DEFAULT_BOOTSTRAP_READY_TIMEOUT_MS = 120_000;
const BOOTSTRAP_READY_POLL_MS = 2_000;
const EXEC_PROBE_TIMEOUT_SECONDS = 15;
const BOOTSTRAP_EXEC_TIMEOUT_SECONDS = 300;
const BOOTSTRAP_OK_MARKER = "__BENCHMARK_BOOTSTRAP_OK__";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shellEscape(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Shell lines that set workspace_dir (same logic as ShipRepo bootstrap). */
export function workspaceDirScriptLines() {
  return [
    'home_dir="${HOME:-/root}"',
    'workspace_dir=""',
    'if [ -d "$home_dir/workspace" ]; then',
    '  workspace_dir="$home_dir/workspace"',
    'elif [ -d /workspace ]; then',
    '  workspace_dir="/workspace"',
    'elif [ -d /app ] && [ -f /app/package.json ]; then',
    '  workspace_dir="/app"',
    'elif [ -d "$home_dir/.git" ] || [ -f "$home_dir/package.json" ] || [ -d "$home_dir/src" ]; then',
    '  workspace_dir="$home_dir"',
    "else",
    '  workspace_dir="$PWD"',
    "fi",
  ];
}

export function buildBootstrapScript(repoUrl, skillsGit) {
  const escapedRepo = shellEscape(repoUrl);
  const skillsCommand = `npx --yes skills add ${shellEscape(skillsGit)} -y`;

  return [
    "set -e",
    ...workspaceDirScriptLines(),
    'mkdir -p "$workspace_dir"',
    'cd "$workspace_dir"',
    'if [ ! -d .git ]; then',
    '  tmpdir="$(mktemp -d)"',
    '  cleanup() { rm -rf "$tmpdir"; }',
    '  trap cleanup EXIT',
    `  git clone --depth 1 ${escapedRepo} "$tmpdir/repo"`,
    '  cp -a "$tmpdir/repo"/. .',
    "fi",
    skillsCommand,
    'skill_file="$(find .codex/skills .agents/skills -name SKILL.md 2>/dev/null | head -n 1 || true)"',
    'if [ -z "$skill_file" ]; then',
    '  printf "ERROR: no SKILL.md under .codex/skills or .agents/skills after skills add\\n" >&2',
    "  exit 1",
    "fi",
    `printf '%s\\n' "${BOOTSTRAP_OK_MARKER}"`,
  ].join("\n");
}

function summarizeExecOutput(stdout, stderr) {
  const text = `${stdout}\n${stderr}`.trim();
  if (!text) {
    return "[empty stdout/stderr from Devbox exec API]";
  }
  return text.length > 2000 ? text.slice(-2000) : text;
}

/** Devbox phase Running precedes in-pod SDK (e.g. :9757); exec may fail until it listens. */
export function isRetryableExecError(error) {
  if (!(error instanceof DevboxApiError)) {
    return false;
  }

  const message = error.message.toLowerCase();

  if (error.status === 409 && message.includes("devbox pod is not running")) {
    return true;
  }

  return (
    message.includes("sdk server") ||
    message.includes("not reachable yet") ||
    message.includes("connection refused") ||
    message.includes("connection reset")
  );
}

async function waitForDevboxExecReady(runtimeName, deadlineMs) {
  const probeScript = 'printf "%s\\n" __BENCHMARK_EXEC_OK__';

  while (Date.now() < deadlineMs) {
    try {
      const response = await execDevbox(runtimeName, {
        command: ["sh", "-lc", probeScript],
        timeoutSeconds: EXEC_PROBE_TIMEOUT_SECONDS,
      });
      if (
        response.data.exitCode === 0 &&
        response.data.stdout.includes("__BENCHMARK_EXEC_OK__")
      ) {
        return;
      }
    } catch (error) {
      if (!isRetryableExecError(error)) {
        throw error;
      }
    }

    await sleep(BOOTSTRAP_READY_POLL_MS);
  }

  throw new Error(
    `Timed out waiting for Devbox exec SDK on ${runtimeName} (in-pod server not reachable)`,
  );
}

export async function runWorkspaceBootstrap(runtimeName, repoUrl, options = {}) {
  const skillsGit = options.skillsGit ?? getBrainSandboxSkillsGit();
  const script = buildBootstrapScript(repoUrl, skillsGit);
  const timeoutMs =
    options.bootstrapTimeoutMs ??
    Number.parseInt(
      process.env.BENCHMARK_DEVBOX_BOOTSTRAP_TIMEOUT_MS ||
        String(DEFAULT_BOOTSTRAP_READY_TIMEOUT_MS),
      10,
    );
  const startedAt = Date.now();

  while (true) {
    const runtime = await getDevbox(runtimeName);
    const phase = runtime.data?.state?.phase;

    if (phase !== "Running") {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(
          `Timed out waiting for Devbox ${runtimeName} to be Running before bootstrap (last phase: ${phase ?? "unknown"})`,
        );
      }
      await sleep(BOOTSTRAP_READY_POLL_MS);
      continue;
    }

    const deadlineMs = startedAt + timeoutMs;
    if (Date.now() >= deadlineMs) {
      throw new Error(
        `Timed out waiting for Devbox ${runtimeName} before bootstrap`,
      );
    }

    try {
      await waitForDevboxExecReady(runtimeName, deadlineMs);

      const execResponse = await execDevbox(runtimeName, {
        command: ["sh", "-lc", script],
        timeoutSeconds: BOOTSTRAP_EXEC_TIMEOUT_SECONDS,
      });

      const { exitCode, stdout, stderr } = execResponse.data;
      if (exitCode !== 0 || !stdout.includes(BOOTSTRAP_OK_MARKER)) {
        throw new Error(
          `Devbox workspace bootstrap failed (exit ${exitCode}): ${summarizeExecOutput(stdout, stderr)}`,
        );
      }

      return { stdout, stderr, skillsGit };
    } catch (error) {
      if (isRetryableExecError(error)) {
        if (Date.now() >= deadlineMs) {
          throw new Error(
            `Timed out waiting for Devbox ${runtimeName} exec during bootstrap: ${error.message}`,
          );
        }
        await sleep(BOOTSTRAP_READY_POLL_MS);
        continue;
      }
      throw error;
    }
  }
}

export function buildVerifyWorkspaceScript() {
  return [
    "set -e",
    ...workspaceDirScriptLines(),
    'cd "$workspace_dir"',
    'skill_file="$(find .codex/skills .agents/skills -name SKILL.md 2>/dev/null | head -n 1 || true)"',
    'if [ -z "$skill_file" ]; then',
    '  printf "ERROR: no SKILL.md in %s\\n" "$(pwd)" >&2',
    "  ls -la .codex/skills .agents/skills 2>&1 || true",
    "  exit 1",
    "fi",
    'if [ ! -d .git ]; then',
    '  printf "WARN: no .git in %s (clone may be incomplete)\\n" "$(pwd)" >&2',
    "fi",
    'printf "OK verify workspace: %s\\n" "$skill_file"',
  ].join("\n");
}

export async function verifyWorkspace(runtimeName, options = {}) {
  const timeoutMs =
    options.timeoutMs ??
    Number.parseInt(
      process.env.BENCHMARK_DEVBOX_BOOTSTRAP_TIMEOUT_MS ||
        String(DEFAULT_BOOTSTRAP_READY_TIMEOUT_MS),
      10,
    );
  const startedAt = Date.now();
  const script = buildVerifyWorkspaceScript();

  while (true) {
    const deadlineMs = startedAt + timeoutMs;
    if (Date.now() >= deadlineMs) {
      throw new Error(
        `Timed out verifying workspace on Devbox ${runtimeName}`,
      );
    }

    try {
      await waitForDevboxExecReady(runtimeName, deadlineMs);
      const execResponse = await execDevbox(runtimeName, {
        command: ["sh", "-lc", script],
        timeoutSeconds: 120,
      });

      if (execResponse.data.exitCode !== 0) {
        throw new Error(
          `Workspace verification failed: ${summarizeExecOutput(
            execResponse.data.stdout,
            execResponse.data.stderr,
          )}`,
        );
      }
      return;
    } catch (error) {
      if (isRetryableExecError(error)) {
        await sleep(BOOTSTRAP_READY_POLL_MS);
        continue;
      }
      throw error;
    }
  }
}
