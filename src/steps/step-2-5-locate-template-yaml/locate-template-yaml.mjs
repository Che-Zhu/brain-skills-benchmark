import { fetchTemplateYamlFromDevbox } from "../../lib/devbox/fetch-template-yaml.mjs";
import { locateTemplateYamlInDevbox } from "../../lib/devbox/locate-template-yaml.mjs";
import {
  resolveTemplateYamlLocalPath,
  saveTemplateYamlArtifact,
} from "../../lib/devbox/template-yaml-artifact.mjs";
import {
  DEVBOX_AGENT_WORK_DIR,
  TEMPLATE_YAML_RELATIVE_PATH,
} from "../../lib/devbox/template-yaml-path.mjs";

export async function run(ctx) {
  const runtimeName = ctx.runtimeName;
  if (!runtimeName) {
    return;
  }

  const repo = ctx.current?.full_name ?? "unknown";

  try {
    const result = await locateTemplateYamlInDevbox(runtimeName);
    ctx.templateYaml = result;

    if (!result.found) {
      ctx.templateYamlPath = null;
      ctx.templateYamlLocalPath = null;
      const alt =
        result.alternatives.length > 0
          ? `; alternatives: ${result.alternatives.join(", ")}`
          : "";
      console.info(
        `[template] ${repo}: not found at ${result.primaryPath ?? `${DEVBOX_AGENT_WORK_DIR}/${TEMPLATE_YAML_RELATIVE_PATH}`} (workspace=${result.workspaceDir})${alt}`,
      );
      return;
    }

    ctx.templateYamlPath = result.path;
    const { content, sizeBytes } = await fetchTemplateYamlFromDevbox(
      runtimeName,
      result.path,
    );
    const localPath = resolveTemplateYamlLocalPath(ctx);
    saveTemplateYamlArtifact(localPath, content);
    ctx.templateYamlLocalPath = localPath;
    ctx.templateYamlContent = content;

    console.info(
      `[template] ${repo}: captured ${result.path} -> ${localPath} (${sizeBytes} bytes, workspace=${result.workspaceDir})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.templateYamlError = message;
    ctx.templateYamlPath = null;
    ctx.templateYamlLocalPath = null;
    console.error(`[template] ${repo}: capture failed: ${message}`);
  }
}
