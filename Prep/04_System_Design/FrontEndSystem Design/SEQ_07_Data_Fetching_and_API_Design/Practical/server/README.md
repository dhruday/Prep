# Data Fetching & API Design — Labs Server

## Quick Start

```bash
cd Practical/server
npm install
npm start        # http://localhost:4001
```

Or with file watching:
```bash
npm run dev
```

## Architecture

- **Port 4001** (avoids conflict with Security Labs on 3001)
- **SQLite** — 10,000 products, 500 posts, 2,000 comments auto-seeded on first run
- **No Redis** — all state is in-memory or SQLite

## API Endpoints

| Route | Purpose | Used By Labs |
|-------|---------|-------------|
| `GET /api/rest/products` | CRUD + pagination | Module 6.1 REST labs |
| `GET /api/rest/search?q=` | Product search | Module 6.1, 6.3 debounce labs |
| `GET /api/pagination/offset` | Offset pagination | Module 6.2 pagination labs |
| `GET /api/pagination/cursor` | Cursor pagination | Module 6.2 pagination labs |
| `GET /api/pagination/keyset` | Keyset pagination | Module 6.2 pagination labs |
| `GET /api/pagination/relay` | Relay connection spec | Module 6.2 Relay lab |
| `GET /api/pagination/benchmark` | Offset vs cursor timing | Module 6.2 benchmark lab |
| `GET /api/search?q=&delay=true` | Search with artificial delay | Module 6.3 debounce labs |
| `GET /api/search/slow` | Always slow search (1-3s) | Module 6.3 debounce labs |
| `GET /api/posts` | Post feed with likes | Module 6.3 optimistic labs |
| `POST /api/posts/:id/like` | Like with 15% failure rate | Module 6.3 optimistic labs |
| `GET /api/streaming/sse` | Server-Sent Events stream | Module 6.3 abort labs |
| `GET /api/streaming/ai-chat` | AI token streaming sim | Module 6.3 abort labs |
| `GET /api/unreliable/flaky` | Configurable failure rate | Module 6.4 retry labs |
| `GET /api/unreliable/timeout` | Random timeouts | Module 6.4 circuit breaker |
| `GET /api/unreliable/rate-limited` | 429 after N requests | Module 6.4 rate limit labs |
| `POST /api/unreliable/idempotent` | Idempotency key demo | Module 6.4 idempotency lab |
| `GET /api/dashboard` | Multi-widget aggregation | Module 6.4 degradation labs |

## Middleware

| File | Purpose |
|------|---------|
| `middleware/cors.js` | Permissive CORS for lab HTML files |
| `middleware/delay.js` | Artificial latency (200-1500ms) |
| `middleware/errorSimulator.js` | Random 500s, 429s, timeouts |
| `middleware/rateLimit.js` | In-memory sliding window rate limiter |

## Database (auto-created on first run)

- `data.db` — SQLite with WAL mode
- Tables: products (10K), categories (10), users (20), posts (500), comments (2K), todos (50), tags (10)
