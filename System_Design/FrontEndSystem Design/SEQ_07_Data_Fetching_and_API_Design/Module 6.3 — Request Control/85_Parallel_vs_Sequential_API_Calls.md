# 85. Parallel vs Sequential API Calls

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Parallel API calls** execute multiple requests simultaneously — the total time equals the slowest single request. **Sequential API calls** fire one at a time, each waiting for the previous to complete — total time equals the sum of all requests. The decision between them directly determines perceived performance: a dashboard needing user data, recent orders, and notifications takes either 300ms (parallel) or 900ms (sequential). The challenge is that not all requests *can* be parallel — if request B needs data from request A (e.g., fetch user then fetch their orders using their ID), they must be sequential. Senior engineers design data-fetching strategies to minimize sequential dependencies, maximize parallelism, and handle partial failures gracefully when some parallel requests succeed while others fail.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Request Waterfall Problem

```
❌ Sequential (Waterfall) — Common Beginner Pattern:

Component mounts
  ↓
Fetch user profile (300ms)
  ↓ (blocked — waiting)
Fetch user's orders (200ms)
  ↓ (blocked — waiting)
Fetch notifications (150ms)
  ↓
Render complete (650ms)

vs.

✅ Parallel — Senior Pattern:

Component mounts
  ↓ (all fire simultaneously)
  ├── Fetch user profile (300ms) ────────┐
  ├── Fetch user's orders (200ms) ───────┤
  └── Fetch notifications (150ms) ───────┘
                                         ↓
                                   Render complete (300ms — max of 3)
```

### When Sequential Is Required (Data Dependencies)

```typescript
// ❌ Cannot parallelize — B requires A's output
async function getUserDashboard(userId: string) {
  // Sequential is REQUIRED here
  const user = await userApi.getById(userId);
  // We need user.teamId to fetch team data
  const team = await teamApi.getById(user.teamId);  // Depends on user.teamId
  return { user, team };
}

// ✅ But sometimes one sequential call reveals parallel opportunities
async function getUserDashboard(userId: string) {
  const user = await userApi.getById(userId);  // Must be first
  
  // Now parallelize everything that depends only on user
  const [team, permissions, preferences] = await Promise.all([
    teamApi.getById(user.teamId),
    permissionsApi.getForUser(userId),
    preferencesApi.getForUser(userId),
  ]);
  
  return { user, team, permissions, preferences };
}
// Total: userFetch + max(team, permissions, preferences)
// Instead of: userFetch + teamFetch + permissionsFetch + preferencesFetch
```

### Promise.all vs Promise.allSettled vs Promise.race

**Promise.all — All succeed or fail together:**
```typescript
// All-or-nothing: if any request fails, the entire Promise rejects
try {
  const [user, orders, notifications] = await Promise.all([
    userApi.getProfile(userId),
    ordersApi.getRecent(userId),
    notificationsApi.getUnread(userId),
  ]);
  // All succeeded — render full dashboard
} catch (error) {
  // One failed — show error for entire dashboard
}

// Use when: All data is required for the UI to make sense
// Risk: One slow/failed request blocks entire page
```

**Promise.allSettled — Independent results:**
```typescript
// Each request resolves independently — partial success is valid
const results = await Promise.allSettled([
  userApi.getProfile(userId),
  ordersApi.getRecent(userId),
  notificationsApi.getUnread(userId),
]);

// Handle each independently
const [profileResult, ordersResult, notificationsResult] = results;

const profile = profileResult.status === 'fulfilled' 
  ? profileResult.value : null;
  
const orders = ordersResult.status === 'fulfilled'
  ? ordersResult.value : [];

const notificationCount = notificationsResult.status === 'fulfilled'
  ? notificationsResult.value.length : 0;

// Render what we have — degrade gracefully for failures
// Use when: Partial data is useful; sections can show independently
```

**Promise.race — Fastest wins:**
```typescript
// First to resolve (or reject) wins — rest are abandoned
async function getProductWithFallback(productId: string) {
  return Promise.race([
    primaryApi.getProduct(productId),
    secondaryApi.getProduct(productId), // CDN replica
  ]);
  // Useful for primary/fallback with identical response shapes
}

// Timeout implementation:
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

const product = await withTimeout(productApi.get(id), 3000);
```

**Promise.any — First success wins:**
```typescript
// ES2021: Like Promise.race but only resolves on success
// Rejects only if ALL promises reject (AggregateError)
async function fetchFromMirrors(resourceId: string) {
  return Promise.any([
    cdnEurope.fetch(resourceId),
    cdnAsia.fetch(resourceId),
    cdnUS.fetch(resourceId),
  ]);
  // Use the fastest CDN that responds successfully
}
```

### React Query Parallel Patterns

**Option 1: Multiple useQuery calls (simplest):**
```typescript
// React fires all useQuery calls in parallel automatically
function Dashboard({ userId }: { userId: string }) {
  const profileQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getProfile(userId),
  });
  
  const ordersQuery = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => ordersApi.getRecent(userId),
  });
  
  const notificationsQuery = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsApi.getUnread(userId),
  });
  
  // All three fire simultaneously on mount!
  
  const isLoading = profileQuery.isLoading || ordersQuery.isLoading || notificationsQuery.isLoading;
  
  return (
    <div>
      <Suspense fallback={<Skeleton />}>
        <ProfileSection data={profileQuery.data} />
        <OrdersSection data={ordersQuery.data} />
        <NotificationsSection data={notificationsQuery.data} />
      </Suspense>
    </div>
  );
}
```

**Option 2: useQueries for dynamic parallel queries:**
```typescript
// When the number of parallel queries isn't known at component definition time
function ProductPrices({ productIds }: { productIds: string[] }) {
  const priceQueries = useQueries({
    queries: productIds.map(id => ({
      queryKey: ['price', id],
      queryFn: () => priceApi.get(id),
      staleTime: 30 * 1000,
    })),
  });
  
  // priceQueries[i] corresponds to productIds[i]
  const prices = priceQueries.map(query => query.data);
  const isLoading = priceQueries.some(q => q.isLoading);
  
  return <PriceTable productIds={productIds} prices={prices} />;
}
```

### Request Dependencies in Next.js (Server Components)

```typescript
// Next.js Server Components: parallel fetch by not awaiting sequentially
// Pattern: Fire all fetches at the top, resolve at rendering time

async function ProductDetailPage({ params }: { params: { id: string } }) {
  // ✅ Parallel: Both fetch calls start simultaneously
  const productPromise = productApi.getById(params.id);
  const reviewsPromise = reviewsApi.getByProduct(params.id);
  
  // Resolve in parallel
  const [product, reviews] = await Promise.all([productPromise, reviewsPromise]);
  
  return (
    <>
      <ProductInfo product={product} />
      <ReviewList reviews={reviews} />
    </>
  );
}

// ❌ Sequential (waterfall) — common mistake in Server Components
async function ProductDetailPageSlow({ params }) {
  const product = await productApi.getById(params.id);  // Waits
  const reviews = await reviewsApi.getByProduct(params.id);  // Then waits
  // Total: productFetch + reviewsFetch instead of max(both)
}
```

### Handling Partial Failures in Parallel Requests

```typescript
// Production pattern: Show sections independently, fail gracefully

interface DashboardData {
  user: User | null;
  orders: Order[];
  notifications: Notification[];
  errors: string[];
}

async function loadDashboard(userId: string): Promise<DashboardData> {
  const [userResult, ordersResult, notificationsResult] = await Promise.allSettled([
    userApi.getProfile(userId),
    ordersApi.getRecent(userId),
    notificationsApi.getUnread(userId),
  ]);
  
  const errors: string[] = [];
  
  if (userResult.status === 'rejected') {
    errors.push('Failed to load profile');
    // Log to Sentry: userResult.reason
  }
  if (ordersResult.status === 'rejected') {
    errors.push('Failed to load recent orders');
  }
  if (notificationsResult.status === 'rejected') {
    errors.push('Failed to load notifications');
  }
  
  return {
    user: userResult.status === 'fulfilled' ? userResult.value : null,
    orders: ordersResult.status === 'fulfilled' ? ordersResult.value : [],
    notifications: notificationsResult.status === 'fulfilled' ? notificationsResult.value : [],
    errors,
  };
}
```

### Performance Implications

**Comparing Loading Strategies:**
```
API response times: user=300ms, orders=200ms, notifications=150ms

Sequential:    300 + 200 + 150 = 650ms
Parallel:      max(300, 200, 150) = 300ms
Speedup:       2.2x

At scale (more requests):
5 parallel requests of avg 250ms each:
  Sequential: 5 × 250ms = 1250ms
  Parallel:   max(5 × 250ms) ≈ 400ms (+ concurrency overhead)
  Speedup:    ~3x
```

**Connection Limits:**
```
HTTP/1.1: 6 max parallel connections per domain
If you fire 10 parallel requests → 6 execute, 4 queued
HTTP/2: Multiplexed → all requests over single connection → no limit concern

For HTTP/1.1 apps at scale:
✅ Use domain sharding for >6 parallel requests per page
✅ Use HTTP/2 to eliminate the problem entirely
✅ Prioritize: critical requests first, nice-to-have in second batch
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Microsoft Teams Dashboard Load:**
- Parallel: User presence, recent chats, notifications, calendar events → all fire simultaneously
- Sequential only: After getting user → fetch user's team channels (needs team ID from user)
- Result: Teams opens in ~2s (would be ~5s if all sequential)

**Salesforce CRM Record View:**
- Record detail page: Parallel fetch for record data + related records + activity history + churn score
- `Promise.allSettled` because: churn score API is optional enhancement — native CRM fields cannot fail
- Einstein AI sidebar loads last (enhancement) — progressive rendering

**Adobe Creative Cloud Dashboard:**
- Home page: Parallel fetch recent files + teams + notifications + storage usage
- Image thumbnails: Loaded via separate parallel batch requests, 6 at a time (HTTP/1.1 limit)
- After switching to HTTP/2: All thumbnails in single connection → removed batching logic

**SAP Fiori (Your Experience):**
- OData Batch API: Combines multiple $batch requests into single HTTP request
- This is their equivalent of Promise.all — multiple entity reads in one round trip
- BatchRequests helped reduce dashboard load time significantly

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The first thing I do when analyzing a page's data requirements is draw the dependency graph. Independent requests — profile, orders, notifications — can and should be parallelized with Promise.all or multiple simultaneous React Query hooks. Requests with dependencies — fetch user first, then teams using user.teamId — must be sequential, but I minimize the sequential chain and parallelize everything below each sequential step.
>
> The choice between Promise.all and Promise.allSettled depends on whether partial data is acceptable. For a dashboard where each section can render independently, allSettled is better — a notifications API failure shouldn't prevent the orders section from rendering. For a checkout flow where all data is critical, Promise.all is cleaner.
>
> In React with React Query, parallel happens automatically when you call multiple useQuery hooks in the same component — they all fire on mount. For dynamic numbers of parallel queries (like fetching prices for a variable list of products), useQueries handles it cleanly.
>
> The HTTP/1.1 constraint of 6 parallel connections is something I keep in mind for HTTP/1.1 environments — beyond 6, requests queue. Under HTTP/2, this is irrelevant since multiplexing allows unlimited parallel requests over a single connection."

**Likely Follow-up Questions:**
- "How do you handle if one parallel request takes much longer than others?" → Show loaded sections immediately; use Suspense or skeleton for the slow section separately; consider timeouts with withTimeout wrapper
- "How does Next.js App Router handle parallel data fetching?" → Don't `await` each promise sequentially; start all fetch calls, then `await Promise.all` — or use `loading.tsx` boundary with Suspense streaming
- "What's the overhead of Promise.all?" → Minimal — it's just orchestration. The actual cost is the network requests, not the Promise machinery.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (see deep-dive above for complete examples)

Key patterns demonstrated: `Promise.allSettled` for resilient dashboard loading, `useQueries` for dynamic parallel queries, Next.js Server Component parallel fetch pattern.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Decision Tree:**
1. Any dependency? (B needs A's data) → Must sequence those; parallelize the rest
2. All required or partial OK? → `Promise.all` vs `Promise.allSettled`
3. First success needed? → `Promise.any`
4. Server Components? → Don't await individually; `await Promise.all([...promises])`

If you blank: *"Draw the dependency graph. Independent requests → parallel with Promise.all. Sections that can degrade independently → Promise.allSettled. Maximum parallelism = max(all independent requests) instead of sum."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Dashboard loads in 300ms vs 900ms — seconds feel like minutes to waiting users  
→ **Performance**: 2-3× speedup on page load purely from request orchestration changes  
→ **Business**: 100ms improvement in load time → measurable e-commerce conversion improvement (Amazon: 100ms = 1% sales)

**How it works:**
→ `Promise.all` fires all requests simultaneously and resolves when the last one completes. `Promise.allSettled` does the same but each result is `{ status: 'fulfilled', value } | { status: 'rejected', reason }`. In React, multiple synchronous `useQuery` calls in the same component all begin fetching in the same render cycle. Sequential dependencies are handled by chaining `.then()` or using sequential `await` within `useEffect` or server-side data fetching.

**Company relevance:**
→ **Microsoft**: Teams page load optimization — parallel fetch is their primary "quick win" blog post pattern  
→ **Adobe**: Photoshop Web — parallel asset metadata fetch for large documents  
→ **Salesforce**: Composite API batches multiple REST calls → their server-side parallel execution primitive  
→ **Cisco**: Network telemetry dashboards — multiple metric streams fetched in parallel on page load
