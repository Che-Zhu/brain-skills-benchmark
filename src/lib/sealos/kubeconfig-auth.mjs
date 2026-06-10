import { requireEnv } from "../load-env.mjs";
import { isSealosTlsInsecureEnabled } from "./tls.mjs";

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function decodeKubeconfigRaw(raw) {
  const stripped = stripWrappingQuotes(raw);
  if (
    stripped.includes("apiVersion:") ||
    stripped.startsWith("apiVersion\n") ||
    stripped.startsWith("apiVersion\r")
  ) {
    return stripped;
  }
  return decodeURIComponent(stripped);
}

function encodeKubeconfigForAuth(yaml) {
  return encodeURIComponent(yaml);
}

/** Insert insecure-skip-tls-verify on each cluster server block (for self-signed apiserver). */
export function applyInsecureSkipTlsVerifyToKubeconfig(yaml) {
  if (/insecure-skip-tls-verify:\s*true/m.test(yaml)) {
    return yaml;
  }

  return yaml.replace(/^([ \t]+server: .+)$/gm, (line) => {
    const indent = line.match(/^([ \t]+)/)?.[1] ?? "    ";
    return `${line}\n${indent}insecure-skip-tls-verify: true`;
  });
}

/** Authorization header value for Template API v2alpha mutation endpoints. */
export function getSealosKubeconfigAuthorization(env = process.env) {
  let yaml = decodeKubeconfigRaw(requireEnv("SEALOS_KUBECONFIG", env));

  if (isSealosTlsInsecureEnabled(env)) {
    yaml = applyInsecureSkipTlsVerifyToKubeconfig(yaml);
  }

  return encodeKubeconfigForAuth(yaml);
}
