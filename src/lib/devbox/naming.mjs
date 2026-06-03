import { createHash } from "node:crypto";

const DNS_1123_NAME_MAX = 63;
const UPSTREAM_ID_MAX = 63;

function slugifyFullName(fullName) {
  return fullName
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/**
 * Stable Devbox resource name for one repo in a batch run.
 */
export function createBenchmarkDevboxName(runId, fullName) {
  const runPart = runId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 12);
  const repoPart = slugifyFullName(fullName).slice(0, 40);
  let name = `bm-${runPart}-${repoPart}`.replace(/-+/g, "-");
  name = name.slice(0, DNS_1123_NAME_MAX).replace(/-+$/g, "");
  if (!/^[a-z0-9]/.test(name)) {
    name = `bm-${name}`.slice(0, DNS_1123_NAME_MAX);
  }
  if (!/[a-z0-9]$/.test(name)) {
    name = name.replace(/-+$/, "");
  }
  return name;
}

/** upstreamID for list/create dedup (K8s label, max 63 bytes). */
export function createBenchmarkUpstreamId(runId, fullName) {
  const hash = createHash("sha256")
    .update(`${runId}\0${fullName}`)
    .digest("hex")
    .slice(0, 32);
  const id = `bm-${hash}`;
  if (id.length > UPSTREAM_ID_MAX) {
    throw new Error(`upstreamID exceeds ${UPSTREAM_ID_MAX} bytes: ${id}`);
  }
  return id;
}
