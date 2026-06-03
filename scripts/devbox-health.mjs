#!/usr/bin/env node
/**
 * Phase 1 acceptance: Devbox API reachability + optional auth check.
 *
 * Usage:
 *   node scripts/devbox-health.mjs           # healthz only (no JWT)
 *   node scripts/devbox-health.mjs --auth    # also GET /api/v1/devbox (JWT)
 *
 * Exit 0 = pass, 1 = fail.
 */

import { loadEnvFile } from "../src/lib/load-env.mjs";
import { getDevboxHealth, listDevboxes } from "../src/lib/devbox/client.mjs";
import {
  getDevboxBaseUrl,
  getDevboxHealthzUrl,
} from "../src/lib/devbox/config.mjs";
import { isDevboxTlsInsecureEnabled } from "../src/lib/devbox/fetch.mjs";

loadEnvFile();

const checkAuth = process.argv.includes("--auth");

function pass(label, detail) {
  console.log(`OK  ${label}${detail ? `: ${detail}` : ""}`);
}

function fail(label, error) {
  console.error(`FAIL ${label}`);
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) {
    console.error(`Cause: ${error.cause}`);
    const causeText = String(error.cause);
    if (/certificate|cert|TLS|SSL/i.test(causeText)) {
      console.error(
        "Hint: cluster uses a self-signed cert. Add DEVBOX_TLS_INSECURE=1 to .env (local dev only).",
      );
    }
  }
  process.exit(1);
}

console.log(`Devbox base URL: ${getDevboxBaseUrl()}`);
console.log(`Request URL:   ${getDevboxHealthzUrl()}`);
console.log(
  `TLS insecure:  ${isDevboxTlsInsecureEnabled() ? "yes (DEVBOX_TLS_INSECURE)" : "no"}`,
);
console.log(`GET /healthz (no auth)`);

try {
  const health = await getDevboxHealth();
  const status = health?.data?.status;
  if (status == null) {
    fail("healthz", `unexpected body: ${JSON.stringify(health)}`);
  }
  pass("healthz", `status=${status}`);
} catch (error) {
  fail("healthz", error);
}

if (checkAuth) {
  console.log("GET /api/v1/devbox (JWT)");
  try {
    const list = await listDevboxes();
    const count = list?.data?.items?.length ?? 0;
    pass("list devboxes", `${count} item(s)`);
  } catch (error) {
    fail("list devboxes (check DEVBOX_JWT_SIGNING_KEY or DEVBOX_TOKEN)", error);
  }
} else {
  console.log(
    "Tip: run with --auth to verify JWT (DEVBOX_JWT_SIGNING_KEY or DEVBOX_TOKEN)",
  );
}
