export function buildBenchmarkSkillPrompt(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";

  return `You are in a Devbox workspace. The repository ${repo} is already cloned in the current working directory.

A sandbox skill was installed via \`npx skills add\` (see .codex/skills or .agents/skills). Use that skill — not brain-github-deploy — to run the **full prepare pipeline** for this repository through Phase 6 (assess → detect/reuse image → Dockerfile → build/push → **generate Sealos template YAML** → finish/validate).

**Required deliverables (all must exist before you finish):**
- \`.sealos/analysis.json\`
- \`.sealos/build-request.json\` and \`.sealos/build-result.json\` (or equivalent per the installed skill)
- \`.sealos/template/index.yaml\` — **mandatory**; this is a local file artifact, not a cluster deploy
- \`.sealos/delivery-manifest.json\` when the skill defines Phase 6

**Template YAML vs Sealos deploy (do not conflate):**
- Generating \`.sealos/template/index.yaml\` is **Phase 5 prepare work** and does **not** require Sealos auth, \`~/.sealos\`, region selection, or calling a deploy API.
- Missing or empty \`~/.sealos/auth.json\` is **not** a valid reason to skip template generation.
- Do **not** stop after image push or JSON artifacts alone. Do **not** treat "template deploy" or \`deploy-template.mjs\` as prerequisites for writing \`index.yaml\`.
- Actual Sealos deployment is **out of scope** for this benchmark; only produce the template file on disk.

**Private GHCR images must be pullable from the template:**
- Images pushed during this run (for example \`ghcr.io/<github-user>/<repo>:<tag>\` in \`originImageName\`) are **usually private**. Do **not** ship a template that references such an image without registry pull credentials.
- After Phase 5 writes \`.sealos/template/index.yaml\`, patch GHCR pull auth **before** you finish. The sandbox already has \`GITHUB_TOKEN\` injected — use that token as the user's GitHub credential for image pull.
- **Preferred:** if the installed \`sealos-deploy\` skill provides it, run:
  \`node "<SKILL_DIR>/scripts/patch-template-pull-secret.mjs" --template "$WORK_DIR/.sealos/template/index.yaml" --build-result "$WORK_DIR/.sealos/build-result.json" --token-env GITHUB_TOKEN\`
- **Required end state in \`index.yaml\`:** a \`kubernetes.io/dockerconfigjson\` \`Secret\` named \`\${{ defaults.app_name }}\` (built from GitHub \`/user\` login + \`GITHUB_TOKEN\`) **and** matching \`imagePullSecrets\` on managed \`Deployment\`/\`StatefulSet\` documents. Referencing \`imagePullSecrets\` without the Secret document is invalid.
- Skip pull-credential patching only when the target image is **verified public** (anonymous GHCR manifest pull succeeds) and it is **not** a fresh build to a user/org GHCR namespace.
- Do **not** rely on making the GHCR package public as the default fix for this benchmark.

At the start of the run, before any artifact generation:
1. **BuildKit / buildctl** — Verify \`command -v buildctl\` and \`buildctl --version\`. Local \`buildkitd\` on \`/run/buildkit/buildkitd.sock\` is usually **not** running; that alone is not a failure. This Devbox has cluster access (\`kubectl\`): use the sandbox skill's \`k8s-buildkit-job\` flow to create a BuildKit Service, then confirm reachability with \`buildctl --addr tcp://<service-host>:1234 debug workers\`. Stop only if \`buildctl\` is missing or the provisioned remote builder is still unreachable after following the skill.
2. **WORK_DIR writability** — \`WORK_DIR\` is \`/home/devbox/workspace\` (bootstrap cloned the repo and fixed ownership for user \`devbox\`). Verify it is writable with a real temp-file create/write/delete test as the same user the agent uses. If it is not writable, try non-destructive fixes (\`chmod u+rwx\`, writable subdir under \`$HOME\`, re-export \`WORK_DIR\`) and re-test. **Whenever this check fails or you apply a fix, document the problem, what you tried, and the final working directory in your output.**

Proceed automatically through all phases without stopping to ask for confirmation or user input. Before finishing, confirm \`.sealos/template/index.yaml\` exists under \`WORK_DIR\`, includes GHCR pull credentials when required above, and run the skill's artifact validation if available.

If anything fails, explain the failure clearly with actionable next steps.`;
}
