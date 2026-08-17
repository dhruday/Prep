# Flipkart — SDE-3 Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Product Grid with Infinite Scroll, Filters, and Sort
**Duration:** 90 minutes

### Challenge: Build a product listing page with: grid/list view toggle, infinite scroll with loading skeletons, multi-select faceted filters (brand, price range, rating), sort (price, rating, relevance), and URL state sync.

```javascript
/**
 * Flipkart Product Grid:
 * 
 * - Infinite scroll with IntersectionObserver
 * - Skeleton loading placeholders
 * - Multi-faceted filters: brand (checkbox), price (range), rating (stars)
 * - Sort: price asc/desc, rating, relevance
 * - Grid/List view toggle
 * - URL state sync (filters + sort + page in URL params)
 * - Debounced filter application
 */
class ProductGrid {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.page = 1;
    this.pageSize = 20;
    this.loading = false;
    this.hasMore = true;
    this.view = 'grid'; // 'grid' | 'list'
    
    // Filter state
    this.filters = {
      brands: new Set(),
      minPrice: 0,
      maxPrice: Infinity,
      minRating: 0,
      search: ''
    };
    this.sort = 'relevance'; // 'relevance' | 'price_asc' | 'price_desc' | 'rating'
    
    this.observer = null;
    this.filterTimer = null;
    
    this.restoreFromURL();
    this.render();
    this.loadProducts();
  }
  
  // ---- URL State Sync ----
  
  saveToURL() {
    const params = new URLSearchParams();
    if (this.filters.brands.size > 0) params.set('brands', [...this.filters.brands].join(','));
    if (this.filters.minPrice > 0) params.set('minPrice', this.filters.minPrice);
    if (this.filters.maxPrice < Infinity) params.set('maxPrice', this.filters.maxPrice);
    if (this.filters.minRating > 0) params.set('rating', this.filters.minRating);
    if (this.sort !== 'relevance') params.set('sort', this.sort);
    if (this.filters.search) params.set('q', this.filters.search);
    
    const url = `${window.location.pathname}${params.toString() ? '?' + params : ''}`;
    history.replaceState(null, '', url);
  }
  
  restoreFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('brands')) {
      params.get('brands').split(',').forEach(b => this.filters.brands.add(b));
    }
    if (params.has('minPrice')) this.filters.minPrice = parseInt(params.get('minPrice'), 10);
    if (params.has('maxPrice')) this.filters.maxPrice = parseInt(params.get('maxPrice'), 10);
    if (params.has('rating')) this.filters.minRating = parseInt(params.get('rating'), 10);
    if (params.has('sort')) this.sort = params.get('sort');
    if (params.has('q')) this.filters.search = params.get('q');
  }
  
  // ---- Data Fetching (Simulated) ----
  
  async loadProducts() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.renderLoadingSkeletons();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newProducts = this.generateProducts(this.page, this.pageSize);
    
    if (newProducts.length < this.pageSize) {
      this.hasMore = false;
    }
    
    this.products.push(...newProducts);
    this.page++;
    this.loading = false;
    
    this.renderProducts();
  }
  
  generateProducts(page, size) {
    const brands = ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Realme', 'Oppo', 'Vivo'];
    const products = [];
    const start = (page - 1) * size;
    
    for (let i = 0; i < size; i++) {
      const idx = start + i;
      if (idx >= 200) break; // Simulate finite dataset
      
      products.push({
        id: `prod_${idx}`,
        title: `Product ${idx + 1} — ${brands[idx % brands.length]} Device`,
        brand: brands[idx % brands.length],
        price: 5000 + Math.floor(Math.random() * 95000),
        rating: 2.5 + Math.random() * 2.5,
        reviews: Math.floor(Math.random() * 10000),
        image: null
      });
    }
    return products;
  }
  
  // ---- Filtering & Sorting ----
  
  getFilteredSorted() {
    let result = [...this.products];
    
    // Apply filters
    if (this.filters.brands.size > 0) {
      result = result.filter(p => this.filters.brands.has(p.brand));
    }
    if (this.filters.minPrice > 0) {
      result = result.filter(p => p.price >= this.filters.minPrice);
    }
    if (this.filters.maxPrice < Infinity) {
      result = result.filter(p => p.price <= this.filters.maxPrice);
    }
    if (this.filters.minRating > 0) {
      result = result.filter(p => p.rating >= this.filters.minRating);
    }
    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }
    
    // Apply sort
    switch (this.sort) {
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      // 'relevance' = default order
    }
    
    return result;
  }
  
  applyFilters() {
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.saveToURL();
      this.renderProducts();
    }, 200);
  }
  
  // ---- Rendering ----
  
  render() {
    const brands = ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Realme', 'Oppo', 'Vivo'];
    
    this.container.innerHTML = `
      <style>
        .pg-container { display:flex; gap:20px; font-family:-apple-system,sans-serif; padding:16px; max-width:1200px; margin:0 auto; }
        .pg-sidebar { width:240px; flex-shrink:0; }
        .pg-main { flex:1; min-width:0; }
        .pg-filter-group { margin-bottom:16px; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .pg-filter-title { font-size:14px; font-weight:600; margin-bottom:8px; }
        .pg-filter-item { display:flex; align-items:center; gap:6px; padding:4px 0; font-size:13px; cursor:pointer; }
        .pg-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .pg-sort select { padding:6px 8px; border:1px solid #d1d5db; border-radius:4px; font-size:13px; }
        .pg-view-toggle button { padding:6px 10px; border:1px solid #d1d5db; cursor:pointer; background:#fff; font-size:13px; }
        .pg-view-toggle button.active { background:#2563eb; color:#fff; border-color:#2563eb; }
        .pg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px; }
        .pg-grid.list { grid-template-columns:1fr; }
        .pg-card { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; cursor:pointer; transition:box-shadow 0.2s; }
        .pg-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.1); }
        .pg-card-img { height:180px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; color:#9ca3af; }
        .pg-card-body { padding:10px; }
        .pg-card-title { font-size:13px; font-weight:500; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .pg-card-price { font-size:16px; font-weight:700; color:#059669; }
        .pg-card-rating { font-size:12px; color:#666; margin-top:4px; }
        .pg-skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .pg-sentinel { height:1px; }
        .pg-count { font-size:13px; color:#666; }
      </style>
      <div class="pg-container">
        <aside class="pg-sidebar" role="complementary" aria-label="Filters">
          <div class="pg-filter-group">
            <div class="pg-filter-title">Brand</div>
            ${brands.map(b => `
              <label class="pg-filter-item">
                <input type="checkbox" data-brand="${b}" ${this.filters.brands.has(b) ? 'checked' : ''}>
                ${b}
              </label>
            `).join('')}
          </div>
          <div class="pg-filter-group">
            <div class="pg-filter-title">Price Range</div>
            <div style="display:flex;gap:8px">
              <input type="number" id="min-price" placeholder="Min" value="${this.filters.minPrice || ''}" 
                     style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px">
              <input type="number" id="max-price" placeholder="Max" value="${this.filters.maxPrice < Infinity ? this.filters.maxPrice : ''}" 
                     style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px">
            </div>
          </div>
          <div class="pg-filter-group">
            <div class="pg-filter-title">Rating</div>
            ${[4, 3, 2, 1].map(r => `
              <label class="pg-filter-item">
                <input type="radio" name="rating" value="${r}" ${this.filters.minRating === r ? 'checked' : ''}>
                ${'★'.repeat(r)}${'☆'.repeat(5 - r)} & Up
              </label>
            `).join('')}
          </div>
        </aside>
        <main class="pg-main">
          <div class="pg-toolbar">
            <span class="pg-count" id="result-count"></span>
            <div style="display:flex;gap:12px;align-items:center">
              <div class="pg-sort">
                <select id="sort-select" aria-label="Sort by">
                  <option value="relevance" ${this.sort === 'relevance' ? 'selected' : ''}>Relevance</option>
                  <option value="price_asc" ${this.sort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
                  <option value="price_desc" ${this.sort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
                  <option value="rating" ${this.sort === 'rating' ? 'selected' : ''}>Rating</option>
                </select>
              </div>
              <div class="pg-view-toggle" role="radiogroup" aria-label="View mode">
                <button class="${this.view === 'grid' ? 'active' : ''}" data-view="grid" aria-label="Grid view">▦</button>
                <button class="${this.view === 'list' ? 'active' : ''}" data-view="list" aria-label="List view">☰</button>
              </div>
            </div>
          </div>
          <div class="pg-grid ${this.view}" id="product-grid"></div>
          <div class="pg-sentinel" id="scroll-sentinel"></div>
        </main>
      </div>
    `;
    
    this.attachFilterListeners();
    this.setupInfiniteScroll();
  }
  
  attachFilterListeners() {
    // Brand checkboxes
    this.container.querySelectorAll('[data-brand]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) this.filters.brands.add(cb.dataset.brand);
        else this.filters.brands.delete(cb.dataset.brand);
        this.applyFilters();
      });
    });
    
    // Price range
    this.container.querySelector('#min-price')?.addEventListener('input', (e) => {
      this.filters.minPrice = parseInt(e.target.value, 10) || 0;
      this.applyFilters();
    });
    this.container.querySelector('#max-price')?.addEventListener('input', (e) => {
      this.filters.maxPrice = parseInt(e.target.value, 10) || Infinity;
      this.applyFilters();
    });
    
    // Rating
    this.container.querySelectorAll('[name="rating"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.filters.minRating = parseInt(radio.value, 10);
        this.applyFilters();
      });
    });
    
    // Sort
    this.container.querySelector('#sort-select')?.addEventListener('change', (e) => {
      this.sort = e.target.value;
      this.applyFilters();
    });
    
    // View toggle
    this.container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        this.container.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const grid = this.container.querySelector('#product-grid');
        grid.classList.toggle('list', this.view === 'list');
      });
    });
  }
  
  setupInfiniteScroll() {
    const sentinel = this.container.querySelector('#scroll-sentinel');
    if (!sentinel) return;
    
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading && this.hasMore) {
        this.loadProducts();
      }
    }, { rootMargin: '200px' });
    
    this.observer.observe(sentinel);
  }
  
  renderProducts() {
    const grid = this.container.querySelector('#product-grid');
    const filtered = this.getFilteredSorted();
    
    this.container.querySelector('#result-count').textContent = `${filtered.length} results`;
    
    grid.innerHTML = filtered.map(p => `
      <div class="pg-card" data-id="${p.id}">
        <div class="pg-card-img">📦 ${this.escapeHtml(p.brand)}</div>
        <div class="pg-card-body">
          <div class="pg-card-title">${this.escapeHtml(p.title)}</div>
          <div class="pg-card-price">₹${p.price.toLocaleString('en-IN')}</div>
          <div class="pg-card-rating">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} ${p.rating.toFixed(1)} (${p.reviews.toLocaleString()})</div>
        </div>
      </div>
    `).join('');
  }
  
  renderLoadingSkeletons() {
    const grid = this.container.querySelector('#product-grid');
    if (!grid) return;
    
    const skeletons = Array.from({ length: 8 }, () => 
      `<div class="pg-skeleton" style="height:260px"></div>`
    ).join('');
    
    grid.insertAdjacentHTML('beforeend', skeletons);
  }
  
  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  destroy() {
    this.observer?.disconnect();
    clearTimeout(this.filterTimer);
  }
}
```

---

## 🎯 Key Takeaways
- Flipkart SDE-3 FE = **Product grid with infinite scroll, faceted filters, sort, URL state sync**
- **IntersectionObserver**: observe sentinel div below grid, `rootMargin: '200px'` for prefetching
- **Skeleton loading**: CSS shimmer animation `background-size: 200%` with `@keyframes shimmer`
- **URL state sync**: `URLSearchParams` + `history.replaceState()` — shareable filtered URLs
- **Debounced filters**: 200ms delay on filter changes — prevents excessive re-renders
- **Grid/List toggle**: CSS grid `grid-template-columns` changes — grid = `repeat(auto-fill, minmax(200px, 1fr))`, list = `1fr`
- **Price formatting**: `toLocaleString('en-IN')` — Indian rupee comma separators (12,34,567)
- Flipkart FE = **e-commerce** — product listing, search, filters, cart are core interview topics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Product Grid, Filters, Infinite Scroll |
| System Design | Very Hard | E-commerce at Scale |
| HM | Medium | Culture |
