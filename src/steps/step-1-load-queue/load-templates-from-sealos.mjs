import { requireEnv } from "../../lib/load-env.mjs";

function parseBenchmarkLimit(env) {
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

function parseBenchmarkOffset(env) {
  const raw = env.BENCHMARK_OFFSET;
  if (raw === undefined || raw === "") return 0;
  const offset = Number.parseInt(raw, 10);
  if (!Number.isFinite(offset) || offset < 0) {
    throw new Error(
      `Invalid BENCHMARK_OFFSET "${raw}" (expected a non-negative integer)`,
    );
  }
  return offset;
}

function directRepoEnabled(env) {
  return env.BENCHMARK_ALLOW_DIRECT_REPO === "1";
}

function validateRepoFullName(fullName) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(fullName)) {
    throw new Error(
      `Invalid BENCHMARK_REPO "${fullName}" (expected owner/repo)`,
    );
  }
}

function applyTargetFilter(queue, env = process.env) {
  const repo = env.BENCHMARK_REPO?.trim();
  const templateName = env.BENCHMARK_TEMPLATE_NAME?.trim()?.toLowerCase();
  if (!repo && !templateName) return queue;

  const filtered = queue.filter((item) => {
    if (repo && item.full_name !== repo) return false;
    if (templateName && item.template_name?.toLowerCase() !== templateName) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if (repo && !templateName && directRepoEnabled(env)) {
      validateRepoFullName(repo);
      console.info(
        `[queue] target filter → ${repo} (direct repo fallback, not in Sealos template queue)`,
      );
      return [
        {
          full_name: repo,
          template_name: null,
          queue_source: "direct",
        },
      ];
    }

    throw new Error(
      `BENCHMARK_REPO/BENCHMARK_TEMPLATE_NAME matched no queue entry (repo=${repo ?? ""}, template=${templateName ?? ""})`,
    );
  }

  console.info(
    `[queue] target filter → ${filtered.map((item) => item.full_name).join(", ")}`,
  );
  return filtered;
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

export async function loadTemplatesFromSealos({
  env = process.env,
  limit = parseBenchmarkLimit(env),
  offset = parseBenchmarkOffset(env),
} = {}) {
  const url = requireEnv("SEALOS_TEMPLATE_API_URL", env);
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
    queue.push({
      full_name,
      template_name: t.metadata?.name ?? null,
    });
  }

  console.info(
    `[queue] ${data.templates.length} templates → ${queue.length} github repos`,
  );
  if (queue.length === 0) throw new Error("empty queue after filter");

  const targeted = applyTargetFilter(queue, env);
  const windowed = targeted.slice(offset);
  const limited = limit === undefined ? windowed : windowed.slice(0, limit);
  if (offset > 0 || limit !== undefined) {
    console.info(
      `[queue] window offset=${offset} limit=${limit ?? "all"} → ${limited.length} repos`,
    );
  }
  return limited;
}
