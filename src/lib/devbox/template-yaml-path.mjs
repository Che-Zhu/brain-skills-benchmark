import { workspaceDirScriptLines } from "./bootstrap.mjs";

/** Relative path under WORK_DIR per sandbox skill convention. */
export const TEMPLATE_YAML_RELATIVE_PATH = ".sealos/template/index.yaml";

/** Gateway agent WORK_DIR (see gateway prompt); exec API runs as root and may resolve a different workspace_dir. */
export const DEVBOX_AGENT_WORK_DIR = "/home/devbox/workspace";

export const TEMPLATE_YAML_FOUND_MARKER = "__BENCHMARK_TEMPLATE_YAML_FOUND__";
export const TEMPLATE_YAML_MISSING_MARKER = "__BENCHMARK_TEMPLATE_YAML_MISSING__";

export function buildLocateTemplateYamlScript() {
  const agentWorkDir = DEVBOX_AGENT_WORK_DIR;
  const rel = TEMPLATE_YAML_RELATIVE_PATH;

  return [
    "set -e",
    ...workspaceDirScriptLines(),
    `agent_work_dir="${agentWorkDir}"`,
    `primary="$agent_work_dir/${rel}"`,
    'found=""',
    'workspace_hit=""',
    'if [ -f "$primary" ]; then',
    '  found="$primary"',
    '  workspace_hit="$agent_work_dir"',
    "else",
    `  if [ -f "$workspace_dir/${rel}" ]; then`,
    `    found="$workspace_dir/${rel}"`,
    '    workspace_hit="$workspace_dir"',
    "  else",
    '    for base in "$agent_work_dir" "$workspace_dir" /workspace; do',
    '      [ -n "$base" ] || continue',
    '      [ -d "$base" ] || continue',
    `      hit="$(find "$base" -type f -path "*/${rel}" 2>/dev/null | head -n 1 || true)"`,
    '      if [ -n "$hit" ]; then',
    '        found="$hit"',
    '        workspace_hit="$base"',
    "        break",
    "      fi",
    "    done",
    "  fi",
    "fi",
    'if [ -n "$found" ]; then',
    `  printf '%s\\n' "${TEMPLATE_YAML_FOUND_MARKER}"`,
    '  printf "path=%s\\n" "$found"',
    '  printf "workspace_dir=%s\\n" "$workspace_hit"',
    '  printf "size_bytes=%s\\n" "$(wc -c < "$found" | tr -d " ")"',
    "else",
    `  printf '%s\\n' "${TEMPLATE_YAML_MISSING_MARKER}"`,
    '  printf "workspace_dir=%s\\n" "$agent_work_dir"',
    '  printf "primary=%s\\n" "$primary"',
    '  alternatives=""',
    '  for base in "$agent_work_dir" "$workspace_dir" /workspace; do',
    '    [ -n "$base" ] || continue',
    '    [ -d "$base" ] || continue',
    '    part="$(find "$base" -type f -path "*/.sealos/*" \\( -name "*.yaml" -o -name "*.yml" \\) 2>/dev/null | head -n 10 | tr "\\n" ";" || true)"',
    '    if [ -n "$part" ]; then',
    '      alternatives="${alternatives}${part}"',
    "    fi",
    "  done",
    '  printf "alternatives=%s\\n" "$alternatives"',
    "fi",
  ].join("\n");
}

function parseKeyValueLines(text) {
  const fields = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }
    fields[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return fields;
}

export function parseLocateTemplateYamlExecResult({ exitCode, stdout, stderr }) {
  if (exitCode !== 0) {
    const detail = `${stdout}\n${stderr}`.trim();
    throw new Error(
      `template YAML locate exec failed (exit ${exitCode})${detail ? `: ${detail}` : ""}`,
    );
  }

  const fields = parseKeyValueLines(stdout);

  if (stdout.includes(TEMPLATE_YAML_FOUND_MARKER)) {
    const path = fields.path?.trim();
    if (!path) {
      throw new Error("template YAML locate returned found marker without path");
    }

    const sizeBytes = Number.parseInt(fields.size_bytes ?? "", 10);
    return {
      found: true,
      path,
      workspaceDir: fields.workspace_dir?.trim() ?? null,
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
      primaryPath: null,
      alternatives: [],
    };
  }

  if (stdout.includes(TEMPLATE_YAML_MISSING_MARKER)) {
    const alternatives = (fields.alternatives ?? "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean);

    return {
      found: false,
      path: null,
      workspaceDir: fields.workspace_dir?.trim() ?? null,
      sizeBytes: null,
      primaryPath: fields.primary?.trim() ?? null,
      alternatives,
    };
  }

  throw new Error(
    `template YAML locate output missing marker: ${stdout.trim().slice(0, 500)}`,
  );
}
