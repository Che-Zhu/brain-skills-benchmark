export async function run(ctx) {
  if (ctx.status == null) {
    ctx.status = "success";
  }
  ctx.finishedAt = Date.now();
}
