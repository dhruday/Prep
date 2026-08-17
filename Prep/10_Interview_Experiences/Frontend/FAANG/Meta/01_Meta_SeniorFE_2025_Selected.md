# Meta — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta Information
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Frontend Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Frontend Coding + 1 Frontend System Design + 1 Behavioral)
- **Timeline:** 2.5 weeks
- **Format:** Virtual via CoderPad
- **Note:** Meta Frontend is React-heavy. They use React internally and expect deep React knowledge.

---

## Round 1: Frontend Coding I
**Duration:** 40 minutes | **Interviewer:** E4 SDE

### Questions Asked
1. **Build an Autocomplete/Typeahead Search Component**
   - Fetch suggestions from API, debounce, keyboard navigation, highlight matching text

### 💡 Interview-Ready Answer

```jsx
function Autocomplete({ fetchSuggestions, onSelect, debounceMs = 300, placeholder }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    // Debounced fetch
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        
        const timer = setTimeout(async () => {
            // Cancel previous request
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            
            setLoading(true);
            try {
                const results = await fetchSuggestions(query, {
                    signal: abortControllerRef.current.signal
                });
                setSuggestions(results);
                setIsOpen(results.length > 0);
                setActiveIndex(-1);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setSuggestions([]);
                }
            } finally {
                setLoading(false);
            }
        }, debounceMs);
        
        return () => clearTimeout(timer);
    }, [query, fetchSuggestions, debounceMs]);
    
    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
                break;
            case 'Enter':
                if (activeIndex >= 0) {
                    e.preventDefault();
                    selectItem(suggestions[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                inputRef.current?.focus();
                break;
        }
    };
    
    const selectItem = (item) => {
        setQuery(item.label);
        setIsOpen(false);
        onSelect(item);
    };
    
    // Highlight matching text
    const highlightMatch = (text, query) => {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => 
            regex.test(part) ? <mark key={i}>{part}</mark> : part
        );
    };
    
    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!listRef.current?.contains(e.target) && 
                !inputRef.current?.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeEl = listRef.current.children[activeIndex];
            activeEl?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);
    
    return (
        <div className="autocomplete" role="combobox" aria-expanded={isOpen}>
            <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                placeholder={placeholder}
                role="searchbox"
                aria-autocomplete="list"
                aria-controls="suggestions-list"
                aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            />
            {loading && <span className="spinner" aria-label="Loading" />}
            
            {isOpen && (
                <ul
                    ref={listRef}
                    id="suggestions-list"
                    role="listbox"
                    className="suggestions-dropdown"
                >
                    {suggestions.map((item, index) => (
                        <li
                            key={item.id}
                            id={`suggestion-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            className={index === activeIndex ? 'active' : ''}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            {highlightMatch(item.label, query)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

**What interviewers evaluate:**
1. **Debouncing** — don't fire API on every keystroke
2. **Race condition handling** — AbortController to cancel stale requests
3. **Keyboard navigation** — ArrowUp/Down/Enter/Escape
4. **Accessibility** — combobox role, aria-activedescendant, listbox
5. **Highlight matching** — visual feedback on matched text
6. **Click outside** detection to close dropdown
7. **Scroll into view** for long lists

---

## Round 2: Frontend Coding II
**Duration:** 40 minutes | **Interviewer:** E5 SDE

### Questions Asked
1. **Implement a deep clone function** (handle all JS types)
2. **Follow-up: Handle circular references**

### 💡 Interview-Ready Answer

```javascript
function deepClone(obj, seen = new WeakMap()) {
    // Primitives and null
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Already seen → circular reference
    if (seen.has(obj)) return seen.get(obj);
    
    // Date
    if (obj instanceof Date) return new Date(obj.getTime());
    
    // RegExp
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
    
    // Map
    if (obj instanceof Map) {
        const clone = new Map();
        seen.set(obj, clone);
        obj.forEach((value, key) => {
            clone.set(deepClone(key, seen), deepClone(value, seen));
        });
        return clone;
    }
    
    // Set
    if (obj instanceof Set) {
        const clone = new Set();
        seen.set(obj, clone);
        obj.forEach(value => {
            clone.add(deepClone(value, seen));
        });
        return clone;
    }
    
    // Array
    if (Array.isArray(obj)) {
        const clone = [];
        seen.set(obj, clone);
        for (let i = 0; i < obj.length; i++) {
            clone[i] = deepClone(obj[i], seen);
        }
        return clone;
    }
    
    // Plain Object
    const clone = Object.create(Object.getPrototypeOf(obj));
    seen.set(obj, clone);
    
    for (const key of Reflect.ownKeys(obj)) { // includes symbols
        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        if (descriptor.value !== undefined) {
            descriptor.value = deepClone(descriptor.value, seen);
        }
        Object.defineProperty(clone, key, descriptor);
    }
    
    return clone;
}

// Test circular reference:
// const a = { name: 'test' };
// a.self = a;
// const b = deepClone(a);
// console.log(b.self === b); // true (circular ref preserved)
// console.log(b !== a);       // true (different object)
```

**Why WeakMap for `seen`:**
- Doesn't prevent garbage collection of objects
- O(1) lookup
- Only objects as keys (perfect for our use case)

**What `structuredClone()` handles that we should know:**
```javascript
// Modern alternative (available in browsers and Node.js 17+)
const clone = structuredClone(original);
// Handles: Date, RegExp, Map, Set, ArrayBuffer, Blob, File, ImageData
// Does NOT handle: Functions, DOM elements, getters/setters, prototype chain
// Does handle circular references
```

---

## Round 3: Frontend System Design
**Duration:** 40 minutes | **Interviewer:** Staff Engineer (E7)

### Questions Asked
1. **Design Facebook News Feed**
   - Infinite scroll, real-time updates, post types (text/image/video/link), reactions, comments

### 💡 Interview-Ready Answer

#### Component Architecture
```
┌──────────────────────────────────────────────────────────┐
│  NewsFeedPage                                             │
│  ├── CreatePost (rich text editor, media uploads)        │
│  ├── FeedContainer (manages state, data fetching)        │
│  │   ├── VirtualizedList (renders only visible posts)     │
│  │   │   ├── FeedPost (polymorphic)                      │
│  │   │   │   ├── PostHeader (avatar, name, timestamp)    │
│  │   │   │   ├── PostContent (text/image/video/link)     │
│  │   │   │   │   ├── TextPost                            │
│  │   │   │   │   ├── ImagePost (lazy loading)            │
│  │   │   │   │   ├── VideoPost (autoplay on viewport)    │
│  │   │   │   │   └── LinkPreview (OG metadata)           │
│  │   │   │   ├── ReactionBar (like, love, etc.)          │
│  │   │   │   └── CommentSection (lazy loaded)            │
│  │   │   └── ... more FeedPost                           │
│  │   ├── InfiniteScrollTrigger (Intersection Observer)   │
│  │   └── NewPostsBanner ("5 new posts — click to see")   │
│  └── FeedSidebar (trending, suggestions)                 │
└──────────────────────────────────────────────────────────┘
```

#### Infinite Scroll with Virtualization
```jsx
function VirtualizedFeed({ posts, loadMore, hasMore }) {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const containerRef = useRef();
    const POST_HEIGHT_ESTIMATE = 400; // average post height
    
    useEffect(() => {
        const container = containerRef.current;
        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const viewportHeight = container.clientHeight;
            
            const start = Math.floor(scrollTop / POST_HEIGHT_ESTIMATE) - 5;
            const end = Math.ceil((scrollTop + viewportHeight) / POST_HEIGHT_ESTIMATE) + 5;
            
            setVisibleRange({
                start: Math.max(0, start),
                end: Math.min(posts.length, end)
            });
        };
        
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [posts.length]);
    
    // Load more trigger
    const loadMoreRef = useRef();
    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMore(); },
            { rootMargin: '500px' } // prefetch 500px before reaching bottom
        );
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);
    
    const totalHeight = posts.length * POST_HEIGHT_ESTIMATE;
    const offsetTop = visibleRange.start * POST_HEIGHT_ESTIMATE;
    
    return (
        <div ref={containerRef} style={{ height: '100vh', overflowY: 'auto' }}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ position: 'absolute', top: offsetTop, width: '100%' }}>
                    {posts.slice(visibleRange.start, visibleRange.end).map(post => (
                        <FeedPost key={post.id} post={post} />
                    ))}
                </div>
            </div>
            {hasMore && <div ref={loadMoreRef} />}
        </div>
    );
}
```

#### Real-Time Updates
```
Strategy: "New posts banner" instead of auto-injection

Why NOT auto-inject new posts:
1. User is reading → content shifts → frustrating (CLS problem)
2. If 50 friends post, page jumps 50 times
3. Reading position is lost

Instead:
1. WebSocket/SSE connection receives new post notifications
2. Buffer new posts in state (not rendered)
3. Show banner: "5 new posts" at top
4. User clicks banner → prepend buffered posts → smooth scroll to top
```

```jsx
function useNewPostsSubscription(feedId) {
    const [bufferedPosts, setBufferedPosts] = useState([]);
    
    useEffect(() => {
        const ws = new WebSocket(`wss://api.facebook.com/feed/${feedId}/live`);
        
        ws.onmessage = (event) => {
            const newPost = JSON.parse(event.data);
            setBufferedPosts(prev => [newPost, ...prev]);
        };
        
        return () => ws.close();
    }, [feedId]);
    
    const consumeBuffered = () => {
        const posts = [...bufferedPosts];
        setBufferedPosts([]);
        return posts;
    };
    
    return { newPostCount: bufferedPosts.length, consumeBuffered };
}
```

#### Data Fetching — Cursor-Based Pagination
```graphql
# WHY cursor-based (not offset)?
# - Offset breaks when new posts are inserted (duplicates/skips)
# - Cursor is stable even when data changes

query NewsFeed($cursor: String, $limit: Int = 20) {
    newsFeed(after: $cursor, first: $limit) {
        edges {
            node {
                id
                author { name, avatar }
                content { type, text, media { url, width, height } }
                reactions { count, viewer_reaction }
                comments { total_count }
                created_at
            }
            cursor
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}
```

#### Performance Optimizations
| Optimization | Implementation |
|-------------|---------------|
| **Image lazy loading** | `loading="lazy"` + `IntersectionObserver` |
| **Video autoplay** | Play only when >50% in viewport, pause when out |
| **Virtualization** | Only render visible posts ± buffer |
| **Skeleton screens** | Show placeholder shapes while loading |
| **Prefetching** | Load next page when user is 500px from bottom |
| **Bundle splitting** | Video player loaded on demand (not in initial bundle) |
| **Service Worker** | Cache feed API responses for offline viewing |

---

## Round 4: Behavioral
**Duration:** 40 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a time you had to make a difficult trade-off between UX and performance"**
2. **"How do you mentor junior engineers?"**
3. **"Describe a time you failed and what you learned"**

### 💡 Interview-Ready Answer — UX vs Performance Trade-off

**Situation:** Building a data-heavy dashboard with 50+ charts that loaded simultaneously. Initial page load took 12 seconds. Product wanted all charts visible on first render for "complete picture" impression.

**Task:** Get page load under 3 seconds while keeping all charts accessible.

**Action:**
1. **Proposed progressive rendering** — load 6 critical charts immediately, rest on scroll
2. Product pushed back: "Users need to see everything at once"
3. **Compromised on skeleton screens** — show all 50 chart outlines immediately (lightweight SVG placeholders), then progressively hydrate with real data
4. **Priority queue:** Charts above fold load first → below fold → interactive features
5. **Server-side data batching:** Instead of 50 API calls, batch into 3 calls (critical, important, nice-to-have)
6. **Web Worker:** Process heavy data transformations off main thread

**Result:** Page load: 12s → 2.8s. All chart skeletons visible at 1.2s (perceived load time). Full data at 2.8s. Product team satisfied — UX felt instant. CTO called it "the fastest dashboard we have."

---

## 🎯 Key Takeaways
- Meta Frontend interviews are **React-specific** — know hooks, state management, rendering lifecycle
- **Autocomplete** is the #1 most asked Meta Frontend question — practice until perfect
- **Deep clone** with circular reference handling shows JS mastery
- **News Feed design** is Meta's signature question — virtualization + real-time + cursor pagination
- **Performance questions** should include metrics (Web Vitals, Lighthouse scores)
- Meta values **move fast** — show you can ship quickly while maintaining quality
- **Accessibility** is increasingly important at Meta — ARIA roles, keyboard navigation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium-Hard | React Component, API Integration, a11y |
| Round 2 | Medium | Deep JS Knowledge, WeakMap, Reflect |
| Round 3 | Hard | Infinite Scroll, Virtualization, Real-time |
| Round 4 | Medium | Behavioral, Trade-offs, Mentoring |
