const DEFAULT_OVERVIEW_RECORDS_URL =
  "https://sub2api-rank-uqloyzdq.usw-1.sealos.app/api/overview/records";

const PAGE_SIZE = 100;

export function getOverviewRecordsUrl() {
  return (
    process.env.OVERVIEW_RECORDS_URL?.trim() || DEFAULT_OVERVIEW_RECORDS_URL
  );
}

export function getOverviewApiKey() {
  const apiKey = process.env.CODEX_GATEWAY_OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CODEX_GATEWAY_OPENAI_API_KEY is required for overview usage");
  }
  return apiKey;
}

export async function fetchAllOverviewRecords(apiKey, url = getOverviewRecordsUrl()) {
  let page = 1;
  let total = Infinity;
  const items = [];

  while (items.length < total) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, page, pageSize: PAGE_SIZE }),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `overview records HTTP ${response.status}: ${text.slice(0, 500)}`,
      );
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("overview records response is not JSON");
    }
    total = data.total ?? 0;
    const batch = data.items ?? [];
    items.push(...batch);
    if (batch.length === 0) break;
    page += 1;
  }

  return items;
}

/** Sum usage for one repo window (startedAt/finishedAt are epoch ms). */
export function sumUsageInWindow(records, startedAtMs, finishedAtMs) {
  const start = Number(startedAtMs);
  const end = Number(finishedAtMs);
  let apiRequests = 0;
  let apiTokens = 0;
  let apiCostUsd = 0;

  for (const row of records) {
    const t = new Date(row.createdAt).getTime();
    if (t < start || t > end) continue;
    apiRequests += 1;
    apiTokens += row.tokens ?? 0;
    apiCostUsd += row.cost ?? 0;
  }

  return { apiRequests, apiTokens, apiCostUsd };
}
