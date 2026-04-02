# Autocomplete Search — Debounce, Caching, Ranking
> Part 19 — System Design Case Studies · 🔥 High Frequency (Frontend)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Debounce**: don't send a request on every keystroke; wait N milliseconds after the last keypress; user types "smartp" in 300ms — one request, not 7; typical debounce delay: 150-300ms; keeps the server request rate proportional to user pauses, not typing speed
- **Throttle vs debounce**: throttle = at most one request per period regardless of input (first keystroke triggers, rest ignored until period ends); debounce = wait for N ms of silence (fires after typing stops); debounce is correct for search autocomplete — you want completion after the user pauses, not after each character
- **Abort stale requests**: if user types fast, multiple requests are in-flight simultaneously; response for "smarp" might arrive after response for "smartphone"; use `AbortController` to cancel the previous request before issuing a new one; prevents out-of-order results
- **Request deduplication**: client-side cache — if the user types "smartp", deletes "p", retypes "p" — the second "smartp" query is a cache hit; use a `Map<query, result>` with TTL (~30s); no round trip needed
- **Keyboard navigation**: up/down arrow keys move highlight through suggestions; Enter selects; Escape closes; Tab moves focus out; `aria-activedescendant` for screen reader support; don't rebuild active index from DOM — maintain it as state
- **Backend**: Elasticsearch `completion` suggester or a `prefix query` on a `search_as_you_type` field; sub-5ms response; Redis prefix cache for the most common prefixes (10-character prefix space is finite and cacheable)
- **Ranking**: recent searches appear first (personalised, from localStorage or server); then trending searches; then prefix-matched suggestions; promoted/sponsored at top with label
- **Minimum chars before search**: typically 2-3 characters; 1 character queries return too many results and are expensive; client gates the request at `query.length >= 2`

---

## 1. One-Line Definition
An autocomplete search shows real-time suggestions as the user types by debouncing keystrokes, cancelling stale in-flight requests, maintaining a client-side cache, and querying a backend Elasticsearch completion index or Redis prefix store optimised for sub-10ms prefix lookups.

---

## 2. The Problem It Solves

A developer wires up a search input: every `onChange` fires a fetch request to `/api/search?q={value}`. The user types "Samsung Galaxy S24 Ultra" — that's 23 characters, 23 network requests. On a slow network, responses arrive out of order. The user sees results for "S" first, then "Sam", then "Samsung G" — flickering, confusing, and wasteful. The API server also gets 23x the traffic it needs.

If 10,000 users simultaneously type in the search box, that's potentially 230,000 requests/second to the search backend — all for characters in the middle of typing.

Debounce + abort + cache reduces this to approximately 1 well-formed request per user typing session, with stale results never displayed.

---

## 3. How It Works Internally

### Frontend Flow

```
User types: "s" → "sm" → "sma" → "smar" → "smart" → "smartp" → "smartph"
                                                ↑ 300ms pause here
                                                
Keystroke events:
  "s"       → start debounce timer (300ms)
  "sm"      → reset timer (300ms)
  "sma"     → reset timer
  "smar"    → reset timer
  "smart"   → reset timer
  "smartp"  → reset timer
  "smartph" → timer fires after 300ms → CHECK CACHE
                                         ↓ cache miss
                                         CANCEL previous request (if any)
                                         SEND request to /api/autocomplete?q=smartph

Response: ["smartphone", "smartphone case", "smartphone stand", ...]
           → STORE in cache: { "smartph": [...results], expiresAt: now + 30s }
           → RENDER suggestions

User types one more key: "smartphone"
  → timer fires → CHECK CACHE
  → cache miss for "smartphone" → send request
  → while in-flight: user presses backspace
  → "smartphon" → timer fires → cache miss → ABORT "smartphone" request → send "smartphon" request
```

### Backend Autocomplete Design

```
Option A: Elasticsearch completion suggester
  - Index: products (or searches)
  - Field: "name_suggest": { "type": "completion" }
  - Index time: build a Trie from all product names
  - Query: GET /products/_search with "suggest" query
  - Latency: < 5ms (Trie lookup, not full-text inverted index scan)
  - Limitation: no relevance tuning; purely prefix-based

Option B: Redis prefix cache for popular queries
  - Precompute top 100 completions for every prefix up to 10 chars
  - key: "autocomplete:smartph" → ["smartphone", "smartphone case", ...]
  - Generated offline by batch job from search query logs
  - Covers ~95% of real-world queries (most popular queries are short)
  - Misses: fall through to Elasticsearch

Option C: search_as_you_type field (Elasticsearch)
  - Special multi-field type that creates prefix, infix, and phrase indexes
  - More flexible: handles "galaxy phone" matching "Samsung Galaxy phone"
  - Slightly slower than completion suggester
  - Best for product search where middle-word matching matters
```

---

## 4. The Code

### Wrong Way — Request on Every Keystroke, No Abort

```typescript
// ❌ A request fires on every single key press with no deduplication

function SearchBox() {
    const [query, setQuery]       = useState('');
    const [results, setResults]   = useState<string[]>([]);
    
    const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        
        // ❌ No debounce: 23 network requests for 23 characters
        // ❌ No abort: responses arrive out of order, last character shows first results
        // ❌ No cache: "smartph" fetched again if user types it a second time
        const response = await fetch(`/api/autocomplete?q=${value}`);
        const data = await response.json();
        setResults(data);  // ❌ Out-of-order: "S" result might arrive last
    };
    
    return <input value={query} onChange={onChange} />;
}
```

```typescript
// ✅ Debounced, abortable, cached autocomplete

import { useState, useEffect, useRef, useCallback } from 'react';

// ✅ Simple LRU-like cache with TTL
class AutocompleteCache {
    private cache = new Map<string, { results: SuggestionItem[]; expiresAt: number }>();
    private maxSize: number;
    
    constructor(maxSize = 100) { this.maxSize = maxSize; }
    
    get(key: string): SuggestionItem[] | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.results;
    }
    
    set(key: string, results: SuggestionItem[], ttlMs = 30_000) {
        // ✅ Evict oldest entry if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, { results, expiresAt: Date.now() + ttlMs });
    }
}

const suggestionCache = new AutocompleteCache(100);

interface SuggestionItem {
    text: string;
    type: 'product' | 'query' | 'category' | 'recent';
}

function useAutocomplete(minChars = 2, debounceMs = 300) {
    const [query, setQuery]           = useState('');
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading]         = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const abortControllerRef            = useRef<AbortController | null>(null);
    const inputRef                      = useRef<HTMLInputElement>(null);
    
    // ✅ Debounced fetch effect
    useEffect(() => {
        if (query.length < minChars) {
            // ✅ Show recent searches for short or empty queries
            setSuggestions(getRecentSearches());
            setActiveIndex(-1);
            return;
        }
        
        const cacheKey = query.toLowerCase().trim();
        
        // ✅ Cache hit: show immediately without network round-trip
        const cached = suggestionCache.get(cacheKey);
        if (cached) {
            setSuggestions(cached);
            return;
        }
        
        // ✅ Debounce: wait before sending request
        const timer = setTimeout(async () => {
            // ✅ Abort any previous in-flight request
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            
            setLoading(true);
            
            try {
                const response = await fetch(
                    `/api/autocomplete?q=${encodeURIComponent(cacheKey)}&limit=8`,
                    { signal: abortControllerRef.current.signal }
                );
                
                const data: SuggestionItem[] = await response.json();
                
                // ✅ Store in cache for this prefix
                suggestionCache.set(cacheKey, data, 30_000);  // 30s TTL
                setSuggestions(data);
                setActiveIndex(-1);
            } catch (err) {
                if ((err as Error).name === 'AbortError') return;   // ✅ Expected: ignore aborts
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, debounceMs);
        
        return () => clearTimeout(timer);  // ✅ Cleanup clears the debounce timer
        
    }, [query, minChars, debounceMs]);
    
    // ✅ Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => Math.max(prev - 1, -1));
                break;
            case 'Enter':
                if (activeIndex >= 0) {
                    e.preventDefault();
                    selectSuggestion(suggestions[activeIndex]);
                }
                break;
            case 'Escape':
                setSuggestions([]);
                setActiveIndex(-1);
                inputRef.current?.blur();
                break;
        }
    }, [suggestions, activeIndex]);
    
    const selectSuggestion = useCallback((item: SuggestionItem) => {
        setQuery(item.text);
        setSuggestions([]);
        setActiveIndex(-1);
        // ✅ Persist to recent searches in localStorage
        saveRecentSearch(item.text);
    }, []);
    
    return { query, setQuery, suggestions, loading, activeIndex, handleKeyDown, selectSuggestion, inputRef };
}

// ✅ Accessible autocomplete component
function SearchAutocomplete() {
    const {
        query, setQuery, suggestions, loading,
        activeIndex, handleKeyDown, selectSuggestion, inputRef
    } = useAutocomplete(2, 300);
    
    const [isOpen, setIsOpen] = useState(false);
    const listId = 'autocomplete-list';
    
    return (
        <div role="combobox" aria-expanded={isOpen && suggestions.length > 0}
             aria-haspopup="listbox" aria-owns={listId}>
            
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}  // delay: allow click on suggestion
                aria-autocomplete="list"
                aria-controls={listId}
                // ✅ Point screen reader to the currently highlighted suggestion
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                placeholder="Search products..."
            />
            
            {loading && <span aria-live="polite" className="sr-only">Loading suggestions…</span>}
            
            {isOpen && suggestions.length > 0 && (
                <ul id={listId} role="listbox">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.text}
                            id={`suggestion-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            className={`suggestion-item ${index === activeIndex ? 'active' : ''} type-${suggestion.type}`}
                            onMouseDown={e => {
                                e.preventDefault();  // ✅ Prevent input blur before click fires
                                selectSuggestion(suggestion);
                            }}
                        >
                            {suggestion.type === 'recent' && <span className="icon-recent" aria-hidden="true">🕑</span>}
                            {suggestion.text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ✅ Recent searches: stored in localStorage, personalised without server state
function getRecentSearches(): SuggestionItem[] {
    try {
        const stored = JSON.parse(localStorage.getItem('recent_searches') ?? '[]');
        return stored.slice(0, 5).map((text: string) => ({ text, type: 'recent' as const }));
    } catch { return []; }
}

function saveRecentSearch(text: string) {
    try {
        const existing: string[] = JSON.parse(localStorage.getItem('recent_searches') ?? '[]');
        const updated = [text, ...existing.filter(s => s !== text)].slice(0, 10);
        localStorage.setItem('recent_searches', JSON.stringify(updated));
    } catch {}
}
```

### Backend: Autocomplete Endpoint

```java
// ✅ Spring Boot autocomplete controller — low latency, cached

@RestController
@RequestMapping("/api/autocomplete")
public class AutocompleteController {
    private final AutocompleteService autocompleteService;
    
    @GetMapping
    public ResponseEntity<List<SuggestionDto>> suggest(
            @RequestParam String q,
            @RequestParam(defaultValue = "8") int limit,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        
        if (q == null || q.trim().length() < 2 || q.length() > 100) {
            return ResponseEntity.ok(List.of());
        }
        
        // ✅ Sanitize input — prevent injection in ES query
        String sanitized = q.trim().toLowerCase().replaceAll("[^a-z0-9\\s\\-]", "");
        
        List<SuggestionDto> suggestions = autocompleteService.suggest(sanitized, userId, limit);
        
        // ✅ Cache-Control: short cache in browser and CDN
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)))
            .body(suggestions);
    }
}

@Service
public class AutocompleteService {
    private final ElasticsearchClient esClient;
    private final StringRedisTemplate redis;
    private final UserSearchHistoryService historyService;
    
    public List<SuggestionDto> suggest(String query, String userId, int limit) {
        List<SuggestionDto> results = new ArrayList<>();
        
        // ✅ Layer 1: personalised recent searches (from user's history)
        if (userId != null) {
            List<String> recent = historyService.getRecent(userId, query, 3);
            recent.stream()
                .map(s -> new SuggestionDto(s, SuggestionType.RECENT))
                .forEach(results::add);
        }
        
        // ✅ Layer 2: Redis prefix cache for popular queries
        String redisKey = "ac:" + query;
        List<String> cached = redis.opsForList().range(redisKey, 0, limit - 1);
        if (cached != null && !cached.isEmpty()) {
            cached.stream()
                .filter(s -> results.stream().noneMatch(r -> r.getText().equals(s)))
                .map(s -> new SuggestionDto(s, SuggestionType.POPULAR))
                .forEach(results::add);
            return results.stream().limit(limit).collect(toList());
        }
        
        // ✅ Layer 3: Elasticsearch completion suggester (cache miss)
        try {
            var response = esClient.search(s -> s
                .index("product_suggestions")
                .suggest(sg -> sg
                    .suggesters("product_completion", gg -> gg
                        .prefix(query)
                        .completion(c -> c
                            .field("name_suggest")
                            .size(limit)
                            .skipDuplicates(true)
                        )
                    )
                )
                .size(0),
                ProductSuggestionDocument.class
            );
            
            response.suggest().get("product_completion").stream()
                .flatMap(entry -> entry.completion().options().stream())
                .map(option -> new SuggestionDto(option.text(), SuggestionType.PRODUCT))
                .filter(s -> results.stream().noneMatch(r -> r.getText().equals(s.getText())))
                .forEach(results::add);
                
        } catch (IOException e) {
            log.warn("Elasticsearch autocomplete failed for query: {}", query, e);
        }
        
        return results.stream().limit(limit).collect(toList());
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between debounce and throttle and which do you use for autocomplete?"

**Hruday's answer:**
> Throttle ensures at most one invocation per time period — it fires at the start of the period and ignores all subsequent events until the period resets. Useful for scroll handlers, resize observers — you want continuous updates but not every pixel.
>
> Debounce fires after a period of inactivity — it waits N milliseconds after the last event before executing. Useful for search — you want to fire after the user stops typing, not on each character.
>
> For autocomplete, debounce is correct. The goal is to fire one request after the user pauses. Throttle would fire on the first character and ignore the rest until the throttle period resets — so if the user types quickly, they'd get results for partial prefixes mid-word. Debounce fires after they pause, which is when the query is most meaningful.
>
> Typical debounce delay: 150-300ms. Below 150ms the debounce is imperceptible — the request fires for most keystrokes. Above 400ms users perceive the delay as "slow to respond." 200-250ms is usually right for a product search.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you prevent out-of-order responses from showing stale results?"

**Hruday's answer:**
> With `AbortController`. Before sending each new request, I call `abortController.abort()` on the previous controller. This cancels the in-flight request at the fetch level — the browser sends a cancel signal, the connection is terminated. When the `fetch` promise rejects with an `AbortError`, I check for it and ignore it.
>
> Without this, the problem is: user types "phone", gets good results. User quickly types "ph" (backspace), "phi", "philip". Four requests in flight. The "phone" request (first sent) might return last due to network jitter — and overwrites the "philip" results with completely wrong data. The UI flickers.
>
> AbortController guarantees there's exactly one in-flight request at any time — the most recent one. Any previous in-flight request is definitively cancelled. Combined with debounce, there's effectively 0-1 request in flight during typing.
>
> Important: AbortController's abort only cancels the client-side connection; the server may still process the request. For simple autocomplete this is fine. For expensive operations, server-side cancellation checking (`request.isAborted()`) can prevent wasted compute.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "How would you design the backend to serve autocomplete queries at 50,000 requests per second?"

**Hruday's answer:**
> 50,000 RPS for autocomplete is achievable with a tiered caching approach — the key insight is that autocomplete queries are highly repetitive. Millions of users typing "iphon" all send the same query. Cache aggressively.
>
> Tier 1: Nginx/API Gateway response cache. For autocomplete, responses vary only by query string. Cache the full HTTP response at the gateway level with 30-second TTL. A CDN (Cloudflare, CloudFront) can cache autocomplete responses at edge nodes — a user in Hyderabad gets "iphon" suggestions from the nearest CDN edge, not from your origin server. Edge cache hit rate for autocomplete is typically 85-95% for popular prefixes.
>
> Tier 2: Redis prefix cache in the application. For the 5-15% of requests that miss the CDN (new prefixes, infrequent queries), Redis lookup takes < 2ms. Pre-populate Redis with the top 100K most popular query prefixes from search logs (batch job runs every 15 minutes). Cover all 1-10 character prefixes of the top 10K searches.
>
> Tier 3: Elasticsearch for the long tail. Cache miss falls through to ES completion suggester — fast (< 10ms) but not as fast as Redis. At 50K RPS with 90% CDN hit rate and 8% Redis hit rate, ES only handles ~1,000 RPS — well within a 3-node ES cluster's capability.
>
> Capacity estimate: Redis does 100K+ ops/second on a single node. Elasticsearch handles 10K-50K completion queries/second at full cluster. CDN is practically unlimited for GET requests.

---

### Q4 — System Design Angle
**Interviewer asks:** "How do you personalise autocomplete without making the UX feel intrusive?"

**Hruday's answer:**
> Personalised autocomplete surfaces things the user has searched before or is likely searching for based on behaviour, ranked above generic results.
>
> Recent searches: most accepted and expected. User types "p" — see "payment methods" from yesterday's session. Stored locally in localStorage for instant access. No server round-trip, no privacy concern, user can clear them.
>
> Category personalisation: if the user consistently buys electronics, show "phone charger" above "phone case" when they type "phone". This is computed server-side based on purchase history. The personalised ranking shifts the BM25 score — same candidates, different order. I'd implement this as a query-time boost applied to ES queries: products in categories the user frequently browses get a 1.5x score multiplier.
>
> What to avoid: don't show suggestions that feel "creepy" — if someone searched for "divorce lawyer" last month, that shouldn't appear when they type "d". Limit personalisation to product-domain queries (categories, brands, product types), not sensitive searches. Avoid surfacing health or financial queries in autocomplete completions regardless of history.
>
> Implementation: client sends userId (if logged in) with autocomplete request; server fetches user's affinity vector (category → weight map, updated daily by a batch job); use affinity weights as function score in ES query. Anonymous users: no personalisation, generic trending results only.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| No keyboard navigation | "I'll show a dropdown of suggestions that the user can click" | Keyboard navigation is non-negotiable for accessibility and power users; up/down arrows to move through suggestions, Enter to select, Escape to close — this is the ARIA pattern for combobox; missing keyboard nav fails WCAG 2.1 AA (keyboard accessibility) and also makes the component feel unfinished in a FAANG-style interview; also mention `aria-activedescendant` so screen readers announce the focused suggestion |
| Forgetting to handle empty state | "If there are no results I'll just show nothing" | Empty state needs design: if query >= 2 chars and no results, show "No results for '{query}'" to confirm the search worked; if query < 2 chars, show recent searches; if loading, show spinner or skeleton; if network error, show "Search unavailable — try browsing categories"; each state is distinct and the component should render appropriately |
| No minimum character gating | "I'll send a request for every non-empty query including single characters" | A single character query returns thousands of results and means almost nothing; single-char ES queries are expensive (huge result sets); user typing 'a' gets suggestions for every product starting with 'a'; gate at minimum 2-3 characters; for languages with shorter average word length (Japanese, Chinese), 1 character may be meaningful — but for English, 2 is the standard floor |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built an autocomplete for a knowledge base search — users typed SAP transaction codes (like 'SE38' or 'MM60') and product names. The first implementation hit our PostgreSQL full-text index on every keystroke with a LIKE query. During a peak training session with 300 users simultaneously searching, the database CPU hit 95% and response time degraded to 3 seconds — the autocomplete was useless.
>
> We added three fixes: debounce at 250ms (reduced request rate by 70%), an in-memory LRU cache of 500 entries on the backend (hit rate ~80% for popular SAP codes, which are finite and repetitive), and moved from PostgreSQL LIKE to Elasticsearch completion suggester. Average autocomplete latency went from 3000ms to 25ms. The database CPU dropped back to 10% during training sessions."

---

## 8. Scale Evolution

**1,000 users →** Simple debounced fetch. No caching needed. Elasticsearch prefix query or PostgreSQL tsvector + LIKE for small datasets (< 100K records). Recent searches in localStorage.

**100,000 users →** Add client-side cache (Map with TTL). Elasticsearch `completion` suggester with dedicated suggest index. Redis prefix cache for top-1000 queries. AbortController for request cleanup.

**10 million daily active users →** CDN caching for GET autocomplete requests (30s TTL at edge). Redis Cluster for prefix precomputation. Personalised autocomplete using user affinity vectors. A/B test ranking algorithms against click-through rate on suggestions. Separate autocomplete cluster from main search cluster.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard search (find transaction by customer name / amount) — autocomplete on transaction search; payment method autocomplete (card type, UPI ID prefix) | Debounce + cache; security (no full card numbers in autocomplete) |
| Swiggy / Meesho | Restaurant name autocomplete on Swiggy; product name search on Meesho (100M+ SKUs); location search with geo-autocomplete | Multi-language suggestions; geo data; high-frequency product search |
| Adobe / Microsoft | Bing autocomplete (trillions of queries/day); Office 365 "tell me" search bar; Azure portal resource search | Extreme scale; personalised rank; trending vs recent balance |
| SAP Labs | Transaction code autocomplete — the real story above; SAP product documentation search suggest; 300 concurrent users training session incident | Real incident; LIKE → ES completion migration |

---

## 10. Related Topics — What to Study Next

- **Topic 309 — Search System (Elasticsearch)** — the autocomplete backend uses Elasticsearch's `completion` suggester or `search_as_you_type` field type; the search system topic covers the full index design; these two together are the full search experience
- **Topic 313 — Infinite Scroll Feed** — after the user selects a search suggestion and presses Enter, the results page uses infinite scroll; the cursor pagination and virtualisation patterns from topic 313 apply directly
- **Topic 315 — Micro-frontend Shell** — in a micro-frontend architecture, the search/autocomplete component is a shared widget; the shell's shared state management includes the global search state; how autocomplete state persists across route changes is a shell concern
- **Topic 101 — Redis Data Structures** — Redis List (`LRANGE`) for prefix suggestion arrays; Redis Sorted Set for trending queries (ZINCRBY on each search, ZREVRANGE for top N); both are used in the autocomplete backend

---

*Part 19 · Autocomplete Search — Debounce, Caching, Ranking · Full Stack Interview Guide · Hruday D · 2026*
