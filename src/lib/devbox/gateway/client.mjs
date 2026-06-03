import { devboxFetch } from "../fetch.mjs";

export class CodexGatewayApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "CodexGatewayApiError";
    this.status = status;
    this.body = body;
  }
}

const STARTUP_TIMEOUT_MS = 60_000;
const STARTUP_RETRY_MS = 1_000;
const REQUEST_TIMEOUT_MS = 60_000;

function buildUrl(baseUrl, path) {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  url.pathname = `${basePath}/${relativePath}`;
  return url.toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text || null;
}

async function gatewayRequest(baseUrl, path, init, authToken) {
  const headers = new Headers(init?.headers);
  const requestUrl = buildUrl(baseUrl, path);

  if (!headers.has("content-type") && init?.body) {
    headers.set("content-type", "application/json");
  }

  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  const signal =
    init?.signal || AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const response = await devboxFetch(requestUrl, {
    ...init,
    headers,
    cache: "no-store",
    signal,
  });

  const body = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Codex gateway request failed with status ${response.status}`;
    throw new CodexGatewayApiError(message, response.status, body);
  }

  return body;
}

export async function getCodexGatewayHealth(baseUrl, authToken) {
  return gatewayRequest(baseUrl, "/healthz", { method: "GET" }, authToken);
}

export async function getCodexGatewayReady(baseUrl, authToken) {
  return gatewayRequest(baseUrl, "/readyz", { method: "GET" }, authToken);
}

export async function waitForCodexGatewayReady(baseUrl, authToken) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const health = await getCodexGatewayHealth(baseUrl, authToken);
      if (!health?.ok) {
        lastError = new Error("Codex gateway health check returned not ok");
        await sleep(STARTUP_RETRY_MS);
        continue;
      }
    } catch (error) {
      lastError = error;
      await sleep(STARTUP_RETRY_MS);
      continue;
    }

    try {
      const ready = await getCodexGatewayReady(baseUrl, authToken);
      if (ready?.ok) {
        return ready;
      }
      lastError = new Error("Codex gateway readiness check returned not ok");
    } catch (error) {
      lastError = error;
    }

    await sleep(STARTUP_RETRY_MS);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Codex gateway startup check timed out");
}

export async function createCodexGatewaySession(baseUrl, input, authToken) {
  return gatewayRequest(
    baseUrl,
    "/api/sessions",
    { method: "POST", body: JSON.stringify(input ?? {}) },
    authToken,
  );
}

export async function getCodexGatewaySessionState(baseUrl, sessionId, authToken) {
  return gatewayRequest(
    baseUrl,
    `/api/sessions/${encodeURIComponent(sessionId)}/state`,
    { method: "GET" },
    authToken,
  );
}

export async function sendCodexGatewayTurn(baseUrl, sessionId, input, authToken) {
  return gatewayRequest(
    baseUrl,
    `/api/sessions/${encodeURIComponent(sessionId)}/turn`,
    { method: "POST", body: JSON.stringify(input) },
    authToken,
  );
}
