import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return null;
  }
  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    return null;
  }
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function loadFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const parsed = parseEnvLine(line);
    if (parsed == null) {
      continue;
    }
    const [key, value] = parsed;
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

/** Codex / Devbox 部署流程调用的 skill 名称（对应 `/sealos-deploy`）。 */
export const DEPLOY_SKILL_NAME = "sealos-deploy";

export function getBrainSandboxSkillsGit(): string {
  const configured = process.env.BRAIN_SANDBOX_SKILLS_GIT?.trim();
  if (configured == null || configured === "") {
    throw new Error(
      "缺少环境变量 BRAIN_SANDBOX_SKILLS_GIT（在 .env 中配置 Devbox 内 npx skills add 的技能仓库 URL）"
    );
  }
  return configured;
}

/** 从仓库根目录加载 `.env` / `.env.local`（不覆盖已存在的环境变量）。 */
export function loadBenchmarkEnv(): void {
  loadFile(path.join(REPO_ROOT, ".env"));
  loadFile(path.join(REPO_ROOT, ".env.local"));

  const brainUiEnv = path.join(REPO_ROOT, "..", "brain", "apps", "ui", ".env.local");
  loadFile(brainUiEnv);
}
