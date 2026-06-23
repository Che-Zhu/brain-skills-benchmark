import assert from "node:assert/strict";
import test from "node:test";
import { buildBenchmarkSkillPrompt } from "./prompt.mjs";

test("renders benchmark prompt with workspace path and reuse-image guardrails", () => {
  const prompt = buildBenchmarkSkillPrompt({
    current: { full_name: "CorentinTh/it-tools" },
    runtimeNamespace: "ns-test",
  });

  assert.match(prompt, /Work in \/home\/devbox\/workspace\./);
  assert.match(prompt, /Repository: CorentinTh\/it-tools/);
  assert.match(prompt, /Branch: default/);
  assert.match(prompt, /Namespace: ns-test/);
  assert.match(prompt, /mode "reuse-image", skip kaniko/);
  assert.match(prompt, /only create a kaniko Job when the skill resolves mode "build-required"/);
  assert.match(prompt, /test -s \/home\/devbox\/workspace\/\.sealos\/delivery-manifest\.json/);
  assert.doesNotMatch(prompt, /Project:/);
  assert.doesNotMatch(prompt, /User request:/);
  assert.doesNotMatch(prompt, /\/home\/devbox\/project/);
});

test("renders optional project and user request only when present", () => {
  const prompt = buildBenchmarkSkillPrompt({
    current: { full_name: "owner/repo", branch: "feature-a" },
    projectName: "demo-project",
    prompt: "deploy this with the normal skill flow",
  });

  assert.match(prompt, /Branch: feature-a/);
  assert.match(prompt, /Project: demo-project/);
  assert.match(prompt, /User request: deploy this with the normal skill flow/);
});
