"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";
import { cn } from "@/utils/cn";
import SourcesPanel from "./SourcesPanel";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          isUser
            ? "bg-sky-600 text-white"
            : "bg-slate-700 text-slate-200"
        )}
      >
        {isUser ? "U" : "🤖"}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-sky-600 text-white"
              : "rounded-tl-sm bg-slate-800 text-slate-100"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children }) {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <pre className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-4">
                          <code className={cn("text-xs text-slate-200", className)}>
                            {children}
                          </code>
                        </pre>
                      );
                    }
                    return (
                      <code className="rounded bg-slate-700 px-1 py-0.5 text-xs text-sky-400">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content || " "}
              </ReactMarkdown>
              {/* Blinking cursor while streaming */}
              {!message.content && (
                <span className="inline-block h-4 w-2 animate-pulse bg-slate-400" />
              )}
            </div>
          )}
        </div>

        {/* Sources panel — only for assistant messages with sources */}
        {!isUser && message.sources && message.sources.length > 0 && message.content && (
          <SourcesPanel sources={message.sources} />
        )}

        {/* Timestamp — suppressHydrationWarning because Date.toLocaleTimeString differs between SSR and CSR */}
        <p
          suppressHydrationWarning
          className={cn("text-xs text-slate-600", isUser ? "text-right" : "text-left")}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
