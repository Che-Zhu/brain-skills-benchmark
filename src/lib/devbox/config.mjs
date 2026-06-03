import { SignJWT } from "jose";

const DEVBOX_API_PREFIX = "/api/v1/devbox";
const DEFAULT_DEVBOX_NAMESPACE = "ns-test";
const DEFAULT_DEVBOX_TOKEN_TTL_SECONDS = 4 * 60 * 60;
const DNS_1123_LABEL_REGEX = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

function normalizeHost(host) {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Devbox API origin.
 * Default: SEALOS_HOST=xxx → https://devbox-server.xxx (same as ShipRepo).
 * Override: DEVBOX_BASE_URL=https://your-devbox-api.example.com
 */
export function getDevboxBaseUrl() {
  const override = process.env.DEVBOX_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/, "");
  }
  const host = normalizeHost(requiredEnv("SEALOS_HOST"));
  return `https://devbox-server.${host}`;
}

/** Full URL for phase-1 healthz (no /api/v1/devbox prefix). */
export function getDevboxHealthzUrl() {
  return new URL("/healthz", `${getDevboxBaseUrl()}/`).toString();
}

export function getDevboxApiPrefix() {
  return DEVBOX_API_PREFIX;
}

export function getDevboxDefaultImage() {
  return process.env.DEVBOX_RUNTIME_IMAGE?.trim() || undefined;
}

export function getDevboxArchiveAfterPauseTime() {
  return process.env.DEVBOX_ARCHIVE_AFTER_PAUSE_TIME?.trim() || "24h";
}

export const DEFAULT_CODEX_GATEWAY_MODEL = "gpt-5.4";
export const DEFAULT_CODEX_GATEWAY_CODEX_HOME = "/codex-home";
export const DEFAULT_CODEX_GATEWAY_HOST = "0.0.0.0";
export const DEFAULT_CODEX_GATEWAY_PORT = "1317";
const DEFAULT_CODEX_GATEWAY_SESSION_TTL_MS = "14400000";

export function getCodexGatewayModel() {
  return process.env.CODEX_GATEWAY_MODEL?.trim() || DEFAULT_CODEX_GATEWAY_MODEL;
}

export function getCodexGatewaySessionTtlMs() {
  return (
    process.env.CODEX_GATEWAY_SESSION_TTL_MS?.trim() ||
    DEFAULT_CODEX_GATEWAY_SESSION_TTL_MS
  );
}

export function getBenchmarkDevboxMaxDurationMinutes() {
  const raw = process.env.BENCHMARK_DEVBOX_MAX_DURATION_MINUTES?.trim();
  if (!raw) {
    return 300;
  }
  const minutes = Number.parseInt(raw, 10);
  if (!Number.isFinite(minutes) || minutes < 1) {
    throw new Error(
      "BENCHMARK_DEVBOX_MAX_DURATION_MINUTES must be a positive integer",
    );
  }
  return minutes;
}

export function getDevboxPauseAt() {
  const minutes = getBenchmarkDevboxMaxDurationMinutes();
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function getBrainSandboxSkillsGit() {
  return requiredEnv("BRAIN_SANDBOX_SKILLS_GIT");
}

export function getDevboxNamespace() {
  const namespace =
    process.env.DEVBOX_NAMESPACE?.trim() || DEFAULT_DEVBOX_NAMESPACE;

  if (!DNS_1123_LABEL_REGEX.test(namespace)) {
    throw new Error("DEVBOX_NAMESPACE must be a valid DNS1123 label");
  }

  return namespace;
}

export async function getDevboxAuthToken() {
  const staticToken = process.env.DEVBOX_TOKEN?.trim();
  if (staticToken) {
    return staticToken;
  }

  const signingKey = requiredEnv("DEVBOX_JWT_SIGNING_KEY");
  const namespace = getDevboxNamespace();
  const ttlSeconds = Number.parseInt(
    process.env.DEVBOX_JWT_TTL_SECONDS ||
      String(DEFAULT_DEVBOX_TOKEN_TTL_SECONDS),
    10,
  );

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("DEVBOX_JWT_TTL_SECONDS must be a positive integer");
  }

  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(signingKey);

  return new SignJWT({ namespace })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secret);
}
