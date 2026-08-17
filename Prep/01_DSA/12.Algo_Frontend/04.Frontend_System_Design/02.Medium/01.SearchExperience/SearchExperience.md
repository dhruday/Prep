# Search Experience

## Problem Statement

Design a production search page with typeahead for a large catalog. Users must be able to share a result URL, navigate by keyboard, recover from failures, and see fast results on mobile and desktop.

## Solution

### Clarify first

- Confirm search scope, result ranking ownership, target latency, authenticated versus anonymous users, and whether results can be stale.
- Treat query, filters, sort order, and page/cursor as URL state so refresh, back/forward, and sharing work.

### Frontend architecture

```
SearchInput → debounced query controller → suggestion API/cache
     ↓                                       ↓
URL state ← results controller ← search API (cursor pagination)
     ↓
Accessible results list + loading/error/empty states + telemetry
```

- Use a debounced typeahead request with `AbortController`; ignore stale responses even if cancellation races.
- Cache normalized queries in memory with a short TTL. Use the HTTP cache/CDN for public result payloads; do not persist sensitive queries by default.
- Fetch result pages by cursor, deduplicate item IDs, and preserve the previous successful result while a new page is loading.
- Implement the input as an ARIA combobox: labels, active descendant, Escape to close, Arrow keys to navigate, Enter to commit, and pointer support.

### API contract

`GET /api/search?q=&filters=&sort=&cursor=` returns `{ items, nextCursor, totalApproximate, requestId }`. The server owns ranking and validation; the client sends encoded parameters and renders server-provided stable IDs.

### Failure, performance, and rollout

- Render skeletons for initial load, an inline retry for page failures, and a clear no-results state with query/filter recovery.
- Keep suggestion and result bundles separate; virtualize only after measured result rendering requires it.
- Instrument suggestion latency, abandon/select rate, result errors, LCP/INP, zero-result rate, and stale-response drops.
- Roll out with a feature flag, compare search success and latency by cohort, and preserve a kill switch.

### Trade-offs

Client filtering is appropriate only for a small already-loaded collection. Catalog search should remain server-side for ranking, authorization, freshness, and scale.
