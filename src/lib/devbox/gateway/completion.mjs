const SUCCESS_TURN_STATUSES = new Set([
  "completed",
  "succeeded",
  "interrupted",
]);

const MODEL_CAPACITY_PATTERNS = [
  /selected model is at capacity/i,
  /model is at capacity/i,
  /please try a different model/i,
];

function collectSessionStateText(state) {
  const parts = [];
  for (const entry of state?.transcript ?? []) {
    if (typeof entry?.text === "string") {
      parts.push(entry.text);
    }
  }
  for (const event of state?.recentEvents ?? []) {
    if (typeof event?.textPreview === "string") {
      parts.push(event.textPreview);
    }
  }
  return parts.join("\n");
}

export function isTurnSuccess(lastTurnStatus) {
  return SUCCESS_TURN_STATUSES.has(lastTurnStatus);
}

export function mapTurnToBenchmarkStatus(lastTurnStatus, options = {}) {
  if (options.gatewayModelCapacityFailure) {
    return "infra_failed";
  }
  return isTurnSuccess(lastTurnStatus) ? "success" : "failed";
}

export function isGatewayModelCapacityFailure(sessionState) {
  const text = collectSessionStateText(sessionState);
  return MODEL_CAPACITY_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildTurnFailureMessage(lastTurnStatus) {
  return `Codex gateway turn failed (lastTurnStatus=${lastTurnStatus ?? "unknown"})`;
}
