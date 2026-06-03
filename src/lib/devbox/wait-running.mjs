import { DevboxApiError, getDevbox, resumeDevbox } from "./client.mjs";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until Devbox phase is Running; resume if paused/stopped when API allows.
 */
export async function waitForRunningDevbox(name, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const startedAt = Date.now();

  while (true) {
    let response;

    try {
      response = await getDevbox(name);
    } catch (error) {
      if (error instanceof DevboxApiError && error.status === 404) {
        throw new Error(`Devbox not found: ${name}`);
      }
      throw error;
    }

    const phase = response.data?.state?.phase;

    if (phase === "Running") {
      return response.data;
    }

    if (phase === "Paused" || phase === "Stopped") {
      try {
        await resumeDevbox(name);
      } catch (error) {
        if (!(error instanceof DevboxApiError && error.status === 409)) {
          throw error;
        }
      }
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out waiting for Devbox ${name} to be Running (last phase: ${phase ?? "unknown"})`,
      );
    }

    await sleep(pollMs);
  }
}
