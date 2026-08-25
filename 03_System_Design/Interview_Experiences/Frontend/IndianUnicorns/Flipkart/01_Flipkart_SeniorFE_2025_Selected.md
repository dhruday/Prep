# Flipkart — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-2 Frontend |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Mix of virtual and onsite
- **Note:** Flipkart Frontend interview has a dedicated **Machine Coding round** where you build a complete UI feature in 90 minutes.

---

## Round 1: Machine Coding — Build Feature in 90 min
**Duration:** 90 min coding + 30 min review | **Platform:** CodeSandbox

### Questions Asked
1. **Build a Multi-Select Dropdown with Search, Select All, and Chip Display**

### 💡 Interview-Ready Answer

```jsx
function MultiSelectDropdown({ options, selectedValues, onChange, placeholder = "Select..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);
    
    // Filter options by search
    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options;
        return options.filter(opt => 
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);
    
    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Focus search on open
    useEffect(() => {
        if (isOpen) searchRef.current?.focus();
    }, [isOpen]);
    
    const toggleOption = (value) => {
        const newValues = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newValues);
    };
    
    const selectAll = () => {
        const allFilteredValues = filteredOptions.map(o => o.value);
        const allSelected = allFilteredValues.every(v => selectedValues.includes(v));
        
        if (allSelected) {
            // Deselect all filtered
            onChange(selectedValues.filter(v => !allFilteredValues.includes(v)));
        } else {
            // Select all filtered (keep existing selections from other filters)
            const newValues = [...new Set([...selectedValues, ...allFilteredValues])];
            onChange(newValues);
        }
    };
    
    const removeChip = (value, e) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };
    
    const isAllSelected = filteredOptions.length > 0 && 
        filteredOptions.every(o => selectedValues.includes(o.value));
    
    return (
        <div ref={dropdownRef} className="multi-select" role="combobox" aria-expanded={isOpen}>
            {/* Selected Chips Display */}
            <div className="select-trigger" onClick={() => setIsOpen(!isOpen)}>
                {selectedValues.length === 0 ? (
                    <span className="placeholder">{placeholder}</span>
                ) : (
                    <div className="chips-container">
                        {selectedValues.slice(0, 3).map(value => {
                            const option = options.find(o => o.value === value);
                            return (
                                <span key={value} className="chip">
                                    {option?.label}
                                    <button onClick={(e) => removeChip(value, e)} aria-label={`Remove ${option?.label}`}>
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        {selectedValues.length > 3 && (
                            <span className="chip more">+{selectedValues.length - 3} more</span>
                        )}
                    </div>
                )}
                <span className="arrow">{isOpen ? '▲' : '▼'}</span>
            </div>
            
            {/* Dropdown */}
            {isOpen && (
                <div className="dropdown-menu" role="listbox" aria-multiselectable="true">
                    {/* Search */}
                    <input
                        ref={searchRef}
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search options..."
                        role="searchbox"
                    />
                    
                    {/* Select All */}
                    {filteredOptions.length > 0 && (
                        <label className="option select-all">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={selectAll}
                            />
                            Select All ({filteredOptions.length})
                        </label>
                    )}
                    
                    {/* Options */}
                    {filteredOptions.length === 0 ? (
                        <div className="no-results">No options found</div>
                    ) : (
                        filteredOptions.map(option => (
                            <label key={option.value} className="option" role="option"
                                   aria-selected={selectedValues.includes(option.value)}>
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => toggleOption(option.value)}
                                />
                                {option.label}
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// CSS (inline for machine coding):
const styles = `
.multi-select { position: relative; width: 350px; font-family: sans-serif; }
.select-trigger { border: 1px solid #ccc; border-radius: 4px; padding: 8px; cursor: pointer; 
                   min-height: 40px; display: flex; align-items: center; justify-content: space-between; }
.chips-container { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { background: #e3f2fd; border-radius: 16px; padding: 2px 8px; font-size: 13px; 
        display: flex; align-items: center; gap: 4px; }
.chip button { background: none; border: none; cursor: pointer; font-size: 14px; padding: 0 2px; }
.dropdown-menu { position: absolute; top: 100%; left: 0; right: 0; border: 1px solid #ccc;
                  border-radius: 4px; max-height: 300px; overflow-y: auto; background: white; z-index: 10; }
.search-input { width: 100%; padding: 8px; border: none; border-bottom: 1px solid #eee; box-sizing: border-box; }
.option { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; }
.option:hover { background: #f5f5f5; }
.select-all { border-bottom: 1px solid #eee; font-weight: 600; }
.no-results { padding: 12px; color: #999; text-align: center; }
`;
```

**Discussion points (30 min):**
- **Virtualization:** For 10K+ options, use virtual scrolling (only render visible items)
- **Async search:** For server-side filtering, add debounce + API call
- **Accessibility:** ARIA roles, keyboard navigation (arrow keys + Enter to toggle)
- **Performance:** `useMemo` for filtered results, `useCallback` for handlers
- **Testing:** Test select all with search filter active, chip removal, click outside

---

## Round 2: Frontend DSA + JS Deep Dive
**Duration:** 60 minutes | **Interviewer:** Senior Frontend Lead

### Questions Asked
1. **Implement `Array.prototype.reduce` from scratch**
2. **Implement `Function.prototype.bind` from scratch**
3. **Event loop output prediction questions**

### 💡 Interview-Ready Answer — Polyfill reduce

```javascript
Array.prototype.myReduce = function(callback, initialValue) {
    if (this.length === 0 && initialValue === undefined) {
        throw new TypeError('Reduce of empty array with no initial value');
    }
    
    let accumulator = initialValue !== undefined ? initialValue : this[0];
    let startIndex = initialValue !== undefined ? 0 : 1;
    
    for (let i = startIndex; i < this.length; i++) {
        if (i in this) { // skip holes in sparse arrays
            accumulator = callback(accumulator, this[i], i, this);
        }
    }
    
    return accumulator;
};
```

### 💡 Interview-Ready Answer — Polyfill bind

```javascript
Function.prototype.myBind = function(context, ...boundArgs) {
    if (typeof this !== 'function') {
        throw new TypeError('Bind called on non-function');
    }
    
    const originalFn = this;
    
    const boundFn = function(...callArgs) {
        // Handle `new boundFn()` — `this` will be the new instance, not `context`
        const isNewCall = this instanceof boundFn;
        return originalFn.apply(
            isNewCall ? this : context,
            [...boundArgs, ...callArgs]
        );
    };
    
    // Maintain prototype chain for `new` operator
    if (originalFn.prototype) {
        boundFn.prototype = Object.create(originalFn.prototype);
    }
    
    return boundFn;
};
```

### 💡 Interview-Ready Answer — Event Loop Prediction

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => {
    console.log('3');
    setTimeout(() => console.log('4'), 0);
}).then(() => console.log('5'));

console.log('6');

// Output: 1, 6, 3, 5, 2, 4
// 
// Explanation:
// 1. Sync: "1" (call stack)
// 2. setTimeout callback → macrotask queue
// 3. Promise.then → microtask queue
// 4. Sync: "6" (call stack)
// 5. Call stack empty → process microtask queue
//    - "3" (microtask)
//    - setTimeout → macrotask queue (added AFTER "2"'s timeout)
//    - "5" (chained .then → microtask)
// 6. Microtask queue empty → process macrotask queue
//    - "2" (first setTimeout)
//    - "4" (second setTimeout, added later)
```

**Key rules:**
- **Microtasks** (Promise.then, queueMicrotask, MutationObserver) run BEFORE macrotasks
- **Macrotasks** (setTimeout, setInterval, I/O, requestAnimationFrame) run one at a time
- After EACH macrotask, ALL pending microtasks are drained
- `async/await` → `await` pauses function, remaining code becomes a microtask

---

## Round 3: Frontend System Design
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Design Flipkart's Product Listing Page (PLP)**
   - Infinite scroll, filters, sort, grid/list view, price/rating display, wishlist, SEO

### 💡 Interview-Ready Answer

```
Performance Budget:
- FCP < 1.5s
- LCP < 2.5s  
- CLS < 0.1
- TTI < 3.5s
- Bundle size: < 200KB gzipped for initial load

Architecture:
SSR (Next.js) → Hydration → Client-side interaction

Key decisions:
1. SSR for first page (SEO + fast FCP)
2. Client-side for subsequent pages (infinite scroll)
3. Image optimization: WebP + srcset + lazy loading
4. Filter changes: update URL params → API call → re-render list
5. Skeleton screens while loading
```

```tsx
// Core data flow
function ProductListingPage() {
    const router = useRouter();
    
    // Derive filter state from URL (SSR-compatible)
    const filters = useMemo(() => parseFiltersFromURL(router.query), [router.query]);
    
    // Infinite query with cursor-based pagination
    const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
        queryKey: ['products', filters],
        queryFn: ({ pageParam }) => fetchProducts({ ...filters, cursor: pageParam }),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5 * 60 * 1000, // cache for 5 min
    });
    
    // Update URL when filters change (without page reload)
    const updateFilters = useCallback((newFilters) => {
        router.push({ query: serializeFilters(newFilters) }, undefined, { shallow: true });
    }, [router]);
    
    const allProducts = data?.pages.flatMap(page => page.products) ?? [];
    
    return (
        <div className="plp">
            <FilterSidebar filters={filters} onChange={updateFilters} />
            <div className="content">
                <SortBar sortBy={filters.sortBy} onChange={(sort) => updateFilters({ ...filters, sortBy: sort })} />
                <ProductGrid products={allProducts} isLoading={isLoading} />
                <InfiniteScrollTrigger 
                    hasMore={hasNextPage} 
                    onLoadMore={fetchNextPage} 
                />
            </div>
        </div>
    );
}

// Image optimization
function ProductCard({ product }) {
    return (
        <article className="product-card">
            <img
                src={product.imageUrl}
                srcSet={`${product.imageUrl}?w=200 200w, ${product.imageUrl}?w=400 400w`}
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
                alt={product.name}
                width={200}
                height={250}
            />
            <h3>{product.name}</h3>
            <div className="price">
                <span className="sale-price">₹{product.salePrice}</span>
                {product.mrp > product.salePrice && (
                    <>
                        <span className="mrp">₹{product.mrp}</span>
                        <span className="discount">
                            {Math.round((1 - product.salePrice / product.mrp) * 100)}% off
                        </span>
                    </>
                )}
            </div>
            <div className="rating">
                {'★'.repeat(Math.floor(product.rating))}
                <span>({product.reviewCount})</span>
            </div>
        </article>
    );
}
```

---

## Round 4: Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"What's the most complex frontend problem you've solved?"**
2. **"How do you ensure code quality in your team?"**
3. **"Why Flipkart?"**

---

## 🎯 Key Takeaways
- Flipkart's Frontend Machine Coding is **90 min build** — practice building complete components quickly
- **Multi-Select Dropdown** is Flipkart's most common machine coding question
- **JS polyfills** (reduce, bind, map, filter) are tested in every Flipkart Frontend interview
- **Event Loop** output prediction is a guaranteed question — practice with complex nested examples
- **Product Listing Page** design is Flipkart's signature frontend system design
- **SSR + Client hydration** pattern for SEO + performance is expected knowledge
- Practice building complete, styled, accessible components in 90 minutes using CodeSandbox

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | React Component, UI/UX, a11y |
| Round 2 | Hard | JS Internals, Polyfills, Event Loop |
| Round 3 | Hard | E-commerce PLP, SEO, Performance |
| Round 4 | Medium | Behavioral, Code Quality |
