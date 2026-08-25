/**
 * interceptors/auth.ts — Auth interceptor for gRPC-Web calls.
 *
 * FAANG CONCEPT:
 *   Interceptors in @connectrpc/connect are the gRPC equivalent of Axios
 *   request/response interceptors or Express middleware. They wrap every RPC
 *   call — unary AND streaming — in a single composable function.
 *
 * What this interceptor does:
 *   1. Reads a JWT from localStorage (simulated auth store)
 *   2. Injects "Authorization: Bearer <token>" header into every request
 *   3. On Code.Unauthenticated response → simulates a token refresh and retries
 *
 * HOW TO TEST IN THE LAB:
 *   Open DevTools → Application → LocalStorage → set key "grpc_auth_token"
 *   to any string. The Interceptors tab will show the token being injected.
 *   Delete the key to see the "no token" log line.
 *
 * PRODUCTION NOTE:
 *   In production you'd call your /refresh endpoint here, not localStorage.
 *   The principle (intercept → detect 401/UNAUTHENTICATED → refresh → retry)
 *   is exactly what production apps do.
 */

import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";
import { logStore } from "../logStore";

export const authInterceptor: Interceptor = (next) => async (req) => {
  const token = localStorage.getItem("grpc_auth_token");

  if (token) {
    req.header.set("Authorization", `Bearer ${token}`);
    logStore.push({
      event: "token-added",
      method: req.method.name,
      detail: `Token injected → ...${token.slice(-8)}`,
    });
  } else {
    logStore.push({
      event: "token-added",
      method: req.method.name,
      detail: "No token in localStorage — sending anonymous request",
    });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await next(req as any);
  } catch (err) {
    if (err instanceof ConnectError && err.code === Code.Unauthenticated) {
      // ── Simulate token refresh ───────────────────────────────────────────
      const refreshed = `refreshed-token-${Date.now()}`;
      localStorage.setItem("grpc_auth_token", refreshed);

      logStore.push({
        event: "token-refresh",
        method: req.method.name,
        detail: `UNAUTHENTICATED → token refreshed → retrying with ...${refreshed.slice(-8)}`,
      });

      req.header.set("Authorization", `Bearer ${refreshed}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return next(req as any);
    }
    throw err;
  }
};
