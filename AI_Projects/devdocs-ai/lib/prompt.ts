import type { SourceChunk } from "@/types";
import { truncateToTokens } from "@/utils/tokens";

const SYSTEM_PROMPT = `You are DevDocs AI — an expert technical assistant that answers questions strictly based on the provided documentation context.

Guidelines:
- Answer ONLY using the provided context. Do not use prior training knowledge.
- If the context does not contain enough information to answer, say: "I couldn't find relevant information in the documentation for this question."
- Be precise, concise, and use technical language appropriate for developers.
- Format code examples with proper markdown code blocks and language identifiers.
- When listing steps or options, use markdown lists.
- Always cite your sources by referencing the document names in your answer.`;

/**
 * Build the prompt for Hyperspace AI (Anthropic format).
 *
 * Anthropic API requires:
 *   - system: string  (top-level, NOT inside messages array)
 *   - messages: Array<{ role: "user" | "assistant"; content: string }>
 *
 * Returns { system, messages } ready to pass directly to Hyperspace.
 */
export function buildPromptMessages(
  query: string,
  sources: SourceChunk[],
  history: Array<{ role: "user" | "assistant"; content: string }>
): { system: string; messages: Array<{ role: "user" | "assistant"; content: string }> } {
  const contextBlock = buildContextBlock(sources);
  const system = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

  // Keep last 6 turns (3 user + 3 assistant) to avoid context overflow
  const trimmedHistory = history.slice(-6);

  return {
    system,
    messages: [...trimmedHistory, { role: "user", content: query }],
  };
}

/** Format retrieved chunks into a numbered context block */
function buildContextBlock(sources: SourceChunk[]): string {
  if (sources.length === 0) {
    return "No relevant documentation found.";
  }

  const lines = ["--- DOCUMENTATION CONTEXT ---\n"];

  sources.forEach((chunk, i) => {
    // Limit each chunk to ~500 tokens to avoid flooding the context
    const text = truncateToTokens(chunk.text, 500);
    lines.push(`[${i + 1}] Source: "${chunk.title}" (${chunk.source})`);
    lines.push(text);
    lines.push("");
  });

  lines.push("--- END OF CONTEXT ---");
  return lines.join("\n");
}
