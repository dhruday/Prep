/**
 * Hyperspace AI client — Anthropic API format, Edge-runtime compatible.
 *
 * Hyperspace runs locally and exposes the Anthropic Messages API at:
 *   http://localhost:6655/anthropic/v1/messages
 *
 * This file uses native fetch (no Node.js deps) so it works in both
 * Edge and Node runtimes.
 */

const HYPERSPACE_URL =
  process.env.HYPERSPACE_API_URL ?? "http://localhost:6655/anthropic/v1/messages";
const API_KEY = process.env.HYPERSPACE_API_KEY ?? "";
export const HYPERSPACE_MODEL =
  process.env.HYPERSPACE_MODEL ?? "anthropic--claude-4-sonnet";
const MAX_TOKENS = 4096;

export interface HyperspaceMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream a response from Hyperspace AI.
 * Returns a ReadableStream that emits text delta strings.
 * Uses Anthropic streaming SSE format (content_block_delta events).
 */
export async function streamHyperspace(
  system: string,
  messages: HyperspaceMessage[],
  signal?: AbortSignal
): Promise<ReadableStream<string>> {
  const response = await fetch(HYPERSPACE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: HYPERSPACE_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Hyperspace API error ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body from Hyperspace API");
  }

  const body = response.body;

  return new ReadableStream<string>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;

            try {
              const parsed = JSON.parse(raw);

              // Anthropic streaming: text delta
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta" &&
                parsed.delta.text
              ) {
                controller.enqueue(parsed.delta.text);
              }

              // Stream complete
              if (parsed.type === "message_stop") {
                controller.close();
                return;
              }

              // Error from Hyperspace
              if (parsed.type === "error") {
                throw new Error(parsed.error?.message ?? "Hyperspace stream error");
              }
            } catch (parseErr) {
              // Malformed SSE chunk — skip silently
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
        // Ensure controller is closed even if message_stop wasn't received
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
}

/**
 * Non-streaming single-turn query to Hyperspace AI.
 * Useful for testing or simple one-off calls.
 */
export async function queryHyperspace(
  system: string,
  messages: HyperspaceMessage[]
): Promise<string> {
  const response = await fetch(HYPERSPACE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: HYPERSPACE_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Hyperspace API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text ?? "";
}

/**
 * Check if Hyperspace is reachable — used by /api/status.
 */
export async function checkHyperspaceHealth(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:6655/", {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}
