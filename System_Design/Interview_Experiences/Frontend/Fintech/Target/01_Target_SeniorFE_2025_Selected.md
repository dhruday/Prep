# Target — Senior Frontend Engineer Interview Experience (2025) — #1

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 1 week

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Product Comparison Table**
   - Add/remove products, highlight differences, responsive, sticky headers

### 💡 Interview-Ready Answer

```javascript
function ProductComparisonTable({ products, onRemove, maxProducts = 4 }) {
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const tableRef = useRef(null);
  
  // Extract all unique attribute keys across products
  const allAttributes = useMemo(() => {
    const attrs = new Set();
    products.forEach(p => {
      Object.keys(p.specs).forEach(key => attrs.add(key));
    });
    return [...attrs];
  }, [products]);
  
  // Find attributes where values differ
  const diffAttributes = useMemo(() => {
    if (products.length < 2) return new Set();
    
    const diffs = new Set();
    for (const attr of allAttributes) {
      const values = products.map(p => p.specs[attr] ?? 'N/A');
      const uniqueValues = new Set(values);
      if (uniqueValues.size > 1) diffs.add(attr);
    }
    return diffs;
  }, [products, allAttributes]);
  
  return (
    <div className="comparison-container" role="region" aria-label="Product comparison">
      <div className="comparison-controls">
        <label>
          <input
            type="checkbox"
            checked={highlightDiffs}
            onChange={e => setHighlightDiffs(e.target.checked)}
          />
          Highlight differences
        </label>
      </div>
      
      <div className="comparison-table-wrapper" ref={tableRef}>
        <table role="grid" aria-label="Product comparison table">
          <thead>
            <tr>
              <th className="sticky-col" scope="col">Feature</th>
              {products.map(product => (
                <th key={product.id} scope="col">
                  <div className="product-header">
                    <img src={product.image} alt={product.name} width="80" height="80" />
                    <h3>{product.name}</h3>
                    <div className="product-price">₹{product.price.toLocaleString('en-IN')}</div>
                    <div className="product-rating">⭐ {product.rating}/5</div>
                    <button
                      onClick={() => onRemove(product.id)}
                      aria-label={`Remove ${product.name} from comparison`}
                      className="remove-btn"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {allAttributes.map(attr => {
              const isDiff = diffAttributes.has(attr);
              
              return (
                <tr
                  key={attr}
                  className={highlightDiffs && isDiff ? 'diff-row' : ''}
                >
                  <th className="sticky-col" scope="row">{formatAttrName(attr)}</th>
                  {products.map(product => {
                    const value = product.specs[attr] ?? 'N/A';
                    const isBest = isDiff && isBestValue(products, attr, value);
                    
                    return (
                      <td
                        key={product.id}
                        className={`
                          ${highlightDiffs && isDiff ? 'diff-cell' : ''}
                          ${highlightDiffs && isBest ? 'best-value' : ''}
                        `}
                      >
                        {formatValue(attr, value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAttrName(attr) {
  return attr.replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function formatValue(attr, value) {
  if (typeof value === 'boolean') return value ? '✅ Yes' : '❌ No';
  if (attr.includes('Price') || attr.includes('price')) return `₹${Number(value).toLocaleString('en-IN')}`;
  if (attr.includes('Weight') || attr.includes('weight')) return `${value} kg`;
  return String(value);
}

function isBestValue(products, attr, value) {
  // Determine "best" based on attribute type
  const numericAttrs = ['rating', 'battery', 'ram', 'storage', 'warranty'];
  const lowerIsBetter = ['price', 'weight'];
  
  const values = products.map(p => Number(p.specs[attr])).filter(v => !isNaN(v));
  if (values.length === 0) return false;
  
  const numValue = Number(value);
  if (isNaN(numValue)) return false;
  
  if (lowerIsBetter.some(a => attr.toLowerCase().includes(a))) {
    return numValue === Math.min(...values);
  }
  return numValue === Math.max(...values);
}

// CSS for sticky column and responsive:
/*
.comparison-table-wrapper { overflow-x: auto; }
.sticky-col {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
  min-width: 150px;
}
.diff-row { background: #FFF3E0; }
.diff-cell { font-weight: 600; }
.best-value { color: #2E7D32; background: #E8F5E9; }
*/
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement a deep comparison function (isEqual)**
2. **Explain WeakMap vs Map with use cases**
3. **What happens when you type a URL in the browser?**

### 💡 Deep Equal

```javascript
function isEqual(a, b) {
  // Same reference or both primitive and equal
  if (a === b) return true;
  
  // Handle null/undefined
  if (a == null || b == null) return a === b;
  
  // Different types
  if (typeof a !== typeof b) return false;
  
  // Dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  
  // Not objects
  if (typeof a !== 'object') return false; // primitives already handled by ===
  
  // Arrays
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  // Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !isEqual(val, b.get(key))) return false;
    }
    return true;
  }
  
  // Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false; // Note: only works for primitives in set
    }
    return true;
  }
  
  // Plain objects and arrays
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key])
  );
}

// WeakMap vs Map:
// Map: any key type, prevents GC of keys, iterable, has .size
// WeakMap: only object keys, allows GC when no other refs, NOT iterable, no .size
// WeakMap use cases:
// 1. Cache that auto-cleans: const cache = new WeakMap(); cache.set(domNode, expensiveData);
//    When domNode is removed from DOM → cache entry auto-collected
// 2. Private data: const privates = new WeakMap();
//    class Foo { constructor() { privates.set(this, { secret: 42 }); } }
// 3. Circular reference detection: const seen = new WeakSet();
```

---

## 🎯 Key Takeaways
- Target FE = **e-commerce comparison UI + JavaScript fundamentals**
- **Product comparison table**: sticky columns, diff highlighting, responsive horizontal scroll
- **"isBestValue"** logic: know which attributes are "lower is better" (price, weight) vs "higher is better" (rating, RAM)
- **Deep Equal**: handle Date, RegExp, Map, Set, plain objects, arrays — all types
- **WeakMap**: auto GC when key has no other references — perfect for DOM caching
- Target asks "URL in browser" question — know: DNS → TCP → TLS → HTTP → HTML parse → CSSOM → render tree → layout → paint → composite
- Target values **practical frontend skills** over algorithmic complexity

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Comparison Table, Sticky, Responsive |
| JavaScript | Medium | Deep Equal, WeakMap, Browser Internals |
| System Design | Hard | E-Commerce Product Page, CDN, A/B Testing |
| HM | Medium | Behavioral |
