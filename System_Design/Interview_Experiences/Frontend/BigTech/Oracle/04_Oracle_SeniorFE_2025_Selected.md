# Oracle — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Frontend Engineer |
| **Level** | IC3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Technical 1 + Technical 2 + HM)

---

## Round 2: Technical — Implement a Virtual Table with Column Resizing and Row Selection
**Duration:** 60 minutes

### Challenge: Build a high-performance data table that handles 100K+ rows with virtual scrolling, resizable columns, and multi-row selection.

```javascript
/**
 * Virtual Table with Column Resize + Multi-Row Selection:
 * - Virtual scrolling for 100K+ rows
 * - Column resizing via drag handles
 * - Multi-select with Shift+Click (range) and Cmd/Ctrl+Click (toggle)
 * - Sort by column
 * - Fixed header, scrollable body
 * - Keyboard navigation
 */
class VirtualTable {
  constructor(container, options = {}) {
    this.container = container;
    this.columns = options.columns || []; // [{ key, label, width, sortable }]
    this.data = options.data || [];
    this.rowHeight = options.rowHeight || 36;
    this.headerHeight = 40;
    
    this.scrollTop = 0;
    this.selectedRows = new Set(); // Set of row indices
    this.lastSelectedIndex = -1; // For shift-click range selection
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.sortedIndices = null; // Lazily computed sorted order
    
    // Column resize state
    this.resizing = null; // { columnIndex, startX, startWidth }
    
    this.render();
    this.attachListeners();
  }
  
  get sortedData() {
    if (!this.sortColumn) return this.data;
    
    if (!this.sortedIndices) {
      this.sortedIndices = Array.from({ length: this.data.length }, (_, i) => i);
      
      const key = this.sortColumn;
      const dir = this.sortDirection === 'asc' ? 1 : -1;
      
      this.sortedIndices.sort((a, b) => {
        const va = this.data[a][key];
        const vb = this.data[b][key];
        
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        
        if (typeof va === 'number' && typeof vb === 'number') {
          return (va - vb) * dir;
        }
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    
    return this.sortedIndices.map(i => this.data[i]);
  }
  
  get totalHeight() {
    return this.data.length * this.rowHeight;
  }
  
  get visibleRange() {
    const start = Math.floor(this.scrollTop / this.rowHeight);
    const viewportHeight = this.container.clientHeight - this.headerHeight;
    const count = Math.ceil(viewportHeight / this.rowHeight) + 2; // +2 for buffer
    
    return {
      start: Math.max(0, start - 1),
      end: Math.min(this.data.length, start + count)
    };
  }
  
  get totalWidth() {
    return this.columns.reduce((sum, col) => sum + col.width, 0);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="virtual-table" role="grid" aria-rowcount="${this.data.length}" tabindex="0"
           style="position:relative; width:100%; height:100%; overflow:hidden; border:1px solid #e5e7eb; font-family:-apple-system,sans-serif; font-size:13px">
        
        <!-- Fixed Header -->
        <div class="table-header" role="row" style="position:sticky; top:0; z-index:2; display:flex; height:${this.headerHeight}px; background:#f8f9fa; border-bottom:2px solid #e5e7eb; min-width:${this.totalWidth}px">
          <!-- Checkbox column -->
          <div style="width:40px; display:flex; align-items:center; justify-content:center; border-right:1px solid #e5e7eb">
            <input type="checkbox" id="select-all" 
                   ${this.selectedRows.size === this.data.length ? 'checked' : ''}
                   ${this.selectedRows.size > 0 && this.selectedRows.size < this.data.length ? 'indeterminate' : ''}
                   aria-label="Select all rows">
          </div>
          ${this.columns.map((col, i) => `
            <div class="th" data-col="${i}" role="columnheader"
                 style="width:${col.width}px; display:flex; align-items:center; padding:0 8px; position:relative; user-select:none; 
                        border-right:1px solid #e5e7eb; ${col.sortable ? 'cursor:pointer' : ''}"
                 ${col.sortable ? `aria-sort="${this.sortColumn === col.key ? this.sortDirection + 'ending' : 'none'}"` : ''}>
              <span style="flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                ${this.sanitize(col.label)}
              </span>
              ${this.sortColumn === col.key 
                ? `<span style="margin-left:4px">${this.sortDirection === 'asc' ? '▲' : '▼'}</span>` 
                : ''}
              <!-- Resize handle -->
              <div class="resize-handle" data-col="${i}"
                   style="position:absolute; right:-3px; top:0; width:6px; height:100%; cursor:col-resize; z-index:1"
                   aria-hidden="true"></div>
            </div>
          `).join('')}
        </div>
        
        <!-- Scrollable Body -->
        <div class="table-body" style="overflow-y:auto; overflow-x:auto; height:calc(100% - ${this.headerHeight}px)">
          <div class="scroll-container" style="position:relative; height:${this.totalHeight}px; min-width:${this.totalWidth + 40}px">
            ${this.renderVisibleRows()}
          </div>
        </div>
      </div>
    `;
  }
  
  renderVisibleRows() {
    const { start, end } = this.visibleRange;
    const sorted = this.sortedData;
    
    let html = '';
    for (let i = start; i < end; i++) {
      const row = sorted[i];
      if (!row) continue;
      
      const isSelected = this.selectedRows.has(i);
      const top = i * this.rowHeight;
      
      html += `
        <div class="table-row" data-index="${i}" role="row"
             style="position:absolute; top:${top}px; left:0; right:0; height:${this.rowHeight}px; display:flex; 
                    align-items:center; border-bottom:1px solid #f0f0f0; cursor:pointer;
                    background:${isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa'}"
             aria-selected="${isSelected}">
          <div style="width:40px; display:flex; align-items:center; justify-content:center">
            <input type="checkbox" ${isSelected ? 'checked' : ''} 
                   data-index="${i}" class="row-checkbox"
                   aria-label="Select row ${i + 1}">
          </div>
          ${this.columns.map(col => `
            <div style="width:${col.width}px; padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border-right:1px solid #f0f0f0"
                 title="${this.sanitize(String(row[col.key] ?? ''))}">
              ${this.sanitize(String(row[col.key] ?? ''))}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return html;
  }
  
  attachListeners() {
    const body = this.container.querySelector('.table-body');
    const table = this.container.querySelector('.virtual-table');
    
    // Virtual scroll
    body?.addEventListener('scroll', () => {
      this.scrollTop = body.scrollTop;
      const scrollContainer = body.querySelector('.scroll-container');
      if (scrollContainer) {
        scrollContainer.innerHTML = this.renderVisibleRows();
        this.attachRowListeners();
      }
    });
    
    // Column sort
    this.container.querySelectorAll('.th').forEach(th => {
      th.addEventListener('click', (e) => {
        if (e.target.closest('.resize-handle')) return;
        const colIndex = parseInt(th.dataset.col, 10);
        const col = this.columns[colIndex];
        if (!col.sortable) return;
        
        if (this.sortColumn === col.key) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = col.key;
          this.sortDirection = 'asc';
        }
        this.sortedIndices = null; // Invalidate cache
        this.render();
        this.attachListeners();
      });
    });
    
    // Column resize
    this.container.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const colIndex = parseInt(handle.dataset.col, 10);
        this.resizing = {
          columnIndex: colIndex,
          startX: e.clientX,
          startWidth: this.columns[colIndex].width
        };
        
        const onMouseMove = (moveE) => {
          if (!this.resizing) return;
          const delta = moveE.clientX - this.resizing.startX;
          const newWidth = Math.max(60, this.resizing.startWidth + delta);
          this.columns[this.resizing.columnIndex].width = newWidth;
          this.render();
          this.attachListeners();
        };
        
        const onMouseUp = () => {
          this.resizing = null;
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
    
    // Select all
    this.container.querySelector('#select-all')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        for (let i = 0; i < this.data.length; i++) this.selectedRows.add(i);
      } else {
        this.selectedRows.clear();
      }
      this.updateVisibleRows();
    });
    
    // Keyboard navigation
    table?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const next = Math.max(0, Math.min(this.data.length - 1, this.lastSelectedIndex + direction));
        
        if (e.shiftKey) {
          this.selectedRows.add(next);
        } else {
          this.selectedRows.clear();
          this.selectedRows.add(next);
        }
        this.lastSelectedIndex = next;
        
        // Scroll into view
        const rowTop = next * this.rowHeight;
        if (rowTop < this.scrollTop) {
          body.scrollTop = rowTop;
        } else if (rowTop + this.rowHeight > this.scrollTop + body.clientHeight) {
          body.scrollTop = rowTop - body.clientHeight + this.rowHeight;
        }
        
        this.updateVisibleRows();
      }
      
      if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        for (let i = 0; i < this.data.length; i++) this.selectedRows.add(i);
        this.updateVisibleRows();
      }
    });
    
    this.attachRowListeners();
  }
  
  attachRowListeners() {
    // Row click with Shift/Ctrl
    this.container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        const index = parseInt(row.dataset.index, 10);
        
        if (e.shiftKey && this.lastSelectedIndex >= 0) {
          // Range selection
          const from = Math.min(this.lastSelectedIndex, index);
          const to = Math.max(this.lastSelectedIndex, index);
          for (let i = from; i <= to; i++) this.selectedRows.add(i);
        } else if (e.metaKey || e.ctrlKey) {
          // Toggle individual
          if (this.selectedRows.has(index)) {
            this.selectedRows.delete(index);
          } else {
            this.selectedRows.add(index);
          }
        } else {
          // Single select
          this.selectedRows.clear();
          this.selectedRows.add(index);
        }
        
        this.lastSelectedIndex = index;
        this.updateVisibleRows();
      });
    });
    
    // Individual checkboxes
    this.container.querySelectorAll('.row-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const index = parseInt(cb.dataset.index, 10);
        if (cb.checked) this.selectedRows.add(index);
        else this.selectedRows.delete(index);
        this.lastSelectedIndex = index;
        this.updateVisibleRows();
      });
    });
  }
  
  updateVisibleRows() {
    const scrollContainer = this.container.querySelector('.scroll-container');
    if (scrollContainer) {
      scrollContainer.innerHTML = this.renderVisibleRows();
      this.attachRowListeners();
    }
    
    // Update select-all checkbox
    const selectAll = this.container.querySelector('#select-all');
    if (selectAll) {
      selectAll.checked = this.selectedRows.size === this.data.length;
      selectAll.indeterminate = this.selectedRows.size > 0 && this.selectedRows.size < this.data.length;
    }
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}

// Usage:
const columns = [
  { key: 'id', label: 'ID', width: 80, sortable: true },
  { key: 'name', label: 'Employee Name', width: 200, sortable: true },
  { key: 'department', label: 'Department', width: 150, sortable: true },
  { key: 'salary', label: 'Salary', width: 120, sortable: true },
  { key: 'location', label: 'Location', width: 150, sortable: true },
];

const data = Array.from({ length: 100000 }, (_, i) => ({
  id: i + 1,
  name: `Employee ${i + 1}`,
  department: ['Engineering', 'Product', 'Design', 'Sales'][i % 4],
  salary: 50000 + Math.floor(Math.random() * 150000),
  location: ['Bangalore', 'Hyderabad', 'Mumbai', 'Austin'][i % 4],
}));

new VirtualTable(document.getElementById('app'), { columns, data });
```

---

## 🎯 Key Takeaways
- Oracle FE = **Virtual table with column resize, sort, multi-select** — enterprise data grid component
- **Virtual scrolling**: only render visible rows — `floor(scrollTop / rowHeight)` → `+ceil(viewport / rowHeight)`
- **Column resize**: `mousedown` on 6px handle → `document mousemove` delta → `Math.max(60, startWidth + delta)`
- **Shift+Click range selection**: `for(i = min(last, current); i <= max; i++) selectedRows.add(i)`
- **Ctrl/Cmd+Click toggle**: `has(index) ? delete : add` — preserves other selections
- **Sorted indices**: `Array.from({length: N}, (_, i) => i).sort(comparator)` — avoid mutating original data
- **indeterminate checkbox**: `selectAll.indeterminate = partial` — visual cue for partial selection
- Oracle = **enterprise software** — data grids, forms, ERP/HCM dashboards, high data volume

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Technical 1 | Hard | Virtual Table, Column Resize |
| Technical 2 | Hard | Performance, React |
| HM | Medium | Culture Fit |
