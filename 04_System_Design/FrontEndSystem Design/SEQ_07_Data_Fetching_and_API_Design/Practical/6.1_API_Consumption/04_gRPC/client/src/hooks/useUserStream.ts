/**
 * hooks/useUserStream.ts — Server-streaming React hook (ListUsers RPC).
 *
 * FAANG CONCEPTS DEMONSTRATED:
 *
 *   1. ASYNC ITERATOR CONSUMPTION
 *      gRPC server-streaming returns an AsyncIterable. We consume it with
 *      `for await...of`, exactly like reading from a Node.js stream.
 *      Each yielded value is a fully-typed User object from the proto.
 *
 *   2. ABORTCONTROLLER / CANCELLATION
 *      When the React component unmounts (user navigates away), the
 *      AbortController sends a RST_STREAM frame through Envoy to the gRPC
 *      server. The server's "cancelled" event fires and it stops streaming.
 *      Without this, the server keeps streaming into the void — wasted CPU.
 *
 *   3. USER-INITIATED CANCEL
 *      stopStream() lets the user press "Stop" mid-stream. The server receives
 *      the cancellation and exits the for-loop in server.ts. This is the gRPC
 *      equivalent of an XHR abort or fetch AbortController.
 *
 *   4. ConnectError.code === Code.Canceled
 *      When the user cancels deliberately we DON'T show an error banner.
 *      Canceled is an expected, user-initiated code — treat it as idle.
 */

import { createPromiseClient } from "@connectrpc/connect";
import { Code, ConnectError } from "@connectrpc/connect";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserService } from "../generated/user_connect";
import type { User } from "../generated/user_pb";
import { transport } from "../transport";

const client = createPromiseClient(UserService, transport);

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export interface UseUserStreamResult {
  users: User[];
  status: StreamStatus;
  error: string | null;
  startStream: () => void;
  stopStream: () => void;
}

export function useUserStream(department: string): UseUserStreamResult {
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Ref holds the AbortController so stopStream can read it without
  // being a stale closure over state
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async () => {
    // Cancel any previous stream before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUsers([]);
    setStatus("streaming");
    setError(null);

    try {
      const iterable = client.listUsers(
        { department, pageSize: 10 },
        { signal: controller.signal },
      );

      // ── Consume the server stream ────────────────────────────────────────
      // Each iteration awaits the NEXT message frame from Envoy (HTTP/2 DATA).
      // The browser is NOT polling — the server is pushing.
      for await (const user of iterable) {
        // Append each user as it arrives — UI updates in real-time
        setUsers((prev) => [...prev, user]);
      }

      setStatus("done");
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.Canceled) {
        // Deliberate user-initiated cancel — not an error state
        setStatus("idle");
        return;
      }
      const msg =
        err instanceof ConnectError
          ? `Code.${err.code}: ${err.message}`
          : String(err);
      setError(msg);
      setStatus("error");
    }
  }, [department]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    // status will flip to "idle" in the catch block above (Code.Canceled)
  }, []);

  // Cleanup: abort the stream when the component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { users, status, error, startStream, stopStream };
}
