# Amazon — Senior Frontend Engineer Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 Frontend |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Prime Video |
| **Rejection Reason** | Bar raiser round — insufficient LP depth for "Disagree and Commit" |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 3 weeks

---

## Round 1: Frontend Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build an Infinite Scroll Product List** (like Amazon search results)
   - Fetch products page by page
   - IntersectionObserver for trigger
   - Loading skeleton while fetching
   - Error handling with retry
   - Maintain scroll position on back navigation

### 💡 Interview-Ready Answer

```jsx
function useInfiniteScroll(fetchPage) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchPage(page);
      setItems(prev => [...prev, ...data.items]);
      setHasMore(data.hasNext);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchPage]);
  
  // IntersectionObserver setup
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' } // Trigger 200px before sentinel is visible (prefetch)
    );
    
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loading]);
  
  return { items, loading, error, hasMore, sentinelRef, retry: loadMore };
}

// Scroll position restoration
function useScrollRestore(key) {
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll_${key}`);
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
    }
    
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${key}`, String(window.scrollY));
    };
    
    // Passive scroll listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);
}

function ProductList() {
  const fetchProducts = useCallback(async (page) => {
    const res = await fetch(`/api/products?page=${page}&limit=20`);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  }, []);
  
  const { items, loading, error, hasMore, sentinelRef, retry } = useInfiniteScroll(fetchProducts);
  
  useScrollRestore('product-list');
  
  return (
    <main aria-label="Product search results" aria-live="polite">
      <div className="product-grid" role="list">
        {items.map(product => (
          <article key={product.id} className="product-card" role="listitem">
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={200} height={200}
            />
            <h2>{product.name}</h2>
            <div className="price">
              <span className="current">₹{product.price.toLocaleString('en-IN')}</span>
              {product.originalPrice && (
                <span className="original">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="rating" aria-label={`${product.rating} out of 5 stars, ${product.reviewCount} reviews`}>
              {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              <span>({product.reviewCount})</span>
            </div>
            {product.isPrime && <span className="prime-badge">Prime</span>}
          </article>
        ))}
        
        {/* Loading skeletons */}
        {loading && Array.from({ length: 4 }, (_, i) => (
          <div key={`skeleton-${i}`} className="skeleton-card" aria-hidden="true">
            <div className="skeleton-img" />
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
        ))}
      </div>
      
      {/* Error state with retry */}
      {error && (
        <div className="error" role="alert">
          <p>Something went wrong: {error}</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}
      
      {/* Sentinel for IntersectionObserver */}
      {hasMore && !error && <div ref={sentinelRef} className="sentinel" aria-hidden="true" />}
      
      {!hasMore && <p className="end-message">You've reached the end!</p>}
    </main>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement `Promise.finally` polyfill**
2. **Explain how `async`/`await` works under the hood** (generator + promise wrapper)

### 💡 Promise.finally + Async/Await Internals

```javascript
// Promise.finally polyfill
Promise.prototype.myFinally = function(callback) {
  return this.then(
    // On resolve: run callback, then forward original value
    value => Promise.resolve(callback()).then(() => value),
    // On reject: run callback, then re-throw original reason
    reason => Promise.resolve(callback()).then(() => { throw reason; })
  );
};
// Key insight: callback() result is IGNORED unless it rejects
// Original resolve/reject value passes through

// Async/Await under the hood:
// async function foo() { const x = await bar(); return x + 1; }
// is equivalent to:
function foo() {
  return new Promise((resolve, reject) => {
    const gen = function*() {
      const x = yield bar(); // yield the promise
      return x + 1;
    }();
    
    function step(nextFn) {
      let result;
      try {
        result = nextFn();
      } catch (err) {
        return reject(err);
      }
      
      if (result.done) {
        return resolve(result.value);
      }
      
      // Wait for yielded promise, then continue generator
      Promise.resolve(result.value).then(
        value => step(() => gen.next(value)),
        err => step(() => gen.throw(err))
      );
    }
    
    step(() => gen.next());
  });
}

// Simpler async runner utility:
function asyncRunner(genFn) {
  return function(...args) {
    const gen = genFn.apply(this, args);
    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let result;
        try {
          result = gen[key](arg);
        } catch (err) {
          return reject(err);
        }
        if (result.done) return resolve(result.value);
        Promise.resolve(result.value).then(
          val => step('next', val),
          err => step('throw', err)
        );
      }
      step('next', undefined);
    });
  };
}
```

---

## 🎯 Key Takeaways
- Amazon FE = **product UI + performance + LP stories + Bar Raiser**
- **IntersectionObserver**: `rootMargin: '200px'` for prefetch — don't wait until sentinel is visible
- **Scroll position restore**: sessionStorage + requestAnimationFrame for back navigation
- **Loading="lazy" + decoding="async"**: native image lazy loading for product images
- **Promise.finally**: callback runs on both resolve/reject, original value passes through
- **Async/await = generator + promise runner**: yield pauses, promise resolution resumes via gen.next()
- **Bar Raiser**: Amazon-specific round — must have deep LP stories for all 16 principles
- "Disagree and Commit": prepare a story where you disagreed, explained why, but committed to team decision

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding | Medium-Hard | Infinite Scroll, IntersectionObserver |
| JavaScript | Medium-Hard | Promise.finally, Async internals |
| System Design | Hard | Video Streaming, Adaptive Bitrate |
| Bar Raiser | Hard | Leadership Principles Deep Dive |
