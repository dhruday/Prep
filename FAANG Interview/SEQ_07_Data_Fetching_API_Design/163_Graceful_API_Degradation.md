# 163. Graceful API Degradation
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Graceful degradation means the application continues to provide value even when API calls fail, rather than crashing or showing a blank error page. It's a spectrum: from serving stale cached data when a refresh fails, to showing placeholder content when a non-critical feature is unavailable, to a fully offline-capable app using service workers and IndexedDB. The key principle is criticality tiering: not all features have equal importance; a product search failing should show an error; a personalized recommendation widget failing should silently render nothing. The implementation techniques are: `staleTime` / `gcTime` (serve cached data during outages), `placeholderData` (show old data while new fetch is in-flight), `fallbackData` (static defaults), feature flags (disable API-dependent features under pressure), progressive enhancement (show partial data from what succeeded), and `navigator.onLine` + `online`/`offline` events for explicit offline mode.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Criticality Tiering — What Can Degrade?

```typescript
// Define service tiers based on user impact

const ServiceTier = {
  // Tier 1: Critical — app is completely broken without this
  AUTHENTICATION: 'critical',
  CORE_DATA: 'critical',          // Product pages, user profile, cart

  // Tier 2: Important — UX is significantly degraded but not broken
  SEARCH: 'important',
  CHECKOUT: 'important',

  // Tier 3: Enhanced — nice to have; failure = missing feature, not broken UX
  RECOMMENDATIONS: 'enhanced',
  ANALYTICS: 'enhanced',
  CHAT_SUPPORT: 'enhanced',
  PERSONALIZATION: 'enhanced',

  // Tier 4: Supplementary — purely additive; user never noticed they existed
  FEATURE_FLAGS: 'supplementary',
  AB_TEST: 'supplementary',
  PROMOTIONAL_BANNERS: 'supplementary',
};

// Degradation response by tier:
// Tier 1 (Critical): Show full error state, block interaction, prompt retry
// Tier 2 (Important): Show error inline with retry, preserve rest of page
// Tier 3 (Enhanced): Silently render empty/hidden, log to monitoring only
// Tier 4 (Supplementary): Silently skip, never visible to user
```

### Stale Cache as Fallback

```typescript
// TanStack Query: serve stale data when a background refresh fails
// gcTime (formerly cacheTime): how long to keep data in cache after last observer unmounts
// staleTime: how long before data is considered "stale" (eligible for background refresh)

// Pattern: long gcTime means data survives in cache across soft navigation
// If refresh fails → user continues seeing the last good data

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,      // Fresh for 5 mins → no background fetch
      gcTime: 60 * 60_000,        // Cache survives in memory for 1 hour after unmount
      // During that 1 hour, if the user navigates away and back,
      // they see cached data instantly — even if the API is currently down
    },
  },
});

// Product page: show last cached product data if API fails
function ProductPage({ productId }: { productId: string }) {
  const {
    data: product,
    isError,
    isLoading,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: ({ signal }) => api.products.getById(productId, signal),
    staleTime: 10 * 60_000,
    gcTime: 2 * 60 * 60_000,  // Cache for 2 hours
    // If the API fails and there's cached data → isError: true but data is still populated
  });

  // Stale: data exists but background refresh failed
  const isShowingStaleData = isError && product !== undefined;
  const cachedAt = new Date(dataUpdatedAt).toLocaleTimeString();

  return (
    <div>
      {isShowingStaleData && (
        <Banner type="warning">
          Showing data from {cachedAt}. Some information may be outdated.
        </Banner>
      )}
      {isLoading && !product && <ProductSkeleton />}
      {product && <ProductDetail product={product} price={product.price} />}
      {isError && !product && <ProductErrorState productId={productId} />}
    </div>
  );
}
```

### Offline Detection

```typescript
// navigator.onLine: sync check — true if browser has any network
// online/offline events: fire when connectivity changes

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Came back online — trigger a refetch of stale queries
        queryClient.invalidateQueries();  // OR: just invalidate critical queries
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

// TanStack Query integrates with network status automatically
// networkMode: 'online' (default): pauses queries/mutations when offline
// networkMode: 'always': fires regardless of network status
// networkMode: 'offlineFirst': uses cache, refetches when online

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',  // Serve cache immediately, refetch when online
    },
  },
});

// Global offline banner:
function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div role="alert" aria-live="assertive" className="offline-banner">
      You're offline. Some features may not be available.
      Showing last cached data.
    </div>
  );
}
```

### Progressive Partial Rendering

```typescript
// When some parts of the data succeed and others fail:
// Show what succeeded, gracefully hide what failed

interface DashboardData {
  user: User;
  stats: Stats | null;       // null if API failed
  activity: Activity[] | null;
  recommendations: Product[] | null;
}

function Dashboard({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      const [user, statsResult, activityResult, recoResult] = await Promise.all([
        api.users.getById(userId),  // Critical — throw if fails
        tryCatch(() => api.stats.getByUserId(userId)),   // Enhanced — null on failure
        tryCatch(() => api.activity.getRecent(userId)),  // Enhanced — null on failure
        tryCatch(() => api.recommendations.get(userId)), // Supplementary — null on failure
      ]);

      return {
        user,
        stats: statsResult,
        activity: activityResult,
        recommendations: recoResult,
      };
    },
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <UserHeader user={data.user} />  {/* Always shows */}

      {data.stats ? (
        <StatsPanel stats={data.stats} />
      ) : (
        <div className="panel-unavailable" aria-label="Stats temporarily unavailable" />
        // Renders as empty space — minimal visual disruption
      )}

      {data.activity ? (
        <ActivityFeed activities={data.activity} />
      ) : null}  {/* Completely hidden — section doesn't exist */}

      {/* Recommendations: never show an error here */}
      {data.recommendations?.length ? (
        <RecommendationsCarousel products={data.recommendations} />
      ) : null}
    </div>
  );
}

async function tryCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
```

### Feature Flags for API-Dependent Features

```typescript
// Feature flags let you remotely disable features that depend on a struggling API
// No deployment needed — flip the flag in the feature flag system (LaunchDarkly, etc.)

function useFeatureFlag(flag: string, defaultValue = false): boolean {
  const { data: flags } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: () => api.featureFlags.getAll(),
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,  // Flags cache for 1 hour — feature flag service down = use last known state
    // This is itself a degradation pattern: feature flags must work during downtimes
    // Solution: gcTime means last known flags are used if the flag service is unavailable
  });

  return flags?.[flag] ?? defaultValue;
}

// When the recommendations service is struggling:
// → flip feature flag 'recommendations_enabled' to false
// → globally disables the widget without a code deploy

function ProductRecommendations({ productId }: { productId: string }) {
  const isEnabled = useFeatureFlag('recommendations_enabled', true);

  if (!isEnabled) return null;  // Feature flag off → render nothing

  return <RecommendationsWidget productId={productId} />;
}
```

### Placeholder/Fallback Data

```typescript
// placeholderData: show synthetic data while real data loads (better than blank)
// initialData: treat data as already-fetched (inserted directly, never goes to loading state)

// placeholderData: for navigation — show last list while new filter loads
function ProductList({ filters }: { filters: ProductFilters }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => api.products.list(filters, signal),
    placeholderData: keepPreviousData,  // Show previous filter results during transition
  });

  return (
    <div style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      {data?.items.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// initialData: when data is already available (e.g., from SSR or parent component)
function ProductDetail({ product }: { product: Product }) {
  // Parent passed the product from a list query (already loaded)
  // → No loading state needed; immediately renders with authoritative data
  const { data } = useQuery({
    queryKey: ['product', product.id],
    queryFn: () => api.products.getById(product.id),
    initialData: product,  // Start hydrated; background refetch for freshness
    initialDataUpdatedAt: Date.now() - 30_000,  // Mark as 30s old → triggers background refresh
  });

  return <ProductLayout product={data} />;
}
```

### ⚠️ Anti-Patterns

- **Degrading critical paths silently** — swallowing errors for Tier 1 features (authentication, orders, payments) without user feedback creates an illusion of success while operations failed; only silent degradation for Tier 3–4 features

- **Stale data without staleness indicators** — showing 3-hour-old product prices without indicating the data might be outdated violates user trust; always show "As of {time}" or a "Refresh" indicator when serving stale data beyond a reasonable window

- **`gcTime: 0` on important data** — removes cache immediately on unmount; users who briefly navigate to another route lose all cached data and see a full loading state on return; increase gcTime to at least 5–10 minutes for any data users might navigate back to

- **`navigator.onLine = true` does not mean the API is reachable** — `navigator.onLine` is true when any network interface is active (including a captive portal or a connected-but-no-internet scenario); use actual API health check probes or TanStack Query's `networkMode` which monitors actual fetch success

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier evaluation module had a personalized recommendation service ("Similar Suppliers") that was a new addition and had lower SLA guarantees than the core module. During a recommendation service incident, the entire supplier evaluation dashboard showed a blank error page because the `useEffect` threw an uncaught error. Refactored: recommendation widget wrapped in its own `Suspense + ErrorBoundary`, error boundaries set to render `null` on failure (rather than re-throwing), all with Sentry logging. During the next incident, procurement officers never noticed the recommendation service was down.

**At FAANG scale:**
- **Microsoft:** Office 365 — when the Delve people recommendations API is unavailable, the People Card in Teams/Outlook renders a simplified card with just name/email (from Active Directory, different service); the "Related documents" section shows empty with no error indicator; users rarely notice
- **Adobe:** Firefly AI features — circuit breaker + feature flag combo; when AI inference capacity is reduced, the flag `ai_suggestions_enabled` auto-disables; Photoshop shows "AI features temporarily limited" in the menu item tooltip, not a broken toolbar
- **Salesforce:** Einstein Predictions — when the prediction engine is unavailable, the Lead Score column shows "—" (not an error icon); the CRM record is still fully editable; score comes back when the service recovers; stale last-known score can be optionally shown with age indicator
- **Cisco:** Meraki cloud dashboard — device status polling; when Meraki cloud is down, dashboard shows last-known device status with timestamp ("Last seen: 14 minutes ago") rather than a disconnected error; critical network status indicator shows "Cloud offline" banner only if cloud has been unreachable >15 minutes

---

## 💬 4. Interview Execution

### Sample Answer

> "Graceful degradation starts with criticality tiering — not all features have equal importance. Product pages failing is critical; recommendations widget failing is invisible to most users. The degradation strategy should match the tier.
>
> For transient failures, the primary tool is the cache. TanStack Query's `gcTime` keeps data in memory after unmount — if a background refresh fails, the user continues seeing the last known good data. I always show a 'Data from X minutes ago' indicator when serving stale data beyond a reasonable window, not silently.
>
> For offline scenarios: `navigator.onLine` events update a global status banner, TanStack Query's `networkMode: 'offlineFirst'` serves cache without attempting network calls when offline, and invalidation triggers on the `online` event when connectivity returns.
>
> Feature flags are the surgical tool — when a dependency is struggling, a flag can disable the dependent feature globally in minutes without any deployment. The flags themselves must be resilient: long `gcTime` means the last known flag state is used if the flag service is also unavailable.
>
> For partial success: `Promise.allSettled` returns results for all requests independently; I render successful sections and either hide or gray-out failed sections, rather than showing a page-level error because one of seven data sources failed."

### Likely Follow-up Questions
1. "How do you handle the case where `gcTime` means users see outdated prices?" → Add an explicit staleness timestamp to the QueryCache entry (`dataUpdatedAt` in TanStack Query); in critical financial contexts, show `"Prices as of {time}"` always; set a `staleTime = 0` for prices so they always background-refresh; show a non-blocking "Refreshing…" indicator when `isFetching` is true
2. "What's the difference between `staleTime` and `gcTime`?" → `staleTime`: how long before a successful response is considered stale and eligible for background refresh (default 0ms = always stale). `gcTime` (formerly `cacheTime`): how long to keep the data in the memory cache after all subscribers have unmounted (default 5 minutes). After `gcTime` expires, the data is garbage collected; the next subscriber sees a loading state. For degradation, `gcTime` is the key knob — longer `gcTime` = longer survival in cache = longer graceful degradation window
3. "How do you test your degradation scenarios?" → Mock the API module in tests and return errors or delays: `jest.spyOn(api.recommendations, 'get').mockRejectedValue(new Error('Service down'))`. Use Cypress/Playwright to intercept and fail specific network calls via `cy.intercept('GET', '/api/recommendations', { statusCode: 503 })`. Add observability: log all degradation events to monitoring so you can see the actual degradation frequency in production

---

## 💻 5. Code Example (TypeScript)

```typescript
// DegradedQuery: wrapper that returns null instead of throwing on failure
// Useful for non-critical data sources

function useDegradedQuery<T>({
  queryKey,
  queryFn,
  fallback = null,
  ...options
}: Parameters<typeof useQuery<T>>[0] & { fallback?: T | null }) {
  const result = useQuery<T>({
    queryKey,
    queryFn,
    ...options,
    // Suppress errors in error boundary — handle locally
    throwOnError: false,
  });

  return {
    ...result,
    // Return fallback when error — component renders fallback UI
    data: result.isError ? (fallback as T) : result.data,
    isDegraded: result.isError,
  };
}

// Usage:
function PersonalizedHeader() {
  const { data: greetingData, isDegraded } = useDegradedQuery<GreetingData>({
    queryKey: ['personalization', 'greeting', userId],
    queryFn: () => api.personalization.getGreeting(userId),
    fallback: { message: 'Welcome back!', isPersonalized: false },  // Static fallback
    staleTime: 30 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });

  return (
    <header>
      <h1>{greetingData?.message}</h1>
      {/* When personalization unavailable: shows generic greeting, never an error */}
    </header>
  );
}
```

---

## 🧠 6. Memory Aid

**SCOFF — degradation toolkit:**
- **S**tale cache: serve last known good data (gcTime)
- **C**riticality tier: know what can silently fail vs what needs error display
- **O**ffline detection: navigator.onLine + TanStack networkMode
- **F**eature flags: disable API-dependent features remotely
- **F**allback data: static defaults for non-personalized state

**"The Swiss cheese model":**
Each degradation layer (cache, feature flags, offline mode, placeholders) is a slice of Swiss cheese with holes. No single slice blocks all failures, but stacking them together means very few failure scenarios fall through every layer simultaneously.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ A single API endpoint failing should not be a page-level outage — a dashboard with 7 data sources where 1 is down should show 6 working panels and 1 empty/hidden panel, not an error page; this is the difference between "87% availability" (every page breaks when any dependency fails) and "99.9% availability" (only core features affect availability)
→ Stale cache serving is the free tier of degradation — TanStack Query's `gcTime` already provides it with no additional implementation; increasing `gcTime` from the default 5 minutes to 1–2 hours means users on slow/intermittent connections or during brief server outages see continuous, functional data rather than flash-of-empty states on every navigation
→ Feature flags are the operational escape hatch — when a recommendation service is struggling under load, disabling it via a flag (not a deployment) takes 30 seconds instead of 30 minutes; the flag system itself must be designed for degradation (long `gcTime` prevents the feature flag service going down from disabling all flags simultaneously)

**How it works (2 sentences):**
TanStack Query's garbage collection timer (`gcTime`) starts when all `useQuery` observers for a given `queryKey` unmount — until `gcTime` elapses, the cache entry stays in the query cache and is immediately served to any new subscribers (no loading state); if a background refetch fails while the cache entry exists, `data` retains the last successful value while `isError: true` simultaneously, enabling the "stale data with error banner" pattern.
The `networkMode: 'offlineFirst'` setting in TanStack Query changes query execution to attempt the cache first and only fire a network request if the cache is empty or stale; the `online` event triggers `queryClient.resumePausedMutations()` and optional query invalidation — this means mutations queued while offline are automatically replayed when the user comes back online (with appropriate optimistic state management).

---
✅ Topic 163/486 complete → Continuing to Topic 164: Skeleton Loaders & Loading State Strategy
