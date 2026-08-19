# Chapter 6 — System Design, Coding, Database, API Questions

*Memory hook: **"Clarify → Estimate → High-level → Deep dive → Trade-offs."***

---

# Part A — System Design (Frontend-heavy)

## 6.A.1 The Design Interview Framework ⭐

**45-minute layout:**

| Phase | Time | What you do |
|---|---|---|
| Clarify | 5 min | Ask about scope, users, scale, must-have features |
| Estimate | 3 min | Users, RPS, storage, bandwidth |
| High-level | 10 min | Boxes-and-arrows on the whiteboard |
| Deep-dive | 20 min | Pick 2 components, go deep |
| Trade-offs | 5 min | What you gave up, what you'd do next |
| Q&A | 2 min | Interviewer's follow-ups |

**Rules:**
1. **Ask 5 clarifying questions before drawing anything.**
2. **Numbers > vibes.** "1M DAU, 100 QPS peak, 500KB average page" beats "large scale."
3. **Every choice = a trade-off.** State what you gave up.
4. **Draw big.** One box per component. Arrows show data flow, not code calls.
5. **Say the boring answer first** — "start with a monolith, split when you feel the pain" scores higher than premature microservices.

---

## 6.A.2 Design: A News Feed (Twitter/LinkedIn timeline)

**Clarify:** consumer scale? Ordering — chronological or ranked? Read-heavy or write-heavy? Media supported? Push or pull?

**Estimates:** 200M DAU, avg 50 posts/day read, 2 posts/day write → read:write = 25:1 → read-optimize.

**High-level:**
```
Client ──▶ CDN ──▶ Edge API ──▶ Timeline Service ──▶ Redis (feed cache)
                                        │
                                        └──▶ Post Service ──▶ Postgres (posts)
                                        └──▶ User Service ──▶ Postgres (users)
Media ──▶ S3 + CloudFront
```

**Deep dive — fan-out on write vs read:**
- **Fan-out on write** (push): when Alice tweets, precompute and push into each follower's feed. Fast reads, expensive writes for celebrities (Justin Bieber problem).
- **Fan-out on read** (pull): compute feed on request. Cheap writes, expensive reads.
- **Hybrid:** normal users → push; celebrity threshold → pull. This is what Twitter actually does.

**Frontend design:** infinite scroll with cursor-based pagination, virtualized list, image lazy-load with `IntersectionObserver`, optimistic UI for likes, WebSocket for new-post pill.

---

## 6.A.3 Design: A Real-Time Collaborative Editor (Google Docs / Figma-lite)

**Core problem:** multiple users editing the same doc, no conflicts.

**Two families of solutions:**
- **OT (Operational Transform)** — Google Docs. Transform incoming op against concurrent ops.
- **CRDT (Conflict-free Replicated Data Type)** — Yjs, Automerge. Commutative operations, converges without central authority.

**Architecture:**
```
Client (Y.Doc) ─ WS ─▶ Sync Server ─ Kafka ─▶ Persister ─▶ Postgres/S3
       ▲                     │
       └─── awareness ◀──────┘
```

**Deep-dive topics:**
- **Presence / cursors:** ephemeral state in a separate channel (awareness).
- **Undo:** local Y.UndoManager tracks per-user history.
- **Offline:** IndexedDB local persistence → sync on reconnect.

**Frontend:** ProseMirror / TipTap for text editing, Y.js for CRDT, Yjs-websocket-provider for transport.

---

## 6.A.4 Design: A Dashboard with 1000 Live Widgets (BI Launchpad-lite)

**Constraints:** each widget polls / streams data; page has up to 1000 widgets across tabs.

**Strategy:**
- **Virtualize** — only render widgets in viewport (`IntersectionObserver` or react-window).
- **Coalesce polling** — one shared poller, per-widget subscription. Don't let each widget open its own fetch.
- **Streaming updates** — WebSocket topic per dashboard, server pushes deltas.
- **Time-bucketing** — client renders every 200ms max, drops intermediate frames.
- **`content-visibility: auto`** on off-screen widgets — skips paint + layout.
- **Web Workers** for heavy chart computations (moving averages, aggregations).

**Backend:** aggregation service pre-computes rolled-up metrics; raw metrics in ClickHouse; queries served via cached results.

---

## 6.A.5 Design: A Real-Time Analytics Platform (mini-Datadog)

**Ingestion:** clients send events via HTTP `/collect` → Kafka → processors → time-series DB (InfluxDB, TimescaleDB, ClickHouse).
**Query:** dashboard app → query API → cached aggregations + on-demand.
**Frontend:** streaming charts (SSE), keyboard-navigable time picker, resampling logic client-side.

**Backpressure:** if the client is behind, server drops intermediate points and sends aggregates.

---

## 6.A.6 Design: A Chat App (Slack-lite)

**Key decisions:**
- Message ordering per channel: monotonic per-channel counter (Snowflake ID).
- Delivery guarantee: at-least-once. Client dedups by message ID.
- Reactions: `(msg_id, user_id, emoji)` — small denorm table.
- Presence: Redis + heartbeat.
- Search: Elasticsearch or OpenSearch, populated via CDC on message table.

**Frontend:** virtualized message list (bidirectional infinite scroll), optimistic send, offline queue with retry, service worker for background sync.

---

## 6.A.7 Design: A URL Shortener (bit.ly)

**Key insights:**
- Hash function or base62 counter — base62 wins for predictability + no collisions.
- Read heavy → aggressive CDN caching, HTTP 301 (permanent) for cacheability.
- Rate limiting on POST /shorten to prevent abuse.
- Analytics collected out-of-band (Kafka), never in the hot redirect path.

---

## 6.A.8 Design: Frontend Design System (very common for senior FE)

**Layers:**
1. **Design tokens** (color, spacing, radii, typography) — JSON, transformed by Style Dictionary to CSS vars, iOS, Android.
2. **Primitives** — headless, unstyled (Radix, Ariakit). Own accessibility.
3. **Styled components** — apply tokens to primitives (`Button`, `Modal`).
4. **Patterns** — composed (`FormRow`, `ConfirmDialog`).
5. **Docs** — Storybook + MDX.

**Distribution:** internal npm registry, versioned semver, changelog automated (changesets).
**Adoption strategy:** codemod for migrations, ESLint plugin to catch un-approved raw HTML.

---

## 6.A.9 Design: Micro-Frontend Shell

Refer to Ch 3 § 3.3 and Ch 2 § 2.23. When asked cold:

**5-minute answer skeleton:**
1. Shell app is the Module Federation host — owns routing, auth, shared UI, i18n.
2. Each MFE exposes a `remoteEntry.js` — shell dynamically imports at route time.
3. Shared dependencies (react, react-dom, design system) declared as singletons.
4. Auth: shell owns tokens, exposes a `useAuth()` hook via shared module.
5. Error boundaries wrap each MFE — failure isolation.
6. Deployment: each MFE has its own CDN entry + CI. Shell has an integration test that mounts all MFEs on staging.

---

## 6.A.10 Design Interview — Common Traps

- **Premature complexity.** Start monolith → identify pain → split.
- **No numbers.** Always state QPS, storage, RPS, bandwidth.
- **Ignoring the frontend.** As a senior FE, own the client architecture, not just "call an API."
- **Missing failure modes.** Every component: what if it dies? every dep: what if it's slow?
- **No trade-offs.** Every choice must have a "gave up X."
- **Framework worship.** No "I'd use Next.js" without why.

---

# Part B — Coding Questions (JS-focused)

## 6.B.1 Frontend Coding — The 15 Must-Know Patterns

**Bookmark these. Practice on paper.**

### 1. Debounce ⭐
```js
function debounce(fn, delay) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```
*Use for search input, resize handler.*

### 2. Throttle ⭐
```js
function throttle(fn, limit) {
  let inCooldown = false;
  return function throttled(...args) {
    if (inCooldown) return;
    fn.apply(this, args);
    inCooldown = true;
    setTimeout(() => (inCooldown = false), limit);
  };
}
```
*Use for scroll, mousemove.*

### 3. Deep Clone
```js
// 2026: use built-in
const clone = structuredClone(obj);
// Legacy fallback:
function deepClone(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deepClone);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClone(x)]));
}
```

### 4. Custom `Promise.all`
```js
function myAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let done = 0;
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        v => { results[i] = v; if (++done === promises.length) resolve(results); },
        reject
      );
    });
    if (promises.length === 0) resolve([]);
  });
}
```

### 5. Promise Pool / Concurrency Limit
```js
async function pool(tasks, size) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= size) await Promise.race(executing);
  }
  return Promise.all(results);
}
```

### 6. Retry with Backoff
```js
async function retry(fn, attempts = 3, delay = 500) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === attempts - 1) throw e;
      const wait = delay * 2 ** i + Math.random() * 100;
      await new Promise(r => setTimeout(r, wait));
    }
  }
}
```

### 7. Event Emitter
```js
class EventEmitter {
  #listeners = new Map();
  on(event, fn)   { (this.#listeners.get(event) ?? this.#listeners.set(event, new Set()).get(event)).add(fn); return () => this.off(event, fn); }
  off(event, fn)  { this.#listeners.get(event)?.delete(fn); }
  emit(event, ...args) { this.#listeners.get(event)?.forEach(fn => fn(...args)); }
}
```

### 8. Currying
```js
function curry(fn) {
  return function curried(...args) {
    return args.length >= fn.length
      ? fn.apply(this, args)
      : (...next) => curried.apply(this, [...args, ...next]);
  };
}
```

### 9. Flatten Array (deep)
```js
const flatten = arr => arr.flat(Infinity);
// From scratch:
const flat = arr => arr.reduce((a, v) => a.concat(Array.isArray(v) ? flat(v) : v), []);
```

### 10. `Object.freeze` (deep)
```js
function deepFreeze(o) {
  Object.freeze(o);
  Object.values(o).forEach(v => v && typeof v === 'object' && !Object.isFrozen(v) && deepFreeze(v));
  return o;
}
```

### 11. Memoize
```js
function memoize(fn) {
  const cache = new Map();
  return function memoized(...args) {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn.apply(this, args));
    return cache.get(key);
  };
}
```

### 12. LRU Cache
```js
class LRU {
  constructor(cap) { this.cap = cap; this.m = new Map(); }
  get(k) {
    if (!this.m.has(k)) return -1;
    const v = this.m.get(k);
    this.m.delete(k); this.m.set(k, v);
    return v;
  }
  put(k, v) {
    if (this.m.has(k)) this.m.delete(k);
    else if (this.m.size >= this.cap) this.m.delete(this.m.keys().next().value);
    this.m.set(k, v);
  }
}
```

### 13. `useDebouncedState` (React hook)
```jsx
function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

### 14. Virtual List (concept)
```jsx
function VirtualList({ items, rowHeight, height }) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.floor(scrollTop / rowHeight);
  const visible = Math.ceil(height / rowHeight) + 2;
  const end = Math.min(items.length, start + visible);
  return (
    <div style={{ height, overflowY: 'auto' }} onScroll={e => setScrollTop(e.target.scrollTop)}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {items.slice(start, end).map((item, i) => (
          <div key={start + i} style={{ position: 'absolute', top: (start + i) * rowHeight, height: rowHeight }}>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 15. Cancellable Fetch (AbortController)
```js
async function fetchJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
// usage
const ac = new AbortController();
fetchJSON('/api', ac.signal).catch(e => e.name === 'AbortError' && console.log('cancelled'));
ac.abort();
```

---

## 6.B.2 DSA (JS) — The 30 Patterns to Know

**Frontend interviews rarely ask hard DP.** They ask:
- Arrays / strings
- Hash maps
- Two pointers, sliding window
- BFS / DFS on trees & graphs
- Stack (parentheses, monotonic)
- Recursion + memoization
- Simple heap (top-K)
- Basic backtracking

### Highest-ROI patterns for FE interviews

**Sliding window:** longest substring without repeats, min-size subarray sum ≥ k.
**Two pointers:** two-sum sorted, three-sum, container with most water.
**Hash map counting:** anagrams, subarray sum equals k.
**Stack:** valid parens, min stack, daily temperatures.
**BFS on grid / tree:** shortest path, level-order.
**DFS + memo:** climb stairs, word break, path count.
**Top-K:** heap-of-K, quickselect.
**Backtracking:** permutations, combinations, N-queens (rare).

**Rule:** Master **~50 medium LeetCode** > grind 500. FE interviewers pick 1–2 problems that reveal thinking, not knowledge.

---

## 6.B.3 JS Trick Questions ⭐🔥

**Q: Predict output.**
```js
[1, 2, 3].map(parseInt);
```
**A:** `[1, NaN, NaN]`. `parseInt(value, index)` — index becomes radix. `parseInt(1, 0)` = 1, `parseInt(2, 1)` = NaN, `parseInt(3, 2)` = NaN.

**Q: What's `this`?**
```js
const obj = {
  name: 'a',
  regular: function() { return this.name; },
  arrow: () => this.name,
};
obj.regular();  // 'a'
obj.arrow();    // undefined (arrow doesn't bind this)
```

**Q: Hoisting.**
```js
console.log(a);     // undefined (var hoisted)
console.log(b);     // ReferenceError (let in TDZ)
var a = 1;
let b = 2;
```

**Q: Closure trap.**
```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
// 3, 3, 3
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
// 0, 1, 2 (let creates a new binding per iteration)
```

**Q: Event loop order.**
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
queueMicrotask(() => console.log('D'));
console.log('E');
// A, E, C, D, B  (sync → microtasks (C, D) → macrotask (B))
```

---

# Part C — Database Questions

## 6.C.1 SQL Basics ⭐

**Joins — visualize as sets:**
- INNER — intersection.
- LEFT — everything from left, matches from right.
- RIGHT — mirror of LEFT.
- FULL — union.
- CROSS — cartesian product (avoid).

**GROUP BY rule:** every column in SELECT must be in GROUP BY or an aggregate.

**Indexes:**
- **B-tree** — default, good for `=`, `<`, `>`, `BETWEEN`, `LIKE 'prefix%'`.
- **Hash** — `=` only.
- **Partial** — index a subset (`WHERE active=true`).
- **Composite** — `(a, b)` covers `WHERE a=?` and `WHERE a=? AND b=?`, but NOT `WHERE b=?`.
- **Covering** — includes all columns SELECT needs — no heap lookup.

**N+1 problem:** for each row in table A, run a separate query to fetch related rows in B. Fix: JOIN, DataLoader-style batching, or `IN` clause.

**Query optimization:** `EXPLAIN ANALYZE` reveals plan + actual timing. Look for seq scans on big tables.

---

## 6.C.2 NoSQL vs SQL — When?

- **SQL (Postgres, MySQL):** relational data, ACID, complex joins, reporting.
- **Document (Mongo, DynamoDB):** flexible schema, denormalized, single-key access patterns.
- **Key-value (Redis):** cache, sessions, ephemeral counters.
- **Time-series (Timescale, InfluxDB, ClickHouse):** metrics, telemetry, high-cardinality.
- **Search (Elasticsearch, OpenSearch):** full-text, faceted queries.

**2026 default:** **Postgres for anything that needs a database. JSONB gives you document features when needed.**

---

## 6.C.3 ACID vs BASE

**ACID:** Atomicity, Consistency, Isolation, Durability. Traditional SQL.
**BASE:** Basically Available, Soft state, Eventual consistency. Distributed NoSQL.

**CAP theorem:** in a network partition, you must choose between Consistency and Availability. (Partition tolerance is not optional in distributed systems.)

**Isolation levels:**
- Read Uncommitted — dirty reads OK (rare).
- Read Committed — no dirty reads. Postgres default.
- Repeatable Read — same query returns same result within a txn. MySQL InnoDB default.
- Serializable — full isolation, worst throughput.

---

## 6.C.4 Common Interview Query Problems

**"Second highest salary."**
```sql
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
-- OR
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC OFFSET 1 LIMIT 1;
```

**"Employees with more than the average salary of their department."**
```sql
SELECT e.* FROM employees e
JOIN (SELECT dept_id, AVG(salary) avg_s FROM employees GROUP BY dept_id) d
  ON e.dept_id = d.dept_id
WHERE e.salary > d.avg_s;
```

**"Find duplicates."**
```sql
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```

**"Consecutive dates."** → use `ROW_NUMBER()` window + date - row_number to detect groups.

---

# Part D — API Questions

## 6.D.1 REST vs GraphQL vs gRPC vs tRPC

| Style | Best for | Trade-off |
|---|---|---|
| **REST** | Public APIs, CRUD, HTTP caching | Over/under-fetch, versioning drama |
| **GraphQL** | Client-heavy apps, mobile bandwidth | N+1, caching complex, learning curve |
| **gRPC** | Internal service-to-service, low latency, streaming | Binary, no browser without proxy |
| **tRPC** | TS-only monorepo, type end-to-end | Locked to TS on server + client |

## 6.D.2 API Design Checklist ⭐

For any API you design in an interview:
- [ ] **Versioning** — URL (`/v1`) or header
- [ ] **Auth** — Bearer JWT or session cookie
- [ ] **Idempotency** — POST needs Idempotency-Key
- [ ] **Pagination** — cursor, not offset (except admin)
- [ ] **Errors** — RFC 7807 problem+json + trace ID
- [ ] **Rate limiting** — 429 with Retry-After
- [ ] **Caching** — ETag + Last-Modified for GET
- [ ] **CORS** — explicit allowlist, no `*` for credentialed
- [ ] **Docs** — OpenAPI 3.1
- [ ] **Deprecation** — Sunset header + long-lived old version

## 6.D.3 Idempotency — Explain like I'm 5

- **Idempotent:** calling twice = same result as calling once. `GET`, `PUT`, `DELETE`.
- **Non-idempotent:** `POST /orders` — twice creates two orders.
- **Fix for POST:** client sends `Idempotency-Key: uuid`. Server stores (key, result) for 24h. Retry with same key returns the stored result.

## 6.D.4 HTTP Status Codes — Know These Cold

- **200** OK
- **201** Created
- **204** No Content
- **301** Moved Permanently (cacheable)
- **302** Found (temp)
- **304** Not Modified (ETag/If-None-Match match)
- **400** Bad Request (schema fail)
- **401** Unauthorized (no auth)
- **403** Forbidden (auth OK, no permission)
- **404** Not Found
- **409** Conflict (concurrent update, resource state)
- **410** Gone (permanently deleted)
- **422** Unprocessable Entity (validation fail, RFC-terminology-wise 400 is fine too)
- **429** Too Many Requests
- **500** Internal Server Error
- **502** Bad Gateway
- **503** Service Unavailable
- **504** Gateway Timeout

## 6.D.5 CORS Deep Dive ⭐🔥

**What:** browser same-origin policy blocks cross-origin `fetch` unless server opts in.

**Preflight (OPTIONS):** browser sends before real request when method != simple (GET/POST) or headers non-simple. Server responds with `Access-Control-Allow-*`.

**Key headers:**
- `Access-Control-Allow-Origin: https://example.com` — never `*` if credentials are used.
- `Access-Control-Allow-Credentials: true` — allow cookies.
- `Access-Control-Allow-Methods` / `-Headers` — whitelist.
- `Access-Control-Max-Age` — cache preflight, seconds.

**Common bugs:**
- `*` with credentials → browser blocks.
- Missing headers → confusing "CORS error" — actually the server didn't respond correctly.
- Preflight cached, then server changes headers → stale — bump the resource URL.

## 6.D.6 REST — 5 Common Traps

1. **Verbs in URLs** — bad: `POST /getUser`; good: `GET /users/:id`.
2. **DELETE with body** — many gateways strip. Use querystring or POST /delete-request.
3. **Non-idempotent PUT** — PUT must fully replace; PATCH for partial.
4. **200 for errors** — never. Use 4xx / 5xx correctly.
5. **Password in URL query** — logged everywhere. Body or header only.

---

Next → **Chapter 7 — Cloud / Security / Perf / Testing / Incidents.**
