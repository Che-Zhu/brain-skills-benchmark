import assert from "node:assert/strict";
import test from "node:test";
import { run as markStarted } from "./mark-started.mjs";

test("clears template and dryRun state when starting a new repo", async () => {
  const ctx = {
    queue: [{ full_name: "example/next" }],
    templateYamlPath: "/old/template/index.yaml",
    templateYamlLocalPath: "/local/old/index.yaml",
    templateYamlContent: "old yaml",
    templateYaml: { old: true },
    templateYamlError: "old template error",
    templateDryRun: { instanceName: "old-instance" },
    templateDryRunStatus: "success",
    templateDryRunError: "old dryrun error",
  };

  await markStarted(ctx);

  assert.equal(ctx.templateYamlPath, null);
  assert.equal(ctx.templateYamlLocalPath, null);
  assert.equal(ctx.templateYamlContent, null);
  assert.equal(ctx.templateYaml, null);
  assert.equal(ctx.templateYamlError, null);
  assert.equal(ctx.templateDryRun, null);
  assert.equal(ctx.templateDryRunStatus, null);
  assert.equal(ctx.templateDryRunError, null);
});
