"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, SourceChunk } from "@/types";

// Fallback UUID for client-side (crypto.randomUUID is available in modern browsers)
function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string>(uuid());
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: uuid(),
      role: "user",
      content: text.trim(),
      createdAt: new Date(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMsg]);

    // Placeholder for the streaming assistant message
    const assistantId = uuid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      sources: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: conversationIdRef.current,
          history: [],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: sources")) continue;
          if (line.startsWith("event: done")) continue;

          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const parsed = JSON.parse(rawData);

              // Sources event
              if (parsed.sources !== undefined) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, sources: parsed.sources } : m
                  )
                );
                if (parsed.conversationId) {
                  conversationIdRef.current = parsed.conversationId;
                }
                continue;
              }

              // Token delta
              if (parsed.token !== undefined) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.token }
                      : m
                  )
                );
              }
            } catch {
              // Malformed SSE chunk — skip
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User cancelled — remove the empty assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      // Remove the empty assistant placeholder
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading]);

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
    conversationIdRef.current = uuid();
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
