let tlsInsecureApplied = false;

/** Self-built clusters: same flag as Devbox (DEVBOX_TLS_INSECURE) or SEALOS_TLS_INSECURE. */
export function isSealosTlsInsecureEnabled(env = process.env) {
  for (const key of ["SEALOS_TLS_INSECURE", "DEVBOX_TLS_INSECURE"]) {
    const v = env[key]?.trim().toLowerCase();
    if (v === "1" || v === "true" || v === "yes") {
      return true;
    }
  }
  return false;
}

export function applySealosTlsInsecureIfNeeded(env = process.env) {
  if (!isSealosTlsInsecureEnabled(env) || tlsInsecureApplied) {
    return;
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  tlsInsecureApplied = true;
}
