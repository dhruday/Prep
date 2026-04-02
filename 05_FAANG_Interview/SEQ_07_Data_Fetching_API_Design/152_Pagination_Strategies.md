# 152. Pagination Strategies
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Pagination is how you break a large dataset into manageable chunks for transport and display. There are three primary strategies: offset-based (skip N records), cursor-based (start after this record), and keyset-based (a variant of cursor using indexed column values). The right choice depends on the use case: offset pagination is easy to implement and supports random-access navigation (jump to page 47), but degrades in performance and consistency on large datasets — records shift when items are inserted or deleted between requests. Cursor pagination is stable and performant at scale but doesn't support jumping to arbitrary pages — ideal for feeds and infinite scroll. Understanding the trade-offs between these is a common FAANG system design question.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### 1. Offset-Based Pagination

```typescript
// URL: GET /products?page=3&pageSize=20
// SQL: SELECT * FROM products LIMIT 20 OFFSET 40

// ✅ Supports: jump to any page, total count UI ("Page 3 of 47")
// ❌ Problem 1: Skipping large offsets is slow
//   OFFSET 100000 → database still reads 100,000 rows, discards first 100,000
//   At OFFSET 1,000,000 on a 10M-row table: seconds of latency
//
// ❌ Problem 2: ghost rows / missed rows on live data
//   User is on page 2; between page 1 and page 2 requests, 3 new items are inserted at the top
//   → User's page 2 now contains 3 items they already saw on page 1 (shifted)
//   Or 3 items deleted → user skips 3 items they never see

// UI Components needed:
// ✅ Page number navigation: 1 2 3 ... 47 48 Next
// ✅ Items-per-page selector
// ✅ Total count display

// Response shape:
interface OffsetPageResponse<T> {
  items: T[];
  total: number;        // total record count
  page: number;         // current page (1-indexed)
  pageSize: number;     // items per page
  totalPages: number;   // Math.ceil(total / pageSize)
}

// Frontend implementation with TanStack Query:
function useOffsetProducts(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['products', 'pages', { page, pageSize }],
    queryFn: () => api.products.list({ page, pageSize }),
    placeholderData: keepPreviousData,  // keep current page visible while next loads
    staleTime: 2 * 60_000,
  });
}

function ProductPagination() {
  const [page, setPage] = useSearchParamState('page', 1);  // page → URL
  const { data, isLoading, isPlaceholderData } = useOffsetProducts(page);

  return (
    <div>
      <div style={{ opacity: isPlaceholderData ? 0.7 : 1 }}>
        {data?.items.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
      <PaginationControls
        current={page}
        total={data?.totalPages ?? 0}
        onChange={setPage}
        disabled={isLoading || isPlaceholderData}
      />
    </div>
  );
}
```

### 2. Cursor-Based Pagination

```typescript
// URL: GET /products?after=cursor_abc123&first=20
// SQL: SELECT * FROM products WHERE id > $lastId ORDER BY id LIMIT 20

// ✅ Always consistent — no ghost rows when items are inserted/deleted
// ✅ O(1) per query — no offset scanning; uses index seek
// ✅ Scales to 100M rows without degradation
// ❌ Cannot jump to arbitrary page — forward/backward only
// ❌ No total count (would require a full table scan)
// Use when: feeds, timelines, infinite scroll, activity logs

// Response shape (Relay Connection Spec):
interface CursorPageResponse<T> {
  nodes: T[];           // the items
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;  // cursor for first item
    endCursor: string | null;    // cursor for last item — use as `after` for next page
  };
  totalCount?: number;  // optional — expensive to compute; omit for live data
}

// Frontend implementation with TanStack Query useInfiniteQuery:
function useCursorProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', 'cursor', filters],
    queryFn: ({ pageParam, signal }) =>
      api.products.list({ ...filters, after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage
      ? lastPage.pageInfo.endCursor ?? undefined
      : undefined,
    staleTime: 5 * 60_000,
  });
}

// Named page navigation with cursor pagination:
// Not natively possible, but you can paginate forward and cache cursors per page:
const cursorBook: Record<number, string> = {}; // page number → cursor
// Page 1: no cursor. After loading: cursorBook[2] = endCursor
// Page 2: fetch with after=cursorBook[2]. After loading: cursorBook[3] = endCursor
// Pages are only discoverable forward — no jumping to page 30 without traversing 1-29
```

### 3. Keyset Pagination (High-Performance Variant)

```typescript
// URL: GET /products?after_id=prod_1234&after_created=2024-01-15T10:00:00Z&pageSize=20
// SQL: WHERE (created_at, id) > ('2024-01-15T10:00:00Z', 'prod_1234') LIMIT 20

// Same concept as cursor but uses the indexed column values directly as the cursor
// (encoded as the cursor string in the API)
// DB can use a composite index on (created_at, id) for O(log n) seek

// Cursor encoding/decoding example:
function encodeCursor(item: { id: string; createdAt: Date }): string {
  return Buffer.from(JSON.stringify({
    id: item.id,
    createdAt: item.createdAt.toISOString()
  })).toString('base64url');
}

function decodeCursor(cursor: string): { id: string; createdAt: string } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}
```

### 4. Seek Method (SQL-Level)

```sql
-- Fastest pagination at scale: keyset on indexed columns
-- No OFFSET, direct index seek

-- With cursor-encoded values:
SELECT *
FROM products
WHERE (created_at, id) > ('2024-01-15T10:00:00Z', 'prod_xyz')
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- This is O(log n) using the (created_at, id) composite index
-- vs OFFSET N which is O(N)
```

### Comparison Table

| Strategy | Use Case | Total Count | Random Access | Scale |
|---|---|---|---|---|
| Offset | Admin tables, reports | ✅ Yes | ✅ Yes | ❌ Slow at high offset |
| Cursor (Relay) | Feeds, social timelines | Optional | ❌ No | ✅ O(1) |
| Keyset | Large sorted data | Optional | ❌ No | ✅ O(log n) |
| Custom keyset | Real-time, live feeds | ❌ No | ❌ No | ✅ Best |

### Prefetching Adjacent Pages

```typescript
// Prefetch next page before user clicks "Next"
function ProductTable() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['products', page],
    queryFn: () => api.products.list({ page }),
  });

  // Prefetch next page when current page loads
  useEffect(() => {
    if (data?.totalPages && page < data.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['products', page + 1],
        queryFn: () => api.products.list({ page: page + 1 }),
        staleTime: 5 * 60_000,
      });
    }
  }, [page, data?.totalPages, queryClient]);

  // Prefetch on hover — 200ms head start before click
  const handleNextHover = () => {
    if (data?.totalPages && page < data.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['products', page + 1],
        queryFn: () => api.products.list({ page: page + 1 }),
      });
    }
  };

  return (
    <>
      <ProductGrid products={data?.items ?? []} />
      <button
        onMouseEnter={handleNextHover}
        onClick={() => setPage(p => p + 1)}
      >
        Next
      </button>
    </>
  );
}
```

### ⚠️ Anti-Patterns & Pitfalls

- **Using `OFFSET` for high-cardinality tables in production** — OFFSET 500,000 on a 10M-row table takes 2-5 seconds; every admin "go to last page" action could DoS the database; switch to keyset for tables over 100K rows

- **Not including `keepPreviousData` on paginated queries** — without it, navigating to the next page shows a blank skeleton while the new page loads; `keepPreviousData` shows the previous page grayed-out during the transition — dramatically better UX for no cost

- **Not resetting page to 1 when filters change** — user is on page 5, changes category filter → page 5 of new results may be empty; always include `page: 1` when filter parameters change (same principle as URL state)

- **Returning total count on cursor-based feeds** — on a live feed (tweets, notifications), total count changes between requests and the number is meaningless; including it requires a full table scan on every page request; omit it and use `hasNextPage` only

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the purchase order list used offset pagination with 50 items per page and a full total count — fine for 10,000 POs. When the client scaled to 500,000 POs, `page=9999` queries took 4 seconds (OFFSET 499,950 full table scan). Migrated to keyset pagination: `WHERE (created_at, id) < ($cursor)` with a composite index. Page navigation time dropped from 4s to 40ms. Total count was removed from the live view (too expensive); a separate "total this month" metric made one scheduled DB query cached for 1 hour.

**At FAANG scale:**
- **Microsoft:** Outlook's email list uses cursor pagination on `receivedDateTime DESC` — jumping to page 500 is not supported (no need); infinite scroll forward is the UX model; the total unread count is a separate counter, not derived from the pagination query
- **Adobe:** Behance portfolio grid (100M+ projects) uses cursor-based with keyset — `after_id` and `after_score` encode the last item's relevance score and ID; consistent ordering even as new posts are published
- **Salesforce:** SOQL queries use `OFFSET` (supported up to 2,000 records) and the `NextRecordsUrl` cursor for larger sets — the composite cursor approach; the 2,000-record OFFSET cap enforces cursor use at scale
- **Cisco:** Device inventory with 500K+ entries uses keyset on `(device_type, hostname)` — sorted alphabetically, consistent, fast; the NOC never needs random page access, only "A-F" and next/prev navigation

**How it evolves with scale:**
- < 10K items: offset with total count — simplest, works fine
- 10K–100K items: offset or cursor depending on UX (random access vs feed)
- 100K+ items: cursor/keyset mandatory for latency; offset is a performance risk
- 1M+: keyset on composite index; total count cached separately with TTL

---

## 💬 4. Interview Execution

### Sample Answer

> "Pagination strategy is one of those decisions that looks simple early and becomes a performance crisis at scale. Offset pagination — `LIMIT 20 OFFSET N` — is easy to implement and supports 'jump to page 47' UX, but it has two fundamental problems at scale: the database reads and discards N rows for every offset query (so offset 1,000,000 takes seconds), and live data causes ghost rows when items are inserted between page requests.
>
> Cursor pagination — 'give me 20 items after this cursor' — avoids both: it uses an index seek so it's O(log n) regardless of dataset size, and it's stable because the cursor anchors to a specific record. The cost is you lose random page access.
>
> My decision rule: if the UI needs 'Jump to page 47' or a total count display, that's an admin table or report — use offset and add pagination limits (max page size, max offset) to protect the DB. If the UI is a feed, timeline, or infinite scroll, cursor pagination is correct from day one.
>
> At SAP, switching a 500,000-row purchase order list from OFFSET to keyset pagination dropped page load from 4 seconds to 40ms — which should have been cursor-based from the start."

### Likely Follow-up Questions
1. "How do you implement cursor pagination on the backend?" → Choose a stable, indexed, unique-enough column (usually `created_at + id` composite); the cursor encodes the last item's values; query uses `WHERE (created_at, id) > (cursor_time, cursor_id) ORDER BY created_at, id LIMIT N`
2. "Can you do 'go to page' with cursor pagination?" → Not without traversing; some systems cache cursors per page number after the user has visited; not supported for pages not yet visited; design the UX to not need random access if using cursor
3. "How do you handle deleted items with cursor pagination?" → If the cursor item itself is deleted, add a fallback (e.g., `created_at > cursor_time OR (created_at = cursor_time AND id > cursor_id)` covering both orderings)
4. "How does `keepPreviousData` (TanStack) work for pagination?" → When the `queryKey` changes (new page), TanStack Query serves the previous key's data as `placeholderData` while the new fetch is in progress; `isPlaceholderData` is true; apply subtle visual treatment (opacity: 0.7)
5. "What's Relay pagination spec?" → Relay Cursor Connections spec defines `{ edges: [{ node, cursor }], pageInfo: { hasNextPage, endCursor } }` — a standard that GraphQL schemas follow; enables generic client-side infinite scroll components

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete pagination component — offset with prefetch + cursor toggle

type PaginationMode = 'offset' | 'cursor';

// Offset pagination hook
function usePagedProducts(page: number, filters: ProductFilters) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['products', 'paged', { page, ...filters }],
    queryFn: () => api.products.list({ page, pageSize: 20, ...filters }),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });

  // Prefetch next page eagerly
  useEffect(() => {
    if (query.data && page < query.data.totalPages) {
      qc.prefetchQuery({
        queryKey: ['products', 'paged', { page: page + 1, ...filters }],
        queryFn: () => api.products.list({ page: page + 1, pageSize: 20, ...filters }),
        staleTime: 2 * 60_000,
      });
    }
  }, [page, query.data, filters, qc]);

  return query;
}

// Pagination UI component
interface PaginationProps {
  current: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

function Pagination({ current, total, onChange, disabled }: PaginationProps) {
  // Show at most 7 page buttons: 1 ... 4 5 6 ... 20
  const pages = buildPageRange(current, total);

  return (
    <nav aria-label="Page navigation">
      <button
        onClick={() => onChange(current - 1)}
        disabled={disabled || current === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            disabled={disabled}
            aria-current={p === current ? 'page' : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(current + 1)}
        disabled={disabled || current === total}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total-4, total-3, total-2, total-1, total];
  return [1, '...', current-1, current, current+1, '...', total];
}

// Usage
function ProductsPage() {
  const [page, setPage] = useSearchParamNumber('page', 1);
  const [category, setCategory] = useSearchParam('category', 'all');

  const { data, isLoading, isPlaceholderData } = usePagedProducts(page, { category });

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setPage(1);  // ← ALWAYS reset page when filters change
  };

  return (
    <>
      <CategoryFilter value={category} onChange={handleCategoryChange} />
      <div style={{ opacity: isPlaceholderData ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        {isLoading && !data ? (
          <ProductGridSkeleton count={20} />
        ) : (
          <ProductGrid products={data?.items ?? []} />
        )}
      </div>
      {data && (
        <>
          <p aria-live="polite">
            Showing {((page-1)*20)+1}–{Math.min(page*20, data.total)} of {data.total} products
          </p>
          <Pagination
            current={page}
            total={data.totalPages}
            onChange={setPage}
            disabled={isPlaceholderData}
          />
        </>
      )}
    </>
  );
}
```

---

## 🧠 6. Memory Aid

**Pagination decision — FANS:**
- **F**eed / timeline / infinite scroll → **cursor** (stable, fast)
- **A**rbitrary page access / admin tables → **offset** (supports random access)
- **N**eed total count → must be offset (cursor total count is expensive)
- **S**cale > 100K rows → cursor/keyset mandatory (offset degrades)

**Common mistakes — GFR:**
- **G**host rows (offset on live data — use cursor)
- **F**orget to reset page when filter changes  
- **R**emove `keepPreviousData` → blank flash between pages

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The offset performance degradation is a production incident waiting to happen — it works perfectly at 10K rows in development and degrades silently until a large customer's dataset hits 500K rows and page navigation starts timing out; knowing this and designing cursor pagination from the start for feed-style data is the mark of a senior engineer who has seen this failure mode
→ `keepPreviousData` / `placeholderData: keepPreviousData` is a zero-cost UX improvement that most developers skip — without it, every page navigation shows a full skeleton loader even though the previous page's data is right there in the TanStack Query cache; with it, the current page stays visible (slightly faded) until the new page arrives
→ The "reset page to 1 on filter change" requirement is the most frequently forgotten pagination bug in production — it's worth mentioning specifically because it demonstrates you've built and debugged paginated filtered lists before

**How it works (2 sentences):**
SQL `OFFSET N` works by executing the full query, sorting the result set, and then discarding the first N rows — this means the database performs as much work for page 1 as for page 10,000, making OFFSET an O(N) operation on the offset value regardless of indexes; keyset pagination avoids this by using `WHERE (indexed_col, id) > (last_value, last_id)` which allows the database to seek directly to the starting position using the index (O(log n) seek), returning only the N requested rows with no discarded work.
TanStack Query's `placeholderData: keepPreviousData` works by checking whether the new query key has existing data in the cache — if not, instead of returning `undefined` (which would cause the component to fall into the `isLoading` state and render a skeleton), it returns the previous query key's data marked as stale (`isPlaceholderData: true`), allowing the component to continue rendering the prior page's content until the new page's fetch resolves, at which point the component re-renders with the fresh data.

---
✅ Topic 152/486 complete → Continuing to Topic 153: Infinite Scrolling Design
