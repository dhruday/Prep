"use client";

import { useState, useCallback } from "react";
import type { IngestionResult } from "@/types";

interface UseUploadReturn {
  isUploading: boolean;
  result: IngestionResult | null;
  error: string | null;
  uploadFile: (file: File) => Promise<void>;
  uploadUrl: (url: string) => Promise<void>;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      setResult(data as IngestionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadUrl = useCallback(async (url: string) => {
    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Ingestion failed (${res.status})`);
      }

      setResult(data as IngestionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isUploading, result, error, uploadFile, uploadUrl, reset };
}
