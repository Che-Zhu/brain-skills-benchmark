/** Stub: replace with real Devbox creation when API code is available. */
export async function run(ctx) {
  const slug = ctx.current.full_name.replace(/\//g, "-");
  ctx.devboxId = `stub-${slug}`;
}
