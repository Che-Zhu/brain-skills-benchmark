const DNS_1123_NAME_MAX = 63;

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

function slugifyLabel(value) {
  return value
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
}

/** upstreamID for list/create dedup within a batch. */
export function createBenchmarkUpstreamId(runId, fullName) {
  const id = `benchmark-${slugifyLabel(runId)}-${slugifyLabel(fullName)}`;
  if (!id || !/^[A-Za-z0-9]/.test(id) || !/[A-Za-z0-9]$/.test(id)) {
    throw new Error(`Invalid upstreamID derived from runId/full_name: ${id}`);
  }
  return id;
}
