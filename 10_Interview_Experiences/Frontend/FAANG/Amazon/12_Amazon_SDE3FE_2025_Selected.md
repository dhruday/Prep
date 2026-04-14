# Amazon — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 / L6 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Product Comparison Table

### Problem
Build a product comparison interface like Amazon's:
1. Multi-select products (up to 4) from a product list
2. Comparison table: rows = features/specs, columns = products
3. Highlight differences: cells that differ across products are highlighted
4. Sticky product headers (scroll with table but stay on top)
5. Remove product from comparison
6. "Only show differences" toggle to filter rows
7. Rating visualization with star bar

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Product Comparison</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f8f8f8; }

/* Product Selector */
.selector { padding: 16px; background: #fff; border-bottom: 1px solid #e3e3e3; }
.selector h2 { font-size: 16px; margin-bottom: 10px; }
.product-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.product-chip { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 2px solid #e3e3e3; border-radius: 8px; cursor: pointer; min-width: 180px; transition: 0.2s; }
.product-chip:hover { border-color: #ff9900; }
.product-chip.selected { border-color: #ff9900; background: #fff8ee; }
.product-chip img { width: 40px; height: 40px; object-fit: contain; background: #f5f5f5; border-radius: 4px; }
.chip-info { font-size: 12px; }
.chip-name { font-weight: 600; color: #0f1111; font-size: 13px; }
.chip-price { color: #b12704; font-weight: 700; }

/* Toolbar */
.toolbar { display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #e3e3e3; }
.diff-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; }
.diff-toggle input { accent-color: #ff9900; }
.compare-count { font-size: 12px; color: #888; }

/* Comparison Table */
.table-container { overflow-x: auto; padding: 16px; }
table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e3e3e3; }
thead { position: sticky; top: 0; z-index: 10; background: #fff; }
th { padding: 12px 14px; border: 1px solid #e3e3e3; vertical-align: top; min-width: 180px; }
.product-header { text-align: center; }
.product-header img { width: 80px; height: 80px; object-fit: contain; background: #f5f5f5; border-radius: 4px; margin-bottom: 6px; }
.ph-name { font-size: 13px; font-weight: 600; color: #0f1111; }
.ph-price { font-size: 15px; font-weight: 700; color: #b12704; margin: 4px 0; }
.ph-rating { font-size: 12px; color: #e77600; }
.remove-btn { margin-top: 6px; padding: 2px 8px; background: none; border: 1px solid #ccc; border-radius: 4px; font-size: 11px; cursor: pointer; color: #555; }
.remove-btn:hover { background: #fee; border-color: #b12704; color: #b12704; }

th.feature-col { font-size: 12px; font-weight: 600; color: #555; text-align: left; background: #fafafa; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
td { padding: 8px 14px; border: 1px solid #e3e3e3; font-size: 13px; color: #333; text-align: center; }
td.feature-label { text-align: left; font-weight: 500; background: #fafafa; color: #0f1111; white-space: nowrap; }
tr.diff-row td:not(.feature-label) { background: #fff9e5; }
tr:hover td { background: #f5f5f5; }
tr.diff-row:hover td:not(.feature-label) { background: #fff3cc; }

/* Star Rating */
.stars { display: inline-flex; gap: 1px; }
.star { color: #e77600; font-size: 14px; }
.star.empty { color: #ddd; }

.empty-state { text-align: center; padding: 40px; color: #888; font-size: 14px; }
</style>
</head>
<body>

<div class="selector">
  <h2>Compare Products</h2>
  <div class="product-list" id="productList"></div>
</div>

<div class="toolbar" id="toolbar" style="display:none;">
  <label class="diff-toggle"><input type="checkbox" id="diffToggle"> Only show differences</label>
  <span class="compare-count" id="compareCount"></span>
</div>

<div class="table-container" id="tableContainer">
  <div class="empty-state">Select up to 4 products to compare</div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const products = [
  { id: 1, name: 'iPhone 16 Pro', price: 119900, rating: 4.5, reviews: 3420, image: '📱',
    specs: { Brand: 'Apple', Display: '6.3" Super Retina XDR', Processor: 'A18 Pro', RAM: '8 GB', Storage: '256 GB', Battery: '4685 mAh', Camera: '48 MP + 12 MP + 12 MP', OS: 'iOS 18', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '199 g', 'Water Resistance': 'IP68' }
  },
  { id: 2, name: 'Samsung Galaxy S25 Ultra', price: 129999, rating: 4.3, reviews: 2890, image: '📲',
    specs: { Brand: 'Samsung', Display: '6.9" Dynamic AMOLED 2X', Processor: 'Snapdragon 8 Elite', RAM: '12 GB', Storage: '256 GB', Battery: '5000 mAh', Camera: '200 MP + 50 MP + 10 MP + 12 MP', OS: 'Android 15', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '218 g', 'Water Resistance': 'IP68' }
  },
  { id: 3, name: 'Google Pixel 9 Pro', price: 109999, rating: 4.4, reviews: 1560, image: '📱',
    specs: { Brand: 'Google', Display: '6.3" Super Actua LTPO', Processor: 'Tensor G4', RAM: '16 GB', Storage: '256 GB', Battery: '4700 mAh', Camera: '50 MP + 48 MP + 48 MP', OS: 'Android 15', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '199 g', 'Water Resistance': 'IP68' }
  },
  { id: 4, name: 'OnePlus 13', price: 69999, rating: 4.2, reviews: 4200, image: '📲',
    specs: { Brand: 'OnePlus', Display: '6.82" LTPO AMOLED', Processor: 'Snapdragon 8 Elite', RAM: '12 GB', Storage: '256 GB', Battery: '6000 mAh', Camera: '50 MP + 50 MP + 50 MP', OS: 'Android 15', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '213 g', 'Water Resistance': 'IP68/IP69' }
  },
  { id: 5, name: 'Nothing Phone 3', price: 39999, rating: 4.0, reviews: 890, image: '📱',
    specs: { Brand: 'Nothing', Display: '6.5" AMOLED', Processor: 'Snapdragon 7+ Gen 3', RAM: '8 GB', Storage: '128 GB', Battery: '5000 mAh', Camera: '50 MP + 50 MP', OS: 'Android 15', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '185 g', 'Water Resistance': 'IP54' }
  },
  { id: 6, name: 'Xiaomi 15 Pro', price: 54999, rating: 4.1, reviews: 1200, image: '📲',
    specs: { Brand: 'Xiaomi', Display: '6.73" LTPO AMOLED', Processor: 'Snapdragon 8 Elite', RAM: '12 GB', Storage: '256 GB', Battery: '5400 mAh', Camera: '50 MP + 50 MP + 50 MP', OS: 'Android 15', 'Refresh Rate': '120 Hz', '5G': 'Yes', Weight: '210 g', 'Water Resistance': 'IP68' }
  }
];

let selectedIds = new Set();
let showDiffOnly = false;

// ============================================================
// RENDER SELECTOR
// ============================================================
function renderSelector() {
  document.getElementById('productList').innerHTML = products.map(p => `
    <div class="product-chip ${selectedIds.has(p.id) ? 'selected' : ''}" data-id="${p.id}">
      <div style="font-size:28px;">${p.image}</div>
      <div class="chip-info">
        <div class="chip-name">${p.name}</div>
        <div class="chip-price">₹${p.price.toLocaleString()}</div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.product-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = parseInt(chip.dataset.id);
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        if (selectedIds.size >= 4) return alert('Maximum 4 products');
        selectedIds.add(id);
      }
      renderSelector();
      renderTable();
    });
  });
}

// ============================================================
// STARS
// ============================================================
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<span class="star">★</span>';
    else if (i === full && half) html += '<span class="star">★</span>';
    else html += '<span class="star empty">★</span>';
  }
  return `<span class="stars">${html}</span> ${rating}`;
}

// ============================================================
// COMPARISON TABLE
// ============================================================
function renderTable() {
  const selected = products.filter(p => selectedIds.has(p.id));
  const toolbar = document.getElementById('toolbar');
  const container = document.getElementById('tableContainer');

  if (selected.length < 2) {
    toolbar.style.display = 'none';
    container.innerHTML = '<div class="empty-state">Select at least 2 products to compare</div>';
    return;
  }

  toolbar.style.display = 'flex';
  document.getElementById('compareCount').textContent = `Comparing ${selected.length} products`;

  // Get all feature keys
  const allKeys = new Set();
  selected.forEach(p => Object.keys(p.specs).forEach(k => allKeys.add(k)));
  const features = [...allKeys];

  // Determine which rows have differences
  const diffRows = new Set();
  features.forEach(f => {
    const vals = selected.map(p => p.specs[f] || '—');
    if (new Set(vals).size > 1) diffRows.add(f);
  });

  const visibleFeatures = showDiffOnly ? features.filter(f => diffRows.has(f)) : features;

  let html = '<table><thead><tr>';
  html += '<th class="feature-col">Feature</th>';
  selected.forEach(p => {
    html += `
      <th class="product-header">
        <div style="font-size:36px;">${p.image}</div>
        <div class="ph-name">${p.name}</div>
        <div class="ph-price">₹${p.price.toLocaleString()}</div>
        <div class="ph-rating">${renderStars(p.rating)} (${p.reviews.toLocaleString()})</div>
        <button class="remove-btn" data-id="${p.id}">✕ Remove</button>
      </th>
    `;
  });
  html += '</tr></thead><tbody>';

  visibleFeatures.forEach(f => {
    const isDiff = diffRows.has(f);
    html += `<tr class="${isDiff ? 'diff-row' : ''}">`;
    html += `<td class="feature-label">${f}</td>`;
    selected.forEach(p => {
      html += `<td>${p.specs[f] || '—'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  // Remove buttons
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectedIds.delete(parseInt(btn.dataset.id));
      renderSelector();
      renderTable();
    });
  });
}

// ============================================================
// DIFF TOGGLE
// ============================================================
document.getElementById('diffToggle').addEventListener('change', e => {
  showDiffOnly = e.target.checked;
  renderTable();
});

// ============================================================
// INIT
// ============================================================
renderSelector();
renderTable();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Product selection**: chip-based multi-select with 4-item limit, orange border on active
- **Difference highlighting**: compute `diffRows` by checking if `Set(values).size > 1` per feature
- **"Only show differences" toggle**: filter `visibleFeatures` to only those in `diffRows`
- **Sticky headers**: `position: sticky; top: 0` on `<thead>` keeps product headers visible
- **Star rating**: loop 1-5, filled if `i < floor(rating)`, half-star check
- **Remove from comparison**: button in header, `e.stopPropagation()` prevents chip toggle
- **Feature key union**: `Set` from all selected products' specs keys to handle products with different spec sets

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms, DS |
| Technical 1 | Medium | DOM, CSS, Tables |
| Technical 2 | Hard | Comparison Logic, Sticky Headers |
| Technical 3 | Hard | System Design |
| Bar Raiser | Hard | LP, Behavioral + Tech |
