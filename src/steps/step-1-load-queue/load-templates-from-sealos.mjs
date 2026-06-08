import { requireEnv } from "../../lib/load-env.mjs";

function parseBenchmarkLimit(env = process.env) {
  const raw = env.BENCHMARK_LIMIT;
  if (raw === undefined || raw === "") return undefined;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(
      `Invalid BENCHMARK_LIMIT "${raw}" (expected a positive integer)`,
    );
  }
  return limit;
}

function githubFullName(gitRepo) {
  try {
    const url = new URL(String(gitRepo).trim());
    if (!url.hostname.endsWith("github.com")) return null;
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return `${owner}/${repo.replace(/\.git$/i, "")}`;
  } catch {
    return null;
  }
}

export async function loadTemplatesFromSealos({ limit = parseBenchmarkLimit() } = {}) {
  const url = requireEnv("SEALOS_TEMPLATE_API_URL");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`template API HTTP ${res.status}`);

  const { code, message, data } = await res.json();
  if (code !== 200) throw new Error(message ?? `template API code ${code}`);

  const seen = new Set();
  const queue = [];
  for (const t of data.templates) {
    const full_name = githubFullName(t.spec?.gitRepo);
    if (!full_name || seen.has(full_name)) continue;
    seen.add(full_name);
    queue.push({ full_name });
  }

  console.info(
    `[queue] ${data.templates.length} templates → ${queue.length} github repos`,
  );
  if (queue.length === 0) throw new Error("empty queue after filter");

  return limit === undefined ? queue : queue.slice(0, limit);
}
