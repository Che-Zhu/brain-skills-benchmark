import { requireEnv } from "../load-env.mjs";
import { getSealosKubeconfigAuthorization } from "./kubeconfig-auth.mjs";
import { applySealosTlsInsecureIfNeeded } from "./tls.mjs";

const REQUEST_TIMEOUT_MS = 120_000;

function formatApiError(payload, status) {
  if (payload && typeof payload === "object" && payload.error) {
    const { type, code, message, details } = payload.error;
    let detailText = "";
    if (details !== undefined) {
      detailText =
        typeof details === "string"
          ? `: ${details}`
          : `: ${JSON.stringify(details, null, 2)}`;
    }
    return `${type ?? "error"}/${code ?? status}: ${message ?? "request failed"}${detailText}`;
  }
  return `HTTP ${status}`;
}

export async function dryRunTemplateYaml(yaml, options = {}) {
  const env = options.env ?? process.env;
  applySealosTlsInsecureIfNeeded(env);
  const url = requireEnv("SEALOS_TEMPLATE_API_URL_DEPLOY", env);
  const authorization = getSealosKubeconfigAuthorization(env);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      yaml,
      dryRun: true,
      ...(options.args ? { args: options.args } : {}),
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data: payload,
      error: formatApiError(payload, response.status),
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload,
    error: null,
  };
}
