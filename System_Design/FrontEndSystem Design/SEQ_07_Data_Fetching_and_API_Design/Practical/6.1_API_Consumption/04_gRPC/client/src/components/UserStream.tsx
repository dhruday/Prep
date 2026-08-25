/**
 * UserStream.tsx — TAB 2: Server Streaming RPC (ListUsers)
 *
 * WHAT THIS TEACHES:
 *   • Server streaming: the server pushes N messages over one HTTP/2 connection
 *   • async iterator (for await...of) — the idiomatic way to consume streams
 *   • AbortController cancellation — sends RST_STREAM to the gRPC server
 *   • Code.Canceled: deliberate cancel is NOT an error state
 *
 * TRY IT:
 *   1. Press "Start Stream" → watch users arrive one-by-one (200ms apart)
 *   2. Open Network tab → see ONE request to :8080 that stays "pending"
 *      while messages arrive. This is HTTP/2 server push (not polling!)
 *   3. Press "Stop" mid-stream → bar turns idle, network request closes
 *   4. Filter by department and stream again — server filters server-side
 *   5. Check Interceptor tab → logging shows TTFB not total stream duration
 *
 * Compare to polling:
 *   REST polling = N separate POST requests every X ms
 *   gRPC streaming = 1 request, N responses. More efficient, lower latency.
 */

import { useUserStream } from "../hooks/useUserStream";
import { UserRole } from "../generated/user_pb";
import { s } from "../styles";

const DEPT_OPTIONS = ["", "engineering", "design", "product"] as const;
type Dept = typeof DEPT_OPTIONS[number];

const DEPT_LABELS: Record<Dept, string> = {
  "": "All departments",
  engineering: "Engineering",
  design: "Design",
  product: "Product",
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.USER_ROLE_UNSPECIFIED]: "—",
  [UserRole.USER_ROLE_ADMIN]: "Admin",
  [UserRole.USER_ROLE_MEMBER]: "Member",
  [UserRole.USER_ROLE_VIEWER]: "Viewer",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "#64748b",
  streaming: "#f59e0b",
  done: "#10b981",
  error: "#ef4444",
};

import { useState } from "react";

export function UserStream() {
  const [dept, setDept] = useState<Dept>("");
  const { users, status, error, startStream, stopStream } = useUserStream(dept);

  return (
    <div>
      <h2 style={s.sectionTitle}>Server Streaming RPC</h2>

      <div style={s.conceptBox}>
        <strong>FAANG concept:</strong> One HTTP/2 connection; server pushes frames.
        The browser consumes via <code>for await...of</code> (AsyncIterable).
        Cancellation sends <code>RST_STREAM</code> — server stops immediately.
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select
          style={{ ...s.input, width: "auto" }}
          value={dept}
          onChange={(e) => setDept(e.target.value as Dept)}
        >
          {DEPT_OPTIONS.map((d) => (
            <option key={d} value={d}>{DEPT_LABELS[d]}</option>
          ))}
        </select>

        {status === "streaming" ? (
          <button style={{ ...s.btn, background: "#ef4444" }} onClick={stopStream}>
            ■ Stop (sends RST_STREAM)
          </button>
        ) : (
          <button style={s.btn} onClick={startStream}>
            ▶ Start Stream
          </button>
        )}

        <span style={{ fontSize: 12, color: STATUS_COLORS[status] }}>
          ● {status.toUpperCase()}
          {status === "streaming" && ` — ${users.length} received so far`}
          {status === "done" && ` — ${users.length} total`}
        </span>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={s.errorBox}>
          <strong>Stream error</strong>: {error}
        </div>
      )}

      {/* ── Stream results ────────────────────────────────────────────────── */}
      {users.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Users arrive with 200ms server-side delay — watch the list grow in real-time ↓
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map((user, i) => (
              <div
                key={user.id}
                style={{
                  ...s.streamRow,
                  // Newest item highlighted
                  background: i === 0 ? "#1e3a5f" : "#1e293b",
                  borderLeft: i === 0 ? "3px solid #3b82f6" : "3px solid transparent",
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 12, width: 40 }}>#{i + 1}</span>
                <span style={{ fontWeight: 600, width: 140 }}>{user.name}</span>
                <span style={{ color: "#64748b", fontSize: 12, width: 180 }}>{user.email}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{user.department}</span>
                <span style={{ ...s.tag, marginLeft: "auto" }}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "idle" && users.length === 0 && (
        <div style={{ color: "#475569", fontSize: 14, textAlign: "center", padding: 40 }}>
          Press ▶ Start Stream to begin.
          <br />
          <span style={{ fontSize: 12 }}>
            Open DevTools → Network to see the single POST that stays "pending" while users arrive.
          </span>
        </div>
      )}

      {status === "done" && (
        <div style={{ marginTop: 16, padding: 12, background: "#064e3b", borderRadius: 6, fontSize: 13, color: "#6ee7b7" }}>
          ✓ Stream completed — server sent all {users.length} users and called <code>call.end()</code>.
          In Network tab the request is now "finished" with status 200.
        </div>
      )}
    </div>
  );
}
