# 164. Skeleton Loaders & Loading State Strategy
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Skeleton loaders are placeholder UI elements that match the shape and size of the content they represent, filling the space while data loads. They reduce perceived load time by making the page feel structured and responsive before data arrives — users see layout immediately and understand what will appear rather than staring at a blank screen. The key architectural decision is which loading indicator to use at each stage: skeletons for first-time data loads (no cached data), subtle progress/spinner for background refreshes (cached data exists), and nothing visible for fast data (< 200ms) or when using `staleTime` to eliminate loading states. The most important performance concern is preventing Cumulative Layout Shift (CLS) — skeleton dimensions must match the final content exactly, or the page will jump when content appears, damaging Core Web Vitals scores.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Loading State Hierarchy

```typescript
// Rule: show the MINIMUM disruption necessary for each refresh type

// State A: isLoading && !data (first load, no cache)
//   → Full skeleton (matches content area exactly)

// State B: isFetching && data (background refresh with cache)
//   → Subtle indicator: top progress bar, faint refresh icon, or nothing
//   → Never show a full skeleton — current data is still valid and visible

// State C: isFetching && isPlaceholderData (filter change, navigating)
//   → Opacity reduction (0.6) on current data + subtle spinner
//   → Conveys "data is changing" without removing visible content

// State D: isError && data (background refresh failed, cache available)
//   → Show stale banner ("Showing data from X minutes ago")
//   → No loading indicator — data is stable; badge the staleness

// State E: isError && !data (total failure, no cache)
//   → Error state with retry button (fully replaces skeleton)

// TanStack Query values for each state:
// A: { isLoading: true, isFetching: true, data: undefined, isError: false }
// B: { isLoading: false, isFetching: true, data: T, isError: false }
// C: { isLoading: false, isFetching: true, isPlaceholderData: true, data: OldT, isError: false }
// D: { isLoading: false, isFetching: false, data: T, isError: true }
// E: { isLoading: false, isFetching: false, data: undefined, isError: true }
```

### Building a Skeleton Component

```typescript
// Key constraints for skeletons:
// 1. Match the EXACT dimensions of the loaded content (prevents CLS)
// 2. Use shimmer animation (light sweep left-to-right) — conveys "loading" clearly
// 3. Never use actual text content or icons — pure shape placeholder
// 4. Match the count and layout of actual items

// Base skeleton element with shimmer animation:
function SkeletonBase({
  width,
  height,
  borderRadius = '4px',
  className,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"  // Hidden from screen readers — decorative only
      className={`skeleton ${className ?? ''}`}
      style={{
        width: width ?? '100%',
        height: height ?? '1em',
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

// CSS (in global/module):
// @keyframes shimmer {
//   0% { background-position: 200% 0 }
//   100% { background-position: -200% 0 }
// }
// Preference: CSS animation over JS animation — runs on compositor thread, not main thread

// Responsive to user's reduce-motion preference:
// @media (prefers-reduced-motion: reduce) {
//   .skeleton { animation: none; background: #e0e0e0; }
// }

// ProductCard skeleton — matches ProductCard exactly
function ProductCardSkeleton() {
  return (
    <div className="product-card" aria-label="Loading product">
      {/* Image area: same size as actual product image */}
      <SkeletonBase height={200} borderRadius="8px 8px 0 0" />
      <div className="product-card__body" style={{ padding: 16 }}>
        {/* Title: 2 lines matching h3 line-height */}
        <SkeletonBase height={20} width="85%" style={{ marginBottom: 8 }} />
        <SkeletonBase height={20} width="60%" style={{ marginBottom: 12 }} />
        {/* Price */}
        <SkeletonBase height={24} width={80} />
      </div>
    </div>
  );
}

// Grid of skeletons matching product grid:
function ProductGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="product-grid" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### `isLoading` vs `isFetching` — Critical Distinction

```typescript
// isLoading = isPending && isFetching (v5 terminology)
// true ONLY on the FIRST fetch (no cached data)
// Use for: full skeleton replacement

// isFetching = true whenever ANY network request is in-progress
// true on first load AND background refreshes
// Use for: subtle indicators only (progress bar, spinner overlay)

function ProductList({ filters }: { filters: ProductFilters }) {
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => api.products.list(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // ❌ WRONG: Showing skeleton on every isFetching hides cached data
  if (isFetching) return <ProductGridSkeleton />;  // ← Users see skeleton on EVERY filter change

  // ✅ CORRECT: Show skeleton only when there's nothing to display yet
  if (isLoading) return <ProductGridSkeleton count={12} />;

  return (
    <div>
      {/* Top-of-page thin progress bar — visible but not disruptive during background fetches */}
      {isFetching && <TopProgressBar />}

      <div
        style={{
          // Dim current data during filter transition
          opacity: isPlaceholderData ? 0.6 : 1,
          transition: 'opacity 200ms',
        }}
      >
        {data?.items.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### Skeleton Count Matching

```typescript
// Problem: you don't know how many items will load → how many skeletons to show?

// Solution A: Fixed estimate (simplest — fine for most use cases)
function ProductGridSkeleton() {
  return (
    <>
      {/* Show 12 skeletons — matches a standard 3×4 grid on desktop */}
      {Array(12).fill(null).map((_, i) => <ProductCardSkeleton key={i} />)}
    </>
  );
}

// Solution B: Persist last-known count in sessionStorage
function useSkeleton(queryKey: string, defaultCount = 12) {
  const [count, setCount] = useState(() => {
    const stored = sessionStorage.getItem(`skeleton-count-${queryKey}`);
    return stored ? parseInt(stored) : defaultCount;
  });

  const updateCount = (newCount: number) => {
    setCount(newCount);
    sessionStorage.setItem(`skeleton-count-${queryKey}`, String(newCount));
  };

  return { count, updateCount };
}

// Solution C: Use pagination size (most accurate)
// If you always load 20 items per page, show 20 skeletons
const PAGE_SIZE = 20;  // Same constant used in query and skeleton
function ProductList() {
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  if (isLoading) return <ProductGridSkeleton count={PAGE_SIZE} />;
  return <ProductGrid items={data.items} />;
}
```

### Preventing CLS (Cumulative Layout Shift)

```typescript
// CLS happens when:
// 1. Skeleton height is different from loaded content height
//    → Page jumps when content replaces skeleton

// 2. Skeleton is absent (blank space) and content then loads
//    → Elements below "jump" down when content appears

// 3. Image loads without aspect-ratio reserved
//    → Image pops in and shifts surrounding text

// Fix 1: Reserve space with exact skeleton dimensions
// ProductCard skeleton must match ProductCard's rendered height exactly
// Use CSS custom properties or Tailwind classes shared between skeleton and real

// Fix 2: Image aspect ratio reservation
function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    // aspect-ratio CSS property: browser reserves space BEFORE image loads
    // Eliminates CLS from image loading
    <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

// Fix 3: Min-height on dynamic content containers
// If a list might have 1 or 50 items, min-height prevents extreme layout shifts
.product-grid {
  min-height: 400px;                /* Prevents column-height collapse on empty */
}
```

### Suspense + Skeleton Integration

```typescript
// Suspense: automatically shows fallback while async components resolve
// Combine with skeleton as the Suspense fallback

// ❌ Showing a generic spinner for all Suspense boundaries
function ProductPageBad() {
  return (
    <Suspense fallback={<div className="spinner" />}>  {/* ← Shifts layout */}
      <ProductContent />
    </Suspense>
  );
}

// ✅ Using a shape-matched skeleton as the Suspense fallback
function ProductPage() {
  return (
    <Suspense fallback={<ProductPageSkeleton />}>  {/* ← Matches final layout */}
      <ProductContent />
    </Suspense>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="product-page-layout">
      <div className="product-page__gallery">
        <SkeletonBase height={400} borderRadius="8px" />
      </div>
      <div className="product-page__details">
        <SkeletonBase height={32} width="70%" style={{ marginBottom: 16 }} />  {/* title */}
        <SkeletonBase height={24} width="30%" style={{ marginBottom: 24 }} />  {/* price */}
        <SkeletonBase height={48} borderRadius="24px" />                        {/* CTA button */}
      </div>
    </div>
  );
}
```

### Progressive Loading — Above-the-Fold Priority

```typescript
// Strategy: don't make everything wait for the slowest API call
// Show above-fold content first, defer below-fold
// Use separate queries with independent loading states

function ProductDetailPage({ productId }: { productId: string }) {
  // Critical above-fold: product info + price (~50ms)
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.products.getById(productId),
    staleTime: 5 * 60_000,
  });

  // Non-critical below-fold: reviews (~400ms — can load slower)
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['product', productId, 'reviews'],
    queryFn: () => api.reviews.getByProductId(productId),
    staleTime: 10 * 60_000,
  });

  if (productLoading) return <ProductDetailSkeleton />;  // Blocks the full hero section

  return (
    <>
      {/* Above fold: loads first (~50ms) */}
      <ProductHero product={product} />
      <ProductPricing product={product} />
      <AddToCartButton productId={product.id} />

      {/* Below fold: independent loading state — shimmer only the review section */}
      <section>
        <h2>Customer Reviews</h2>
        {reviewsLoading ? (
          <ReviewsSkeleton count={5} />
        ) : (
          <ReviewsList reviews={reviews?.items ?? []} />
        )}
      </section>
    </>
  );
}
```

### ⚠️ Anti-Patterns

- **Skeleton with wrong dimensions** — a skeleton that is 200px tall replacing content that renders at 280px causes 80px of CLS; each card/panel skeleton must be pixel-accurate to the loaded content; measure in DevTools and match exactly

- **Showing skeleton on background refresh (`isFetching`)** — the #1 skeleton UX mistake; when cached data is available, it's still valid; replacing it with a skeleton on every `refetchOnWindowFocus` means the user sees a flash of skeletons every time they return to the tab; use `isLoading` for skeleton, `isFetching` only for subtle indicators

- **Spinner only (no skeleton)** — a centered spinner in a blank area conveys nothing about the expected content structure; users don't know if the area will be large (causing scroll shift) or small; skeleton conveys both "loading" and "shape of incoming content"

- **Indefinite loading state** — if the query hangs (no response, no timeout), the skeleton shows forever; always pair skeletons with a query timeout (`signal: AbortSignal.timeout(30_000)`) and transition to an error state after the timeout

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the procurement dashboard used `isLoading || isFetching` as the condition for showing skeleton placeholders. Every `refetchOnWindowFocus` (which fires when a user switches from another tab back to the SAP UI) replaced the fully-loaded dashboard widgets with skeletons for 200–400ms — a very visible, jarring flash. The fix: `isLoading && !data` for skeleton display, `isFetching && data` for an unobtrusive top progress bar. The flash was eliminated. Core Web Vitals CLS score improved from 0.18 (needs improvement) to 0.04 (good).

**At FAANG scale:**
- **Microsoft:** Azure Portal tiles — each portal tile has an exact-sized skeleton matching the loaded tile dimensions; tiles load independently (`useQuery` per tile), so each tile exits skeleton state independently; progressive hydration from top-left to bottom-right is common; never shows a full-page spinner
- **Adobe:** Creative Cloud Home — "Recent Projects" section: 6 project card skeletons (exact card height 220px, same as loaded cards); loads in ~300ms on fast connection; on slow: user sees structured grid, not blank space; `Suspense fallback` at section boundary (not page boundary)
- **Salesforce:** Lightning App Builder — component list skeletons when loading AppExchange components; SLDS (Salesforce Lightning Design System) has a standardized `lightning-skeleton` component that design teams use for shape-matching; all Lightning apps use the same skeleton component for visual consistency
- **Cisco:** DNAC (Catalyst Center) dashboard — topology view: loading skeleton uses SVG placeholder nodes connected by placeholder edges; matches the graph structure so users see "network topology is loading" not an empty canvas; SVG skeleton transitions to real D3 graph in-place

---

## 💬 4. Interview Execution

### Sample Answer

> "My loading state strategy has three rules. First: match the right indicator to the right state. `isLoading && !data` — the first time there's nothing to show — is the only case for a full skeleton. `isFetching && data` — background refresh when we already have data — gets a subtle top progress bar, never a skeleton. Using skeletons on every `isFetching` causes a jarring flash on `refetchOnWindowFocus`, which fires every time users return to the tab.
>
> Second: skeletons must match the loaded content dimensions exactly. If the skeleton is 200px tall and the loaded card is 280px, that's 80px of Cumulative Layout Shift — a Core Web Vitals penalty. I always measure the final rendered card, build the skeleton to match, and use CSS `aspect-ratio` for images to reserve their space before the image loads.
>
> Third: consider what 'loading' means for different parts of the page. For product detail pages I use independent queries per section — product hero loads in 50ms from cache while reviews take 400ms from API; the hero shows instantly and only the reviews section shows a skeleton. Above-fold content always get their own fast queries; below-fold gets slower, independent ones.
>
> For Suspense integration: the Suspense `fallback` prop should be a skeleton that matches the content, not a generic spinner — this prevents the content-pop layout shift when Suspense resolves."

### Likely Follow-up Questions
1. "What is CLS and how do skeletons help?" → CLS (Cumulative Layout Shift) is a Core Web Vitals metric measuring unexpected visual instability — content shifting as it loads. A page that starts with a spinner and loads content below it causes the footer to jump down; a page with no reserved space for images causes text to jump when images pop in. Skeletons reserve the exact space content will occupy so the layout is stable from first paint; the key is exact dimension matching — a skeleton that's 10px too tall causes 10px of CLS
2. "When do you NOT show a skeleton?" → When `staleTime` is high enough that data is always fresh — no loading state ever shown (data serves instantly from cache with no visible fetch). When using `placeholderData: keepPreviousData` — old data stays visible during transition; dim it with opacity instead. When data loads faster than ~100ms — showing a skeleton for 100ms then immediately replacing it causes more visual noise than the load itself; add a minimum display duration of 300ms to prevent flash-of-skeleton
3. "How do you make skeletons accessible?" → Skeletons are decorative content that conveys state — use `aria-hidden="true"` on skeleton elements so screen readers don't try to describe them. Provide a wrapper with `role="status"` and `aria-label="Loading [content name]"` so screen readers announce the loading state. When loading completes, `aria-live="polite"` on the result container announces to screen reader users that content has loaded

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production-ready skeleton library foundation

// Shared shimmer styles (inject once globally)
const shimmerStyles = `
  @keyframes shimmer {
    0% { background-position: 200% 0 }
    100% { background-position: -200% 0 }
  }

  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--skeleton-base, #e2e8f0) 25%,
      var(--skeleton-highlight, #f8fafc) 50%,
      var(--skeleton-base, #e2e8f0) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-shimmer {
      animation: none;
      background: var(--skeleton-base, #e2e8f0);
    }
  }
`;

// Generic skeleton rectangle
export function Skeleton({
  width,
  height,
  className = '',
  borderRadius,
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
  borderRadius?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-shimmer ${className}`}
      style={{
        display: 'block',
        width: width ?? '100%',
        height: height ?? '1em',
        borderRadius: borderRadius ?? '4px',
      }}
    />
  );
}

// Loading state decision helper
function useLoadingState<T>(query: {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
}) {
  const { data, isLoading, isFetching, isPlaceholderData, isError } = query;

  return {
    showSkeleton: isLoading && !data,              // First load: show full skeleton
    showProgressBar: isFetching && !!data,         // Background refresh: subtle indicator
    isStale: isPlaceholderData,                    // Transitioning: dim current data
    showError: isError && !data,                   // No data to fall back to
    showStaleError: isError && !!data,             // Error but data exists: show staleness banner
  };
}

// Usage example:
function OrderList() {
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.list,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const { showSkeleton, showProgressBar, isStale, showError } = useLoadingState(query);

  if (showSkeleton) return (
    <div role="status" aria-label="Loading orders">
      {Array.from({ length: 10 }, (_, i) => <OrderRowSkeleton key={i} />)}
    </div>
  );

  if (showError) return <ErrorState onRetry={query.refetch} />;

  return (
    <div>
      {showProgressBar && <TopProgressBar />}
      <table style={{ opacity: isStale ? 0.6 : 1 }}>
        {query.data?.orders.map(order => (
          <OrderRow key={order.id} order={order} />
        ))}
      </table>
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

**SFB loading hierarchy:**
- **S**keleton: `isLoading && !data` — first time, no cache, full page element
- **F**etch indicator: `isFetching && data` — background, subtle top bar only
- **B**anner: `isError && data` — stale data, show badge not error state

**CLS prevention — SIZE rule:**
- **S**ize skeleton to match content exactly (measure in DevTools)
- **I**mages: `aspect-ratio` CSS to reserve space
- **Z**ero skeleton for cached data — use opacity dimming
- **E**rror follows skeleton (no hang — always transition to error after timeout)

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The `isLoading` vs `isFetching` distinction is the most common skeleton UX bug in production React applications — using `isFetching` causes skeletons to flash on every window focus, every refetch interval, and every cache invalidation, making the UI feel broken and unstable; `isLoading` (first load only) is the correct gate for full skeletal replacement
→ CLS (Cumulative Layout Shift) directly affects SEO (Core Web Vitals are a ranking factor) and user experience — Google defines "good" CLS as < 0.1; a single category page with improperly-sized skeletons can score > 0.25 (poor), reducing organic search traffic; matching skeleton dimensions exactly is a business-impacting technical requirement
→ Progressive loading (independent queries per page section) is the correct model for complex pages — a product detail page with 5 data sources shouldn't wait for the slowest one before showing any content; the product hero appears in 50ms, reviews section skeleton loads independently and hydrates at 400ms; perceived performance is dramatically better even though total network time is the same

**How it works (2 sentences):**
TanStack Query's `isLoading` flag is true only when `status === 'pending'` AND `fetchStatus === 'fetching'` simultaneously — meaning the query has no cached data AND is currently fetching; once any successful response is stored in cache, `isLoading` is permanently false for that query key (even if the cached data goes stale and triggers a background refetch), while `isFetching` remains true-during-fetches indefinitely.
Skeleton loaders prevent CLS by occupying the exact pixel dimensions of incoming content in the DOM from the moment the parent component mounts — the browser paints the skeleton during the same layout pass as the surrounding page structure, so when the skeleton is replaced by real content of the same dimensions, no reflow occurs and no layout shift is registered by the browser's paint timeline.

---
✅ Topic 164/486 complete

---

✅ SEQ 7 complete — 16 topics done (Topics 149–164). Say **GO** to start SEQ 8: Performance Optimization
