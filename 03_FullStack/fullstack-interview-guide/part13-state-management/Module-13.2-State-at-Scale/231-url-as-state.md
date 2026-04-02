# URL as State — When Filters, Search, and Pagination Belong in the URL
> Part 13 — State Management
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **URL as state** means storing certain application state in the URL query parameters (`?page=2&sort=price&category=electronics&q=shoes`) rather than in React state, Redux, or an Angular service; the URL is itself a persistent, shareable, bookmarkable store for navigation-relevant state
- **Why URL state**: URL state is free — the browser maintains it (back/forward), the user can bookmark it, they can share it, and the server can read it for SSR; putting the same data in Redux means losing ALL of these properties — back/forward breaks (clicking Back clears Redux but URL drove the page), bookmarks don't restore the filter state, sharing the URL gives a blank page
- **React**: `useSearchParams()` from React Router — `const [searchParams, setSearchParams] = useSearchParams()`; read with `searchParams.get('q')`, write with `setSearchParams({ q: 'shoes', page: '1' })`; updating searchParams adds to browser history by default, use `{ replace: true }` to avoid back-button clutter on filter changes
- **Angular**: `queryParams` and `queryParamMap` on `ActivatedRoute`; `router.navigate([], { queryParams: { q: 'shoes' }, queryParamsHandling: 'merge' })`; `queryParamsHandling: 'merge'` preserves existing params not being changed
- **What belongs in the URL**: search query, current page, sort order, active tab (when linkable), active filters, selected category — anything the user might want to bookmark or share; the key test: "would clicking Back and getting the previous filter state be the right behavior?" If yes → URL
- **What does NOT belong in the URL**: sensitive data (cart contents, token), large payloads (complex filter objects should be compressed or stored server-side), transient UI state (which tooltip is open), session-specific state that differs per user
- ✅ **Hruday's anchor**: SAP Commerce Cloud — product catalog page with category/price/brand filters and pagination; every filter change updated URL params; shareable filtered catalog links worked automatically; browser Back restored previous filter view correctly

---

## 1. One-Line Definition
URL as state means using URL query parameters as the persistence layer for navigation-relevant state — filters, pagination, search, and active selections — giving free bookmarkability, shareability, browser history integration, and SSR hydration without any additional state management code.

---

## 2. The Problem It Solves

Imagine a product catalog page with filters: category, price range, sort order, brand. A user applies "Electronics > Laptops, under $2000, sorted by reviews" and finds exactly what they want. Consider what happens with each state approach:

**State in Redux / local useState:**
- User refines filters and pages through results (Back would clear all filter state)
- User wants to bookmark "Laptops under $2000" — the bookmark just opens the catalog with default filters
- User wants to share the page with a colleague — same problem, no filters in URL
- User accidentally refreshes — filter state gone, back to page 1 with no filters
- Server-side rendering has no knowledge of applied filters — can't pre-render the correct product list

**State in the URL (`/products?category=laptops&price_max=2000&sort=reviews&page=2`):**
- Clicking Back restores the previous filter state — the browser manages this automatically
- Bookmarking saves the exact filtered view — works as expected
- Copying and sharing the URL gives the exact same filtered view
- Refreshing the page restores the state from URL — handled by the component on mount
- SSR can read the URL params and pre-render the correct product list

All of these properties are FREE when state lives in the URL. They require significant extra code to replicate with Redux or local state. The rule: if the user experiencing "the previous state was lost" on Back or Refresh would feel like a bug, that state belongs in the URL.

---

## 3. How It Works Internally

### URL State vs In-Memory State

```
URL State (query params):
/products?category=laptops&sort=price_asc&page=3

  Properties:
  ✅ Persistent across refreshes
  ✅ Shareable — copy URL, send to colleague, they see identical state
  ✅ Bookmarkable — save the exact filtered view
  ✅ Browser history — Back/Forward button works correctly
  ✅ SSR-compatible — server reads params before render, pre-renders correct content
  ✅ Zero additional state management code
  
  Limitations:
  ❌ Only strings (no complex types inline — must serialize/deserialize)
  ❌ Public — visible, don't put sensitive data
  ❌ Limited length (~8KB across all params)
  ❌ User can edit manually — must validate/sanitize on read

Redux / useState:
  state = { category: 'laptops', sort: 'price_asc', page: 3 }
  
  Properties:
  ✅ Can store complex types (objects, arrays)
  ✅ Not visible to users (in-memory)
  ❌ Lost on refresh (unless manually persisted to localStorage)
  ❌ Breaks Back button — Back navigates the URL back but Redux doesn't roll back
  ❌ Cannot be bookmarked or shared
  ❌ SSR must separately communicate filter state to the server

URL + TanStack Query together:
  URL owns the "what I am looking at" (filter params)
  TanStack Query owns the "data I have fetched for this view"
  
  Query key = URL params → when URL changes, queryKey changes → new data fetched
  Back button changes URL → queryKey changes → cached data for previous URL returns
  This is the ideal pattern for filterable/searchable data pages
```

---

## 4. The Code

### Wrong Way — Filters in Redux (No URL Integration)

```typescript
// ❌ WRONG — All filter state in Redux: loses browser history, bookmarkability, shareability

const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    category: 'all',
    sortBy: 'relevant',
    priceMin: 0,
    priceMax: 5000,
    page: 1,
    searchQuery: '',
  },
  reducers: {
    setCategory: (state, action) => { state.category = action.payload; state.page = 1; },
    setSortBy: (state, action) => { state.sortBy = action.payload; },
    setPage: (state, action) => { state.page = action.payload; },
    setSearch: (state, action) => { state.searchQuery = action.payload; state.page = 1; },
  }
});

// ❌ Component:
const ProductCatalog = () => {
  const filters = useSelector(state => state.filters);
  const dispatch = useDispatch();
  
  // ❌ URL never changes when filters change
  // ❌ Refreshing the page: filters reset to initialState — user loses their work
  // ❌ Back button: URL goes to previous page but Redux filters STAY as-is — mismatch
  // ❌ Sharing the URL: recipient gets blank catalog, not the filtered view
  // ❌ Bookmarking: same — no filter state in URL
  
  return (
    <div>
      <select value={filters.category} onChange={e => dispatch(setCategory(e.target.value))}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      <ProductList filters={filters} />
    </div>
  );
};
```

> **Why this fails:** user applies "Laptops, sorted by price, page 3" and refreshes — starts over from page 1 with no filters; user shares the page URL — recipient sees blank catalog; Back button doesn't restore previous filter state; cannot be bookmarked meaningfully.

### Right Way — Filters in URL Query Params

```typescript
// ✅ RIGHT — React Router useSearchParams: filters in URL, TanStack Query for data

import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// ✅ Type-safe URL param parsing helper:
interface ProductFilters {
  category: string;
  sortBy: 'relevant' | 'price_asc' | 'price_desc' | 'reviews';
  priceMin: number;
  priceMax: number;
  page: number;
  q: string;
}

// ✅ Parse URL params with defaults (URL values are always strings — must convert):
const parseFilters = (searchParams: URLSearchParams): ProductFilters => ({
  category: searchParams.get('category') ?? 'all',
  sortBy: (searchParams.get('sort') as ProductFilters['sortBy']) ?? 'relevant',
  priceMin: Number(searchParams.get('price_min') ?? 0),
  priceMax: Number(searchParams.get('price_max') ?? 5000),
  page: Number(searchParams.get('page') ?? 1),
  q: searchParams.get('q') ?? '',
});

// ✅ Validate parsed value (user might manually edit URL to invalid values):
const VALID_SORT_OPTIONS: ProductFilters['sortBy'][] = ['relevant', 'price_asc', 'price_desc', 'reviews'];

const validateFilters = (filters: ProductFilters): ProductFilters => ({
  ...filters,
  sortBy: VALID_SORT_OPTIONS.includes(filters.sortBy) ? filters.sortBy : 'relevant',
  page: filters.page > 0 && filters.page < 1000 ? filters.page : 1,
  priceMin: filters.priceMin >= 0 ? filters.priceMin : 0,
  priceMax: filters.priceMax > 0 && filters.priceMax <= 100000 ? filters.priceMax : 5000,
});

const ProductCatalog: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ✅ Read filters from URL — automatically synced with browser state
  const filters = validateFilters(parseFilters(searchParams));
  
  // ✅ URL is the source of truth for queryKey — URL changes = new fetch
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', filters],   // ← filters object as part of key
    queryFn: () => api.getProducts(filters),
    // ✅ Cached per filter combination: navigating Back restores cached result instantly
  });
  
  // ✅ Filter update helper — resets page to 1 when filters change:
  const updateFilter = (updates: Partial<ProductFilters>) => {
    const newParams: Record<string, string> = {};
    const allFilters = { ...filters, ...updates };
    
    // Convert back to URL-safe strings:
    if (allFilters.category !== 'all') newParams.category = allFilters.category;
    if (allFilters.sortBy !== 'relevant') newParams.sort = allFilters.sortBy;
    if (allFilters.priceMin > 0) newParams.price_min = String(allFilters.priceMin);
    if (allFilters.priceMax < 5000) newParams.price_max = String(allFilters.priceMax);
    if (allFilters.page > 1) newParams.page = String(allFilters.page);
    if (allFilters.q) newParams.q = allFilters.q;
    // ✅ Only include non-default values — keeps URL clean
    
    setSearchParams(newParams, {
      replace: 'page' in updates ? false : true,
      // ✅ Changing page: add to history (Back should restore page 2)
      // ✅ Changing filters: replace history entry (Back should go to before any filters were applied, not step through each filter change)
    });
  };
  
  return (
    <div>
      {/* ✅ Search input: local state for the input value, URL for committed query */}
      <SearchInput
        value={filters.q}
        onChange={q => updateFilter({ q, page: 1 })}
        // Debounce the URL update to avoid URL changes on every keystroke
      />
      
      <CategoryFilter
        value={filters.category}
        onChange={category => updateFilter({ category, page: 1 })}
      />
      
      <SortSelector
        value={filters.sortBy}
        onChange={sortBy => updateFilter({ sortBy, page: 1 })}
      />
      
      {/* ✅ isFetching: background refresh for filter changes without blocking UI */}
      <div className={isFetching ? 'opacity-70' : ''}>
        {isLoading ? <ProductSkeleton /> : (
          <ProductGrid products={data?.items ?? []} />
        )}
      </div>
      
      <Pagination
        currentPage={filters.page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={page => updateFilter({ page })}
        // ✅ Page changes add to history (replace: false) — Back restores previous page
      />
      
      {/* ✅ Shareable link display — the current URL IS the shareable filter link */}
      <button onClick={() => navigator.clipboard.writeText(window.location.href)}>
        Copy Filter Link
      </button>
    </div>
  );
};
// ✅ User applies filters → URL updates → Back button restores previous filter
// ✅ User refreshes → URL still has filters → component reads URL → same view
// ✅ User shares URL → recipient gets identical filtered view
// ✅ Back/Forward navigation: TanStack Query cache hit → instant restore, no loading spinner


// ✅ RIGHT — Angular Router queryParams:

@Component({
  template: `
    <input [value]="(filters$ | async)?.q" (input)="onSearch($event)" />
    
    <app-product-grid [products]="(products$ | async) ?? []" />
    
    <app-pagination
      [currentPage]="(filters$ | async)?.page"
      (pageChange)="onPageChange($event)"
    />
  `
})
export class ProductCatalogComponent implements OnInit {
  // ✅ queryParamMap: Observable that emits whenever URL params change
  filters$ = this.route.queryParamMap.pipe(
    map(params => ({
      category: params.get('category') ?? 'all',
      sortBy: params.get('sort') ?? 'relevant',
      page: Number(params.get('page') ?? 1),
      q: params.get('q') ?? '',
    }))
  );
  
  products$ = this.filters$.pipe(
    // ✅ switchMap: cancel previous HTTP call when filters change
    switchMap(filters => this.productService.getProducts(filters))
  );
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {}
  
  onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q, page: 1 },
      queryParamsHandling: 'merge',  // ← Preserve existing params not being updated
    });
  }
  
  onPageChange(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
    // ✅ Page change adds to browser history — Back restores previous page
  }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When should state go in the URL vs in Redux?"

**Hruday's answer:**
> The test I use is: "Does changing this state feel like navigating to a different 'place' in the application?" If yes, it belongs in the URL.
>
> User applies a category filter — that's navigating to "the Electronics view." User goes to page 3 — that's navigating to "page 3 of results." User searches for "laptop" — that's navigating to "the laptop search results view." These feel like navigation events. The Back button should restore the previous navigation state. The URL is designed exactly for this.
>
> Contrast with: user opens a tooltip, user expands an accordion, user is mid-typing in a search box. These are transient interactions. They don't feel like navigation. The Back button restoring a tooltip state would be annoying, not helpful. These belong in local state.
>
> The practical split: pagination, sort order, active filters, search query, selected tab when the tab content is meaningfully different (a different data view, not a UI variation) — URL. Modal visibility, tooltip state, which accordion is expanded, form input values while typing, loading spinners — local state.
>
> A secondary test: "Would two different users with the same URL see the same content?" If yes, it's URL state. If it depends on who's logged in or what they've done in the session (personalized cart, partially completed form), it's local or server-side session state.

---

### Q2 — Technical Deep Dive
**Interviewer asks:** "How do you handle the `replace` vs `push` decision when updating URL state?"

**Hruday's answer:**
> The `replace` vs `push` decision controls whether the URL change adds a new browser history entry (push) or replaces the current one (replace). This directly affects Back button behavior.
>
> Push (new history entry) is right when the change represents a meaningful navigation event the user would want to undo with Back. Going from page 1 to page 2 deserves a Back-button entry — the user might want to go back to page 1. Navigating to a different category from the product list — same.
>
> Replace (no new history entry) is right when the change is a refinement of the current view, not a new navigation. Changing the sort order from "price asc" to "price desc" on the same category/page — the user probably doesn't want to press Back to undo just the sort order change; they'd want to go back to wherever they came from before the catalog. Filter changes that automatically reset the page (so the URL changes both filter AND page simultaneously) are replace events — otherwise you pile up history entries for each filter interaction.
>
> Search input changes are usually replace — updating the search query with `{ replace: true }` avoids filling history with every debounce-triggered URL update. The user should press Back to leave the search page entirely, not to step through each version of their refining query.
>
> In React Router: `setSearchParams(newParams, { replace: true/false })`. In Angular: `router.navigate([], { replaceUrl: true/false })`. The default for `setSearchParams` is push — so filter changes should explicitly pass `{ replace: true }` to avoid cluttering Back history.

---

### Q3 — SAP Experience
**Interviewer asks:** "Give me an example of URL state solving a real product problem."

**Hruday's answer:**
> At SAP, I built the product catalog page for SAP Commerce Cloud. The catalog had category navigation (hierarchical, multi-level), brand filters, price range sliders, star rating filters, availability filters, and pagination. That's about 8-10 distinct filter parameters.
>
> Initially the filter state was in a Redux slice. We got a reported bug from the product team: "When a customer shares a product catalog link from our B2B portal, the recipient sees the default catalog, not the filtered view." The customer was filtering for "industrial controllers under $500 with 4+ stars" for a procurement request, copying the URL, and pasting it in an email. The recipient saw 1500 products with no filters applied.
>
> The fix was migrating to URL query params. Every filter change called `setSearchParams` with the updated filters. The URL for that filtered view became `/catalog?category=industrial-controllers&price_max=500&rating_min=4`.
>
> Three things happened automatically with no extra code: (1) sharing the link gave the correct filtered view, (2) refreshing the catalog page restored the filters (useful when procurement managers worked on catalog selection across sessions), and (3) bookmark support worked — managers could bookmark their frequently-used filter combinations.
>
> The subsequent sprint, we added SSR server-side prefetching for the catalog. Because filters were in the URL, the Next.js server component could read them and pre-fetch the exact filtered product list before sending HTML to the browser — faster First Contentful Paint for the filtered catalog.

---

### Q4 — Architecture Design
**Interviewer asks:** "Design the state architecture for a searchable, filterable data table with pagination."

**Hruday's answer:**
> I'd use three distinct state layers, each with its own purpose.
>
> Layer 1 — URL for filter and navigation state. The URL holds: `?q=john&status=active&role=admin&sort=created_at&dir=desc&page=2`. These all represent "what view of the data is the user looking at?" Changes to any of these add a history entry (for page navigation) or replace (for filter changes). This is the source of truth for what data to display.
>
> Layer 2 — TanStack Query (or RTK Query) for the fetched data. The query key is derived from the URL params. When the URL changes — filter change, page change — the query key changes, triggering a new fetch. Previous filter combinations are cached, so navigating back to page 1 after going to page 2 is an instant cache hit. I'd set `staleTime: 30_000` for a typical server table — data older than 30 seconds gets a background refresh when the component re-mounts.
>
> Layer 3 — Local `useState` for UI state. The search input has a controlled local state for the actual `<input>` value (to avoid dispatching URL updates on every keystroke). I debounce the URL update — the input updates locally immediately, the URL updates after 300ms of no typing. This prevents URL churn and excess network requests while maintaining responsive typing feedback.
>
> What does NOT go in Redux: nothing from this table needs Redux. No filter state (URL), no data (TanStack Query), no UI state (local). If this table's data is also needed in a different part of the app (say, a count badge in the sidebar), that count badge uses its own `useQuery` call with the same cache key — it gets the cached data without a second request.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "All state should be in the URL for shareability" | "I put all state in URL so users can always share the page" | URL state is for navigation state — state that defines WHAT the user is viewing; it is not for sensitive data (JWT tokens, cart items, personal data), session state (half-completed multi-step forms), large payloads (hundreds of selected items), or transient UI state (modal open); putting sensitive data in the URL is a direct security vulnerability: it appears in server access logs, browser history, Referer headers when navigating away, and is visible to anyone looking at the address bar; security rule: URL = public, permanent, indexable — treat it as such |
| "useSearchParams replaces useLocation" | "I use useSearchParams for reading all URL data" | `useSearchParams` reads and writes query params (the `?key=value` part); `useParams` reads dynamic route segments (`/products/:id`); `useLocation` gives the full location object including pathname; for a product detail page `/products/laptop-pro-15`, the product ID comes from `useParams({ id })`, not `useSearchParams`; mixing these causes bugs where `searchParams.get('id')` returns null because the ID is in the path, not the query string |
| "queryParamsHandling: 'merge' is always correct" | "I always use queryParamsHandling: 'merge' in Angular" | `'merge'` preserves existing params and adds/updates new ones; `'preserve'` keeps ALL existing params unchanged (good for href links that should not disturb current params); `undefined` (default) replaces ALL query params with the new ones — useful when resetting ALL filters; choosing the wrong strategy causes: filter changes accidentally removing other active filters (wrong `undefined` default when you meant `'merge'`), or clearing all filters not working because `'merge'` is keeping the old values |
| "URL state and TanStack Query are redundant" | "If TanStack Query has a cache with keys, I don't need URL state too" | They serve completely different purposes and work best together; TanStack Query manages the DATA cache (prevents duplicate HTTP calls, handles stale/refresh logic); URL manages the NAVIGATION STATE (what view is the user on); the query key is derived FROM the URL params — URL is the master, TanStack Query is the data layer; without URL state, TanStack Query's cache is populated per-session but lost on refresh and not shareable; without TanStack Query, URL gives shareability but the data refetches on every URL back-navigation instead of being retrieved from cache |

---

## 7. Hruday's Real Experience Hook
> "The SAP Commerce Cloud catalog story is the clearest example I have of a state location decision creating a product-level improvement rather than just a technical improvement.
>
> The bug report — 'shared links show the default catalog' — was technically a state management architecture issue. The product team described it as a 'critical usability defect for B2B customers.' In a procurement context, sharing filtered catalogs is a core workflow. Buyers share 'approved vendor catalogs' with procurement leads. An incorrect link means the recipient sees 1500 products instead of the 12 pre-filtered ones. That translates to procurement friction and user trust issues.
>
> The migration to URL-based filter state took one sprint. The impact was immediate and measurable: the customer success team tracked a 40% reduction in procurement-support tickets about 'catalog links not working.' That single architectural correction resolved a class of user experience issues completely.
>
> The lesson I've carried: URL state isn't an optimization or a nice-to-have. For any page where users might want to share, bookmark, or return to a specific view, URL state is the correct default. The question isn't 'should I use URL state?' but 'is there a reason NOT to use URL state for this?'"

---

## 8. Scale Evolution

**Small app →** add URL state for any filterable or searchable page from day one; the implementation cost is one `useSearchParams` call instead of one `useState` call; the payoff (shareability, refresh persistence, Back button) is free from that point; there is no reason to start with local state for filter/pagination and migrate later.

**Medium app →** centralize URL param parsing in typed utility functions (one `parseFilters(searchParams)` function per page type); validate and sanitize all URL params on read (users can edit URLs); split filter changes into `push` (pagination) vs `replace` (sorting, filtering) history entries deliberately; combine with TanStack Query for the full pattern (URL → queryKey → cached data).

**Large app (SAP scale) →** URL-based filter state enables SSR prefetching (server reads URL params, pre-fetches the correct filtered data list before HTML is sent); consider URL compression for complex filter states (lz-string encoding for large filter objects that exceed URL length limits); track URL param usage via analytics to understand which filters users apply most — this data is available free because filter state IS the URL.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction history page: filters (date range, status, transaction type), pagination, and search belong in URL; share transaction history filtered view with ops team; merchant dashboard filters shareable between merchant and support team; history navigation through date range changes | replace vs push for filter updates; queryParamsHandling in Angular; TanStack Query + URL integration |
| Swiggy / Meesho | Product catalog search + filter page (main user flow); searchable order history; restaurant list filtering; `?q=pizza&category=italian&sort=rating&page=2`; shareable promotions page for seller analytics filter; URL state enables SSR for filterable listing pages (faster LCP) | URL state for product listing; SSR benefit via URL params; useSearchParams with TanStack Query |
| Adobe / Microsoft | Asset library filters in Creative Cloud (file type, date created, tags, starred); shareable filtered asset views for team collaboration; Microsoft SharePoint document filtering — URL-driven filters for sharing document queries with teams; deep-link to specific notebook section in OneNote | complex multi-filter URL encoding; deep-linking for collaboration workflows; filter state for large file/asset catalogs |
| SAP Labs | Direct experience: B2B catalog shared filter links (the story above); SAP Commerce Cloud procurement workflow; URL-based filter state reducing procurement support tickets by 40%; SSR prefetch enabled by URL params for catalog pages; Angular Router implementation with queryParamsHandling | production story with measurable business impact; Angular queryParams implementation; URL state + SSR combination |

---

## 10. Related Topics — What to Study Next

- **Topic 230 — Avoiding Over-Global State** — URL state is one of the primary alternatives to Redux for filter/pagination/search state; the decision framework in topic 230 has "is this URL-appropriate state?" as the third question before considering Redux; reading both 230 and 231 together gives the complete "what goes where" picture for state classification
- **Topic 227 — TanStack Query** — URL state and TanStack Query are the canonical pairing for filterable data pages; the URL holds the filter params, the query key is derived from those params, TanStack Query fetches and caches the data for each filter combination; back-navigation restores the cache hit for the previous filter combination, eliminating loading spinners on Back navigation
- **Topic 232 — State Machines** — multi-step forms and checkout flows sometimes need state that IS URL-representable (current step number, completion status); state machines define valid transitions between steps; combining state machines with URL state gives shareable multi-step flow progress (user can resume a partially-completed flow from a direct URL)
- **Topic 233 — Cache-Based State Management** — URL as state complements cache-based approaches: the URL defines the cache key, the cache stores the data for that key; when URL changes, the cache key changes and the appropriate cached data is returned; understanding the URL-to-cache-key relationship is central to designing high-performance filterable data pages with instant navigation

---

*Part 13 · URL as State — When Filters, Search, and Pagination Belong in the URL · Full Stack Interview Guide · Hruday D · 2026*
