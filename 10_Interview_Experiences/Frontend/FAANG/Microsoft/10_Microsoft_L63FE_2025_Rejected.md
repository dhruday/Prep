# Microsoft — L63 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 (Senior) |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Redmond |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Coding — Accessible Data Table with Sorting, Filtering, and Pagination

### Problem
Build a data table component with:
1. Column sorting (ascending/descending/none, click column header)
2. Client-side text filtering (search box)
3. Pagination with configurable page size
4. Row selection (single and multi-select with shift-click)
5. Full keyboard accessibility (ARIA roles, focus management)
6. Responsive: horizontal scroll on narrow screens

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Accessible Data Table</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 24px; }

.table-container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }

.table-toolbar { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; gap: 10px; }
.search-box { padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 14px; width: 260px; }
.search-box:focus { outline: 2px solid #0078d4; outline-offset: -1px; border-color: #0078d4; }
.page-size-select { padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 13px; }
.selection-info { font-size: 13px; color: #555; }

.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
thead { background: #fafafa; }
th { padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; color: #333; border-bottom: 2px solid #e0e0e0; cursor: pointer; user-select: none; white-space: nowrap; position: relative; }
th:hover { background: #f0f0f0; }
th:focus-visible { outline: 2px solid #0078d4; outline-offset: -2px; }
th .sort-indicator { margin-left: 6px; font-size: 11px; color: #888; }
th .sort-indicator.active { color: #0078d4; font-weight: 700; }

td { padding: 10px 14px; font-size: 14px; border-bottom: 1px solid #eee; color: #333; }
tr:hover td { background: #f8f9fa; }
tr.selected td { background: #e8f0fe; }
tr:focus-visible { outline: 2px solid #0078d4; outline-offset: -2px; }

.checkbox-cell { width: 40px; text-align: center; }
input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #0078d4; }

.pagination { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e0e0e0; font-size: 13px; color: #555; }
.pagination-controls { display: flex; gap: 4px; }
.page-btn { padding: 6px 12px; border: 1px solid #d0d0d0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; }
.page-btn:hover:not(:disabled) { background: #f0f0f0; }
.page-btn:disabled { opacity: 0.5; cursor: default; }
.page-btn.active { background: #0078d4; color: #fff; border-color: #0078d4; }
.page-btn:focus-visible { outline: 2px solid #0078d4; outline-offset: 1px; }

.no-results { padding: 40px; text-align: center; color: #888; font-size: 14px; }
</style>
</head>
<body>
<div class="table-container" id="app">
  <div class="table-toolbar">
    <input type="text" class="search-box" id="searchBox" placeholder="Search employees..." aria-label="Search table">
    <div style="display:flex;gap:10px;align-items:center;">
      <span class="selection-info" id="selectionInfo"></span>
      <label for="pageSize" style="font-size:13px;color:#555;">Rows:</label>
      <select class="page-size-select" id="pageSize" aria-label="Rows per page">
        <option value="5">5</option>
        <option value="10" selected>10</option>
        <option value="25">25</option>
        <option value="50">50</option>
      </select>
    </div>
  </div>
  <div class="table-wrapper">
    <table role="grid" aria-label="Employee data" id="dataTable">
      <thead id="tableHead"></thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<script>
// ============================================================
// SAMPLE DATA
// ============================================================
const COLUMNS = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'salary', label: 'Salary', align: 'right', format: v => '$' + v.toLocaleString() },
  { key: 'joinDate', label: 'Join Date' }
];

function generateData(count) {
  const depts = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Product', 'Operations'];
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Peter'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Lee', 'Davis', 'Chen', 'Garcia', 'Martinez'];

  const data = [];
  for (let i = 1; i <= count; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    data.push({
      id: i,
      name: first + ' ' + last,
      email: (first + '.' + last + '@company.com').toLowerCase(),
      department: depts[Math.floor(Math.random() * depts.length)],
      salary: Math.floor(60000 + Math.random() * 140000),
      joinDate: new Date(2018 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toLocaleDateString('en-US')
    });
  }
  return data;
}

const allData = generateData(87);

// ============================================================
// STATE
// ============================================================
let state = {
  sortKey: null,
  sortDir: 'none', // 'asc', 'desc', 'none'
  filter: '',
  page: 1,
  pageSize: 10,
  selectedIds: new Set(),
  lastClickedId: null
};

// ============================================================
// DERIVED DATA
// ============================================================
function getFilteredData() {
  const q = state.filter.toLowerCase();
  if (!q) return [...allData];
  return allData.filter(row =>
    COLUMNS.some(col => String(row[col.key]).toLowerCase().includes(q))
  );
}

function getSortedData(data) {
  if (!state.sortKey || state.sortDir === 'none') return data;
  const key = state.sortKey;
  const dir = state.sortDir === 'asc' ? 1 : -1;
  return data.sort((a, b) => {
    const va = a[key], vb = b[key];
    if (typeof va === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

function getPageData(data) {
  const start = (state.page - 1) * state.pageSize;
  return data.slice(start, start + state.pageSize);
}

function getTotalPages(data) {
  return Math.max(1, Math.ceil(data.length / state.pageSize));
}

// ============================================================
// RENDER
// ============================================================
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const pagination = document.getElementById('pagination');
const selectionInfo = document.getElementById('selectionInfo');

function render() {
  const filtered = getFilteredData();
  const sorted = getSortedData(filtered);
  const totalPages = getTotalPages(sorted);
  if (state.page > totalPages) state.page = totalPages;
  const pageData = getPageData(sorted);

  renderHead(filtered);
  renderBody(pageData);
  renderPagination(filtered.length, totalPages);
  renderSelectionInfo();
}

function renderHead(filteredData) {
  tableHead.innerHTML = '';
  const tr = document.createElement('tr');

  // Select-all checkbox
  const thCheck = document.createElement('th');
  thCheck.className = 'checkbox-cell';
  thCheck.setAttribute('scope', 'col');
  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.setAttribute('aria-label', 'Select all rows');
  selectAll.checked = filteredData.length > 0 && filteredData.every(r => state.selectedIds.has(r.id));
  selectAll.indeterminate = filteredData.some(r => state.selectedIds.has(r.id)) && !selectAll.checked;
  selectAll.addEventListener('change', () => {
    if (selectAll.checked) {
      filteredData.forEach(r => state.selectedIds.add(r.id));
    } else {
      state.selectedIds.clear();
    }
    render();
  });
  thCheck.appendChild(selectAll);
  tr.appendChild(thCheck);

  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.setAttribute('role', 'columnheader');
    th.setAttribute('tabindex', '0');
    th.setAttribute('aria-sort',
      state.sortKey === col.key ?
        (state.sortDir === 'asc' ? 'ascending' : state.sortDir === 'desc' ? 'descending' : 'none') : 'none'
    );
    if (col.width) th.style.width = col.width;

    const sortIndicator = document.createElement('span');
    sortIndicator.className = 'sort-indicator' + (state.sortKey === col.key && state.sortDir !== 'none' ? ' active' : '');
    sortIndicator.textContent = state.sortKey === col.key ?
      (state.sortDir === 'asc' ? '▲' : state.sortDir === 'desc' ? '▼' : '↕') : '↕';

    th.textContent = col.label;
    th.appendChild(sortIndicator);

    const toggleSort = () => {
      if (state.sortKey === col.key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : state.sortDir === 'desc' ? 'none' : 'asc';
        if (state.sortDir === 'none') state.sortKey = null;
      } else {
        state.sortKey = col.key;
        state.sortDir = 'asc';
      }
      state.page = 1;
      render();
    };

    th.addEventListener('click', toggleSort);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(); }
    });

    tr.appendChild(th);
  });

  tableHead.appendChild(tr);
}

function renderBody(pageData) {
  tableBody.innerHTML = '';

  if (pageData.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLUMNS.length + 1;
    td.className = 'no-results';
    td.textContent = 'No matching results found';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  pageData.forEach(row => {
    const tr = document.createElement('tr');
    tr.setAttribute('tabindex', '0');
    tr.setAttribute('role', 'row');
    tr.setAttribute('aria-selected', state.selectedIds.has(row.id));
    if (state.selectedIds.has(row.id)) tr.classList.add('selected');

    // Checkbox
    const tdCheck = document.createElement('td');
    tdCheck.className = 'checkbox-cell';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.selectedIds.has(row.id);
    cb.setAttribute('aria-label', 'Select row ' + row.id);
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleSelection(row.id, e);
    });
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);

    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      const val = row[col.key];
      td.textContent = col.format ? col.format(val) : val;
      if (col.align) td.style.textAlign = col.align;
      tr.appendChild(td);
    });

    // Row click
    tr.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      toggleSelection(row.id, e);
    });

    // Keyboard
    tr.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); toggleSelection(row.id, e); }
      if (e.key === 'ArrowDown') { e.preventDefault(); tr.nextElementSibling?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); tr.previousElementSibling?.focus(); }
    });

    tableBody.appendChild(tr);
  });
}

function toggleSelection(id, event) {
  if (event.shiftKey && state.lastClickedId !== null) {
    // Range select
    const filtered = getFilteredData();
    const sorted = getSortedData(filtered);
    const idx1 = sorted.findIndex(r => r.id === state.lastClickedId);
    const idx2 = sorted.findIndex(r => r.id === id);
    const [start, end] = [Math.min(idx1, idx2), Math.max(idx1, idx2)];
    for (let i = start; i <= end; i++) {
      state.selectedIds.add(sorted[i].id);
    }
  } else {
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
    } else {
      state.selectedIds.add(id);
    }
  }
  state.lastClickedId = id;
  render();
}

function renderPagination(totalItems, totalPages) {
  const start = (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, totalItems);

  pagination.innerHTML = '';

  const info = document.createElement('span');
  info.textContent = totalItems > 0 ? `${start}-${end} of ${totalItems}` : '0 results';
  pagination.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'pagination-controls';
  controls.setAttribute('role', 'navigation');
  controls.setAttribute('aria-label', 'Pagination');

  // Prev
  const prev = createPageBtn('‹ Prev', () => { state.page--; render(); }, state.page <= 1);

  // Page numbers
  const pageButtons = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 1) {
      const btn = createPageBtn(String(p), () => { state.page = p; render(); }, false);
      if (p === state.page) btn.classList.add('active');
      btn.setAttribute('aria-current', p === state.page ? 'page' : 'false');
      pageButtons.push(btn);
    } else if (pageButtons.length > 0 && pageButtons[pageButtons.length - 1].textContent !== '…') {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '…';
      ellipsis.style.padding = '6px 4px';
      pageButtons.push(ellipsis);
    }
  }

  // Next
  const next = createPageBtn('Next ›', () => { state.page++; render(); }, state.page >= totalPages);

  controls.appendChild(prev);
  pageButtons.forEach(b => controls.appendChild(b));
  controls.appendChild(next);
  pagination.appendChild(controls);
}

function createPageBtn(text, onClick, disabled) {
  const btn = document.createElement('button');
  btn.className = 'page-btn';
  btn.textContent = text;
  btn.disabled = disabled;
  if (!disabled) btn.addEventListener('click', onClick);
  return btn;
}

function renderSelectionInfo() {
  const count = state.selectedIds.size;
  selectionInfo.textContent = count > 0 ? `${count} selected` : '';
}

// ============================================================
// EVENTS
// ============================================================
const searchBox = document.getElementById('searchBox');
let searchTimeout;
searchBox.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.filter = searchBox.value;
    state.page = 1;
    render();
  }, 250);
});

document.getElementById('pageSize').addEventListener('change', (e) => {
  state.pageSize = parseInt(e.target.value);
  state.page = 1;
  render();
});

// Initial render
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Microsoft emphasizes **accessibility** — ARIA roles, keyboard navigation, focus management
- Sort cycle: none → asc → desc → none (three-state toggle) with `aria-sort` attribute
- **Shift-click range selection**: find indices of last-clicked and current in sorted array, select range
- Debounced search (250ms) prevents excessive re-renders during typing
- Pagination with ellipsis: show first, last, and ±1 around current page
- `indeterminate` checkbox state for "select all" when partial selection exists
- Responsive: `overflow-x: auto` on table wrapper for narrow screens
- Data generation function for realistic demo — shows practical thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals, Closures |
| FE Coding 1 | Medium | DOM Manipulation |
| FE Coding 2 | Hard | Table, Sort/Filter/Paginate, Accessibility |
| System Design | Hard | Design System Component Library |
| As-Appropriate | Medium | Growth Mindset, Collaboration |
