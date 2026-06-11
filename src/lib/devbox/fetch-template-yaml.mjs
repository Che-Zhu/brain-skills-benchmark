import { execWorkspaceScript } from "./bootstrap.mjs";

export const TEMPLATE_YAML_CONTENT_MARKER = "__BENCHMARK_TEMPLATE_YAML_CONTENT__";
const DEFAULT_READ_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function shellEscape(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildReadTemplateYamlScript(filePath) {
  const escapedPath = shellEscape(filePath);
  return [
    "set -e",
    `[ -f ${escapedPath} ]`,
    `size="$(wc -c < ${escapedPath} | tr -d ' ')"`,
    `printf '%s\\n' "${TEMPLATE_YAML_CONTENT_MARKER}"`,
    'printf "size_bytes=%s\\n" "$size"',
    `base64 < ${escapedPath} | tr -d '\\n'`,
    'printf "\\n"',
  ].join("\n");
}

export function parseReadTemplateYamlExecResult({ exitCode, stdout, stderr }) {
  if (exitCode !== 0) {
    const detail = `${stdout}\n${stderr}`.trim();
    throw new Error(
      `template YAML read exec failed (exit ${exitCode})${detail ? `: ${detail}` : ""}`,
    );
  }

  if (!stdout.includes(TEMPLATE_YAML_CONTENT_MARKER)) {
    throw new Error(
      `template YAML read output missing marker: ${stdout.trim().slice(0, 500)}`,
    );
  }

  const lines = stdout.split("\n");
  const markerIndex = lines.findIndex((line) =>
    line.includes(TEMPLATE_YAML_CONTENT_MARKER),
  );
  if (markerIndex === -1) {
    throw new Error("template YAML read marker not found in output");
  }

  let sizeBytes = null;
  let base64Line = "";
  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("size_bytes=")) {
      const parsed = Number.parseInt(line.slice("size_bytes=".length), 10);
      if (Number.isFinite(parsed)) {
        sizeBytes = parsed;
      }
      continue;
    }
    if (line.length > 0) {
      base64Line += line;
    }
  }

  if (!base64Line) {
    throw new Error("template YAML read returned empty base64 payload");
  }

  const content = Buffer.from(base64Line, "base64").toString("utf8");
  return { content, sizeBytes: sizeBytes ?? Buffer.byteLength(content, "utf8") };
}

export async function fetchTemplateYamlFromDevbox(
  runtimeName,
  filePath,
  options = {},
) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const script = buildReadTemplateYamlScript(filePath);
  const response = await execWorkspaceScript(runtimeName, script, {
    timeoutSeconds: options.execTimeoutSeconds ?? 120,
    timeoutMs: options.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
  });

  const result = parseReadTemplateYamlExecResult(response.data);
  if (result.sizeBytes > maxBytes) {
    throw new Error(
      `template YAML exceeds max size (${result.sizeBytes} > ${maxBytes} bytes)`,
    );
  }

  return result;
}
