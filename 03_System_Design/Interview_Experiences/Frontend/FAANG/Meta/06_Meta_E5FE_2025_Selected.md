# Meta — E5 Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer E5 |
| **Level** | E5 (Senior) |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Instagram Web |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + FE Design + Behavioral + Product Sense)

---

## Round 1: Coding
**Duration:** 40 minutes

### Questions Asked
1. **Implement `Promise.race()` with cancellation support**
2. **Follow-up: Implement `Promise.allSettled()` from scratch**
3. **Follow-up: Timeout wrapper — reject if promise doesn't resolve within N ms**

### 💡 Promise.race + Cancellation + Timeout

```javascript
/**
 * Promise.race polyfill — returns first settled promise.
 * Added: cancel remaining promises if one settles.
 */
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('promiseRace requires an array'));
    }
    
    if (promises.length === 0) {
      return; // Never settles (per spec)
    }
    
    let settled = false;
    
    for (const promise of promises) {
      Promise.resolve(promise).then(
        (value) => {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        },
        (reason) => {
          if (!settled) {
            settled = true;
            reject(reason);
          }
        }
      );
    }
  });
}

/**
 * Promise.race with AbortController — cancel remaining after first settles.
 */
function promiseRaceWithCancel(promiseFactories) {
  const controller = new AbortController();
  
  const promises = promiseFactories.map(factory => factory(controller.signal));
  
  return new Promise((resolve, reject) => {
    let settled = false;
    
    for (const promise of promises) {
      Promise.resolve(promise).then(
        (value) => {
          if (!settled) {
            settled = true;
            controller.abort(); // Cancel remaining
            resolve(value);
          }
        },
        (reason) => {
          if (!settled && reason?.name !== 'AbortError') {
            settled = true;
            controller.abort();
            reject(reason);
          }
        }
      );
    }
  });
}

/**
 * Promise.allSettled polyfill — waits for ALL promises to settle.
 * Returns array of { status: 'fulfilled', value } or { status: 'rejected', reason }.
 */
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    if (!Array.isArray(promises)) {
      throw new TypeError('promiseAllSettled requires an array');
    }
    
    if (promises.length === 0) {
      return resolve([]);
    }
    
    const results = new Array(promises.length);
    let remaining = promises.length;
    
    for (let i = 0; i < promises.length; i++) {
      Promise.resolve(promises[i]).then(
        (value) => {
          results[i] = { status: 'fulfilled', value };
          if (--remaining === 0) resolve(results);
        },
        (reason) => {
          results[i] = { status: 'rejected', reason };
          if (--remaining === 0) resolve(results);
        }
      );
    }
  });
}

/**
 * Timeout wrapper — reject if promise doesn't resolve within timeoutMs.
 * Cleans up timeout to prevent memory leak.
 */
function withTimeout(promise, timeoutMs, message = 'Operation timed out') {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId); // Cleanup
  });
}

// Usage:
// const result = await withTimeout(fetch('/api/data'), 5000, 'API timeout');
```

---

## Round 2: Frontend Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Instagram's Explore Page (Web)**
   - Masonry grid layout (mixed sizes: 1x1, 1x2, 2x1, 2x2)
   - Infinite scroll with content prefetching
   - Tap to preview (modal with swipe carousel)
   - Performance: lazy image loading + virtualization
   - Personalized content based on interests

### 💡 Instagram Explore Page Architecture

```
Masonry Grid Layout Algorithm:
┌──────────────────────────────────────────────────────┐
│ Layout: CSS Grid with predefined patterns             │
│                                                       │
│ Pattern repeats every 6 items:                        │
│ ┌──────┬──────┬──────┐                                │
│ │  2x2 │  1x1 │  1x1 │                                │
│ │      │──────┤──────┤                                │
│ │      │  1x1 │  1x2 │                                │
│ └──────┴──────┤      │                                │
│               └──────┘                                │
│                                                       │
│ CSS Grid Implementation:                              │
│ .explore-grid {                                       │
│   display: grid;                                      │
│   grid-template-columns: repeat(3, 1fr);              │
│   grid-auto-rows: minmax(150px, auto);                │
│   gap: 4px;                                           │
│ }                                                     │
│                                                       │
│ .item-2x2 { grid-column: span 2; grid-row: span 2; } │
│ .item-1x2 { grid-column: span 1; grid-row: span 2; } │
│ .item-2x1 { grid-column: span 2; grid-row: span 1; } │
│                                                       │
│ Pattern assignment (cyclic):                          │
│ items[0]: 2x2, items[1-3]: 1x1, items[4]: 1x2        │
│ items[5]: 2x1, ... repeat                             │
└──────────────────────────────────────────────────────┘

Component Architecture:

<ExplorePage>
  ├── <SearchBar />                    // Sticky top
  ├── <CategoryChips categories />     // Horizontal scroll
  ├── <ExploreGrid>
  │   ├── <VirtualizedGrid>           // Only render visible rows
  │   │   ├── <GridItem post size>   // Configurable size
  │   │   │   ├── <LazyImage src placeholder />
  │   │   │   ├── <VideoIndicator /> // If video
  │   │   │   └── <MultiPostIndicator /> // Carousel
  │   │   └── ...
  │   └── <InfiniteScrollSentinel /> // IntersectionObserver trigger
  ├── <MediaPreviewModal>             // Opens on tap
  │   ├── <SwipeCarousel>
  │   │   ├── <PostDetail post />
  │   │   └── ...
  │   └── <CloseButton />
  └── <ScrollToTop />

Infinite Scroll + Prefetch:
┌──────────────────────────────────────────────────┐
│ const observer = new IntersectionObserver(         │
│   ([entry]) => {                                   │
│     if (entry.isIntersecting && !loading) {        │
│       fetchNextPage();                             │
│     }                                              │
│   },                                               │
│   { rootMargin: '800px' } // Prefetch 800px ahead  │
│ );                                                  │
│ observer.observe(sentinelRef.current);              │
│                                                     │
│ Image Prefetching:                                  │
│ // Prefetch images for next page while scrolling    │
│ function prefetchImages(urls) {                     │
│   urls.forEach(url => {                             │
│     const link = document.createElement('link');    │
│     link.rel = 'prefetch';                          │
│     link.as = 'image';                              │
│     link.href = url;                                │
│     document.head.appendChild(link);                │
│   });                                               │
│ }                                                   │
│                                                     │
│ // Prefetch next page during idle time              │
│ requestIdleCallback(() => {                         │
│   if (hasNextPage) prefetchPage(nextCursor);        │
│ });                                                 │
└──────────────────────────────────────────────────┘

Lazy Image Loading:
┌──────────────────────────────────────────────────┐
│ function LazyImage({ src, placeholder, alt }) {    │
│   const [loaded, setLoaded] = useState(false);     │
│   const [inView, ref] = useInView({                │
│     triggerOnce: true,                             │
│     rootMargin: '200px'                            │
│   });                                              │
│                                                    │
│   return (                                         │
│     <div ref={ref} className="lazy-image-wrapper"> │
│       {/* Blurred placeholder */}                  │
│       <img src={placeholder}                       │
│            className={`placeholder ${loaded ? 'hidden' : ''}`}│
│            alt="" aria-hidden="true" />             │
│                                                    │
│       {inView && (                                 │
│         <img src={src}                             │
│              alt={alt}                              │
│              loading="lazy"                         │
│              onLoad={() => setLoaded(true)}         │
│              className={`full ${loaded ? 'visible' : ''}`}│
│         />                                         │
│       )}                                           │
│                                                    │
│       {!loaded && <div className="shimmer" />}     │
│     </div>                                         │
│   );                                               │
│ }                                                  │
│                                                    │
│ Responsive image sizes (srcset):                   │
│ <img srcset="photo-300w.webp 300w,                 │
│              photo-600w.webp 600w,                  │
│              photo-1200w.webp 1200w"                │
│      sizes="(max-width: 480px) 100vw,              │
│             (max-width: 768px) 50vw,                │
│             33vw"                                   │
│      src="photo-600w.webp"                          │
│      alt="Post by user" />                          │
└──────────────────────────────────────────────────┘

Performance Budget:
- LCP: < 2.5s (first visible grid images)
- FID: < 100ms (immediate tap response)
- CLS: < 0.1 (fixed aspect ratio containers prevent layout shift)
- Image format: WebP with JPEG fallback
- Total JS bundle: < 200KB gzipped
- Initial page: SSR first 18 items, hydrate on client
```

---

## 🎯 Key Takeaways
- Meta E5 FE = **Promise polyfills + Instagram Explore page design**
- **Promise.race**: first settled wins — `settled` flag prevents double-resolve
- **Cancellation**: `AbortController` — pass signal to promise factories, abort on first settle
- **withTimeout**: `Promise.race([promise, timeoutPromise])` + `finally(clearTimeout)` — prevent memory leak
- **Masonry grid**: CSS Grid with span patterns — cyclic pattern assignment for consistent layout
- **Infinite scroll**: IntersectionObserver with `rootMargin: '800px'` — prefetch before user reaches bottom
- **Lazy images**: IntersectionObserver + blurred placeholder → full image crossfade on load
- Meta FE: **Promise fundamentals are very common** — expect race/all/allSettled polyfills

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Promise Polyfills, Cancellation |
| FE Design | Hard | Masonry Grid, Infinite Scroll |
| Coding 2 | Medium-Hard | DOM / React |
| Behavioral | Medium | Signal, Impact |
| Product Sense | Medium | Explore Page Decisions |
