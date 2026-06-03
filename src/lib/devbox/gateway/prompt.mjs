export function buildBenchmarkSkillPrompt(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";

  return `You are in a Devbox workspace. The repository ${repo} is already cloned in the current working directory.

A sandbox deployment skill was installed via \`npx skills add\` (see .codex/skills or .agents/skills). Use that skill — not brain-github-deploy — to complete the full workflow for this repository: analyze the project, build artifacts, and push the container image according to the skill instructions.

Proceed automatically through all phases without stopping to ask for confirmation or user input.

If anything fails, explain the failure clearly with actionable next steps.`;
}
