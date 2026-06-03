import {
  getDevboxApiPrefix,
  getDevboxAuthToken,
  getDevboxBaseUrl,
} from "./config.mjs";
import { devboxFetch } from "./fetch.mjs";

export class DevboxApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "DevboxApiError";
    this.status = status;
  }
}

const DEVBOX_REQUEST_TIMEOUT_MS = 60_000;
const DEVBOX_EXEC_REQUEST_BUFFER_MS = 10_000;

function buildUrl(pathname, searchParams, includeApiPrefix = true) {
  const basePath = includeApiPrefix
    ? `${getDevboxApiPrefix()}${pathname}`
    : pathname;
  const url = new URL(basePath, getDevboxBaseUrl());
  if (searchParams) {
    url.search = searchParams.toString();
  }
  return url.toString();
}

async function parseJsonResponse(response) {
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new DevboxApiError(
      response.status,
      "Devbox API returned an invalid JSON response",
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Devbox API request failed";

    throw new DevboxApiError(response.status, message);
  }

  return payload;
}

async function devboxRequest(pathname, init = {}) {
  const {
    headers: initHeaders,
    skipAuth,
    searchParams,
    includeApiPrefix,
    timeoutMs,
    ...requestInit
  } = init;
  const headers = new Headers(initHeaders);

  if (!skipAuth) {
    const token = await getDevboxAuthToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const signal =
    requestInit.signal ||
    AbortSignal.timeout(timeoutMs ?? DEVBOX_REQUEST_TIMEOUT_MS);

  const response = await devboxFetch(
    buildUrl(pathname, searchParams, includeApiPrefix),
    {
      ...requestInit,
      headers,
      cache: "no-store",
      signal,
    },
  );

  return parseJsonResponse(response);
}

/** Unauthenticated liveness check — phase 1 acceptance target. */
export async function getDevboxHealth() {
  return devboxRequest("/healthz", {
    method: "GET",
    skipAuth: true,
    includeApiPrefix: false,
  });
}

export async function createDevbox(input) {
  return devboxRequest("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listDevboxes(upstreamID) {
  const searchParams = new URLSearchParams();
  if (upstreamID) {
    searchParams.set("upstreamID", upstreamID);
  }

  return devboxRequest("", {
    method: "GET",
    searchParams,
  });
}

export async function getDevbox(name) {
  return devboxRequest(`/${encodeURIComponent(name)}`, {
    method: "GET",
  });
}

export async function resumeDevbox(name) {
  return devboxRequest(`/${encodeURIComponent(name)}/resume`, {
    method: "POST",
  });
}

export async function deleteDevbox(name) {
  return devboxRequest(`/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function execDevbox(name, input) {
  const timeoutMs = Math.max(
    DEVBOX_REQUEST_TIMEOUT_MS,
    (input.timeoutSeconds ?? 60) * 1000 + DEVBOX_EXEC_REQUEST_BUFFER_MS,
  );

  return devboxRequest(`/${encodeURIComponent(name)}/exec`, {
    method: "POST",
    body: JSON.stringify(input),
    timeoutMs,
  });
}
