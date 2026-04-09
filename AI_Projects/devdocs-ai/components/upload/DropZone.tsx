"use client";

import { useState, useCallback, type DragEvent } from "react";
import { useUpload } from "@/hooks/useUpload";
import IngestionStatus from "./IngestionStatus";
import { cn } from "@/utils/cn";

const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".mdx", ".txt"];
const ACCEPTED_MIME = ["application/pdf", "text/markdown", "text/plain"];

export default function DropZone() {
  const { isUploading, result, error, uploadFile, uploadUrl, reset } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [tab, setTab] = useState<"file" | "url">("file");

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const name = file.name.toLowerCase();
      const isValid = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
      if (!isValid) {
        alert("Unsupported file type. Please upload a PDF, Markdown, or text file.");
        return;
      }
      reset();
      uploadFile(file);
    },
    [uploadFile, reset]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    try {
      new URL(url); // validate URL format
    } catch {
      alert("Please enter a valid URL (e.g. https://docs.example.com/page)");
      return;
    }

    reset();
    await uploadUrl(url);
    setUrlInput("");
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-lg border border-slate-700 p-1 bg-slate-800/50">
        {(["file", "url"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition",
              tab === t
                ? "bg-slate-700 text-slate-100 shadow"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {t === "file" ? "📄 File Upload" : "🌐 Web URL"}
          </button>
        ))}
      </div>

      {tab === "file" ? (
        <>
          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition cursor-pointer",
              isDragging
                ? "border-sky-500 bg-sky-950/30"
                : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"
            )}
          >
            <div className="text-4xl">📂</div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">
                Drag & drop your document here
              </p>
              <p className="text-xs text-slate-500 mt-1">or click to browse</p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept={ACCEPTED_MIME.join(",")}
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={isUploading}
              />
              <span className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition">
                Browse Files
              </span>
            </label>
            <p className="text-xs text-slate-600">
              PDF, Markdown (.md, .mdx), TXT — max 10MB
            </p>
          </div>
        </>
      ) : (
        /* URL input */
        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Web page URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.example.com/guide"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-600 transition"
              disabled={isUploading}
            />
          </div>
          <button
            type="submit"
            disabled={isUploading || !urlInput.trim()}
            className={cn(
              "w-full rounded-lg py-2 text-sm font-medium transition",
              isUploading || !urlInput.trim()
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-sky-600 text-white hover:bg-sky-500"
            )}
          >
            {isUploading ? "Fetching & Processing…" : "Ingest URL"}
          </button>
        </form>
      )}

      {/* Status feedback */}
      {(isUploading || result || error) && (
        <IngestionStatus isUploading={isUploading} result={result} error={error} />
      )}
    </div>
  );
}
