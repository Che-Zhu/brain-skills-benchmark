import assert from "node:assert/strict";
import test from "node:test";
import {
  isGatewayModelCapacityFailure,
  mapTurnToBenchmarkStatus,
} from "./completion.mjs";

test("detects gateway model capacity failures from transcript and events", () => {
  const sessionState = {
    transcript: [
      { role: "user", text: "run benchmark" },
      {
        role: "system",
        text: "Selected model is at capacity. Please try a different model.",
      },
    ],
    recentEvents: [
      {
        textPreview:
          "Selected model is at capacity. Please try a different model.",
      },
    ],
  };

  assert.equal(isGatewayModelCapacityFailure(sessionState), true);
});

test("does not treat ordinary gateway failures as model capacity", () => {
  const sessionState = {
    transcript: [
      {
        role: "assistant",
        text: "The build failed because kaniko could not pull the base image.",
      },
    ],
    recentEvents: [{ textPreview: "lastTurnStatus=failed" }],
  };

  assert.equal(isGatewayModelCapacityFailure(sessionState), false);
});

test("maps model capacity failures to infra_failed", () => {
  assert.equal(
    mapTurnToBenchmarkStatus("failed", { gatewayModelCapacityFailure: true }),
    "infra_failed",
  );
});
