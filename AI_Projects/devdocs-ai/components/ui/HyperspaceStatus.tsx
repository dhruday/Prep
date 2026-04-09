"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

interface StatusData {
  ok: boolean;
  model: string;
}

/**
 * Polls /api/status every 15s to show whether Hyperspace AI is reachable.
 * Shows a green dot when online, red when offline.
 */
export default function HyperspaceStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ ok: false, model: "unknown" });
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
        status.ok
          ? "border-emerald-800 bg-emerald-950/40 text-emerald-400"
          : "border-red-900 bg-red-950/40 text-red-400"
      )}
      title={status.ok ? "Hyperspace AI is online" : "Hyperspace AI is offline — start it on port 6655"}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status.ok ? "bg-emerald-400 animate-pulse" : "bg-red-500"
        )}
      />
      {status.ok ? status.model : "Hyperspace offline"}
    </div>
  );
}
