#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSkillScript } from "../src/lib/skill-path.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

async function loadSkillHelpers() {
  const deployResponseUrl = new URL(
    resolveSkillScript("write-brain-deploy-response.mjs"),
    import.meta.url
  ).href;
  return import(deployResponseUrl);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeSucceededMinimal() {
  const { buildGitHubDeployResponse, renderTemplatesYaml } = await loadSkillHelpers();
  const analysis = {
    generated_at: new Date().toISOString(),
    project: {
      github_url: "https://github.com/example/my-app",
      work_dir: "/home/devbox/project",
      repo_name: "example/my-app",
      branch: "main",
    },
    score: {
      total: 8,
      verdict: "Good",
      dimensions: {
        statelessness: 2,
        config: 1,
        scalability: 2,
        startup: 1,
        observability: 1,
        boundaries: 1,
      },
    },
    language: "node",
    all_languages: ["node"],
    framework: "nextjs",
    package_manager: "pnpm",
    port: 3000,
    databases: [],
    object_storage: [],
    runtime_version: { node: "20", source: "package.json" },
    env_vars: {},
    has_dockerfile: true,
    complexity_tier: "L2",
    image_ref: null,
  };

  const buildResult = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    status: "succeeded",
    mode: "build-required",
    image: {
      image_ref: "ghcr.io/example/my-app:prepare-abcdef1",
      digest: null,
      visibility: "public",
    },
    source: {
      github_url: "https://github.com/example/my-app",
      repo: "example/my-app",
      branch: "main",
      ref: "abcdef1234567890abcdef1234567890abcdef12",
      context_path: ".",
      dockerfile_path: "Dockerfile",
    },
    kubernetes: {
      namespace: "benchmark",
      job: "buildkit",
      pod: "buildkit-pod",
    },
    logs: { local_file: "/tmp/build.log" },
  };

  const response = buildGitHubDeployResponse(analysis, buildResult, {
    brain: {
      namespace: "apps",
      project_name: "my-app",
      region: "example.com",
    },
  });

  const yaml = renderTemplatesYaml(response.templates);
  const root = path.join(REPO_ROOT, "fixtures", "succeeded-minimal", ".sealos");

  writeJson(path.join(root, "deployment-output.json"), response);
  fs.mkdirSync(path.join(root, "crossplane"), { recursive: true });
  fs.writeFileSync(path.join(root, "crossplane", "resources.yaml"), `${yaml}\n`);

  const apTemplate = response.templates.find((entry) => entry.id === "ap:web");
  if (apTemplate?.manifest) {
    const apYaml = [
      "apiVersion: example.crossplane.io/v1",
      "kind: AP",
      `metadata:`,
      `  name: ${apTemplate.manifest.metadata.name}`,
      `  namespace: ${apTemplate.manifest.metadata.namespace}`,
      "spec:",
      "  crossplane:",
      "    compositionRef:",
      `      name: ${apTemplate.manifest.spec.crossplane.compositionRef.name}`,
      "  input:",
      `    image: ${apTemplate.manifest.spec.input.image}`,
      "  network:",
      `    privatePort: ${apTemplate.manifest.spec.input.network.privatePort}`,
      "  resource:",
      "    replicaStrategy:",
      "      type: fixed",
      "      fixed:",
      "        replicas: 1",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(root, "crossplane", "ap.yaml"), apYaml);
  }

  console.log("wrote fixtures/succeeded-minimal");
}

async function writeFailedUnsupported() {
  const response = {
    apiVersion: "brain.skills.sh/v1alpha1",
    kind: "GitHubDeployResponse",
    status: "failed",
    mode: "unsupported",
    message: "Repository is not suitable for Brain deployment",
    error:
      "sharkdp/bat is a CLI tool without a long-running HTTP server; deployment stopped before GHCR push.",
    source: {
      repository: "https://github.com/sharkdp/bat",
      branch: "master",
      commit: null,
    },
    image: { ref: null, digest: null },
    templates: [],
    applyOrder: [],
    bindings: [],
    unresolvedInputs: [],
    warnings: [],
  };

  const root = path.join(REPO_ROOT, "fixtures", "failed-unsupported", ".sealos");
  writeJson(path.join(root, "deployment-output.json"), response);
  console.log("wrote fixtures/failed-unsupported");
}

async function main() {
  await writeSucceededMinimal();
  await writeFailedUnsupported();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
