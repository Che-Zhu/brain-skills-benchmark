export function buildBenchmarkSkillPrompt(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";

  return `You are in a Devbox workspace. The repository ${repo} is already cloned in the current working directory.

A sandbox deployment skill was installed via \`npx skills add\` (see .codex/skills or .agents/skills). Use that skill — not brain-github-deploy — to complete the full workflow for this repository: analyze the project, build artifacts, and push the container image according to the skill instructions.

At the start of the run, before any artifact generation:
1. **BuildKit / buildctl** — Verify \`command -v buildctl\` and \`buildctl --version\`. Local \`buildkitd\` on \`/run/buildkit/buildkitd.sock\` is usually **not** running; that alone is not a failure. This Devbox has cluster access (\`kubectl\`): use the sandbox skill's \`k8s-buildkit-job\` flow to create a BuildKit Service, then confirm reachability with \`buildctl --addr tcp://<service-host>:1234 debug workers\`. Stop only if \`buildctl\` is missing or the provisioned remote builder is still unreachable after following the skill.
2. **WORK_DIR writability** — \`WORK_DIR\` is \`/home/devbox/workspace\` (bootstrap cloned the repo and fixed ownership for user \`devbox\`). Verify it is writable with a real temp-file create/write/delete test as the same user the agent uses. If it is not writable, try non-destructive fixes (\`chmod u+rwx\`, writable subdir under \`$HOME\`, re-export \`WORK_DIR\`) and re-test. **Whenever this check fails or you apply a fix, document the problem, what you tried, and the final working directory in your output.**

Proceed automatically through all phases without stopping to ask for confirmation or user input.

If anything fails, explain the failure clearly with actionable next steps.`;
}
