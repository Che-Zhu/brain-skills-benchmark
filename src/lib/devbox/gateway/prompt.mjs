import { DEVBOX_AGENT_WORK_DIR } from "../template-yaml-path.mjs";

function optionalLine(label, value) {
  const text = value == null ? "" : String(value).trim();
  return text ? `${label}: ${text}` : null;
}

export function buildBenchmarkSkillPrompt(ctx) {
  const repo = ctx.current?.full_name ?? "unknown";
  const branch = ctx.current?.branch ?? "default";
  const namespace = ctx.runtimeNamespace;
  const projectName = ctx.projectName;
  const userPrompt = ctx.prompt ?? ctx.userPrompt;

  const optionalContext = [
    optionalLine("Namespace", namespace),
    optionalLine("Project", projectName),
    optionalLine("User request", userPrompt),
  ]
    .filter(Boolean)
    .join("\n");

  return `You are running inside a SealAI deployment Devbox.
Work in ${DEVBOX_AGENT_WORK_DIR}.
The workspace contains the cloned GitHub repository.
Repository: ${repo}
Branch: ${branch}

Run the sealos-deploy skill to completion:
/sealos-deploy using ${DEVBOX_AGENT_WORK_DIR} as the deployment workspace.

Proceed automatically through all phases without stopping to ask for confirmation or input.
Do not replace the skill workflow with your own ad-hoc deployment format.
Use the skill's image-resolution decision: if it resolves mode "reuse-image", skip kaniko and write the skipped build result from the reusable image; only create a kaniko Job when the skill resolves mode "build-required".
If a build is required, read ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-runtime.json when the installed skill creates it and use its DevBox S3 contract to create the kaniko Job.
Do not invent S3 endpoints or inline DevBox secret values; use secretKeyRef values from build-runtime.json when that file is present.
If the installed skill still uses its older build-request.json contract instead of build-runtime.json, follow that installed skill contract without inventing an alternate deployment format.

When complete, ensure these output files exist:
- ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-runtime.json when the source needs an image build and the installed skill defines that file
- ${DEVBOX_AGENT_WORK_DIR}/.sealos/delivery-manifest.json
- ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-result.json
- ${DEVBOX_AGENT_WORK_DIR}/.sealos/template/index.yaml

The final YAML must be an app.sealos.io/v1 Template multi-document artifact, not a Brain AP YAML.
When the image build succeeds, write ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-result.json with status "succeeded", image.image_ref, and image.digest.
Use only these build-result status values: "succeeded", "failed", or "skipped".
If the image build fails, write ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-result.json with status "failed" and an actionable error field.
Before ending, verify with: test -s ${DEVBOX_AGENT_WORK_DIR}/.sealos/delivery-manifest.json && test -s ${DEVBOX_AGENT_WORK_DIR}/.sealos/build-result.json && test -s ${DEVBOX_AGENT_WORK_DIR}/.sealos/template/index.yaml${optionalContext ? `\n\n${optionalContext}` : ""}`;
}
