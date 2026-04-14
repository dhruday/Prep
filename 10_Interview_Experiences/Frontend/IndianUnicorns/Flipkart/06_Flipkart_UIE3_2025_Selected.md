# Flipkart — Senior Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | UI Engineer 3 |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Multi-Tab Product Comparison Tool
- Side-by-side comparison of up to 4 products
- Sticky product headers (scroll with content)
- Highlight best value in each spec row
- Add/remove products with search
- Responsive: horizontal scroll on mobile
- Share comparison via URL

```javascript
/**
 * Product Comparison Tool:
 * - Up to 4 products side by side
 * - Spec rows with highlight for best value
 * - Sticky headers that pin on scroll
 * - URL-based state for sharing
 * - Responsive with horizontal scroll
 */
class ProductComparisonTool {
  constructor(container) {
    this.container = container;
    this.products = [];     // [{ id, name, image, price, specs: { key: value } }]
    this.maxProducts = 4;
    this.allSpecs = [];     // Union of all spec keys
    this.searchQuery = '';
    this.searchResults = [];
    this.scrollableRef = null;
    
    // Load from URL
    this.loadFromURL();
    this.render();
  }
  
  setProducts(products) {
    this.products = products.slice(0, this.maxProducts);
    this.allSpecs = this.computeAllSpecs();
    this.updateURL();
    this.render();
  }
  
  addProduct(product) {
    if (this.products.length >= this.maxProducts) {
      this.showMessage('Maximum 4 products can be compared');
      return;
    }
    if (this.products.some(p => p.id === product.id)) {
      this.showMessage('Product already in comparison');
      return;
    }
    this.products.push(product);
    this.allSpecs = this.computeAllSpecs();
    this.updateURL();
    this.render();
  }
  
  removeProduct(productId) {
    this.products = this.products.filter(p => p.id !== productId);
    this.allSpecs = this.computeAllSpecs();
    this.updateURL();
    this.render();
  }
  
  computeAllSpecs() {
    const specSet = new Set();
    for (const product of this.products) {
      if (product.specs) {
        Object.keys(product.specs).forEach(k => specSet.add(k));
      }
    }
    return [...specSet];
  }
  
  /**
   * Determine "best" value for a spec across products.
   * For numeric specs (price, weight): lowest is best.
   * For ratings, battery: highest is best.
   * For non-numeric: no highlight.
   */
  findBestValue(specKey) {
    const values = this.products.map(p => ({
      productId: p.id,
      value: p.specs?.[specKey],
      numeric: this.extractNumeric(p.specs?.[specKey])
    })).filter(v => v.numeric !== null);
    
    if (values.length < 2) return null;
    
    // Heuristic: "price", "weight", "cost" → lower is better
    const lowerIsBetter = /price|weight|cost|thickness/i.test(specKey);
    // "rating", "battery", "storage", "ram", "score" → higher is better
    const higherIsBetter = /rating|battery|storage|ram|score|speed|size|resolution/i.test(specKey);
    
    if (!lowerIsBetter && !higherIsBetter) return null;
    
    const sorted = [...values].sort((a, b) => a.numeric - b.numeric);
    return lowerIsBetter ? sorted[0].productId : sorted[sorted.length - 1].productId;
  }
  
  extractNumeric(value) {
    if (value == null) return null;
    const match = String(value).match(/([\d,]+\.?\d*)/);
    if (!match) return null;
    return parseFloat(match[1].replace(/,/g, ''));
  }
  
  render() {
    if (this.products.length === 0) {
      this.container.innerHTML = `
        <div class="comparison-empty">
          <h2>Compare Products</h2>
          <p>Search and add up to 4 products to compare</p>
          ${this.renderSearchBar()}
        </div>
      `;
      this.attachSearchListeners();
      return;
    }
    
    const columnWidth = Math.max(200, 100 / this.products.length);
    
    this.container.innerHTML = `
      <div class="comparison-tool">
        ${this.renderSearchBar()}
        
        <div class="comparison-table-wrapper" style="overflow-x:auto">
          <table class="comparison-table" role="grid" aria-label="Product comparison">
            <!-- Product Headers (sticky) -->
            <thead>
              <tr class="product-headers" style="position:sticky; top:0; z-index:2; background:#fff">
                <th class="spec-label-col" style="min-width:150px; position:sticky; left:0; z-index:3">Specification</th>
                ${this.products.map(p => `
                  <th class="product-header" style="min-width:${columnWidth}px">
                    <button class="remove-btn" data-id="${p.id}" aria-label="Remove ${this.sanitize(p.name)}">×</button>
                    <img src="${this.sanitize(p.image)}" alt="${this.sanitize(p.name)}" 
                         loading="lazy" width="120" height="120">
                    <h3>${this.sanitize(p.name)}</h3>
                    <p class="price">₹${p.price?.toLocaleString('en-IN')}</p>
                  </th>
                `).join('')}
                ${this.products.length < this.maxProducts ? `
                  <th class="add-product-col" style="min-width:150px">
                    <button class="add-product-btn">+ Add Product</button>
                  </th>
                ` : ''}
              </tr>
            </thead>
            
            <!-- Spec Rows -->
            <tbody>
              <!-- Price row -->
              <tr>
                <td class="spec-label" style="position:sticky; left:0; background:#f9fafb">Price</td>
                ${this.products.map(p => {
                  const bestId = this.findBestValue('price');
                  const isBest = bestId === p.id;
                  return `
                    <td class="${isBest ? 'best-value' : ''}">
                      ₹${p.price?.toLocaleString('en-IN')}
                      ${isBest ? '<span class="best-badge">Best Price</span>' : ''}
                    </td>
                  `;
                }).join('')}
                ${this.products.length < this.maxProducts ? '<td></td>' : ''}
              </tr>
              
              ${this.allSpecs.map(spec => {
                const bestId = this.findBestValue(spec);
                return `
                  <tr>
                    <td class="spec-label" style="position:sticky; left:0; background:#f9fafb">
                      ${this.sanitize(spec)}
                    </td>
                    ${this.products.map(p => {
                      const value = p.specs?.[spec];
                      const isBest = bestId === p.id;
                      return `
                        <td class="${isBest ? 'best-value' : ''}" 
                            ${!value ? 'style="color:#9ca3af"' : ''}>
                          ${value ? this.sanitize(String(value)) : '—'}
                          ${isBest ? '<span class="best-badge">Best</span>' : ''}
                        </td>
                      `;
                    }).join('')}
                    ${this.products.length < this.maxProducts ? '<td></td>' : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    this.attachListeners();
    this.attachSearchListeners();
  }
  
  renderSearchBar() {
    return `
      <div class="search-bar" style="position:relative">
        <input type="search" class="product-search" 
               placeholder="Search products to compare..."
               value="${this.sanitize(this.searchQuery)}"
               aria-label="Search products"
               autocomplete="off">
        <div class="search-results" hidden role="listbox">
          ${this.searchResults.map(p => `
            <div class="search-result" data-product='${JSON.stringify(p).replace(/'/g, '&#39;')}' role="option">
              <img src="${this.sanitize(p.image)}" alt="" width="40" height="40">
              <div>
                <div>${this.sanitize(p.name)}</div>
                <div class="search-price">₹${p.price?.toLocaleString('en-IN')}</div>
              </div>
            </div>
          `).join('')}
          ${this.searchResults.length === 0 && this.searchQuery ? '<div class="no-results">No products found</div>' : ''}
        </div>
      </div>
    `;
  }
  
  // URL state management
  updateURL() {
    const ids = this.products.map(p => p.id).join(',');
    const params = new URLSearchParams();
    if (ids) params.set('compare', ids);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }
  
  loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('compare');
    if (ids) {
      // In real app: fetch products by IDs
      // For now, just store IDs to be populated later
      this._pendingIds = ids.split(',');
    }
  }
  
  attachListeners() {
    this.container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => this.removeProduct(btn.dataset.id));
    });
  }
  
  attachSearchListeners() {
    const input = this.container.querySelector('.product-search');
    const results = this.container.querySelector('.search-results');
    if (!input) return;
    
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        this.searchQuery = input.value.trim();
        if (this.searchQuery.length < 2) {
          results.hidden = true;
          return;
        }
        // Simulate API search
        this.searchResults = await this.searchProducts(this.searchQuery);
        results.hidden = false;
        results.innerHTML = this.searchResults.map(p => `
          <div class="search-result" data-id="${p.id}" role="option">
            <img src="${this.sanitize(p.image)}" alt="" width="40" height="40">
            <span>${this.sanitize(p.name)} — ₹${p.price?.toLocaleString('en-IN')}</span>
          </div>
        `).join('');
        
        results.querySelectorAll('.search-result').forEach(el => {
          el.addEventListener('click', () => {
            const product = this.searchResults.find(p => p.id === el.dataset.id);
            if (product) this.addProduct(product);
            results.hidden = true;
            input.value = '';
          });
        });
      }, 300);
    });
  }
  
  async searchProducts(query) {
    // In real app: fetch from API
    return [];
  }
  
  showMessage(msg) {
    const el = document.createElement('div');
    el.className = 'toast-message';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Flipkart FE SDE-3 = **Product comparison table with best-value highlights + sticky + URL state**
- **Sticky headers + columns**: `position:sticky; top:0` for header, `left:0` for first column — z-index layering
- **Best value detection**: heuristic based on spec name — `price/weight` → lower better, `rating/battery` → higher better
- **Numeric extraction**: regex `/([\d,]+\.?\d*)/` — handles "6000 mAh", "₹12,999", "6.7 inches"
- **URL state**: `?compare=id1,id2,id3` — shareable comparison links
- **Search with debounce**: 300ms delay on input — prevents API spam during typing
- **Responsive**: `overflow-x:auto` wrapper with `min-width` per column — horizontal scroll on mobile
- Flipkart FE = **e-commerce UI patterns** — product comparison, search, responsive tables, URL-driven state

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Comparison Table, Sticky, URL State |
| Technical 1 | Hard | React, JS Concepts |
| Technical 2 | Hard | System Design |
| HM | Medium | Culture Fit |
