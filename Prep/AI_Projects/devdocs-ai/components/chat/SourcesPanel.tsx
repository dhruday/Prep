"use client";

import { useState } from "react";
import type { SourceChunk } from "@/types";
import { cn } from "@/utils/cn";
import Badge from "@/components/ui/Badge";

interface SourcesPanelProps {
  sources: SourceChunk[];
}

export default function SourcesPanel({ sources }: SourcesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="w-full rounded-xl border border-slate-700 bg-slate-900/50 text-xs">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 transition"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <svg className="h-3.5 w-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {sources.length} source{sources.length > 1 ? "s" : ""}
        </span>
        <svg
          className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded source list */}
      {isOpen && (
        <div className="divide-y divide-slate-800 border-t border-slate-800">
          {sources.map((src, i) => (
            <div key={src.id} className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="sky">[{i + 1}]</Badge>
                <span className="font-medium text-slate-300 truncate max-w-[220px]" title={src.title}>
                  {src.title}
                </span>
                <Badge variant="slate">{(src.score * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-slate-500 line-clamp-2 leading-relaxed">
                {src.text.slice(0, 200)}…
              </p>
              {src.source.startsWith("http") ? (
                <a
                  href={src.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-500 hover:text-sky-400 truncate block max-w-full"
                >
                  {src.source}
                </a>
              ) : (
                <span className="text-slate-600 italic">{src.source}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
