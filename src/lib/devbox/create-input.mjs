import {
  createBenchmarkDevboxName,
  createBenchmarkUpstreamId,
} from "./naming.mjs";
import {
  DEFAULT_CODEX_GATEWAY_CODEX_HOME,
  DEFAULT_CODEX_GATEWAY_HOST,
  DEFAULT_CODEX_GATEWAY_PORT,
  getCodexGatewayModel,
  getCodexGatewaySessionTtlMs,
  getDevboxArchiveAfterPauseTime,
  getDevboxDefaultImage,
  getDevboxPauseAt,
} from "./config.mjs";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildCreateDevboxInput(ctx) {
  const fullName = ctx.current.full_name;
  const runtimeName = createBenchmarkDevboxName(ctx.runId, fullName);
  const upstreamID = createBenchmarkUpstreamId(ctx.runId, fullName);

  const env = {
    BENCHMARK_RUN_ID: ctx.runId,
    REPO_FULL_NAME: fullName,
    CODEX_GATEWAY_HOST: DEFAULT_CODEX_GATEWAY_HOST,
    CODEX_GATEWAY_PORT: DEFAULT_CODEX_GATEWAY_PORT,
    CODEX_GATEWAY_MODEL: getCodexGatewayModel(),
    CODEX_GATEWAY_CODEX_HOME: DEFAULT_CODEX_GATEWAY_CODEX_HOME,
    CODEX_GATEWAY_SESSION_TTL_MS: getCodexGatewaySessionTtlMs(),
    CODEX_GATEWAY_OPENAI_API_KEY: requiredEnv("CODEX_GATEWAY_OPENAI_API_KEY"),
    GITHUB_TOKEN: requiredEnv("GITHUB_TOKEN"),
    REPO_URL: ctx.repoUrl,
  };

  const baseUrl = process.env.CODEX_GATEWAY_OPENAI_BASE_URL?.trim();
  if (baseUrl) {
    env.CODEX_GATEWAY_OPENAI_BASE_URL = baseUrl;
  }

  const jwtSecret = process.env.CODEX_GATEWAY_JWT_SECRET?.trim();
  if (jwtSecret) {
    env.CODEX_GATEWAY_JWT_SECRET = jwtSecret;
  }

  const image = getDevboxDefaultImage();
  const input = {
    name: runtimeName,
    upstreamID,
    kubeAccess: {
      enabled: true,
      roleTemplate: "edit",
    },
    env: {
      ...env,
      WORK_DIR: "/home/devbox/workspace",
    },
    pauseAt: getDevboxPauseAt(),
    archiveAfterPauseTime: getDevboxArchiveAfterPauseTime(),
    labels: [
      { key: "app.kubernetes.io/component", value: "runtime" },
      { key: "app.kubernetes.io/managed-by", value: "brain-skills-benchmark" },
    ],
  };

  if (image) {
    input.image = image;
  }

  return { runtimeName, upstreamID, input };
}
