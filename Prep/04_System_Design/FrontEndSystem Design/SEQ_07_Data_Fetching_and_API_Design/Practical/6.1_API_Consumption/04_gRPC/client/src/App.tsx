/**
 * App.tsx — Tabbed container for all four gRPC lab exercises.
 *
 * Tab 1 - Unary + React Query  → UserProfile.tsx
 * Tab 2 - Server Streaming     → UserStream.tsx
 * Tab 3 - Error Code Mapping   → ErrorDemo.tsx
 * Tab 4 - Interceptors         → InterceptorLog.tsx
 */

import { useState } from "react";
import { ErrorDemo } from "./components/ErrorDemo";
import { InterceptorLog } from "./components/InterceptorLog";
import { UserProfile } from "./components/UserProfile";
import { UserStream } from "./components/UserStream";

const TABS = [
  { id: "unary",       label: "1 · Unary + React Query",  component: UserProfile },
  { id: "stream",      label: "2 · Server Streaming",      component: UserStream },
  { id: "errors",      label: "3 · Error Codes",           component: ErrorDemo },
  { id: "interceptors",label: "4 · Interceptors",          component: InterceptorLog },
] as const;

type TabId = typeof TABS[number]["id"];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("unary");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)!.component;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "16px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>
            gRPC-Web Frontend Lab
          </h1>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Browser → Envoy :8080 → gRPC Server :50051 &nbsp;|&nbsp;
            @connectrpc/connect-web + @bufbuild/protobuf + React Query &nbsp;|&nbsp;
            FAANG Senior Frontend Prep
          </p>
        </div>
      </div>

      {/* ── Architecture banner ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "#020617",
          padding: "8px 24px",
          fontSize: 12,
          fontFamily: "monospace",
          color: "#475569",
          borderBottom: "1px solid #0f172a",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {"Browser (Vite:5173)  ──gRPC-Web──▶  Envoy (Docker:8080)  ──HTTP/2 gRPC──▶  Node.js server (Docker:50051)"}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === tab.id ? "#e2e8f0" : "#64748b",
                padding: "12px 16px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: activeTab === tab.id ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
