# 267 – Scale & Edge Cases

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Scale and edge case questions test whether you think beyond the happy path. **Scale** means: "What happens when data grows 10x or 100x?" **Edge cases** means: "What happens when things go wrong — network fails, user double-clicks, empty state, concurrent edits?" Senior engineers proactively address these without being asked. In interviews, mention 3-5 edge cases unprompted — it signals production experience and shows you've actually shipped real systems.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Scale Dimensions in Frontend

```
DATA SCALE:
├── 100 items → simple map/filter in memory
├── 1,000 items → might need pagination
├── 10,000 items → virtualization required (react-window, Virtuoso)
├── 100,000 items → server-side search + cursor pagination
└── 1M+ items → need search service (Elasticsearch) + faceted results

USER SCALE:
├── Single user → local state is fine
├── Multi-user → need conflict resolution
├── Real-time multi-user → CRDT or OT for eventual consistency
└── 10K+ concurrent → need WebSocket server scaling (pub/sub)

COMPONENT SCALE:
├── 5 components → single file is fine
├── 50 components → organized folders, barrel exports
├── 500+ components → design system, monorepo, documentation
└── Cross-team → micro-frontends, shared component library
```

### Edge Case Categories (FENCE Framework)

**F — Failure States**
- Network timeout → retry with backoff, offline indicator
- API returns error → error boundary, meaningful error message
- Auth token expires mid-session → refresh token, re-auth flow

**E — Empty States**
- No data → helpful empty state UI, not blank page
- First-time user → onboarding flow, sample data
- Search with no results → suggestions, clear filters option

**N — Null/Boundary Values**
- Very long text → truncation with tooltip
- Special characters → XSS prevention, proper encoding
- Zero, negative, MAX_INT for numeric inputs

**C — Concurrent Operations**
- Double-click submit → disable button, debounce
- Stale data from browser tab → SSE/polling refresh
- Race conditions on rapid API calls → abort previous request

**E — Extreme Cases**
- Very slow network (3G) → skeleton loading, progressive enhancement
- Very large file upload → chunking, progress indicator
- User navigates away mid-operation → cleanup, save draft

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, our OData lists could return 10K+ records — we used virtual scrolling and server-side pagination. Edge cases I handled: network failure during batch operations (rollback), empty entity sets (guided empty state), concurrent edits (ETag-based optimistic locking).

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I proactively address scale and edge cases using the FENCE framework: Failure states (network error, auth expiry), Empty states (no data, first-time user), Null/boundary values (long text, special chars), Concurrent operations (double-click, stale data), and Extreme cases (slow network, large uploads). For scale, I consider data volume — under 1K items I filter client-side, over 10K I virtualize, over 100K I use server-side search."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Edge case handling in a search component

function SearchResults({ query }: { query: string }) {
  const { data, error, isLoading } = useSearch(query);

  // EDGE: Empty query
  if (!query.trim()) return <EmptyState message="Start typing to search" />;
  
  // EDGE: Loading state
  if (isLoading) return <SkeletonList count={5} />;
  
  // EDGE: Error state (network failure)
  if (error) return <ErrorState message="Search failed" onRetry={() => refetch()} />;
  
  // EDGE: No results
  if (data.length === 0) return <EmptyState message={`No results for "${query}"`} action={<Button onClick={clearFilters}>Clear filters</Button>} />;
  
  // SCALE: Virtualize if > 100 results
  if (data.length > 100) {
    return <VirtualizedList items={data} />;
  }
  
  return <SimpleList items={data} />;
}

// EDGE: Prevent race conditions with abort controller
function useSearch(query: string) {
  const [state, setState] = useState<AsyncState<Item[]>>({ status: 'idle' });
  
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    
    setState({ status: 'loading' });
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setState({ status: 'success', data }))
      .catch(err => {
        if (err.name !== 'AbortError') {
          setState({ status: 'error', error: err.message });
        }
      });
    
    return () => controller.abort(); // Cancel previous request
  }, [query]);
  
  return state;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"FENCE = Failure, Empty, Null/boundary, Concurrent, Extreme."** Mention 3-5 edge cases unprompted. For scale: <1K client-side, 1K-10K paginate, >10K virtualize, >100K server-side search. Always handle: empty state, error state, loading state — the "state trinity."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Edge cases separate production engineers from tutorial-level developers. Mentioning them unprompted is a strong senior signal.
**How:** FENCE framework (Failure, Empty, Null/boundary, Concurrent, Extreme). Scale thresholds for data volume. Always cover the state trinity (loading, error, empty).
**Companies:** All four probe for edge cases. Microsoft's bar raiser specifically asks "What could go wrong?" Cisco values production reliability.
