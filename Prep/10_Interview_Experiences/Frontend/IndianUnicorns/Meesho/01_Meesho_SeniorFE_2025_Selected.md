# Meesho — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 10 days
- **Note:** Meesho is a social commerce platform — expect e-commerce + reseller-specific questions

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Product Catalog with Filter and Sort** (React)
   - Category filter, price range, sort by price/popularity, grid/list view toggle

### 💡 Interview-Ready Answer

```javascript
import { useState, useMemo, useCallback } from 'react';

function ProductCatalog({ products }) {
  const [filters, setFilters] = useState({
    category: 'all',
    priceMin: 0,
    priceMax: Infinity,
    sortBy: 'popularity', // 'popularity' | 'price_asc' | 'price_desc' | 'rating'
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  const filteredAndSorted = useMemo(() => {
    let result = products.filter(p => {
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      if (p.price < filters.priceMin || p.price > filters.priceMax) return false;
      return true;
    });
    
    const sorters = {
      popularity: (a, b) => b.salesCount - a.salesCount,
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    
    return result.sort(sorters[filters.sortBy] || (() => 0));
  }, [products, filters]);
  
  const categories = useMemo(() => 
    ['all', ...new Set(products.map(p => p.category))], [products]);
  
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return (
    <div className="catalog">
      {/* Filter Panel */}
      <aside className="filter-panel" role="search" aria-label="Product filters">
        <fieldset>
          <legend>Category</legend>
          {categories.map(cat => (
            <label key={cat} className="filter-option">
              <input type="radio" name="category" value={cat}
                     checked={filters.category === cat}
                     onChange={() => handleFilterChange('category', cat)} />
              {cat === 'all' ? 'All Categories' : cat}
            </label>
          ))}
        </fieldset>
        
        <fieldset>
          <legend>Price Range</legend>
          <PriceRangeSlider
            min={0} max={5000}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([min, max]) => {
              handleFilterChange('priceMin', min);
              handleFilterChange('priceMax', max);
            }}
          />
        </fieldset>
      </aside>
      
      {/* Results */}
      <main className="results">
        <div className="toolbar">
          <span className="result-count" aria-live="polite">
            {filteredAndSorted.length} products found
          </span>
          
          <select value={filters.sortBy}
                  onChange={e => handleFilterChange('sortBy', e.target.value)}
                  aria-label="Sort products by">
            <option value="popularity">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
          
          <div className="view-toggle" role="radiogroup" aria-label="View mode">
            <button className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')} aria-label="Grid view">⊞</button>
            <button className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')} aria-label="List view">☰</button>
          </div>
        </div>
        
        <div className={`product-${viewMode}`}>
          {filteredAndSorted.map(product => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      </main>
    </div>
  );
}

const ProductCard = React.memo(function ProductCard({ product, viewMode }) {
  return (
    <article className={`product-card ${viewMode}`}>
      <img src={product.image} alt={product.name} loading="lazy"
           width="200" height="200" />
      <div className="product-info">
        <h3>{product.name}</h3>
        <div className="price">₹{product.price.toLocaleString('en-IN')}</div>
        <div className="rating">
          {'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}
          <span>({product.reviewCount})</span>
        </div>
        <div className="supplier">Supplier: {product.supplier}</div>
        <button className="share-btn" aria-label={`Share ${product.name}`}>
          Share & Earn ₹{Math.floor(product.price * 0.1)}
        </button>
      </div>
    </article>
  );
});
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Array.prototype.reduce polyfill**
2. **Closures: Build a memoize function that handles objects as arguments**
3. **this keyword: Output prediction (5 scenarios)**

### 💡 reduce Polyfill

```javascript
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(`${callback} is not a function`);
  }
  
  const arr = this;
  const len = arr.length;
  let accumulator;
  let startIndex;
  
  if (arguments.length >= 2) {
    accumulator = initialValue;
    startIndex = 0;
  } else {
    if (len === 0) throw new TypeError('Reduce of empty array with no initial value');
    
    // Find first non-hole element (sparse array handling)
    let found = false;
    for (let i = 0; i < len; i++) {
      if (i in arr) {
        accumulator = arr[i];
        startIndex = i + 1;
        found = true;
        break;
      }
    }
    if (!found) throw new TypeError('Reduce of empty array with no initial value');
  }
  
  for (let i = startIndex; i < len; i++) {
    if (i in arr) { // Skip holes in sparse arrays
      accumulator = callback(accumulator, arr[i], i, arr);
    }
  }
  
  return accumulator;
};
```

### 💡 Memoize with Object Arguments

```javascript
function memoize(fn) {
  const cache = new Map();
  
  return function(...args) {
    // Generate cache key: JSON.stringify handles objects
    // But fails for circular refs, functions, Map/Set
    const key = args.length === 1 && typeof args[0] !== 'object'
      ? args[0] // Primitive: use directly (fast path)
      : JSON.stringify(args); // Objects: serialize
    
    if (cache.has(key)) return cache.get(key);
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Better version: WeakMap for object args (prevents memory leak)
function memoizeAdvanced(fn) {
  const primitiveCache = new Map();
  const objectCache = new WeakMap(); // For single object argument
  
  return function(...args) {
    if (args.length === 1) {
      const arg = args[0];
      
      if (typeof arg === 'object' && arg !== null) {
        if (objectCache.has(arg)) return objectCache.get(arg);
        const result = fn.call(this, arg);
        objectCache.set(arg, result);
        return result;
      }
      
      if (primitiveCache.has(arg)) return primitiveCache.get(arg);
      const result = fn.call(this, arg);
      primitiveCache.set(arg, result);
      return result;
    }
    
    const key = JSON.stringify(args);
    if (primitiveCache.has(key)) return primitiveCache.get(key);
    const result = fn.apply(this, args);
    primitiveCache.set(key, result);
    return result;
  };
}
```

### 💡 `this` Keyword — 5 Scenarios

```javascript
// 1. Regular function call → this = globalThis (or undefined in strict mode)
function greet() { console.log(this); }
greet(); // window (non-strict) / undefined (strict)

// 2. Method call → this = object before dot
const obj = { name: 'Alice', greet() { console.log(this.name); } };
obj.greet(); // "Alice"
const fn = obj.greet;
fn(); // undefined! (this = window, window.name = undefined)

// 3. Arrow function → no own this, inherits from enclosing lexical scope
const obj2 = {
  name: 'Bob',
  greet: () => console.log(this.name), // ← this = outer scope (window)
  delayedGreet() {
    setTimeout(() => console.log(this.name), 100); // ← this = obj2 ✓
  }
};
obj2.greet(); // undefined (arrow captures outer this = window)
obj2.delayedGreet(); // "Bob" (arrow captures delayedGreet's this = obj2)

// 4. Constructor → this = new empty object
function Dog(name) { this.name = name; }
const d = new Dog('Rex'); // this = {} → this.name = 'Rex' → return this
d.name; // "Rex"

// 5. Explicit binding → call/apply/bind
function say(greeting) { console.log(`${greeting}, ${this.name}`); }
say.call({ name: 'Charlie' }, 'Hi'); // "Hi, Charlie"
```

---

## Round 3: Frontend System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Meesho's Product Sharing & Reseller Flow**
   - Reseller browses catalog → shares on WhatsApp → earns margin
   - Handle deep links, share tracking, commission calculation UI

### 💡 Interview-Ready Answer

```
Social Commerce Sharing Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Share Flow:                                                  │
│  1. Reseller browses catalog                                 │
│  2. Clicks "Share & Earn" →                                  │
│     a. Generates unique share link:                          │
│        https://meesho.com/p/{productId}?ref={resellerId}     │
│     b. Shortens via URL shortener: msho.me/abc123            │
│     c. Generates share image (server-side):                  │
│        Product image + price overlay + "Order via link"      │
│  3. Shares to WhatsApp (Web Share API fallback):             │
│     navigator.share({ url, text, files: [image] })          │
│     Fallback: whatsapp://send?text=...                       │
│  4. Buyer clicks link → product page with reseller tracking  │
│  5. Commission earned → shown in reseller dashboard          │
│                                                                │
│  Deep Link Handling:                                          │
│  - Web: ?ref=R123 param → stored in sessionStorage           │
│  - App: Universal Links / App Links → activity with referral │
│  - Attribution window: 7 days cookie/storage for web         │
│  - Multi-touch: last-click attribution model                 │
│                                                                │
│  Commission Dashboard:                                        │
│  - Earnings: daily/weekly/monthly breakdown                  │
│  - Per-product commission: margin set by Meesho              │
│  - Pending → Confirmed → Paid lifecycle                      │
│  - Analytics: clicks → orders → conversion rate per share    │
│                                                                │
│  Performance for Low-End Devices:                             │
│  - Meesho's users: mostly Tier 2/3 cities, low-end Android  │
│  - Strategy: Progressive Web App (PWA)                       │
│  - Image: compressed, max 100KB per product image            │
│  - JS budget: < 150KB gzipped total                         │
│  - Skeleton screens instead of spinners (perceived perf)     │
│  - Service Worker: cache product catalog for offline browsing │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meesho = **social commerce** — expect reseller/sharing-specific system design
- **Product catalog with filters** is the core machine coding question
- **reduce polyfill** — handle: no initial value, sparse arrays, first non-hole element
- **this keyword** 5 rules: default, method, arrow, new, explicit — know all edge cases
- **Web Share API** for native sharing — with WhatsApp deeplink fallback
- **PWA + low-end device optimization** is Meesho-specific — mention JS budget, image compression
- **Share attribution tracking** = UTM params + cookie/session storage + attribution window

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium | React, Filters, Grid/List View |
| JavaScript | Medium-Hard | reduce, Memoize, this, Closures |
| System Design | Medium-Hard | Social Commerce, PWA, Share Tracking |
| HM | Medium | Behavioral |
