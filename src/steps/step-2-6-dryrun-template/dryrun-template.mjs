import { readFileSync } from "node:fs";
import { dryRunTemplateYaml } from "../../lib/sealos/template-dryrun.mjs";

function readYamlFromCtx(ctx) {
  if (ctx.templateYamlContent) {
    return ctx.templateYamlContent;
  }
  if (ctx.templateYamlLocalPath) {
    return readFileSync(ctx.templateYamlLocalPath, "utf8");
  }
  return null;
}

export async function run(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";
  const yaml = readYamlFromCtx(ctx);

  if (!yaml) {
    ctx.templateDryRunStatus = "skipped";
    ctx.templateDryRunError = ctx.templateYamlError ?? null;
    console.info(`[template-dryrun] ${repo}: skip (no captured YAML)`);
    return;
  }

  try {
    const result = await dryRunTemplateYaml(yaml);
    ctx.templateDryRun = result;

    if (result.ok) {
      ctx.templateDryRunStatus = "success";
      ctx.templateDryRunError = null;
      const instanceName = result.data?.name ?? "(unknown)";
      console.info(
        `[template-dryrun] ${repo}: success HTTP ${result.status}, instance=${instanceName}`,
      );
      return;
    }

    ctx.templateDryRunStatus = "failed";
    ctx.templateDryRunError = result.error;
    console.error(
      `[template-dryrun] ${repo}: failed HTTP ${result.status}: ${result.error}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.templateDryRunStatus = "failed";
    ctx.templateDryRunError = message;
    console.error(`[template-dryrun] ${repo}: error: ${message}`);
  }
}
