import { createDevbox } from "./client.mjs";
import { buildCreateDevboxInput } from "./create-input.mjs";
import { runWorkspaceBootstrap } from "./bootstrap.mjs";
import { getDevboxWithSecretRetry } from "./get-devbox.mjs";
import {
  getGatewayAuthTokenFromDevboxInfo,
  resolveGatewayUrl,
} from "./gateway-url.mjs";
import { buildPublicRepoUrl } from "./repo-url.mjs";
import { waitForRunningDevbox } from "./wait-running.mjs";

export async function provisionDevboxForRepo(ctx) {
  if (!ctx.current?.full_name) {
    throw new Error("ctx.current.full_name is required to provision Devbox");
  }

  ctx.repoUrl = ctx.repoUrl ?? buildPublicRepoUrl(ctx.current.full_name);

  const { runtimeName, input } = buildCreateDevboxInput(ctx);
  console.info(`[devbox] create ${runtimeName} for ${ctx.current.full_name}`);

  const createResponse = await createDevbox(input);
  ctx.runtimeName = runtimeName;
  ctx.runtimeNamespace = createResponse.data?.namespace ?? null;

  await waitForRunningDevbox(runtimeName);
  const infoResponse = await getDevboxWithSecretRetry(runtimeName);
  const runtimeInfo = infoResponse.data;

  ctx.gatewayUrl = resolveGatewayUrl(runtimeName, ctx.gatewayUrl, runtimeInfo);
  ctx.gatewayAuthToken = getGatewayAuthTokenFromDevboxInfo(runtimeInfo);
  console.info(`[devbox] gateway ${ctx.gatewayUrl}`);

  console.info(`[devbox] bootstrap ${runtimeName}`);
  await runWorkspaceBootstrap(runtimeName, ctx.repoUrl);
  ctx.workspaceReady = true;
  console.info(`[devbox] ready ${runtimeName}`);
}
