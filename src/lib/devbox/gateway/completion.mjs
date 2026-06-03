const SUCCESS_TURN_STATUSES = new Set([
  "completed",
  "succeeded",
  "interrupted",
]);

export function isTurnSuccess(lastTurnStatus) {
  return SUCCESS_TURN_STATUSES.has(lastTurnStatus);
}

export function mapTurnToBenchmarkStatus(lastTurnStatus) {
  return isTurnSuccess(lastTurnStatus) ? "success" : "failed";
}

export function buildTurnFailureMessage(lastTurnStatus) {
  return `Codex gateway turn failed (lastTurnStatus=${lastTurnStatus ?? "unknown"})`;
}
