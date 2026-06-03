import { getCodexGatewayModel } from "../config.mjs";
import {
  createCodexGatewaySession,
  waitForCodexGatewayReady,
} from "./client.mjs";

export async function ensureGatewaySession(gatewayUrl, authToken) {
  await waitForCodexGatewayReady(gatewayUrl, authToken);

  const model = getCodexGatewayModel();
  const session = await createCodexGatewaySession(
    gatewayUrl,
    model ? { model } : {},
    authToken,
  );

  if (!session?.sessionId) {
    throw new Error("Codex gateway did not return sessionId");
  }

  return session;
}
