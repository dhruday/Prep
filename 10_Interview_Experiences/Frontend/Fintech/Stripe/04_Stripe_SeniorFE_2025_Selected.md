# Stripe — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Stripe Dashboard |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + Bug Squash + Integration + FE System Design + HM)

---

## Round 1: Bug Squash — Frontend
**Duration:** 60 minutes

### Bug 1: Memory Leak in Event Listener Cleanup

```javascript
// BUGGY: useEffect cleanup doesn't remove the correct listener reference
function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // BUG: creates new callback on every render, old ones never cleaned up
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    
    observer.observe(element);
    
    // BUG: if ref.current changes between renders, we disconnect wrong observer
    return () => observer.disconnect();
  }); // BUG: no dependency array = runs EVERY render
  
  return size;
}

// FIX:
function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new ResizeObserver((entries) => {
      // Guard: check entries exist (observer can fire with empty array)
      if (entries.length === 0) return;
      
      const { width, height } = entries[0].contentRect;
      // Batch state update to avoid re-render per dimension
      setSize(prev => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });
    
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, []); // Empty deps: observe once, cleanup on unmount
  
  return size;
}
```

### Bug 2: Race Condition in Async Data Fetching

```javascript
// BUGGY: Fast typing in search → stale results displayed
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    // BUG: no cancellation — if query changes fast, older fetch may resolve AFTER newer one
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [query]);
  
  return results.map(r => <div key={r.id}>{r.name}</div>);
}

// FIX: AbortController for request cancellation
function SearchResults({ query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    
    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return; // Expected: previous request cancelled
        setError(err.message);
        setLoading(false);
      });
    
    // Cleanup: abort in-flight request when query changes or component unmounts
    return () => controller.abort();
  }, [query]);
  
  return { results, loading, error };
}
```

### Bug 3: XSS via dangerouslySetInnerHTML

```javascript
// BUGGY: User content rendered as HTML → XSS vulnerability
function Comment({ text }) {
  // BUG: attacker can inject <img src=x onerror="alert(document.cookie)">
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

// FIX: Use text content OR sanitize with DOMPurify
import DOMPurify from 'dompurify';

function Comment({ text, allowHTML = false }) {
  if (allowHTML) {
    // If HTML is needed (e.g., rich text), sanitize it
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title'],
    });
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
  }
  
  // Default: render as text (safe)
  return <div>{text}</div>;
}
```

---

## Round 2: FE System Design — Stripe Dashboard Architecture

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│             Stripe Dashboard Frontend Architecture              │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ App Shell (Micro-Frontend Architecture)           │           │
│  │                                                   │           │
│  │ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │           │
│  │ │Payments│ │ Revenue  │ │ Connect │ │Settings│  │           │
│  │ │ Module │ │Recognition│ │ Module  │ │ Module │  │           │
│  │ └────────┘ └──────────┘ └─────────┘ └────────┘  │           │
│  │                                                   │           │
│  │ Shared: Auth, Navigation, Design System           │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Data Layer                                        │           │
│  │                                                   │           │
│  │ 1. API Client:                                    │           │
│  │    - TypeScript SDK generated from OpenAPI spec   │           │
│  │    - Automatic error handling + retry             │           │
│  │    - Request deduplication (same URL within 100ms)│           │
│  │                                                   │           │
│  │ 2. State Management:                              │           │
│  │    - Server state: React Query (SWR pattern)      │           │
│  │    - Client state: Zustand (minimal)              │           │
│  │    - URL state: next/router searchParams           │           │
│  │                                                   │           │
│  │ 3. Real-time:                                     │           │
│  │    - WebSocket for live payment events            │           │
│  │    - Server-Sent Events for notification stream   │           │
│  │    - Optimistic updates for user actions          │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Performance Strategy                              │           │
│  │                                                   │           │
│  │ - Code splitting by route (dynamic import)        │           │
│  │ - Prefetch next likely page on hover              │           │
│  │ - Virtual tables for payment lists (10K+ rows)    │           │
│  │ - Canvas/WebGL for analytics charts               │           │
│  │ - Service Worker: cache static assets + API       │           │
│  │ - Skeleton loading for every data section          │           │
│  │ - Bundle size budget: < 200KB initial JS          │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Security                                          │           │
│  │                                                   │           │
│  │ - CSP: strict-dynamic, no inline scripts          │           │
│  │ - CSRF: token per session, SameSite=Strict        │           │
│  │ - XSS: React auto-escaping + DOMPurify for rich  │           │
│  │ - Subresource Integrity (SRI) for CDN assets      │           │
│  │ - iframe sandboxing for Stripe Elements embeds    │           │
│  │ - PCI DSS: card data never touches dashboard JS   │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Stripe FE = **Bug squash (memory leaks, race conditions, XSS) + dashboard system design**
- **Memory leak**: ResizeObserver without cleanup + missing dependency array = new observer every render
- **Race condition**: AbortController is the standard fix — abort previous fetch on new query
- **XSS prevention**: never `dangerouslySetInnerHTML` with user content — use DOMPurify with allowlist
- **Request deduplication**: same URL within 100ms → return same Promise — prevents double-fetch on re-renders
- **Micro-frontend**: independent modules (Payments, Connect, Settings) — shared shell, auth, design system
- **PCI DSS**: card data in iframes (Stripe Elements) — never in dashboard JavaScript context
- Stripe FE = **security + correctness focused** — bugs and edge cases matter more than feature velocity

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Concepts |
| Bug Squash | Hard | Memory Leaks, Race Conditions, XSS |
| Integration | Medium-Hard | API Integration |
| FE System Design | Very Hard | Dashboard Architecture |
| HM | Medium | Values |
