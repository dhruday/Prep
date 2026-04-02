# 156. Parallel vs Sequential API Calls
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Parallel API calls fire multiple requests simultaneously and wait for all (or any) to complete — total time equals the slowest single request. Sequential calls fire one request, wait for the response, then use that data to fire the next — total time equals the sum of all individual request times. The performance difference is dramatic: 3 parallel requests each taking 300ms complete in ~300ms total; the same 3 requests sequentially take ~900ms. The key architecture discipline is identifying which calls are truly dependent (sequential is unavoidable) vs which calls are unnecessarily sequential because they were written linearly (a common anti-pattern). In React, `Promise.all`, TanStack Query's `useQueries`, and GraphQL data fetching as a single query are the three primary mechanisms for eliminating unnecessary request waterfalls.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Waterfall Anti-Pattern

```typescript
// ❌ SEQUENTIAL — each await blocks the next fetch
// Total time: 200ms + 400ms + 300ms = 900ms
async function loadDashboardSlow(userId: string) {
  const user = await api.users.getById(userId);           // 200ms
  const permissions = await api.permissions.getByUserId(userId); // 400ms
  const preferences = await api.preferences.getByUserId(userId); // 300ms
  // All 3 are independent — none depends on the others' responses
  return { user, permissions, preferences };
}

// ✅ PARALLEL — all 3 fire simultaneously
// Total time: max(200ms, 400ms, 300ms) = 400ms (56% faster)
async function loadDashboardFast(userId: string) {
  const [user, permissions, preferences] = await Promise.all([
    api.users.getById(userId),
    api.permissions.getByUserId(userId),
    api.preferences.getByUserId(userId),
  ]);
  return { user, permissions, preferences };
}
```

### True Sequential Dependency

```typescript
// Sequential is CORRECT here — each step depends on the previous response
async function loadOrderDetails(orderId: string) {
  // Step 1: Get order (need order.userId and order.productIds from this response)
  const order = await api.orders.getById(orderId);          // MUST come first

  // Step 2: These both depend on step 1's response, but not on each other
  //         → run them in PARALLEL
  const [user, products] = await Promise.all([
    api.users.getById(order.userId),                         // needs order.userId
    api.products.getByIds(order.productIds),                 // needs order.productIds
  ]);

  // Step 3: Depends on step 2's products
  const inventory = await api.inventory.getByProductIds(
    products.map(p => p.id)
  );

  return { order, user, products, inventory };
}
// Time: step1 (300ms) + max(step2a, step2b) (200ms) + step3 (150ms) = 650ms
// vs naïve sequential: 300 + 100 + 200 + 150 = 750ms
// Parallelizing the independent step 2 saves 100ms
```

### Promise.all vs Promise.allSettled

```typescript
// Promise.all: FAILS FAST — if ANY request rejects, the whole call rejects
// Promise.allSettled: WAITS ALL — all promises settle; reports individual success/failure

// Use Promise.all when:
//   All results are required to render the page — one failure = page can't display
async function loadProductPage(id: string) {
  const [product, relatedProducts] = await Promise.all([
    api.products.getById(id),
    api.products.getRelated(id),
  ]);
  // If either fails, throw and show error page
  return { product, relatedProducts };
}

// Use Promise.allSettled when:
//   Results are independent optional data sources — show what succeeded, gray out what failed
async function loadDashboardWithPartialFailure(userId: string) {
  const results = await Promise.allSettled([
    api.users.getProfile(userId),
    api.analytics.getSummary(userId),     // Optional — analytics can be down
    api.notifications.getCount(userId),    // Optional — non-critical
    api.announcements.getActive(),         // Optional — informational only
  ]);

  return {
    profile: results[0].status === 'fulfilled' ? results[0].value : null,
    analytics: results[1].status === 'fulfilled' ? results[1].value : null,
    notificationCount: results[2].status === 'fulfilled' ? results[2].value : null,
    announcements: results[3].status === 'fulfilled' ? results[3].value : null,
    hasPartialFailure: results.some(r => r.status === 'rejected'),
    errors: results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason),
  };
}
```

### TanStack Query — `useQueries` for Dynamic Parallel Fetching

```typescript
// useQuery: one query — static
// useQueries: N queries in parallel — dynamic (N determined at runtime)

// Fetching N products where N is unknown at compile time
function ProductComparison({ productIds }: { productIds: string[] }) {
  const productQueries = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['product', id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.products.getById(id, signal),
      staleTime: 5 * 60_000,
    })),
    // combine: aggregate all results into a single value
    combine: (results) => ({
      products: results
        .filter(r => r.status === 'success')
        .map(r => r.data),
      isLoading: results.some(r => r.isPending),
      isAllSuccess: results.every(r => r.status === 'success'),
      errors: results
        .filter(r => r.status === 'error')
        .map(r => ({ error: r.error })),
    }),
  });

  if (productQueries.isLoading) return <ComparisonSkeleton count={productIds.length} />;

  return (
    <ComparisonTable
      products={productQueries.products}
      hasPartialFailure={productQueries.errors.length > 0}
    />
  );
}
```

### Suspense-Based Parallel Fetching (React 18)

```typescript
// With Suspense: each child component can initiate its own query
// They all fire in parallel — React suspends the tree until all resolve

// React Server Components: parallel data fetching with Promise.all at the server
async function DashboardPage({ params }: { params: { userId: string } }) {
  const { userId } = params;

  // ✅ All 3 start simultaneously — Promise.all eliminates the waterfall
  const [userPromise, statsPromise, activityPromise] = [
    api.users.getById(userId),
    api.stats.getByUserId(userId),
    api.activity.getRecent(userId),
  ];

  // Await them together
  const [user, stats, activity] = await Promise.all([
    userPromise, statsPromise, activityPromise,
  ]);
  // Total time: max of the three, not sum

  return (
    <Dashboard user={user} stats={stats} activity={activity} />
  );
}

// With TanStack Query Suspense mode:
function UserProfile({ userId }: { userId: string }) {
  // These two queries fire in parallel because they're in the same render cycle
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  });
  const { data: repos } = useSuspenseQuery({
    queryKey: ['repos', userId],
    queryFn: () => api.repos.getByUserId(userId),
  });
  // Both fire simultaneously — useSuspenseQuery batches parallel queries in the same render
  return <Profile user={user} repos={repos} />;
}
```

### Race Condition: Parallel + Same Resource

```typescript
// Problem: parallel mutations on the same resource create race conditions

// Example: user clicks "approve" and "reject" in rapid succession
// → Two PATCH /orders/:id requests fire simultaneously
// → Last response wins — could be the stale one

// Solution A: Disable the button after first click (optimistic lock)
function OrderActions({ orderId }: { orderId: string }) {
  const { mutate: approve } = useMutation({
    mutationFn: () => api.orders.approve(orderId),
    onSuccess: () => queryClient.invalidateQueries(['order', orderId]),
  });
  const { mutate: reject } = useMutation({
    mutationFn: () => api.orders.reject(orderId),
    onSuccess: () => queryClient.invalidateQueries(['order', orderId]),
  });

  const [isActioning, setIsActioning] = useState(false);

  return (
    <div>
      <Button
        onClick={() => { setIsActioning(true); approve(); }}
        disabled={isActioning}  // ← Prevents parallel mutation
      >Approve</Button>
      <Button
        onClick={() => { setIsActioning(true); reject(); }}
        disabled={isActioning}
      >Reject</Button>
    </div>
  );
}

// Solution B: Backend idempotency key (all requests for the same action share a key)
const approveOrder = async (orderId: string, idempotencyKey: string) => {
  return api.orders.approve(orderId, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
};
```

### Concurrency Limiting for Parallel Requests

```typescript
// Problem: 100 product IDs → 100 simultaneous requests → rate limited (429)
// Solution: batch requests or limit concurrency

// Option A: Batch the IDs into a single request
const products = await api.products.getByIds(productIds);  // Pass all ids at once

// Option B: Process N at a time (sliding window)
async function fetchWithConcurrencyLimit<T>(
  items: string[],
  fetchFn: (id: string) => Promise<T>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fetchFn));
    results.push(...batchResults);
  }

  return results;
}

// Usage: max 5 concurrent requests at a time
const products = await fetchWithConcurrencyLimit(
  productIds,
  (id) => api.products.getById(id),
  5
);
```

### ⚠️ Anti-Patterns

- **Async waterfall in JSX render** — calling async functions sequentially inside `useEffect` when they're independent; restructure into `Promise.all` immediately instead of adding awaits

- **`useEffect` cascade** — Effect A fires, sets state, which triggers Effect B, which sets state, which triggers Effect C; each effect waits for the previous state update → sequential by architecture; restructure into a single effect with `Promise.all` or a single query that returns all needed data

- **GraphQL N+1 fetched per component** — each component in a list fires its own query for full object data; use fragments or batch queries via the parent

- **Parallel mutations without idempotency keys** — concurrent mutations on the same resource with no ordering guarantee; add idempotency keys or serialize mutations with a queue

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier dashboard had a `useEffect` cascade: first effect fetched the supplier profile, set it to state, second effect watched state and fetched all purchase orders, set state, third effect watched and fetched analytics. Total: 3 sequential fetches, each ~300ms = ~900ms. Refactored: identified all 3 were independent → `Promise.all` → total time 320ms (the slowest of the three). Dashboard perceived load time improved 64%.

**At FAANG scale:**
- **Microsoft:** Azure portal overview page — 12 independent resource metrics requested on load; `useQueries` with `combine` to aggregate; partial failures gracefully show "Metric unavailable" for individual widgets without blocking the whole page; total load ~800ms (was ~3.2s sequential)
- **Adobe:** Creative Cloud asset browser — parallel `useQueries` for user's libraries (N libraries × 1 thumbnail query = N parallel); `combine` maps to a normalized asset grid; N limited to 20 with overflow "Load more libraries"
- **Salesforce:** Opportunity record page — 6 related lists (Activities, Contacts, Contracts, Notes, Files, Emails) loaded with `useQueries`; each panel shows its own loading skeleton; panels hydrate independently as each query resolves
- **Cisco:** Device inventory detail — device facts (hardware), device health, software versions, and network interfaces all loaded in parallel with `Promise.allSettled`; offline devices return 503 for health/interfaces but hardware facts still show

---

## 💬 4. Interview Execution

### Sample Answer

> "The question I always ask first is: which requests have data dependencies, and which are just coincidentally written sequentially? Most UI performance problems come from treating independent requests as if they were sequential — the classic async waterfall. The fix is simple: group independent requests in `Promise.all`.
>
> For React specifically, TanStack Query's `useQueries` is the right tool for dynamic parallel fetching — when you have N queries where N is determined at runtime. It fires all N queries in parallel and you get back an array of results. The `combine` option lets you aggregate them into a single object.
>
> The partial failure case is `Promise.allSettled` — when some requests failing should show a degraded UI rather than an error page. A dashboard with 6 widgets can show 5 working widgets and one 'Unavailable' widget if the 6th API is down, rather than showing an error page for the whole dashboard.
>
> The gotcha with parallel mutations is race conditions — two parallel PATCH requests on the same resource with no ordering guarantee. I prevent this with either optimistic locking (disable the button after first click) or idempotency keys on the backend."

### Likely Follow-up Questions
1. "When is sequential CORRECT?" → When each request needs data from the previous response — you can't fetch `order.productIds` until you have the `order`; when operations must be atomic in sequence (create entity, then add audit log that references its ID); when the second request would be invalid without first confirming the first succeeded (payment authorization then capture)
2. "How do you handle partial failure in parallel requests?" → `Promise.allSettled` returns all results regardless of individual success/failure; filter for `status === 'fulfilled'` to get successes and `status === 'rejected'` for errors; render successful data and show error/unavailable state only for failed pieces
3. "How does TanStack Query avoid duplicate requests when two components query the same data?" → TanStack Query deduplicates by `queryKey` — if two components issue `useQuery({ queryKey: ['user', '123'] })` in the same render cycle, only one HTTP request is made; both components subscribe to the same cache entry and both update when it resolves — this is covered more in Topic 160 (Request Deduplication)
4. "What if you need to fire 100 requests in parallel?" → Avoid it — prefer an API endpoint that accepts batched IDs and returns all results in one response; if batching isn't available, implement a concurrency limiter that processes N items at a time (typically 5–10) to avoid overwhelming the server or hitting rate limits

---

## 💻 5. Code Example (TypeScript)

```typescript
// Full dashboard loader demonstrating parallel + partial failure

interface DashboardData {
  user: User;
  stats: UserStats | null;
  recentActivity: Activity[] | null;
  announcements: Announcement[] | null;
  hasPartialFailure: boolean;
}

async function loadDashboard(userId: string): Promise<DashboardData> {
  // Step 1: User is required — fail fast if unavailable
  const user = await api.users.getById(userId);

  // Step 2: Everything else is optional — load in parallel, graceful on failure
  const [statsResult, activityResult, announcementsResult] = await Promise.allSettled([
    api.stats.getByUserId(userId),
    api.activity.getRecent(userId, { limit: 10 }),
    api.announcements.getActive(),
  ]);

  return {
    user,
    stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
    recentActivity: activityResult.status === 'fulfilled' ? activityResult.value : null,
    announcements: announcementsResult.status === 'fulfilled' ? announcementsResult.value : null,
    hasPartialFailure: [statsResult, activityResult, announcementsResult]
      .some(r => r.status === 'rejected'),
  };
}

// React component using useQueries for dynamic N parallel queries
function ProductBulkEditor({ productIds }: { productIds: string[] }) {
  const results = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['product', 'edit', id] as const,
      queryFn: ({ signal }: QueryFunctionContext) =>
        api.products.getForEdit(id, signal),
      staleTime: 2 * 60_000,
    })),
    combine: (results) => ({
      products: results.map((r, i) => ({
        id: productIds[i],
        data: r.data,
        isLoading: r.isPending,
        isError: r.isError,
        error: r.error,
      })),
      allLoaded: results.every(r => !r.isPending),
      anyError: results.some(r => r.isError),
    }),
  });

  return (
    <div>
      {results.anyError && (
        <Banner type="warning">Some products could not be loaded</Banner>
      )}
      {results.products.map(({ id, data, isLoading, isError }) => (
        <ProductEditRow
          key={id}
          productId={id}
          product={data}
          isLoading={isLoading}
          isError={isError}
        />
      ))}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**PSR Decision Rule:**
- **P**arallel: independent requests → `Promise.all` / `useQueries`
- **S**ettled: optional/degradable requests → `Promise.allSettled`
- **R**equested sequentially: data dependency → sequential (unavoidable)

**The Restaurant Analogy:**
Sequential = one chef, one dish at a time: appetizer → entrée → dessert. Each waits for the previous.
Parallel = separate chefs for each course: all cook simultaneously. Meal is served when the slowest is done.
Mixed = food prep in parallel, but plating happens in order after each is ready.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Unnecessary sequential requests are the single most common cause of slow initial page loads in React applications — a developer adding a new `useEffect` that awaits the result of a previous `useEffect` creates a waterfall without realizing it; identifying and parallelizing independent requests is often the highest-ROI performance optimization available without architectural changes
→ `Promise.allSettled` vs `Promise.all` is an architectural decision about resilience: `Promise.all` is an AND gate (all must succeed), `Promise.allSettled` is a best-effort aggregation; for critical-path data (you can't render the page without it), use `Promise.all` and let the error propagate; for optional/supplementary data (analytics widgets, announcements), use `Promise.allSettled` and show partial results
→ The concurrency limit problem (100 parallel requests hitting a rate-limited API) is real in bulk operations — always prefer a batch API endpoint that accepts arrays of IDs over individual per-item requests; when individual requests are unavoidable, implement a sliding window limiter

**How it works (2 sentences):**
`Promise.all` takes an array of promises and returns a single promise that resolves when all input promises resolve (with an array of their values) or rejects immediately when any input promise rejects (fail-fast); the JavaScript event loop processes all microtask callbacks when the promises settle, so all N network requests are dispatched in the same synchronous tick and their responses are processed independently as each arrives.
`Promise.allSettled` differs in that it returns a promise that resolves (never rejects) after all input promises have settled — resolved or rejected — returning an array of objects with `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`, allowing the calling code to handle each result independently and build partial success UIs without try-catch on individual items.

---
✅ Topic 156/486 complete → Continuing to Topic 157: Optimistic UI Updates
