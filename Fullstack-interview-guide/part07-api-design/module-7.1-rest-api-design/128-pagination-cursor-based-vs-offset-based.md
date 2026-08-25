# Pagination — Cursor-Based vs Offset-Based
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Offset pagination**: `GET /orders?page=2&size=20` → `SELECT ... LIMIT 20 OFFSET 40`. Simple to implement, straightforward for UIs with page numbers. Breaks at scale: OFFSET 10000 still scans 10,000 rows to skip them — O(N) database cost regardless of page number. Produces duplicate or skipped items when data changes between page requests (someone inserts/deletes a row while you're paginating).
- **Cursor pagination**: `GET /orders?after=cursor_abc&size=20` → `SELECT ... WHERE created_at > [decoded cursor value] LIMIT 20`. The cursor (an opaque token) encodes the position of the last seen item. Stable regardless of data changes. Constant O(1) database cost — no row scanning. Cannot jump to arbitrary pages (no "go to page 47"). Direction of travel only (next page / previous page). This is what Twitter, Instagram, Facebook, and Stripe use for large lists.
- **Key decision criterion**: if users need to jump to "page 47 of 200," use offset. If the list is large, frequently changing, and users scroll through sequentially (feed, transaction history, activity log), use cursor. For most production systems at scale: cursor wins.
- **Cursor encoding**: the cursor is typically a base64-encoded combination of the sort field value + the item ID (for tie-breaking). It's opaque to the client — treat it as a black box string, not a number.
- **Response structure**: always include `nextCursor` (null when you've reached the end) and `hasMore` boolean. For offset: include `totalCount` so the UI can render a page count.
- **Security**: cursors that encode timestamps or IDs should be opaque (base64 or encrypted) so clients can't predict or forge them. Signed cursors prevent tampering.

---

## 1. One-Line Definition
Pagination is the API pattern for returning large datasets in chunks; offset-based uses row-count skipping (simple, breaks at large pages), while cursor-based uses a position marker (stable, scalable, but forward-only), and choosing correctly determines whether your list API survives production load.

---

## 2. The Problem It Solves

### Offset Pagination — Where It Breaks at Scale

```
Table: orders (50,000,000 rows)
Query for page 5000, size 20:
  SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 99980;

What the database actually does:
  1. Scans rows 1 through 99,980 to skip them
  2. Returns rows 99,981 through 100,000
  
Performance:
  Page 1   (OFFSET 0):    0ms   (no skipping)
  Page 100 (OFFSET 1980): 5ms   (1,980 rows scanned)
  Page 5000 (OFFSET 99980): 400ms (99,980 rows scanned)
  Page 50000 (OFFSET 999980): 4000ms (one million rows scanned)
  
  Every click to a later page makes the query 10× slower.
  This is O(N) query cost by page number — unacceptable at scale.

RACE CONDITION BUG — losing and duplicating items:
  User gets page 1: rows 1-20 (order 20 is most recent at this moment)
  Between page 1 and page 2 requests: someone places 3 new orders (now rows 1-3)
  User requests page 2 (OFFSET 20):
    Database now returns rows 21-40 of the SHIFTED table
    Old rows 18, 19, 20 (the user already saw on page 1) shifted down
    User sees them AGAIN on page 2 → duplicates
    
  Alternatively, if 5 rows get deleted before page 2:
    Rows that were on page 2 shift up to page 1's window
    User NEVER sees them → skipped items
    
  Critical for financial data: transactions skipped means reconciliation errors.
  Critical for feeds: users miss posts when new content is inserted.
```

### Cursor Pagination — How It Stays Stable

```
Table: orders — same 50,000,000 rows
Query for the page AFTER cursor "cursor_abc":
  The cursor decodes to: { createdAt: '2025-06-01T10:30:00Z', orderId: 'ORD-12345' }
  
  SELECT * FROM orders
  WHERE (created_at, order_id) < ('2025-06-01T10:30:00Z', 'ORD-12345')
  ORDER BY created_at DESC, order_id DESC
  LIMIT 20;
  
  What the database does:
    Uses the (created_at, order_id) index — seek directly to the position
    No scanning, no skipping
    Returns next 20 rows immediately
    
  Performance:
    Page 1:     1ms (index seek)
    Page 5000:  1ms (same index seek — just a different position in the index)
    Page 50000: 1ms (constant cost — always just an index seek + LIMIT 20)
    
  O(1) query cost regardless of position. ✅
  
  Stability on data changes:
    New orders get inserted at the top.
    The cursor marks a fixed position in the sort order.
    Re-fetching after insertions: cursor still points to the same position.
    No duplicates, no skips. ✅
    Index: CREATE INDEX idx_orders_cursor ON orders(created_at DESC, order_id DESC);
```

---

## 3. How It Works Internally

### Cursor Encoding — How Cursors Are Generated

```
STEP 1: Complete the first page query
  SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 20;
  
  Results:
    Row 1: { id: 'ORD-100', createdAt: '2025-06-10T15:00:00Z', amount: 499.99 }
    Row 2: { id: 'ORD-099', createdAt: '2025-06-10T14:55:00Z', amount: 299.00 }
    ...
    Row 20: { id: 'ORD-081', createdAt: '2025-06-10T12:00:00Z', amount: 99.00 }
                                                                            ↑ LAST ROW

STEP 2: Generate the cursor from the LAST ROW
  Cursor payload: { createdAt: '2025-06-10T12:00:00Z', orderId: 'ORD-081' }
  Encode: Base64( JSON.stringify(payload) )
  → "eyJjcmVhdGVkQXQiOiIyMDI1LTA2LTEwVDEyOjAwOjAwWiIsIm9yZGVySWQiOiJPUkQtMDgxIn0="
  
  Return in response:
  {
    "data": [...20 orders...],
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI1LTA2LTEwVDEyOjAwOjAwWiIsIm9yZGVySWQiOiJPUkQtMDgxIn0=",
    "hasMore": true
  }

STEP 3: Client sends cursor with next request
  GET /api/v1/orders?after=eyJjcmVhdGVk...&size=20

STEP 4: Server decodes cursor and uses it in the WHERE clause
  Decoded: { createdAt: '2025-06-10T12:00:00Z', orderId: 'ORD-081' }
  Query:
  SELECT * FROM orders
  WHERE (created_at, id) < ('2025-06-10T12:00:00Z', 'ORD-081')
  ORDER BY created_at DESC, id DESC
  LIMIT 20;
  
  Returns rows 21-40 — exactly the rows after the last seen item. ✅

WHY TWO FIELDS in the cursor (createdAt + orderId)?
  createdAt alone: if two orders have the same createdAt (to the millisecond),
  you don't know which to put AFTER. You might skip one.
  orderId as tie-breaker: unique ID guarantees a deterministic sort position.
  Always include the primary key as the final sort field.
```

### When to Use Which

```
USE OFFSET PAGINATION when:
  ✅ Users need to jump to specific page numbers ("Page 47 of 200")
  ✅ Dataset is small and rarely changes (< 10,000 rows, mostly read-only)
  ✅ The UI shows a page number with "1, 2, 3... 20" navigation
  ✅ Admin tools with filtered search results (users expect SQL-like paging)
  ✅ Requires totalCount for "showing 1-20 of 5,421 results"
  
  Examples: admin orders list with page numbers, product search with pages,
            report exports that users navigate sequentially from beginning

USE CURSOR PAGINATION when:
  ✅ Large datasets (100,000+ rows, millions of rows)
  ✅ Data changes frequently (new items inserted between page requests)
  ✅ Infinite scroll / load-more UX (not numbered pages)
  ✅ API is consumed by clients that need stable, consistent pagination
  ✅ Real-time feeds where users scroll through events, transactions, messages
  
  Examples: Razorpay transaction history, Swiggy order feed, Twitter timeline,
            Instagram post feed, Stripe payment list API
```

---

## 4. The Code

### ❌ Wrong Way — Offset Pagination Without Safeguards

```java
// ❌ WRONG: Naive offset — O(N) cost, no limit on page size, no total safeguard
@GetMapping("/orders")
public List<OrderDto> getOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {

    // ❌ Client can request page=100000&size=10000 → 1 billion rows scanned
    // ❌ No validation, no max size limit
    Pageable pageable = PageRequest.of(page, size);
    return orderRepository.findAll(pageable).getContent()
        .stream().map(OrderDto::from).collect(Collectors.toList());
}
```

> **Why this fails in production:** Unbounded page sizes allow resource exhaustion attacks. Large OFFSET values cause O(N) queries that degrade as the dataset grows.

---

### ✅ Right Way — Offset Pagination with Safeguards

```java
// ✅ CORRECT: Offset with bounded size, totalCount, and clear response structure
@GetMapping("/admin/orders")  // Admin UI — needs page numbers
public ResponseEntity<PagedResponse<OrderDto>> listOrdersOffset(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size, // ✅ Max 100 per page
        @RequestParam(required = false) String status) {

    PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<Order> orderPage = orderRepository.findByStatusOptional(status, pageable);

    return ResponseEntity.ok(PagedResponse.<OrderDto>builder()
        .data(orderPage.getContent().stream().map(OrderDto::from).toList())
        .page(page)
        .size(size)
        .totalElements(orderPage.getTotalElements())  // ✅ For UI: "Showing results 1-20 of 5,421"
        .totalPages(orderPage.getTotalPages())
        .hasNext(orderPage.hasNext())
        .build());
}
```

### ✅ Right Way — Cursor Pagination (Production Quality)

```java
// ✅ Cursor pagination: O(1) cost, stable, no duplicates
@GetMapping("/orders")  // End-user feed — needs stable pagination
public ResponseEntity<CursorPagedResponse<OrderDto>> listOrdersCursor(
        @RequestParam(required = false) String after,  // opaque cursor token
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
        @AuthenticationPrincipal JwtUserDetails user) {

    // Parse cursor if provided
    OrderCursor cursor = after != null ? cursorService.decode(after) : null;

    // O(1) query: index seek on (created_at, order_id) — no OFFSET scanning
    List<Order> orders = orderRepository.findAfterCursor(
        user.getUserId(), cursor, size + 1  // fetch one extra to know if more pages exist
    );

    boolean hasMore = orders.size() > size;
    List<Order> pageOrders = hasMore ? orders.subList(0, size) : orders;

    // Generate next cursor from the LAST item in the returned page
    String nextCursor = hasMore
        ? cursorService.encode(pageOrders.get(pageOrders.size() - 1))
        : null;

    return ResponseEntity.ok(CursorPagedResponse.<OrderDto>builder()
        .data(pageOrders.stream().map(OrderDto::from).toList())
        .nextCursor(nextCursor)    // null when on last page
        .hasMore(hasMore)
        .size(pageOrders.size())
        .build());
}
```

```java
// Cursor encoding/decoding service
@Service
public class OrderCursorService {

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    // Encode last item's position as cursor
    public String encode(Order lastItem) {
        String payload = lastItem.getCreatedAt().toString() + "|" + lastItem.getOrderId();
        return ENCODER.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        // ✅ Opaque to client: "eyJjcmVhdGVkQXQiOiI..." — not a page number
        // For higher security: encrypt instead of base64 — prevents cursor forgery
    }

    // Decode cursor back to position
    public OrderCursor decode(String cursorToken) {
        try {
            String payload = new String(DECODER.decode(cursorToken), StandardCharsets.UTF_8);
            String[] parts = payload.split("\\|", 2);
            return new OrderCursor(Instant.parse(parts[0]), parts[1]);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid pagination cursor");
            // ✅ 400 Bad Request for invalid cursor — never expose internal error
        }
    }
}
```

```java
// Repository method — cursor-based query
@Query("""
    SELECT o FROM Order o
    WHERE o.userId = :userId
      AND (
          o.createdAt < :cursorCreatedAt
          OR (o.createdAt = :cursorCreatedAt AND o.orderId < :cursorOrderId)
      )
    ORDER BY o.createdAt DESC, o.orderId DESC
    """)
List<Order> findAfterCursor(
    @Param("userId") String userId,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorOrderId") String cursorOrderId,
    Pageable pageable  // only LIMIT applies here — no OFFSET
);

// Overloaded for first page (no cursor)
List<Order> findByUserIdOrderByCreatedAtDescOrderIdDesc(
    String userId,
    Pageable pageable
);
```

### TypeScript React — Infinite Scroll with Cursor Pagination

```typescript
// React Query: infinite scroll with cursor-based pagination
const useOrderFeed = () => {
  return useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const url = pageParam
        ? `/api/v1/orders?after=${pageParam}&size=20`
        : '/api/v1/orders?size=20';
      const response = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error('Failed to load orders');
      return response.json() as Promise<CursorPagedResponse<OrderDto>>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // ✅ Returns undefined when nextCursor is null → stops infinite loading
  });
};

// Usage in component:
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrderFeed();

// Flatten all pages into one array for rendering
const allOrders = data?.pages.flatMap(page => page.data) ?? [];

// Triggered by IntersectionObserver or "Load More" button:
const loadMore = () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); };
```

---

## 5. Interview Questions & Model Answers

### Q1 — Comparison
**Interviewer asks:** "What are the trade-offs between cursor-based and offset-based pagination?"

**Hruday's answer:**
> Offset pagination is dead simple to implement — `LIMIT size OFFSET page * size` — and it supports random page access: users can jump directly to page 47. The response can include a total count, so the UI can show "Page 3 of 200." For admin dashboards, search results, or small datasets, offset is reasonable.
>
> The two problems at scale: performance and stability. Performance: OFFSET N tells the database to skip N rows, but it still scans them. OFFSET 100,000 scans 100,000 rows before returning 20. As pages go deeper, queries get slower — linearly with offset size. On a table with 10 million rows, deep pagination is slow regardless of indexes.
>
> Stability: if a new row appears between page 1 and page 2 requests, it shifts all OFFSET positions. Users get duplicates or skip items. For a transaction history API where correctness matters, this is unacceptable.
>
> Cursor pagination solves both. The cursor marks a sort position — the query becomes `WHERE (sort_field, id) < cursor_values LIMIT 20`. It's always an index seek: constant O(1) cost regardless of position in the dataset. And because we anchor on the actual sort position rather than a row count, data changes don't affect existing cursors.
>
> The trade-off cursor has: no random page access (you can't jump to page 47), no total count without a separate COUNT query, and forward-only navigation complexity (previous page requires cursor reversal or storing previous cursors client-side).

---

### Q2 — Implementation
**Interviewer asks:** "You're building the Razorpay transaction history API. How would you design pagination for a merchant's 5 million transaction table?"

**Hruday's answer:**
> Cursor-based pagination — no question. Two reasons: 5 million rows means deep OFFSET queries would hit performance walls, and financial transaction lists must be stable — merchants can't afford to see duplicate or skipped transactions when reconciling.
>
> I'd sort by `(created_at DESC, transaction_id DESC)` — timestamp first for reverse chronological order, transaction_id as tie-breaker since millisecond-precision timestamps can collide. The composite index `CREATE INDEX ON transactions(created_at DESC, transaction_id DESC)` makes the cursor query an index seek.
>
> The cursor encodes the last seen item's `{createdAt, transactionId}` as a base64 (or encrypted, for a financial API) opaque string. The client sends `after=<cursor>` on each request. Default page size 50, max 200, never more.
>
> Response: `data: [...]`, `nextCursor: "eyJ..."` (null on last page), `hasMore: true/false`. No totalCount — we never COUNT(*) on 5 million rows per page request.
>
> For the merchant dashboard's "filter by date range + cursor": the cursor must encode the date range too (or validate that the decoded cursor is consistent with the requested filter — reject inconsistent combinations with 400). This prevents filter-switching mid-cursor from returning inconsistent results.

---

### Q3 — Edge Cases
**Interviewer asks:** "What happens when a user modifies data mid-pagination? How does your cursor handle it?"

**Hruday's answer:**
> Cursor pagination is specifically designed for this scenario. The cursor encodes a stable sort position — a combination of sort-field value and the primary key. When a new row is inserted into the table, it either lands before or after the cursor's position. If before: it would show up on a fresh first page but not in an ongoing pagination session — correct, the user missed new data added after they started paginating. If after: it shows up on later pages — correct.
>
> Deletions: if a row that the cursor points to is deleted between pages, the query uses the encoded sort position, not the row itself. The WHERE clause `(created_at, id) < (cursor_time, cursor_id)` still works correctly — it finds rows with a timestamp earlier than the cursor, regardless of whether the cursor row exists.
>
> Updates that change the sort field (e.g., updating `created_at` — rare for immutable financial data): this can cause the row to appear in a different position. For immutable data like transactions, this never happens. For mutable sorted data: cursor pagination is still better than offset, but the cursor field should be an immutable attribute (insertion time, ID) rather than a mutable one.
>
> One real edge case: if ALL items at the cursor boundary have the same sort field value and the page size exactly lands on that boundary, you need the tie-breaking ID to determine which items to skip. Without the ID in the cursor, you get duplicates at sort-field collision boundaries. Always include a unique ID as the final cursor component.

---

### Q4 — Frontend Integration
**Interviewer asks:** "How do you implement infinite scroll on the React frontend with cursor pagination?"

**Hruday's answer:**
> React Query's `useInfiniteQuery` hook maps directly to cursor pagination. It manages the cursor chain automatically: each page's response returns `nextCursor`, and `getNextPageParam` extracts it. When the hook fetches the next page, it calls the query function with `pageParam` equal to the last page's `nextCursor`. When `nextCursor` is null, `getNextPageParam` returns undefined — React Query knows there are no more pages and stops auto-fetching.
>
> For the scroll trigger: I use an IntersectionObserver on a sentinel element placed at the bottom of the list. When that element enters the viewport, if `hasNextPage` is true and we're not already fetching, call `fetchNextPage`. This is much more performant than scroll event listeners which fire hundreds of times per second.
>
> The data from `useInfiniteQuery` comes back as an array of pages — I flatten it with `data?.pages.flatMap(page => page.data)` for the render list.
>
> Error handling: if a `fetchNextPage` call fails, React Query's built-in retry with exponential backoff handles it. The user sees a "load more" error state instead of a broken scroll, and can retry manually.
>
> One thing to not do: don't store the cursors client-side in Redux or local state. React Query manages them internally in its page data. They're ephemeral to the session — when the user navigates away and comes back, they start fresh from page 1.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Offset pagination is fine for most use cases" | "Offset works well, I always use page and size" | "Offset is fine specifically for small (<10k rows), rarely changing datasets where users need random page access. For transaction lists, activity feeds, or any list over 100k rows: offset becomes a performance problem at large page numbers. The database has to scan N rows to skip them. OFFSET 1,000,000 on a large table takes seconds. At Razorpay scale (millions of transactions per merchant), returning page 5000 with offset would be unacceptably slow. For any list that grows unboundedly, design with cursor pagination from the start — it's much harder to migrate later when the table is already large." |
| "Cursor is just the row ID" | "The cursor is just the primary key of the last item" | "The cursor is a COMPOSITE of the sort field value PLUS the primary key — both are needed. The sort field alone isn't enough if multiple rows share the same value (timestamp collision at millisecond precision is common at high write rates). The primary key alone isn't enough because the sort order might not match key ordering (created_at DESC means newest first, but auto-increment IDs might not align with that if clocks skew). The composite `(createdAt, orderId)` ensures a unique, deterministic position in the sorted result set. Always include the sort key AND a unique ID as a tie-breaker in your cursor." |
| "Just use OFFSET for simplicity and optimise later" | "Start with OFFSET, we can switch to cursor when needed" | "Migrating from offset to cursor is not a configuration change — it's a breaking API change. Existing clients using `page=5&size=20` must switch to `after=<cursor>`. Mobile apps that clients haven't updated still have the old API. You'd need to maintain both at once, then deprecate offset. This is painful. Decide at the time of API design. The cost of implementing cursor from the start is one hour of extra development. The cost of migrating later is versioning the API, maintaining two pagination modes, coordinating client updates, and dealing with clients that never update." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had a financial transaction reporting feature in the ERP integration — merchants could browse their transaction history. The initial implementation used offset pagination: it worked fine during development with a test dataset of 500 rows. When we connected to a real customer's data with 3 million rows, the finance team reported that navigating to later pages in the transaction history became very slow. The SELECT with large OFFSET was scanning millions of rows. We refactored to cursor pagination using `(transaction_date, transaction_id)` as the cursor fields, added the compound index, and the problem disappeared — every page loaded at the same speed regardless of position. That experience made cursor pagination my default choice for any financial list."

---

## 8. Scale Evolution

**1,000 users →** Offset pagination with max page size 100. Total count on response. Simple Spring Data `PageRequest`. Works perfectly.

**100,000 users →** Cursor pagination for user-facing lists (order history, activity feed). Offset retained for admin tools with page numbers. Compound index `(sort_col DESC, id DESC)`. Max cursor age: 24 hours (reject old cursors gracefully with 400 + message to restart from page 1).

**10 million users →** Cursor pagination universally on user-facing APIs. Cursor tokens signed/encrypted (HMAC or AES) to prevent forgery and enumeration. Independent read replicas serve pagination queries to avoid read load on primary. Bounded cursor expiry enforced server-side. Metrics: p99 pagination query latency monitored per collection; alert if > 100ms (indicates missing index or unbounded OFFSET still present somewhere). Redis caches first page of feeds for O(1) initial load.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchants need stable, complete transaction history. Cursor pagination ensures no transactions are skipped during reconciliation. Millions of transactions per merchant make offset unfeasible. | "Design the pagination API for a merchant's transaction history with 50M rows. What strategy ensures zero missed transactions during a reconciliation export?" |
| Swiggy / Meesho | Order history feed, restaurant search results, product catalog scrolling. High write rates (new orders constantly) make offset unstable. Infinite scroll UX needs cursor. | "A user is scrolling through their 200-order history on the Swiggy app. New orders arrive while they're scrolling. How does your pagination ensure they see all historical orders?" |
| Adobe / Microsoft | Document lists, revision history, audit logs — large, append-heavy datasets needing stable pagination. API consumed by enterprise clients building automated workflows that page through complete datasets. | "Our document management API returns a list of 500K documents. An enterprise client's script pages through all of them overnight. What pagination design guarantees they never miss a document even if new ones are created during the run?" |
| SAP Labs (current) | ERP financial transaction lists, audit logs, document approval history — large immutable datasets where completeness is a compliance requirement. | "An ERP audit report must enumerate all 10M financial journal entries for regulatory review. Design the pagination mechanism that guarantees completeness and stability." |

---

## 10. Related Topics — What to Study Next

- **Topic 126 — HTTP Methods** — GET with query parameters is the standard HTTP mechanism for pagination; understanding GET's cacheability means cursor pagination responses can be cached (GET `/orders?after=abc&size=20` is cacheable, unlike POST), which changes CDN strategy for paginated lists
- **Topic 127 — HTTP Status Codes** — cursor validation errors return 400; when a cursor points beyond the last item (last page), `hasMore: false` and `nextCursor: null` communicate completion without any error status code; 404 for no results vs empty list with 200 are both valid design choices
- **Topic 88 — Query Optimization** — the compound index `(sort_field DESC, id DESC)` is what makes cursor pagination O(1); without it, even cursor pagination degrades to O(N); understanding EXPLAIN plans for cursor queries shows why the index must cover the exact sort order
- **Topic 91 — Database Replication** — pagination queries at scale are directed to read replicas; slight replication lag means a new item might not appear immediately on the read replica — this is the eventual consistency trade-off in paginated feeds, and it's acceptable for most use cases

---

*Part 7 · Pagination — Cursor-Based vs Offset-Based · Full Stack Interview Guide · Hruday D · 2026*
