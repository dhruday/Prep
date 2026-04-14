# Target — Senior FE Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Lead Software Engineer (Frontend) |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Store Inventory Dashboard with Real-Time Alerts
**Duration:** 90 minutes

### Challenge: Build an inventory dashboard showing: product list with stock levels, configurable low-stock alerts, reorder suggestions, bulk stock update, and a real-time stock change log.

```javascript
/**
 * Store Inventory Dashboard:
 * 
 * - Product table with sortable columns (name, SKU, stock, category, price)
 * - Low stock alert bars with configurable thresholds per category
 * - Reorder suggestions: products below safety stock
 * - Bulk stock update: CSV paste or manual multi-select
 * - Real-time stock change log (FIFO, max 100 entries)
 * - Category-level aggregation cards
 */
class InventoryDashboard {
  constructor(container) {
    this.container = container;
    this.products = this.generateProducts();
    this.changeLog = []; // { timestamp, productId, from, to, reason }
    this.alerts = [];
    this.selectedIds = new Set();
    this.sort = { column: 'name', dir: 'asc' };
    this.searchQuery = '';
    this.categoryFilter = 'all';
    
    // Alert thresholds per category
    this.thresholds = {
      'Electronics': { low: 10, critical: 3 },
      'Clothing': { low: 20, critical: 5 },
      'Groceries': { low: 50, critical: 15 },
      'Home': { low: 15, critical: 5 },
      'Toys': { low: 25, critical: 8 }
    };
    
    this.render();
    this.checkAlerts();
  }
  
  generateProducts() {
    const categories = ['Electronics', 'Clothing', 'Groceries', 'Home', 'Toys'];
    const products = [];
    
    for (let i = 0; i < 50; i++) {
      const category = categories[i % categories.length];
      products.push({
        id: `SKU${String(i + 1).padStart(4, '0')}`,
        name: `Product ${i + 1} — ${category}`,
        category,
        price: Math.round((10 + Math.random() * 490) * 100) / 100,
        stock: Math.floor(Math.random() * 100),
        safetyStock: this.thresholds?.[category]?.low || 15,
        reorderQty: 50 + Math.floor(Math.random() * 150),
        lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 7)
      });
    }
    return products;
  }
  
  updateStock(productId, newStock, reason = 'Manual Update') {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    const oldStock = product.stock;
    product.stock = Math.max(0, newStock);
    product.lastUpdated = new Date();
    
    // Log change
    this.changeLog.unshift({
      timestamp: new Date(),
      productId,
      productName: product.name,
      from: oldStock,
      to: product.stock,
      reason
    });
    
    // Keep only 100 entries
    if (this.changeLog.length > 100) this.changeLog.pop();
    
    this.checkAlerts();
    this.renderAll();
  }
  
  bulkUpdateStock(updates) {
    // updates: [{ id, stock, reason }]
    for (const u of updates) {
      this.updateStock(u.id, u.stock, u.reason || 'Bulk Update');
    }
  }
  
  checkAlerts() {
    this.alerts = [];
    
    for (const product of this.products) {
      const threshold = this.thresholds[product.category] || { low: 15, critical: 5 };
      
      if (product.stock <= threshold.critical) {
        this.alerts.push({ level: 'critical', product, message: `CRITICAL: ${product.name} has only ${product.stock} units` });
      } else if (product.stock <= threshold.low) {
        this.alerts.push({ level: 'warning', product, message: `LOW STOCK: ${product.name} has ${product.stock} units` });
      }
    }
    
    this.alerts.sort((a, b) => {
      if (a.level === 'critical' && b.level !== 'critical') return -1;
      if (b.level === 'critical' && a.level !== 'critical') return 1;
      return a.product.stock - b.product.stock;
    });
  }
  
  getFiltered() {
    let result = [...this.products];
    
    if (this.categoryFilter !== 'all') {
      result = result.filter(p => p.category === this.categoryFilter);
    }
    
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    
    const dir = this.sort.dir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      const aVal = a[this.sort.column];
      const bVal = b[this.sort.column];
      if (typeof aVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
    
    return result;
  }
  
  getCategoryStats() {
    const stats = {};
    for (const p of this.products) {
      if (!stats[p.category]) {
        stats[p.category] = { total: 0, lowStock: 0, critical: 0, totalValue: 0 };
      }
      const s = stats[p.category];
      s.total++;
      s.totalValue += p.stock * p.price;
      
      const thresh = this.thresholds[p.category] || { low: 15, critical: 5 };
      if (p.stock <= thresh.critical) s.critical++;
      else if (p.stock <= thresh.low) s.lowStock++;
    }
    return stats;
  }
  
  getStockBarColor(product) {
    const thresh = this.thresholds[product.category] || { low: 15, critical: 5 };
    if (product.stock <= thresh.critical) return '#ef4444';
    if (product.stock <= thresh.low) return '#f59e0b';
    return '#22c55e';
  }
  
  render() {
    const categories = [...new Set(this.products.map(p => p.category))];
    
    this.container.innerHTML = `
      <style>
        .inv { font-family:-apple-system,sans-serif; padding:16px; max-width:1200px; margin:0 auto; }
        .inv-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
        .inv-header h2 { margin:0; }
        .inv-alerts { margin-bottom:16px; }
        .inv-alert { padding:8px 12px; border-radius:6px; font-size:13px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center; }
        .inv-alert.critical { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
        .inv-alert.warning { background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
        .inv-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; margin-bottom:16px; }
        .inv-card { padding:14px; border-radius:8px; border:1px solid #e5e7eb; }
        .inv-card-value { font-size:22px; font-weight:700; }
        .inv-card-label { font-size:12px; color:#666; }
        .inv-toolbar { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
        .inv-search { flex:1; min-width:200px; padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; }
        .inv-select { padding:8px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; }
        .inv-btn { padding:8px 16px; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; font-size:13px; background:#fff; }
        .inv-btn.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
        .inv-table { width:100%; border-collapse:collapse; font-size:13px; }
        .inv-table th { text-align:left; padding:8px; border-bottom:2px solid #e5e7eb; cursor:pointer; user-select:none; font-size:12px; color:#666; }
        .inv-table td { padding:8px; border-bottom:1px solid #f3f4f6; }
        .inv-table tr:hover { background:#f9fafb; }
        .inv-stock-bar { width:80px; height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden; }
        .inv-stock-fill { height:100%; border-radius:4px; transition:width 0.3s; }
        .inv-log { max-height:200px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; padding:8px; margin-top:16px; }
        .inv-log-entry { font-size:12px; padding:4px 0; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; }
      </style>
      <div class="inv">
        <div class="inv-header">
          <h2>Store Inventory</h2>
          <div style="display:flex;gap:8px">
            <button class="inv-btn" id="bulk-update-btn">Bulk Update</button>
            <button class="inv-btn primary" id="reorder-btn">Reorder Suggestions</button>
          </div>
        </div>
        <div class="inv-alerts" id="alerts-panel"></div>
        <div class="inv-cards" id="category-cards"></div>
        <div class="inv-toolbar">
          <input class="inv-search" id="inv-search" placeholder="Search by name or SKU..." value="${this.esc(this.searchQuery)}">
          <select class="inv-select" id="cat-filter">
            <option value="all">All Categories</option>
            ${categories.map(c => `<option value="${c}" ${this.categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <table class="inv-table" id="product-table">
          <thead><tr>
            <th><input type="checkbox" id="select-all"></th>
            <th data-col="id">SKU</th>
            <th data-col="name">Product</th>
            <th data-col="category">Category</th>
            <th data-col="stock">Stock</th>
            <th>Level</th>
            <th data-col="price">Price</th>
            <th>Actions</th>
          </tr></thead>
          <tbody id="product-body"></tbody>
        </table>
        <div class="inv-log" id="change-log">
          <div style="font-weight:600;font-size:13px;margin-bottom:6px">Change Log</div>
          <div id="log-entries"></div>
        </div>
      </div>
    `;
    
    this.attachListeners();
    this.renderAll();
  }
  
  renderAll() {
    this.renderAlerts();
    this.renderCategoryCards();
    this.renderProducts();
    this.renderChangeLog();
  }
  
  renderAlerts() {
    const panel = this.container.querySelector('#alerts-panel');
    if (!panel) return;
    
    panel.innerHTML = this.alerts.slice(0, 5).map(a => `
      <div class="inv-alert ${a.level}">
        <span>${this.esc(a.message)}</span>
        <button class="inv-btn" data-reorder="${a.product.id}" style="padding:4px 10px;font-size:11px">Reorder</button>
      </div>
    `).join('');
    
    panel.querySelectorAll('[data-reorder]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = this.products.find(p => p.id === btn.dataset.reorder);
        if (product) {
          this.updateStock(product.id, product.stock + product.reorderQty, 'Reorder');
        }
      });
    });
  }
  
  renderCategoryCards() {
    const cards = this.container.querySelector('#category-cards');
    if (!cards) return;
    
    const stats = this.getCategoryStats();
    cards.innerHTML = Object.entries(stats).map(([cat, s]) => `
      <div class="inv-card">
        <div class="inv-card-label">${cat}</div>
        <div class="inv-card-value">${s.total} items</div>
        <div style="font-size:12px;margin-top:4px">
          ${s.critical > 0 ? `<span style="color:#ef4444">${s.critical} critical</span> · ` : ''}
          ${s.lowStock > 0 ? `<span style="color:#f59e0b">${s.lowStock} low</span> · ` : ''}
          Value: $${Math.round(s.totalValue).toLocaleString()}
        </div>
      </div>
    `).join('');
  }
  
  renderProducts() {
    const tbody = this.container.querySelector('#product-body');
    if (!tbody) return;
    
    const filtered = this.getFiltered();
    const maxStock = Math.max(...this.products.map(p => p.stock), 1);
    
    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td><input type="checkbox" data-id="${p.id}" ${this.selectedIds.has(p.id) ? 'checked' : ''}></td>
        <td style="font-family:monospace;font-size:12px">${p.id}</td>
        <td style="font-weight:500">${this.esc(p.name)}</td>
        <td>${p.category}</td>
        <td><strong>${p.stock}</strong></td>
        <td>
          <div class="inv-stock-bar">
            <div class="inv-stock-fill" style="width:${(p.stock/maxStock)*100}%;background:${this.getStockBarColor(p)}"></div>
          </div>
        </td>
        <td>$${p.price.toFixed(2)}</td>
        <td>
          <button class="inv-btn" data-adjust="${p.id}" style="padding:2px 8px;font-size:11px">±</button>
        </td>
      </tr>
    `).join('');
    
    // Row checkbox
    tbody.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) this.selectedIds.add(cb.dataset.id);
        else this.selectedIds.delete(cb.dataset.id);
      });
    });
    
    // Adjust button
    tbody.querySelectorAll('[data-adjust]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = this.products.find(p => p.id === btn.dataset.adjust);
        if (!product) return;
        const qty = prompt(`Update stock for ${product.name} (current: ${product.stock}):`);
        if (qty !== null) {
          this.updateStock(product.id, parseInt(qty, 10) || product.stock, 'Manual Adjustment');
        }
      });
    });
  }
  
  renderChangeLog() {
    const entries = this.container.querySelector('#log-entries');
    if (!entries) return;
    
    entries.innerHTML = this.changeLog.length === 0
      ? '<div style="color:#888;font-size:12px">No changes yet</div>'
      : this.changeLog.slice(0, 20).map(log => `
        <div class="inv-log-entry">
          <span>${this.esc(log.productName)} (${log.productId}): ${log.from} → ${log.to}</span>
          <span style="color:#888">${log.timestamp.toLocaleTimeString()}</span>
        </div>
      `).join('');
  }
  
  attachListeners() {
    // Search
    this.container.querySelector('#inv-search')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderProducts();
    });
    
    // Category filter
    this.container.querySelector('#cat-filter')?.addEventListener('change', (e) => {
      this.categoryFilter = e.target.value;
      this.renderProducts();
    });
    
    // Sort
    this.container.querySelectorAll('[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this.sort.column === col) this.sort.dir = this.sort.dir === 'asc' ? 'desc' : 'asc';
        else { this.sort.column = col; this.sort.dir = 'asc'; }
        this.renderProducts();
      });
    });
    
    // Select all
    this.container.querySelector('#select-all')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.getFiltered().forEach(p => this.selectedIds.add(p.id));
      } else {
        this.selectedIds.clear();
      }
      this.renderProducts();
    });
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Target SDE-3 FE = **Inventory dashboard — alerts, category cards, stock bar, change log, bulk update**
- **Color-coded stock bars**: green (healthy), yellow (low), red (critical) — per-category configurable thresholds
- **Change log**: FIFO capped at 100 entries — `unshift` for newest first, `pop` when exceeding limit
- **Category aggregation cards**: real-time counts of total/low/critical per category + total inventory value
- **Alert priority**: critical first, then warning — sorted by ascending stock level
- **Select-all pattern**: checkbox in header toggles all visible (filtered) rows — not hidden ones
- **Reorder button in alert**: one-click reorder with pre-calculated reorder quantity
- Target FE = **retail dashboards, store operations, inventory management** — expect CRUD + analytics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Dashboard, Alerts, Data Management |
| System Design | Very Hard | Inventory @ Scale |
| HM | Medium | Culture |
