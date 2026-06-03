import { appendFileSync, existsSync } from "node:fs";

const HEADER =
  "full_name,status,error,started_at,finished_at,runtime_name,gateway_session_id,duration_ms\n";

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function run(ctx) {
  if (!existsSync(ctx.csvPath)) {
    appendFileSync(ctx.csvPath, HEADER);
  }

  const durationMs = ctx.finishedAt - ctx.startedAt;
  const row = [
    escapeCsv(ctx.current.full_name),
    escapeCsv(ctx.status),
    escapeCsv(ctx.error),
    ctx.startedAt,
    ctx.finishedAt,
    escapeCsv(ctx.runtimeName),
    escapeCsv(ctx.gatewaySessionId),
    durationMs,
  ].join(",");

  appendFileSync(ctx.csvPath, `${row}\n`);
}
