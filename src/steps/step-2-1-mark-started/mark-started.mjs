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
}
