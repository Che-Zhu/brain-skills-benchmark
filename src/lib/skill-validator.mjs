import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { resolveSkillScript } from "./skill-path.mjs";

let validatorModulePromise;

async function loadValidatorModule() {
  validatorModulePromise ??= import(
    pathToFileURL(resolveSkillScript("artifact-validator.mjs")).href
  );
  return validatorModulePromise;
}

export async function validateArtifact(kind, filePath) {
  const { validateArtifactFile } = await loadValidatorModule();
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      file: absolutePath,
      kind,
      valid: false,
      errors: [{ path: "$", message: "file does not exist" }],
    };
  }
  return {
    file: absolutePath,
    kind,
    ...validateArtifactFile(kind, absolutePath),
  };
}

export async function validateDeploymentOutputFile(filePath) {
  return validateArtifact("deployment-output", filePath);
}
