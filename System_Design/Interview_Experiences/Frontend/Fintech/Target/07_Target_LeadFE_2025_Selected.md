# Target — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Frontend Engineer |
| **Level** | Lead Engineer |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Inventory Management Grid

### Problem
Build a retail inventory management interface:
1. Data table with columns: SKU, Product Name, Category, Stock, Reorder Level, Price, Status
2. Inline editing: click a cell to edit its value
3. Status auto-computed: In Stock (stock > reorder), Low Stock (stock ≤ reorder), Out of Stock (stock = 0)
4. Bulk actions: select rows via checkboxes, batch update category or reorder levels
5. Column filtering with text input above each column
6. Sort by clicking column headers
7. Keyboard navigation: Arrow keys move between cells, Enter confirms edit, Escape cancels

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inventory Management</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f8fafc; padding: 16px; }

.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
h1 { font-size: 18px; color: #0f172a; }
.bulk-actions { display: flex; gap: 6px; }
.bulk-btn { padding: 6px 14px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; font-size: 12px; cursor: pointer; color: #475569; }
.bulk-btn:hover { background: #f1f5f9; }
.bulk-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.selected-count { font-size: 12px; color: #2563eb; font-weight: 600; padding: 6px 0; }

.table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px; }
thead { background: #f8fafc; }
th { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; user-select: none; }
th.sortable { cursor: pointer; }
th.sortable:hover { color: #2563eb; }
.sort-indicator { font-size: 10px; margin-left: 2px; }
.filter-row th { padding: 4px 6px; background: #f1f5f9; }
.filter-input { width: 100%; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; }

td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
tr:hover { background: #f8fafc; }
tr.selected-row { background: #eff6ff; }

.cell-editable { cursor: pointer; padding: 2px 4px; border-radius: 3px; min-height: 20px; }
.cell-editable:hover { background: #e0f2fe; }
.cell-editable.editing { background: #fff; }
.cell-input { width: 100%; padding: 2px 4px; border: 2px solid #2563eb; border-radius: 3px; font-size: 13px; outline: none; }

.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.status-in-stock { background: #dcfce7; color: #16a34a; }
.status-low-stock { background: #fef3c7; color: #d97706; }
.status-out-of-stock { background: #fee2e2; color: #dc2626; }

.checkbox-cell { width: 30px; text-align: center; }
input[type="checkbox"] { cursor: pointer; accent-color: #2563eb; }
.sku-cell { font-family: monospace; font-size: 12px; color: #64748b; }
.focus-cell { outline: 2px solid #2563eb; outline-offset: -2px; border-radius: 3px; }
</style>
</head>
<body>

<div class="toolbar">
  <div>
    <h1>📦 Inventory Management</h1>
    <div class="selected-count" id="selectedCount"></div>
  </div>
  <div class="bulk-actions">
    <button class="bulk-btn" id="bulkCategoryBtn" disabled>Batch Category</button>
    <button class="bulk-btn" id="bulkReorderBtn" disabled>Batch Reorder Level</button>
  </div>
</div>
<div class="table-wrap">
  <table id="invTable"></table>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const COLUMNS = [
  { key: 'sku', label: 'SKU', editable: false, filterable: true },
  { key: 'name', label: 'Product Name', editable: true, filterable: true },
  { key: 'category', label: 'Category', editable: true, filterable: true },
  { key: 'stock', label: 'Stock', editable: true, filterable: false, type: 'number' },
  { key: 'reorderLevel', label: 'Reorder Level', editable: true, filterable: false, type: 'number' },
  { key: 'price', label: 'Price', editable: true, filterable: false, type: 'number' },
  { key: 'status', label: 'Status', editable: false, filterable: true }
];

let products = [
  { sku: 'TGT-001', name: 'Wireless Earbuds', category: 'Electronics', stock: 150, reorderLevel: 30, price: 2499 },
  { sku: 'TGT-002', name: 'Cotton T-Shirt', category: 'Clothing', stock: 5, reorderLevel: 20, price: 599 },
  { sku: 'TGT-003', name: 'Yoga Mat', category: 'Fitness', stock: 0, reorderLevel: 10, price: 1299 },
  { sku: 'TGT-004', name: 'Kitchen Blender', category: 'Appliances', stock: 45, reorderLevel: 15, price: 3499 },
  { sku: 'TGT-005', name: 'Running Shoes', category: 'Footwear', stock: 12, reorderLevel: 25, price: 4999 },
  { sku: 'TGT-006', name: 'Protein Powder', category: 'Health', stock: 80, reorderLevel: 20, price: 1899 },
  { sku: 'TGT-007', name: 'LED Desk Lamp', category: 'Electronics', stock: 0, reorderLevel: 10, price: 1599 },
  { sku: 'TGT-008', name: 'Backpack 30L', category: 'Accessories', stock: 34, reorderLevel: 15, price: 2199 },
  { sku: 'TGT-009', name: 'Water Bottle', category: 'Fitness', stock: 200, reorderLevel: 50, price: 499 },
  { sku: 'TGT-010', name: 'Notebook Set', category: 'Stationery', stock: 8, reorderLevel: 30, price: 349 }
];

let selectedRows = new Set();
let sortKey = null, sortDir = 1;
let filters = {};
let editingCell = null;
let focusRow = 0, focusCol = 0;

// ============================================================
// STATUS COMPUTATION
// ============================================================
function computeStatus(p) {
  if (p.stock === 0) return 'Out of Stock';
  if (p.stock <= p.reorderLevel) return 'Low Stock';
  return 'In Stock';
}

// ============================================================
// RENDER
// ============================================================
function getFilteredSorted() {
  let data = products.map(p => ({ ...p, status: computeStatus(p) }));

  // Filter
  Object.entries(filters).forEach(([key, val]) => {
    if (!val) return;
    const lower = val.toLowerCase();
    data = data.filter(p => String(p[key]).toLowerCase().includes(lower));
  });

  // Sort
  if (sortKey) {
    data.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
  }

  return data;
}

function render() {
  const data = getFilteredSorted();
  const allSelected = data.length > 0 && data.every(d => selectedRows.has(d.sku));

  let html = '<thead><tr>';
  html += `<th class="checkbox-cell"><input type="checkbox" id="selectAll" ${allSelected ? 'checked' : ''}></th>`;
  COLUMNS.forEach(c => {
    const arrow = sortKey === c.key ? (sortDir === 1 ? '▲' : '▼') : '';
    html += `<th class="sortable" data-sort="${c.key}">${c.label} <span class="sort-indicator">${arrow}</span></th>`;
  });
  html += '</tr><tr class="filter-row">';
  html += '<th></th>';
  COLUMNS.forEach(c => {
    html += c.filterable
      ? `<th><input class="filter-input" data-filter="${c.key}" placeholder="Filter..." value="${filters[c.key] || ''}"></th>`
      : '<th></th>';
  });
  html += '</tr></thead><tbody>';

  data.forEach((p, ri) => {
    const isSelected = selectedRows.has(p.sku);
    html += `<tr class="${isSelected ? 'selected-row' : ''}" data-sku="${p.sku}">`;
    html += `<td class="checkbox-cell"><input type="checkbox" data-sku="${p.sku}" ${isSelected ? 'checked' : ''}></td>`;

    COLUMNS.forEach((c, ci) => {
      if (c.key === 'status') {
        const cls = p.status === 'In Stock' ? 'in-stock' : p.status === 'Low Stock' ? 'low-stock' : 'out-of-stock';
        html += `<td><span class="status-badge status-${cls}">${p.status}</span></td>`;
      } else if (c.key === 'sku') {
        html += `<td class="sku-cell">${p.sku}</td>`;
      } else if (c.key === 'price') {
        html += `<td class="cell-editable" data-sku="${p.sku}" data-key="${c.key}" data-row="${ri}" data-col="${ci}">₹${p.price.toLocaleString()}</td>`;
      } else if (c.editable) {
        html += `<td class="cell-editable" data-sku="${p.sku}" data-key="${c.key}" data-row="${ri}" data-col="${ci}">${p[c.key]}</td>`;
      } else {
        html += `<td>${p[c.key]}</td>`;
      }
    });

    html += '</tr>';
  });

  html += '</tbody>';
  document.getElementById('invTable').innerHTML = html;

  // Selection count
  document.getElementById('selectedCount').textContent = selectedRows.size > 0 ? `${selectedRows.size} row(s) selected` : '';
  document.getElementById('bulkCategoryBtn').disabled = selectedRows.size === 0;
  document.getElementById('bulkReorderBtn').disabled = selectedRows.size === 0;

  attachEvents();
}

// ============================================================
// EVENTS
// ============================================================
function attachEvents() {
  // Select all
  document.getElementById('selectAll')?.addEventListener('change', e => {
    const data = getFilteredSorted();
    if (e.target.checked) data.forEach(d => selectedRows.add(d.sku));
    else selectedRows.clear();
    render();
  });

  // Row checkboxes
  document.querySelectorAll('input[data-sku]').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) selectedRows.add(e.target.dataset.sku);
      else selectedRows.delete(e.target.dataset.sku);
      render();
    });
  });

  // Sort headers
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
      render();
    });
  });

  // Filters
  document.querySelectorAll('.filter-input').forEach(inp => {
    inp.addEventListener('input', e => {
      filters[e.target.dataset.filter] = e.target.value;
      render();
      // Restore focus
      const restored = document.querySelector(`.filter-input[data-filter="${e.target.dataset.filter}"]`);
      if (restored) { restored.focus(); restored.selectionStart = restored.selectionEnd = restored.value.length; }
    });
  });

  // Inline editing — click
  document.querySelectorAll('.cell-editable').forEach(cell => {
    cell.addEventListener('dblclick', () => startEdit(cell));
  });
}

// ============================================================
// INLINE EDITING
// ============================================================
function startEdit(cell) {
  const sku = cell.dataset.sku;
  const key = cell.dataset.key;
  const product = products.find(p => p.sku === sku);
  if (!product) return;

  const col = COLUMNS.find(c => c.key === key);
  const val = product[key];

  cell.innerHTML = `<input class="cell-input" type="${col.type === 'number' ? 'number' : 'text'}" value="${val}">`;
  const input = cell.querySelector('.cell-input');
  input.focus();
  input.select();
  editingCell = { sku, key, cell };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commitEdit(input.value);
    if (e.key === 'Escape') cancelEdit();
  });

  input.addEventListener('blur', () => {
    if (editingCell) commitEdit(input.value);
  });
}

function commitEdit(value) {
  if (!editingCell) return;
  const { sku, key } = editingCell;
  const product = products.find(p => p.sku === sku);
  const col = COLUMNS.find(c => c.key === key);

  if (col.type === 'number') {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) product[key] = num;
  } else {
    if (value.trim()) product[key] = value.trim();
  }

  editingCell = null;
  render();
}

function cancelEdit() {
  editingCell = null;
  render();
}

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
document.addEventListener('keydown', e => {
  if (editingCell) return;
  const cells = document.querySelectorAll('.cell-editable');
  if (!cells.length) return;

  const rows = new Set();
  const cols = new Set();
  cells.forEach(c => { rows.add(parseInt(c.dataset.row)); cols.add(parseInt(c.dataset.col)); });
  const rowArr = [...rows].sort((a, b) => a - b);
  const colArr = [...cols].sort((a, b) => a - b);

  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const ri = rowArr.indexOf(focusRow);
    const ci = colArr.indexOf(focusCol);

    if (e.key === 'ArrowDown') focusRow = rowArr[Math.min(ri + 1, rowArr.length - 1)] ?? focusRow;
    if (e.key === 'ArrowUp') focusRow = rowArr[Math.max(ri - 1, 0)] ?? focusRow;
    if (e.key === 'ArrowRight') focusCol = colArr[Math.min(ci + 1, colArr.length - 1)] ?? focusCol;
    if (e.key === 'ArrowLeft') focusCol = colArr[Math.max(ci - 1, 0)] ?? focusCol;

    document.querySelectorAll('.focus-cell').forEach(c => c.classList.remove('focus-cell'));
    const target = document.querySelector(`.cell-editable[data-row="${focusRow}"][data-col="${focusCol}"]`);
    if (target) target.classList.add('focus-cell');
  }

  if (e.key === 'Enter') {
    const target = document.querySelector(`.cell-editable[data-row="${focusRow}"][data-col="${focusCol}"]`);
    if (target) startEdit(target);
  }
});

// ============================================================
// BULK ACTIONS
// ============================================================
document.getElementById('bulkCategoryBtn').addEventListener('click', () => {
  const cat = prompt('Enter new category for selected rows:');
  if (cat && cat.trim()) {
    products.filter(p => selectedRows.has(p.sku)).forEach(p => p.category = cat.trim());
    render();
  }
});

document.getElementById('bulkReorderBtn').addEventListener('click', () => {
  const level = parseInt(prompt('Enter new reorder level for selected rows:'), 10);
  if (!isNaN(level) && level >= 0) {
    products.filter(p => selectedRows.has(p.sku)).forEach(p => p.reorderLevel = level);
    render();
  }
});

// ============================================================
// INIT
// ============================================================
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Status auto-computation**: `stock === 0` → Out of Stock, `stock ≤ reorderLevel` → Low Stock, else In Stock
- **Inline editing**: double-click → replace cell HTML with `<input>`, Enter commits, Escape cancels, blur commits
- **Keyboard navigation**: Arrow keys track `focusRow`/`focusCol`, `.focus-cell` adds visible outline, Enter starts editing
- **Bulk actions**: filter products by `selectedRows.has(sku)`, batch update field, re-render
- **Column filtering**: per-column input fields, cascading filter with `String.includes()` matching
- **Sort**: localeCompare for strings, numeric subtraction for numbers, toggle direction on re-click

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | DOM, CSS, Tables |
| Technical 2 | Hard | Inline Edit, Keyboard Nav, Bulk Actions |
| Hiring Manager | Medium | Retail Tech, Inventory |
