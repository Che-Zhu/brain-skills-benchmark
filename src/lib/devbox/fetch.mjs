let tlsInsecureApplied = false;

function isTlsInsecureEnabled() {
  const v = process.env.DEVBOX_TLS_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function applyTlsInsecureIfNeeded() {
  if (!isTlsInsecureEnabled() || tlsInsecureApplied) {
    return;
  }
  // Local dev clusters (e.g. nip.io + self-signed). Browser may trust; Node rejects by default.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  tlsInsecureApplied = true;
}

/**
 * Devbox HTTP fetch. Set DEVBOX_TLS_INSECURE=1 for self-signed cluster certs (dev only).
 */
export function devboxFetch(url, init) {
  applyTlsInsecureIfNeeded();
  return fetch(url, init);
}

export function isDevboxTlsInsecureEnabled() {
  return isTlsInsecureEnabled();
}
