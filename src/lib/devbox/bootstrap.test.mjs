import assert from "node:assert/strict";
import test from "node:test";

import { buildSkillsAddCommand } from "./bootstrap.mjs";

test("uses skills CLI fragment refs for GitHub tree URLs", () => {
  const command = buildSkillsAddCommand(
    "https://github.com/zjy365/sealos-skills/tree/sandbox-skill-lite-preview",
  );

  assert.equal(
    command,
    "npx --yes skills add 'https://github.com/zjy365/sealos-skills#sandbox-skill-lite-preview' -y",
  );
  assert.doesNotMatch(command, /--ref/);
});

test("preserves branch names containing slashes in fragment refs", () => {
  const command = buildSkillsAddCommand(
    "https://github.com/zjy365/sealos-skills/tree/feat/phase2-detect-priority",
  );

  assert.equal(
    command,
    "npx --yes skills add 'https://github.com/zjy365/sealos-skills#feat/phase2-detect-priority' -y",
  );
});
