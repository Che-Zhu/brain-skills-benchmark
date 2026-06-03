export async function run(ctx) {
  ctx.current = ctx.queue.shift();
  ctx.startedAt = Date.now();
  ctx.finishedAt = null;
  ctx.status = null;
  ctx.devboxId = null;
}
