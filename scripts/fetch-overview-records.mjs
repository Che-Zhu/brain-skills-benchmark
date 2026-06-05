#!/usr/bin/env node
/**
 * Purpose: Fetch paginated API usage overview records.
 * Requires: .env CODEX_GATEWAY_OPENAI_API_KEY; network; PAGE, PAGE_SIZE (below).
 * Expected: stdout JSON { page, pageSize, total, items[] }; errors → stderr, exit 1.
 */

import { loadEnvFile } from "../src/lib/load-env.mjs";
import { fetchAllOverviewRecords, getOverviewApiKey } from "../src/lib/overview-usage.mjs";

const PAGE = 1;
const PAGE_SIZE = 20;

loadEnvFile();

const apiKey = getOverviewApiKey();
const items = await fetchAllOverviewRecords(apiKey);
const pageItems = items.slice((PAGE - 1) * PAGE_SIZE, PAGE * PAGE_SIZE);

console.log(
  JSON.stringify(
    {
      page: PAGE,
      pageSize: PAGE_SIZE,
      total: items.length,
      items: pageItems,
    },
    null,
    2,
  ),
);
