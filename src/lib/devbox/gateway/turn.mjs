import { getCodexGatewaySessionState, sendCodexGatewayTurn } from "./client.mjs";
import {
  buildTurnFailureMessage,
  isTurnSuccess,
  mapTurnToBenchmarkStatus,
} from "./completion.mjs";
import { buildBenchmarkSkillPrompt } from "./prompt.mjs";
import { ensureGatewaySession } from "./session.mjs";

const DEFAULT_POLL_MS = 10_000;
const DEFAULT_TURN_TIMEOUT_MS = 30 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTurnTimeoutMs() {
  const raw = process.env.BENCHMARK_TURN_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_TURN_TIMEOUT_MS;
  }
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 1) {
    throw new Error("BENCHMARK_TURN_TIMEOUT_MS must be a positive integer");
  }
  return ms;
}

function getTurnPollMs() {
  const raw = process.env.BENCHMARK_TURN_POLL_MS?.trim();
  if (!raw) {
    return DEFAULT_POLL_MS;
  }
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 1) {
    throw new Error("BENCHMARK_TURN_POLL_MS must be a positive integer");
  }
  return ms;
}

async function waitForTurnTerminal(
  gatewayUrl,
  sessionId,
  authToken,
  timeoutMs,
  pollMs,
) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;

  while (Date.now() < deadline) {
    const session = await getCodexGatewaySessionState(
      gatewayUrl,
      sessionId,
      authToken,
    );
    const { activeTurn, lastTurnStatus } = session.state ?? {};
    lastStatus = lastTurnStatus ?? null;

    if (!activeTurn && lastTurnStatus) {
      return session;
    }

    console.info(
      `[gateway] turn polling activeTurn=${Boolean(activeTurn)} lastTurnStatus=${lastTurnStatus ?? "none"}`,
    );
    await sleep(pollMs);
  }

  throw new Error(
    `Timed out waiting for gateway turn (lastTurnStatus=${lastStatus ?? "none"})`,
  );
}

export async function runSkillTurn(ctx) {
  if (!ctx.gatewayUrl) {
    throw new Error("ctx.gatewayUrl is required before run-skill");
  }
  if (!ctx.workspaceReady) {
    throw new Error("ctx.workspaceReady must be true before run-skill");
  }

  const gatewayUrl = ctx.gatewayUrl;
  const authToken = ctx.gatewayAuthToken ?? null;
  const fullName = ctx.current.full_name;

  console.info(`[gateway] session for ${fullName}`);
  const session = await ensureGatewaySession(gatewayUrl, authToken);
  ctx.gatewaySessionId = session.sessionId;
  console.info(`[gateway] session ${ctx.gatewaySessionId}`);

  const prompt = buildBenchmarkSkillPrompt(ctx);
  const pollMs = getTurnPollMs();
  console.info(`[gateway] turn start ${fullName} (poll every ${pollMs / 1000}s)`);
  await sendCodexGatewayTurn(
    gatewayUrl,
    session.sessionId,
    { prompt },
    authToken,
  );

  const timeoutMs = getTurnTimeoutMs();
  const finalSession = await waitForTurnTerminal(
    gatewayUrl,
    session.sessionId,
    authToken,
    timeoutMs,
    pollMs,
  );

  const lastTurnStatus = finalSession.state?.lastTurnStatus ?? null;
  console.info(
    `[gateway] turn done ${fullName} lastTurnStatus=${lastTurnStatus}`,
  );

  ctx.status = mapTurnToBenchmarkStatus(lastTurnStatus);
  if (isTurnSuccess(lastTurnStatus)) {
    ctx.error = null;
  } else {
    ctx.error = buildTurnFailureMessage(lastTurnStatus);
  }
}
