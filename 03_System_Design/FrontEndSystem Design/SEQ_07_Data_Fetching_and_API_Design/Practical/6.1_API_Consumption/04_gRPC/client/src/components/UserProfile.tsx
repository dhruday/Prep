/**
 * UserProfile.tsx — TAB 1: Unary RPC + React Query caching
 *
 * WHAT THIS TEACHES:
 *   • Wrapping a gRPC unary call in useQuery — same API as REST, zero boilerplate
 *   • staleTime: cached response served for 60s (gRPC has no HTTP cache support)
 *   • Smart retry: NOT_FOUND skipped immediately, UNAVAILABLE retried 3×
 *   • Type-safe response: user.name / user.email come from the .proto definition
 *
 * TRY IT:
 *   1. Enter "u001" → see Alice Chen's profile load from binary protobuf
 *   2. Enter "u001" again → instant (from React Query cache, no network request)
 *   3. Open Network tab → see binary POST to localhost:8080 (not JSON!)
 *   4. Enter "error-not-found" → NOT_FOUND shown immediately, no retry spinner
 *   5. Enter "error-unavailable" → UNAVAILABLE — watch React Query retry 3×
 *
 * Available IDs: u001 – u010
 */

import { Code, ConnectError } from "@connectrpc/connect";
import { useState } from "react";
import { UserRole } from "../generated/user_pb";
import { useUser } from "../hooks/useUser";
import { s } from "../styles";

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.USER_ROLE_UNSPECIFIED]: "—",
  [UserRole.USER_ROLE_ADMIN]: "Admin",
  [UserRole.USER_ROLE_MEMBER]: "Member",
  [UserRole.USER_ROLE_VIEWER]: "Viewer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.USER_ROLE_UNSPECIFIED]: "#64748b",
  [UserRole.USER_ROLE_ADMIN]: "#f59e0b",
  [UserRole.USER_ROLE_MEMBER]: "#3b82f6",
  [UserRole.USER_ROLE_VIEWER]: "#10b981",
};

export function UserProfile() {
  const [inputId, setInputId] = useState("u001");
  const [queryId, setQueryId] = useState("u001");

  const { data: user, isFetching, isError, error, dataUpdatedAt } = useUser(queryId);

  function handleFetch() {
    setQueryId(inputId.trim());
  }

  function errorMessage(): string {
    if (error instanceof ConnectError) {
      switch (error.code) {
        case Code.NotFound:         return `NOT_FOUND — "${queryId}" does not exist`;
        case Code.PermissionDenied: return `PERMISSION_DENIED — you cannot view this user`;
        case Code.Unavailable:      return `UNAVAILABLE — service is down, retried 3× and gave up`;
        default:                    return `${error.code}: ${error.message}`;
      }
    }
    return String(error);
  }

  return (
    <div>
      <h2 style={s.sectionTitle}>Unary RPC + React Query</h2>

      <div style={s.conceptBox}>
        <strong>FAANG concept:</strong> gRPC Unary call wrapped in <code>useQuery</code>.
        Response is binary protobuf decoded to a typed <code>User</code> object.
        React Query provides stale-while-revalidate caching (since gRPC can't use HTTP cache).
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={s.input}
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="User ID (e.g. u001)"
        />
        <button style={s.btn} onClick={handleFetch} disabled={isFetching}>
          {isFetching ? "Fetching…" : "GetUser()"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {["u001", "u005", "u008"].map((id) => (
          <button
            key={id}
            style={{ ...s.btnSm, background: queryId === id ? "#3b82f6" : "#334155" }}
            onClick={() => { setInputId(id); setQueryId(id); }}
          >
            {id}
          </button>
        ))}
        <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>quick picks</span>
      </div>

      {/* ── Result ────────────────────────────────────────────────────────── */}
      {isFetching && <div style={s.info}>Sending binary protobuf POST to Envoy…</div>}

      {isError && (
        <div style={s.errorBox}>
          <strong>gRPC Error</strong>
          <p style={{ marginTop: 4 }}>{errorMessage()}</p>
          <p style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
            Check Interceptor tab → logging interceptor captured this error with code + duration.
          </p>
        </div>
      )}

      {user && !isFetching && (
        <div style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={s.avatar}>{user.name.charAt(0)}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 14 }}>{user.email}</div>
            </div>
            <span style={{ ...s.badge, background: ROLE_COLORS[user.role], marginLeft: "auto" }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 14 }}>
            <span style={{ color: "#64748b" }}>ID</span>
            <code style={{ color: "#94a3b8" }}>{user.id}</code>
            <span style={{ color: "#64748b" }}>Department</span>
            <span>{user.department}</span>
            <span style={{ color: "#64748b" }}>Tags</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {user.tags.map((t) => (
                <span key={t} style={s.tag}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>
            React Query cache updated: {new Date(dataUpdatedAt).toLocaleTimeString()}.
            Re-fetch before 60s = served from cache (no network call).
          </div>
        </div>
      )}
    </div>
  );
}
