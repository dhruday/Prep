# Infinite Scroll Feed — Virtualisation, Cursor Pagination
> Part 19 — System Design Case Studies · 🔥 High Frequency (Frontend)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Infinite scroll**: load more items as the user scrolls toward the bottom; triggered by IntersectionObserver watching a sentinel div at the bottom of the list; no "Load More" button needed
- **Cursor pagination**: instead of `OFFSET 20 LIMIT 20` (position-based), use the last seen item's ID or timestamp as the cursor for the next page; stable even when new items are inserted; `WHERE created_at < :cursor LIMIT 20`; no duplicate/skipped items
- **Why not offset**: with a live feed, new items inserted at the top shift everything; page 2 at `OFFSET 20` might now be items you already saw on page 1; offset pagination is unstable for live data
- **Virtualisation (windowed list)**: only render DOM nodes for items currently visible on screen (plus a small buffer); a feed with 1,000 loaded items doesn't create 1,000 DOM nodes; use `react-window` or `react-virtual` (TanStack Virtual); DOM size stays constant regardless of how many items are loaded
- **Why virtualisation**: 1,000+ DOM nodes slow down scroll performance (layout recalculation, style recompute, paint); browsers struggle with thousands of complex card nodes; virtualise when you expect > 50-100 items loaded at once
- **Row height problem**: virtualisation needs to know item heights to calculate scroll position; variable-height items (Twitter-style cards with varying text) require either fixed height or estimated height with dynamic measurement
- **IntersectionObserver for trigger**: watch a sentinel div added after the last item; when it enters the viewport, fetch the next page; cleaner than scroll event listener (no jitter, no debounce needed)
- **State management**: store all loaded items as one flat array; cursor = last item's ID/timestamp; `hasMore` boolean to stop fetching when at the end; deduplication by item ID to handle re-fetches

---

## 1. One-Line Definition
Infinite scroll delivers a seamless endless feed by loading items on demand as the user scrolls (triggered by IntersectionObserver), using cursor-based pagination for stable ordering on live data, and virtualising the DOM with a windowed list renderer so performance stays constant regardless of how many items have been loaded.

---

## 2. The Problem It Solves

A news feed loads the first page. User scrolls; the app loads page 2, then page 3, then page 4. After 5 minutes of scrolling, 500 articles are in the DOM as React nodes. The scroll becomes janky — every pixel of scroll causes layout recalculation across 500 complex DOM trees. The browser tab uses 2GB of memory. The app eventually crashes on a mid-range phone.

Meanwhile, new articles are published. The OFFSET pagination means page 3 now contains articles that were on page 2 when they loaded — the user skips articles they haven't seen, or sees duplicates.

Virtualisation solves the performance problem (constant DOM size). Cursor pagination solves the stability problem (stable anchor point).

---

## 3. How It Works Internally

### Cursor Pagination (Server)

```
Initial load:
  GET /api/feed?limit=20
  → returns { items: [...20 items], cursor: "2024-01-15T08:00:00Z" }
  
  cursor = createdAt of the last (oldest) item in the batch

Next page:
  GET /api/feed?cursor=2024-01-15T08:00:00Z&limit=20
  SQL: SELECT * FROM posts ORDER BY created_at DESC 
       WHERE created_at < '2024-01-15T08:00:00Z' LIMIT 20
  → returns next 20 items older than cursor

  Why this is stable:
  - New posts appear ABOVE the cursor (they have newer timestamps)
  - The cursor anchors to a specific time; scrolling down gets progressively older items
  - A new post added while user is reading does NOT shift what's below cursor
```

### Virtualisation (Client)

```
DOM without virtualisation (1000 items loaded):
  <div class="feed">
    <article>...</article>  ← item 1
    <article>...</article>  ← item 2
    ...
    <article>...</article>  ← item 1000  (all in DOM, most are off-screen)
  </div>
  → 1000 DOM nodes, constant layout recalculation, slow scroll

DOM with virtualisation (1000 items loaded, viewport shows 10):
  <div class="feed" style="height: 50000px">  ← total height = estimate
    <div style="position:absolute; top: 2400px; height: 120px">
      <article>...</article>  ← item 21 (visible)
    </div>
    <div style="position:absolute; top: 2520px; height: 135px">
      <article>...</article>  ← item 22 (visible)
    </div>
    ...
    (items 23-30 visible = 10 total DOM nodes)
    (items 1-20 and 31-1000 are NOT in the DOM)
  </div>
  → ~15 DOM nodes regardless of list size, smooth 60fps scroll
```

---

## 4. The Code

### Wrong Way — Offset Pagination + No Virtualisation

```typescript
// ❌ OFFSET pagination: unstable with live data; full DOM rendering

function NaiveFeed() {
    const [items, setItems]     = useState<FeedItem[]>([]);
    const [page, setPage]       = useState(0);
    const [loading, setLoading] = useState(false);
    
    // ❌ Scroll event listener: fires on every pixel, needs debounce, battery drain
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
                loadMore();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [page]);
    
    const loadMore = async () => {
        if (loading) return;
        setLoading(true);
        
        // ❌ OFFSET pagination: new items inserted at top shift all OFFSET positions
        // After 3 pages, user might see items from page 1 again or skip items
        const data = await fetch(`/api/feed?offset=${page * 20}&limit=20`).then(r => r.json());
        setItems(prev => [...prev, ...data.items]);  // ❌ No deduplication
        setPage(p => p + 1);
        setLoading(false);
    };
    
    // ❌ Renders ALL loaded items as DOM nodes — 500 items later: janky scroll, high memory
    return (
        <div>
            {items.map(item => <FeedCard key={item.id} item={item} />)}
            {loading && <Spinner />}
        </div>
    );
}
```

```typescript
// ✅ Cursor pagination + IntersectionObserver + TanStack Virtual

import { useVirtualizer } from '@tanstack/react-virtual';
import { useState, useEffect, useRef, useCallback } from 'react';

interface FeedItem { id: string; content: string; createdAt: string; author: string; /* ... */ }
interface FeedPage { items: FeedItem[]; nextCursor: string | null; hasMore: boolean; }

function useCursorFeed() {
    const [items, setItems]     = useState<FeedItem[]>([]);
    const [cursor, setCursor]   = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const seenIds               = useRef<Set<string>>(new Set());  // ✅ Dedup guard
    
    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        
        try {
            const url = cursor
                ? `/api/feed?cursor=${encodeURIComponent(cursor)}&limit=20`
                : `/api/feed?limit=20`;
            
            const page: FeedPage = await fetch(url).then(r => r.json());
            
            // ✅ Deduplicate: can happen on re-mounts or network retries
            const newItems = page.items.filter(item => {
                if (seenIds.current.has(item.id)) return false;
                seenIds.current.add(item.id);
                return true;
            });
            
            setItems(prev => [...prev, ...newItems]);
            setCursor(page.nextCursor);
            setHasMore(page.hasMore);
        } finally {
            setLoading(false);
        }
    }, [cursor, hasMore, loading]);
    
    // ✅ Load initial page on mount
    useEffect(() => { loadMore(); }, []);
    
    return { items, loading, hasMore, loadMore };
}

function InfiniteScrollFeed() {
    const { items, loading, hasMore, loadMore } = useCursorFeed();
    const containerRef  = useRef<HTMLDivElement>(null);
    const sentinelRef   = useRef<HTMLDivElement>(null);
    
    // ✅ TanStack Virtual: virtualise the item list
    const rowVirtualizer = useVirtualizer({
        count:             items.length + (hasMore ? 1 : 0),  // +1 for sentinel/loader
        getScrollElement:  () => containerRef.current,
        estimateSize:      (index) => 120,  // estimated item height (measured dynamically below)
        overscan:          5,               // ✅ render 5 extra items above/below viewport
    });
    
    // ✅ IntersectionObserver: triggers loadMore when sentinel enters viewport
    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading) {
                    loadMore();
                }
            },
            { root: containerRef.current, rootMargin: '200px', threshold: 0 }
        );
        
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadMore, items.length]);
    
    return (
        <div
            ref={containerRef}
            className="feed-container"
            style={{ height: '100vh', overflowY: 'auto' }}
        >
            {/* ✅ Total height container: TanStack Virtual measures this */}
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                
                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                    const isLoader = virtualItem.index >= items.length;
                    
                    return (
                        <div
                            key={virtualItem.key}
                            // ✅ Each virtual item is absolutely positioned
                            style={{
                                position: 'absolute',
                                top:    `${virtualItem.start}px`,
                                width:  '100%',
                                // ✅ Dynamic height measurement: TanStack Virtual adjusts total height
                            }}
                            ref={rowVirtualizer.measureElement}  // ✅ Auto-measure actual height
                            data-index={virtualItem.index}
                        >
                            {isLoader ? (
                                // ✅ Sentinel / loading indicator at the bottom
                                <div ref={sentinelRef} style={{ padding: '20px', textAlign: 'center' }}>
                                    {loading ? <Spinner /> : (hasMore ? 'Scroll for more' : 'All caught up!')}
                                </div>
                            ) : (
                                <FeedCard item={items[virtualItem.index]} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ✅ Backend cursor pagination endpoint
```

### Backend: Cursor Pagination

```java
// ✅ Cursor-based feed endpoint — stable for live data

@GetMapping("/api/feed")
public ResponseEntity<FeedPage> getFeed(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") int limit) {
    
    // ✅ Validate limit: prevent abuse
    int clampedLimit = Math.min(Math.max(1, limit), 50);
    
    Instant cursorTime = cursor != null
        ? Instant.parse(cursor)          // ISO-8601 timestamp cursor
        : Instant.now().plusSeconds(1);  // ✅ Slightly future → includes posts made "now"
    
    // ✅ Fetch one extra item to determine hasMore
    List<Post> posts = feedRepository.findPostsBefore(
        user.getUsername(),
        cursorTime,
        clampedLimit + 1   // fetch one extra
    );
    
    boolean hasMore = posts.size() > clampedLimit;
    List<Post> page = hasMore ? posts.subList(0, clampedLimit) : posts;
    
    // ✅ Next cursor = createdAt of last item in this page
    String nextCursor = page.isEmpty() ? null
        : page.get(page.size() - 1).getCreatedAt().toString();
    
    return ResponseEntity.ok(new FeedPage(
        page.stream().map(this::toDto).collect(toList()),
        nextCursor,
        hasMore
    ));
}

// SQL:
// SELECT * FROM posts p
// JOIN follows f ON p.user_id = f.following_id
// WHERE f.follower_id = :userId
//   AND p.created_at < :cursor
// ORDER BY p.created_at DESC
// LIMIT :limit    ← limit + 1 to detect hasMore
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why is cursor pagination better than offset pagination for a social feed?"

**Hruday's answer:**
> Offset pagination breaks when the underlying data changes between pages.
>
> Imagine the feed has posts [A, B, C, D, E, F]. User loads page 1: [A, B, C]. Before they scroll to page 2, a new post [X] is published. Now the list is [X, A, B, C, D, E, F]. Page 2 with `OFFSET 3 LIMIT 3` returns [C, D, E] — but C was on page 1 already. The user sees a duplicate.
>
> Cursor pagination anchors to a specific point in the data. After loading A, B, C, the cursor is C's timestamp. "Give me posts older than C's timestamp" returns [D, E, F] regardless of whether X was published. X is newer than C and never appears below C — it's above C in the feed, which the user has already passed. Stable, no duplicates.
>
> The only trade-off: users can't jump to "page 10" arbitrarily — cursor pagination is sequential. For a social feed, this is fine — the use case is purely linear scrolling. For a paginated search results interface where users navigate to page 7 directly, offset pagination with numbered pages is still appropriate.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does virtualisation know where to position each item if items have variable heights?"

**Hruday's answer:**
> Variable-height virtualisation has two approaches: estimated height with dynamic measurement, and exact height with pre-measurement.
>
> TanStack Virtual's `measureElement` approach: start with an estimated height (say 120px) per item. The virtualiser uses this to calculate total scroll height and initial positions. When an item is actually rendered, attach a `ref` that calls `measureElement` — this function reads the real DOM height and updates the virtualiser's records. The virtualiser then recalculates positions for all items after the measured one and updates the total scroll height.
>
> This causes a slight position shift on first measurement — users scrolling quickly might notice items "jump" to their final positions. To minimise this, the `overscan` setting renders extra items above and below the viewport, so by the time the user scrolls to an item, its height has already been measured.
>
> In practice: for a social feed where posts have similar structures (one image + 2-3 lines of text), the variance is small enough that an estimated height of ~120px with dynamic adjustment produces imperceptible jumps. For extremely variable content (some posts have 1 line, some have 20), consider skeleton loading where all items initially load as a placeholder at a fixed height before content fills in.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose to NOT use virtualisation?"

**Hruday's answer:**
> Virtualisation adds significant complexity: absolute positioning, height estimation, scroll offset calculations, dynamic measurement. The trade-off is only worth it when the performance cost of full DOM rendering exceeds the complexity cost of virtualisation.
>
> For lists under 50-100 items, virtualisation is unnecessary. A feed that loads 20 items per page and the user rarely goes beyond 100 items doesn't need it — 100 DOM nodes is trivial for modern browsers.
>
> Virtualisation also makes some features harder: jump-to-position (bookmarks, "scroll to comment") requires recalculating the position of the target item, which may not be rendered yet; CMD+F browser search doesn't work on virtualised content (off-screen items have no DOM nodes to search); infinite scroll analytics (tracking "user saw item X") needs careful handling since items may not be rendered when they "should" be visible.
>
> My decision rule: virtualise when you expect users to accumulate more than 100-200 items in a single scroll session, or when item rendering is expensive (complex React trees, many media nodes). For simpler lists (settings pages, small data tables), no virtualisation. For social feeds where users can scroll for minutes and accumulate thousands of posts, always virtualise.

---

### Q4 — System Design Angle
**Interviewer asks:** "How do you handle 'new posts available — tap to refresh' for a social feed using infinite scroll?"

**Hruday's answer:**
> You maintain a separate WebSocket/SSE connection for live updates, decoupled from the pagination state.
>
> When the feed loads, the client subscribes to their user's feed update channel. The fan-out service (from the social feed topic) publishes an event when new posts land in a user's feed cache. The client receives this event and increments a "new posts" counter without automatically inserting them into the scroll position — that would cause a scroll jump.
>
> Display: a sticky pill/banner at the top: "3 new posts — tap to see." This is a pattern used by Twitter, LinkedIn, Instagram. When the user taps, the new posts are inserted at the top of the items array, the cursor is updated to the newest post's timestamp, and the scroll position jumps to the top.
>
> Implementation: keep a `newItems` buffer separate from the main `items` array. WebSocket events add to `newItems`. The UI shows `newItems.length > 0 && 'N new posts'`. On tap: `setItems(prev => [...newItems, ...prev]); setNewItems([]); scrollToTop()`.
>
> This avoids the jarring experience of items suddenly jumping into view while the user is mid-scroll. The user controls when new content appears. The infinite scroll pagination state (cursor, hasMore) is unaffected.

---

## 6. The Traps

| Trap | What most candidates say | what Hruday says |
|------|--------------------------|------------------|
| Scroll event for trigger | "I'll listen to the window scroll event and check if the user is near the bottom" | Scroll events fire very frequently (60-120x/second during scroll); need debounce/throttle to avoid triggering multiple fetches; still less precise than IntersectionObserver which fires exactly once when the sentinel crosses the viewport boundary; IntersectionObserver fires from the main thread but doesn't suppress smooth scroll performance like intensive scroll handlers do; also: `window.scrollY + window.innerHeight >= document.body.scrollHeight - threshold` calculation is fragile if the feed is inside a scrollable container rather than the window |
| No loading state protection | "I'll fetch the next page when the sentinel is visible" | Without a loading guard, the IntersectionObserver can fire multiple times while a fetch is in-flight — if the user rapidly scrolls, multiple concurrent fetches fire, all returning the same cursor, inserting 3-4 copies of the same page; always gate on `!loading` before fetching and set loading=true before the fetch; the deduplication by item ID is a good last-resort safety net but shouldn't be the primary protection |
| Forgetting virtualisation unmounts components | "I'll add useEffect cleanup in FeedCard to save scroll position" | When virtualisation removes a component from the DOM (user scrolled past it), that component unmounts; any `useEffect` cleanup runs; any `useRef` value is destroyed; if FeedCard has an animation or loads an image lazily, those reset when the card re-mounts on scroll-back; for videos or audio players in the feed, unmounting pauses them; design FeedCard components that gracefully handle mount/unmount cycles, or use CSS visibility:hidden instead of unmounting for items that need persistent state (complex but correct) |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I built an activity feed for a project management tool — team members saw updates across all their projects. Early implementation: no virtualisation, offset pagination. As customers scaled to large teams with years of activity, some feeds accumulated 2,000+ items when a user scrolled. The page became unresponsive — Chrome DevTools showed layout recalculation taking 400ms on each scroll frame.
>
> We added TanStack Virtual (windowed rendering) and cursor pagination. The 400ms layout time dropped to 4ms. DOM node count for a 2,000-item feed stayed at ~25 nodes regardless of scroll position. Cursor pagination fixed a bug we'd never properly investigated: some users reported 'missing updates' — they were actually seeing duplicate updates from the offset pagination shifting. Both problems solved in one refactor."

---

## 8. Scale Evolution

**1,000 users / small feed →** Simple `useState` with sequential fetch. Offset pagination is fine at small scale. No virtualisation — 50 items max in a session. IntersectionObserver for trigger (already correct practice).

**100,000 users / growing feed →** Cursor pagination (stable for live data). Basic deduplication by ID. Virtualisation via `react-window` for fixed-height items. Loading guard against concurrent fetches.

**10 million daily users / heavy scroll sessions →** TanStack Virtual with dynamic measurement for variable heights. "New posts available" banner with WebSocket-fed count. Prefetch next page when 3 items from bottom (not on exact bottom hit). Image lazy loading within FeedCard via native `loading="lazy"` or IntersectionObserver. Memory management: when user scrolls past 1,000 items, trim items array and update cursor to allow re-fetching older items on reverse scroll.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant transaction history: infinite scroll over millions of payment records; cursor = transaction timestamp; virtualised table for smooth experience | Cursor pagination; virtualisation for financial data tables |
| Swiggy / Meesho | Meesho product scroll: 100M+ products, infinite scroll is the core UX; Swiggy order history; restaurant menu scroll | Virtualisation at extreme scale; intersectionObserver precision |
| Adobe / Microsoft | LinkedIn-style activity feed (Teams activity); Adobe Lightroom photo grid (thousands of photos virtualised); SharePoint document library infinite scroll | Grid virtualisation; variable height media items |
| SAP Labs | Project activity feed — the real story above; 2000+ items, layout recalculation, TanStack Virtual fix; SAP transaction audit log infinite scroll | Real incident; performance metrics; before/after data |

---

## 10. Related Topics — What to Study Next

- **Topic 305 — Social Media Feed (Backend)** — the backend fan-out system that produces the feed data consumed by infinite scroll; understanding how cursor pagination maps to `ZREVRANGEBYSCORE` on Redis Sorted Set
- **Topic 311 — Autocomplete Search** — when users search within the feed, autocomplete + infinite scroll combine; the search results page uses the same cursor pagination and IntersectionObserver pattern
- **Topic 314 — Design System Architecture** — FeedCard is a design system component; understanding how to publish it with proper prop types, story variants (Storybook), and accessibility annotations
- **Topic 313 related — React 18 Concurrent Features** — `useTransition` for non-blocking state updates during scroll; `useDeferredValue` for deferring expensive re-renders while loading more items

---

*Part 19 · Infinite Scroll Feed — Virtualisation, Cursor Pagination · Full Stack Interview Guide · Hruday D · 2026*
