# 232 – Autocomplete Search

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Autocomplete Search is an input component that suggests matching results as the user types, combining **debounced input handling**, **async API calls**, **keyboard navigation**, **caching**, and **accessibility (ARIA combobox pattern)**. It's one of the most frequently asked frontend system design questions because it tests performance thinking (debouncing, request cancellation), UX judgment (when to show/hide suggestions, highlighting matches), and accessibility awareness (combobox role, aria-activedescendant). The architecture must handle network latency, race conditions between requests, and gracefully degrade when the API is slow.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌───────────────────────────────────────┐
│         AutocompleteSearch            │
│  ┌─────────────────────────────────┐  │
│  │   SearchInput                    │  │  ← role="combobox"
│  │   [🔍 Search products...     ]  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │   SuggestionList                 │  │  ← role="listbox"
│  │   ┌─────────────────────────┐   │  │
│  │   │ Product A (highlighted) │   │  │  ← role="option"
│  │   │ Product AB              │   │  │
│  │   │ Product ABC             │   │  │
│  │   └─────────────────────────┘   │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### Critical Design Decisions

**1. Debounce Timing:**
- 200-300ms is the sweet spot — fast enough to feel responsive, slow enough to avoid unnecessary requests
- Don't debounce on selection (Enter/click should be instant)

**2. Race Condition Prevention:**
- User types "rea" → API request 1
- User types "react" → API request 2
- Request 1 returns AFTER request 2 → stale results override fresh ones
- **Solution**: AbortController — cancel previous request when new one starts

**3. Caching Strategy:**
- Cache results by query string in a Map (LRU cache with 50-100 entries)
- If user types "react" then backspaces to "rea", serve from cache instantly
- TTL: 60 seconds for most use cases

**4. Minimum Characters:**
- Don't query for 0 or 1 characters — too broad, too expensive
- Start suggesting at 2-3 characters typically

### Accessibility (ARIA Combobox Pattern)

```html
<div role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="suggestion-list">
  <input type="text" 
         aria-autocomplete="list"
         aria-activedescendant="option-2"  <!-- currently highlighted option -->
         aria-controls="suggestion-list" />
</div>
<ul id="suggestion-list" role="listbox" aria-label="Suggestions">
  <li id="option-1" role="option" aria-selected="false">Product A</li>
  <li id="option-2" role="option" aria-selected="true">Product AB</li>
</ul>
```

**Keyboard Navigation:**
- ↓ Arrow: Move to next suggestion
- ↑ Arrow: Move to previous suggestion
- Enter: Select highlighted suggestion
- Escape: Close dropdown, clear selection
- Tab: Close dropdown, keep input value

### Performance Implications

- **Debounce**: Reduces API calls by 60-80% compared to firing on every keystroke
- **AbortController**: Prevents wasted bandwidth and stale data from out-of-order responses
- **Virtualization**: If showing 100+ suggestions, virtualize the list (react-window)
- **Highlight matching text**: Use `mark` element or CSS, NOT `dangerouslySetInnerHTML`

### Anti-Patterns

- ❌ No debounce — fires a request on every keystroke (performance disaster)
- ❌ No AbortController — race conditions cause flickering results
- ❌ `dangerouslySetInnerHTML` for highlighting — XSS vulnerability
- ❌ Custom dropdown without ARIA combobox pattern — invisible to screen readers
- ❌ Mouse-only interaction — no keyboard navigation support
- ❌ No loading state — user types and sees nothing for 500ms

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Google Search Autocomplete
Google's autocomplete uses a sophisticated prediction system. Frontend-wise: 50ms debounce (extremely fast), results cached aggressively, keyboard navigation, inline completion (gray text suggesting the rest of the query). They use a separate lightweight API endpoint optimized for autocomplete latency (< 100ms).

### Hruday @ SAP Labs
At SAP, our Fiori apps used `sap.m.SearchField` with suggestion bindings to OData endpoints. The OData `$filter` with `substringof` or `startswith` handled server-side filtering. We added client-side caching to avoid redundant OData calls when users backspaced.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"I'd decompose this into SearchInput (combobox) and SuggestionList (listbox). The input has `role='combobox'` with `aria-autocomplete='list'` and `aria-activedescendant` pointing to the currently highlighted option.*

*For the data flow: on each keystroke, I debounce at 250ms, then fire a fetch request. Before each new request, I call `abort()` on the previous AbortController to prevent race conditions. I cache results in a Map keyed by query string with a 60-second TTL — so backspacing serves instant results.*

*Keyboard navigation: Arrow keys move `aria-activedescendant`, Enter selects, Escape closes. I highlight matching text by splitting the suggestion string around the query using a regex and wrapping the match in a `<mark>` element — never innerHTML for security.*

*Performance: I start querying at 2+ characters, debounce at 250ms, and abort stale requests. If the suggestion list can have 100+ items, I virtualize it with react-window."*

### Likely Follow-up Questions

1. **"How do you handle the race condition?"** — AbortController. Each new request aborts the previous one. Only the latest response is rendered.
2. **"What if the API is slow (500ms+)?"** — Show a spinner in the dropdown after 200ms. Use stale-while-revalidate: show cached results immediately, update when fresh data arrives.
3. **"How do you highlight matching text safely?"** — Split the string around the query match, render as `[text, <mark>match</mark>, text]`. Never use innerHTML.
4. **"Why not just filter on the client?"** — Works for small datasets (< 1000 items). For large datasets, server-side filtering is essential for performance.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
function useAutocomplete(fetchSuggestions: (query: string) => Promise<string[]>) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, { data: string[]; timestamp: number }>());

  const debouncedFetch = useMemo(
    () => debounce(async (q: string) => {
      if (q.length < 2) { setSuggestions([]); return; }

      // Check cache (TTL: 60s)
      const cached = cacheRef.current.get(q);
      if (cached && Date.now() - cached.timestamp < 60000) {
        setSuggestions(cached.data);
        setIsOpen(true);
        return;
      }

      // Abort previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const results = await fetchSuggestions(q);
        cacheRef.current.set(q, { data: results, timestamp: Date.now() });
        setSuggestions(results);
        setIsOpen(true);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
      }
    }, 250),
    [fetchSuggestions]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    if (e.key === 'ArrowUp') setActiveIndex(i => Math.max(i - 1, -1));
    if (e.key === 'Enter' && activeIndex >= 0) selectSuggestion(suggestions[activeIndex]);
    if (e.key === 'Escape') setIsOpen(false);
  };

  return { query, setQuery, suggestions, activeIndex, isOpen, handleKeyDown, debouncedFetch };
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Autocomplete = Debounce + Abort + Cache + ARIA Combobox."** Four pillars: (1) Debounce 250ms to reduce API calls, (2) AbortController to prevent race conditions, (3) Map cache with TTL for instant backspace results, (4) ARIA combobox pattern with `aria-activedescendant` for keyboard navigation. Start at 2+ characters. Highlight matches with `<mark>`, never innerHTML. If you go blank: "I'd use a combobox pattern with debounced fetch and AbortController."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Autocomplete is the #1 most-asked UI component in frontend interviews. It tests debouncing, race conditions, caching, accessibility, and keyboard navigation — all critical senior-level skills.

**How it works:**
→ Input triggers debounced API calls (250ms). Each new request aborts the previous via AbortController. Results are cached by query string. The dropdown uses ARIA combobox pattern with listbox/option roles and keyboard navigation via aria-activedescendant.

**Company relevance:**
→ **Microsoft**: Bing search, Teams search — expect deep focus on performance and accessibility
→ **Adobe**: Creative Cloud asset search — large datasets, filtering
→ **Salesforce**: Global search is central to CRM — federated search across objects
→ **Cisco**: Network device search in dashboards — type-ahead filtering
