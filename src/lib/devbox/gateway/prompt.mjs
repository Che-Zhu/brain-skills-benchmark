export function buildBenchmarkSkillPrompt(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";

  return `You are in a Devbox workspace. The repository ${repo} is already cloned in the current working directory.

A sandbox deployment skill was installed via \`npx skills add\` (see .codex/skills or .agents/skills). Use that skill — not brain-github-deploy — to complete the full workflow for this repository: analyze the project, build artifacts, and push the container image according to the skill instructions.

At the start of the run, before any artifact generation:
1. **BuildKit / buildctl** — If the sandbox skill requires it, verify \`command -v buildctl\` and \`buildctl --version\` (and any remote builder the skill documents). If tooling is missing or unreachable, stop and report exact diagnostics plus fixes per the skill.
2. **WORK_DIR writability** — Verify \`WORK_DIR\` (or the effective workspace directory) is writable with a real temp-file create/write/delete test. If it is root-owned or not writable, try every non-destructive, sandbox-permitted fix (e.g. \`chmod u+rwx\`, writable subdir under \`$HOME\`, export \`WORK_DIR\` to a writable path) and re-test until writable or you exhaust safe options. **Whenever this check fails or you apply a fix, document the problem, what you tried, and the final working directory in your output** so the failure mode is reproducible.

Proceed automatically through all phases without stopping to ask for confirmation or user input.

If anything fails, explain the failure clearly with actionable next steps.`;
}
