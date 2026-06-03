import { DevboxApiError, getDevbox } from "./client.mjs";

const SECRET_READY_MAX_RETRIES = 3;
const SECRET_READY_RETRY_DELAY_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDevboxSecretPendingError(error) {
  return (
    error instanceof DevboxApiError &&
    error.status >= 500 &&
    error.message.includes("get devbox private key failed") &&
    error.message.includes("not found")
  );
}

export async function getDevboxWithSecretRetry(name) {
  let attempt = 0;

  while (true) {
    try {
      return await getDevbox(name);
    } catch (error) {
      if (!isDevboxSecretPendingError(error) || attempt >= SECRET_READY_MAX_RETRIES) {
        throw error;
      }
      attempt += 1;
      await sleep(SECRET_READY_RETRY_DELAY_MS);
    }
  }
}
