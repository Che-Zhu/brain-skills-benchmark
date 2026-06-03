#!/usr/bin/env node
/**
 * Phase 2 smoke: provision one repo (create → bootstrap → verify) → delete.
 *
 * Usage:
 *   SMOKE_REPO=ollama/ollama npm run devbox:smoke
 */

import { loadEnvFile } from "../src/lib/load-env.mjs";
import { createContext } from "../src/context.mjs";
import { deleteDevbox } from "../src/lib/devbox/client.mjs";
import { provisionDevboxForRepo } from "../src/lib/devbox/provision.mjs";
import { verifyWorkspace } from "../src/lib/devbox/bootstrap.mjs";
import { getDevbox } from "../src/lib/devbox/client.mjs";

loadEnvFile();

const fullName =
  process.env.SMOKE_REPO?.trim() || "ollama/ollama";

const ctx = createContext();
ctx.current = { full_name: fullName };

let runtimeName = null;

try {
  console.log(`Smoke repo: ${fullName}`);
  await provisionDevboxForRepo(ctx);
  runtimeName = ctx.runtimeName;

  console.log(`OK  provision`);
  console.log(`    runtimeName: ${ctx.runtimeName}`);
  console.log(`    gatewayUrl:  ${ctx.gatewayUrl}`);
  console.log(`    namespace:   ${ctx.runtimeNamespace ?? "(none)"}`);

  await verifyWorkspace(runtimeName);
  console.log("OK  verify workspace (SKILL.md present)");

  const info = await getDevbox(runtimeName);
  const phase = info.data?.state?.phase;
  console.log(`OK  devbox phase: ${phase}`);
} catch (error) {
  console.error("FAIL smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (runtimeName) {
    try {
      console.log(`[devbox] delete ${runtimeName}`);
      await deleteDevbox(runtimeName);
      console.log("OK  delete devbox");
    } catch (error) {
      console.error("FAIL delete devbox");
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
