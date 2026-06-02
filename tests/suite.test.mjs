import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runFixtureSuite } from "../src/run-suite.mjs";
import { validateWorkspace } from "../src/validate-workspace.mjs";
import { REPO_ROOT } from "../src/lib/skill-path.mjs";
import path from "node:path";

describe("fixture suite", () => {
  it("passes contract validation for all fixtures", async () => {
    const report = await runFixtureSuite({ profile: "contract" });
    assert.equal(report.valid, true, JSON.stringify(report, null, 2));
    assert.ok(report.cases.length >= 2);
  });

  it("succeeded-minimal expects deployable response", async () => {
    const workspace = path.join(REPO_ROOT, "fixtures", "succeeded-minimal");
    const report = await validateWorkspace(workspace, { profile: "contract" });
    assert.equal(report.valid, true, JSON.stringify(report.results, null, 2));
    const output = report.results.find((entry) => entry.file?.includes("deployment-output"));
    assert.ok(output?.valid);
  });

  it("failed-unsupported rejects CLI repos", async () => {
    const workspace = path.join(REPO_ROOT, "fixtures", "failed-unsupported");
    const report = await validateWorkspace(workspace, { profile: "contract" });
    assert.equal(report.valid, true, JSON.stringify(report.results, null, 2));
  });
});
