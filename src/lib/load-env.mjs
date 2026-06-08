import { readFileSync, existsSync } from "node:fs";

const ENV_FILE = new URL("../../.env", import.meta.url);

export function requireEnv(name, env = process.env) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Fail fast before benchmark steps when required configuration is missing. */
export function validateBenchmarkEnv(env = process.env) {
  requireEnv("SEALOS_TEMPLATE_API_URL", env);
  requireEnv("GITHUB_TOKEN", env);
  requireEnv("CODEX_GATEWAY_OPENAI_API_KEY", env);
  requireEnv("BRAIN_SANDBOX_SKILLS_GIT", env);

  if (!env.DEVBOX_BASE_URL?.trim() && !env.SEALOS_HOST?.trim()) {
    throw new Error(
      "Missing required environment variable: SEALOS_HOST (or set DEVBOX_BASE_URL)",
    );
  }

  if (!env.DEVBOX_TOKEN?.trim() && !env.DEVBOX_JWT_SIGNING_KEY?.trim()) {
    throw new Error(
      "Missing DEVBOX_TOKEN or DEVBOX_JWT_SIGNING_KEY (one is required)",
    );
  }
}

export function loadEnvFile(path = ENV_FILE) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
