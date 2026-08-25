# gRPC-Web Frontend Lab — FAANG Senior Prep

> **Full-stack hands-on lab:** Node.js gRPC server → Envoy proxy → React browser client.
> Covers every gRPC concept that appears in FAANG frontend system-design and coding interviews.

---

## Architecture

```
Browser (Vite :5173)
        │
        │  gRPC-Web   (binary protobuf POST, HTTP/1.1 or HTTP/2)
        ▼
  Envoy Proxy  (:8080)   ← Docker container
        │
        │  grpc_web filter + cors filter
        │  translates gRPC-Web → native gRPC over HTTP/2
        ▼
  gRPC Server  (:50051)  ← Docker container
  Node.js + @grpc/grpc-js
  Loads user.proto at runtime via @grpc/proto-loader
```

**Why Envoy?**
Browsers cannot send raw HTTP/2 frames — `fetch()` doesn't expose low-level HTTP/2 primitives.
Envoy's `envoy.filters.http.grpc_web` filter translates gRPC-Web's browser-compatible
POST framing into native gRPC binary over HTTP/2.

---

## Prerequisites

| Tool | Min version | Check |
|---|---|---|
| Node.js | 20 | `node -v` |
| Docker Desktop | any | `docker info` |
| Docker Compose | v2 | `docker compose version` |
| (Optional) buf CLI | 1.39 | `npx buf --version` |

---

## Quick Start — 3 Commands

```bash
# 1. Start the gRPC server + Envoy proxy
docker compose up --build

# 2. In a new terminal — install and start the React client
cd client
npm install
npm run dev

# 3. Open http://localhost:5173
```

All four lab tabs are now live.

---

## What Each Tab Demonstrates

### Tab 1 — Unary + React Query
**Files:** `hooks/useUser.ts`, `components/UserProfile.tsx`

| What to do | What to observe |
|---|---|
| Enter `u001`, click GetUser() | Binary POST to `:8080` in Network tab (not JSON!) |
| Click GetUser() again immediately | **No network request** — served from React Query cache (staleTime 60s) |
| Enter `error-not-found` | `Code.NotFound` — no retry spinner (smart retry logic) |
| Enter `error-unavailable` | `Code.Unavailable` — React Query retries 3× then gives up |
| Enter `error-unavailable` (watch Network) | 4 POST requests (1 original + 3 retries) |

**Key code pattern:**
```typescript
// useUser.ts — smart retry: skip retry for deterministic errors
retry(failureCount, error) {
  if (error instanceof ConnectError) {
    if (error.code === Code.NotFound || error.code === Code.PermissionDenied) {
      return false; // these will NEVER succeed on retry
    }
  }
  return failureCount < 3; // UNAVAILABLE might succeed on retry
}
```

---

### Tab 2 — Server Streaming
**Files:** `hooks/useUserStream.ts`, `components/UserStream.tsx`

| What to do | What to observe |
|---|---|
| Click "Start Stream" | ONE request in Network tab stays "pending" while users arrive |
| Watch the list | Each user appears 200ms apart — real-time push, not polling |
| Click "Stop" mid-stream | Network request immediately closes (RST_STREAM sent) |
| Check server logs | `docker compose logs -f server` — you'll see the stream end |

**Key code pattern:**
```typescript
// useUserStream.ts — consume async iterator with cancel-on-unmount
const iterable = client.listUsers({ department }, { signal: controller.signal });

for await (const user of iterable) {
  setUsers(prev => [...prev, user]); // real-time append
}
// AbortController.abort() → sends RST_STREAM → server's "cancelled" event fires
```

---

### Tab 3 — Error Code Mapping
**Files:** `components/ErrorDemo.tsx`

| gRPC Code | HTTP equiv | UX action |
|---|---|---|
| `Code.NotFound` | 404 | Show empty-state, disable retry |
| `Code.PermissionDenied` | 403 | Redirect to login |
| `Code.Unavailable` | 503 | Show retry banner, auto-retry |
| `Code.DeadlineExceeded` | 504 | "Request timed out", offer retry |
| `Code.Unauthenticated` | 401 | Auth interceptor handles (see Tab 4) |

**FAANG talking point:** Always branch on `error.code`, never on `error.message`.
Message strings are localised and can change across server versions.

---

### Tab 4 — Interceptors
**Files:** `interceptors/auth.ts`, `interceptors/logging.ts`, `transport.ts`

| What to do | What to observe |
|---|---|
| Click "Fetch User" | request → token-added → response entries appear |
| Set `grpc_auth_token` in LocalStorage | Token injected with last 8 chars shown |
| Delete the key | "anonymous request" logged |
| Click "Start Metrics Stream" | Rapid `stream-data` entries (300ms apart) — all pass through interceptors |

**Interceptor chain order:**
```typescript
// transport.ts
interceptors: [loggingInterceptor, authInterceptor]
// Execution: logging( auth( network ) )
// BEFORE: logging.start → auth.injectToken → [send]
// AFTER:  [reply from Envoy] → auth.returns → logging.end (with timing)
```

---

## Practising the Protobuf Build Pipeline

The lab ships pre-generated TypeScript stubs so it works immediately. To practise the full
codegen pipeline (as done in production monorepos):

```bash
# Install buf codegen plugins
cd client && npm install

# Lint the proto file
npx buf lint ../proto

# Generate TypeScript stubs from user.proto
# Outputs: src/generated/user_pb.ts, src/generated/user_connect.ts
npm run generate   # runs: buf generate (config in buf.gen.yaml)

# Verify generated code compiles
npx tsc --noEmit
```

### Breaking Change Detection (CI Guard)

This is a critical FAANG interview talking point.

If you rename or remove a proto field, deployed browser clients silently
misparse responses. `buf breaking` catches this **before** the PR merges:

```bash
# Make a breaking change — rename "name" to "full_name" in user.proto
# Then run:
npx buf breaking ../proto --against ../proto   # compare against git HEAD

# Example error:
# proto/user.proto:39:3:Field "2" ("name") on message "User" changed name to "full_name".
# This breaks binary-encoded payloads already cached in browser clients.
```

---

## Ports Reference

| Port | Service |
|---|---|
| `5173` | Vite dev server (browser client) |
| `8080` | Envoy gRPC-Web endpoint (browser → here) |
| `9901` | Envoy admin / stats: `http://localhost:9901/stats` |
| `50051` | gRPC server (Docker-internal, not exposed to host) |

---

## File Structure

```
04_gRPC/
├── docker-compose.yml          # starts server + envoy
├── proto/
│   ├── buf.yaml                # buf module config
│   └── user.proto              # UserService definition (3 RPCs)
├── server/
│   ├── Dockerfile              # multi-stage: tsc build → lean prod image
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── data.ts             # 10 mock users (in-memory)
│       └── server.ts           # GetUser, ListUsers, GetSystemStats handlers
├── envoy/
│   └── envoy.yaml              # grpc_web + cors filters → server:50051
└── client/
    ├── buf.gen.yaml            # protoc-gen-es + protoc-gen-connect-es config
    ├── package.json            # @connectrpc/connect-web + React Query + Vite
    ├── vite.config.ts
    └── src/
        ├── generated/
        │   ├── user_pb.ts      # PRE-GENERATED protobuf message classes
        │   └── user_connect.ts # PRE-GENERATED service descriptor
        ├── logStore.ts         # pub/sub log for interceptor activity
        ├── transport.ts        # createGrpcWebTransport + interceptor chain
        ├── interceptors/
        │   ├── auth.ts         # Bearer token inject + Unauthenticated refresh
        │   └── logging.ts      # TTFB timing + error classification
        ├── hooks/
        │   ├── useUser.ts      # React Query + smart gRPC retry logic
        │   └── useUserStream.ts# server-streaming + AbortController cancel
        └── components/
            ├── UserProfile.tsx  # Tab 1: Unary + React Query
            ├── UserStream.tsx   # Tab 2: Server streaming
            ├── ErrorDemo.tsx    # Tab 3: gRPC error codes
            └── InterceptorLog.tsx # Tab 4: interceptor activity
```

---

## gRPC-Web Limitations (for Interview Answers)

| Pattern | Browser support | Alternative |
|---|---|---|
| **Unary** (1 req → 1 res) | ✅ | — |
| **Server streaming** (1 req → N res) | ✅ | — |
| **Client streaming** (N req → 1 res) | ❌ | REST multipart / tus protocol |
| **Bidirectional streaming** | ❌ | WebSocket |

gRPC-Web only supports the first two because browsers can't send streaming HTTP/2 request bodies.

---

## Common Issues

**`docker compose up` fails — port 8080 in use**
```bash
lsof -i :8080   # find what's using it
# or change the host port in docker-compose.yml: "8081:8080"
```

**CORS error in browser**
Envoy's CORS config in `envoy/envoy.yaml` allows all origins (`prefix: "*"`).
If you change the Vite port, no change needed — all origins are allowed.

**`npm run dev` shows "Failed to fetch"**
Make sure Docker container is running: `docker compose ps`.
gRPC server takes ~5s to start; wait for Envoy to report healthy.

**Regenerated files break TypeScript**
The pre-generated stubs target `@bufbuild/protobuf` v1. If `npm run generate`
overwrites them with v2 stubs (protoc-gen-es v2+), update `package.json` to
`"@bufbuild/protoc-gen-es": "^1.10.0"` and re-run `npm install`.
