# 153. Infinite Scrolling Design
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Infinite scrolling is a UX pattern where the next batch of items loads automatically as the user approaches the bottom of the current list, creating a seamless continuous scrolling experience instead of explicit page navigation. It's best suited for content feeds, timelines, and discovery experiences where users browse rather than target a specific record. The implementation has three critical parts: detecting when the scroll sentinel reaches the viewport (IntersectionObserver), fetching additional pages via cursor pagination (TanStack Query's `useInfiniteQuery`), and managing memory consumption for very long sessions via virtualization. Poor infinite scroll implementations suffer from: missing loading feedback, broken accessibility (keyboard navigation loses position), and out-of-memory crashes on sessions that scroll thousands of items without releasing DOM nodes.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### IntersectionObserver — The Right Detection Mechanism

```typescript
// ❌ DO NOT use scroll event listener for infinite scroll detection
// Scroll events fire 60–120 times per second; each handler runs on the main thread
// Even throttled: expensive, jank-inducing, imprecise

window.addEventListener('scroll', handleScroll);  // ❌ never

// ✅ IntersectionObserver — browser native, off main thread until threshold is met
// Callback fires only when the sentinel element enters/exits the viewport
// Zero main-thread overhead during scroll; only fires on threshold crossing

function useSentinel(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) callback(); },
      { threshold: 0.1, rootMargin: '200px', ...options }
      // rootMargin: '200px' — triggers 200px before the sentinel enters viewport
      //   → starts fetching before user reaches bottom → seamless (no visible loading pause)
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [callback]);

  return sentinel;
}
```

### Complete Infinite Scroll with TanStack Query

```typescript
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

interface ProductPage {
  items: Product[];
  nextCursor: string | null;
  total: number;
}

function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: ({ pageParam, signal }) =>
      api.products.listCursor({ ...filters, after: pageParam, limit: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5 * 60_000,
    // gcTime: 30 * 60_000 — keep all pages in cache for 30 min after unmount
    // placeholderData: keepPreviousData — keep current items visible while refetching
  });
}

function InfiniteProductList({ filters }: { filters: ProductFilters }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteProducts(filters);

  // Stable callback for sentinel — useCallback prevents sentinel re-registration
  const handleSentinel = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinel = useSentinel(handleSentinel, { rootMargin: '200px' });

  // Flatten all pages into a single array
  const products = data?.pages.flatMap(page => page.items) ?? [];

  // Total from first page (cursor pagination often includes total on page 1 only)
  const total = data?.pages[0]?.total;

  if (isLoading) return <ProductGridSkeleton count={20} />;
  if (isError) return (
    <ErrorState error={error} onRetry={refetch} message="Failed to load products" />
  );
  if (products.length === 0) return <EmptyState message="No products found" />;

  return (
    <section aria-label="Product list">
      {total && (
        <p aria-live="polite">{products.length} of {total} products loaded</p>
      )}

      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Sentinel — sits at the bottom; observed by IntersectionObserver */}
      <div
        ref={sentinel}
        aria-hidden="true"
        style={{ height: 1 }}  // 1px tall — enough to observe without layout impact
      />

      {/* Loading feedback while next page fetches */}
      {isFetchingNextPage && (
        <div role="status" aria-label="Loading more products">
          <ProductGridSkeleton count={4} />
        </div>
      )}

      {/* End-of-list message */}
      {!hasNextPage && products.length > 0 && (
        <p role="status" aria-live="polite">
          All {products.length} products loaded
        </p>
      )}

      {/* Manual load-more fallback for accessibility and no-JS */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          aria-label="Load more products"
          className="load-more-btn"  // Can be visually hidden if auto-scroll is working
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more products'}
        </button>
      )}
    </section>
  );
}
```

### Memory Management — DOM Virtualization for Long Sessions

```typescript
// Problem: after 50 page fetches × 20 items = 1,000 DOM nodes
// Each with images, event listeners, inline styles → memory builds up
// Mobile browsers crash at ~3,000–5,000 DOM nodes

// Solution: react-window (fixed size) or tanstack-virtual (variable size)

import { FixedSizeGrid, VariableSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

function VirtualizedInfiniteProducts({ filters }: { filters: ProductFilters }) {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteProducts(filters);

  const products = data?.pages.flatMap(p => p.items) ?? [];
  // Estimate total items for virtual list sizing:
  // hasNextPage ? products.length + 20 : products.length
  const itemCount = hasNextPage ? products.length + 1 : products.length;

  const isItemLoaded = (index: number) => !hasNextPage || index < products.length;

  const loadMoreItems = isFetchingNextPage ? () => {} : fetchNextPage;

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={600}
          itemCount={itemCount}
          itemSize={120}             // ← each product card is 120px tall
          ref={ref}
          onItemsRendered={onItemsRendered}
          width="100%"
        >
          {({ index, style }) => {
            if (!isItemLoaded(index)) {
              return <div style={style}><ProductCardSkeleton /></div>;
            }
            return (
              <div style={style}>
                <ProductCard product={products[index]} />
              </div>
            );
          }}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
}
```

### Accessibility — The Forgotten Dimension

```typescript
// Infinite scroll has major accessibility problems by default:
// 1. Screen reader users don't know new content loaded
// 2. Keyboard users lose focus position after new items append
// 3. Browser find (Ctrl+F) only searches already-rendered nodes

// Fix 1: aria-live region for "loaded X more items"
function ItemCountAnnouncer({ loaded, total }: { loaded: number; total?: number }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {total
        ? `${loaded} of ${total} items loaded`
        : `${loaded} items loaded`
      }
    </div>
  );
}

// Fix 2: Load-more button for keyboard users
// The sentinel auto-loads, but keyboard users need an explicit button
// Position it in the focus order after the last item

// Fix 3: Focus management after new items load
// After fetchNextPage resolves, focus the first NEW item
function useNewItemFocus(products: Product[], prevCount: number) {
  const firstNewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (products.length > prevCount && firstNewRef.current) {
      firstNewRef.current.focus();  // focus first new item
    }
  }, [products.length, prevCount]);
  return firstNewRef;
}
```

### Handling Filter Resets

```typescript
// When user changes a filter, the infinite list must reset to the beginning
// useInfiniteQuery does this automatically when queryKey changes

function InfiniteProductDirectory() {
  const { filters, setFilters } = useProductFilters();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteProducts(filters);
  // ← When filters change, queryKey changes, TanStack Query starts a fresh
  // infinite sequence — all accumulated pages are discarded; starts at page 1

  const products = data?.pages.flatMap(p => p.items) ?? [];

  const handleFilterChange = (updates: Partial<ProductFilters>) => {
    // Update URL state — which changes the filters object — which changes queryKey
    setFilters(updates);
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <FilterBar onChange={handleFilterChange} />
      {isLoading ? (
        <ProductGridSkeleton count={20} />
      ) : (
        <InfiniteProductList
          products={products}
          onLoadMore={() => !isFetchingNextPage && hasNextPage && fetchNextPage()}
          hasMore={hasNextPage}
          isLoading={isFetchingNextPage}
        />
      )}
    </>
  );
}
```

### Bidirectional Infinite Scroll (Chat History)

```typescript
// For chat/message history: load more older messages on scroll UP
function useBidirectionalMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam, signal }) =>
      api.messages.list({
        channelId,
        before: pageParam?.before,    // older messages
        after: pageParam?.after,      // newer messages
        limit: 50,
      }, signal),

    initialPageParam: { before: undefined as string | undefined, after: undefined as string | undefined },
    getNextPageParam: (lastPage) =>            // older messages (scroll up)
      lastPage.pageInfo.hasPreviousPage
        ? { before: lastPage.pageInfo.startCursor }
        : undefined,
    getPreviousPageParam: (firstPage) =>       // newer messages (new real-time messages)
      firstPage.pageInfo.hasNextPage
        ? { after: firstPage.pageInfo.endCursor }
        : undefined,
  });
}
```

### ⚠️ Anti-Patterns & Pitfalls

- **Scroll event listeners instead of IntersectionObserver** — scroll events on the main thread at 120fps cause jank; IntersectionObserver fires off main thread; never use `window.addEventListener('scroll', ...)` for infinite scroll detection

- **No end-of-list message** — without explicit "All X items loaded" feedback, users scroll endlessly wondering if more items exist; always render a clear end state when `!hasNextPage`

- **Not providing a "Load More" button fallback** — keyboard-only users and users in power-save mode (IntersectionObserver may be disabled) need an explicit control; the sentinel is an enhancement, not the only mechanism

- **Growing DOM nodes without virtualization** — at 1,000+ items, performance degrades noticeably on mobile (scroll jank, memory pressure); implement virtualization after ~200 items in the DOM simultaneously

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier document list (5,000+ documents per supplier) was originally a paginated table with a "Next 50" button. Users in procurement complained about losing context on their current document when navigating pages. Migrated to infinite scroll with IntersectionObserver + `useInfiniteQuery`. Additionally added `react-window` virtualization after performance profiling showed 2,000+ DOM nodes for heavy users. Mobile scroll dropped from 22fps (jank) to 60fps.

**At FAANG scale:**
- **Microsoft:** LinkedIn (Microsoft acquisition) feed — cursor-based infinite scroll with predictive prefetch; `rootMargin: '500px'` loads the next page 500px before reaching the bottom; virtualization keeps max ~30 items in DOM at once despite thousands fetched
- **Adobe:** Behance discovery feed — IntersectionObserver triggers `fetchNextPage` 400px before bottom; masonry layout virtualization via custom virtual scroller; scroll position preserved on back navigation via `sessionStorage`
- **Salesforce:** Chatter activity feed — infinite scroll for community posts; bidirectional: new posts appear at top (via polling/WebSocket), historical posts load at bottom; `aria-live: polite` announces new post count to screen readers
- **Cisco:** Alert/event feed in network monitoring — 1,000+ events per session; `react-window` FixedSizeList with infinite loader; oldest events recycled from DOM as user scrolls down

**How it evolves with scale:**
- < 200 items total: infinite scroll is optional; pagination may suffice
- 200–1,000 items: IntersectionObserver + useInfiniteQuery; no virtualization needed yet
- 1,000–10,000 items per session: add react-window virtualization
- 10,000+ items per session: virtualization mandatory; also consider limiting session depth with a "start fresh" option

---

## 💬 4. Interview Execution

### Sample Answer

> "Infinite scrolling has three separately solvable problems. First, detection: I always use IntersectionObserver with a sentinel element at the bottom of the list, a `rootMargin` of 200 pixels (so we start fetching before the user actually hits the bottom), and a `threshold` of 0.1. Scroll event listeners are the wrong tool — they fire 120 times per second on the main thread and cause jank.
>
> Second, data fetching: TanStack Query's `useInfiniteQuery` manages the pages array, cursor tracking, and `hasNextPage` state. `getNextPageParam` extracts the cursor from the last page's response. New pages append to `data.pages`; I flatten them with `flatMap`.
>
> Third, memory: at 1,000+ DOM nodes, mobile browsers start to jank. I add `react-window` virtualization — only the visible items are in the DOM, recycled as you scroll. `react-window-infinite-loader` bridges the two.
>
> The accessibility dimension is usually forgotten: I always include an explicit 'Load more' button as a fallback for keyboard users, and an `aria-live` region that announces when new items have been appended.
>
> At SAP, adding virtualization to a 5,000-item document list took mobile scroll from 22fps to a consistent 60fps."

### Likely Follow-up Questions
1. "How does `rootMargin: '200px'` work?" → IntersectionObserver considers the element 'visible' 200px before it actually enters the viewport — this pre-triggers the fetch so it completes before the user reaches the bottom, creating a seamless experience; without rootMargin, the user sees a brief loading spinner
2. "How do you preserve scroll position on back navigation?" → Store the scroll position in `sessionStorage` before navigation; on mount, check for a stored position and call `window.scrollTo()` after the first page renders; TanStack Query's cache keeps the pages so re-mounting doesn't re-fetch
3. "How do you handle concurrent filter changes during loading?" → Changing filters changes the `queryKey`, which causes `useInfiniteQuery` to start a new sequence from scratch; the previous in-flight request is automatically cancelled via `AbortSignal`; scroll back to top on filter change
4. "What's the difference between `isLoading` and `isFetchingNextPage`?" → `isLoading`: first load, no data — show full skeleton; `isFetchingNextPage`: loading additional pages — the existing items are visible, only show a skeleton/spinner at the bottom
5. "How do you implement 'load more' for chat (reverse scroll)?" → `useInfiniteQuery` supports both `getNextPageParam` (scroll down → older messages) and `getPreviousPageParam` (new messages pushing from top); maintain scroll position manually after prepending items (store scrollY before and after DOM mutation, then restore)

---

## 💻 5. Code Example (TypeScript)

```typescript
// Production-ready infinite scroll hook + component

// Custom hook: abstract all infinite scroll logic
function useInfiniteScroll<T>({
  queryKey,
  queryFn,
  rootMargin = '200px',
  enabled = true,
}: {
  queryKey: unknown[];
  queryFn: (params: { pageParam: string | undefined; signal: AbortSignal }) => Promise<{
    items: T[];
    nextCursor: string | null;
    total?: number;
  }>;
  rootMargin?: string;
  enabled?: boolean;
}) {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => queryFn({ pageParam: pageParam as string | undefined, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });

  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data?.pages]
  );
  const total = data?.pages[0]?.total;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinel = useSentinel(loadMore, { rootMargin });

  return {
    items,
    total,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    sentinel,
    loadMore,
  };
}

// Component using the hook
function NotificationFeed() {
  const {
    items: notifications,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    sentinel,
    loadMore,
  } = useInfiniteScroll<Notification>({
    queryKey: ['notifications', 'infinite'],
    queryFn: ({ pageParam, signal }) =>
      api.notifications.list({ after: pageParam, limit: 20 }, signal),
    rootMargin: '300px',
  });

  if (isLoading) return <NotificationListSkeleton />;

  return (
    <section aria-label="Notifications">
      {/* Accessible live region */}
      <div role="status" aria-live="polite" className="sr-only">
        {isFetchingNextPage ? 'Loading more notifications' : ''}
      </div>

      <ul>
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </ul>

      {/* Sentinel: IntersectionObserver target */}
      <div ref={sentinel} aria-hidden="true" />

      {/* Visible loading feedback */}
      {isFetchingNextPage && <NotificationListSkeleton count={3} />}

      {/* Explicit "Load more" button — accessibility + progressive enhancement */}
      {hasNextPage && !isFetchingNextPage && (
        <button onClick={loadMore} className="load-more">
          Load older notifications
        </button>
      )}

      {!hasNextPage && notifications.length > 0 && (
        <p role="status">All notifications loaded</p>
      )}
    </section>
  );
}
```

---

## 🧠 6. Memory Aid

**Infinite scroll stack — SFV:**
- **S**entinel + IntersectionObserver (detect)
- **F**etch with useInfiniteQuery (data)
- **V**irtualize with react-window (memory)

**Three states to show — LME:**
- **L**oading: `isLoading && !data` → full skeleton
- **M**ore loading: `isFetchingNextPage` → bottom skeleton/spinner
- **E**nd: `!hasNextPage && items.length` → "All X items loaded"

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The IntersectionObserver vs scroll event distinction is a genuine interview differentiator — candidates who say "I listen to the scroll event and check if `scrollTop + clientHeight >= scrollHeight`" are describing a pattern that causes main-thread congestion; candidates who say "I use IntersectionObserver with a sentinel and `rootMargin`" demonstrate browser API knowledge and performance awareness
→ Memory management for infinite feeds is a mobile crash risk that only surfaces after real usage — an admin who spends 2 hours scrolling through 3,000 records without virtualization is adding 3,000 DOM nodes, each with event listeners and images; on a mid-range Android device this causes OOM; virtualization with react-window keeps the DOM stable at ~30 nodes regardless of how many records have been fetched
→ The "Load more" button as accessibility fallback is a WCAG requirement consideration — keyboard-only users cannot trigger IntersectionObserver (they don't scroll the viewport); without an explicit button, they're blocked from accessing content below the initially loaded page

**How it works (2 sentences):**
IntersectionObserver is a browser API that observes a target element's intersection with an ancestor scroll container (or the viewport) — when the target element's intersection ratio crosses the specified threshold, the browser calls the callback off the main thread (using the compositor thread to detect intersection during paint), meaning no main-thread JavaScript runs during scroll, only when the threshold is crossed; the callback then runs on the main thread to trigger `fetchNextPage()`.
`useInfiniteQuery` maintains a `pages` array in the TanStack Query cache where each element is the response from one `queryFn` call — `fetchNextPage()` appends to this array using the cursor from `getNextPageParam(lastPage)` as the `pageParam` for the next call; when the `queryKey` changes (e.g., a filter changes), the entire `pages` array is discarded and a fresh sequence begins from `initialPageParam`, which is why filter changes cause the list to reset to the beginning.

---
✅ Topic 153/486 complete → Continuing to Topic 154: Cursor-Based vs Offset Pagination Trade-offs
