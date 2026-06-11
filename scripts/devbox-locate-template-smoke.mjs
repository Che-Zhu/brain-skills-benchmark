#!/usr/bin/env node
/**
 * Smoke: provision Devbox, place a stub template YAML, verify locate path, delete.
 *
 * Usage:
 *   npm run devbox:locate-template-smoke
 */

import { loadEnvFile } from "../src/lib/load-env.mjs";
import { createContext } from "../src/context.mjs";
import { deleteDevbox, execDevbox } from "../src/lib/devbox/client.mjs";
import { provisionDevboxForRepo } from "../src/lib/devbox/provision.mjs";
import { locateTemplateYamlInDevbox } from "../src/lib/devbox/locate-template-yaml.mjs";
import {
  DEVBOX_AGENT_WORK_DIR,
  TEMPLATE_YAML_RELATIVE_PATH,
} from "../src/lib/devbox/template-yaml-path.mjs";
import { run as locateTemplateYamlStep } from "../src/steps/step-2-5-locate-template-yaml/locate-template-yaml.mjs";

loadEnvFile();

const fullName = process.env.SMOKE_REPO?.trim() || "ollama/ollama";
const ctx = createContext();
ctx.current = { full_name: fullName };

let runtimeName = null;

try {
  console.log(`Locate smoke repo: ${fullName}`);
  await provisionDevboxForRepo(ctx);
  runtimeName = ctx.runtimeName;

  const templatePath = `${DEVBOX_AGENT_WORK_DIR}/${TEMPLATE_YAML_RELATIVE_PATH}`;
  const seedScript = [
    "set -e",
    `mkdir -p "$(dirname "${templatePath}")"`,
    `printf '%s\\n' 'apiVersion: app.sealos.io/v1' > "${templatePath}"`,
    `printf '%s\\n' 'kind: Template' >> "${templatePath}"`,
  ].join("\n");

  const seed = await execDevbox(runtimeName, {
    command: ["sh", "-lc", seedScript],
    timeoutSeconds: 60,
  });
  if (seed.data.exitCode !== 0) {
    throw new Error(
      `failed to seed template yaml: ${seed.data.stdout}\n${seed.data.stderr}`,
    );
  }

  const direct = await locateTemplateYamlInDevbox(runtimeName);
  if (!direct.found) {
    throw new Error(`direct locate missed seeded file: ${JSON.stringify(direct)}`);
  }
  console.log(`OK  direct locate: ${direct.path}`);

  await locateTemplateYamlStep(ctx);
  if (ctx.templateYamlPath !== direct.path) {
    throw new Error(
      `step ctx.templateYamlPath=${ctx.templateYamlPath} !== ${direct.path}`,
    );
  }
  if (!ctx.templateYamlLocalPath || !ctx.templateYamlContent) {
    throw new Error("step did not save template YAML locally");
  }
  console.log(`OK  step ctx.templateYamlPath: ${ctx.templateYamlPath}`);
  console.log(`OK  step ctx.templateYamlLocalPath: ${ctx.templateYamlLocalPath}`);
} catch (error) {
  console.error("FAIL locate smoke");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (runtimeName) {
    try {
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
