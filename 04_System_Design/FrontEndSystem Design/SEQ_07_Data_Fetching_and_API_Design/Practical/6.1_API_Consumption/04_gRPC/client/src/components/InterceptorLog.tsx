/**
 * InterceptorLog.tsx — TAB 4: Live Interceptor Activity
 *
 * WHAT THIS TEACHES:
 *   • Interceptor execution ORDER: logging wraps auth wraps network
 *   • Auth interceptor injects Bearer token on EVERY call (unary + stream)
 *   • Token refresh flow: simulates Unauthenticated → new token → retry
 *   • TTFB vs total stream duration distinction in logging interceptor
 *
 * TRY IT:
 *   1. Click "Fetch User" → see request → token-added → response in the log
 *   2. Open DevTools → Application → LocalStorage
 *      Set key "grpc_auth_token" = "my-secret-token-123"
 *      Click "Fetch User" again → token injected with last 8 chars visible
 *   3. Delete the key → click Fetch → "anonymous request" logged
 *   4. Click "Start Metrics Stream" → watch rapid stream-event entries pile up
 *      Notice: each tick is logged as "stream-data", not a new request
 *   5. Stop the stream → confirm RST_STREAM cancellation in log
 *
 * INTERCEPTOR CHAIN REMINDER:
 *   transport.ts: [loggingInterceptor, authInterceptor]
 *   Execution order → loggingInterceptor( authInterceptor( networkCall ) )
 *   ─────────────────────────────────────────────────────────────────────────
 *   BEFORE: logging.request → auth.token-added → [network goes here]
 *   AFTER:  [response arrives] → auth.returns → logging.response (with timing)
 */

import { createPromiseClient } from "@connectrpc/connect";
import { useEffect, useRef, useState } from "react";
import { UserService } from "../generated/user_connect";
import { logStore, type LogEntry } from "../logStore";
import { transport } from "../transport";
import { s } from "../styles";

const client = createPromiseClient(UserService, transport);

const EVENT_COLORS: Record<LogEntry["event"], string> = {
  "request":       "#3b82f6",
  "response":      "#10b981",
  "token-added":   "#f59e0b",
  "token-refresh": "#ef4444",
  "stream-data":   "#8b5cf6",
  "error":         "#ef4444",
};

const EVENT_ICONS: Record<LogEntry["event"], string> = {
  "request":       "→",
  "response":      "←",
  "token-added":   "🔑",
  "token-refresh": "🔄",
  "stream-data":   "◦",
  "error":         "✗",
};

export function InterceptorLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Subscribe to logStore on mount
  useEffect(() => {
    return logStore.subscribe(setLogs);
  }, []);

  async function fetchUser() {
    try {
      await client.getUser({ id: "u003" });
    } catch {
      // error already logged by interceptor
    }
  }

  async function startMetricsStream() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsStreaming(true);

    try {
      const stream = client.getSystemStats(
        { intervalMs: 300, count: 20 },
        { signal: ctrl.signal },
      );
      for await (const stat of stream) {
        logStore.push({
          event: "stream-data",
          method: "GetSystemStats",
          detail: `CPU ${stat.cpuPercent.toFixed(1)}%  MEM ${stat.memPercent.toFixed(1)}%`,
        });
      }
    } catch {
      // cancelled or error — already logged
    } finally {
      setIsStreaming(false);
    }
  }

  function stopStream() {
    abortRef.current?.abort();
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div>
      <h2 style={s.sectionTitle}>Interceptor Activity Log</h2>

      <div style={s.conceptBox}>
        <strong>FAANG concept:</strong> Every gRPC call — unary and streaming — passes through
        the interceptor chain. Auth injects tokens; logging measures TTFB.
        In production: replace logStore with OpenTelemetry spans and auth with
        an OIDC token provider.
      </div>

      {/* ── Interceptor chain diagram ─────────────────────────────────────── */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, fontFamily: "monospace", color: "#94a3b8" }}>
        <div style={{ color: "#64748b", marginBottom: 4 }}>// transport.ts — chain applied outermost first</div>
        <div><span style={{ color: "#3b82f6" }}>loggingInterceptor</span>{"( "}<span style={{ color: "#f59e0b" }}>authInterceptor</span>{"( "}<span style={{ color: "#10b981" }}>networkCall</span>{" ) )"}</div>
        <div style={{ marginTop: 4, color: "#475569" }}>
          BEFORE request:  logging.start → auth.injectToken → [send to Envoy]
          <br />
          AFTER response:  [Envoy replies] → auth.returns → logging.end (records duration)
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={s.btn} onClick={fetchUser}>
          Fetch User (unary)
        </button>
        {isStreaming ? (
          <button style={{ ...s.btn, background: "#ef4444" }} onClick={stopStream}>
            ■ Stop Metrics Stream
          </button>
        ) : (
          <button style={{ ...s.btn, background: "#8b5cf6" }} onClick={startMetricsStream}>
            ▶ Start Metrics Stream (20 ticks)
          </button>
        )}
        <button style={{ ...s.btnSm, background: "#334155" }} onClick={logStore.clear}>
          Clear Log
        </button>
      </div>

      {/* ── Token tip ─────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 12, padding: "8px 12px", background: "#1e293b", borderRadius: 6 }}>
        💡 <strong>DevTools tip:</strong> Application → Local Storage → set{" "}
        <code style={{ color: "#f59e0b" }}>grpc_auth_token</code> = <code>"my-jwt-token"</code>{" "}
        to see token injection in the log below.
      </div>

      {/* ── Log entries ───────────────────────────────────────────────────── */}
      {logs.length === 0 ? (
        <div style={{ color: "#475569", textAlign: "center", padding: 40, fontSize: 14 }}>
          No interceptor events yet. Click a button above to trigger some.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 480, overflowY: "auto" }}>
          {logs.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 14px 110px auto auto",
                gap: 8,
                padding: "5px 10px",
                background: "#0f172a",
                borderRadius: 4,
                fontSize: 12,
                alignItems: "center",
                borderLeft: `2px solid ${EVENT_COLORS[entry.event]}`,
              }}
            >
              <span style={{ color: "#475569", fontFamily: "monospace" }}>{entry.timestamp}</span>
              <span style={{ color: EVENT_COLORS[entry.event] }}>{EVENT_ICONS[entry.event]}</span>
              <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{entry.method}</span>
              <span style={{ color: "#cbd5e1" }}>{entry.detail}</span>
              {entry.durationMs !== undefined && (
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: "auto", whiteSpace: "nowrap" }}>
                  {entry.durationMs}ms
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
