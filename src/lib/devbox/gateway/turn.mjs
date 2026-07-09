import { getCodexGatewaySessionState, sendCodexGatewayTurn } from "./client.mjs";
import {
  buildTurnFailureMessage,
  isGatewayModelCapacityFailure,
  isTurnSuccess,
  mapTurnToBenchmarkStatus,
} from "./completion.mjs";
import { buildBenchmarkSkillPrompt } from "./prompt.mjs";
import { ensureGatewaySession } from "./session.mjs";
import {
  getLatestAssistantSnippetText,
  logGatewayTranscript,
  logLatestAssistantSnippet,
} from "./transcript-log.mjs";

const DEFAULT_POLL_MS = 10_000;
const DEFAULT_TURN_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_CAPACITY_RETRY_LIMIT = 2;
const DEFAULT_CAPACITY_RETRY_DELAY_MS = 60_000;

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

function getCapacityRetryLimit() {
  const raw = process.env.BENCHMARK_GATEWAY_CAPACITY_RETRIES?.trim();
  if (!raw) {
    return DEFAULT_CAPACITY_RETRY_LIMIT;
  }
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error(
      "BENCHMARK_GATEWAY_CAPACITY_RETRIES must be a non-negative integer",
    );
  }
  return limit;
}

function getCapacityRetryDelayMs() {
  const raw = process.env.BENCHMARK_GATEWAY_CAPACITY_RETRY_DELAY_MS?.trim();
  if (!raw) {
    return DEFAULT_CAPACITY_RETRY_DELAY_MS;
  }
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms < 1) {
    throw new Error(
      "BENCHMARK_GATEWAY_CAPACITY_RETRY_DELAY_MS must be a positive integer",
    );
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
  let lastAssistantSnippet = null;

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

    const snippet = getLatestAssistantSnippetText(session.state?.transcript);
    if (snippet !== lastAssistantSnippet) {
      if (snippet) {
        logLatestAssistantSnippet(session.state?.transcript, {
          prefix: "turn polling",
        });
      } else if (lastAssistantSnippet === null) {
        console.info("[gateway] turn polling: (no assistant message yet)");
      }
      lastAssistantSnippet = snippet;
    }

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
  const prompt = buildBenchmarkSkillPrompt(ctx);
  const pollMs = getTurnPollMs();
  const timeoutMs = getTurnTimeoutMs();
  const capacityRetryLimit = getCapacityRetryLimit();
  const capacityRetryDelayMs = getCapacityRetryDelayMs();
  let finalSession = null;
  let capacityFailure = false;

  for (let attempt = 0; attempt <= capacityRetryLimit; attempt += 1) {
    if (attempt > 0) {
      console.info(
        `[gateway] retrying ${fullName} after model capacity failure (${attempt}/${capacityRetryLimit})`,
      );
    }

    console.info(`[gateway] session for ${fullName}`);
    const session = await ensureGatewaySession(gatewayUrl, authToken);
    ctx.gatewaySessionId = session.sessionId;
    console.info(`[gateway] session ${ctx.gatewaySessionId}`);

    console.info(
      `[gateway] turn start ${fullName} (poll every ${pollMs / 1000}s)`,
    );
    await sendCodexGatewayTurn(
      gatewayUrl,
      session.sessionId,
      { prompt },
      authToken,
    );

    finalSession = await waitForTurnTerminal(
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

    logGatewayTranscript(finalSession.state?.transcript, {
      label: `${fullName} ${lastTurnStatus ?? "unknown"}`,
    });

    if (finalSession.state?.recentEvents?.length) {
      console.info(
        `[gateway] recentEvents (${finalSession.state.recentEvents.length}):`,
      );
      for (const event of finalSession.state.recentEvents.slice(-10)) {
        console.info(
          `[gateway]   ${event.at ?? ""} ${event.type ?? ""} ${event.textPreview ?? ""}`.trim(),
        );
      }
    }

    capacityFailure =
      !isTurnSuccess(lastTurnStatus) &&
      isGatewayModelCapacityFailure(finalSession.state);
    if (!capacityFailure || attempt === capacityRetryLimit) {
      break;
    }
    await sleep(capacityRetryDelayMs);
  }

  const lastTurnStatus = finalSession?.state?.lastTurnStatus ?? null;
  ctx.gatewayLastTurnStatus = lastTurnStatus;
  ctx.gatewayThreadId = finalSession?.state?.threadId ?? null;
  ctx.gatewaySelectedModel = finalSession?.state?.selectedModel ?? null;

  ctx.status = mapTurnToBenchmarkStatus(lastTurnStatus, {
    gatewayModelCapacityFailure: capacityFailure,
  });
  if (isTurnSuccess(lastTurnStatus)) {
    ctx.error = null;
  } else if (capacityFailure) {
    ctx.error = `Codex gateway model capacity failure after ${capacityRetryLimit + 1} attempt(s)`;
  } else {
    ctx.error = buildTurnFailureMessage(lastTurnStatus);
  }
}
