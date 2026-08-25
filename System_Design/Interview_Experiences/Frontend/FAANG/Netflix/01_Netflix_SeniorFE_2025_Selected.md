# Netflix — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite)
- **Timeline:** 3 weeks
- **Format:** Virtual
- **Note:** Netflix doesn't ask LeetCode. They test real-world engineering, system design, and culture fit. "Freedom and Responsibility" culture.

---

## Round 1: Phone Screen — React + Performance
**Duration:** 60 minutes

### Questions Asked
1. **Build a performant infinite list with dynamic item heights**
2. **Explain React 18 concurrent features and how they improve UX**

### 💡 Interview-Ready Answer — Infinite List with Dynamic Heights

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';

function useVirtualList({ estimatedItemHeight, overscan = 5, loadMore }) {
  const containerRef = useRef(null);
  const [items, setItems] = useState([]);
  const [heights, setHeights] = useState(new Map()); // index → measured height
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    if (!containerRef.current) return { start: 0, end: 20 };
    const containerHeight = containerRef.current.clientHeight;
    
    let offset = 0;
    let startIdx = 0;
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const h = heights.get(i) || estimatedItemHeight;
      if (offset + h > scrollTop) { startIdx = i; break; }
      offset += h;
    }
    
    // Find end index
    let endIdx = startIdx;
    let visibleHeight = 0;
    for (let i = startIdx; i < items.length; i++) {
      visibleHeight += heights.get(i) || estimatedItemHeight;
      endIdx = i;
      if (visibleHeight > containerHeight) break;
    }
    
    return {
      start: Math.max(0, startIdx - overscan),
      end: Math.min(items.length - 1, endIdx + overscan)
    };
  }, [scrollTop, items.length, heights, estimatedItemHeight, overscan]);
  
  // Measure item after render
  const measureRef = useCallback((index) => (el) => {
    if (el) {
      const h = el.getBoundingClientRect().height;
      setHeights(prev => {
        if (prev.get(index) === h) return prev;
        const next = new Map(prev);
        next.set(index, h);
        return next;
      });
    }
  }, []);
  
  // Infinite scroll: load more when near bottom
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(scrollTop);
    
    if (scrollHeight - scrollTop - clientHeight < 200 && !isLoading) {
      setIsLoading(true);
      loadMore().then(newItems => {
        setItems(prev => [...prev, ...newItems]);
        setIsLoading(false);
      });
    }
  }, [isLoading, loadMore]);
  
  const { start, end } = getVisibleRange();
  
  // Calculate total height and offset for positioning
  let totalHeight = 0;
  let offsetY = 0;
  for (let i = 0; i < items.length; i++) {
    const h = heights.get(i) || estimatedItemHeight;
    if (i < start) offsetY += h;
    totalHeight += h;
  }
  
  return {
    containerRef,
    handleScroll,
    visibleItems: items.slice(start, end + 1).map((item, i) => ({
      item,
      index: start + i,
      measureRef: measureRef(start + i)
    })),
    totalHeight,
    offsetY,
    isLoading
  };
}

// Usage
function MovieList() {
  const { containerRef, handleScroll, visibleItems, totalHeight, offsetY, isLoading } =
    useVirtualList({
      estimatedItemHeight: 120,
      overscan: 3,
      loadMore: () => fetch('/api/movies?page=next').then(r => r.json())
    });
  
  return (
    <div ref={containerRef} onScroll={handleScroll}
         style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index, measureRef }) => (
            <div key={item.id} ref={measureRef}>
              <MovieCard movie={item} />
            </div>
          ))}
        </div>
      </div>
      {isLoading && <div className="spinner">Loading...</div>}
    </div>
  );
}
```

### 💡 React 18 Concurrent Features

```
1. startTransition: Mark state updates as non-urgent
   → User input stays responsive while heavy re-renders happen in background
   const [query, setQuery] = useState('');
   const [results, setResults] = useState([]);
   
   function handleChange(e) {
     setQuery(e.target.value);                    // Urgent: update input immediately
     startTransition(() => {
       setResults(filterMovies(e.target.value));  // Non-urgent: can be interrupted
     });
   }

2. useDeferredValue: Defer a value until more urgent updates finish
   const deferredQuery = useDeferredValue(query);
   // deferredQuery lags behind query → expensive list re-renders are deferred

3. Suspense for Data Fetching: Declarative loading states
   <Suspense fallback={<Skeleton />}>
     <MovieDetails id={movieId} />
   </Suspense>

4. Automatic Batching: Multiple setState calls → single re-render
   // React 17: only batched in event handlers
   // React 18: batched everywhere (setTimeout, promises, native events)

5. useId: Generate unique IDs for SSR hydration
   const id = useId(); // Same on server and client → no hydration mismatch
```

---

## Round 2: System Design — Netflix Browse Page
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's Browse Page (homepage with rows of movies/shows)**
   - Performance, personalization, A/B testing, multiple device sizes, video preview on hover

### 💡 Interview-Ready Answer

```
Netflix Browse Page Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Data Flow                                                    │
│                                                                │
│  1. Page Load → Falcor (Netflix's data library) fetches      │
│     personalized row data as JSON Graph                       │
│  2. Each row: { title, items: [movie1, movie2, ...] }        │
│  3. Only fetch visible rows + 2 pre-fetched below viewport   │
│  4. Each item: poster image (low-res first → swap high-res)  │
└──────────────────────────────────────────────────────────────┘

Performance Optimization Stack:
┌──────────────────────────────────────────────────────────────┐
│  1. Image Optimization                                        │
│     - AVIF → WebP → JPEG fallback                            │
│     - Responsive: srcset with 3 sizes (phone/tablet/TV)      │
│     - LQIP: 10-byte blurred placeholder → sharp image        │
│     - CDN: Open Connect (Netflix's own CDN, ISP PoPs)        │
│                                                                │
│  2. Row Virtualization                                        │
│     - Only render visible rows (Intersection Observer)        │
│     - Horizontal scroll per row (CSS scroll-snap)             │
│     - Prefetch row data 2 rows below viewport                │
│                                                                │
│  3. Video Preview on Hover                                    │
│     - Delay: 1.5s hover before starting video                │
│     - Pre-buffer first 3 seconds of top 10 titles            │
│     - Use <video> with short MP4 clip (not full HLS)         │
│     - Abort on mouse leave (save bandwidth)                  │
│                                                                │
│  4. Above-the-Fold Priority                                   │
│     - First row: server-rendered (SSR)                        │
│     - Billboard (hero): preload poster + video               │
│     - Below fold: lazy loaded with Intersection Observer     │
│                                                                │
│  5. Bundle Optimization                                       │
│     - Code split per page (browse ≠ player ≠ profiles)       │
│     - Tree-shake unused locale strings                       │
│     - Prefetch player chunk on hover (likely to click)       │
└──────────────────────────────────────────────────────────────┘
```

#### A/B Testing Infrastructure
```javascript
// Netflix runs 100s of A/B tests simultaneously
class ABTestProvider {
  constructor(userId) {
    // On page load, fetch all active test assignments for user
    // Deterministic: same userId always gets same bucket
    this.assignments = {}; // testName → variant
  }
  
  async initialize(userId) {
    // Fetch from experiment service (cached in CDN per user segment)
    const response = await fetch(`/api/ab-tests?userId=${userId}`);
    this.assignments = await response.json();
    // { "row_algorithm": "personalized_v2", "artwork_size": "large", ... }
  }
  
  getVariant(testName) {
    return this.assignments[testName] || 'control';
  }
}

// React integration
function BrowseRow({ row }) {
  const abTest = useABTest();
  const artworkSize = abTest.getVariant('artwork_size');
  
  return (
    <div className="row">
      <h2>{row.title}</h2>
      <HorizontalScroll>
        {row.items.map(item => (
          <MovieCard 
            key={item.id} 
            movie={item}
            size={artworkSize === 'large' ? 300 : 200}
          />
        ))}
      </HorizontalScroll>
    </div>
  );
}
```

#### Row Virtualization with Intersection Observer
```javascript
function LazyRow({ rowData, index }) {
  const [isVisible, setIsVisible] = useState(index < 3); // SSR first 3 rows
  const [data, setData] = useState(index < 3 ? rowData : null);
  const ref = useRef(null);
  
  useEffect(() => {
    if (index < 3) return; // Already rendered
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Fetch row data
          fetchRowData(rowData.id).then(setData);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, rowData.id]);
  
  if (!isVisible) {
    return <div ref={ref} style={{ height: 250 }} />; // Placeholder
  }
  
  return data ? <BrowseRow row={data} /> : <RowSkeleton />;
}
```

---

## Round 3: Culture + Technical Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **"What does 'Freedom and Responsibility' mean to you?"**
2. **"How do you make technical decisions in ambiguous situations?"**
3. **Technical: How would you measure and improve Core Web Vitals on Netflix?**

### 💡 Core Web Vitals Improvement

```
Netflix CWV Strategy:
┌──────────────────────────────────────────────────────────────┐
│  LCP (Largest Contentful Paint) — Target: < 2.5s            │
│  Problem: Hero billboard image is LCP element                │
│  Solution:                                                    │
│  1. <link rel="preload" as="image" href="hero.avif">       │
│  2. SSR the hero section (no client JS needed to render)     │
│  3. CDN edge caching with Vary: Accept (serve AVIF/WebP)    │
│  4. Use fetchpriority="high" on hero image                  │
│                                                               │
│  FID/INP (Interaction Latency) — Target: < 200ms            │
│  Problem: Click on movie card → slow response               │
│  Solution:                                                    │
│  1. Code-split: don't load player code on browse page       │
│  2. Prefetch route: on hover, prefetch movie detail chunk    │
│  3. Use startTransition for non-urgent updates              │
│  4. Web Workers for data transformation (keep main thread)  │
│                                                               │
│  CLS (Cumulative Layout Shift) — Target: < 0.1              │
│  Problem: Images loading cause layout shift                  │
│  Solution:                                                    │
│  1. aspect-ratio: 16/9 on all poster containers             │
│  2. LQIP (Low Quality Image Placeholder) — same dimensions │
│  3. Font: font-display: optional (no FOUT/FOIT)             │
│  4. Skeleton screens with exact same dimensions as content   │
└──────────────────────────────────────────────────────────────┘

Measurement:
- RUM (Real User Metrics) via Performance Observer API
- Synthetic: Lighthouse CI in deployment pipeline
- Dashboard: Custom Grafana with p50/p75/p95 per device type
```

---

## 🎯 Key Takeaways
- Netflix **doesn't ask LeetCode** — focus on real-world engineering
- **Virtual list with dynamic heights** is the #1 coding question at Netflix
- **React 18 concurrent features** — must know startTransition, Suspense, useDeferredValue
- **Browse page design** = row virtualization + image optimization + video preview + A/B testing
- **Core Web Vitals** optimization is expected knowledge for Netflix FE
- **Intersection Observer** for lazy loading — used everywhere at Netflix
- **Freedom and Responsibility** culture fit is make-or-break — have stories ready
- Netflix pays top of market but expects exceptional engineers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Virtual List, React 18, Performance |
| System Design | Very Hard | Browse Page, A/B, Image/Video Optimization |
| Culture | Medium-Hard | Netflix Values, Technical Decision-Making |
