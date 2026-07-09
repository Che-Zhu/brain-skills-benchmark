import { buildPublicRepoUrl } from "../../lib/devbox/repo-url.mjs";

export async function run(ctx) {
  ctx.current = ctx.queue.shift();
  ctx.startedAt = Date.now();
  ctx.finishedAt = null;
  ctx.status = null;
  ctx.error = null;
  ctx.repoUrl = buildPublicRepoUrl(ctx.current.full_name);
  ctx.runtimeName = null;
  ctx.runtimeNamespace = null;
  ctx.gatewayUrl = null;
  ctx.gatewayAuthToken = null;
  ctx.gatewaySessionId = null;
  ctx.gatewayLastTurnStatus = null;
  ctx.gatewayThreadId = null;
  ctx.gatewaySelectedModel = null;
  ctx.workspaceReady = false;
  ctx.cleanupError = null;
  ctx.templateYamlPath = null;
  ctx.templateYamlLocalPath = null;
  ctx.templateYamlContent = null;
  ctx.templateYaml = null;
  ctx.templateYamlError = null;
  ctx.templateDryRun = null;
  ctx.templateDryRunStatus = null;
  ctx.templateDryRunError = null;
}
