# Salesforce — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Frontend Engineer |
| **Level** | LMTS |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Glassdoor](https://www.geeksforgeeks.org/salesforce-interview-experience/-E11159.htm) |
| **Author** | Anonymous |
| **Team** | Lightning Web Components |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Coding + Machine Coding + System Design + HM)

---

## Round 1: Machine Coding
**Duration:** 75 minutes

### Challenge
**Build a Data Grid with Inline Editing** (CRM-style)
- Display tabular data with column headers
- Inline editing: click cell to edit, Enter to save, Escape to cancel
- Cell types: text, number, dropdown, checkbox, date
- Row selection (single and multi-select with Shift+Click)
- Undo/Redo for edits
- Export to CSV

### 💡 Data Grid with Inline Editing

```javascript
class DataGrid {
  constructor(container, options) {
    this.container = container;
    this.columns = options.columns; // [{ key, label, type, options?, editable? }]
    this.data = options.data.map((row, i) => ({ ...row, _id: i })); // Add internal ID
    this.selectedRows = new Set();
    this.editingCell = null; // { rowId, colKey }
    this.undoStack = [];
    this.redoStack = [];
    this.lastSelectedRow = null;
    
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="data-grid-wrapper">
        <div class="grid-toolbar">
          <button class="btn-undo" disabled aria-label="Undo">↩ Undo</button>
          <button class="btn-redo" disabled aria-label="Redo">↪ Redo</button>
          <span class="selected-count" aria-live="polite">
            ${this.selectedRows.size > 0 ? `${this.selectedRows.size} selected` : ''}
          </span>
          <button class="btn-export">📥 Export CSV</button>
        </div>
        <div class="grid-container" role="grid" aria-label="Data grid">
          <table>
            <thead>
              <tr role="row">
                <th role="columnheader" class="checkbox-col">
                  <input type="checkbox" class="select-all" aria-label="Select all rows"
                         ${this.selectedRows.size === this.data.length ? 'checked' : ''}>
                </th>
                ${this.columns.map(col => `
                  <th role="columnheader" scope="col">${this._sanitize(col.label)}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${this.data.map(row => this.renderRow(row)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderRow(row) {
    const isSelected = this.selectedRows.has(row._id);
    
    return `
      <tr role="row" data-id="${row._id}" class="${isSelected ? 'row-selected' : ''}">
        <td class="checkbox-col">
          <input type="checkbox" class="row-checkbox" data-id="${row._id}"
                 ${isSelected ? 'checked' : ''} aria-label="Select row">
        </td>
        ${this.columns.map(col => {
          const isEditing = this.editingCell?.rowId === row._id && this.editingCell?.colKey === col.key;
          const value = row[col.key];
          
          if (isEditing) {
            return `<td class="cell-editing">${this.renderEditCell(col, value)}</td>`;
          }
          
          return `
            <td role="gridcell" class="cell ${col.editable ? 'cell-editable' : ''}"
                data-id="${row._id}" data-col="${col.key}" tabindex="0"
                ${col.editable ? 'title="Click to edit"' : ''}>
              ${this.formatValue(value, col)}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }
  
  renderEditCell(col, value) {
    switch (col.type) {
      case 'text':
        return `<input type="text" class="cell-input" value="${this._sanitize(String(value || ''))}" autofocus>`;
      case 'number':
        return `<input type="number" class="cell-input" value="${value || 0}" autofocus>`;
      case 'dropdown':
        return `<select class="cell-input" autofocus>
          ${(col.options || []).map(opt => 
            `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
          ).join('')}
        </select>`;
      case 'checkbox':
        return `<input type="checkbox" class="cell-input" ${value ? 'checked' : ''} autofocus>`;
      case 'date':
        return `<input type="date" class="cell-input" value="${value || ''}" autofocus>`;
      default:
        return `<input type="text" class="cell-input" value="${this._sanitize(String(value || ''))}" autofocus>`;
    }
  }
  
  formatValue(value, col) {
    if (value == null) return '<span class="cell-empty">—</span>';
    
    switch (col.type) {
      case 'checkbox': return value ? '☑' : '☐';
      case 'number': return typeof value === 'number' ? value.toLocaleString() : value;
      case 'date': return value ? new Date(value).toLocaleDateString() : '—';
      default: return this._sanitize(String(value));
    }
  }
  
  attachListeners() {
    const tbody = this.container.querySelector('tbody');
    
    // Click to edit
    tbody.addEventListener('dblclick', (e) => {
      const cell = e.target.closest('.cell-editable');
      if (!cell) return;
      this.startEdit(parseInt(cell.dataset.id), cell.dataset.col);
    });
    
    // Keyboard: Enter to start edit, Escape to cancel
    tbody.addEventListener('keydown', (e) => {
      const cell = e.target.closest('.cell-editable');
      if (cell && (e.key === 'Enter' || e.key === 'F2')) {
        e.preventDefault();
        this.startEdit(parseInt(cell.dataset.id), cell.dataset.col);
      }
    });
    
    // Save/Cancel edit
    this.container.addEventListener('keydown', (e) => {
      if (!this.editingCell) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveEdit();
      } else if (e.key === 'Escape') {
        this.cancelEdit();
      }
    });
    
    // Click outside to save
    this.container.addEventListener('click', (e) => {
      if (this.editingCell && !e.target.closest('.cell-editing')) {
        this.saveEdit();
      }
    });
    
    // Row selection (with Shift+Click for range)
    this.container.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const rowId = parseInt(e.target.dataset.id);
        
        if (e.shiftKey && this.lastSelectedRow !== null) {
          // Range select
          const start = Math.min(this.lastSelectedRow, rowId);
          const end = Math.max(this.lastSelectedRow, rowId);
          for (let i = start; i <= end; i++) {
            this.selectedRows.add(i);
          }
        } else {
          if (e.target.checked) this.selectedRows.add(rowId);
          else this.selectedRows.delete(rowId);
        }
        
        this.lastSelectedRow = rowId;
        this.render();
      });
    });
    
    // Select all
    this.container.querySelector('.select-all')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.data.forEach(row => this.selectedRows.add(row._id));
      } else {
        this.selectedRows.clear();
      }
      this.render();
    });
    
    // Undo/Redo
    this.container.querySelector('.btn-undo').addEventListener('click', () => this.undo());
    this.container.querySelector('.btn-redo').addEventListener('click', () => this.redo());
    
    // Export CSV
    this.container.querySelector('.btn-export').addEventListener('click', () => this.exportCSV());
  }
  
  startEdit(rowId, colKey) {
    const col = this.columns.find(c => c.key === colKey);
    if (!col?.editable) return;
    
    this.editingCell = { rowId, colKey };
    this.render();
    
    // Focus the input
    const input = this.container.querySelector('.cell-input');
    if (input) {
      input.focus();
      if (input.type === 'text') input.select();
    }
  }
  
  saveEdit() {
    if (!this.editingCell) return;
    
    const input = this.container.querySelector('.cell-input');
    if (!input) return;
    
    const { rowId, colKey } = this.editingCell;
    const row = this.data.find(r => r._id === rowId);
    const oldValue = row[colKey];
    
    let newValue;
    if (input.type === 'checkbox') newValue = input.checked;
    else if (input.type === 'number') newValue = parseFloat(input.value);
    else newValue = input.value;
    
    if (oldValue !== newValue) {
      // Push to undo stack
      this.undoStack.push({ rowId, colKey, oldValue, newValue });
      this.redoStack = []; // Clear redo on new edit
      
      row[colKey] = newValue;
    }
    
    this.editingCell = null;
    this.render();
  }
  
  cancelEdit() {
    this.editingCell = null;
    this.render();
  }
  
  undo() {
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();
    const row = this.data.find(r => r._id === action.rowId);
    row[action.colKey] = action.oldValue;
    this.redoStack.push(action);
    this.render();
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();
    const row = this.data.find(r => r._id === action.rowId);
    row[action.colKey] = action.newValue;
    this.undoStack.push(action);
    this.render();
  }
  
  exportCSV() {
    const rows = this.selectedRows.size > 0
      ? this.data.filter(r => this.selectedRows.has(r._id))
      : this.data;
    
    const headers = this.columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const csvRows = rows.map(row =>
      this.columns.map(col => {
        const val = row[col.key];
        if (val == null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
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
- Salesforce FE = **Data Grid + Inline Editing + LWC knowledge + Undo/Redo**
- **Inline editing**: double-click to enter edit mode, Enter to save, Escape to cancel
- **Cell types**: text, number, dropdown, checkbox, date — render different inputs per type
- **Shift+Click range select**: track `lastSelectedRow`, select all between last and current
- **Undo/Redo**: push `{ rowId, colKey, oldValue, newValue }` to stack, swap values on undo
- **CSV export**: proper escaping — double-quote values, escape inner quotes with `""`
- **`URL.createObjectURL`**: create download link from Blob → click → revoke URL
- Salesforce interviews: LWC (Lightning Web Components) / Shadow DOM knowledge is a strong plus

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Coding | Medium | JS Polyfills |
| Machine Coding | Hard | Data Grid, Inline Edit, CSV Export |
| System Design | Medium-Hard | CRM Architecture |
| HM | Medium | Culture, Values |
