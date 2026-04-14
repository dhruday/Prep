# Meesho — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Product Feed with Infinite Scroll and Filters

### Problem
Build a social commerce product feed with:
1. Grid layout showing product cards with images, prices, discount badges
2. Infinite scroll loading with skeleton placeholders
3. Multi-select filter chips: category, price range, discount %
4. Sort by: price low-to-high, high-to-low, popularity, newest
5. Wishlist toggle (heart icon) with animation
6. Responsive: 1-col on mobile, 2-col tablet, 4-col desktop
7. Debounced search bar filtering products by name

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Meesho Product Feed</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f0ff; }

/* Header */
.header { background: #570050; color: #fff; padding: 12px 20px; display: flex; align-items: center; gap: 16px; position: sticky; top: 0; z-index: 100; }
.logo { font-size: 22px; font-weight: 700; }
.search-bar { flex: 1; max-width: 480px; position: relative; }
.search-bar input { width: 100%; padding: 8px 36px 8px 12px; border: none; border-radius: 6px; font-size: 14px; outline: none; }
.search-bar::after { content: '🔍'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }

/* Filters */
.filter-bar { background: #fff; padding: 12px 20px; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-group { display: flex; gap: 6px; align-items: center; }
.filter-label { font-size: 13px; font-weight: 600; color: #570050; }
.chip { padding: 5px 12px; border: 1px solid #ddd; border-radius: 20px; font-size: 13px; cursor: pointer; background: #fff; color: #333; transition: all 0.15s; }
.chip:hover { border-color: #570050; }
.chip.active { background: #570050; color: #fff; border-color: #570050; }
.sort-select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; outline: none; }

/* Grid */
.feed { padding: 16px 20px; display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
@media (max-width: 1024px) { .feed { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .feed { grid-template-columns: 1fr; } }

/* Product Card */
.card { background: #fff; border-radius: 8px; overflow: hidden; position: relative; transition: box-shadow 0.15s; }
.card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.card-img { height: 200px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-size: 56px; position: relative; }
.discount-badge { position: absolute; top: 8px; left: 8px; background: #e74c3c; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.wishlist-btn { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border: none; background: rgba(255,255,255,0.9); border-radius: 50%; font-size: 16px; cursor: pointer; transition: transform 0.2s; }
.wishlist-btn:hover { transform: scale(1.15); }
.wishlist-btn.active { color: #e74c3c; }
@keyframes heartPop { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
.wishlist-btn.pop { animation: heartPop 0.3s ease; }
.card-body { padding: 10px 12px; }
.card-name { font-size: 14px; color: #333; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-price { font-size: 16px; font-weight: 700; color: #333; }
.card-original { text-decoration: line-through; color: #999; font-size: 13px; margin-left: 6px; font-weight: 400; }
.card-meta { font-size: 12px; color: #999; margin-top: 4px; }
.card-rating { color: #f39c12; font-size: 13px; }

/* Skeleton */
.skeleton-card { background: #fff; border-radius: 8px; overflow: hidden; }
.skeleton-img { height: 200px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-text { height: 14px; background: #f0f0f0; margin: 10px 12px; border-radius: 4px; }
.skeleton-text.short { width: 60%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.no-results { grid-column: 1 / -1; text-align: center; padding: 40px; color: #999; font-size: 16px; }
.loader { grid-column: 1 / -1; text-align: center; padding: 20px; color: #570050; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Meesho</div>
  <div class="search-bar"><input type="text" id="searchInput" placeholder="Search products..."></div>
</div>
<div class="filter-bar" id="filterBar"></div>
<div class="feed" id="feed"></div>

<script>
// ============================================================
// DATA
// ============================================================
const PRODUCTS = Array.from({ length: 80 }, (_, i) => ({
  id: i + 1,
  name: [
    'Floral Kurti Set', 'Cotton Saree', 'Denim Jacket', 'Sneakers Classic',
    'Silk Dupatta', 'Palazzo Pants', 'Ethnic Dress', 'Casual Shirt',
    'Embroidered Lehenga', 'Running Shoes', 'Summer Maxi Dress', 'Formal Blazer',
    'Printed T-Shirt', 'Leather Belt', 'Designer Watch', 'Handbag Canvas'
  ][i % 16] + ` #${i + 1}`,
  price: Math.round((200 + Math.random() * 2800) * 100) / 100,
  originalPrice: Math.round((500 + Math.random() * 4000) * 100) / 100,
  category: ['Women', 'Men', 'Kids', 'Accessories'][i % 4],
  emoji: ['👗', '👕', '👟', '⌚', '👜', '🧣', '👠', '🧥'][i % 8],
  rating: (3 + Math.random() * 2).toFixed(1),
  reviews: Math.floor(100 + Math.random() * 5000),
  popularity: Math.floor(Math.random() * 1000),
  createdAt: Date.now() - Math.random() * 30 * 86400000
})).map(p => ({ ...p, discount: Math.round((1 - p.price / p.originalPrice) * 100) }));

const CATEGORIES = ['Women', 'Men', 'Kids', 'Accessories'];
const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 - ₹1000', min: 500, max: 1000 },
  { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
  { label: 'Above ₹2000', min: 2000, max: Infinity }
];
const DISCOUNTS = [
  { label: '10%+', min: 10 },
  { label: '30%+', min: 30 },
  { label: '50%+', min: 50 }
];

// ============================================================
// STATE
// ============================================================
let selectedCategories = new Set();
let selectedPriceRange = null;
let selectedDiscount = null;
let sortBy = 'popularity';
let searchQuery = '';
let wishlist = new Set();
let page = 0;
const PAGE_SIZE = 12;
let loading = false;
let allLoaded = false;

// ============================================================
// FILTER BAR
// ============================================================
function renderFilterBar() {
  const bar = document.getElementById('filterBar');
  bar.innerHTML = `
    <div class="filter-group">
      <span class="filter-label">Category:</span>
      ${CATEGORIES.map(c => `<span class="chip ${selectedCategories.has(c) ? 'active' : ''}" data-type="cat" data-value="${c}">${c}</span>`).join('')}
    </div>
    <div class="filter-group">
      <span class="filter-label">Price:</span>
      ${PRICE_RANGES.map((r, i) => `<span class="chip ${selectedPriceRange === i ? 'active' : ''}" data-type="price" data-value="${i}">${r.label}</span>`).join('')}
    </div>
    <div class="filter-group">
      <span class="filter-label">Discount:</span>
      ${DISCOUNTS.map((d, i) => `<span class="chip ${selectedDiscount === i ? 'active' : ''}" data-type="disc" data-value="${i}">${d.label}</span>`).join('')}
    </div>
    <div class="filter-group" style="margin-left:auto;">
      <span class="filter-label">Sort:</span>
      <select class="sort-select" id="sortSelect">
        <option value="popularity" ${sortBy === 'popularity' ? 'selected' : ''}>Popularity</option>
        <option value="price-asc" ${sortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
        <option value="price-desc" ${sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
        <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
        <option value="discount" ${sortBy === 'discount' ? 'selected' : ''}>Highest Discount</option>
      </select>
    </div>
  `;

  bar.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      const val = chip.dataset.value;
      if (type === 'cat') {
        selectedCategories.has(val) ? selectedCategories.delete(val) : selectedCategories.add(val);
      } else if (type === 'price') {
        selectedPriceRange = selectedPriceRange === parseInt(val) ? null : parseInt(val);
      } else if (type === 'disc') {
        selectedDiscount = selectedDiscount === parseInt(val) ? null : parseInt(val);
      }
      resetFeed();
    });
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortBy = e.target.value;
    resetFeed();
  });
}

// ============================================================
// PRODUCT FILTERING & SORTING
// ============================================================
function getFilteredProducts() {
  let filtered = [...PRODUCTS];

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  // Category filter (multi-select)
  if (selectedCategories.size > 0) {
    filtered = filtered.filter(p => selectedCategories.has(p.category));
  }

  // Price filter
  if (selectedPriceRange !== null) {
    const range = PRICE_RANGES[selectedPriceRange];
    filtered = filtered.filter(p => p.price >= range.min && p.price < range.max);
  }

  // Discount filter
  if (selectedDiscount !== null) {
    filtered = filtered.filter(p => p.discount >= DISCOUNTS[selectedDiscount].min);
  }

  // Sort
  switch (sortBy) {
    case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'popularity': filtered.sort((a, b) => b.popularity - a.popularity); break;
    case 'newest': filtered.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'discount': filtered.sort((a, b) => b.discount - a.discount); break;
  }

  return filtered;
}

// ============================================================
// RENDERING
// ============================================================
function renderProducts(append = false) {
  const feed = document.getElementById('feed');
  const filtered = getFilteredProducts();
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageProducts = filtered.slice(start, end);

  if (!append) feed.innerHTML = '';

  if (filtered.length === 0) {
    feed.innerHTML = '<div class="no-results">No products found. Try adjusting filters.</div>';
    return;
  }

  pageProducts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    const isWished = wishlist.has(p.id);
    card.innerHTML = `
      <div class="card-img">${p.emoji}
        ${p.discount > 0 ? `<span class="discount-badge">${p.discount}% OFF</span>` : ''}
        <button class="wishlist-btn ${isWished ? 'active' : ''}" data-id="${p.id}">${isWished ? '❤️' : '🤍'}</button>
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-price">₹${p.price.toFixed(0)}
          ${p.originalPrice > p.price ? `<span class="card-original">₹${p.originalPrice.toFixed(0)}</span>` : ''}
        </div>
        <div class="card-rating">★ ${p.rating} (${p.reviews})</div>
        <div class="card-meta">${p.category}</div>
      </div>
    `;
    feed.appendChild(card);

    // Wishlist toggle
    card.querySelector('.wishlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const id = parseInt(btn.dataset.id);
      if (wishlist.has(id)) { wishlist.delete(id); btn.textContent = '🤍'; btn.classList.remove('active'); }
      else { wishlist.add(id); btn.textContent = '❤️'; btn.classList.add('active'); }
      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 300);
    });
  });

  allLoaded = end >= filtered.length;

  // Remove loader or skeletons
  feed.querySelectorAll('.skeleton-card, .loader').forEach(el => el.remove());
}

function showSkeletons() {
  const feed = document.getElementById('feed');
  for (let i = 0; i < 4; i++) {
    const skel = document.createElement('div');
    skel.className = 'skeleton-card';
    skel.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-text"></div><div class="skeleton-text short"></div>';
    feed.appendChild(skel);
  }
}

function resetFeed() {
  page = 0;
  allLoaded = false;
  renderFilterBar();
  renderProducts();
}

// ============================================================
// INFINITE SCROLL
// ============================================================
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !loading && !allLoaded) {
    loading = true;
    showSkeletons();
    // Simulate network delay
    setTimeout(() => {
      page++;
      renderProducts(true);
      loading = false;
    }, 600);
  }
}, { rootMargin: '200px' });

// Sentinel element
const sentinel = document.createElement('div');
sentinel.id = 'sentinel';
sentinel.style.height = '1px';
document.body.appendChild(sentinel);
observer.observe(sentinel);

// ============================================================
// DEBOUNCED SEARCH
// ============================================================
let searchTimer;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    resetFeed();
  }, 300);
});

// Initial render
renderFilterBar();
renderProducts();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Meesho FE interviews focus on **social commerce UI** — product feeds, filters, infinite scroll
- **IntersectionObserver** for infinite scroll: sentinel element triggers next page load at 200px margin
- Multi-select filter chips (category) + single-select (price range, discount) — toggle pattern
- Skeleton shimmer during loading: CSS gradient animation `background-position` slide
- Wishlist heart animation: `@keyframes heartPop` with scale transform — delightful micro-interaction
- **Debounced search** (300ms): clearTimeout + setTimeout pattern prevents excessive filtering
- Sort stability: products with same price maintain original order (stable `.sort()` in modern JS)
- Responsive grid: CSS Grid with `grid-template-columns` + `@media` queries — no JS needed

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, CSS Grid |
| Technical 2 | Hard | Infinite Scroll, Filters, State |
| Hiring Manager | Medium | Product Thinking |
