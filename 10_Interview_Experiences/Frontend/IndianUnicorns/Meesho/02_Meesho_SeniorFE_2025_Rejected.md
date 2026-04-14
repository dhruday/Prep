# Meesho — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — mobile-first performance strategy was weak

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Multi-Select Filter Sidebar with Search, Count, and Apply**
   - Accordion categories, search within category, selected count badges, clear all

### 💡 Interview-Ready Answer

```javascript
function FilterSidebar({ categories, onApply }) {
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState({});
  const [searchTerms, setSearchTerms] = useState({});
  const [pending, setPending] = useState({}); // Pending before "Apply"
  
  const toggleExpand = (category) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  const toggleOption = (category, value) => {
    setPending(prev => {
      const catSelections = new Set(prev[category] || []);
      if (catSelections.has(value)) catSelections.delete(value);
      else catSelections.add(value);
      return { ...prev, [category]: [...catSelections] };
    });
  };
  
  const clearCategory = (category) => {
    setPending(prev => ({ ...prev, [category]: [] }));
  };
  
  const clearAll = () => {
    setPending({});
    setSelected({});
    onApply({});
  };
  
  const handleApply = () => {
    setSelected(pending);
    onApply(pending);
  };
  
  const totalSelected = Object.values(pending).reduce((sum, arr) => sum + arr.length, 0);
  const hasChanges = JSON.stringify(selected) !== JSON.stringify(pending);
  
  return (
    <aside className="filter-sidebar" role="complementary" aria-label="Product filters">
      <div className="filter-header">
        <h2>Filters</h2>
        {totalSelected > 0 && (
          <button onClick={clearAll} className="clear-all" aria-label="Clear all filters">
            Clear All ({totalSelected})
          </button>
        )}
      </div>
      
      {categories.map(category => {
        const isExpanded = expanded[category.name] ?? false;
        const catPending = pending[category.name] || [];
        const searchTerm = searchTerms[category.name] || '';
        
        const filteredOptions = category.options.filter(opt =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return (
          <div key={category.name} className="filter-category">
            <button
              className="category-header"
              onClick={() => toggleExpand(category.name)}
              aria-expanded={isExpanded}
              aria-controls={`filter-${category.name}`}
            >
              <span>{category.name}</span>
              {catPending.length > 0 && (
                <span className="count-badge" aria-label={`${catPending.length} selected`}>
                  {catPending.length}
                </span>
              )}
              <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
            </button>
            
            {isExpanded && (
              <div id={`filter-${category.name}`} className="category-content" role="group">
                {/* Search within category (show if > 5 options) */}
                {category.options.length > 5 && (
                  <input
                    type="search"
                    placeholder={`Search ${category.name}`}
                    value={searchTerm}
                    onChange={e => setSearchTerms(prev => ({
                      ...prev, [category.name]: e.target.value
                    }))}
                    aria-label={`Search in ${category.name}`}
                  />
                )}
                
                {/* Options */}
                <div className="options-list" style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {filteredOptions.map(option => (
                    <label key={option.value} className="option-item">
                      <input
                        type="checkbox"
                        checked={catPending.includes(option.value)}
                        onChange={() => toggleOption(category.name, option.value)}
                      />
                      <span className="option-label">{option.label}</span>
                      <span className="option-count" aria-label={`${option.count} products`}>
                        ({option.count})
                      </span>
                    </label>
                  ))}
                  
                  {filteredOptions.length === 0 && (
                    <p className="no-results">No matching options</p>
                  )}
                </div>
                
                {catPending.length > 0 && (
                  <button onClick={() => clearCategory(category.name)} className="clear-cat">
                    Clear {category.name}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Apply Button (sticky at bottom) */}
      <div className="filter-footer">
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className="apply-btn"
        >
          Apply Filters {totalSelected > 0 ? `(${totalSelected})` : ''}
        </button>
      </div>
    </aside>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Array.prototype.flat with configurable depth**
2. **Explain Event Delegation with example**
3. **What is the Temporal Dead Zone?**

### 💡 Array.flat Polyfill

```javascript
Array.prototype.myFlat = function(depth = 1) {
  if (depth < 1) return this.slice(); // depth 0 → return copy
  
  const result = [];
  
  for (let i = 0; i < this.length; i++) {
    if (!(i in this)) continue; // Handle sparse arrays
    
    const item = this[i];
    
    if (Array.isArray(item) && depth > 0) {
      // Recursively flatten with depth - 1
      const flattened = item.myFlat(depth - 1);
      result.push(...flattened);
    } else {
      result.push(item);
    }
  }
  
  return result;
};

// Iterative version (avoids stack overflow for deep arrays):
Array.prototype.myFlatIterative = function(depth = 1) {
  let result = [...this];
  
  for (let d = 0; d < depth; d++) {
    let hasNested = false;
    const next = [];
    
    for (const item of result) {
      if (Array.isArray(item)) {
        next.push(...item);
        hasNested = true;
      } else {
        next.push(item);
      }
    }
    
    result = next;
    if (!hasNested) break; // No more nested arrays
  }
  
  return result;
};

// Infinity depth (flatten completely):
// [1, [2, [3, [4]]]].myFlat(Infinity) → [1, 2, 3, 4]

// Event Delegation:
// Instead of attaching listener to each <li>, attach to parent <ul>
document.querySelector('ul').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return; // Clicked outside any <li>
  
  // Handle click on li
  console.log('Clicked:', li.textContent);
});
// Benefits: works for dynamically added items, less memory (1 listener vs N)

// Temporal Dead Zone (TDZ):
// let and const are hoisted but NOT initialized until their declaration
let x = 10; // OK
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 20;     // TDZ for y: from block start to this line
// var is hoisted AND initialized to undefined (no TDZ)
```

---

## 🎯 Key Takeaways
- Meesho FE = **e-commerce filter UI** is their bread-and-butter question
- **Multi-select filter** with accordion, search, count badges, apply — complete pattern
- **Pending vs Applied state**: don't fire API on every checkbox, batch with "Apply" button
- **Array.flat polyfill** — handle sparse arrays, depth parameter, `Infinity` for full flatten
- **Iterative flat** avoids stack overflow for deeply nested arrays
- **Event Delegation** with `closest()` — essential for dynamic list UIs
- **TDZ** = let/const are hoisted but uninitialized (ReferenceError, not undefined)
- Meesho rejected on **mobile-first perf** — study: code splitting, LQIP images, skeleton screens

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium | Filter Sidebar, Accordion, Multi-Select |
| JavaScript | Medium | Array.flat, Event Delegation, TDZ |
| System Design | Hard | Mobile-First E-Commerce, Performance |
| HM | Medium | Behavioral |
