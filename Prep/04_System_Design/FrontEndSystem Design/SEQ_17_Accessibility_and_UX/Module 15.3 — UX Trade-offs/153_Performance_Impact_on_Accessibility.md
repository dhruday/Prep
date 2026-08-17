# 153. Performance Impact on Accessibility

## 1. High-Level Explanation (Frontend Interview Level)

**Performance Impact on Accessibility** examines how performance optimizations affect assistive technology usability and how accessibility features impact performance—requiring balanced approaches that ensure fast, accessible experiences without compromising either dimension.

- **What**: Intersection of performance and accessibility, mutual impacts
- **Why**: Slow apps unusable for screen readers, aggressive optimization breaks assistive tech
- **When**: Virtual scrolling, code splitting, lazy loading, animation optimization
- **Role**: Critical trade-off requiring nuanced understanding of both domains

**Key Principle**: "Accessible AND fast" – not accessible OR fast.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Performance Optimizations That Break Accessibility

**1. Code Splitting & Dynamic Imports**:
```typescript
// ❌ PROBLEM: Code splitting breaks screen reader navigation

// Route change loads new chunk
<Route path="/products" component={lazy(() => import('./Products'))} />

// Issue: Screen reader doesn't announce route change
// User doesn't know new content loaded

// ✅ SOLUTION: Announce route changes with aria-live
function AccessibleRouter() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    // Get page title from route
    const title = getPageTitle(location.pathname);
    
    // Announce to screen reader
    setAnnouncement(`Navigated to ${title} page`);
    
    // Update document title (read by screen readers on load)
    document.title = title;
    
    // Focus management: Move focus to main content
    const main = document.querySelector('main');
    if (main) {
      main.focus();
      main.setAttribute('tabindex', '-1'); // Allows programmatic focus
    }
  }, [location]);
  
  return (
    <>
      {/* ARIA live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      <Routes>
        <Route path="/products" element={<Products />} />
        <Route path="/cart" element={<Cart />} />
      </Routes>
    </>
  );
}
```

**2. Lazy Loading Images**:
```tsx
// ❌ PROBLEM: Lazy loading can delay alt text availability

<img
  src="placeholder.jpg"
  data-src="product.jpg"
  alt="Product name"
  loading="lazy"
/>
// Screen reader reads alt text immediately, but image not loaded yet
// If alt text depends on loaded image data, creates confusion

// ✅ SOLUTION: Ensure alt text available immediately
function AccessibleLazyImage({
  src,
  alt,
  width,
  height
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div
      style={{ width, height, position: 'relative' }}
      // Reserve space to prevent layout shift (CLS)
    >
      <img
        src={src}
        alt={alt}  // Alt text available immediately
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s'
        }}
      />
      
      {!loaded && (
        <div
          className="skeleton"
          aria-hidden="true"  // Hide from screen readers
        />
      )}
    </div>
  );
}
```

**3. Virtual Scrolling**:
```tsx
// ❌ PROBLEM: Virtual scrolling removes content from DOM
// Screen readers can't navigate to off-screen items

function BrokenVirtualList({ items }: { items: any[] }) {
  const visibleItems = getVisibleItems(items, scrollTop);
  
  return (
    <div>
      {visibleItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
  // Only 10 items rendered, but list has 10,000 items
  // Screen reader thinks there are only 10 items!
}

// ✅ SOLUTION: Use aria-setsize and aria-posinset
function AccessibleVirtualList({
  items,
  height,
  itemHeight
}: {
  items: any[];
  height: number;
  itemHeight: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight),
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      role="list"
      aria-label={`List of ${items.length} items`}
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Top spacer for scroll positioning */}
      <div
        style={{ height: startIndex * itemHeight }}
        aria-hidden="true"
      />
      
      {visibleItems.map((item, idx) => (
        <div
          key={item.id}
          role="listitem"
          // Tell screen reader: "Item X of Y"
          aria-setsize={items.length}           // Total size
          aria-posinset={startIndex + idx + 1}  // Current position
          tabIndex={0}                           // Keyboard accessible
        >
          {item.name}
        </div>
      ))}
      
      {/* Bottom spacer */}
      <div
        style={{ height: (items.length - endIndex) * itemHeight }}
        aria-hidden="true"
      />
    </div>
  );
}
```

### Accessibility Features That Impact Performance

**1. ARIA Live Regions**:
```typescript
// ❌ PROBLEM: Too many live region updates = performance hit

function BrokenLiveUpdates() {
  const [items, setItems] = useState<string[]>([]);
  
  // Updates every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => [...prev, `Item ${Date.now()}`]);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div aria-live="polite" aria-atomic="true">
      {/* Screen reader reads entire list every 100ms
          - Massive performance hit
          - Overwhelms user with announcements */}
      {items.map(item => <div key={item}>{item}</div>)}
    </div>
  );
}

// ✅ SOLUTION: Throttle updates, use aria-atomic carefully
function ThrottledLiveUpdates() {
  const [items, setItems] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');
  
  // Throttle: Max 1 announcement per 3 seconds
  const announceUpdate = useMemo(
    () => throttle((count: number) => {
      setAnnouncement(`${count} new items added`);
    }, 3000),
    []
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => {
        const newItems = [...prev, `Item ${Date.now()}`];
        announceUpdate(newItems.length);
        return newItems;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [announceUpdate]);
  
  return (
    <>
      {/* Separate live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* List WITHOUT aria-live (prevents re-reading entire list) */}
      <div role="list">
        {items.map(item => (
          <div key={item} role="listitem">
            {item}
          </div>
        ))}
      </div>
    </>
  );
}
```

**2. Large ARIA Attributes**:
```tsx
// ❌ PROBLEM: Large aria-describedby slows rendering

function BrokenDescription() {
  const longDescription = `
    ${Array(1000).fill('Lorem ipsum dolor sit amet').join(' ')}
  `;
  
  return (
    <>
      <input
        type="text"
        aria-describedby="description"
      />
      
      <div id="description">
        {longDescription}  {/* 10KB of text, read every focus */}
      </div>
    </>
  );
}

// ✅ SOLUTION: Keep descriptions concise, use progressive disclosure
function ConciseDescription() {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <>
      <input
        type="text"
        aria-describedby="short-description"
        aria-details={showDetails ? "full-description" : undefined}
      />
      
      <div id="short-description">
        Enter your email address
      </div>
      
      <button
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
      >
        {showDetails ? 'Hide' : 'Show'} details
      </button>
      
      {showDetails && (
        <div id="full-description">
          {/* Detailed explanation only when requested */}
          Full details about email requirements...
        </div>
      )}
    </>
  );
}
```

**3. Complex Focus Management**:
```typescript
// ❌ PROBLEM: Focus thrashing = janky experience

function BrokenFocusManagement() {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<HTMLElement[]>([]);
  
  // Bad: Focus on every render
  useEffect(() => {
    refs.current[activeIndex]?.focus();
  }); // No deps = runs every render
  
  // Causes focus to move rapidly, screen reader can't keep up
}

// ✅ SOLUTION: Batch focus updates, use requestIdleCallback
function OptimizedFocusManagement() {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<HTMLElement[]>([]);
  const pendingFocus = useRef<number | null>(null);
  
  const focusItem = useCallback((index: number) => {
    // Cancel pending focus
    if (pendingFocus.current !== null) {
      cancelIdleCallback(pendingFocus.current);
    }
    
    // Schedule focus during idle time
    pendingFocus.current = requestIdleCallback(() => {
      refs.current[index]?.focus();
      pendingFocus.current = null;
    }, { timeout: 100 });
  }, []);
  
  useEffect(() => {
    focusItem(activeIndex);
  }, [activeIndex, focusItem]);
  
  return (
    <div role="list">
      {items.map((item, idx) => (
        <div
          key={item.id}
          ref={el => { if (el) refs.current[idx] = el; }}
          tabIndex={idx === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(idx)}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### Balanced Optimization Strategies

**1. Preload Critical Accessibility Resources**:
```html
<!-- Preload screen reader polyfill for older browsers -->
<link
  rel="preload"
  href="/polyfills/aria.js"
  as="script"
/>

<!-- Preload focus-visible polyfill for older browsers -->
<link
  rel="preload"
  href="/polyfills/focus-visible.js"
  as="script"
/>
```

**2. Optimize ARIA Live Region Updates**:
```typescript
class OptimizedLiveRegion {
  private updateQueue: string[] = [];
  private isProcessing = false;
  
  // Debounce: Wait for updates to stop before announcing
  private processQueue = debounce(() => {
    if (this.updateQueue.length === 0) return;
    
    // Combine multiple updates into one announcement
    const announcement = this.updateQueue.join('. ');
    this.announce(announcement);
    
    this.updateQueue = [];
    this.isProcessing = false;
  }, 1000);
  
  queueUpdate(message: string): void {
    this.updateQueue.push(message);
    
    // Max queue size: 5 messages
    if (this.updateQueue.length > 5) {
      this.updateQueue.shift();
    }
    
    this.processQueue();
  }
  
  private announce(message: string): void {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
}

const liveRegion = new OptimizedLiveRegion();

// Usage
liveRegion.queueUpdate('Item added to cart');
liveRegion.queueUpdate('Subtotal updated');
liveRegion.queueUpdate('Shipping calculated');
// Announces once: "Item added to cart. Subtotal updated. Shipping calculated."
```

**3. Reduce Motion for Performance**:
```css
/* Disable expensive animations for users who prefer reduced motion
   AND for low-end devices */

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Detect low-end device in JS */
const isLowEndDevice = 
  navigator.hardwareConcurrency < 4 ||
  (navigator as any).deviceMemory < 4;

if (isLowEndDevice) {
  document.body.classList.add('reduced-motion');
}
```

```css
/* Simplified animations for reduced-motion */
.reduced-motion .card {
  /* No complex 3D transforms */
  transition: opacity 0.2s;
}

.card {
  /* Full animation for high-end devices */
  transition: transform 0.3s, opacity 0.3s;
  transform: perspective(1000px) rotateY(0deg);
}

.card:hover {
  transform: perspective(1000px) rotateY(10deg);
}

.reduced-motion .card:hover {
  opacity: 0.8;  /* Simple opacity change */
}
```

**4. Accessible Loading States**:
```tsx
// Balance: Show loading state immediately (perceived performance)
//          + Announce to screen reader (accessibility)

function AccessibleLoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  
  async function loadData() {
    setIsLoading(true);
    
    try {
      const result = await fetchData();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <>
      <button onClick={loadData} aria-busy={isLoading}>
        Load Data
      </button>
      
      {isLoading && (
        <>
          {/* Visual loading (perceived performance) */}
          <div className="skeleton" aria-hidden="true">
            {/* Skeleton UI */}
          </div>
          
          {/* Screen reader announcement (accessibility) */}
          <div
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            Loading data, please wait...
          </div>
        </>
      )}
      
      {data && (
        <div role="region" aria-label="Loaded data">
          {/* Display data */}
        </div>
      )}
    </>
  );
}
```

### Performance Testing with Assistive Technologies

**1. Measure Screen Reader Performance**:
```typescript
// Synthetic test: Measure time for screen reader to navigate

async function measureScreenReaderPerformance() {
  const results = {
    domSize: document.querySelectorAll('*').length,
    focusableElements: document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).length,
    ariaLiveRegions: document.querySelectorAll('[aria-live]').length,
    headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
  };
  
  // Performance heuristics
  const warnings = [];
  
  if (results.domSize > 1500) {
    warnings.push(
      `DOM too large: ${results.domSize} nodes (recommend < 1500 for NVDA)`
    );
  }
  
  if (results.focusableElements > 100) {
    warnings.push(
      `Too many tab stops: ${results.focusableElements} ` +
      `(recommend < 100 for keyboard navigation)`
    );
  }
  
  if (results.ariaLiveRegions > 5) {
    warnings.push(
      `Too many live regions: ${results.ariaLiveRegions} ` +
      `(recommend < 5 to avoid performance issues)`
    );
  }
  
  console.table(results);
  warnings.forEach(w => console.warn(w));
  
  return { results, warnings };
}
```

**2. Accessibility Performance Budget**:
```typescript
interface A11yPerformanceBudget {
  maxDOMSize: number;
  maxFocusableElements: number;
  maxARIALiveRegions: number;
  maxHeadingDepth: number;
  maxTabStopsPerPage: number;
}

const budget: A11yPerformanceBudget = {
  maxDOMSize: 1500,              // NVDA performance threshold
  maxFocusableElements: 100,     // Usable keyboard navigation
  maxARIALiveRegions: 5,         // Avoid update conflicts
  maxHeadingDepth: 6,            // h1 to h6
  maxTabStopsPerPage: 100        // Skip links if exceeded
};

// CI check
function checkA11yPerformanceBudget(): void {
  const metrics = measureScreenReaderPerformance();
  
  if (metrics.results.domSize > budget.maxDOMSize) {
    throw new Error(
      `DOM size ${metrics.results.domSize} exceeds budget ${budget.maxDOMSize}`
    );
  }
  
  // Check other metrics...
}
```

### What NOT to Do

- ❌ **Optimize without considering assistive tech** (breaks screen readers)
- ❌ **Add ARIA without measuring impact** (live regions = performance cost)
- ❌ **Ignore prefers-reduced-motion** (animations = CPU usage)
- ❌ **Virtual scroll without aria-setsize** (screen readers lose context)
- ❌ **Lazy load without alt text** (accessibility delay)

---

## 3. Clear Real-World Examples

### Example 1: Twitter – Virtual Scrolling with Accessibility

**Challenge**: Infinite timeline with 10,000+ tweets, performance vs accessibility.

**Solution**:
```tsx
// Virtual scroll with aria-setsize/aria-posinset
<div role="feed" aria-label="Timeline">
  {visibleTweets.map((tweet, idx) => (
    <article
      role="article"
      aria-setsize={totalTweets}
      aria-posinset={startIndex + idx + 1}
      aria-labelledby={`tweet-${tweet.id}`}
    >
      {/* Tweet content */}
    </article>
  ))}
</div>
```

**Result**: Fast scrolling (60fps) + screen reader announces "Tweet 157 of 10,000".

### Example 2: Facebook – Optimized ARIA Live Updates

**Challenge**: News feed with frequent updates (new posts, reactions, comments).

**Solution**:
```typescript
// Throttle live announcements to 1 per 5 seconds
const announceUpdate = throttle((message: string) => {
  setLiveAnnouncement(message);
}, 5000);

// Batch updates
if (newPosts.length > 1) {
  announceUpdate(`${newPosts.length} new posts in news feed`);
} else {
  announceUpdate(`New post from ${newPosts[0].author}`);
}
```

**Result**: Reduced screen reader interruptions by 80%, better UX.

### Example 3: Airbnb – Code Splitting with Focus Management

**Challenge**: Large app (3MB bundle), need code splitting without breaking navigation.

**Solution**:
```tsx
// Announce route changes + focus management
function AccessibleApp() {
  const location = useLocation();
  
  useEffect(() => {
    // Announce page change
    announceToScreenReader(`Navigated to ${getPageTitle(location.pathname)}`);
    
    // Focus main content
    document.querySelector('main')?.focus();
  }, [location]);
  
  return (
    <Routes>
      <Route path="/search" element={<LazySearch />} />
      <Route path="/listing/:id" element={<LazyListing />} />
    </Routes>
  );
}
```

**Result**: 80% smaller initial bundle, maintained screen reader navigation.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do performance optimizations impact accessibility?"

**Answer**:

"Performance optimizations can **break accessibility** if not done carefully. I balance both:

**1. Optimizations That Break Accessibility**

**Virtual Scrolling**:
- Problem: Removes items from DOM, screen reader thinks list is small
- Solution: Use `aria-setsize` / `aria-posinset`:

```tsx
<div
  role="listitem"
  aria-setsize={10000}            // Total items
  aria-posinset={position}        // Current position
>
  Item {position} of 10,000
</div>
```

**Code Splitting**:
- Problem: Route changes don't announce to screen reader
- Solution: Announce with aria-live + focus management:

```tsx
useEffect(() => {
  announceToScreenReader(`Navigated to ${pageTitle}`);
  document.querySelector('main')?.focus();
}, [location]);
```

**Lazy Loading**:
- Problem: Alt text delayed until image loads
- Solution: Ensure alt text available immediately, image loads separately

**2. Accessibility Features That Hurt Performance**

**ARIA Live Regions**:
- Problem: Too many updates = performance hit + overwhelms user
- Solution: Throttle to 1 announcement per 3 seconds:

```typescript
const announceUpdate = throttle((msg: string) => {
  setLiveAnnouncement(msg);
}, 3000);
```

**Large DOM**:
- Problem: Screen readers slow down with > 1500 nodes (NVDA threshold)
- Solution: Virtual scrolling + skip links

**Complex Focus Management**:
- Problem: Focus thrashing = janky experience
- Solution: Batch updates with `requestIdleCallback`

**3. Balanced Strategies**

**Performance Budget for Accessibility**:
```typescript
{
  maxDOMSize: 1500,              // NVDA threshold
  maxARIALiveRegions: 5,         // Avoid conflicts
  maxFocusableElements: 100      // Usable keyboard nav
}
```

**Preload Critical Resources**:
```html
<link rel="preload" href="/polyfills/aria.js" as="script" />
```

**Reduce Motion**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

Helps accessibility AND performance (animations = CPU cost).

**Optimize Live Announcements**:
```typescript
// Batch updates into single announcement
queueUpdate('Item added');
queueUpdate('Cart updated');
// Announces: "Item added. Cart updated." (one announcement)
```

**4. Real-World Examples**

**Twitter**: Virtual scrolling with `aria-setsize` / `aria-posinset`. Fast (60fps) + accessible ("Tweet 157 of 10,000").

**Facebook**: Throttled ARIA live updates (1 per 5s). Reduced interruptions 80%.

**Airbnb**: Code splitting (80% smaller bundle) + focus management (screen reader announces route changes).

**5. Testing**

**Performance with Screen Readers**:
- Test NVDA with 1500+ DOM nodes (slowdown threshold)
- Measure keyboard navigation time with 100+ focusable elements
- Count ARIA live region updates (max 3/sec)

**Accessibility with Performance Constraints**:
- Test on slow devices (Android Go)
- Test on slow connections (2G)
- Ensure core functionality works without JS (progressive enhancement)

**Trade-offs**:

- Virtual scrolling: Performance gain, accessibility complexity
- ARIA live: Accessibility benefit, performance cost
- Animations: UX delight, accessibility/performance trade-off

I prioritize **accessible AND fast**, not accessible OR fast. Measure both dimensions, optimize holistically."

---

## 6. Why & How Summary

### Why It Matters

**Mutual Impact**: Performance optimizations can break accessibility (virtual scrolling, code splitting), accessibility features can hurt performance (ARIA live regions, large DOM)  
**User Experience**: Slow apps unusable for screen readers (NVDA slows > 1500 nodes), inaccessible apps unusable for disabled users  
**Holistic Optimization**: Can't optimize one dimension independently

### How to Balance

**1. Virtual Scrolling**: Use aria-setsize/aria-posinset (performance + accessibility)  
**2. Code Splitting**: Announce route changes with aria-live + focus management  
**3. ARIA Live**: Throttle updates (max 3/sec), batch announcements  
**4. DOM Size**: Keep < 1500 nodes for screen reader performance  
**5. Reduced Motion**: Disable animations for accessibility AND performance  
**6. Testing**: Measure both (Lighthouse accessibility score + screen reader performance)

**FAANG**: Performance budgets for accessibility (max DOM size, ARIA updates), virtual scrolling with aria-setsize/posinset, throttled live announcements, prefers-reduced-motion, focus management on code splits, test on assistive tech + slow devices, holistic optimization (not siloed)
