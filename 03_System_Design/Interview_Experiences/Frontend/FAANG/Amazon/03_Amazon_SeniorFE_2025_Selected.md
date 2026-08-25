# Amazon — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Front End Engineer II |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Retail |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 2 weeks

---

## Round 1: Online Assessment
**Duration:** 75 minutes

### Questions Asked
1. **Implement Promise.allSettled polyfill**
2. **Build a tree component with expand/collapse and select all**

### 💡 Promise.allSettled Polyfill

```javascript
function allSettled(promises) {
  if (!Array.isArray(promises)) {
    return Promise.reject(new TypeError('Argument must be an array'));
  }
  
  if (promises.length === 0) {
    return Promise.resolve([]);
  }
  
  return new Promise((resolve) => {
    const results = new Array(promises.length);
    let remaining = promises.length;
    
    promises.forEach((promise, index) => {
      // Wrap non-Promise values
      Promise.resolve(promise)
        .then(
          (value) => {
            results[index] = { status: 'fulfilled', value };
          },
          (reason) => {
            results[index] = { status: 'rejected', reason };
          }
        )
        .finally(() => {
          remaining--;
          if (remaining === 0) resolve(results);
        });
    });
  });
}

// Key differences from Promise.all:
// - Promise.all: rejects on FIRST rejection
// - Promise.allSettled: waits for ALL to settle (no short-circuit)
// - Returns array of { status, value/reason } objects
```

---

## Round 2: Frontend Technical 1
**Duration:** 60 minutes

### Questions Asked
1. **Build an Accessible Breadcrumb Navigation**
2. **Follow-up: Add responsive collapse (show ...ellipsis for long paths)**
3. **LP: Tell me about a time you simplified a complex system** (Invent and Simplify)

### 💡 Responsive Breadcrumb

```javascript
function Breadcrumb({ items, maxVisible = 3 }) {
  const [collapsed, setCollapsed] = useState(true);
  const containerRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  
  // Detect if breadcrumb overflows container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(([entry]) => {
      const container = entry.target;
      setOverflow(container.scrollWidth > container.clientWidth);
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [items]);
  
  const shouldCollapse = items.length > maxVisible && (collapsed || overflow);
  
  let visibleItems;
  if (shouldCollapse) {
    // Show first, ellipsis, last (maxVisible - 1) items
    visibleItems = [
      items[0],
      { type: 'ellipsis', hiddenItems: items.slice(1, items.length - (maxVisible - 1)) },
      ...items.slice(items.length - (maxVisible - 1)),
    ];
  } else {
    visibleItems = items;
  }
  
  return (
    <nav ref={containerRef} aria-label="Breadcrumb" className="breadcrumb">
      <ol>
        {visibleItems.map((item, idx) => {
          const isLast = idx === visibleItems.length - 1;
          
          if (item.type === 'ellipsis') {
            return (
              <li key="ellipsis" className="breadcrumb-ellipsis">
                <button
                  onClick={() => setCollapsed(false)}
                  aria-label={`Show ${item.hiddenItems.length} hidden levels`}
                  title={item.hiddenItems.map(i => i.label).join(' > ')}
                >
                  ⋯
                </button>
                <span aria-hidden="true" className="separator">/</span>
              </li>
            );
          }
          
          return (
            <li key={item.href || item.label}>
              {isLast ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <>
                  <a href={item.href}>{item.label}</a>
                  <span aria-hidden="true" className="separator">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Key accessibility points:
// 1. <nav aria-label="Breadcrumb"> — landmark
// 2. <ol> — ordered list (semantic hierarchy)
// 3. aria-current="page" on last item — indicates current page
// 4. Separators: aria-hidden="true" on "/" — screen readers see list structure
// 5. Ellipsis button has aria-label explaining hidden items
```

---

## Round 3: Frontend Technical 2
**Duration:** 60 minutes

### Questions Asked
1. **Implement a virtual scrolling list for product search results**
2. **Handle variable row heights and smooth scrolling**

### 💡 Variable-Height Virtual Scroll

```javascript
function VirtualList({ items, estimatedRowHeight = 80, overscan = 5 }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const heightCacheRef = useRef(new Map()); // itemIndex → measured height
  const rowRefs = useRef({});
  
  // Measure container
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  
  // Calculate positions using height cache
  const getItemOffset = (index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += heightCacheRef.current.get(i) || estimatedRowHeight;
    }
    return offset;
  };
  
  const totalHeight = (() => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += heightCacheRef.current.get(i) || estimatedRowHeight;
    }
    return total;
  })();
  
  // Find visible range
  const startIndex = (() => {
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
      const height = heightCacheRef.current.get(i) || estimatedRowHeight;
      if (offset + height > scrollTop) return Math.max(0, i - overscan);
      offset += height;
    }
    return 0;
  })();
  
  const endIndex = (() => {
    let offset = getItemOffset(startIndex);
    for (let i = startIndex; i < items.length; i++) {
      if (offset > scrollTop + containerHeight) return Math.min(items.length, i + overscan);
      offset += heightCacheRef.current.get(i) || estimatedRowHeight;
    }
    return items.length;
  })();
  
  // Measure rows after render
  useEffect(() => {
    for (let i = startIndex; i < endIndex; i++) {
      const el = rowRefs.current[i];
      if (el) {
        const height = el.getBoundingClientRect().height;
        if (heightCacheRef.current.get(i) !== height) {
          heightCacheRef.current.set(i, height);
        }
      }
    }
  });
  
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = getItemOffset(startIndex);
  
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: '100%', overflow: 'auto' }}
      role="list"
      aria-label="Product search results"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div
              key={item.id}
              ref={el => { rowRefs.current[startIndex + i] = el; }}
              role="listitem"
            >
              <ProductCard product={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} loading="lazy" width="80" height="80" />
      <div>
        <h3>{product.name}</h3>
        <div className="price">₹{product.price.toLocaleString('en-IN')}</div>
        <div className="rating">{'⭐'.repeat(Math.round(product.rating))} ({product.reviews})</div>
        {product.isPrime && <span className="prime-badge">Prime</span>}
      </div>
    </article>
  );
}
```

---

## Round 4: Bar Raiser (LP Heavy)
**Duration:** 60 minutes
- **Dive deep + Invent and Simplify + Customer Obsession** — all with FE context
- Passed with strong stories about: mobile-first redesign reducing bounce 30%, simplifying build system from Webpack to Vite

---

## 🎯 Key Takeaways
- Amazon FE = **polyfills + virtual scrolling + LP stories are make-or-break**
- **Promise.allSettled** — key difference from Promise.all: no short-circuit, always resolve
- **Responsive breadcrumb**: ResizeObserver for overflow detection, ellipsis with tooltip
- **Variable-height virtual scroll**: height cache + estimated height for unmeasured items
- **ARIA for breadcrumb**: `aria-current="page"`, `aria-hidden` on separators, `<ol>` semantic
- Amazon LP: "Invent and Simplify" = show you removed complexity, not just added features
- Bar Raiser cares about **customer impact metrics** — "reduced bounce rate 30%"

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Promise.allSettled, Tree Component |
| Technical 1 | Medium-Hard | Breadcrumb, ARIA, ResponsiveUI |
| Technical 2 | Hard | Virtual Scroll, Variable Heights |
| Bar Raiser | Hard | Leadership Principles, STAR |
