import { createContext } from "./context.mjs";
import { loadEnvFile } from "./lib/load-env.mjs";
import { run as loadQueue } from "./steps/step-1-load-queue/load-queue.mjs";
import { run as markStarted } from "./steps/step-2-1-mark-started/mark-started.mjs";
import { run as createDevbox } from "./steps/step-2-2-create-devbox/create-devbox.mjs";
import { run as runSkill } from "./steps/step-2-3-run-skill/run-skill.mjs";
import { run as finalizeOutcome } from "./steps/step-2-4-finalize-outcome/finalize-outcome.mjs";
import { run as appendCsvRow } from "./steps/step-2-5-append-csv-row/append-csv-row.mjs";
import { run as deleteDevbox } from "./steps/step-2-6-delete-devbox/delete-devbox.mjs";

const REPO_BODY_STEPS = [
  createDevbox,
  runSkill,
  finalizeOutcome,
  appendCsvRow,
];

export async function main() {
  loadEnvFile();
  const ctx = createContext();
  await loadQueue(ctx);

  while (ctx.queue.length > 0) {
    await markStarted(ctx);
    try {
      for (const step of REPO_BODY_STEPS) {
        await step(ctx);
      }
      console.log(`[${ctx.status}] ${ctx.current.full_name}`);
    } finally {
      try {
        await deleteDevbox(ctx);
      } catch (error) {
        console.error(
          `[cleanup] failed to delete devbox: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  console.log(`Wrote results to ${ctx.csvPath}`);
}
