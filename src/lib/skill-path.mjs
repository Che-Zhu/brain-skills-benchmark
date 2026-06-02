import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const CANDIDATES = [
  process.env.BRAIN_SANDBOX_SKILLS,
  path.join(REPO_ROOT, "..", "sealos-skills"),
  path.join(REPO_ROOT, "..", "brain-sandbox-skills"),
  path.join(REPO_ROOT, "..", "brain", "brain-sandbox-skills"),
].filter((entry) => typeof entry === "string" && entry.trim() !== "");

export function resolveSandboxSkillsRoot() {
  for (const candidate of CANDIDATES) {
    const resolved = path.resolve(candidate);
    const skillDir = path.join(
      resolved,
      "skills",
      "sealos-deploy",
      "SKILL.md"
    );
    if (fs.existsSync(skillDir)) {
      return resolved;
    }
  }

  throw new Error(
    [
      "sealos-skills (or legacy brain-sandbox-skills) not found.",
      "Set BRAIN_SANDBOX_SKILLS or clone it next to brain-skills-benchmark:",
      "  ../sealos-skills",
      "  ../brain-sandbox-skills",
      "  ../brain/brain-sandbox-skills",
    ].join("\n")
  );
}

export function resolveSealosDeployDir() {
  const root = resolveSandboxSkillsRoot();
  return path.join(root, "skills", "sealos-deploy");
}

export function resolveSkillScript(scriptName) {
  return path.join(resolveSealosDeployDir(), "scripts", scriptName);
}

export { REPO_ROOT };
