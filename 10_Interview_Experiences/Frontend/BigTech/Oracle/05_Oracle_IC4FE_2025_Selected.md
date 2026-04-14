# Oracle — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Frontend Engineer |
| **Level** | IC4 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Oracle Cloud Infrastructure (OCI) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + FE Coding + System Design + HM)

---

## Round 2: Frontend Coding — Build an Enterprise Data Grid with Inline Editing
**Duration:** 75 minutes

### Challenge: Build a spreadsheet-like data grid supporting: inline cell editing, column sorting, column filtering, row selection (single + multi), keyboard navigation (Arrow keys, Tab, Enter to edit), and cell validation.

```javascript
/**
 * Enterprise Data Grid with Inline Editing:
 * 
 * Features:
 * - Click or Enter to start inline editing
 * - Tab moves to next cell, Shift+Tab to previous
 * - Arrow keys navigate between cells
 * - Escape cancels edit, Enter confirms
 * - Column sorting (asc/desc/none)
 * - Column filter input
 * - Checkbox row selection
 * - Cell validation with error highlighting
 */
class DataGrid {
  constructor(container, config) {
    this.container = container;
    this.columns = config.columns; // [{key, label, type:'text'|'number'|'date'|'select', options?, editable?, validate?}]
    this.rawData = config.data;
    this.sortKey = null;
    this.sortDir = null; // 'asc' | 'desc' | null
    this.filters = {}; // key → filter string
    this.selectedRows = new Set();
    this.editingCell = null; // {rowIdx, colIdx}
    this.focusedCell = { rowIdx: 0, colIdx: 0 };
    
    this.render();
  }
  
  get processedData() {
    let data = [...this.rawData];
    
    // Apply filters
    for (const [key, filter] of Object.entries(this.filters)) {
      if (!filter) continue;
      const lower = filter.toLowerCase();
      data = data.filter(row => String(row[key] ?? '').toLowerCase().includes(lower));
    }
    
    // Apply sort
    if (this.sortKey && this.sortDir) {
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const key = this.sortKey;
      data.sort((a, b) => {
        const va = a[key], vb = b[key];
        if (va == null && vb == null) return 0;
        if (va == null) return dir;
        if (vb == null) return -dir;
        if (typeof va === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    
    return data;
  }
  
  render() {
    const data = this.processedData;
    
    this.container.innerHTML = `
      <style>
        .dg-wrap { font-family:-apple-system,sans-serif; border:1px solid #d1d5db; border-radius:8px; overflow:hidden; }
        .dg-toolbar { display:flex; justify-content:space-between; padding:8px 12px; background:#f9fafb; border-bottom:1px solid #e5e7eb; font-size:13px; color:#666; }
        .dg-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .dg-th { padding:8px 12px; background:#f3f4f6; border-bottom:2px solid #e5e7eb; text-align:left; font-size:13px; font-weight:600; cursor:pointer; user-select:none; position:relative; }
        .dg-th:hover { background:#e5e7eb; }
        .dg-sort-icon { margin-left:4px; color:#9ca3af; }
        .dg-filter { width:100%; margin-top:4px; padding:3px 6px; border:1px solid #d1d5db; border-radius:3px; font-size:12px; }
        .dg-td { padding:0; border-bottom:1px solid #f3f4f6; position:relative; }
        .dg-cell { padding:8px 12px; font-size:13px; min-height:20px; cursor:default; outline:none; }
        .dg-cell.focused { box-shadow:inset 0 0 0 2px #276ef1; }
        .dg-cell.editing { padding:4px 8px; }
        .dg-cell-input { width:100%; padding:4px; border:1px solid #276ef1; border-radius:3px; font-size:13px; outline:none; }
        .dg-cell.invalid { background:#fef2f2; }
        .dg-error { position:absolute; bottom:-16px; left:8px; font-size:10px; color:#ef4444; z-index:1; }
        .dg-row:hover { background:#f8fafc; }
        .dg-row.selected { background:#eff6ff; }
        .dg-checkbox { cursor:pointer; }
        .dg-th-check { width:40px; }
      </style>
      <div class="dg-wrap">
        <div class="dg-toolbar">
          <span>${this.selectedRows.size > 0 ? `${this.selectedRows.size} row(s) selected` : `${data.length} rows`}</span>
        </div>
        <table class="dg-table" role="grid">
          <thead>
            <tr>
              <th class="dg-th dg-th-check">
                <input type="checkbox" class="dg-checkbox" id="select-all" 
                  ${this.selectedRows.size === data.length && data.length > 0 ? 'checked' : ''}>
              </th>
              ${this.columns.map(col => `
                <th class="dg-th" data-key="${col.key}">
                  <div>
                    ${this.esc(col.label)}
                    <span class="dg-sort-icon">${this.sortKey === col.key ? (this.sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                  </div>
                  <input class="dg-filter" type="text" placeholder="Filter..." 
                    data-filter-key="${col.key}" value="${this.esc(this.filters[col.key] || '')}"
                    onclick="event.stopPropagation()">
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, ri) => `
              <tr class="dg-row ${this.selectedRows.has(ri) ? 'selected' : ''}" data-row="${ri}">
                <td class="dg-td">
                  <div style="padding:8px 12px">
                    <input type="checkbox" class="dg-checkbox" data-row-check="${ri}" 
                      ${this.selectedRows.has(ri) ? 'checked' : ''}>
                  </div>
                </td>
                ${this.columns.map((col, ci) => {
                  const isEditing = this.editingCell?.rowIdx === ri && this.editingCell?.colIdx === ci;
                  const isFocused = this.focusedCell.rowIdx === ri && this.focusedCell.colIdx === ci;
                  const value = row[col.key] ?? '';
                  
                  if (isEditing && col.editable !== false) {
                    return `<td class="dg-td">
                      <div class="dg-cell editing">
                        ${col.type === 'select' ? 
                          `<select class="dg-cell-input" data-edit-ri="${ri}" data-edit-ci="${ci}">
                            ${(col.options || []).map(opt => 
                              `<option value="${this.esc(opt)}" ${opt === value ? 'selected' : ''}>${this.esc(opt)}</option>`
                            ).join('')}
                          </select>` :
                          `<input class="dg-cell-input" type="${col.type === 'number' ? 'number' : 'text'}" 
                            value="${this.esc(value)}" data-edit-ri="${ri}" data-edit-ci="${ci}" autofocus>`
                        }
                      </div>
                    </td>`;
                  }
                  
                  return `<td class="dg-td">
                    <div class="dg-cell ${isFocused ? 'focused' : ''}" 
                      tabindex="-1" data-ri="${ri}" data-ci="${ci}"
                      role="gridcell">${this.esc(value)}</div>
                  </td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    this.attachListeners();
    
    // Focus editing input
    const editInput = this.container.querySelector('.dg-cell-input');
    if (editInput) {
      editInput.focus();
      if (editInput.select) editInput.select();
    }
    
    // Focus active cell
    if (!this.editingCell) {
      const focusedEl = this.container.querySelector(
        `.dg-cell[data-ri="${this.focusedCell.rowIdx}"][data-ci="${this.focusedCell.colIdx}"]`
      );
      if (focusedEl) focusedEl.focus();
    }
  }
  
  attachListeners() {
    const data = this.processedData;
    
    // Sort headers
    this.container.querySelectorAll('.dg-th[data-key]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : this.sortDir === 'desc' ? null : 'asc';
          if (!this.sortDir) this.sortKey = null;
        } else {
          this.sortKey = key;
          this.sortDir = 'asc';
        }
        this.render();
      });
    });
    
    // Filters
    this.container.querySelectorAll('.dg-filter').forEach(input => {
      input.addEventListener('input', () => {
        this.filters[input.dataset.filterKey] = input.value;
        this.render();
      });
    });
    
    // Select all checkbox
    this.container.querySelector('#select-all')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        for (let i = 0; i < data.length; i++) this.selectedRows.add(i);
      } else {
        this.selectedRows.clear();
      }
      this.render();
    });
    
    // Row checkboxes
    this.container.querySelectorAll('[data-row-check]').forEach(cb => {
      cb.addEventListener('change', () => {
        const ri = parseInt(cb.dataset.rowCheck);
        if (cb.checked) this.selectedRows.add(ri); else this.selectedRows.delete(ri);
        this.render();
      });
    });
    
    // Cell click → focus
    this.container.querySelectorAll('.dg-cell[data-ri]').forEach(cell => {
      cell.addEventListener('click', () => {
        this.focusedCell = { rowIdx: parseInt(cell.dataset.ri), colIdx: parseInt(cell.dataset.ci) };
        this.editingCell = null;
        this.render();
      });
      
      // Double-click → edit
      cell.addEventListener('dblclick', () => {
        const ri = parseInt(cell.dataset.ri);
        const ci = parseInt(cell.dataset.ci);
        if (this.columns[ci].editable !== false) {
          this.startEditing(ri, ci);
        }
      });
    });
    
    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => this.onKeyDown(e));
    
    // Edit input handlers
    this.container.querySelectorAll('.dg-cell-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { this.commitEdit(input); }
        if (e.key === 'Escape') { this.cancelEdit(); }
        if (e.key === 'Tab') { e.preventDefault(); this.commitEdit(input); this.moveToNextCell(e.shiftKey); }
      });
      input.addEventListener('blur', () => this.commitEdit(input));
    });
  }
  
  onKeyDown(e) {
    if (this.editingCell) return; // Let edit input handle keys
    
    const { rowIdx, colIdx } = this.focusedCell;
    const data = this.processedData;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.focusedCell.rowIdx = Math.max(0, rowIdx - 1);
        this.render();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusedCell.rowIdx = Math.min(data.length - 1, rowIdx + 1);
        this.render();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.focusedCell.colIdx = Math.max(0, colIdx - 1);
        this.render();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.focusedCell.colIdx = Math.min(this.columns.length - 1, colIdx + 1);
        this.render();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.columns[colIdx].editable !== false) {
          this.startEditing(rowIdx, colIdx);
        }
        break;
      case 'Tab':
        e.preventDefault();
        this.moveToNextCell(e.shiftKey);
        break;
      case ' ':
        e.preventDefault();
        // Toggle row selection
        if (this.selectedRows.has(rowIdx)) this.selectedRows.delete(rowIdx);
        else this.selectedRows.add(rowIdx);
        this.render();
        break;
    }
  }
  
  startEditing(rowIdx, colIdx) {
    this.editingCell = { rowIdx, colIdx };
    this.focusedCell = { rowIdx, colIdx };
    this.render();
  }
  
  commitEdit(input) {
    if (!this.editingCell) return;
    
    const { rowIdx, colIdx } = this.editingCell;
    const data = this.processedData;
    const col = this.columns[colIdx];
    const newValue = col.type === 'number' ? parseFloat(input.value) : input.value;
    
    // Validate
    if (col.validate) {
      const error = col.validate(newValue);
      if (error) {
        input.classList.add('invalid');
        // Show error tooltip
        let errorEl = input.parentElement.querySelector('.dg-error');
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'dg-error';
          input.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = error;
        return;
      }
    }
    
    // Apply value to raw data
    data[rowIdx][col.key] = newValue;
    this.editingCell = null;
    this.render();
  }
  
  cancelEdit() {
    this.editingCell = null;
    this.render();
  }
  
  moveToNextCell(reverse) {
    const totalCols = this.columns.length;
    const totalRows = this.processedData.length;
    let { rowIdx, colIdx } = this.focusedCell;
    
    if (reverse) {
      colIdx--;
      if (colIdx < 0) { colIdx = totalCols - 1; rowIdx--; }
      if (rowIdx < 0) { rowIdx = 0; colIdx = 0; }
    } else {
      colIdx++;
      if (colIdx >= totalCols) { colIdx = 0; rowIdx++; }
      if (rowIdx >= totalRows) { rowIdx = totalRows - 1; colIdx = totalCols - 1; }
    }
    
    this.focusedCell = { rowIdx, colIdx };
    this.editingCell = null;
    this.render();
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- Oracle IC4 FE = **Enterprise data grid with inline editing, keyboard nav, sort, filter, validation**
- **Keyboard navigation**: Arrow keys + Tab/Shift+Tab for cell traversal — Enter starts editing, Escape cancels
- **Tab wrap**: Tab at last column → first column of next row; Shift+Tab at first column → last column of previous row
- **Inline editing**: Double-click or Enter → renders `<input>` in cell — commit on Enter/Tab/blur, cancel on Escape
- **Cell validation**: column-level `validate(value)` callback — returns error string or null
- **Sort cycle**: null → asc → desc → null — three-state with visual indicators ▲▼
- **Blocking paradigm**: filter ∩ sort = pipeline — filter first (reduces data set), then sort
- **Row selection**: checkbox + Space key toggle — select all via header checkbox
- **role="grid"**: WCAG grid pattern with role=gridcell on each cell
- Oracle Cloud = **enterprise-grade UIs** — data grids, tables, forms are core FE interview topics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| FE Coding (this) | Very Hard | Data Grid, Inline Editing, Keyboard Nav |
| System Design | Hard | OCI Dashboard Architecture |
| HM | Medium | Culture |
