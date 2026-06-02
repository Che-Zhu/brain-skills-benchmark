import fs from "node:fs";
import path from "node:path";

import { runContractChecks } from "./lib/contract-checks.mjs";
import {
  validateArtifact,
  validateDeploymentOutputFile,
} from "./lib/skill-validator.mjs";

const FULL_ARTIFACTS = [
  ["analysis", "analysis.json"],
  ["build-request", "build-request.json"],
  ["build-result", "build-result.json"],
  ["deployment-output", "deployment-output.json"],
  ["delivery-manifest", "delivery-manifest.json"],
];

function mergeResults(schemaResults, contractChecks) {
  const contractResults = contractChecks.map((check) => ({
    file: check.name,
    kind: "contract",
    valid: check.valid,
    errors: check.valid ? [] : [{ path: "$", message: check.message ?? check.name }],
  }));

  return [...schemaResults, ...contractResults];
}

async function validateFullArtifacts(sealosDir) {
  const results = [];
  for (const [kind, fileName] of FULL_ARTIFACTS) {
    results.push(await validateArtifact(kind, path.join(sealosDir, fileName)));
  }

  const resourcesYaml = path.join(sealosDir, "crossplane", "resources.yaml");
  if (fs.existsSync(resourcesYaml)) {
    results.push({
      file: resourcesYaml,
      kind: "brain-resources",
      valid: true,
      errors: [],
      note: "presence only; use contract profile for AP shape checks on YAML",
    });
  } else {
    results.push({
      file: resourcesYaml,
      kind: "file",
      valid: false,
      errors: [{ path: "$", message: "required artifact is missing" }],
    });
  }

  return results;
}

export async function validateWorkspace(workDir, options = {}) {
  const profile = options.profile ?? "contract";
  const resolved = path.resolve(workDir);
  const sealosDir = path.join(resolved, ".sealos");

  if (!fs.existsSync(sealosDir)) {
    return {
      profile,
      valid: false,
      workspace: resolved,
      results: [
        {
          file: sealosDir,
          kind: "workspace",
          valid: false,
          errors: [{ path: "$", message: "missing .sealos directory" }],
        },
      ],
    };
  }

  const { checks: contractChecks } = runContractChecks(resolved);
  const schemaResults = [];

  const deploymentOutputPath = path.join(sealosDir, "deployment-output.json");
  schemaResults.push(await validateDeploymentOutputFile(deploymentOutputPath));

  if (profile === "full") {
    schemaResults.push(...(await validateFullArtifacts(sealosDir)));
  }

  const results = mergeResults(schemaResults, contractChecks);
  const valid = results.every((entry) => entry.valid);

  return {
    profile,
    valid,
    workspace: resolved,
    results,
  };
}
