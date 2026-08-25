# GoldmanSachs — VP Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President — UI Engineering |
| **Level** | VP |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | New York, NY |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Marquee Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 3 Technical + Superday)

---

## Round 1: Coding — High-Performance Data Grid
**Duration:** 60 minutes

### Question: Build a Financial Data Grid with Virtual Rendering + Real-Time Updates

```javascript
/**
 * High-Performance Financial Data Grid:
 * - 100K+ rows, 50+ columns
 * - Virtual rendering (only visible rows in DOM)
 * - Real-time WebSocket price updates (100+ updates/sec)
 * - Column sorting (click header)
 * - Cell flash: green for up, red for down (fade out)
 * - Frozen first column + header (horizontal + vertical scroll)
 * 
 * Key: batch DOM updates, requestAnimationFrame for renders, 
 * separate data model from view layer.
 */
class FinancialDataGrid {
  constructor(container, options = {}) {
    this.container = container;
    this.columns = options.columns || []; // [{ key, label, width, format, frozen }]
    this.data = [];        // Full dataset
    this.sortedIndices = []; // Indices into data[] in current sort order
    this.rowHeight = options.rowHeight || 28;
    this.headerHeight = 36;
    
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.viewportHeight = 0;
    this.viewportWidth = 0;
    
    this.sortColumn = null;
    this.sortDirection = 'asc';
    
    // Pending updates: batch cell updates to reduce DOM writes
    this.pendingUpdates = new Map(); // "row:col" → { value, prevValue }
    this.rafId = null;
    
    this.setup();
  }
  
  setup() {
    const totalWidth = this.columns.reduce((s, c) => s + (c.width || 100), 0);
    const frozenWidth = this.columns.filter(c => c.frozen).reduce((s, c) => s + (c.width || 100), 0);
    
    this.container.innerHTML = `
      <div class="fin-grid" role="grid" aria-label="Financial Data Grid"
           style="position:relative; overflow:hidden; height:100%; width:100%">
        
        <!-- Frozen header -->
        <div class="grid-frozen-header" 
             style="position:absolute; top:0; left:0; z-index:3; height:${this.headerHeight}px; width:${frozenWidth}px">
        </div>
        
        <!-- Scrollable header -->
        <div class="grid-header"
             style="position:absolute; top:0; left:${frozenWidth}px; z-index:2; height:${this.headerHeight}px; overflow:hidden">
          <div class="grid-header-inner" style="width:${totalWidth - frozenWidth}px"></div>
        </div>
        
        <!-- Frozen body column -->
        <div class="grid-frozen-body"
             style="position:absolute; top:${this.headerHeight}px; left:0; z-index:1; width:${frozenWidth}px; overflow:hidden">
          <div class="grid-frozen-inner"></div>
        </div>
        
        <!-- Scrollable body -->
        <div class="grid-body"
             style="position:absolute; top:${this.headerHeight}px; left:${frozenWidth}px; 
                    overflow:auto; bottom:0; right:0">
          <div class="grid-body-inner"
               style="width:${totalWidth - frozenWidth}px; height:${this.data.length * this.rowHeight}px; position:relative">
          </div>
        </div>
      </div>
    `;
    
    this.frozenHeaderEl = this.container.querySelector('.grid-frozen-header');
    this.headerEl = this.container.querySelector('.grid-header-inner');
    this.frozenBodyEl = this.container.querySelector('.grid-frozen-inner');
    this.bodyEl = this.container.querySelector('.grid-body-inner');
    this.scrollContainer = this.container.querySelector('.grid-body');
    
    this.viewportHeight = this.scrollContainer.clientHeight;
    this.viewportWidth = this.scrollContainer.clientWidth;
    
    // Scroll sync
    this.scrollContainer.addEventListener('scroll', () => {
      this.scrollTop = this.scrollContainer.scrollTop;
      this.scrollLeft = this.scrollContainer.scrollLeft;
      
      // Sync frozen body vertical scroll
      this.frozenBodyEl.parentElement.scrollTop = this.scrollTop;
      // Sync header horizontal scroll
      this.headerEl.parentElement.scrollLeft = this.scrollLeft;
      
      this.renderVisible();
    });
    
    this.renderHeaders();
  }
  
  setData(data) {
    this.data = data;
    this.sortedIndices = data.map((_, i) => i);
    this.bodyEl.style.height = `${data.length * this.rowHeight}px`;
    this.frozenBodyEl.style.height = `${data.length * this.rowHeight}px`;
    this.renderVisible();
  }
  
  renderHeaders() {
    const frozen = this.columns.filter(c => c.frozen);
    const scrollable = this.columns.filter(c => !c.frozen);
    
    this.frozenHeaderEl.innerHTML = frozen.map(col => 
      `<div class="grid-th" data-key="${col.key}" 
            style="width:${col.width || 100}px; display:inline-block; height:${this.headerHeight}px; line-height:${this.headerHeight}px"
            role="columnheader" tabindex="0">
        ${this._sanitize(col.label)}
        ${this.sortColumn === col.key ? (this.sortDirection === 'asc' ? '▲' : '▼') : ''}
      </div>`
    ).join('');
    
    this.headerEl.innerHTML = scrollable.map(col =>
      `<div class="grid-th" data-key="${col.key}"
            style="width:${col.width || 100}px; display:inline-block; height:${this.headerHeight}px; line-height:${this.headerHeight}px"
            role="columnheader" tabindex="0">
        ${this._sanitize(col.label)}
        ${this.sortColumn === col.key ? (this.sortDirection === 'asc' ? '▲' : '▼') : ''}
      </div>`
    ).join('');
    
    // Sort on header click
    this.container.querySelectorAll('.grid-th').forEach(th => {
      th.addEventListener('click', () => this.sort(th.dataset.key));
    });
  }
  
  renderVisible() {
    const startRow = Math.floor(this.scrollTop / this.rowHeight);
    const visibleRows = Math.ceil(this.viewportHeight / this.rowHeight);
    const endRow = Math.min(startRow + visibleRows + 2, this.sortedIndices.length);
    
    const frozen = this.columns.filter(c => c.frozen);
    const scrollable = this.columns.filter(c => !c.frozen);
    
    // Render frozen column
    let frozenHTML = '';
    let bodyHTML = '';
    
    for (let r = startRow; r < endRow; r++) {
      const dataIdx = this.sortedIndices[r];
      const row = this.data[dataIdx];
      const top = r * this.rowHeight;
      
      // Frozen cells
      frozenHTML += `<div class="grid-row" data-row="${dataIdx}" style="position:absolute; top:${top}px; height:${this.rowHeight}px" role="row">`;
      for (const col of frozen) {
        frozenHTML += this.renderCell(row, col, dataIdx);
      }
      frozenHTML += '</div>';
      
      // Scrollable cells
      bodyHTML += `<div class="grid-row" data-row="${dataIdx}" style="position:absolute; top:${top}px; height:${this.rowHeight}px" role="row">`;
      for (const col of scrollable) {
        bodyHTML += this.renderCell(row, col, dataIdx);
      }
      bodyHTML += '</div>';
    }
    
    this.frozenBodyEl.innerHTML = frozenHTML;
    this.bodyEl.innerHTML = bodyHTML;
  }
  
  renderCell(row, col, rowIdx) {
    const value = row[col.key];
    const formatted = col.format ? col.format(value) : value;
    const cellKey = `${rowIdx}:${col.key}`;
    const update = this.pendingUpdates.get(cellKey);
    
    let flashClass = '';
    if (update) {
      flashClass = update.value > update.prevValue ? 'flash-green' : 'flash-red';
      // Remove from pending after render
      setTimeout(() => this.pendingUpdates.delete(cellKey), 0);
    }
    
    return `<div class="grid-td ${flashClass}" data-cell="${cellKey}"
                 style="width:${col.width || 100}px; display:inline-block; height:${this.rowHeight}px; line-height:${this.rowHeight}px"
                 role="gridcell">${this._sanitize(String(formatted ?? ''))}</div>`;
  }
  
  // Real-time update: batch updates per animation frame
  updateCell(rowIdx, colKey, newValue) {
    const cellKey = `${rowIdx}:${colKey}`;
    const prevValue = this.data[rowIdx][colKey];
    
    this.data[rowIdx][colKey] = newValue;
    this.pendingUpdates.set(cellKey, { value: newValue, prevValue });
    
    // Batch render in next animation frame
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.renderVisible();
        this.rafId = null;
      });
    }
  }
  
  sort(colKey) {
    if (this.sortColumn === colKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = colKey;
      this.sortDirection = 'asc';
    }
    
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    
    this.sortedIndices.sort((a, b) => {
      const va = this.data[a][colKey];
      const vb = this.data[b][colKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    
    this.renderHeaders();
    this.renderVisible();
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Usage with WebSocket:
const grid = new FinancialDataGrid(document.getElementById('grid'), {
  columns: [
    { key: 'symbol', label: 'Symbol', width: 80, frozen: true },
    { key: 'last', label: 'Last', width: 80, format: v => v?.toFixed(2) },
    { key: 'change', label: 'Change', width: 80, format: v => (v > 0 ? '+' : '') + v?.toFixed(2) },
    { key: 'volume', label: 'Volume', width: 100, format: v => v?.toLocaleString() },
    { key: 'bid', label: 'Bid', width: 80, format: v => v?.toFixed(2) },
    { key: 'ask', label: 'Ask', width: 80, format: v => v?.toFixed(2) },
  ],
  rowHeight: 28
});

const ws = new WebSocket('wss://market-data.example.com');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // { rowIndex, field, value }
  grid.updateCell(update.rowIndex, update.field, update.value);
};
```

---

## 🎯 Key Takeaways
- GS VP FE = **High-performance data grid with real-time updates**
- **Virtual rendering**: only visible rows in DOM — `startRow = floor(scrollTop / rowHeight)`
- **Frozen columns**: separate DOM container, sync vertical scroll via `scrollTop`
- **requestAnimationFrame batching**: batch 100+ WebSocket updates per frame — one render per ~16ms
- **Cell flash**: green for up, red for down — CSS animation `flash-green { ... }` with `animation-duration: 0.5s`
- **Sort on sorted indices**: don't move data, reorder index array — `sortedIndices.sort(comparator)`
- **Scroll sync**: body scroll → sync frozen body (Y) + header (X) — 4 containers (frozen header, scrollable header, frozen body, scrollable body)
- GS FE = **financial data visualization** is the core skill — grids, charts, real-time, performance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium-Hard | DSA |
| Data Grid | Very Hard | Virtual Rendering, Real-Time, Performance |
| Technical 2 | Hard | React, WebSocket, Accessibility |
| Technical 3 | Hard | System Design, Architecture |
| Superday | Hard | Behavioral + Technical |
