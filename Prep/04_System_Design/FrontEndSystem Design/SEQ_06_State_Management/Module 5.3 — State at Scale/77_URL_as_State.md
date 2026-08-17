# 77. URL as State

## 1. High-Level Explanation

The URL is one of the most powerful and underused state management tools in frontend development. Query parameters, path segments, and hash fragments are a free, shareable, bookmarkable, server-accessible state store. When state lives in the URL, users can share links, use browser back/forward navigation, deep-link to specific views, and the server can read state without JavaScript.

"URL as State" means: any state that affects what the user sees on screen — filters, search queries, pagination, selected tabs, modal visibility — should live in the URL, not component state.

---

## 2. Deep-Dive

### What belongs in the URL?
| State type | URL? | Reason |
|---|---|---|
| Search query | ✅ `/search?q=sap+fiori` | Shareable, SEO |
| Filters / sort | ✅ `?category=UI&sort=price` | Deep linkable |
| Pagination | ✅ `?page=3` | Bookmarkable |
| Step in wizard | ✅ `/checkout/step/2` | Back nav works |
| Selected tab | ✅ `?tab=analytics` | Shareable link |
| Form input (draft) | ❌ | Too noisy, not shareable |
| Auth tokens | ❌ | Security risk — in headers only |
| UI loading states | ❌ | Transient, doesn't survive refresh |

### URL State management tools
- **Next.js App Router**: `useSearchParams()`, `usePathname()`, `router.push()`
- **React Router v6**: `useSearchParams()`, `useParams()`, `createSearchParams()`
- **nuqs** (next-uqs): type-safe URL state with schema validation
- **Angular**: `ActivatedRoute`, `queryParams`, Router state

### Key principle: Replace, don't push
When updating filters, use `router.replace()` not `router.push()` — so each filter change doesn't create a browser history entry. Use `router.push()` only for meaningful navigation steps.

---

## 3. Real-World Examples at SAP

SAP Fiori Launchpad uses path-based navigation for tile grouping and URL parameters for search/filter state — teams can share exact views of the SAP portal. In the SAP procurement analytics dashboard Hruday built, all filter combinations (date range, category, region, supplier) lived in URL params — enabling the "share report" feature with zero backend code. A single link reproduced the exact filtered view for any user.

---

## 4. Interview-Oriented Answer (STAR)

**S** — On the SAP analytics dashboard, users wanted to share specific filtered views with colleagues and bookmark frequently-used reports.

**T** — I needed to make filter state sharable and bookmarkable.

**A** — I moved all filter state (dateRange, category, region, supplierId, sortOrder) from `useState` to Next.js `useSearchParams`. I used `nuqs` for type-safe parameter handling with schema validation. Navigation updates used `router.replace()` to avoid polluting browser history. SSR read params from URL, enabling server-rendered first paint with correct filters.

**R** — "Share Report" feature required zero backend changes — the URL was the share mechanism. Support tickets for "I can't reproduce a report" dropped significantly. Back/forward navigation worked correctly across all filter combinations.

---

## 5. Code Example (TypeScript + Next.js + nuqs)

```typescript
// Using nuqs for type-safe URL state in Next.js
'use client';
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs';

function ProductFilters() {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [category, setCategory] = useQueryState('category', parseAsString.withDefault('all'));
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('created_at'));

  // URL: /products?q=laptop&page=2&category=electronics&sort=price
  // Fully type-safe, validated, shareable, bookmarkable

  return (
    <div>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }} // reset page on search
        placeholder="Search products..."
      />
      <CategorySelect value={category} onChange={setCategory} />
      <SortSelect value={sort} onChange={setSort} />
      <ProductGrid query={{ search, page, category, sort }} />
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
}

// Server component — read from searchParams directly (no JS needed)
export default function ProductsPage({ searchParams }: {
  searchParams: { q?: string; page?: string; category?: string; sort?: string }
}) {
  const page = Number(searchParams.page ?? 1);
  const search = searchParams.q ?? '';
  // Server-side data fetch with exact same state — SSR works!
  return <ProductFilters />;
}
```

---

## 6. Memory Aid

**"URL is the original Redux store"** — it's immutable (history entries), serialisable (string), shareable, and server-readable. The browser's back button is time-travel debugging.

**SPFS**: Shareable, Persistent across refresh, Free (no library needed), Survives full reload.

---

## 7. Why & How Summary

**Why URL state?** — Zero-cost sharing, bookmarking, and deep-linking. Server can read it. Browser navigation works. SEO benefits. No synchronisation needed between URL and visual state.

**How?** — Use `useSearchParams` / `useQueryState` (nuqs). Map filter/search/page to URL params. Prefer `replace()` for incremental filter updates, `push()` for major navigation. For complex objects, JSON-encode or use multi-value params. Validate with nuqs schema or Zod for type safety.
