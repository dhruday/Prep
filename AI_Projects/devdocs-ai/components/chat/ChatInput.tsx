"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/utils/cn";

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  isLoading: boolean;
  onClear?: () => void;
}

export default function ChatInput({ onSend, isLoading, onClear }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    setValue("");
    await onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, newline on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 focus-within:border-sky-600 transition-colors">
      {/* Clear chat button */}
      {onClear && (
        <button
          onClick={onClear}
          title="Clear chat"
          className="mb-0.5 shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your documentation…"
        rows={1}
        className={cn(
          "flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none",
          "max-h-[200px] overflow-y-auto"
        )}
        disabled={isLoading}
        autoFocus
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!value.trim() || isLoading}
        className={cn(
          "mb-0.5 shrink-0 rounded-xl p-2 transition",
          value.trim() && !isLoading
            ? "bg-sky-600 text-white hover:bg-sky-500"
            : "bg-slate-700 text-slate-500 cursor-not-allowed"
        )}
        aria-label="Send message"
      >
        {isLoading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}
