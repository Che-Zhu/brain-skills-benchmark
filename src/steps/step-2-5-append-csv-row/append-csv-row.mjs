import { appendFileSync, existsSync } from "node:fs";
import { CSV_HEADER, formatCsvRow } from "../../lib/csv-report.mjs";
import {
  fetchAllOverviewRecords,
  getOverviewApiKey,
  sumUsageInWindow,
} from "../../lib/overview-usage.mjs";

async function fetchRepoUsage(ctx) {
  try {
    const apiKey = getOverviewApiKey();
    const records = await fetchAllOverviewRecords(apiKey);
    return sumUsageInWindow(records, ctx.startedAt, ctx.finishedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[report] overview usage fetch failed: ${message}`);
    return { apiRequests: 0, apiTokens: 0, apiCostUsd: 0 };
  }
}

export async function run(ctx) {
  const usage = await fetchRepoUsage(ctx);
  console.info(
    `[report] ${ctx.current.full_name}: ${usage.apiRequests} requests, ${usage.apiTokens} tokens, $${usage.apiCostUsd.toFixed(4)}`,
  );

  if (!existsSync(ctx.csvPath)) {
    appendFileSync(ctx.csvPath, CSV_HEADER);
  }

  const row = formatCsvRow({
    fullName: ctx.current.full_name,
    category: ctx.current.category,
    deployDifficulty: ctx.current.deploy_difficulty,
    status: ctx.status,
    error: ctx.error,
    startedAt: ctx.startedAt,
    finishedAt: ctx.finishedAt,
    runtimeName: ctx.runtimeName,
    gatewaySessionId: ctx.gatewaySessionId,
    apiRequests: usage.apiRequests,
    apiTokens: usage.apiTokens,
    apiCostUsd: usage.apiCostUsd,
    templateYamlPath: ctx.templateYamlLocalPath,
    templateDryRunStatus: ctx.templateDryRunStatus,
    templateDryRunError: ctx.templateDryRunError,
  });

  appendFileSync(ctx.csvPath, `${row}\n`);
}
