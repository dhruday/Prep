/**
 * server.ts — gRPC-Web UserService (connect-node, no Envoy needed)
 *
 * WHY connect-node INSTEAD OF @grpc/grpc-js + Envoy?
 *   @grpc/grpc-js speaks native gRPC (binary HTTP/2 frames). Browsers can't
 *   send those directly, so production setups add an Envoy proxy to translate.
 *
 *   @connectrpc/connect-node speaks the CONNECT + gRPC-WEB protocols natively
 *   from Node.js — no proxy layer needed. The browser's createGrpcWebTransport
 *   connects directly to this server on port 8080. The wire format, binary
 *   protobuf encoding, and streaming semantics are identical to the full
 *   Envoy setup (see docker-compose.yml for the production version).
 *
 * THREE RPCS:
 *   GetUser        — Unary.           Lookup by ID; returns gRPC error codes.
 *   ListUsers      — ServerStreaming. Streams users 200ms apart.
 *   GetSystemStats — ServerStreaming. Pushes fake CPU/mem at interval_ms.
 *
 * CANCELLATION:
 *   ctx.signal is an AbortSignal — fires when the browser calls AbortController.abort().
 *   Async generators stop yielding automatically when the caller disconnects.
 */

import { ConnectError, Code, type ConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { USERS, USER_MAP } from "./data";
import { UserService } from "./generated/user_connect";
import { User, SystemStat } from "./generated/user_pb";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Service routes ───────────────────────────────────────────────────────────

function routes(router: ConnectRouter): void {
  router.service(UserService, {

    /**
     * GetUser — Unary RPC
     * Throw ConnectError to return a typed gRPC status code to the browser.
     * Special IDs trigger ErrorDemo scenarios (see client/src/components/ErrorDemo.tsx).
     */
    async getUser(req) {
      const id = req.id?.trim() ?? "";

      if (id === "error-not-found") {
        throw new ConnectError(`User "${id}" does not exist`, Code.NotFound);
      }
      if (id === "error-permission") {
        throw new ConnectError("You do not have permission to view this user", Code.PermissionDenied);
      }
      if (id === "error-unavailable") {
        throw new ConnectError("User service temporarily unavailable — retry shortly", Code.Unavailable);
      }

      const user = USER_MAP.get(id);
      if (!user) {
        throw new ConnectError(`No user with id "${id}"`, Code.NotFound);
      }

      return new User(user);
    },

    /**
     * ListUsers — Server Streaming RPC
     * Async generator: each `yield` sends one protobuf frame to the browser.
     * ctx.signal aborts when the client calls AbortController.abort().
     */
    async *listUsers(req, ctx) {
      const dept = req.department?.trim().toLowerCase() ?? "";
      const pageSize = req.pageSize ?? 0;

      let filtered = dept ? USERS.filter((u) => u.department === dept) : [...USERS];
      if (pageSize > 0) filtered = filtered.slice(0, pageSize);

      for (const user of filtered) {
        if (ctx.signal.aborted) break;
        yield new User(user);
        await sleep(200); // 200ms cadence — visible in DevTools Network tab
      }
    },

    /**
     * GetSystemStats — Server Streaming RPC (runs until client cancels)
     * Demonstrates long-lived streams and ctx.signal cancellation.
     */
    async *getSystemStats(req, ctx) {
      const intervalMs = Math.max(req.intervalMs || 500, 100);
      const maxCount = req.count || 0;
      let sent = 0;

      while (!ctx.signal.aborted) {
        if (maxCount > 0 && sent >= maxCount) break;

        yield new SystemStat({
          cpuPercent: parseFloat((Math.random() * 100).toFixed(1)),
          memPercent: parseFloat((40 + Math.random() * 35).toFixed(1)),
          timestampMs: Date.now(),
        });

        sent++;
        await sleep(intervalMs);
      }
    },
  });
}

// ─── HTTP server with CORS ────────────────────────────────────────────────────
// connect-node's serve() handles Connect + gRPC-Web protocols natively.
// CORS headers allow cross-origin binary POSTs from Vite (localhost:5173).
// In production with Envoy, CORS is handled by the envoy.yaml cors filter.

const connectHandler = connectNodeAdapter({ routes });

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, x-grpc-web, grpc-timeout, authorization, connect-protocol-version, connect-timeout-ms, x-user-agent",
  "Access-Control-Expose-Headers":
    "grpc-status, grpc-message, grpc-status-details-bin, trailer, connect-allow-get",
};

function requestHandler(req: IncomingMessage, res: ServerResponse) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  connectHandler(req, res);
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "8080", 10);

createServer(requestHandler).listen(PORT, () => {
  console.log(`\ngRPC-Web UserService ready at http://localhost:${PORT}`);
  console.log(`  Protocol:  Connect + gRPC-Web (binary protobuf)`);
  console.log(`  Users:     ${USERS.length} mock records`);
  console.log(`\n  Error trigger IDs:`);
  console.log(`    error-not-found   → Code.NotFound`);
  console.log(`    error-permission  → Code.PermissionDenied`);
  console.log(`    error-unavailable → Code.Unavailable`);
  console.log(`\n  Vite client → http://localhost:5173\n`);
});
