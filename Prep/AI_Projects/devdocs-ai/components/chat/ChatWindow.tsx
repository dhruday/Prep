"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ErrorBanner from "@/components/ui/ErrorBanner";

const WELCOME_MESSAGE = `👋 Hi! I'm **DevDocs AI** — I can answer questions about your technical documentation.

**To get started:**
- Upload your docs via the **Add Docs** button in the top right
- Then ask me anything about the content

*Example: "How do I configure authentication?" or "What are the API rate limits?"*`;

// Stable date for the static welcome message — avoids SSR/CSR hydration mismatch
const WELCOME_DATE = new Date(0);

export default function ChatWindow() {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={containerRef}
        className="chat-scroll flex-1 overflow-y-auto px-4 py-6 space-y-1"
      >
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl">
            <MessageBubble
              message={{
                id: "welcome",
                role: "assistant",
                content: WELCOME_MESSAGE,
                createdAt: WELCOME_DATE,
              }}
            />
          </div>
        )}

        {/* Message list */}
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator while waiting for first token */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            onClear={messages.length > 0 ? clearChat : undefined}
          />
          <p className="mt-2 text-center text-xs text-slate-600">
            Answers are based only on uploaded documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
