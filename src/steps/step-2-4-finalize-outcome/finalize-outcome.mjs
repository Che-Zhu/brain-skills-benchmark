export async function run(ctx) {
  if (ctx.status == null) {
    ctx.status = "failed";
    ctx.error = ctx.error ?? "No status set after run-skill";
  }
  ctx.finishedAt = Date.now();
}
