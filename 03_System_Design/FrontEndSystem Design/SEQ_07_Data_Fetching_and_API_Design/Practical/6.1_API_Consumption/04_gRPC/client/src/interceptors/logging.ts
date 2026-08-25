/**
 * interceptors/logging.ts — Timing + observability interceptor.
 *
 * FAANG CONCEPT:
 *   In production systems (Uber, Netflix) every outbound RPC is wrapped with:
 *     - Distributed trace IDs (added as headers)
 *     - Duration metrics (pushed to a metrics pipeline like Prometheus/Datadog)
 *     - Error classification (report to Sentry on unexpected codes)
 *
 *   This interceptor is a simplified version: it logs TTFB (time-to-first-byte)
 *   and success/error to the logStore for the InterceptorLog UI tab.
 *
 * UNARY vs STREAMING timing:
 *   Unary:     `await next(req)` waits for the full response → durationMs = round-trip time
 *   Streaming: `await next(req)` returns once the stream is established (not drained)
 *              → durationMs = TTFB (time to first stream frame), not total stream duration.
 *              This is intentional — streaming metrics focus on connection latency.
 *
 * INTERCEPTOR ORDER in transport.ts:
 *   [loggingInterceptor, authInterceptor]
 *   ↓ outermost first
 *   logging wraps auth wraps network
 *   So durationMs includes time spent in the auth interceptor (token read/set).
 */

import { ConnectError, type Interceptor } from "@connectrpc/connect";
import { logStore } from "../logStore";

export const loggingInterceptor: Interceptor = (next) => async (req) => {
  const method = req.method.name;
  const start = performance.now();

  logStore.push({
    event: "request",
    method,
    detail: `→ ${method}()  [${req.service.typeName}]`,
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await next(req as any);
    const durationMs = Math.round(performance.now() - start);

    logStore.push({
      event: "response",
      method,
      detail: `← ${method}() succeeded`,
      durationMs,
    });

    return response;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const detail =
      err instanceof ConnectError
        ? `✗ ${method}() failed — Code.${err.code} (${err.message})`
        : `✗ ${method}() threw unexpected error`;

    logStore.push({ event: "error", method, detail, durationMs });
    throw err;
  }
};
