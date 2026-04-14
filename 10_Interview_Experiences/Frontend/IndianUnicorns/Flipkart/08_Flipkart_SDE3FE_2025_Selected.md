# Flipkart — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 (Frontend) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JS Deep Dive + Frontend Architecture + Hiring Manager)
- **Timeline:** 10 days
- **Format:** Onsite Bangalore

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Responsive Product Filter & Sort UI**
   - Multi-select category filters (checkbox style)
   - Price range slider with min/max inputs
   - Sort by: price, rating, newest, popularity
   - URL-based state (shareable filter URLs)
   - Debounced search input
   - Show result count per filter option

### 💡 Interview-Ready Answer

```javascript
class ProductFilterUI {
  constructor(container, products) {
    this.container = container;
    this.allProducts = products;
    this.filteredProducts = [...products];

    // Filter state
    this.filters = {
      categories: new Set(),
      brands: new Set(),
      priceMin: 0,
      priceMax: Infinity,
      rating: 0,
      search: '',
    };
    this.sortBy = 'popularity';
    this.sortOrder = 'desc';

    this.debounceTimer = null;

    this.loadFiltersFromURL();
    this.render();
  }

  // ============================
  // URL State Management
  // ============================
  loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('cat')) {
      params.get('cat').split(',').forEach(c => this.filters.categories.add(c));
    }
    if (params.has('brand')) {
      params.get('brand').split(',').forEach(b => this.filters.brands.add(b));
    }
    if (params.has('pmin')) this.filters.priceMin = parseInt(params.get('pmin'));
    if (params.has('pmax')) this.filters.priceMax = parseInt(params.get('pmax'));
    if (params.has('rating')) this.filters.rating = parseInt(params.get('rating'));
    if (params.has('sort')) this.sortBy = params.get('sort');
    if (params.has('q')) this.filters.search = params.get('q');
  }

  updateURL() {
    const params = new URLSearchParams();

    if (this.filters.categories.size > 0) {
      params.set('cat', [...this.filters.categories].join(','));
    }
    if (this.filters.brands.size > 0) {
      params.set('brand', [...this.filters.brands].join(','));
    }
    if (this.filters.priceMin > 0) params.set('pmin', this.filters.priceMin);
    if (this.filters.priceMax < Infinity) params.set('pmax', this.filters.priceMax);
    if (this.filters.rating > 0) params.set('rating', this.filters.rating);
    if (this.sortBy !== 'popularity') params.set('sort', this.sortBy);
    if (this.filters.search) params.set('q', this.filters.search);

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params : ''}`;
    window.history.replaceState(null, '', newURL);
  }

  // ============================
  // Filter + Sort Logic
  // ============================
  applyFilters() {
    this.filteredProducts = this.allProducts.filter(p => {
      if (this.filters.categories.size > 0 && !this.filters.categories.has(p.category)) {
        return false;
      }
      if (this.filters.brands.size > 0 && !this.filters.brands.has(p.brand)) {
        return false;
      }
      if (p.price < this.filters.priceMin || p.price > this.filters.priceMax) {
        return false;
      }
      if (p.rating < this.filters.rating) {
        return false;
      }
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const matchText = (p.name + ' ' + p.brand + ' ' + p.category).toLowerCase();
        if (!matchText.includes(query)) return false;
      }
      return true;
    });

    // Sort
    this.filteredProducts.sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy) {
        case 'price': cmp = a.price - b.price; break;
        case 'rating': cmp = a.rating - b.rating; break;
        case 'newest': cmp = new Date(a.addedDate) - new Date(b.addedDate); break;
        case 'popularity': cmp = a.soldCount - b.soldCount; break;
      }
      return this.sortOrder === 'desc' ? -cmp : cmp;
    });

    this.updateURL();
    this.renderResults();
  }

  // Get count of products matching a specific filter value
  getFilterCount(field, value) {
    return this.allProducts.filter(p => {
      // Apply all OTHER active filters except the one being counted
      if (field !== 'categories' && this.filters.categories.size > 0
          && !this.filters.categories.has(p.category)) return false;
      if (field !== 'brands' && this.filters.brands.size > 0
          && !this.filters.brands.has(p.brand)) return false;
      if (p.price < this.filters.priceMin || p.price > this.filters.priceMax) return false;
      if (p.rating < this.filters.rating) return false;

      return p[field === 'categories' ? 'category' : 'brand'] === value;
    }).length;
  }

  // ============================
  // Render
  // ============================
  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: flex; gap: 20px; font-family: -apple-system, sans-serif;
      max-width: 1200px; margin: 0 auto;
    `;

    // Sidebar filters
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      width: 260px; flex-shrink: 0; position: sticky; top: 0;
      max-height: 100vh; overflow-y: auto; padding: 16px;
      background: #fff; border-radius: 8px; border: 1px solid #E0E0E0;
    `;

    // Search
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Search products...';
    searchInput.value = this.filters.search;
    searchInput.style.cssText = `
      width: 100%; padding: 10px; border: 1px solid #DDD;
      border-radius: 6px; margin-bottom: 16px; font-size: 14px;
      box-sizing: border-box;
    `;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.filters.search = e.target.value;
        this.applyFilters();
      }, 300);
    });
    sidebar.appendChild(searchInput);

    // Category filter
    this.renderCheckboxFilter(sidebar, 'Category', 'categories',
      [...new Set(this.allProducts.map(p => p.category))]);

    // Brand filter
    this.renderCheckboxFilter(sidebar, 'Brand', 'brands',
      [...new Set(this.allProducts.map(p => p.brand))]);

    // Price range
    this.renderPriceRange(sidebar);

    // Rating filter
    this.renderRatingFilter(sidebar);

    // Clear all button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear All Filters';
    clearBtn.style.cssText = `
      width: 100%; padding: 10px; background: none; border: 1px solid #DDD;
      border-radius: 6px; cursor: pointer; margin-top: 16px; font-size: 13px;
      color: #2874F0;
    `;
    clearBtn.addEventListener('click', () => this.clearAllFilters());
    sidebar.appendChild(clearBtn);

    this.container.appendChild(sidebar);

    // Results area
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.style.cssText = 'flex: 1;';
    this.container.appendChild(this.resultsContainer);

    this.applyFilters();
  }

  renderCheckboxFilter(parent, title, filterKey, values) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.cssText = 'font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #333;';
    section.appendChild(heading);

    values.forEach(value => {
      const count = this.getFilterCount(filterKey, value);
      const label = document.createElement('label');
      label.style.cssText = `
        display: flex; align-items: center; gap: 8px; padding: 4px 0;
        cursor: pointer; font-size: 13px;
        ${count === 0 ? 'opacity: 0.4;' : ''}
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.filters[filterKey].has(value);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) this.filters[filterKey].add(value);
        else this.filters[filterKey].delete(value);
        this.applyFilters();
        this.render(); // re-render to update counts
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(`${value} (${count})`));
      section.appendChild(label);
    });

    parent.appendChild(section);
  }

  renderPriceRange(parent) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const heading = document.createElement('h3');
    heading.textContent = 'Price Range';
    heading.style.cssText = 'font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #333;';
    section.appendChild(heading);

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px;';

    const minInput = this.createPriceInput('Min', this.filters.priceMin || '', (val) => {
      this.filters.priceMin = parseInt(val) || 0;
      this.applyFilters();
    });

    const maxInput = this.createPriceInput('Max', this.filters.priceMax === Infinity ? '' : this.filters.priceMax, (val) => {
      this.filters.priceMax = parseInt(val) || Infinity;
      this.applyFilters();
    });

    row.appendChild(minInput);
    row.appendChild(maxInput);
    section.appendChild(row);
    parent.appendChild(section);
  }

  createPriceInput(placeholder, value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = placeholder;
    input.value = value;
    input.style.cssText = `
      width: 50%; padding: 8px; border: 1px solid #DDD;
      border-radius: 4px; font-size: 13px;
    `;
    input.addEventListener('change', (e) => onChange(e.target.value));
    return input;
  }

  renderRatingFilter(parent) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    const heading = document.createElement('h3');
    heading.textContent = 'Minimum Rating';
    heading.style.cssText = 'font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #333;';
    section.appendChild(heading);

    for (let r = 4; r >= 1; r--) {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; font-size: 13px;';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'rating';
      radio.checked = this.filters.rating === r;
      radio.addEventListener('change', () => {
        this.filters.rating = r;
        this.applyFilters();
      });

      label.appendChild(radio);
      label.appendChild(document.createTextNode('★'.repeat(r) + '☆'.repeat(5 - r) + ' & above'));
      section.appendChild(label);
    }

    parent.appendChild(section);
  }

  renderResults() {
    this.resultsContainer.innerHTML = '';

    // Sort bar
    const sortBar = document.createElement('div');
    sortBar.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; background: #fff; border: 1px solid #E0E0E0;
      border-radius: 8px; margin-bottom: 12px;
    `;
    sortBar.innerHTML = `
      <span style="font-size: 14px; color: #666;">
        ${this.filteredProducts.length} of ${this.allProducts.length} products
      </span>
    `;

    const sortSelect = document.createElement('select');
    sortSelect.style.cssText = 'padding: 6px 8px; border: 1px solid #DDD; border-radius: 4px;';
    [
      { value: 'popularity', label: 'Popular' },
      { value: 'price', label: 'Price: Low to High' },
      { value: 'rating', label: 'Rating' },
      { value: 'newest', label: 'Newest First' },
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === this.sortBy) option.selected = true;
      sortSelect.appendChild(option);
    });
    sortSelect.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.sortOrder = this.sortBy === 'price' ? 'asc' : 'desc';
      this.applyFilters();
    });
    sortBar.appendChild(sortSelect);
    this.resultsContainer.appendChild(sortBar);

    // Product grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    `;

    this.filteredProducts.forEach(product => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #fff; border: 1px solid #E0E0E0; border-radius: 8px;
        padding: 12px; cursor: pointer; transition: box-shadow 0.2s;
      `;
      card.addEventListener('mouseenter', () => card.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)');
      card.addEventListener('mouseleave', () => card.style.boxShadow = 'none');

      card.innerHTML = `
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
          ${this.escapeHtml(product.name)}
        </div>
        <div style="color: #666; font-size: 12px;">${this.escapeHtml(product.brand)}</div>
        <div style="font-size: 18px; font-weight: 700; color: #2874F0; margin: 8px 0;">
          ₹${product.price.toLocaleString('en-IN')}
        </div>
        <div style="color: #388E3C; font-size: 13px;">★ ${product.rating}</div>
      `;
      grid.appendChild(card);
    });

    if (this.filteredProducts.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No products match your filters</div>';
    }

    this.resultsContainer.appendChild(grid);
  }

  clearAllFilters() {
    this.filters = {
      categories: new Set(),
      brands: new Set(),
      priceMin: 0,
      priceMax: Infinity,
      rating: 0,
      search: '',
    };
    this.sortBy = 'popularity';
    this.render();
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

## Round 2: JavaScript Deep Dive
**Duration:** 60 minutes

### Topics Discussed
- Virtual DOM reconciliation algorithm
- React Fiber architecture internals
- JavaScript garbage collection (Mark-and-Sweep, Generational)
- Web Worker for heavy filtering on large datasets

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Checkout Flow Frontend**
   - Address selection/add, payment method, order summary
   - AB testing framework integration
   - Progressive enhancement: works without JS

## Round 4: Hiring Manager
**Duration:** 30 minutes

## 🎯 Key Takeaways
- Flipkart machine coding rounds are **e-commerce focused** — filters, sort, cart are the top 3 questions
- **URL-based state** for filters is expected — it enables sharing and SEO
- Filter counts (showing result count per option) is a strong differentiator
- Debounced search is non-negotiable
- Know `history.replaceState` for URL updates without page reload

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Filters, Sort, URL State, Debounce |
| JS Deep Dive | Hard | Virtual DOM, Fiber, GC, Workers |
| Architecture | Hard | Checkout, A/B Testing, Progressive |
| Hiring Manager | Easy | Behavioral |
