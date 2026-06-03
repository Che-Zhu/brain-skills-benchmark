import { deleteDevbox } from "../../lib/devbox/client.mjs";

export async function run(ctx) {
  const name = ctx.runtimeName;
  if (!name) {
    return;
  }

  try {
    console.info(`[devbox] delete ${name}`);
    await deleteDevbox(name);
  } catch (error) {
    ctx.cleanupError =
      error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    ctx.runtimeName = null;
    ctx.gatewayUrl = null;
    ctx.workspaceReady = false;
  }
}
