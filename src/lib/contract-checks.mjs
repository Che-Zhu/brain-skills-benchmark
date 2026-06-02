import fs from "node:fs";
import path from "node:path";

const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /x-access-token:[^@\s]+@github\.com/i,
];

function push(checks, name, valid, message) {
  checks.push({ name, valid, ...(message ? { message } : {}) });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walkTextFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTextFiles(fullPath, files);
      continue;
    }
    if (/\.(json|yaml|yml|md|txt|log|env)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkNoTokenLeak(sealosDir, checks) {
  const offenders = [];
  for (const file of walkTextFiles(sealosDir)) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of TOKEN_PATTERNS) {
      if (pattern.test(text)) {
        offenders.push(path.relative(sealosDir, file));
        break;
      }
    }
  }
  push(
    checks,
    "does-not-leak-token",
    offenders.length === 0,
    offenders.length > 0
      ? `possible token in: ${offenders.join(", ")}`
      : undefined
  );
}

function checkBrainRunnerYaml(sealosDir, deploymentOutput, checks) {
  if (deploymentOutput?.status === "failed") {
    push(
      checks,
      "brain-crossplane-yaml-optional-on-failure",
      true,
      "failed runs may omit Crossplane YAML"
    );
    return;
  }

  const resourcesYaml = path.join(sealosDir, "crossplane", "resources.yaml");
  const apYaml = path.join(sealosDir, "crossplane", "ap.yaml");
  const hasResources = fs.existsSync(resourcesYaml);
  const hasAp = fs.existsSync(apYaml);

  push(
    checks,
    "brain-crossplane-yaml-present",
    hasResources || hasAp,
    "expected .sealos/crossplane/resources.yaml and/or ap.yaml (Brain runner uses ap.yaml)"
  );

  const yamlPath = hasAp ? apYaml : hasResources ? resourcesYaml : null;
  if (yamlPath == null) {
    return;
  }

  const raw = fs.readFileSync(yamlPath, "utf8");
  const imageRef = deploymentOutput?.image?.ref;
  const patterns = [
    [/^apiVersion:\s*example\.crossplane\.io\/v1$/m, "apiVersion example.crossplane.io/v1"],
    [/^kind:\s*AP$/m, "kind AP"],
    [
      /^\s+name:\s*aps-deployment-ingress-go-templating$/m,
      "composition aps-deployment-ingress-go-templating",
    ],
  ];

  for (const [pattern, label] of patterns) {
    push(checks, `brain-yaml-${label}`, pattern.test(raw), `missing ${label} in ${path.basename(yamlPath)}`);
  }

  if (typeof imageRef === "string" && imageRef.length > 0) {
    push(
      checks,
      "brain-yaml-image-matches-response",
      raw.includes(imageRef),
      `YAML should reference deployment image ${imageRef}`
    );
  }

  if (/^kind:\s*Template$/m.test(raw) || /app\.sealos\.io\/v1/.test(raw)) {
    push(checks, "brain-yaml-no-legacy-template", false, "must not emit legacy Sealos Template resources");
  } else {
    push(checks, "brain-yaml-no-legacy-template", true);
  }
}

function checkResponseSemantics(deploymentOutput, checks) {
  const { status, mode, error, image } = deploymentOutput;

  push(
    checks,
    "response-fixed-shape",
    deploymentOutput.apiVersion === "brain.skills.sh/v1alpha1" &&
      deploymentOutput.kind === "GitHubDeployResponse",
    "apiVersion/kind must be brain.skills.sh/v1alpha1 GitHubDeployResponse"
  );

  if (status === "succeeded") {
    push(
      checks,
      "success-image-tagged",
      typeof image?.ref === "string" && /^ghcr\.io\/[^\s:]+\/[^\s:]+:[^\s:]+$/.test(image.ref),
      "succeeded runs need a tagged ghcr.io image ref"
    );
    push(checks, "success-error-null", error === null, "error must be null when status is succeeded");
    push(
      checks,
      "success-has-ap-template",
      Array.isArray(deploymentOutput.templates) &&
        deploymentOutput.templates.some(
          (entry) =>
            entry?.manifest?.apiVersion === "example.crossplane.io/v1" &&
            entry?.manifest?.kind === "AP"
        ),
      "templates must include an AP manifest"
    );
  }

  if (status === "failed") {
    push(
      checks,
      "failed-actionable-error",
      typeof error === "string" && error.trim().length > 0,
      "failed runs need a non-empty error string"
    );
    push(
      checks,
      "failed-stops-before-push",
      image?.ref == null || image.ref === "",
      "failed runs should not claim a pushed GHCR image"
    );
  }

  push(
    checks,
    "mode-matches-status",
    (status === "succeeded" && mode === "deployable") ||
      (status === "failed" && mode !== "deployable"),
    `status=${status} mode=${mode} combination looks inconsistent`
  );
}

export function runContractChecks(workDir) {
  const sealosDir = path.join(path.resolve(workDir), ".sealos");
  const outputPath = path.join(sealosDir, "deployment-output.json");
  const checks = [];

  if (!fs.existsSync(outputPath)) {
    push(checks, "deployment-output-exists", false, "missing .sealos/deployment-output.json");
    return { checks, deploymentOutput: null };
  }

  push(checks, "deployment-output-exists", true);
  const deploymentOutput = readJson(outputPath);
  checkResponseSemantics(deploymentOutput, checks);
  checkBrainRunnerYaml(sealosDir, deploymentOutput, checks);
  checkNoTokenLeak(sealosDir, checks);

  return { checks, deploymentOutput };
}
