# 90. Request Deduplication

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Request deduplication** ensures that identical API calls made simultaneously or in rapid succession are collapsed into a single network request — multiple components asking for the same user profile at the same time should produce one HTTP request, not ten. Without deduplication, a page with five components each fetching the same resource trivially generates 5× server load with zero UX benefit. React Query deduplicates automatically within its cache layer — multiple `useQuery` calls with the same `queryKey` in the same render cycle share a single in-flight request. Understanding deduplication at the architecture level means knowing where it's handled (React Query, requests layer, service workers) and designing systems that naturally enable it rather than fighting it.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Deduplication Problem in Practice

```typescript
// Real scenario: Three components mount simultaneously
// They all need the current user's data

function Header() {
  const { data: user } = useUser(); // Fetches /api/users/me
}

function Sidebar() {
  const { data: user } = useUser(); // Also needs /api/users/me
}

function MainContent() {
  const { data: user } = useUser(); // Also needs /api/users/me
}

// Without deduplication: 3 GET /api/users/me requests
// With React Query deduplication: 1 GET /api/users/me request
```

### How React Query Deduplicates

```typescript
// React Query deduplication works at the queryKey level
// When multiple useQuery hooks share the same queryKey:
// 1. First hook fires the request
// 2. Subsequent hooks join the same in-flight promise
// 3. All hooks receive the same resolved data
// 4. Only 1 network request is made

export function useUser() {
  return useQuery({
    queryKey: ['user', 'me'],  // ← Key is the deduplication identifier
    queryFn: () => userApi.getMe(),
    staleTime: 5 * 60 * 1000,  // 5 min — also prevents re-fetch for this window
  });
}

// Internal React Query behavior (simplified):
class QueryClient {
  private queryCache = new Map<string, Query>();
  
  fetchQuery(key: string, fn: () => Promise<unknown>) {
    const cacheKey = JSON.stringify(key);
    let query = this.queryCache.get(cacheKey);
    
    if (query?.state === 'loading') {
      // 🔑 Deduplication: return the SAME promise to all callers
      return query.promise;
    }
    
    if (query?.state === 'fresh') {
      // Cache hit: return cached data without any request
      return query.data;
    }
    
    // Start a new request
    const promise = fn();
    this.queryCache.set(cacheKey, { state: 'loading', promise });
    
    return promise.then(data => {
      this.queryCache.set(cacheKey, { state: 'fresh', data });
      return data;
    });
  }
}
```

### Manual Request Deduplication (Without React Query)

```typescript
// When building your own caching layer
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>();
  
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If same request is already in-flight, return same promise
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing as Promise<T>; // All callers share this promise
    }
    
    const promise = fn().finally(() => {
      // Remove from pending once resolved (whether success or error)
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const deduplicator = new RequestDeduplicator();

// Multiple simultaneous callers get the same promise
async function getUser(id: string): Promise<User> {
  return deduplicator.dedupe(
    `user:${id}`,
    () => fetch(`/api/users/${id}`).then(r => r.json())
  );
}

// 10 simultaneous calls to getUser('123') → only 1 fetch request
const [u1, u2, u3] = await Promise.all([
  getUser('123'),
  getUser('123'),
  getUser('123'), // All three share the same in-flight promise
]);
```

### Deduplication with Cache Layer

```typescript
// Two levels: deduplication (in-flight) + caching (settled)
// Deduplication prevents duplicate in-flight requests
// Caching prevents redundant requests to fresh data

class ApiCache<T> {
  private inflight = new Map<string, Promise<T>>();
  private cache = new Map<string, { data: T; expiresAt: number }>();
  
  async get(key: string, fetcher: () => Promise<T>, ttl = 60000): Promise<T> {
    // Level 1: Check cache (no network call needed)
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    // Level 2: Check in-flight (join existing request)
    const pending = this.inflight.get(key);
    if (pending) {
      return pending; // Deduplication — join the in-flight request
    }
    
    // Level 3: Start new request
    const promise = fetcher().then(data => {
      this.cache.set(key, { data, expiresAt: Date.now() + ttl });
      this.inflight.delete(key);
      return data;
    }).catch(err => {
      this.inflight.delete(key); // Don't cache errors
      throw err;
    });
    
    this.inflight.set(key, promise);
    return promise;
  }
}
```

### GraphQL Batching as Deduplication

```typescript
// Apollo Client's batching: multiple component queries → 1 HTTP request
// This is deduplication + batching combined

import { BatchHttpLink } from '@apollo/client/link/batch-http';

const client = new ApolloClient({
  link: new BatchHttpLink({
    uri: '/graphql',
    batchMax: 10,       // Batch up to 10 queries
    batchInterval: 20,  // Wait 20ms to collect queries from a render cycle
  }),
  cache: new InMemoryCache(),
});

// Three components fetch different data in same render cycle:
// Component A: query { user { name } }
// Component B: query { products { id name } }
// Component C: query { notifications { count } }
// → Batched into: POST /graphql body: [queryA, queryB, queryC]
// → 1 HTTP request instead of 3
```

### Stale-While-Revalidate as Deduplication

```typescript
// SWR / React Query staleTime prevents re-fetching fresh data
// This is a form of temporal deduplication

const { data } = useQuery({
  queryKey: ['user', 'me'],
  queryFn: () => userApi.getMe(),
  staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
});

// Component mounts at T=0: fires request → data received
// Component remounts at T=3min: data is fresh (3min < 5min) → NO request
// Component remounts at T=6min: data is stale (6min > 5min) → background refetch

// Without staleTime (staleTime=0 by default):
// Every mount triggers a refetch — even if data is 1 second old
```

### Service Worker Request Deduplication

```typescript
// Service Worker can deduplicate at the network level
// All tabs of the same origin share the service worker

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(dedupedFetch(event.request));
  }
});

const inFlight = new Map<string, Promise<Response>>();

async function dedupedFetch(request: Request): Promise<Response> {
  const key = `${request.method}:${request.url}`;
  
  // GET requests can be deduplicated (idempotent)
  if (request.method === 'GET' && inFlight.has(key)) {
    const sharedResponse = await inFlight.get(key)!;
    return sharedResponse.clone(); // Clone required — response body can only be read once
  }
  
  const promise = fetch(request).then(response => {
    inFlight.delete(key);
    return response;
  });
  
  if (request.method === 'GET') {
    inFlight.set(key, promise);
  }
  
  return promise;
}
```

### Anti-Patterns & Pitfalls

**1. Using object literals as queryKey (breaks deduplication):**
```typescript
// ❌ New object on every render → different key every render → no dedup
function useUser(id: string) {
  return useQuery({
    queryKey: [{ type: 'user', id }], // Object reference is new each render
    // Wait — actually React Query serializes keys with JSON.stringify
    // So this IS deduplicated — React Query handles it!
  });
}

// ✅ React Query serializes queryKeys — this works:
queryKey: ['user', { id, type: 'premium' }]
// But keep keys immutable — don't include mutable refs or functions
```

**2. Calling queryClient.invalidateQueries too broadly:**
```typescript
// ❌ Invalidates everything -> kills deduplication
queryClient.invalidateQueries(); // Nukes all cache → all remounting components refetch

// ✅ Invalidate specific keys
queryClient.invalidateQueries({ queryKey: ['user', userId] });
```

**3. Not deduplicating in parallel API layer:**
```typescript
// ❌ Ten components call getUser(123) through your service layer
// Service layer makes 10 individual fetch calls
// React Query's deduplication only works through React Query hooks

// ✅ Use React Query for everything — don't bypass it with direct fetch calls
// OR implement your own RequestDeduplicator as shown above
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Facebook's DataLoader (Node.js Backend):**
- DataLoader batches + deduplicates database/API calls within a single request
- Design pattern origin: GraphQL resolvers calling db.getUser() per post author → 100+ DB calls
- DataLoader collects all calls within one tick, fires single batched query
- Frontend analog: requestAnimationFrame-batched fetches, Apollo BatchHttpLink

**React Query Deduplication (Documented):**
- Teams using React Query report 60-80% reduction in API calls on page load
- Dashboard with 15 components all sharing user/permissions data: 2 requests vs 15
- This is the primary "free performance win" documented in React Query docs

**SAP OData Batch Requests (Your Experience):**
- OData `$batch` endpoint combines multiple requests in one HTTP call
- UI5 SmartTable batches related entity reads automatically
- Equivalent to GraphQL batching — reduces waterfall to single round trip

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Request deduplication is the guarantee that a resource requested by multiple components simultaneously results in exactly one network call. React Query handles this automatically — if five components call useQuery with the same queryKey in the same render cycle, they all subscribe to a single in-flight request and share the resolved data.
>
> The mechanism is simple: React Query maintains a map of in-flight promises keyed by queryKey. When a useQuery hook fires, it checks the map; if a promise already exists for that key, it subscribes to it rather than starting a new request. When the promise resolves, all subscribers receive the data.
>
> Beyond in-flight deduplication, staleTime provides temporal deduplication — if data was fetched 3 minutes ago and staleTime is 5 minutes, remounting components use the cached data without firing any request. I set staleTime explicitly for every query rather than relying on the default of 0 (which would refetch on every component mount).
>
> For manual implementations outside React Query — say, in a Vanilla JS or Web Component context — I implement a RequestDeduplicator class that maintains a Map<string, Promise> of in-flight requests. Each unique URL gets one entry; multiple callers share that promise."

**Likely Follow-up Questions:**
- "How does React Query's queryKey serialization work for objects?" → JSON.stringify-based deep equality; `['user', { id: 1 }]` and `['user', { id: 1 }]` are the same key
- "Does deduplication work across browser tabs?" → No (without Service Worker); each tab has its own React Query cache. Service Worker can deduplicate at network level across tabs.
- "What about POST mutations?" → POST is not idempotent → deduplicate with caution; better to prevent double-submission via UI disable state

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three levels of deduplication:**
1. **In-flight** — Share the same Promise (React Query queryKey map)
2. **Cache** — staleTime prevents refetch for fresh data
3. **Batch** — Combine multiple queries into one HTTP request (Apollo BatchHttpLink, GraphQL)

If you blank: *"React Query: multiple useQuery calls with the same queryKey share one network request. They subscribe to the in-flight Promise rather than starting new ones."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Performance**: 15 API calls on page mount → 2 (with deduplication) → 7× server load reduction  
→ **UX**: No request queue saturation; critical requests aren't delayed by duplicate calls  
→ **Business**: Server cost directly proportional to request volume; deduplication is free optimization

**How it works:**
→ React Query maintains an in-memory map of `queryKey → Promise`. When multiple hooks request the same key, they all receive the same in-flight Promise. When it resolves, all subscribers update simultaneously. `staleTime` extends this to prevent refetching recently-resolved data. Manual implementations use a `Map<string, Promise>` with cleanup in `.finally()`.

**Company relevance:**
→ **Microsoft**: Teams page with many components — user presence, profile, permissions all deduplicated  
→ **Adobe**: Shared user/subscription status fetched by header, sidebar, and main content — 1 request  
→ **Salesforce**: Record page with many LWC components — `@wire` service deduplicates OData calls  
→ **Cisco**: Dashboard with multiple chart components showing device status — shared status requests
