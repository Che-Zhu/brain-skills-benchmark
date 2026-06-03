import {
  loadDeployableRepos,
  parseBenchmarkLimit,
} from "../../lib/deployable-queue.mjs";

export async function run(ctx) {
  const limit = parseBenchmarkLimit();
  ctx.queue = loadDeployableRepos({ limit });
}
