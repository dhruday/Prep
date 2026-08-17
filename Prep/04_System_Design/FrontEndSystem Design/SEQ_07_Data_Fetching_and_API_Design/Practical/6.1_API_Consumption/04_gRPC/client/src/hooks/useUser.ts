/**
 * hooks/useUser.ts — React Query wrapper for GetUser (Unary RPC).
 *
 * FAANG CONCEPTS DEMONSTRATED:
 *
 *   1. SMART RETRY LOGIC
 *      React Query retries failed queries 3× by default. For gRPC we must
 *      override this: NOT_FOUND and PERMISSION_DENIED will never succeed on
 *      retry — retrying wastes bandwidth and makes UX worse (spinner stays
 *      longer). UNAVAILABLE is transient so we do retry it.
 *
 *   2. staleTime
 *      User profiles don't change every second. staleTime: 60_000 means React
 *      Query serves the cache for 60s before revalidating. In a gRPC context
 *      this is important because gRPC POST requests are NOT cacheable by CDN/
 *      browser HTTP cache — app-level caching via React Query is the only option.
 *
 *   3. TYPE SAFETY
 *      `data` is typed as `User | undefined` — the TypeScript type comes from
 *      the .proto definition via generated stubs. Change a field type in
 *      user.proto → run `npm run generate` → TypeScript flags every broken
 *      callsite immediately. No runtime deserialization surprises.
 */

import { createPromiseClient } from "@connectrpc/connect";
import { Code, ConnectError } from "@connectrpc/connect";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "../generated/user_connect";
import { transport } from "../transport";

// One client per service — reuse across the app (does NOT create a new socket)
const client = createPromiseClient(UserService, transport);

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => client.getUser({ id }),

    // Only fire the query when there's a non-empty ID
    enabled: id.trim().length > 0,

    // Serve cached data for 60 seconds before refetching
    staleTime: 60_000,

    // ── Smart retry: don't retry deterministic errors ──────────────────────
    // This is a FAANG interview talking point:
    //   NOT_FOUND        → user doesn't exist, retrying won't help
    //   PERMISSION_DENIED → we lack access, retrying before re-auth won't help
    //   UNAVAILABLE      → server is overloaded, DO retry (up to 3×)
    retry(failureCount, error) {
      if (error instanceof ConnectError) {
        if (
          error.code === Code.NotFound ||
          error.code === Code.PermissionDenied
        ) {
          return false; // give up immediately
        }
      }
      return failureCount < 3;
    },
  });
}
