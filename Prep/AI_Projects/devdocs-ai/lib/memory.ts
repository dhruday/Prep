import type { ChatMessage } from "@/types";

/**
 * In-memory conversation store.
 * In production, replace with Redis/Vercel KV for multi-instance support.
 *
 * Key: conversationId
 * Value: array of chat messages (capped at MAX_MESSAGES)
 */
const store = new Map<string, ChatMessage[]>();
const MAX_MESSAGES = 20; // keep last 20 messages per conversation

export function getHistory(conversationId: string): ChatMessage[] {
  return store.get(conversationId) ?? [];
}

export function addMessage(conversationId: string, message: ChatMessage): void {
  const history = store.get(conversationId) ?? [];
  history.push(message);

  // Trim to max length, always keeping the most recent messages
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }

  store.set(conversationId, history);
}

export function clearHistory(conversationId: string): void {
  store.delete(conversationId);
}

/** Return only the role/content pairs needed for the OpenAI API */
export function getApiHistory(
  conversationId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  return getHistory(conversationId)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}
