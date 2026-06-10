import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function slugifyRepoFullName(fullName) {
  return String(fullName).trim().replace(/\//g, "-");
}

export function resolveTemplateYamlLocalPath(ctx) {
  if (!ctx.current?.full_name) {
    throw new Error("ctx.current.full_name is required to resolve template YAML path");
  }

  const reportDir = dirname(ctx.csvPath);
  const slug = slugifyRepoFullName(ctx.current.full_name);
  return join(reportDir, "templates", ctx.runId, slug, "index.yaml");
}

export function saveTemplateYamlArtifact(localPath, content) {
  mkdirSync(dirname(localPath), { recursive: true });
  writeFileSync(localPath, content, "utf8");
  return localPath;
}
