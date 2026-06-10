import { execWorkspaceScript } from "./bootstrap.mjs";
import {
  buildLocateTemplateYamlScript,
  parseLocateTemplateYamlExecResult,
} from "./template-yaml-path.mjs";

const DEFAULT_LOCATE_TIMEOUT_MS = 120_000;
const DEFAULT_LOCATE_EXEC_TIMEOUT_SECONDS = 60;

export async function locateTemplateYamlInDevbox(runtimeName, options = {}) {
  const script = buildLocateTemplateYamlScript();
  const response = await execWorkspaceScript(runtimeName, script, {
    timeoutSeconds:
      options.execTimeoutSeconds ?? DEFAULT_LOCATE_EXEC_TIMEOUT_SECONDS,
    timeoutMs: options.timeoutMs ?? DEFAULT_LOCATE_TIMEOUT_MS,
  });

  return parseLocateTemplateYamlExecResult(response.data);
}
