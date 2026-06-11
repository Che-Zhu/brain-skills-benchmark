import {
  formatDurationMinutesSeconds,
  formatLocalTimestamp,
} from "./local-time.mjs";

export const CSV_HEADER =
  "full_name,category,deploy_difficulty,status,error,started_at,finished_at,runtime_name,gateway_session_id,duration,api_requests,api_tokens,api_cost_usd,template_yaml_path,template_dryrun_status,template_dryrun_error\n";

export function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatCsvRow(row) {
  const durationMs = row.finishedAt - row.startedAt;
  return [
    escapeCsv(row.fullName),
    escapeCsv(row.category),
    escapeCsv(row.deployDifficulty),
    escapeCsv(row.status),
    escapeCsv(row.error),
    escapeCsv(formatLocalTimestamp(row.startedAt)),
    escapeCsv(formatLocalTimestamp(row.finishedAt)),
    escapeCsv(row.runtimeName),
    escapeCsv(row.gatewaySessionId),
    escapeCsv(formatDurationMinutesSeconds(durationMs)),
    row.apiRequests,
    row.apiTokens,
    row.apiCostUsd.toFixed(6),
    escapeCsv(row.templateYamlPath),
    escapeCsv(row.templateDryRunStatus),
    escapeCsv(row.templateDryRunError),
  ].join(",");
}

export function buildCsvContent(rows) {
  return CSV_HEADER + rows.map(formatCsvRow).join("\n") + "\n";
}
