/**
 * ErrorDemo.tsx — TAB 3: gRPC Status Code Mapping
 *
 * WHAT THIS TEACHES:
 *   gRPC has its own status code system — NOT HTTP status codes.
 *   Mapping them correctly to UX patterns is a FAANG interview talking point.
 *
 *   Code              HTTP equiv  UX Action
 *   ─────────────────────────────────────────────────────────────
 *   NOT_FOUND         404        Show "not found" empty state, no retry
 *   PERMISSION_DENIED 403        Redirect to login / show access-denied UI
 *   UNAVAILABLE       503        Show retry banner, auto-retry with backoff
 *   DEADLINE_EXCEEDED 504        Show "took too long" — increase timeout or retry
 *   UNAUTHENTICATED   401        Force re-login (auth interceptor handles this)
 *   INTERNAL          500        Report to Sentry, show generic error
 *
 * TRY IT:
 *   1. Click each button — watch the correct UI state render
 *   2. For UNAVAILABLE — watch the retry badge count up (React Query retries 3×)
 *   3. For DEADLINE_EXCEEDED — triggered by a 1ms timeout (server always too slow)
 *   4. Check Interceptor tab after each — see the error logged with Code + duration
 *
 * NOTE: "error-not-found" / "error-permission" / "error-unavailable" are special
 * IDs in the mock server that return those codes. Deadline is triggered client-side.
 */

import { createPromiseClient, Code, ConnectError } from "@connectrpc/connect";
import { useState } from "react";
import { UserService } from "../generated/user_connect";
import { transport } from "../transport";
import { s } from "../styles";

const client = createPromiseClient(UserService, transport);

interface ErrorScenario {
  label: string;
  description: string;
  code: string;
  httpEquiv: string;
  uxAction: string;
  trigger: () => Promise<void>;
}

type ResultState = { status: "idle" } | { status: "loading"; scenario: string } | { status: "error"; code: string; message: string; scenario: string } | { status: "success" };

const scenarios: ErrorScenario[] = [
  {
    label: "NOT_FOUND",
    description: 'Server returns Code.NotFound for id "error-not-found"',
    code: "Code.NotFound",
    httpEquiv: "404",
    uxAction: "Show empty-state UI, disable retry button",
    async trigger() {
      await client.getUser({ id: "error-not-found" });
    },
  },
  {
    label: "PERMISSION_DENIED",
    description: 'Server returns Code.PermissionDenied for id "error-permission"',
    code: "Code.PermissionDenied",
    httpEquiv: "403",
    uxAction: "Redirect to login / show access-denied banner",
    async trigger() {
      await client.getUser({ id: "error-permission" });
    },
  },
  {
    label: "UNAVAILABLE",
    description: 'Server returns Code.Unavailable (transient) — React Query retries 3×',
    code: "Code.Unavailable",
    httpEquiv: "503",
    uxAction: "Show retry banner, auto-retry with exponential backoff",
    async trigger() {
      await client.getUser({ id: "error-unavailable" });
    },
  },
  {
    label: "DEADLINE_EXCEEDED",
    description: "Client-side 1ms timeout fires before server responds",
    code: "Code.DeadlineExceeded",
    httpEquiv: "504",
    uxAction: "Show 'request timed out', offer retry with longer timeout",
    async trigger() {
      // timeoutMs: 1 — guaranteed to expire before the server responds
      await client.getUser({ id: "u001" }, { timeoutMs: 1 });
    },
  },
  {
    label: "Valid Request ✓",
    description: 'Successful unary call (id "u001")',
    code: "Code.OK",
    httpEquiv: "200",
    uxAction: "Render data",
    async trigger() {
      await client.getUser({ id: "u001" });
    },
  },
];

const CODE_COLORS: Record<string, string> = {
  "Code.NotFound": "#f59e0b",
  "Code.PermissionDenied": "#ef4444",
  "Code.Unavailable": "#8b5cf6",
  "Code.DeadlineExceeded": "#06b6d4",
  "Code.OK": "#10b981",
};

export function ErrorDemo() {
  const [result, setResult] = useState<ResultState>({ status: "idle" });

  async function run(scenario: ErrorScenario) {
    setResult({ status: "loading", scenario: scenario.label });
    try {
      await scenario.trigger();
      setResult({ status: "success" });
    } catch (err) {
      if (err instanceof ConnectError) {
        setResult({
          status: "error",
          scenario: scenario.label,
          code: `Code.${Code[err.code]}`,
          message: err.message,
        });
      }
    }
  }

  return (
    <div>
      <h2 style={s.sectionTitle}>gRPC Status Code Mapping</h2>

      <div style={s.conceptBox}>
        <strong>FAANG concept:</strong> gRPC has 16 status codes independent of HTTP.
        Mapping each code to the correct UX action (retry vs. redirect vs. report to Sentry)
        is a senior engineering skill. Do NOT use <code>error.message</code> in UI — always
        branch on <code>error.code</code>.
      </div>

      {/* ── Scenario grid ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {scenarios.map((sc) => (
          <div
            key={sc.label}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr auto",
              gap: 12,
              padding: 12,
              background: "#1e293b",
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: CODE_COLORS[sc.code] ?? "#e2e8f0",
                  marginBottom: 2,
                }}
              >
                {sc.label}
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>≈ HTTP {sc.httpEquiv}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>{sc.description}</div>
              <div style={{ fontSize: 11, color: "#475569" }}>→ {sc.uxAction}</div>
            </div>
            <button
              style={{
                ...s.btnSm,
                background:
                  result.status === "loading" && (result as { scenario: string }).scenario === sc.label
                    ? "#475569"
                    : CODE_COLORS[sc.code] ?? "#334155",
                minWidth: 80,
              }}
              onClick={() => run(sc)}
              disabled={result.status === "loading"}
            >
              {result.status === "loading" && (result as { scenario: string }).scenario === sc.label
                ? "…"
                : "Trigger"}
            </button>
          </div>
        ))}
      </div>

      {/* ── Result panel ──────────────────────────────────────────────────── */}
      {result.status === "error" && (
        <div style={s.errorBox}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>Error received from Envoy → gRPC server</strong>
            <button style={{ ...s.btnSm, background: "#475569" }} onClick={() => setResult({ status: "idle" })}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ color: CODE_COLORS[result.code] ?? "#e2e8f0", fontWeight: 700 }}>{result.code}</span>
            {" — "}
            {result.message}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
            Notice: this is a gRPC status code, NOT an HTTP status.
            React Query received this as a <code>ConnectError</code> with{" "}
            <code>err.code === Code.{result.code.replace("Code.", "")}</code>.
          </div>
        </div>
      )}

      {result.status === "success" && (
        <div style={{ padding: 12, background: "#064e3b", borderRadius: 8, color: "#6ee7b7", fontSize: 13 }}>
          ✓ Code.OK — successful response. Check Interceptor tab to see logging interceptor duration.
        </div>
      )}
    </div>
  );
}
