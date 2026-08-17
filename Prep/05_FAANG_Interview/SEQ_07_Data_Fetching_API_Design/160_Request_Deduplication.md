# 160. Request Deduplication
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Request deduplication ensures that when multiple parts of the application simultaneously request the same resource, only one HTTP request is made instead of N identical requests. The most common scenario: a React page mounts 5 components that all call `useQuery(['user', userId])` — without deduplication that's 5 GET requests; with deduplication, it's 1 request that all 5 subscribers share. TanStack Query implements this by default: all queries with the same `queryKey` that are initiated within the same synchronous render cycle share a single in-flight request. The same principle applies to manual request stacks: maintain a Map of `url → Promise` for in-flight requests; if a request for the same URL is already in-flight, return the existing Promise instead of starting a new one. Beyond framework-level deduplication, HTTP-layer deduplication via `GET` caching, `ETag`, and `If-None-Match` reduces redundant data transfer even across page visits.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### TanStack Query's Built-in Deduplication

```typescript
// Scenario: Dashboard mounts 5 components simultaneously
// All 5 call the same user query

// Header.tsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

// Sidebar.tsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

// ProfileBadge.tsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

// ActivityFeed.tsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

// Notifications.tsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: fetchUser });

// RESULT WITH TanStack Query:
// → 1 HTTP request (not 5)
// → All 5 components subscribe to the same cache entry
// → All 5 re-render simultaneously when the 1 request resolves
// → If cache is stale, only 1 background refresh fires (not 5)

// HOW: TanStack Query uses queryKey as a Map<string, Observer[]>
// When a second useQuery with the same key mounts while the first is in-flight:
//   queryClient.cache.get(hashedKey).state.fetchStatus === 'fetching'
//   → new observer subscribes to existing query, no new fetch initiated
```

### Manual Deduplication (Outside TanStack Query)

```typescript
// For situations where you need deduplication without TanStack Query
// (e.g., in a global analytics module, a custom hook library, SSR prefetch logic)

class RequestDeduplicator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const key = this.buildKey(url, options);

    // Check if request is already in-flight
    const existingRequest = this.inFlight.get(key);
    if (existingRequest) {
      return existingRequest as Promise<T>;  // Return existing promise (share result)
    }

    // Create new request
    const request = fetch(url, options)
      .then(res => {
        if (!res.ok) throw new ApiError(res.status, res.statusText);
        return res.json() as Promise<T>;
      })
      .finally(() => {
        this.inFlight.delete(key);  // Remove from Map when settled (success or error)
      });

    this.inFlight.set(key, request);
    return request;
  }

  private buildKey(url: string, options?: RequestInit): string {
    // Key = URL + serialized body (for POST deduplication, though rare)
    return options?.body ? `${url}:${JSON.stringify(options.body)}` : url;
  }
}

const deduplicator = new RequestDeduplicator();

// Usage — multiple simultaneous calls for the same URL get 1 HTTP request
async function getUserProfile(userId: string) {
  return deduplicator.fetch<UserProfile>(`/api/users/${userId}`);
}

// If 5 components call this simultaneously:
// → First call creates the Promise and adds to Map
// → Calls 2-5 find the existing Promise and return it
// → HTTP request fires once; all 5 callers get the same result
```

### SWR's Deduplication

```typescript
// SWR (Vercel) deduplicates by key within a configurable time window (200ms by default)
// Even requests that don't overlap exactly in time are deduplicated

import useSWR from 'swr';

// SWR config — deduplicate interval
const swrConfig = {
  dedupingInterval: 2000,  // In milliseconds — requests within 2s window are deduplicated
  // Default is 2000ms, meaning the same resource won't refetch more than once per 2 seconds
};

function UserAvatar({ userId }: { userId: string }) {
  const { data: user } = useSWR(`/api/users/${userId}`, fetcher, swrConfig);
  return <Avatar src={user?.avatar} name={user?.name} />;
}

// Multiple components using same key + dedupingInterval = 2s:
// 09:00:000 - Component A mounts → fires request
// 09:00:050 - Component B mounts → same key, same request still pending → deduplicated
// 09:00:200 - Component C mounts → request finished but within 2s window → no new request (serves from cache)
// 09:02:001 - Component D mounts → outside 2s window → fires new request
```

### Apollo Client Deduplication

```typescript
// Apollo Client deduplicates identical in-flight queries by default
// Two identical queries (same query string + same variables) = 1 HTTP request

// Apollo's deduplication works at the link level:
// If a query is currently in-flight and an identical query is initiated:
// → The new query subscribes to the existing in-flight operation
// → When the response arrives, both query observers update simultaneously

const client = new ApolloClient({
  link: new HttpLink({
    uri: '/graphql',
    // fetchOptions: { }, ← Apollo deduplicates by default; no config needed
  }),
  cache: new InMemoryCache(),
});

// Mutation deduplication: Apollo does NOT deduplicate mutations (unlike queries)
// Reason: mutations have side effects; duplicating them would cause duplicate writes
// Always handle mutation deduplication manually if needed (disabled button, loading state)
```

### HTTP Cache — ETag and Conditional Requests

```typescript
// ETag: server sends a content hash in the response header
// ETag: "abc123"
// Client stores this alongside the cached response

// Next request: client sends the ETag back
// If-None-Match: "abc123"
// Server checks: has the resource changed since "abc123"?
//   No change → 304 Not Modified (empty body, no data transfer)
//   Changed → 200 with new body and new ETag

// Implementation in HttpClient:
class ETagHttpClient {
  private readonly etagCache = new Map<string, string>();       // url → etag
  private readonly responseCache = new Map<string, unknown>(); // url → body

  async get<T>(url: string, signal?: AbortSignal): Promise<T> {
    const cachedEtag = this.etagCache.get(url);
    const headers: HeadersInit = { 'Accept': 'application/json' };

    if (cachedEtag) {
      headers['If-None-Match'] = cachedEtag;
    }

    const response = await fetch(url, { signal, headers });

    if (response.status === 304) {
      // Not modified — return cached response (no data transfer, just header round trip)
      return this.responseCache.get(url) as T;
    }

    if (!response.ok) throw new ApiError(response.status, response.statusText);

    const newEtag = response.headers.get('ETag');
    if (newEtag) {
      this.etagCache.set(url, newEtag);
    }

    const data = await response.json() as T;
    this.responseCache.set(url, data);
    return data;
  }
}

// Result: after first fetch, subsequent fetches for unchanged data
// send only the ETag header round trip (tiny) → 304 → return cached data
// Zero body data transfer when resources haven't changed
```

### Mutation Deduplication

```typescript
// Problem: user double-clicks a submit button → 2 identical mutations in-flight
// → 2 orders created, 2 payments charged, 2 emails sent

// Solution A: Disable button during in-flight mutation (simplest)
function SubmitOrderButton() {
  const { mutate: submitOrder, isPending } = useMutation({
    mutationFn: api.orders.submit,
  });

  return (
    <button
      onClick={() => submitOrder(orderData)}
      disabled={isPending}  // Prevents double-click
      aria-busy={isPending}
    >
      {isPending ? 'Submitting…' : 'Submit Order'}
    </button>
  );
}

// Solution B: React useTransition (batches rapid state changes, reduces double submissions)
// Solution C: Idempotency key per render — same key = server deduplicates
function useIdempotentMutation<T, V>(
  mutationFn: (variables: V, idempotencyKey: string) => Promise<T>
) {
  const idempotencyKey = useRef(crypto.randomUUID());  // Stable per component mount

  const mutation = useMutation({
    mutationFn: (variables: V) => mutationFn(variables, idempotencyKey.current),
    onSuccess: () => {
      // Generate new key for potential future re-use
      idempotencyKey.current = crypto.randomUUID();
    },
  });

  return mutation;
}
```

### ⚠️ Anti-Patterns

- **Separate query keys for the same data** — `['user', userId]` in some components and `['currentUser']` in others when both refer to the same user; TanStack Query can't deduplicate across different keys; standardize queryKey naming conventions

- **Deduplicating mutations** — a mutation deduplicator that returns the same Promise for duplicate submits may appear to work, but if the first submit fails and the user re-submits, the deduplicator may return the cached failed Promise rather than starting a new request; only deduplicate reads

- **Not cleaning up the in-flight Map on error** — the manual deduplicator above calls `.finally(() => inFlight.delete(key))`; forgetting this means a failed request stays in the Map forever; all subsequent requests for that URL get the same rejected Promise

- **Over-broad deduplication keys** — deduplicating `/api/products` without considering query parameters means `/api/products?category=A` and `/api/products?category=B` get the same response; always include the full URL (with query string) in the deduplication key

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the navigation sidebar, the page header, and the permission guard all called the same `/api/current-user` endpoint on page load. Without deduplication: 3 requests on every page navigation × thousands of daily users = significant backend load. After migrating to TanStack Query with a shared `queryKey: ['currentUser']`, the 3 components shared 1 in-flight request and 1 cached response. Auth API request count dropped 67%.

**At FAANG scale:**
- **Microsoft:** Microsoft Graph API calls in SharePoint web parts — each web part called `GET /me` independently; after migrating to a global Graph client with in-flight Map deduplication, `GET /me` fired once per page load regardless of how many web parts existed; Azure AD token count and Graph API quota usage dropped proportionally
- **Adobe:** Adobe Analytics beacon deduplication — same page view event triggered by 3 independent GTM triggers; deduplicator with 50ms window prevents triple-counting in A/B test results; deduplication key = `eventType + pageUrl + timestamp.toFixed(-2)` (rounded to 100ms)
- **Salesforce:** LWC (Lightning Web Components) — built-in wire adapter deduplication; multiple components on the same record page using `@wire(getRecord, { recordId })` share a single server call; the platform-level deduplication is transparent to developers
- **Cisco:** Telemetry data collection — device status polled by multiple dashboard widgets; deduplication at the subscription level: widgets subscribe to a shared observable, not individual HTTP calls; only one polling interval fires per device regardless of viewer count

---

## 💬 4. Interview Execution

### Sample Answer

> "Request deduplication solves a specific multiplicity problem: when N parts of the UI ask for the same data simultaneously, only 1 HTTP request should be made. TanStack Query handles this automatically — every query with the same key that's initiated while another is in-flight subscribes to the existing promise rather than starting a new one.
>
> Outside TanStack Query, the pattern is a Map from URL to in-flight Promise. When a request comes in: check the Map. If a Promise is already there, return it. If not, create the fetch Promise, put it in the Map, attach a `.finally(() => map.delete(key))` to clean up, and return it. Multiple callers in the same event loop tick all get the same Promise and all receive the same resolved value.
>
> The critical housekeeping is removing failed requests from the Map — if you don't, the Map permanently holds a rejected Promise and every future request for that URL immediately rejects instead of retrying.
>
> For HTTP-level deduplication, ETags and conditional requests are the right tool — `If-None-Match` sends the hash of the last response; if data hasn't changed, the server returns 304 with no body, saving bandwidth even for requests that can't be deduplicated in-memory (e.g., different browser tabs)."

### Likely Follow-up Questions
1. "How does TanStack Query's deduplication work internally?" → TanStack Query hashes the `queryKey` array to a string key, stores a `Query` object in a Map, and tracks observers (useQuery subscriptions) per Query. When `queryFn` is in-flight (`fetchStatus: 'fetching'`), adding a new observer does not call `queryFn` again — the observer is added to the subscriber list and will receive the result when the single in-flight request resolves
2. "Can you deduplicate mutations?" → Technically yes via an in-flight Map, but it's usually wrong — mutations have side effects. If two submissions fire, the deduplicator returns the same Promise (only one HTTP request), but if the user intentionally submitted twice (e.g., form re-submitted after an error), the second submission silently disappears. The right approach for mutations is preventing duplicates at the interaction level: disable the button while `isPending`
3. "What's the difference between deduplication and caching?" → Caching stores the response and serves it without a network request for a configurable "fresh" period (staleTime). Deduplication prevents sending duplicate in-flight requests — it operates on concurrent requests, not past responses. TanStack Query uses both: deduplication prevents N concurrent requests; staleTime prevents refetching recently-loaded data

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production deduplicator with proper error handling and TTL

class RequestDeduplicator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async fetch<T>(
    url: string,
    init?: RequestInit & { signal?: AbortSignal }
  ): Promise<T> {
    const key = this.buildKey(url, init);

    // Return existing in-flight promise if available
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    // Start new request
    const promise = this.executeRequest<T>(url, init).finally(() => {
      this.inFlight.delete(key);  // Always clean up, success or error
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  private async executeRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json() as Promise<T>;
  }

  private buildKey(url: string, init?: RequestInit): string {
    // Method + URL (+ body for POST deduplication if needed)
    const method = init?.method?.toUpperCase() ?? 'GET';
    return `${method}:${url}`;
  }

  // For testing — expose pending count
  get pendingCount(): number {
    return this.inFlight.size;
  }
}

// Module-level singleton — shared across all callers in the app
export const deduplicator = new RequestDeduplicator();
```

---

## 🧠 6. Memory Aid

**DCE — deduplication principle:**
- **D**etect: same queryKey / same URL = same resource
- **C**ollect: subscribe to existing in-flight Promise (don't start a new one)
- **E**vict: remove from Map in `.finally()` so failed requests can be retried

**"One musician, many listeners":**  
A concert hall doesn't play the same song N times because N people bought tickets. One performance, all listeners hear it simultaneously. Request deduplication is the same: one HTTP request, all subscribers receive the response.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Without deduplication, a page with 5 components all needing the same user data on mount fires 5 `GET /me` requests — each requiring auth validation, database lookup, and serialization on the server; the 5× load is entirely avoidable and scales with component tree depth and user count; TanStack Query's transparent deduplication is one of its most significant performance features
→ The cleanup discipline (`.finally(() => map.delete(key))`) prevents a subtle but serious bug: a failed request permanently poisoning the deduplication Map, causing all future requests for that URL to silently get a rejected Promise instead of a new attempt; this typically manifests as "my data never loads after the first error"
→ HTTP-level deduplication (ETag/If-None-Match) operates at a different layer than in-memory deduplication — it doesn't prevent the network round trip but eliminates body data transfer for unchanged resources; particularly valuable for large payloads that are polled frequently (dashboards, status feeds)

**How it works (2 sentences):**
TanStack Query's deduplication works at the QueryCache level — when `queryFn` begins executing for a given `queryKey`, the query's `fetchStatus` is set to `'fetching'`; any subsequent `useQuery` with the same key that subscribes during this window creates an Observer that registers on the existing Query object without calling `queryFn`, and when the in-flight promise settles, all registered Observers receive the result via a notification dispatch.
Manual deduplication uses a `Map<string, Promise>` as a registry of URLs currently being fetched — the first caller creates the Promise and stores it in the Map; subsequent callers for the same URL retrieve the stored Promise and `await` it, receiving the same resolved value; the `.finally()` handler removes the entry so the Map never contains settled Promises (settled Promises can no longer be used for deduplication, only for error cases where we'd want a fresh fetch).

---
✅ Topic 160/486 complete → Continuing to Topic 161: Client-Side Rate Limiting
