# 145. URL as State — When and Why
**Phase:** State & Data | **Sequence:** SEQ 06 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

URL-as-state is the practice of storing application state in the URL's path segments or query parameters rather than in component state, a global store, or session storage. The URL is the most durable, shareable, and indexable state container in the browser — if a user bookmarks a URL or copies it to a colleague, they expect to land on exactly the same view. I use URL state for anything a user should be able to share, navigate to directly, or return to via the back button: search queries, active filters, sort order, pagination, selected tab, selected item ID, and view mode. I avoid URL state for ephemeral UI state (hover, focus, open/close of ephemeral overlays) and sensitive data (tokens, passwords). The rule: **if you'd expect the back button or Ctrl+D to preserve it, it belongs in the URL.**

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What Goes in the URL — Decision Framework

```
State belongs in URL if:
  ✅ User can share a link and the recipient sees the same view
  ✅ Browser back/forward should navigate through state changes
  ✅ User would be surprised if refreshing the page lost this state
  ✅ Search engines should index this view
  ✅ Deep linking from external apps (email, Slack) should work

State does NOT belong in URL if:
  ❌ Ephemeral UI (tooltip visible, dropdown open, hover highlight)
  ❌ In-progress form data (draft before submit)
  ❌ Sensitive data (tokens, PII, credit card info)
  ❌ Animation state
  ❌ Large serialized data (binary blobs, base64 images)
  ❌ State that requires authentication to be meaningful (user-specific IDs without context)
```

### React Router v6 — `useSearchParams`

```typescript
import { useSearchParams, useNavigate } from 'react-router-dom';

// ---- Type-safe URL state helper ----
function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? 'all',
    sort: (searchParams.get('sort') ?? 'name:asc') as 'name:asc' | 'name:desc' | 'price:asc',
    page: Number(searchParams.get('page') ?? '1'),
    view: (searchParams.get('view') ?? 'grid') as 'grid' | 'list',
  };

  const setFilters = useCallback(
    (updates: Partial<typeof filters>) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        // Merge updates into existing params
        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            next.delete(key === 'search' ? 'q' : key);  // clean up empty params
          } else if (key === 'search') {
            next.set('q', String(value));
          } else if (key === 'page' && value === 1) {
            next.delete('page');  // default page — don't pollute URL with ?page=1
          } else {
            next.set(key, String(value));
          }
        });
        return next;
      }, { replace: true });  // replace: true avoids history entry on every keystroke
    },
    [setSearchParams]
  );

  // Reset pagination when filters change (critical — forgot this = page 5 on new search)
  const setFiltersAndResetPage = useCallback(
    (updates: Omit<Partial<typeof filters>, 'page'>) => {
      setFilters({ ...updates, page: 1 });
    },
    [setFilters]
  );

  return { filters, setFilters, setFiltersAndResetPage };
}

// ---- Component ----
function ProductPage() {
  const { filters, setFiltersAndResetPage, setFilters } = useProductFilters();

  const { data } = useQuery({
    queryKey: ['products', filters],  // ← URL state directly as query key
    queryFn: () => api.products.list(filters),
  });

  return (
    <div>
      {/* Search — debounced, replace history so back button doesn't step through each char */}
      <SearchInput
        value={filters.search}
        onChange={q => setFiltersAndResetPage({ search: q })}
      />

      {/* Category filter */}
      <CategorySelect
        value={filters.category}
        onChange={category => setFiltersAndResetPage({ category })}
      />

      {/* Sort */}
      <SortSelect
        value={filters.sort}
        onChange={sort => setFiltersAndResetPage({ sort })}
      />

      {/* View toggle — doesn't reset page */}
      <ViewToggle
        value={filters.view}
        onChange={view => setFilters({ view })}
      />

      {/* Product grid */}
      <ProductGrid products={data?.items} view={filters.view} />

      {/* Pagination */}
      <Pagination
        current={filters.page}
        total={data?.totalPages ?? 1}
        onChange={page => setFilters({ page })}
      />
    </div>
  );
}
```

### Next.js — `useSearchParams` + `router.push`

```typescript
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

function useNextFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const filters = {
    search: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? 'all',
    page: Number(searchParams.get('page') ?? '1'),
  };

  const setFilters = useCallback(
    (updates: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        const urlKey = key === 'search' ? 'q' : key;
        if (!value || (key === 'page' && value === 1)) {
          params.delete(urlKey);
        } else {
          params.set(urlKey, String(value));
        }
      });

      // startTransition: marks this as a non-urgent update
      // → React keeps the current page interactive while the new page loads (Next.js 14+)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  return { filters, setFilters, isPending };
}
```

### URL-Based Tab State

```typescript
// Tabs that survive page refresh and are deep-linkable
function ReportTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'overview') as 'overview' | 'details' | 'raw';

  const setTab = (tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });  // replace: tab switches are not "navigations"
  };

  return (
    <div>
      <nav>
        {(['overview', 'details', 'raw'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            aria-selected={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>
      {activeTab === 'overview' && <OverviewPanel />}
      {activeTab === 'details' && <DetailsPanel />}
      {activeTab === 'raw' && <RawPanel />}
    </div>
  );
}
```

### Selected Item ID in URL

```typescript
// Right-panel detail view — selected item ID in URL
// URL: /products?selected=prod_123

function ProductListWithDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected');

  const selectProduct = (id: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) next.set('selected', id);
      else next.delete('selected');
      return next;
    }, { replace: true });
  };

  // The selected product detail is fetched BECAUSE the ID is in the URL
  const { data: selectedProduct } = useQuery({
    queryKey: ['products', selectedId],
    queryFn: () => api.products.get(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <SplitView>
      <ProductList onSelect={(id) => selectProduct(id)} selectedId={selectedId} />
      {selectedId && <ProductDetail product={selectedProduct} onClose={() => selectProduct(null)} />}
    </SplitView>
  );
}
```

### URL Serialization Utilities

```typescript
// Generic URL state serialization — handles complex filter objects

type FilterValue = string | number | boolean | string[] | undefined;
interface FiltersObject { [key: string]: FilterValue; }

function filtersToSearchParams(filters: FiltersObject): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      // Repeat param: ?tags=a&tags=b&tags=c — parseable with getAll('tags')
      value.forEach(v => params.append(key, String(v)));
    } else if (typeof value === 'boolean') {
      if (value) params.set(key, '1');  // omit false (default) — ?active vs ?active=0
    } else {
      params.set(key, String(value));
    }
  });
  return params;
}

function searchParamsToFilters<T extends FiltersObject>(
  params: URLSearchParams,
  defaults: T
): T {
  const result = { ...defaults };
  Object.keys(defaults).forEach(key => {
    const val = params.get(key);
    if (val === null) return;
    const defaultVal = defaults[key];
    if (typeof defaultVal === 'number') result[key] = Number(val) as any;
    else if (typeof defaultVal === 'boolean') result[key] = (val === '1') as any;
    else if (Array.isArray(defaultVal)) result[key] = params.getAll(key) as any;
    else result[key] = val as any;
  });
  return result;
}
```

### replace vs push — When to Use Each

```typescript
// router.push → creates history entry → back button can return to it
//   Use for: meaningful navigation (going to page 2, clicking a different tab)

// router.replace → replaces current history entry → back button skips it
//   Use for: ephemeral changes (debounced search query, view preference toggle)
//   Rationale: pressing back from a search page should go to BEFORE the search,
//              not back through every keystroke the user typed

// Rule: if pressing back should NOT undo this change → use replace
// Debounced search → replace
// Page change → push
// Tab change → replace
// Sort change → replace
// Clear all filters → replace
// Apply a saved filter preset → push (user chose a meaningful state)
```

### ⚠️ Anti-Patterns

- **Forgetting to reset `page` when filters change** — most common URL state bug; always reset to page 1 when category/search/sort changes; wrap in a `setFiltersAndResetPage` helper
- **Parsing URL params directly in multiple components** — centralize URL state parsing in a custom hook; raw `searchParams.get('q') ?? ''` spread through 5 components = fragile
- **`replace: false` for search input** — every keystroke creates a history entry; 10-character search = 10 back button presses; always use `replace: true` for text input-driven params
- **Putting auth tokens in URL** — tokens in URL appear in server logs, browser history, Referer headers; never put secrets in URL
- **Deep-encoding complex state as base64 JSON** — breaks bookmark ability, breaks back button semantics, breaks deep links, bloats URLs beyond browser limits (~2000 chars)

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the supplier search had 6 filters (category, price range, region, rating, availability, sort) implemented as React state. When a buyer shared a URL with a colleague, the colleague always landed on the unfiltered list, requiring the buyer to verbally explain the filters — a support ticket generator. Migrated all 6 filters to URL search params. Filter sharing immediately worked. A side benefit: the "save search" feature needed zero backend — users bookmarked the URL. Development velocity improved too: a URL became a reproducible test case for any filter combination.

**FAANG scale:**
- **Microsoft:** Azure portal resource search — all filters, sort, pagination in URL; shareable support tickets include the exact filtering state; power users create filtered bookmarks for daily-used views
- **Adobe:** Stock asset discovery — search query, asset type, orientation, color, license, sort all URL params; critical for SEO as crawlers can discover individual filtered views
- **Salesforce:** Report builder — selected fields, filters, groupings, chart type in URL; "share this report view" button simply copies the URL; no backend save required for unmodified views
- **Cisco:** Network topology filters — device type, status, site, VLAN all URL params; NOC operators share exact filtered views during incidents via chat without needing to describe which filters are set

---

## 💬 4. Interview Execution

### Sample Answer

> "My approach is simple: if pressing the back button or sharing the URL to someone else should preserve this state, it belongs in the URL. In practice that means search queries, filters, sort order, pagination, active tab, and selected item ID. The URL is the only truly persistent, shareable, bookmark-able state container in the browser.
>
> In React Router v6 I use `useSearchParams` with a custom abstraction layer — something like `useProductFilters` — that centralizes all the parsing logic so I'm not doing `searchParams.get('q') ?? ''` scattered through 10 components. The hook returns parsed, typed values and a `setFilters` function that handles the serialization and the `replace` vs `push` decision.
>
> The most common error I've seen: forgetting to reset the page to 1 when any filter changes. On a filtered list at page 5, changin the search query leaves you at page 5 of the new results — which may be empty. I always wrap that in `setFiltersAndResetPage`.
>
> At SAP, migrating 6 supplier search filters from React state to URL state enabled filter sharing, made every search reproducible as a test case, and unlocked a 'save search' feature that was literally just bookmarking the URL."

### Likely Follow-ups
1. "When would you NOT use URL state?" → Ephemeral UI (hover states, dropdown open/close), sensitive data (tokens, PII), in-progress form data, animation state
2. "How do you handle arrays in URL params?" → Repeat the key: `?tags=a&tags=b`; read with `params.getAll('tags')` which returns string array
3. "replace vs push?" → `replace` for changes that shouldn't be back-button navigable (debounced search, view toggle); `push` for meaningful state transitions (page changes, clicking into a detail view)
4. "How does this work with SSR?" → Next.js reads `searchParams` in Server Components — filters can affect server-side data fetching; the component receives the filtered data on first render without client-side loading state; this also benefits SEO (crawlers see filtered content)
5. "How do you synchronize URL state with TanStack Query?" → Use the parsed URL filters directly as the `queryKey` — when URL changes, the query key changes, TanStack Query fetches the new data; no additional synchronization code needed

---

## 💻 5. Code Example

```typescript
// Full implementation: advanced product directory with URL-driven state

const DEFAULTS = {
  q: '',
  category: 'all',
  sort: 'relevance',
  page: 1,
  view: 'grid',
  minPrice: '',
  maxPrice: '',
} as const;

type ProductFilters = typeof DEFAULTS;

function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductFilters = {
    q: searchParams.get('q') ?? DEFAULTS.q,
    category: searchParams.get('category') ?? DEFAULTS.category,
    sort: searchParams.get('sort') ?? DEFAULTS.sort,
    page: Number(searchParams.get('page') ?? DEFAULTS.page),
    view: (searchParams.get('view') ?? DEFAULTS.view) as 'grid' | 'list',
    minPrice: searchParams.get('minPrice') ?? DEFAULTS.minPrice,
    maxPrice: searchParams.get('maxPrice') ?? DEFAULTS.maxPrice,
  };

  const updateFilters = useCallback(
    (updates: Partial<ProductFilters>, opts?: { resetPage?: boolean; replace?: boolean }) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const mergedUpdates = opts?.resetPage ? { ...updates, page: 1 } : updates;

        Object.entries(mergedUpdates).forEach(([key, value]) => {
          if (value === '' || value === DEFAULTS[key as keyof typeof DEFAULTS]) {
            next.delete(key);  // clean up default values — keep URL minimal
          } else {
            next.set(key, String(value));
          }
        });

        return next;
      }, { replace: opts?.replace ?? true });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters =
    filters.q !== DEFAULTS.q ||
    filters.category !== DEFAULTS.category ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '';

  return { filters, updateFilters, clearFilters, hasActiveFilters };
}

// Synchronize TanStack Query with URL filters
function useURLProductQuery() {
  const { filters } = useProductFilters();
  return useQuery({
    queryKey: ['products', filters],  // ← URL state IS the query key
    queryFn: () => api.products.search(filters),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}
```

---

## 🧠 6. Memory Aid

**URL state SHARE mnemonic:**
- **S**hareable (colleague can use the link)
- **H**istory (back button should navigate through it)
- **A**ddressable (direct link to this exact view)
- **R**efresh-safe (F5 should restore it)
- **E**xternally linkable (email, Slack, bookmark)

If the state passes SHARE → put it in the URL.
If it fails any one of SHARE → keep it in component/global state.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ URL-as-state is a free persistence mechanism with zero backend cost — the SAP "save search" feature was implemented by bookmarking a URL, which turned a potential week of backend work into a 0-line-of-code feature; this kind of insight impresses senior interviewers because it shows you think about architecture, not just implementation
→ The `replace` vs `push` distinction is the hidden depth question — using `push` for debounced search input means 10 characters typed = 10 history entries = 10 back button presses; every experienced interviewer has seen this bug in production and will probe whether you know to use `replace` for input-driven params
→ The "reset page on filter change" bug is ubiquitous — it's the first URL state bug that everyone encounters in production; demonstrating you've already experienced this and have a `setFiltersAndResetPage` convention shows real-world experience rather than theoretical knowledge

**How it works (2 sentences):**
`useSearchParams` in React Router v6 returns a `URLSearchParams` instance and a setter that calls `window.history.pushState` or `replaceState` to update the URL without a page reload — React Router's history observer detects the change, triggers a re-render of all components subscribed to `useSearchParams`, and the new params become available synchronously in the next render.
When URL params serve as TanStack Query keys, changing a filter parameter changes the `queryKey`, which TanStack Query treats as a cache miss if not previously fetched — it fires a new `queryFn` call with the new params, caches the result under the new key, and serves the cached result (with `keepPreviousData`) if this exact combination was visited before, enabling instant back-navigation through filter history.

---
✅ Topic 145/486 complete → Continuing to Topic 146: State Normalization
