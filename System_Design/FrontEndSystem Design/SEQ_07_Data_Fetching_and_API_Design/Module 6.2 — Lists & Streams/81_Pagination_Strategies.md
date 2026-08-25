# 81. Pagination Strategies

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Pagination** is the strategy for splitting large data sets into smaller chunks to avoid loading thousands of records at once — protecting both server performance and browser memory. Three dominant patterns exist: **offset/limit** (simple, SQL-native), **cursor-based** (scalable, consistent), and **keyset** (database-optimized cursor variant). The choice directly impacts UX (page buttons vs infinite scroll), backend query cost, and data consistency when records are inserted or deleted during browsing. At senior level, the question is understanding *when each pattern breaks down* — offset pagination gives wrong results when new records are inserted, cursor pagination is harder to implement on arbitrary sort fields, and both require careful frontend caching design to support back-navigation.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Pattern 1: Offset/Limit Pagination

**Mechanism:**
```
GET /api/products?offset=40&limit=20
→ Returns records 41-60

SQL: SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 40
```

**How it works in the database:**
```sql
-- Database must scan and discard first 40 rows to return rows 41-60
-- At offset=10000: scans 10,000 rows just to discard them
-- Performance: O(offset) — degrades badly with large offsets
```

**Frontend Implementation:**
```typescript
// React Query with offset pagination
function useProducts(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['products', { page, pageSize }],
    queryFn: () => productApi.getAll({ offset: page * pageSize, limit: pageSize }),
    placeholderData: (previousData) => previousData, // Keep showing old data while loading
    staleTime: 30 * 1000,
  });
}

// Pagination UI
function Paginator({ currentPage, totalPages, onPageChange }) {
  return (
    <nav>
      <button 
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      
      {/* Page numbers — only works with offset pagination */}
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={i === currentPage ? 'active' : ''}
        >
          {i + 1}
        </button>
      ))}
      
      <button
        disabled={currentPage === totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
```

**Offset Pagination Problems:**
```
Problem 1 — Ghost records (new inserts shift offset)
  Page 1 fetched: items 1-20
  User inserts new item at position 1
  User fetches page 2 (offset: 20): items 21-40
  But item 20 (which was on page 1) reappears on page 2 as item 21 → DUPLICATE

Problem 2 — Performance at scale
  GET /products?offset=10000&limit=20
  Database scans 10,020 rows → returns 20
  At PostgreSQL scale: 500ms+ for offset=100000

Problem 3 — Total count is expensive
  SELECT COUNT(*) FROM products  → Full table scan
  Required to know "Page 5 of 234"
```

### Pattern 2: Cursor-Based Pagination

**Mechanism:**
```
First page:  GET /api/products?limit=20
Response: { items: [...], nextCursor: "eyJpZCI6MjB9" }

Next page: GET /api/products?after=eyJpZCI6MjB9&limit=20
Response: { items: [...], nextCursor: "eyJpZCI6NDB9", hasPreviousPage: true }
```

**Cursor Design:**
```typescript
// Cursor = base64-encoded stable identifier (usually id + sortField)
function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString('base64');
}

function decodeCursor(cursor: string): { id: string; createdAt: string } {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

// Server query using cursor
async function getProductsAfterCursor(cursor: string | undefined, limit: number) {
  if (!cursor) {
    // First page
    return db.products.findMany({ 
      take: limit + 1, // Fetch one extra to know if there's a next page
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] // Stable sort
    });
  }
  
  const { id, createdAt } = decodeCursor(cursor);
  
  return db.products.findMany({
    take: limit + 1,
    // Keyset condition: records after this cursor position
    where: {
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt: createdAt, id: { lt: id } }, // Tiebreaker
      ]
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}
```

**GraphQL Connection Pattern (Relay Spec):**
```graphql
query {
  products(first: 20, after: "cursor_here") {
    edges {
      node {        # The actual item
        id name price
      }
      cursor        # Per-item cursor for precise navigation
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount      # Optional, expensive
  }
}
```

**Frontend with React Query Infinite:**
```typescript
function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: ({ pageParam }) => 
      productApi.getAll({ ...filters, after: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.previousCursor,
  });
}

function InfiniteProductList({ filters }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useInfiniteProducts(filters);
  
  // Flatten pages for rendering
  const products = data?.pages.flatMap(page => page.items) ?? [];
  
  return (
    <div>
      {products.map(product => <ProductCard key={product.id} product={product} />)}
      
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load More' : 'All loaded'}
      </button>
    </div>
  );
}
```

### Pattern 3: Seek/Keyset Pagination (Database-Optimized)

```sql
-- Cursor pagination with proper keyset condition
-- After cursor where (created_at='2024-01-15', id='500')

SELECT * FROM products
WHERE 
  (created_at < '2024-01-15')
  OR (created_at = '2024-01-15' AND id < 500)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Key advantage: Database uses index SEEK, not SCAN
-- Performance: O(1) for this query regardless of offset depth
-- Requires: Compound index on (created_at DESC, id DESC)
```

### Performance Implications

**Backend Performance Comparison:**
```
                    Offset=100    Offset=10000  Offset=100000
Offset Pagination:   ~10ms         ~100ms        ~1000ms
Cursor Pagination:   ~10ms         ~10ms         ~10ms
Keyset Pagination:   ~5ms          ~5ms          ~5ms
```

**Frontend Memory (Infinite Scroll):**
```typescript
// Problem: After 50 pages, DOM has 1000+ nodes
// React Query keeps all pages in memory

// Solution 1: Virtualization (see topic 104)
// Solution 2: Windowed pages — keep only last 3 pages in DOM
function useWindowedInfiniteQuery(key, queryFn) {
  const { data, ...rest } = useInfiniteQuery({ key, queryFn });
  
  // Only render last 3 pages worth of items
  const visibleItems = useMemo(() => {
    const allPages = data?.pages ?? [];
    const lastThreePages = allPages.slice(-3);
    return lastThreePages.flatMap(p => p.items);
  }, [data]);
  
  return { visibleItems, ...rest };
}
```

### Scalability Considerations

- **1K users**: Offset pagination fine — simple, UI allows jumping to page 50
- **100K users**: Cursor pagination required for data consistency; add Redis-cached count for totals
- **10M users**: Cursor + CDN-cached first page; no total count (estimate only: "1M+ results")

**The UX Implication of Each Pattern:**
```
Offset Pagination → Page numbers, jump to page 47
Cursor Pagination → Infinite scroll, prev/next only (no arbitrary page jump)
Hybrid (Relay) → Load more with per-item cursor (precise but complex)
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Twitter/X Feed:**
- Cursor-based: Each fetch returns a `next_cursor` token
- Reason: New tweets arrive constantly — offset would show duplicates constantly
- "Show new tweets" is a separate concept from pagination

**Google Search Results:**
- Offset pagination (pages 1, 2, 3...)
- But: They only show ~10 pages maximum → offset performance is bounded
- No total count shown ("About 1,230,000 results" is an estimate)

**LinkedIn Feed:**
- Cursor-based infinite scroll
- Sponsored posts inserted dynamically → offset would corrupt ordering
- Cursor anchored to timestamp + post ID

**SAP Fiori Smart Tables:**  
- OData `$skip`/`$top` parameters = offset/limit
- Enterprise data typically in thousands, not millions → offset acceptable
- SmartTable shows total count and page numbers (OData returns `@odata.count`)

**Adobe Stock:**
- Cursor pagination for millions of assets
- First page CDN-cached (same for all users with same query)
- Subsequent pages require auth → not cacheable at CDN

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "There are three pagination patterns I evaluate for each use case. Offset pagination is simplest — SQL `LIMIT 20 OFFSET 40` — and allows numbered page UIs. But it has two fatal flaws at scale: performance degrades linearly with offset depth, and new inserts shift records so users see duplicates or skip items.
>
> Cursor-based pagination solves consistency by anchoring each page request to a stable pointer — typically an ID or timestamp from the last seen record. Inserts don't affect what comes after the cursor. It's how Twitter, Facebook, and any real-time feed works. The trade-off is you can't jump to 'page 47' — only next/previous.
>
> On the frontend, I implement cursor pagination with React Query's `useInfiniteQuery` which manages cursor state, appending pages, and fetching the next page. For infinite scroll specifically, I combine this with an Intersection Observer — when the last item enters the viewport, trigger `fetchNextPage()`.
>
> For performance at scale, cursor pagination uses keyset database queries — the WHERE clause seeks directly to the cursor position using an index, so page 1000 is just as fast as page 1. I'd choose offset for admin tables where jumping to page 100 is a real need, and cursor for any user-facing feed where items change frequently."

**Likely Follow-up Questions:**
- "How do you implement infinite scroll with cursor pagination?" → Intersection Observer on last list item triggers `fetchNextPage()` (covered in topic 82)
- "How do you handle back-navigation with cursor pagination?" → React Query caches previous pages; maintain cursor stack in state
- "How do you get total count efficiently with cursor pagination?" → Don't — show "Load more" instead of page count, or show database-estimated counts
- "What if the user jumps to arbitrary offset with cursor pagination?" → You can't; this is the trade-off. If numbered pages are required, offset pagination (with bounded depth) is the right choice.

**Comparison:**

| | Offset/Limit | Cursor | Keyset |
|---|---|---|---|
| Complexity | Simple | Medium | Complex |
| Consistency | ❌ (inserts shift) | ✅ | ✅ |
| DB Performance | O(offset) | O(1) | O(1) |
| Arbitrary page jump | ✅ | ❌ | ❌ |
| Total count | Easy (but expensive) | Hard | Hard |
| Use case | Admin tables | Social feeds | High-traffic feeds |

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

**Intersection Observer for Cursor-Based Infinite Scroll:**

```typescript
// hooks/useInfiniteScroll.ts
export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean
) {
  const observerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // Trigger 200px before visible
    );
    
    if (observerRef.current) observer.observe(observerRef.current);
    
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);
  
  return observerRef;
}

// Usage in component
export function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: ({ pageParam }) =>
      productApi.getCursor({ after: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
  });
  
  const sentinelRef = useInfiniteScroll(fetchNextPage, !!hasNextPage);
  
  if (isLoading) return <ProductListSkeleton />;
  
  const products = data?.pages.flatMap(p => p.items) ?? [];
  
  return (
    <div>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      
      {/* Sentinel element — triggers next page load when visible */}
      <div ref={sentinelRef} aria-hidden="true" />
      
      {isFetchingNextPage && <LoadingSpinner />}
      {!hasNextPage && products.length > 0 && (
        <p>You've seen all products</p>
      )}
    </div>
  );
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**OCK Framework:**
- **O**ffset — Simple, allows page jump, breaks with inserts, slow at depth
- **C**ursor — Consistent, fast, no arbitrary page jump, needs stable sort
- **K**eyset — Database SEEK optimization of cursor, fastest of all

**Decision rule:** Does the data change while users browse it? → Cursor. Does the admin need to jump to page 100? → Offset (bounded). 100M records? → Keyset.

If you blank: *"Offset breaks when new data is inserted (items shift). Cursor-based pagination uses a stable pointer to the last seen item — new inserts don't affect what comes after."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Wrong pagination → users see duplicates or miss items in live feeds  
→ **Performance**: Offset at depth 10000 causes 1s+ database scans; cursor is always O(1)  
→ **Business**: Poor pagination under load causes timeouts → revenue loss for e-commerce

**How it works:**
→ Offset pagination uses `SKIP n TAKE m` with a page number UI. Cursor pagination encodes the last-seen record identifier (ID + sort field), and each query seeks directly past that record in the database using an indexed keyset condition. Frontend uses `useInfiniteQuery` with `getNextPageParam` to manage cursor state across pages.

**Company relevance:**
→ **Microsoft**: Teams chat history uses cursor pagination — messages arrive constantly  
→ **Adobe**: Stock media library (millions of assets) requires cursor + CDN for first page  
→ **Salesforce**: CRM list views typically use offset (bounded to 2000 records); Einstein search uses cursor  
→ **Cisco**: Network event logs (billions of events) — keyset pagination is essential
