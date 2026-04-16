# Target — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Minneapolis, MN (Hybrid) |
| **Source** | [Glassdoor](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Dynamic Product Filtering System
- Product grid with responsive layout
- Multi-select filters: category, brand, price range, ratings
- URL-based filter state (shareable links)
- Filter count badges
- Active filters chips with "remove" capability
- Sort: price low→high, high→low, rating, newest

### 💡 Product Filter System

```javascript
class ProductFilterPage {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.filters = this.parseURLFilters();
    this.sort = this.filters._sort || 'relevance';
    this.filterConfigs = [
      { key: 'category', label: 'Category', type: 'multi-select', options: [] },
      { key: 'brand', label: 'Brand', type: 'multi-select', options: [] },
      { key: 'priceRange', label: 'Price', type: 'range', min: 0, max: 1000 },
      { key: 'rating', label: 'Min Rating', type: 'single-select', options: ['4+', '3+', '2+', '1+'] }
    ];
  }
  
  setProducts(products) {
    this.products = products;
    
    // Extract unique options from data
    this.filterConfigs.find(f => f.key === 'category').options = 
      [...new Set(products.map(p => p.category))];
    this.filterConfigs.find(f => f.key === 'brand').options = 
      [...new Set(products.map(p => p.brand))];
    
    this.render();
  }
  
  get filteredProducts() {
    let result = this.products.filter(p => {
      // Category filter
      if (this.filters.category?.length && !this.filters.category.includes(p.category)) return false;
      // Brand filter
      if (this.filters.brand?.length && !this.filters.brand.includes(p.brand)) return false;
      // Price range
      if (this.filters.priceRange) {
        const [min, max] = this.filters.priceRange;
        if (p.price < min || p.price > max) return false;
      }
      // Rating
      if (this.filters.rating) {
        const minRating = parseInt(this.filters.rating);
        if (p.rating < minRating) return false;
      }
      return true;
    });
    
    // Sort
    switch (this.sort) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    }
    
    return result;
  }
  
  // Active filters for chips display
  get activeFilters() {
    const active = [];
    for (const [key, value] of Object.entries(this.filters)) {
      if (key.startsWith('_')) continue;
      if (Array.isArray(value)) {
        value.forEach(v => active.push({ key, value: v, label: `${key}: ${v}` }));
      } else if (value && key === 'priceRange') {
        active.push({ key, value, label: `$${value[0]} - $${value[1]}` });
      } else if (value) {
        active.push({ key, value, label: `${key}: ${value}` });
      }
    }
    return active;
  }
  
  render() {
    const filtered = this.filteredProducts;
    
    this.container.innerHTML = `
      <div class="filter-page" role="main">
        <!-- Filter Sidebar -->
        <aside class="filter-sidebar" role="navigation" aria-label="Product filters">
          ${this.filterConfigs.map(config => this.renderFilter(config)).join('')}
        </aside>
        
        <!-- Main content -->
        <main class="product-main">
          <!-- Sort + result count -->
          <div class="results-header">
            <span class="result-count">${filtered.length} results</span>
            <select class="sort-select" aria-label="Sort products">
              <option value="relevance" ${this.sort === 'relevance' ? 'selected' : ''}>Relevance</option>
              <option value="price-asc" ${this.sort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-desc" ${this.sort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
              <option value="rating" ${this.sort === 'rating' ? 'selected' : ''}>Top Rated</option>
              <option value="newest" ${this.sort === 'newest' ? 'selected' : ''}>Newest</option>
            </select>
          </div>
          
          <!-- Active filter chips -->
          ${this.activeFilters.length > 0 ? `
            <div class="active-filters" role="group" aria-label="Active filters">
              ${this.activeFilters.map(f => `
                <button class="filter-chip" data-key="${f.key}" data-value="${this._sanitize(String(f.value))}">
                  ${this._sanitize(f.label)} ×
                </button>
              `).join('')}
              <button class="clear-all">Clear All</button>
            </div>
          ` : ''}
          
          <!-- Product grid -->
          <div class="product-grid" role="list">
            ${filtered.length === 0
              ? '<p class="no-results">No products match your filters. Try removing some filters.</p>'
              : filtered.map(p => `
                <article class="product-card" role="listitem">
                  <img src="${this._sanitize(p.image)}" alt="${this._sanitize(p.name)}" loading="lazy">
                  <div class="product-info">
                    <h3>${this._sanitize(p.name)}</h3>
                    <p class="product-brand">${this._sanitize(p.brand)}</p>
                    <div class="product-rating" aria-label="${p.rating} out of 5 stars">
                      ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}
                      <span class="rating-count">(${p.reviewCount})</span>
                    </div>
                    <p class="product-price">$${p.price.toFixed(2)}</p>
                  </div>
                </article>
              `).join('')}
          </div>
        </main>
      </div>
    `;
    
    this.attachListeners();
    this.updateURL();
  }
  
  renderFilter(config) {
    const active = this.filters[config.key];
    
    if (config.type === 'multi-select') {
      return `
        <fieldset class="filter-group">
          <legend>${config.label} ${active?.length ? `(${active.length})` : ''}</legend>
          ${config.options.map(opt => {
            const count = this.getFilterCount(config.key, opt);
            const checked = active?.includes(opt);
            return `
              <label class="filter-option">
                <input type="checkbox" name="${config.key}" value="${this._sanitize(opt)}"
                       ${checked ? 'checked' : ''}>
                ${this._sanitize(opt)} <span class="count">(${count})</span>
              </label>
            `;
          }).join('')}
        </fieldset>
      `;
    }
    
    if (config.type === 'range') {
      const [min, max] = active || [config.min, config.max];
      return `
        <fieldset class="filter-group">
          <legend>${config.label}</legend>
          <div class="range-inputs">
            <input type="number" class="range-min" value="${min}" min="${config.min}" max="${config.max}"
                   aria-label="Minimum price">
            <span>—</span>
            <input type="number" class="range-max" value="${max}" min="${config.min}" max="${config.max}"
                   aria-label="Maximum price">
          </div>
        </fieldset>
      `;
    }
    
    if (config.type === 'single-select') {
      return `
        <fieldset class="filter-group">
          <legend>${config.label}</legend>
          ${config.options.map(opt => `
            <label class="filter-option">
              <input type="radio" name="${config.key}" value="${opt}"
                     ${active === opt ? 'checked' : ''}>
              ${opt}
            </label>
          `).join('')}
        </fieldset>
      `;
    }
    
    return '';
  }
  
  getFilterCount(filterKey, filterValue) {
    // Count products that would match if this filter option were added
    return this.products.filter(p => {
      // Apply all OTHER filters, but check this specific value
      for (const [key, value] of Object.entries(this.filters)) {
        if (key.startsWith('_')) continue;
        if (key === filterKey) continue; // Skip the filter we're counting for
        
        if (Array.isArray(value) && value.length > 0) {
          if (!value.includes(p[key])) return false;
        }
      }
      return p[filterKey] === filterValue;
    }).length;
  }
  
  // Parse filters from URL query string
  parseURLFilters() {
    const params = new URLSearchParams(window.location.search);
    const filters = {};
    
    for (const [key, value] of params) {
      if (key === '_sort') {
        filters._sort = value;
        continue;
      }
      // Multi-value: category=Electronics&category=Books
      if (filters[key]) {
        if (!Array.isArray(filters[key])) filters[key] = [filters[key]];
        filters[key].push(value);
      } else {
        filters[key] = value;
      }
    }
    
    return filters;
  }
  
  // Sync filters to URL
  updateURL() {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(this.filters)) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value) {
        params.set(key, String(value));
      }
    }
    
    if (this.sort !== 'relevance') params.set('_sort', this.sort);
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newURL);
  }
  
  // Remove a specific filter value
  removeFilter(key, value) {
    if (Array.isArray(this.filters[key])) {
      this.filters[key] = this.filters[key].filter(v => v !== value);
      if (this.filters[key].length === 0) delete this.filters[key];
    } else {
      delete this.filters[key];
    }
    this.render();
  }
  
  clearAllFilters() {
    this.filters = {};
    this.render();
  }
  
  attachListeners() {
    // Checkbox/radio filters
    this.container.querySelectorAll('.filter-option input').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.name;
        const value = input.value;
        
        if (input.type === 'checkbox') {
          if (!this.filters[key]) this.filters[key] = [];
          if (input.checked) {
            this.filters[key].push(value);
          } else {
            this.filters[key] = this.filters[key].filter(v => v !== value);
          }
        } else {
          this.filters[key] = value;
        }
        
        this.render();
      });
    });
    
    // Price range
    this.container.querySelectorAll('.range-min, .range-max').forEach(input => {
      input.addEventListener('change', () => {
        const min = parseInt(this.container.querySelector('.range-min')?.value) || 0;
        const max = parseInt(this.container.querySelector('.range-max')?.value) || 1000;
        this.filters.priceRange = [min, max];
        this.render();
      });
    });
    
    // Sort
    this.container.querySelector('.sort-select')?.addEventListener('change', (e) => {
      this.sort = e.target.value;
      this.render();
    });
    
    // Remove filter chip
    this.container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.removeFilter(chip.dataset.key, chip.dataset.value);
      });
    });
    
    // Clear all
    this.container.querySelector('.clear-all')?.addEventListener('click', () => {
      this.clearAllFilters();
    });
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Target FE = **Product filtering with URL state + filter counts + chips**
- **URL-based filter state**: `URLSearchParams` for parse/serialize — shareable + bookmarkable
- **history.replaceState**: update URL without page reload — filter changes don't create history entries
- **Filter counts**: show how many products each option would match — requires counting with OTHER filters applied
- **Active filter chips**: visual indicators of applied filters with remove button — important for UX
- **Multi-select filters**: checkboxes → array of selected values — append/remove on change
- **Price range**: two number inputs — validate min < max, apply as array [min, max]
- Target FE = **e-commerce filtering patterns** — URL sync, faceted search, responsive grid

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Filtering, URL State, Product Grid |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
