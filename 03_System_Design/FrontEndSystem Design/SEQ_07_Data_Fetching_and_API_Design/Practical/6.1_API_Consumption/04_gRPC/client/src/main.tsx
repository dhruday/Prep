import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/**
 * QueryClient config for gRPC:
 *   - retry: 1 (overridden per-query in useUser.ts for smart code-based logic)
 *   - staleTime: 30s default (gRPC POST not HTTP-cacheable — React Query is the cache)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
