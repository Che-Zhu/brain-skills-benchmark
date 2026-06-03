const MAX_ENTRY_CHARS = 8_000;
const DEFAULT_POLL_ASSISTANT_CHARS = 600;

function truncate(text, max = MAX_ENTRY_CHARS) {
  if (!text || text.length <= max) {
    return text ?? "";
  }
  return `${text.slice(0, max)}\n… [truncated ${text.length - max} chars]`;
}

/** Last assistant entry in transcript, or null. */
export function findLatestAssistantEntry(transcript) {
  if (!Array.isArray(transcript)) {
    return null;
  }
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const entry = transcript[index];
    if (entry?.role === "assistant") {
      return { index, entry };
    }
  }
  return null;
}

/** Normalized text of latest assistant message (for de-dupe across polls). */
export function getLatestAssistantSnippetText(transcript) {
  const found = findLatestAssistantEntry(transcript);
  if (!found) {
    return "";
  }
  return String(found.entry.text ?? "").trim();
}

/**
 * During turn polling: print latest assistant message (preview).
 * Returns snippet text so caller can skip identical reprints.
 */
export function logLatestAssistantSnippet(transcript, options = {}) {
  const prefix = options.prefix ?? "turn polling";
  const maxChars = options.maxChars ?? DEFAULT_POLL_ASSISTANT_CHARS;
  const found = findLatestAssistantEntry(transcript);

  if (!found) {
    console.info(`[gateway] ${prefix}: (no assistant message yet)`);
    return "";
  }

  const text = truncate(String(found.entry.text ?? "").trim(), maxChars);
  const status = found.entry.status ? ` status=${found.entry.status}` : "";

  console.info(`[gateway] ${prefix}: assistant[${found.index}]${status}`);
  if (text) {
    for (const line of text.split("\n")) {
      console.info(`[gateway]   ${line}`);
    }
  } else {
    console.info("[gateway]   (empty)");
  }

  return getLatestAssistantSnippetText(transcript);
}

/**
 * Print gateway transcript to stdout for benchmark debugging.
 */
export function logGatewayTranscript(transcript, options = {}) {
  const label = options.label ?? "turn";
  const entries = Array.isArray(transcript) ? transcript : [];

  console.info(`\n[gateway] ── ${label} transcript (${entries.length} entries) ──`);

  if (entries.length === 0) {
    console.info("[gateway] (empty)");
    console.info(`[gateway] ── end ${label} transcript ──\n`);
    return;
  }

  for (const [index, entry] of entries.entries()) {
    const role = entry?.role ?? "unknown";
    const status = entry?.status ? ` status=${entry.status}` : "";
    const source = entry?.source ? ` source=${entry.source}` : "";
    const text = truncate(String(entry?.text ?? "").trim());

    console.info(
      `[gateway] [${index}] ${role}${status}${source}`,
    );
    if (text) {
      for (const line of text.split("\n")) {
        console.info(`[gateway]   ${line}`);
      }
    } else {
      console.info("[gateway]   (no text)");
    }
  }

  console.info(`[gateway] ── end ${label} transcript ──\n`);
}
