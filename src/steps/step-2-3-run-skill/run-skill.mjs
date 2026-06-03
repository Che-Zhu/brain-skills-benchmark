import { runSkillTurn } from "../../lib/devbox/gateway/turn.mjs";

export async function run(ctx) {
  try {
    await runSkillTurn(ctx);
  } catch (error) {
    ctx.status = "failed";
    ctx.error = error instanceof Error ? error.message : String(error);
    console.error(`[gateway] failed ${ctx.current?.full_name}: ${ctx.error}`);
    throw error;
  }
}
