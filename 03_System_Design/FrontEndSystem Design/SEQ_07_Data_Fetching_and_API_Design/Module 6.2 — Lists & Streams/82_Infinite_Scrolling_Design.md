# 82. Infinite Scrolling Design

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Infinite scrolling** is a UX pattern where new content loads automatically as the user scrolls toward the bottom of a list, eliminating explicit "next page" clicks. It's the dominant pattern for content feeds (LinkedIn, Twitter, Facebook, YouTube) because it keeps users in flow and reduces perceived load time — content appears *before* the user explicitly requests it. The architectural challenge is designing it correctly: managing memory as items accumulate, handling back-navigation gracefully, ensuring accessibility with keyboard users, and avoiding scroll position loss on re-renders. At scale, infinite scroll also requires windowing (virtual DOM) to avoid memory and rendering performance degradation.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture & Component Boundaries

```
Viewport
  ↓
Scroll Container
  ├── Loaded Items (rendered in DOM)
  │    └── Each item: ProductCard, PostCard, etc.
  ├── Sentinel Element (IntersectionObserver target)
  └── Loading Indicator (conditional)

State:
  ├── React Query InfiniteQuery (pages of data)
  ├── Scroll position (for restoration)
  └── Loading/Error states per page
```

### Implementation Approach 1: IntersectionObserver

**The modern, performant approach:**
```typescript
// The Sentinel Pattern
// Place an invisible div at the bottom of the list
// When it becomes visible → fetch next page

function useIntersectionObserver(
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        root: null,             // Viewport
        rootMargin: '200px',    // Trigger 200px before element is visible
        threshold: 0,           // Any visibility triggers callback
        ...options,
      }
    );
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options.rootMargin, options.threshold]);
  
  return isIntersecting;
}

// Complete infinite scroll implementation
export function InfiniteScrollList<T>({
  queryKey,
  queryFn,
  renderItem,
  getNextPageParam,
}: InfiniteScrollListProps<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: undefined,
    getNextPageParam,
  });
  
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sentinelRef, { rootMargin: '300px' });
  
  // Trigger fetch when sentinel becomes visible
  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorMessage error={error} />;
  
  const items = data?.pages.flatMap(page => page.items) ?? [];
  
  return (
    <div role="feed" aria-busy={isFetchingNextPage}>
      {items.map(item => renderItem(item))}
      
      {/* Sentinel — must be after all items */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        style={{ height: '1px' }}
      />
      
      {isFetchingNextPage && (
        <div role="status" aria-label="Loading more items">
          <LoadingSpinner />
        </div>
      )}
      
      {!hasNextPage && items.length > 0 && (
        <p aria-live="polite">All items loaded ({items.length} total)</p>
      )}
    </div>
  );
}
```

### Implementation Approach 2: Scroll Event (Legacy/Controlled)

```typescript
// Use when IntersectionObserver isn't sufficient
// (e.g., custom scroll containers, precise control needed)
function useScrollBasedLoader(
  containerRef: RefObject<HTMLElement>,
  fetchNextPage: () => void,
  hasNextPage: boolean,
  threshold = 0.8 // Load when 80% scrolled
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let lastScrollTop = 0;
    
    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercent = (scrollTop + clientHeight) / scrollHeight;
      
      // Only trigger on downward scroll
      if (scrollTop > lastScrollTop && scrollPercent >= threshold && hasNextPage) {
        fetchNextPage();
      }
      
      lastScrollTop = scrollTop;
    }, 100);
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, fetchNextPage, hasNextPage, threshold]);
}
```

### Memory Management — The Critical Problem

```typescript
// Problem: After 50 pages × 20 items = 1000 DOM nodes
// Each node: ~5KB DOM overhead = 5MB just for DOM
// Plus React component trees, event listeners, images

// Solution 1: Virtual DOM (react-virtual / react-window)
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedInfiniteList({ items, fetchMore }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length + 1, // +1 for loader row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,   // Estimated item height in px
    overscan: 5,              // Render 5 extra items above/below viewport
  });
  
  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);
    if (lastItem && lastItem.index >= items.length - 1) {
      fetchMore();
    }
  }, [virtualizer.getVirtualItems(), fetchMore, items.length]);
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {/* Only the outer div has full scroll height */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${item.start}px)`,
              width: '100%',
            }}
          >
            {items[item.index] ? (
              <ProductCard product={items[item.index]} />
            ) : (
              <LoadingRow />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Scroll Position Restoration

```typescript
// Critical UX: User clicks product → back button → should return to same position
// Problem: Router navigation destroys scroll state

// Solution: Save and restore scroll position
function useScrollRestoration(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map());
  
  const savePosition = useCallback(() => {
    scrollPositions.current.set(key, window.scrollY);
  }, [key]);
  
  const restorePosition = useCallback(() => {
    const saved = scrollPositions.current.get(key);
    if (saved !== undefined) {
      window.scrollTo(0, saved);
    }
  }, [key]);
  
  // Save before navigation
  useEffect(() => {
    window.addEventListener('beforeunload', savePosition);
    return () => window.removeEventListener('beforeunload', savePosition);
  }, [savePosition]);
  
  // Restore after mount (returning to page)
  useLayoutEffect(() => {
    restorePosition();
  }, [restorePosition]);
}

// React Query: Keep pages in cache for back-navigation
const { data } = useInfiniteQuery({
  queryKey: ['products', 'feed'],
  queryFn: fetchProducts,
  initialPageParam: undefined,
  getNextPageParam: last => last.cursor,
  gcTime: 10 * 60 * 1000,    // Keep cache 10 minutes for back-nav
  staleTime: 2 * 60 * 1000,  // Background refetch after 2 minutes
});
```

### Accessibility — Often Missed in Interviews

```typescript
// ❌ Inaccessible infinite scroll — keyboard users get trapped
// Screen readers don't know content loaded

// ✅ Accessible infinite scroll
function AccessibleInfiniteList({ items, hasMore, fetchMore }) {
  const announcerRef = useRef<HTMLDivElement>(null);
  const prevItemCount = useRef(0);
  
  // Announce new content to screen readers
  useEffect(() => {
    const newCount = items.length - prevItemCount.current;
    if (newCount > 0 && announcerRef.current) {
      announcerRef.current.textContent = `${newCount} more items loaded. ${items.length} total.`;
    }
    prevItemCount.current = items.length;
  }, [items.length]);
  
  return (
    <>
      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* List with feed semantics */}
      <ul role="feed" aria-label="Product feed">
        {items.map((item, index) => (
          <li key={item.id} aria-setsize={-1} aria-posinset={index + 1}>
            <ProductCard product={item} />
          </li>
        ))}
      </ul>
      
      {/* Manual load button as fallback for keyboard users */}
      {hasMore && (
        <button onClick={fetchMore} aria-label="Load more products">
          Load more
        </button>
      )}
    </>
  );
}
```

### Anti-Patterns & Pitfalls

**1. Scroll event without throttle:**
```typescript
// ❌ Fires 60x/second → jank, potential multiple triggers
window.addEventListener('scroll', loadMore);

// ✅ Throttle or use IntersectionObserver instead
window.addEventListener('scroll', throttle(checkAndLoad, 100), { passive: true });
```

**2. Fetching on every render:**
```typescript
// ❌ Re-fetches every component render
function ProductList() {
  if (items.length - renderedItems.length < 5) fetchMore(); // In render path!
}

// ✅ Only in effects or intersection callbacks
useEffect(() => {
  if (isIntersecting && hasNextPage) fetchNextPage();
}, [isIntersecting, hasNextPage]);
```

**3. No empty state:**
```typescript
// ❌ Returns empty list with no feedback
if (items.length === 0 && !isLoading) return null;

// ✅ Meaningful empty state
if (items.length === 0 && !isLoading) return (
  <EmptyState
    title="No products found"
    description="Try adjusting your filters"
    action={<Button onClick={clearFilters}>Clear filters</Button>}
  />
);
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**LinkedIn Feed (Your Target Company Context):**
- IntersectionObserver triggers load when sentinel is 500px from viewport
- Virtual scrolling kicks in after ~100 posts to keep DOM manageable
- Scroll position saved in sessionStorage → preserved on browser back button
- "New posts available" toast is separate UX — new items prepended, not inline

**Twitter/X Timeline:**
- Infinite scroll with cursor pagination (tweet ID as cursor)
- After ~50 tweets: virtual scrolling active
- Real-time tweets appear at top with "Show 12 new tweets" button
- Back navigation: React Router preserves scroll via scroll restoration API

**Instagram Grid:**
- Image-heavy infinite scroll: thumbnails loaded lazily (IntersectionObserver on each image)
- Grid items have fixed dimensions → consistent virtualizer height estimates
- Prefetch next page when 80% scrolled — imperceptible load delay

**SAP Fiori Tables:**
- SmartTable uses threshold-based loading (load when `growingScrollToLoad = true`)
- Fixed height rows → offset pagination acceptable (bounded dataset)
- `growing` mechanism loads in batches of 25-50 rows

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Infinite scroll has three distinct challenges: triggering loads at the right time, managing memory as items accumulate, and handling accessibility + back-navigation.
>
> For triggering, I use IntersectionObserver with a sentinel element placed after the list — set the rootMargin to '300px' to preload before the user reaches the bottom, making scroll feel seamless. React Query's useInfiniteQuery manages the cursor state and page appending.
>
> The memory challenge is underestimated. After 50 pages of 20 items each, you have 1000 DOM nodes with their React trees, images, and event listeners. Beyond ~100 items, I add virtual scrolling using TanStack Virtual — only the visible rows are in the DOM, typically 20-30 at a time. This keeps DOM size constant regardless of how many pages are loaded.
>
> For back-navigation, I save scroll position before navigation and restore it on return. React Query's gcTime keeps the cached pages so the user returns to the exact state they left, including already-loaded pages.
>
> Accessibility is often forgotten: I add `role='feed'` to the container, use `aria-live='polite'` to announce when new items load, and always provide a visible 'Load More' button as a fallback for keyboard users who can't trigger the scroll intersection."

**Likely Follow-up Questions:**
- "How do you handle network errors mid-scroll?" → React Query retry on error; show inline error with retry button; don't lose already-loaded items
- "How do you implement 'pull to refresh' on mobile?" → Track touch events; delta > threshold → show refresh spinner → invalidate query cache
- "What if items can be deleted from the list?" → React Query mutation + `removeQueries` or optimistic delete with rollback
- "How does this differ from pagination?" → No-click UX, better for discovery; trade-off is no 'go to page 47', harder back-navigation

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (referenced in section 2)

See complete `useIntersectionObserver` + `VirtualizedInfiniteList` implementations in the deep-dive above.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three pillars of infinite scroll:**
1. **Trigger** — IntersectionObserver with rootMargin pre-load
2. **Memory** — Virtual DOM after ~100 items (TanStack Virtual)
3. **Recover** — Scroll position save + React Query cache for back-nav

**Accessibility must-haves:** `role="feed"`, `aria-live` status announcer, manual "Load More" button fallback

If you blank: *"IntersectionObserver on a sentinel element, React Query useInfiniteQuery for cursor management, virtual scrolling after 100+ items to prevent DOM growth."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Flow state maintained — users discover more content without friction  
→ **Performance**: Pre-loading before scroll end means zero perceived delay; virtual DOM prevents memory bloat  
→ **Business**: Higher engagement and session time for content platforms (Instagram, LinkedIn)

**How it works:**
→ A sentinel `<div>` at the bottom of the list is observed by IntersectionObserver. When it enters the viewport (plus a pre-load margin), `fetchNextPage()` is called from `useInfiniteQuery`. New page items are appended to the flat item list. Beyond ~100 items, a virtualizer replaces full DOM rendering with a position-calculated window of ~30 visible items.

**Company relevance:**
→ **Microsoft**: Teams chat history, SharePoint document lists, LinkedIn feed (owned by Microsoft)  
→ **Adobe**: Stock asset browser, Creative Cloud file explorer  
→ **Salesforce**: Einstein Activity Timeline — infinite scroll with insertion of new events  
→ **Cisco**: Security event logs, network flow logs — infinite scroll with time-range filters
