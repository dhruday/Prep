/**
 * styles.ts — Shared inline styles for the gRPC lab UI.
 * Avoids a CSS dependency so the lab runs with zero extra config.
 */

import type { CSSProperties } from "react";

export const s: Record<string, CSSProperties> = {
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
    color: "#e2e8f0",
  },
  conceptBox: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
    lineHeight: 1.6,
  },
  input: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#e2e8f0",
    padding: "7px 12px",
    fontSize: 14,
    outline: "none",
    width: 200,
  },
  btn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 600,
  },
  btnSm: {
    background: "#334155",
    color: "#e2e8f0",
    border: "none",
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  badge: {
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
  },
  tag: {
    background: "#334155",
    color: "#94a3b8",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
  },
  errorBox: {
    background: "#450a0a",
    border: "1px solid #7f1d1d",
    borderRadius: 8,
    padding: 12,
    color: "#fca5a5",
    marginBottom: 12,
    fontSize: 13,
  },
  info: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 12,
  },
  streamRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
  },
};
