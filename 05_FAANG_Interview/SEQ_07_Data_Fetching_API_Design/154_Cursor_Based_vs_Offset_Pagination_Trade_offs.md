# 154. Cursor-Based vs Offset Pagination Trade-offs
**Phase:** Data Fetching & API Design | **Sequence:** SEQ 07 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Offset pagination uses `LIMIT N OFFSET M` — simple to implement, supports random-access page jumps, but becomes O(M) in query cost at large offsets because the database must scan and discard M rows before returning N. Cursor pagination encodes a position marker (usually the last seen ID or a composite of timestamp + ID) and queries `WHERE id > cursor LIMIT N` — it's O(log n) with an index seek regardless of how deep into the dataset you are. The key trade-off is operational: offset is universally understood and trivially supports "jump to page 47," while cursor requires immutable ordering and cannot support random-access page navigation. At scale (>100K rows, live-mutating data), cursor is almost always correct; for admin interfaces needing specific page jumps on small datasets, offset remains reasonable.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Why Offset Degrades

```sql
-- OFFSET 100000: DB scans 100,000 rows, discards them, returns 20
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 100000;
-- O(M) — gets slower the deeper you paginate

-- With EXPLAIN ANALYZE (PostgreSQL):
-- Seq Scan on orders  (cost=0.00..18340.00 rows=4000 width=200)
--                      actual time=0.128..890.456 rows=20 loops=1)
-- The 890ms is spent scanning all 100,000 offset rows

-- At OFFSET 500,000 on 10M rows: easily 3–6 seconds
```

```sql
-- CURSOR: DB seeks directly to the cursor position via B-tree index
SELECT * FROM orders
WHERE (created_at, id) < (cursor_created_at, cursor_id)  -- "<" = older than cursor
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- O(log n) — index seek; cost is constant regardless of position
-- With index on (created_at DESC, id DESC): ~2-5ms even at row 5,000,000
```

### The Ghost Row Problem (Offset on Live Data)

```
Initial state: rows [A, B, C, D, E, F, G, H, I, J]
               Page 1 (OFFSET 0): [A, B, C, D, E]
               Page 2 (OFFSET 5): [F, G, H, I, J]

User requests page 1 → [A, B, C, D, E]
New row "NEW" inserted at position 1 → [NEW, A, B, C, D, E, F, G, H, I, J]

User requests page 2 (OFFSET 5) → [E, F, G, H, I]  ← E appears TWICE
                                     ↑ ghost row (seen on page 1 AND page 2)

With cursor pagination:
User requests page 1 → cursor = E's ID
Next query: WHERE id > cursor_of_E
New row "NEW" inserted earlier — doesn't matter
Next page correctly returns [F, G, H, I, J] — no duplicates
```

### API Design Comparison

```typescript
// ===== OFFSET API =====
// GET /api/products?page=4&limit=20
// GET /api/products?offset=60&limit=20

interface OffsetResponse<T> {
  items: T[];
  total: number;    // Always know totals — enables "Page 4 of 25" UI
  page: number;
  limit: number;
  pages: number;    // Math.ceil(total / limit)
}

// ===== CURSOR API — Relay Spec =====
// GET /api/products?after=dXNlcjE2&first=20
// GET /api/products?before=dXNlcjE2&last=20 (backwards pagination)

interface CursorResponse<T> {
  edges: Array<{
    node: T;
    cursor: string;   // base64 encoded position
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;    // Pass this as `after` for next page
  };
  totalCount?: number;  // Optional — expensive on cursor pagination
}

// ===== KEYSET — simplest cursor variant =====
// GET /api/products?after_id=12345&after_created=2024-01-15T10:00:00Z&limit=20

interface KeysetResponse<T> {
  items: T[];
  nextCursor: string | null;   // Encode (id, created_at) as opaque token
  hasMore: boolean;
}

// Cursor encoding/decoding
function encodeCursor(row: { id: string; createdAt: Date }): string {
  return Buffer.from(JSON.stringify({ id: row.id, createdAt: row.createdAt }))
    .toString('base64url');
}

function decodeCursor(cursor: string): { id: string; createdAt: Date } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  return { ...decoded, createdAt: new Date(decoded.createdAt) };
}
```

### Decision Framework

```typescript
// The CARS decision model (Concurrency / Access / Rate / Size)

// C: Concurrency of mutations
//   Low mutation rate (lookup table, product catalog) → offset fine
//   High mutation rate (orders, events, social feed) → cursor (ghost rows with offset)

// A: Access pattern
//   Random access required ("jump to page 47") → offset only viable option
//   Sequential browse only (feed, timeline) → cursor preferred

// R: Rate of data growth
//   Row count stable or slow-growing (<100K) → offset fine
//   Fast-growing (millions of rows) → cursor (offset becomes unusable at scale)

// S: Sort stability requirement
//   Sort column with NULLs or duplicates? → cursor cursor must use composite key
//   Unique sort key (created_at + id) → cursor straightforward

// Decision table:
const paginationDecision = (params: {
  needsRandomAccess: boolean;
  hasFrequentMutations: boolean;
  rowCount: number;
  needsTotalCount: boolean;
}) => {
  if (params.needsRandomAccess) return 'OFFSET';            // Only option for jump-to-page
  if (params.rowCount > 100_000) return 'KEYSET_CURSOR';   // Offset can't scale
  if (params.hasFrequentMutations) return 'CURSOR';         // Avoid ghost rows
  if (params.needsTotalCount && params.rowCount < 100_000) return 'OFFSET'; // COUNT(*) is cheap on small tables
  return 'CURSOR';                                           // Default modern choice
};
```

### Database Index Strategy for Cursor Pagination

```sql
-- Single-column cursor (by ID only — simplest):
CREATE INDEX idx_products_id ON products (id);
-- Limitation: if IDs are not ordered by time, pagination order may not match "newest first"

-- Composite cursor (created_at + id — most common):
CREATE INDEX idx_products_created_id ON products (created_at DESC, id DESC);
-- Query:
-- WHERE (created_at, id) < ('2024-01-15T10:00:00', 'abc123')
-- Uses the composite index → O(log n) regardless of position

-- For forward and backward pagination support:
CREATE INDEX idx_products_created_id_asc ON products (created_at ASC, id ASC);
CREATE INDEX idx_products_created_id_desc ON products (created_at DESC, id DESC);
-- Or use the same index and flip ORDER BY direction
-- (PostgreSQL can scan indexes backwards efficiently)

-- Total count gotcha with cursor pagination:
-- COUNT(*) without filters is fast (uses statistics)
-- COUNT(*) with WHERE clause = expensive scan (especially on filtered cursor pages)
-- Solution: Return estimated total from pg_stat_user_tables for display only (exact counts on demand)
```

### Frontend Implications

```typescript
// Offset: supports page number controls (1 2 3 ... 47)
// Can deep-link: /products?page=42 → restore state from URL

// Cursor: cannot naturally support page numbers
// Deep-link challenge: /products?cursor=abc123 → works for sharing, but
//   users can't manually navigate to "page 42" by editing the URL

// Hybrid approach (common in admin tools):
// Small datasets (<10K): offset + page controls
// Large datasets / feeds: cursor + infinite scroll or "Previous / Next" only

// TanStack Query — both work:
// Offset:
useQuery({
  queryKey: ['products', page],
  queryFn: () => api.products.listOffset({ page, limit: 20 }),
  placeholderData: keepPreviousData,  // Keep old page visible during page transition
});

// Cursor:
useInfiniteQuery({
  queryKey: ['products'],
  queryFn: ({ pageParam }) => api.products.listCursor({ after: pageParam, limit: 20 }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.pageInfo.endCursor ?? undefined,
});
```

### Performance Benchmarks

```
PostgreSQL 15 — orders table, 10 million rows
Test: SELECT * FROM orders LIMIT 20 at various depths
Index: (created_at DESC, id DESC)

Depth         OFFSET query    Cursor/Keyset query
----------    ------------    ------------------
Row 20        ~0.5ms          ~0.5ms
Row 1,000     ~2ms            ~0.5ms
Row 10,000    ~15ms           ~0.5ms
Row 100,000   ~120ms          ~0.5ms
Row 500,000   ~4,200ms        ~0.5ms
Row 1,000,000 timeout         ~0.5ms

→ Cursor query time is constant regardless of depth
→ Offset degrades linearly with depth
```

### ⚠️ Anti-Patterns

- **Cursor on user-editable sorted columns** — if the sort column can be updated (e.g., `priority` or `status`), cursor position becomes invalid after an update; use immutable columns (id, created_at) as the keyset components

- **Offset for live/real-time data without user awareness** — ghost rows and missing items are silent correctness failures; users see the same record twice without knowing; the system appears to have a bug even though the logic is technically correct for the query

- **Not including ID in composite cursor** — if `created_at` has duplicate values (two records created in the same millisecond, common with bulk imports), `WHERE created_at < cursor_time` may skip records; always include a unique tiebreaker (`id`)

- **Exposing raw offsets in public APIs** — `?offset=100000` in a public API invites performance abuse; any client can request deep pages; rate limit and max-offset guard are mandatory

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the Purchase Order list for enterprise clients (Volkswagen, BMW) had 500K+ orders per customer. Original offset pagination was hitting 4-second response times at page 200+. Migrated to keyset cursor pagination with a composite index on `(created_at DESC, po_id DESC)`. Page load dropped to 42ms consistently at any depth. The frontend team also had to remove the "jump to page N" feature — replaced with date-range filters that effectively replaced random page access for the 95% use case.

**At FAANG scale:**
- **Microsoft:** Azure portal resource list — offset for <10K resources per subscription (supports "Page 3 of 8"); cursor for activity logs (millions of entries, live-updating)
- **Adobe:** Lightroom photo library — keyset cursor (`(captured_at, asset_id)`) on 100M+ assets; offset was being abused by sync clients requesting OFFSET 9,000,000 — DDoS by accident; cursor eliminated the risk
- **Salesforce:** CRM records list — configurable: admins choose pagination per object type; standard objects use cursor for scale; custom objects with <1K records use offset for simplicity
- **Cisco:** Network event/syslog feed — strict cursor-only; syslog inserts thousands of events per second; offset on this data guarantees ghost rows and skipped events

---

## 💬 4. Interview Execution

### Sample Answer

> "The fundamental difference is algorithmic. Offset pagination is O(M) — the database scans and discards M rows before returning the 20 you asked for. At OFFSET 500,000, PostgreSQL may spend 4 seconds just discarding rows. Cursor pagination turns the query into an index seek — `WHERE (created_at, id) < (cursor_time, cursor_id)` — which is O(log n) with the right composite index, so page retrieval time is constant whether you're at row 20 or row 5,000,000.
>
> Beyond performance, offset has a correctness problem on live data. If a new row is inserted between page 1 and page 2 requests, offset shifts all rows by one — your page 2 returns a duplicate of the last item from page 1. Cursor is immune to this because it queries relative to a stable position marker.
>
> The caveat is that cursor pagination cannot naturally support 'jump to page 47' — you have to provide date-range filters as the alternative for that use case. My rule is: admin tables with <100K rows and random-access UX requirement → offset; feeds, timelines, large datasets → cursor/keyset."

### Likely Follow-up Questions
1. "What is the ghost row problem specifically?" → Offset asks for rows 21–40; if a new row is inserted before row 21 between requests, the DB now counts it in the offset calculation, so your "page 2" starts from what was row 20 on page 1 — you see it twice
2. "Why is a composite cursor (created_at + id) better than id-only?" → Two records can share the same `created_at` if created in the same millisecond (batch imports, for example); if you use `WHERE created_at < cursor_time` only, both records in that millisecond are excluded; the `id` tiebreaker prevents this — `WHERE (created_at, id) < (time, id_value)` is strictly unique and stable
3. "When would you choose offset even at scale?" → Only when the UI genuinely requires random page access (e.g., "jump to page 47 of 200") AND row mutations are infrequent AND the dataset is stable; alternatively, combine: use offset for page calculation, but use metadata filters (date ranges) to bound the offset depth
4. "How do you expose total count with cursor pagination?" → For approximate display ("~50,000 results"), use `pg_stat_user_tables.n_live_tup` estimates (free, no full scan); for exact count on filtered queries, add a separate `COUNT(*)` query that runs in parallel, not in the same query; never block the first page on an expensive COUNT

### vs Alternatives

| Dimension | Offset | Cursor (Relay) | Keyset |
|---|---|---|---|
| Query cost | O(M) degrades with depth | O(log n) constant | O(log n) constant |
| Ghost rows | Yes (live data) | No | No |
| Random access | ✅ Yes | ❌ No | ❌ No |
| Total count | Trivial | Expensive | Expensive |
| Complexity | Low | Medium | Medium |
| API standard | Custom | Relay spec | Custom |
| Frontend support | TanStack Query `useQuery` | `useInfiniteQuery` | `useInfiniteQuery` |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Backend — Next.js API route showing both strategies

// OFFSET STRATEGY
export async function GET_OFFSET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
  const offset = (page - 1) * limit;

  // Safety guard: reject deep offsets to prevent DB abuse
  if (offset > 100_000) {
    return NextResponse.json(
      { error: 'Page too deep. Use date range filters for deep navigation.' },
      { status: 400 }
    );
  }

  const [items, total] = await Promise.all([
    db.product.findMany({ skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
    db.product.count(),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

// CURSOR (KEYSET) STRATEGY
export async function GET_CURSOR(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('after');
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));

  let cursorWhere = {};
  if (cursor) {
    const { id, createdAt } = decodeCursor(cursor);
    // Composite keyset: WHERE (created_at, id) < (cursor_time, cursor_id)
    cursorWhere = {
      OR: [
        { createdAt: { lt: createdAt } },                            // Strictly older
        { createdAt: createdAt, id: { lt: id } },  // Same time, earlier ID
      ],
    };
  }

  // Fetch limit + 1 to determine hasNextPage without COUNT(*)
  const items = await db.product.findMany({
    where: cursorWhere,
    take: limit + 1,                        // Fetch one extra
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  const hasNextPage = items.length > limit;
  const pageItems = hasNextPage ? items.slice(0, limit) : items;

  const lastItem = pageItems.at(-1);
  const nextCursor = hasNextPage && lastItem
    ? encodeCursor({ id: lastItem.id, createdAt: lastItem.createdAt })
    : null;

  return NextResponse.json({
    items: pageItems,
    nextCursor,
    hasNextPage,
  });
}
```

---

## 🧠 6. Memory Aid

**CARS decision model:**
- **C**oncurrency of mutations → high? use cursor
- **A**ccess pattern → random jump needed? only offset can do it
- **R**ate of growth → fast-growing millions? offset breaks down
- **S**ize of dataset → > 100K rows? cursor mandatory

**The ghost row analogy:**
Offset pagination is like bookmarking by page number in a book where pages can be inserted. If someone inserts a page after your bookmark page, your bookmark now points to a different page. Cursor pagination is like bookmarking by the last sentence you read — a new page being inserted elsewhere doesn't affect your bookmark.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ The performance degradation of OFFSET is often invisible during development (the test database has 1,000 rows, not 1,000,000) and only visible in production after months of data accumulation; architects who understand this design cursor-based tables from day one rather than retroactively migrating under pressure
→ Ghost rows are a correctness bug, not a performance bug — offset pagination on a live-mutating table silently shows users duplicate records and skips records that were inserted during their session; users perceive this as a software defect, damaging trust in the application
→ The composite key requirement (created_at + id) prevents a subtle edge case — without the tiebreaker, batch operations that insert many records simultaneously cause records to be skipped; this is a common source of "missing records" bugs in enterprise data pipelines

**How it works (2 sentences):**
Cursor pagination works by encoding the last-seen record's sort key as an opaque token (typically base64-encoded JSON of the composite sort values); the next query uses `WHERE (sort_col, id) < (cursor_sort_val, cursor_id)` which allows the query planner to perform an index seek directly to the cursor position, reading only the `LIMIT N` rows after that position rather than scanning all preceding rows.
Offset pagination uses the database's `OFFSET M` clause which instructs the query engine to read and discard M rows before starting to return results — the rows are discarded after being read from the index, not skipped by the index, making the cost proportional to M regardless of available indexes.

---
✅ Topic 154/486 complete → Continuing to Topic 155: Debouncing & Throttling (API calls)
