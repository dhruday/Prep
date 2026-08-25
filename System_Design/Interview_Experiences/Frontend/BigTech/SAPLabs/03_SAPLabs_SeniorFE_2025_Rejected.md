# SAP Labs — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Frontend Developer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected (Final Round) |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP Fiori / SAPUI5 |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Server-Side Paginated Table with Column Reordering** (like SAP Fiori table)
- Server-side pagination: fetch page on demand
- Column reordering via drag and drop
- Column visibility toggle (show/hide columns)
- Sticky header
- Selection mode: single, multi, none
- Loading skeleton while fetching
- Persist column order + visibility in localStorage

### 💡 Paginated Table with Column Reorder

```javascript
class PaginatedTable {
  constructor(container, options = {}) {
    this.container = container;
    this.fetchData = options.fetchData; // async (page, pageSize, sort) => { data, total }
    this.initialColumns = options.columns; // [{ key, label, width, visible }]
    
    // State
    this.page = 1;
    this.pageSize = options.pageSize || 20;
    this.total = 0;
    this.data = [];
    this.sortKey = null;
    this.sortDir = 'asc';
    this.selectedRows = new Set();
    this.selectionMode = options.selectionMode || 'multi'; // single | multi | none
    this.loading = false;
    
    // Columns: restore from localStorage or use initial
    this.columns = this.restoreColumnConfig() || 
      this.initialColumns.map((c, i) => ({ ...c, visible: c.visible !== false, order: i }));
    
    this.render();
    this.fetchPage();
  }
  
  async fetchPage() {
    this.loading = true;
    this.renderBody();
    
    try {
      const result = await this.fetchData(this.page, this.pageSize, {
        key: this.sortKey,
        dir: this.sortDir
      });
      
      this.data = result.data;
      this.total = result.total;
      
    } catch (err) {
      console.error('Fetch error:', err);
      this.data = [];
    } finally {
      this.loading = false;
      this.renderBody();
      this.renderPagination();
    }
  }
  
  get visibleColumns() {
    return this.columns
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);
  }
  
  get totalPages() {
    return Math.ceil(this.total / this.pageSize);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="table-container" role="region" aria-label="Data table">
        <div class="table-toolbar">
          <div class="column-toggle">
            <button class="btn-columns" aria-haspopup="true" 
                    aria-expanded="false">⚙ Columns</button>
            <div class="column-panel" hidden role="dialog" aria-label="Column visibility">
              ${this.columns.map(c => `
                <label class="column-option">
                  <input type="checkbox" data-col="${c.key}" ${c.visible ? 'checked' : ''}>
                  ${this._sanitize(c.label)}
                </label>
              `).join('')}
            </div>
          </div>
          <span class="row-count" aria-live="polite"></span>
        </div>
        
        <div class="table-scroll">
          <table role="grid" aria-label="Data">
            <thead class="sticky-header">
              <tr role="row" class="header-row"></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        
        <div class="pagination" role="navigation" aria-label="Pagination"></div>
      </div>
    `;
    
    this.renderHeader();
    this.attachListeners();
  }
  
  renderHeader() {
    const headerRow = this.container.querySelector('.header-row');
    const cols = this.visibleColumns;
    
    let html = '';
    
    if (this.selectionMode !== 'none') {
      html += `<th class="select-cell" scope="col">
        ${this.selectionMode === 'multi' 
          ? `<input type="checkbox" class="select-all" aria-label="Select all">` 
          : ''}
      </th>`;
    }
    
    html += cols.map(col => `
      <th scope="col" draggable="true" data-key="${col.key}"
          style="width:${col.width || 'auto'};cursor:grab"
          aria-sort="${this.sortKey === col.key ? this.sortDir + 'ending' : 'none'}"
          tabindex="0" role="columnheader">
        <span class="th-content">
          ${this._sanitize(col.label)}
          <span class="sort-indicator">
            ${this.sortKey === col.key ? (this.sortDir === 'asc' ? '▲' : '▼') : ''}
          </span>
        </span>
      </th>
    `).join('');
    
    headerRow.innerHTML = html;
    
    this.setupDragDrop();
  }
  
  renderBody() {
    const tbody = this.container.querySelector('tbody');
    const cols = this.visibleColumns;
    
    if (this.loading) {
      // Skeleton rows
      tbody.innerHTML = Array.from({ length: this.pageSize }, () => `
        <tr class="skeleton-row" aria-hidden="true">
          ${this.selectionMode !== 'none' ? '<td><div class="skeleton"></div></td>' : ''}
          ${cols.map(() => '<td><div class="skeleton"></div></td>').join('')}
        </tr>
      `).join('');
      return;
    }
    
    if (this.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${cols.length + (this.selectionMode !== 'none' ? 1 : 0)}" 
        class="empty-state">No data available</td></tr>`;
      return;
    }
    
    tbody.innerHTML = this.data.map((row, i) => `
      <tr role="row" data-row-id="${row.id || i}" 
          class="${this.selectedRows.has(row.id || i) ? 'selected' : ''}"
          aria-selected="${this.selectedRows.has(row.id || i)}">
        ${this.selectionMode !== 'none' ? `
          <td class="select-cell">
            <input type="checkbox" ${this.selectedRows.has(row.id || i) ? 'checked' : ''}
                   aria-label="Select row ${i + 1}">
          </td>
        ` : ''}
        ${cols.map(col => `
          <td>${this._sanitize(String(row[col.key] ?? ''))}</td>
        `).join('')}
      </tr>
    `).join('');
    
    // Update row count
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.total);
    this.container.querySelector('.row-count').textContent = 
      `Showing ${start}-${end} of ${this.total}`;
  }
  
  renderPagination() {
    const pagination = this.container.querySelector('.pagination');
    const pages = this.totalPages;
    
    if (pages <= 1) {
      pagination.innerHTML = '';
      return;
    }
    
    // Show: first, prev, current-1, current, current+1, next, last
    let buttons = [];
    buttons.push(`<button ${this.page === 1 ? 'disabled' : ''} data-page="1" aria-label="First page">«</button>`);
    buttons.push(`<button ${this.page === 1 ? 'disabled' : ''} data-page="${this.page - 1}" aria-label="Previous page">‹</button>`);
    
    const start = Math.max(1, this.page - 2);
    const end = Math.min(pages, this.page + 2);
    
    if (start > 1) buttons.push('<span class="ellipsis">…</span>');
    
    for (let i = start; i <= end; i++) {
      buttons.push(`<button data-page="${i}" class="${i === this.page ? 'active' : ''}"
                     aria-current="${i === this.page ? 'page' : 'false'}">${i}</button>`);
    }
    
    if (end < pages) buttons.push('<span class="ellipsis">…</span>');
    
    buttons.push(`<button ${this.page === pages ? 'disabled' : ''} data-page="${this.page + 1}" aria-label="Next page">›</button>`);
    buttons.push(`<button ${this.page === pages ? 'disabled' : ''} data-page="${pages}" aria-label="Last page">»</button>`);
    
    pagination.innerHTML = buttons.join('');
    
    pagination.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.page = parseInt(btn.dataset.page);
        this.fetchPage();
      });
    });
  }
  
  setupDragDrop() {
    let draggedKey = null;
    
    this.container.querySelectorAll('th[draggable]').forEach(th => {
      th.addEventListener('dragstart', (e) => {
        draggedKey = th.dataset.key;
        th.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      th.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        th.classList.add('drag-over');
      });
      
      th.addEventListener('dragleave', () => {
        th.classList.remove('drag-over');
      });
      
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        th.classList.remove('drag-over');
        
        const targetKey = th.dataset.key;
        if (draggedKey && draggedKey !== targetKey) {
          this.reorderColumns(draggedKey, targetKey);
        }
      });
      
      th.addEventListener('dragend', () => {
        th.classList.remove('dragging');
        draggedKey = null;
      });
    });
  }
  
  reorderColumns(fromKey, toKey) {
    const fromCol = this.columns.find(c => c.key === fromKey);
    const toCol = this.columns.find(c => c.key === toKey);
    
    if (!fromCol || !toCol) return;
    
    // Swap orders
    const tempOrder = fromCol.order;
    fromCol.order = toCol.order;
    toCol.order = tempOrder;
    
    this.saveColumnConfig();
    this.renderHeader();
    this.renderBody();
  }
  
  attachListeners() {
    // Column visibility toggle
    const btnColumns = this.container.querySelector('.btn-columns');
    const panel = this.container.querySelector('.column-panel');
    
    btnColumns.addEventListener('click', () => {
      const isOpen = !panel.hidden;
      panel.hidden = isOpen;
      btnColumns.setAttribute('aria-expanded', !isOpen);
    });
    
    panel.addEventListener('change', (e) => {
      const checkbox = e.target;
      const col = this.columns.find(c => c.key === checkbox.dataset.col);
      if (col) {
        col.visible = checkbox.checked;
        this.saveColumnConfig();
        this.renderHeader();
        this.renderBody();
      }
    });
    
    // Sort
    this.container.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-key]');
      if (!th) return;
      
      const key = th.dataset.key;
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortDir = 'asc';
      }
      
      this.page = 1; // Reset to first page on sort
      this.fetchPage();
    });
    
    // Row selection
    this.container.querySelector('tbody').addEventListener('change', (e) => {
      const checkbox = e.target;
      if (!checkbox.matches('input[type="checkbox"]')) return;
      
      const row = checkbox.closest('tr');
      const rowId = row.dataset.rowId;
      
      if (this.selectionMode === 'single') {
        this.selectedRows.clear();
        if (checkbox.checked) this.selectedRows.add(rowId);
      } else {
        if (checkbox.checked) this.selectedRows.add(rowId);
        else this.selectedRows.delete(rowId);
      }
      
      this.renderBody();
    });
    
    // Select all
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('select-all')) {
        this.data.forEach(row => {
          const id = row.id || this.data.indexOf(row);
          if (e.target.checked) this.selectedRows.add(id);
          else this.selectedRows.delete(id);
        });
        this.renderBody();
      }
    });
    
    // Close column panel on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.querySelector('.column-toggle').contains(e.target)) {
        panel.hidden = true;
        btnColumns.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  saveColumnConfig() {
    const config = this.columns.map(c => ({
      key: c.key,
      visible: c.visible,
      order: c.order
    }));
    
    try {
      localStorage.setItem('table-columns', JSON.stringify(config));
    } catch (e) {}
  }
  
  restoreColumnConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('table-columns'));
      if (!saved || !Array.isArray(saved)) return null;
      
      // Merge saved config with initial columns (handles new/removed columns)
      return this.initialColumns.map((col, i) => {
        const savedCol = saved.find(s => s.key === col.key);
        return {
          ...col,
          visible: savedCol ? savedCol.visible : col.visible !== false,
          order: savedCol ? savedCol.order : i
        };
      });
    } catch {
      return null;
    }
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
- SAP Labs FE = **Enterprise table component with column reorder + server pagination**
- **Drag-and-drop column reorder**: native HTML5 DnD on `<th>` elements — swap `order` property
- **Server-side pagination**: `page` and `pageSize` sent to API — reset to page 1 on sort change
- **Loading skeleton**: render placeholder rows with CSS animation while fetching — better UX than spinner
- **Column visibility**: checkbox panel + localStorage — merge saved config with initial columns for forward compatibility
- **Selection modes**: `single` clears set before adding, `multi` toggles, `none` hides checkboxes
- **Pagination UX**: show first/prev/current-range/next/last with ellipsis — cap at 5 visible page buttons
- SAP Labs rejected in final round — **HM/culture fit** is a common rejection point

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | DnD, Pagination, Enterprise UX |
| Technical | Medium-Hard | JS Internals, Fiori |
| HM | Medium | Culture Fit |
