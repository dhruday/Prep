# Meta — E5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual Onsite

## Round 1: Coding — Build a Data Table with Sorting, Filtering, and Pagination
**Duration:** 45 minutes

### Problem
Implement a reusable data table component (vanilla JS) with:
- Column sorting (asc/desc toggle)
- Text filter per column
- Client-side pagination
- Row selection with Select All

### 💡 Interview-Ready Answer

```javascript
class DataTable {
  constructor(container, { columns, data, pageSize = 10 }) {
    this.container = container;
    this.columns = columns;  // [{ key, label, sortable, filterable, type }]
    this.originalData = [...data];
    this.filteredData = [...data];
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.sortKey = null;
    this.sortDirection = 'asc';
    this.filters = {};         // column key -> filter string
    this.selectedRows = new Set();

    this._build();
    this._render();
  }

  _build() {
    this.container.innerHTML = '';

    // Filter row
    this.filterRow = document.createElement('div');
    this.filterRow.className = 'dt-filters';
    this.filterRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;';
    this.container.appendChild(this.filterRow);

    // Table
    this.table = document.createElement('table');
    this.table.style.cssText = 'width:100%;border-collapse:collapse;';
    this.table.setAttribute('role', 'grid');
    this.container.appendChild(this.table);

    // Pagination bar
    this.paginationBar = document.createElement('div');
    this.paginationBar.className = 'dt-pagination';
    this.paginationBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:8px;';
    this.container.appendChild(this.paginationBar);

    this._buildFilters();
  }

  _buildFilters() {
    this.filterRow.innerHTML = '';
    this.columns.forEach(col => {
      if (!col.filterable) return;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;flex-direction:column;';

      const label = document.createElement('label');
      label.textContent = col.label;
      label.style.cssText = 'font-size:12px;color:#666;';
      wrapper.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Filter ${col.label}...`;
      input.style.cssText = 'padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;';
      input.addEventListener('input', () => {
        this.filters[col.key] = input.value.toLowerCase();
        this._applyFilters();
      });
      wrapper.appendChild(input);

      this.filterRow.appendChild(wrapper);
    });
  }

  _applyFilters() {
    this.filteredData = this.originalData.filter(row => {
      return Object.entries(this.filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(row[key] ?? '').toLowerCase();
        return cellValue.includes(filterValue);
      });
    });

    // Re-apply sort
    if (this.sortKey) {
      this._sortData();
    }

    this.currentPage = 1;
    this.selectedRows.clear();
    this._render();
  }

  _sortData() {
    const key = this.sortKey;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const col = this.columns.find(c => c.key === key);

    this.filteredData.sort((a, b) => {
      let va = a[key];
      let vb = b[key];

      if (col && col.type === 'number') {
        return (Number(va) - Number(vb)) * dir;
      }
      if (col && col.type === 'date') {
        return (new Date(va) - new Date(vb)) * dir;
      }

      va = String(va ?? '').toLowerCase();
      vb = String(vb ?? '').toLowerCase();
      return va.localeCompare(vb) * dir;
    });
  }

  _getPageData() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData.slice(start, end);
  }

  _getTotalPages() {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  _render() {
    this._renderTable();
    this._renderPagination();
  }

  _renderTable() {
    this.table.innerHTML = '';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Select All checkbox
    const selectAllTh = document.createElement('th');
    selectAllTh.style.cssText = 'padding:8px;border-bottom:2px solid #333;width:40px;';
    const selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.setAttribute('aria-label', 'Select all rows');

    const pageData = this._getPageData();
    const allPageSelected = pageData.length > 0 &&
      pageData.every(row => this.selectedRows.has(row));
    selectAllCb.checked = allPageSelected;
    selectAllCb.indeterminate = !allPageSelected &&
      pageData.some(row => this.selectedRows.has(row));

    selectAllCb.addEventListener('change', () => {
      if (selectAllCb.checked) {
        pageData.forEach(row => this.selectedRows.add(row));
      } else {
        pageData.forEach(row => this.selectedRows.delete(row));
      }
      this._renderTable();
    });

    selectAllTh.appendChild(selectAllCb);
    headerRow.appendChild(selectAllTh);

    // Column headers
    this.columns.forEach(col => {
      const th = document.createElement('th');
      th.style.cssText = 'padding:8px;border-bottom:2px solid #333;text-align:left;cursor:pointer;user-select:none;';

      const headerText = document.createElement('span');
      headerText.textContent = col.label;

      if (col.sortable) {
        const sortIcon = document.createElement('span');
        sortIcon.style.marginLeft = '4px';
        if (this.sortKey === col.key) {
          sortIcon.textContent = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
          sortIcon.textContent = ' ⇅';
          sortIcon.style.color = '#ccc';
        }

        th.addEventListener('click', () => {
          if (this.sortKey === col.key) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            this.sortKey = col.key;
            this.sortDirection = 'asc';
          }
          this._sortData();
          this._render();
        });

        headerText.appendChild(sortIcon);
      }

      th.appendChild(headerText);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    this.table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    if (pageData.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = this.columns.length + 1;
      td.style.cssText = 'padding:20px;text-align:center;color:#999;';
      td.textContent = 'No data found';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      pageData.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #eee;';

        if (this.selectedRows.has(row)) {
          tr.style.backgroundColor = '#e8f0fe';
        }

        // Row checkbox
        const selectTd = document.createElement('td');
        selectTd.style.padding = '8px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = this.selectedRows.has(row);
        cb.addEventListener('change', () => {
          if (cb.checked) {
            this.selectedRows.add(row);
          } else {
            this.selectedRows.delete(row);
          }
          this._renderTable();
        });
        selectTd.appendChild(cb);
        tr.appendChild(selectTd);

        // Data cells
        this.columns.forEach(col => {
          const td = document.createElement('td');
          td.style.padding = '8px';
          td.textContent = row[col.key] ?? '';
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    }

    this.table.appendChild(tbody);
  }

  _renderPagination() {
    const totalPages = this._getTotalPages();
    const totalItems = this.filteredData.length;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, totalItems);

    this.paginationBar.innerHTML = '';

    // Info
    const info = document.createElement('span');
    info.style.fontSize = '13px';
    info.textContent = totalItems > 0
      ? `${start}-${end} of ${totalItems} | Selected: ${this.selectedRows.size}`
      : 'No results';
    this.paginationBar.appendChild(info);

    // Page buttons
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:4px;';

    const createBtn = (text, page, disabled) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.disabled = disabled;
      btn.style.cssText = 'padding:4px 10px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:#fff;';
      if (disabled) btn.style.opacity = '0.5';
      btn.addEventListener('click', () => {
        this.currentPage = page;
        this._render();
      });
      return btn;
    };

    btnGroup.appendChild(createBtn('«', 1, this.currentPage === 1));
    btnGroup.appendChild(createBtn('‹', this.currentPage - 1, this.currentPage === 1));

    // Page numbers (show up to 5)
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    startPage = Math.max(1, endPage - maxVisible + 1);

    for (let p = startPage; p <= endPage; p++) {
      const btn = createBtn(String(p), p, false);
      if (p === this.currentPage) {
        btn.style.background = '#1a73e8';
        btn.style.color = '#fff';
        btn.style.borderColor = '#1a73e8';
      }
      btnGroup.appendChild(btn);
    }

    btnGroup.appendChild(createBtn('›', this.currentPage + 1, this.currentPage === totalPages));
    btnGroup.appendChild(createBtn('»', totalPages, this.currentPage === totalPages));

    this.paginationBar.appendChild(btnGroup);
  }

  // === Public API ===

  getSelectedRows() {
    return [...this.selectedRows];
  }

  setData(data) {
    this.originalData = [...data];
    this._applyFilters();
  }

  clearFilters() {
    this.filters = {};
    this.filterRow.querySelectorAll('input').forEach(i => i.value = '');
    this._applyFilters();
  }
}

// === Usage ===
/*
const data = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Employee ${i + 1}`,
  department: ['Engineering', 'Product', 'Design', 'Marketing'][i % 4],
  salary: 50000 + Math.floor(Math.random() * 100000),
  joinDate: `2020-${String((i % 12) + 1).padStart(2, '0')}-15`
}));

new DataTable(document.getElementById('app'), {
  columns: [
    { key: 'id', label: 'ID', sortable: true, type: 'number' },
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'department', label: 'Dept', sortable: true, filterable: true },
    { key: 'salary', label: 'Salary', sortable: true, type: 'number' },
    { key: 'joinDate', label: 'Joined', sortable: true, type: 'date' }
  ],
  data,
  pageSize: 15
});
*/
```

## 🎯 Key Takeaways
- Meta FE interviews test **reusable component design** — DataTable is a common ask
- Must support: sorting (asc/desc toggle), per-column filtering, client-side pagination
- **Select All** must handle indeterminate state and per-page scope
- Sort should handle different types: string (localeCompare), number, date
- Pagination with visible page range (max 5 buttons) is a great UX pattern

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Data Table, Sorting, Filtering, Pagination |
| Coding 2 | Medium | Event Delegation, Debounce |
| System Design | Hard | Facebook News Feed |
| Behavioral | Medium | Meta Values |
