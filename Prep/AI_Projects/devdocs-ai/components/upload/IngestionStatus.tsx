import type { ReactNode } from "react";
import type { IngestionResult } from "@/types";
import Badge from "@/components/ui/Badge";

interface IngestionStatusProps {
  isUploading: boolean;
  result: IngestionResult | null;
  error: string | null;
}

export default function IngestionStatus({ isUploading, result, error }: IngestionStatusProps) {
  if (isUploading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <svg className="h-5 w-5 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-slate-200">Processing document…</p>
          <p className="text-xs text-slate-500">Chunking text and generating embeddings</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-400">⚠️</span>
          <p className="text-sm font-medium text-red-400">Ingestion Failed</p>
        </div>
        <p className="text-xs text-red-300/70">{error}</p>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          <p className="text-sm font-medium text-emerald-400">Document Ingested Successfully</p>
        </div>
        <div className="space-y-1.5 text-xs text-slate-400">
          <Row label="Title" value={result.document.title} />
          <Row label="Source" value={result.document.source} />
          <Row
            label="Type"
            value={<Badge variant="sky">{result.document.type.toUpperCase()}</Badge>}
          />
          <Row label="Chunks created" value={String(result.chunksUploaded)} />
        </div>
        <a
          href="/chat"
          className="mt-2 flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"
        >
          <span>→</span> Go to chat and start asking questions
        </a>
      </div>
    );
  }

  return null;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-slate-600">{label}:</span>
      <span className="text-slate-300 truncate">{value}</span>
    </div>
  );
}
