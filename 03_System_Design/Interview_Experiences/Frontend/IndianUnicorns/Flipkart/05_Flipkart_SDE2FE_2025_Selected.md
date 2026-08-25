# Flipkart — SDE-2 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-2 Frontend |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Flipkart Supermart |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Product Comparison Table** (Flipkart's actual question)
- Compare 2-4 products side by side
- Feature rows: specifications, price, rating, availability
- Sticky header (product names stay visible on scroll)
- Highlight differences between products (visual indicator)
- Responsive: horizontal scroll on mobile, full table on desktop
- Remove product from comparison

### 💡 Product Comparison Table

```javascript
class ComparisonTable {
  constructor(container, options = {}) {
    this.container = container;
    this.products = options.products || [];
    this.maxProducts = options.maxProducts || 4;
    this.features = this._extractAllFeatures();
    
    this.render();
  }
  
  _extractAllFeatures() {
    // Collect all unique feature keys from all products, preserving order
    const featureSet = new Map(); // key → category
    
    for (const product of this.products) {
      for (const spec of product.specifications) {
        for (const [key, value] of Object.entries(spec.features)) {
          if (!featureSet.has(key)) {
            featureSet.set(key, spec.category);
          }
        }
      }
    }
    
    return featureSet;
  }
  
  render() {
    if (this.products.length === 0) {
      this.container.innerHTML = '<p class="empty-state">Add products to compare</p>';
      return;
    }
    
    const html = `
      <div class="comparison-wrapper" role="region" aria-label="Product comparison" tabindex="0">
        <table class="comparison-table" role="grid">
          <thead class="sticky-header">
            <tr>
              <th class="feature-header" scope="col">Feature</th>
              ${this.products.map((p, i) => `
                <th scope="col" class="product-header">
                  <div class="product-card">
                    <img src="${this._sanitize(p.image)}" alt="${this._sanitize(p.name)}" 
                         class="product-img" loading="lazy" width="120" height="120">
                    <h3 class="product-name">${this._sanitize(p.name)}</h3>
                    <div class="product-price">₹${p.price.toLocaleString('en-IN')}</div>
                    <div class="product-rating" aria-label="Rating: ${p.rating} out of 5">
                      ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}
                      <span>(${p.reviewCount})</span>
                    </div>
                    <button class="btn-remove" data-index="${i}" 
                            aria-label="Remove ${this._sanitize(p.name)} from comparison">✕</button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${this._renderFeatureRows()}
          </tbody>
        </table>
      </div>
    `;
    
    this.container.innerHTML = html;
    this.attachEventListeners();
  }
  
  _renderFeatureRows() {
    let html = '';
    let currentCategory = '';
    
    for (const [feature, category] of this.features) {
      // Category header row
      if (category !== currentCategory) {
        currentCategory = category;
        html += `
          <tr class="category-row">
            <td colspan="${this.products.length + 1}" class="category-header">
              <strong>${this._sanitize(category)}</strong>
            </td>
          </tr>
        `;
      }
      
      // Feature values for each product
      const values = this.products.map(p => this._getFeatureValue(p, feature));
      const isDifferent = this._hasDifferences(values);
      
      html += `
        <tr class="${isDifferent ? 'row-different' : ''}">
          <td class="feature-name">${this._sanitize(feature)}</td>
          ${values.map((val, i) => {
            const isBest = isDifferent && this._isBestValue(feature, val, values);
            return `
              <td class="feature-value ${isBest ? 'best-value' : ''}" 
                  ${isDifferent ? 'aria-label="' + (isBest ? 'Best: ' : '') + this._sanitize(feature) + ': ' + this._sanitize(val) + '"' : ''}>
                ${this._sanitize(val)}
                ${isBest ? '<span class="best-badge" aria-hidden="true">✓ Best</span>' : ''}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }
    
    return html;
  }
  
  _getFeatureValue(product, featureKey) {
    for (const spec of product.specifications) {
      if (spec.features[featureKey] !== undefined) {
        return String(spec.features[featureKey]);
      }
    }
    return '—'; // Not available
  }
  
  _hasDifferences(values) {
    const nonEmpty = values.filter(v => v !== '—');
    return new Set(nonEmpty).size > 1;
  }
  
  _isBestValue(feature, value, allValues) {
    if (value === '—') return false;
    
    // Numeric features: higher is usually better (except price, weight)
    const lowerIsBetter = ['Price', 'Weight', 'Response Time', 'Boot Time'];
    const numericValues = allValues
      .map(v => parseFloat(v.replace(/[^\d.]/g, '')))
      .filter(v => !isNaN(v));
    
    if (numericValues.length >= 2) {
      const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
      if (isNaN(numValue)) return false;
      
      if (lowerIsBetter.some(f => feature.includes(f))) {
        return numValue === Math.min(...numericValues);
      }
      return numValue === Math.max(...numericValues);
    }
    
    return false;
  }
  
  removeProduct(index) {
    this.products.splice(index, 1);
    this.features = this._extractAllFeatures();
    this.render();
  }
  
  addProduct(product) {
    if (this.products.length >= this.maxProducts) {
      throw new Error(`Maximum ${this.maxProducts} products allowed for comparison`);
    }
    this.products.push(product);
    this.features = this._extractAllFeatures();
    this.render();
  }
  
  attachEventListeners() {
    // Remove buttons
    this.container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeProduct(parseInt(btn.dataset.index));
      });
    });
    
    // Keyboard navigation for horizontal scroll
    const wrapper = this.container.querySelector('.comparison-wrapper');
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') wrapper.scrollLeft += 200;
      if (e.key === 'ArrowLeft') wrapper.scrollLeft -= 200;
    });
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// CSS for sticky header and responsive behavior:
/*
.comparison-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.row-different { background: #fff8e1; }
.best-value { background: #e8f5e9; font-weight: 600; }
.best-badge { 
  display: inline-block; 
  font-size: 11px; 
  color: #2e7d32; 
  background: #c8e6c9; 
  padding: 2px 6px; 
  border-radius: 4px; 
}

@media (max-width: 768px) {
  .feature-header { min-width: 120px; position: sticky; left: 0; background: white; z-index: 5; }
  .product-header { min-width: 180px; }
}
*/
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement `JSON.stringify` from scratch** (handle all types including circular references)

### 💡 JSON.stringify Polyfill

```javascript
function jsonStringify(value, seen = new WeakSet()) {
  // null
  if (value === null) return 'null';
  
  // undefined, function, symbol → undefined (skip in objects)
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return undefined; // Arrays will get 'null', objects will skip
  }
  
  // boolean
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  
  // number
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 'null';
    return String(value);
  }
  
  // bigint → throw
  if (typeof value === 'bigint') {
    throw new TypeError('Do not know how to serialize a BigInt');
  }
  
  // string
  if (typeof value === 'string') {
    return '"' + value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\b]/g, '\\b')
      .replace(/\f/g, '\\f') + '"';
  }
  
  // Date → toISOString
  if (value instanceof Date) {
    return '"' + value.toISOString() + '"';
  }
  
  // toJSON method
  if (typeof value.toJSON === 'function') {
    return jsonStringify(value.toJSON(), seen);
  }
  
  // Circular reference check
  if (typeof value === 'object') {
    if (seen.has(value)) {
      throw new TypeError('Converting circular structure to JSON');
    }
    seen.add(value);
  }
  
  // Array
  if (Array.isArray(value)) {
    const items = value.map(item => {
      const result = jsonStringify(item, seen);
      return result === undefined ? 'null' : result; // undefined → null in arrays
    });
    seen.delete(value);
    return '[' + items.join(',') + ']';
  }
  
  // Object
  const entries = Object.keys(value)
    .map(key => {
      const val = jsonStringify(value[key], seen);
      if (val === undefined) return undefined; // Skip undefined/function/symbol values
      return '"' + key + '":' + val;
    })
    .filter(entry => entry !== undefined);
  
  seen.delete(value);
  return '{' + entries.join(',') + '}';
}
```

---

## 🎯 Key Takeaways
- Flipkart FE = **Machine Coding (comparison table) + JS deep dive (JSON.stringify)**
- **Comparison Table**: sticky header, difference highlighting, "Best" badges for numeric comparisons
- **Feature extraction**: collect all unique feature keys across all products (Map preserves order)
- **Best value detection**: parse numeric values, higher-is-better except for price/weight
- **Responsive**: `overflow-x: auto` + sticky first column + horizontal scroll
- **JSON.stringify**: handle all types (null, undefined, Date, BigInt, circular references with WeakSet)
- **Circular reference**: WeakSet tracks visited objects → throw TypeError on cycle
- Flipkart interviews: machine coding is heavily weighted — **complete working solution wins**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Comparison Table, CSS Sticky, Responsive |
| JS Deep Dive | Medium-Hard | JSON.stringify, Edge Cases |
| Technical | Medium | React Performance, Optimization |
| HM | Medium | Ownership, Problem Solving |
