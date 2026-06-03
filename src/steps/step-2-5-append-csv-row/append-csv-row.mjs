import { appendFileSync, existsSync } from "node:fs";

const HEADER =
  "full_name,status,started_at,finished_at,runtime_name,duration_ms\n";

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
    ctx.startedAt,
    ctx.finishedAt,
    escapeCsv(ctx.runtimeName),
    durationMs,
  ].join(",");

  appendFileSync(ctx.csvPath, `${row}\n`);
}
