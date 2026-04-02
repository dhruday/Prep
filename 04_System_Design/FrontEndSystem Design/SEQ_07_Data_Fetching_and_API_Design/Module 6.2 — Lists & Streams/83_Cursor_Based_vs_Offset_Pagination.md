# 83. Cursor-Based vs Offset Pagination Trade-offs

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Cursor-based and offset pagination** are the two foundational approaches to fetching large data sets in pages, and their trade-offs shape both backend query performance and frontend UX design. Offset pagination (`?page=5&limit=20`) is simple, universally understood, and allows random page access — but degrades to O(n) database scans at depth and produces inconsistent results when data changes mid-browse. Cursor pagination (`?after=eyJpZCI6MTAwfQ&limit=20`) is always O(1) at the database, consistent regardless of inserts/deletes, but cannot jump to arbitrary pages. The choice ripples from database query strategy through API design to component state, loading UX, and even your URL structure. Senior engineers must know when each is appropriate and what the actual failure modes look like in production.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### The Core Technical Difference

**Offset Pagination — Database Execution:**
```sql
-- Fetch items 101-120 (page 6, limit 20)
SELECT id, name, price
FROM products
ORDER BY created_at DESC
LIMIT 20 OFFSET 100;

-- What the database actually does:
-- 1. Scan index from start
-- 2. Read and discard 100 rows
-- 3. Return next 20 rows
-- Cost: Reads 120 rows, returns 20
-- At offset=10000: Reads 10020 rows, returns 20 → 500x waste
```

**Cursor Pagination — Database Execution:**
```sql
-- After cursor representing: created_at='2024-01-14 10:00:00', id=100
SELECT id, name, price
FROM products
WHERE
  created_at < '2024-01-14 10:00:00'
  OR (created_at = '2024-01-14 10:00:00' AND id < 100)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- What the database actually does:
-- 1. SEEK to index position matching cursor
-- 2. Read next 20 rows from that position
-- Cost: Reads exactly 20 rows regardless of "depth"
-- At equivalent page=500: Same ~20 rows read

-- Required index for O(1) cursor performance:
CREATE INDEX idx_products_cursor ON products (created_at DESC, id DESC);
```

### Consistency Under Mutation

**Offset Pagination Failure Scenario:**
```
Time 0: 100 products exist, user fetches page 1 → gets products 1-20

Time 1: New products 101, 102, 103 added at top (newest first)
                                          
Time 2: User fetches page 2 (offset: 20)
  Now: products 1-3 shifted down
  SELECT ... OFFSET 20 → returns products 18-37 (not 21-40!)
  Products 18, 19, 20 appear on BOTH page 1 AND page 2 ❌ DUPLICATE
  Products 101, 102, 103 (new) never reached because user already passed that offset ❌ MISSED
```

**Cursor Pagination — Consistent:**
```
Time 0: User fetches first page → gets products, cursor="cursor_at_product_20"

Time 1: New products 101, 102, 103 added

Time 2: User fetches with after="cursor_at_product_20"
  Query: WHERE id < 20 ORDER BY ... 
  Returns: products 21-40 — EXACTLY what comes after product 20 ✅ CONSISTENT
  New products are newer, they don't affect the cursor position
```

### API Design Patterns

**REST Offset Pagination Response:**
```typescript
// Response with total count (expensive but enables UI)
interface OffsetPaginationResponse<T> {
  data: T[];
  pagination: {
    total: number;        // SELECT COUNT(*) — expensive
    page: number;
    limit: number;
    totalPages: number;   // Math.ceil(total / limit)
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// GET /api/products?page=5&limit=20
{
  "data": [...],
  "pagination": {
    "total": 2340,
    "page": 5,
    "limit": 20,
    "totalPages": 117,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

**REST Cursor Pagination Response:**
```typescript
interface CursorPaginationResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;     // null = no more pages
    previousCursor: string | null; // For bidirectional navigation
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    // totalCount deliberately omitted (expensive, usually not shown)
  };
}

// GET /api/products?after=eyJpZCI6MTAwfQ&limit=20
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "previousCursor": "eyJpZCI6MTAxfQ", 
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

**GraphQL Relay Connection Spec:**
```graphql
type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int     # Optional, expensive
}

type ProductEdge {
  node: Product!
  cursor: String!     # Per-item cursor for precise position
}

type PageInfo {
  startCursor: String
  endCursor: String
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}

query {
  products(first: 20, after: "endCursor") {
    edges {
      node { id name price }
      cursor    # Can be used to resume exactly here
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### Frontend State Management

**Offset Pagination — Page Number State:**
```typescript
// URL-based pagination state (shareable, bookmarkable)
function useOffsetPagination(initialPage = 1, pageSize = 20) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? initialPage);
  
  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, pageSize }],
    queryFn: () => productApi.getPage({ 
      offset: (page - 1) * pageSize, 
      limit: pageSize 
    }),
    placeholderData: keepPreviousData, // Show old page while new one loads
  });
  
  return {
    data,
    isLoading,
    page,
    totalPages: data ? Math.ceil(data.total / pageSize) : 0,
    goToPage: (p: number) => setSearchParams({ page: String(p) }),
    nextPage: () => setSearchParams({ page: String(page + 1) }),
    prevPage: () => setSearchParams({ page: String(page - 1) }),
  };
}

// Prefetch adjacent pages for fast navigation
useEffect(() => {
  if (data?.totalPages && page < data.totalPages) {
    queryClient.prefetchQuery({
      queryKey: ['products', { page: page + 1, pageSize }],
      queryFn: () => productApi.getPage({ offset: page * pageSize, limit: pageSize }),
    });
  }
}, [page, queryClient]);
```

**Cursor Pagination — Cursor Stack State:**
```typescript
// For bidirectional cursor navigation (not just infinite scroll)
function useCursorPagination(limit = 20) {
  const [cursorStack, setCursorStack] = useState<string[]>([]); // Stack of previous cursors
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  
  const { data, isLoading } = useQuery({
    queryKey: ['products', { cursor: currentCursor, limit }],
    queryFn: () => productApi.getCursor({ after: currentCursor, limit }),
    placeholderData: keepPreviousData,
  });
  
  const goNext = () => {
    if (data?.nextCursor) {
      setCursorStack(prev => [...prev, currentCursor ?? '']);
      setCurrentCursor(data.nextCursor);
    }
  };
  
  const goPrevious = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop() || undefined;
    setCursorStack(stack);
    setCurrentCursor(prevCursor);
  };
  
  return {
    data: data?.items,
    isLoading,
    hasNext: !!data?.nextCursor,
    hasPrevious: cursorStack.length > 0,
    goNext,
    goPrevious,
    page: cursorStack.length + 1, // Approximate page for display
  };
}
```

### UX Implications

```
Offset Pagination → Page Navigation UI:
  [← Prev] [1] [2] [3] [4] [5] ... [117] [Next →]
  ✅ User knows they're on page 5 of 117
  ✅ Can jump to page 50
  ✅ URL is shareable: /products?page=50
  ❌ Real-time feeds: page numbers lose meaning when content changes

Cursor Pagination → Sequential Navigation:
  [← Prev] [Next →]  or  [Load More]  or  Infinite Scroll
  ✅ Consistent — no duplicates or skips
  ✅ O(1) database performance at any depth
  ❌ Cannot jump to page 50
  ❌ URL sharing is complex (cursor in URL is opaque)
```

### When to Choose Each

**Choose Offset When:**
- Dataset doesn't change during user browse session (static/slow-changing data)
- Users need to jump to specific pages (admin tables, search results)
- Total count is meaningful and needed (search: "234 results")
- Dataset is bounded (never exceeding 10K-100K records at most)

**Choose Cursor When:**
- Dataset changes frequently during session (social feeds, real-time logs)
- Dataset is very large (millions of records — offset would be too slow at depth)
- Infinite scroll is the primary UX (no page numbers needed)
- Data freshness is critical (no duplicate/missed items acceptable)

**Hybrid Approach (Large Search Systems):**
```typescript
// First 10 pages: offset (fast, allows page jumping)
// Beyond page 10: fallback to "next page" only (cursor-like behavior)
// Used by: Google, LinkedIn search results

function shouldUseOffset(page: number, totalResults: number) {
  return page <= 10 && totalResults <= 100; // Bounded window
}
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Offset (Bounded) — SAP Fiori / Enterprise Tables:**
- OData `$skip=100&$top=20` = offset pagination
- Enterprise databases: records in thousands, not millions → offset is fine
- Table shows "101-120 of 847 items" → total count needed → offset justified

**Cursor — GitHub Issues:**  
- `GET /repos/owner/repo/issues?per_page=30&page=2` is actually cursor-based internally
- New issues added constantly → offset would cause inconsistency
- API returns `Link` header with cursor URLs for next/prev

**Cursor — Stripe API:**
- All Stripe list APIs use `starting_after`/`ending_before` parameters (cursor IDs)
- Financial data must be consistent — offset is explicitly avoided
- "Our APIs must never return duplicates when browsing a list"

**Mixed — Elasticsearch:**
- First 10,000 results: `from/size` (offset) — fast via index
- Deep pagination (>10K): `search_after` (cursor) — enforced by Elasticsearch docs
- This matches Google's "we only show 100 pages of results" pattern

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "The offset vs cursor trade-off touches database performance, data consistency, and frontend UX all at once. Offset is simple — page 5 means skip 80, take 20. But it has two production failure modes: first, the database must scan and discard those 80 records, so at page 500 you're scanning 10,000 rows to return 20 — a 500x waste. Second, when new records are inserted while a user is browsing, offset shifts items — users see duplicates on page 2 that they already saw on page 1.
>
> Cursor pagination solves both: a cursor encodes the last seen record's position, and each query uses a keyset WHERE clause that seeks directly to that position in the index — O(1) regardless of depth. And insertions don't affect the query because the WHERE condition is anchored to a specific record, not a count.
>
> The trade-off is UX: cursor pagination doesn't support 'jump to page 50'. So the choice depends on the use case. Admin tables where users jump to specific pages → offset, bounded to a reasonable number of pages. Social feeds where new content arrives constantly and sets are large → cursor. When both requirements exist — search results with page numbers but at scale — use offset for the first 10 pages and handle deeper pagination as 'next only', which is what Elasticsearch and Google do."

**Likely Follow-up Questions:**
- "How do you make cursor-based URLs shareable?" → Base64-encode the cursor into the URL; it's opaque but reproducible
- "How do you get total count with cursor pagination?" → Separate cheap COUNT query with approximate logic for large tables; show "1000+" instead of exact count
- "What if the sort order can change?" → Cursor must encode the sort field value, not just ID; change sort → cursors are invalidated
- "How bad is offset at depth=10000 in PostgreSQL?" → With index: ~200-500ms for OFFSET 10000; without index: full sequential scan, seconds

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

**Cursor Encoder — Production-Grade:**

```typescript
// Stable, secure cursor encoding
// Cursor = JSON { id, sortValue } → base64 URL-safe encoding

interface CursorPayload {
  id: string;
  sortValue: string | number; // The sort field value for keyset
  sortField: string;          // Which field was sorted
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url'); // URL-safe base64
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json) as CursorPayload;
  } catch {
    throw new Error('Invalid pagination cursor');
  }
}

// Server usage
async function getProductsPage(after?: string, limit = 20) {
  let whereClause = {};
  
  if (after) {
    const { id, sortValue, sortField } = decodeCursor(after);
    
    if (sortField === 'created_at') {
      whereClause = {
        OR: [
          { createdAt: { lt: new Date(sortValue) } },
          { createdAt: new Date(sortValue), id: { lt: id } },
        ],
      };
    }
  }
  
  const items = await db.product.findMany({
    where: whereClause,
    take: limit + 1, // One extra to determine hasNextPage
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  
  const hasNextPage = items.length > limit;
  if (hasNextPage) items.pop(); // Remove the extra item
  
  const nextCursor = hasNextPage && items.length > 0
    ? encodeCursor({
        id: items.at(-1)!.id,
        sortValue: items.at(-1)!.createdAt.toISOString(),
        sortField: 'created_at',
      })
    : null;
  
  return { items, nextCursor, hasNextPage };
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Decision Matrix (2 questions):**
1. Does data change while user browses? → Yes → Cursor. No → Either.
2. Does user need to jump to page 50+? → Yes → Offset (but limit depth). No → Cursor.

**Performance truth:** Offset = O(offset), Cursor = O(1). As data grows: offset gets worse, cursor stays same.

If you blank: *"Offset is like saying 'skip the first 10,000 rows' — the database reads and discards them all. Cursor says 'start from this exact record' — the database seeks directly to it."*

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Offset → users see duplicate items in live feeds (bugs); Cursor → consistent, never duplicates  
→ **Performance**: LinkedIn's feed at offset=10,000 with offset pagination: ~1s+ per page load  
→ **Business**: E-commerce showing duplicates in product listing → potential double-sale confusion

**How it works:**
→ Offset pagination adds `SKIP n TAKE m` to the query — database scans skip rows. Cursor pagination encodes the last-seen record's sort values into an opaque token; the server decodes it into a WHERE clause that seeks directly past that record using a compound index, making every page equally fast regardless of depth.

**Company relevance:**
→ **Microsoft**: Teams message history is cursor-based — new messages arrive constantly  
→ **Adobe**: Stock library (200M+ assets) — offset would time out at depth; cursor required  
→ **Salesforce**: SOQL `OFFSET` supported but deprecated for deep pagination; cursor via `queryMore()`  
→ **Cisco**: Network flow records (petabytes) — only cursor/keyset viable at that scale
