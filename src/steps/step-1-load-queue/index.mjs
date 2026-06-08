import { loadTemplatesFromSealos } from "./load-templates-from-sealos.mjs";

export async function run(ctx) {
  ctx.queue = await loadTemplatesFromSealos();
}
