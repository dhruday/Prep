# SAPLabs — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Frontend Engineer |
| **Level** | T3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP Analytics Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + FE Coding + System Design + HM)

---

## Round 2: Frontend Coding — Build a Dashboard Widget System
**Duration:** 75 minutes

### Challenge: Build a configurable dashboard with draggable widgets: chart (bar/line/pie), KPI card, table, and text. Support grid-based layout, widget resize, widget configuration panel, and responsive breakpoints.

```javascript
/**
 * Dashboard Widget System:
 * 
 * - Grid-based layout (12 columns)
 * - Widget types: kpi, bar_chart, table, text
 * - Drag to move, resize handles
 * - Widget config panel (title, data source, chart type)
 * - Responsive: 12 cols → 6 cols → 1 col
 */
class DashboardBuilder {
  constructor(container) {
    this.container = container;
    this.widgets = [
      { id: 'w1', type: 'kpi', title: 'Total Revenue', value: '₹4.2Cr', change: '+12.5%', positive: true, col: 0, row: 0, width: 3, height: 2 },
      { id: 'w2', type: 'kpi', title: 'Active Users', value: '28,432', change: '-3.2%', positive: false, col: 3, row: 0, width: 3, height: 2 },
      { id: 'w3', type: 'bar_chart', title: 'Monthly Sales', data: [40,65,45,80,55,90,70,85,60,95,75,88], labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], col: 6, row: 0, width: 6, height: 4 },
      { id: 'w4', type: 'table', title: 'Top Products', headers: ['Product','Revenue','Units'], rows: [['Widget A','₹12.5L','1,234'],['Widget B','₹9.8L','987'],['Widget C','₹7.2L','654'],['Widget D','₹5.1L','432']], col: 0, row: 2, width: 6, height: 4 },
      { id: 'w5', type: 'text', title: 'Notes', content: 'Q1 results exceeded targets by 15%. Focus on expanding Widget A distribution in South region.', col: 0, row: 6, width: 12, height: 2 },
    ];
    this.cellSize = 80; // px per grid unit
    this.cols = 12;
    this.selectedWidget = null;
    this.isDragging = false;
    this.isResizing = false;
    
    this.render();
  }
  
  render() {
    const gridWidth = this.cols * this.cellSize;
    const maxRow = Math.max(...this.widgets.map(w => w.row + w.height));
    const gridHeight = (maxRow + 2) * this.cellSize;
    
    this.container.innerHTML = `
      <style>
        .db-layout { display:flex; font-family:-apple-system,sans-serif; }
        .db-canvas { flex:1; position:relative; background:#f3f4f6; min-height:${gridHeight}px; border-radius:8px; overflow:hidden; }
        .db-grid-lines { position:absolute; inset:0; pointer-events:none; }
        .db-widget { position:absolute; background:#fff; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden; cursor:grab; transition:box-shadow 0.15s; }
        .db-widget:hover { box-shadow:0 4px 12px rgba(0,0,0,0.15); }
        .db-widget.selected { box-shadow:0 0 0 2px #276ef1, 0 4px 12px rgba(0,0,0,0.15); }
        .db-widget-header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #f3f4f6; }
        .db-widget-title { font-size:12px; font-weight:600; color:#374151; }
        .db-widget-body { padding:12px; height:calc(100% - 37px); overflow:hidden; }
        .db-resize-handle { position:absolute; bottom:0; right:0; width:16px; height:16px; cursor:nwse-resize; z-index:2; }
        .db-resize-handle::after { content:''; position:absolute; bottom:3px; right:3px; width:8px; height:8px; border-right:2px solid #9ca3af; border-bottom:2px solid #9ca3af; }
        /* KPI */
        .db-kpi-value { font-size:28px; font-weight:700; color:#111827; }
        .db-kpi-change { font-size:13px; margin-top:4px; }
        .db-kpi-positive { color:#22c55e; }
        .db-kpi-negative { color:#ef4444; }
        /* Chart */
        .db-chart { display:flex; align-items:flex-end; gap:4px; height:100%; }
        .db-bar { background:#276ef1; border-radius:3px 3px 0 0; flex:1; min-width:8px; transition:height 0.3s; position:relative; }
        .db-bar:hover { background:#1d4ed8; }
        .db-bar-label { position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); font-size:9px; color:#888; white-space:nowrap; }
        /* Table */
        .db-table { width:100%; border-collapse:collapse; font-size:12px; }
        .db-table th { text-align:left; padding:4px 8px; border-bottom:1px solid #e5e7eb; font-weight:600; color:#6b7280; }
        .db-table td { padding:4px 8px; border-bottom:1px solid #f3f4f6; }
        /* Config panel */
        .db-config { width:260px; background:#fff; border-left:1px solid #e5e7eb; padding:16px; display:none; }
        .db-config.open { display:block; }
        .db-config-title { font-size:14px; font-weight:600; margin-bottom:12px; }
        .db-config-field { margin-bottom:10px; }
        .db-config-label { font-size:12px; color:#666; margin-bottom:4px; display:block; }
        .db-config-input { width:100%; padding:6px 8px; border:1px solid #d1d5db; border-radius:4px; font-size:13px; }
        .db-toolbar { display:flex; gap:8px; padding:8px 0; margin-bottom:8px; }
        .db-tool-btn { padding:6px 12px; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; font-size:12px; background:#fff; }
        .db-tool-btn:hover { background:#f3f4f6; }
      </style>
      <div class="db-toolbar">
        <button class="db-tool-btn" data-add="kpi">+ KPI Card</button>
        <button class="db-tool-btn" data-add="bar_chart">+ Bar Chart</button>
        <button class="db-tool-btn" data-add="table">+ Table</button>
        <button class="db-tool-btn" data-add="text">+ Text</button>
      </div>
      <div class="db-layout">
        <div class="db-canvas" id="dashboard-canvas">
          ${this.renderGridLines()}
          ${this.widgets.map(w => this.renderWidget(w)).join('')}
        </div>
        <div class="db-config ${this.selectedWidget ? 'open' : ''}" id="config-panel">
          ${this.selectedWidget ? this.renderConfig(this.selectedWidget) : ''}
        </div>
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderGridLines() {
    let lines = '';
    for (let c = 0; c <= this.cols; c++) {
      lines += `<div style="position:absolute;left:${c * this.cellSize}px;top:0;bottom:0;width:1px;background:rgba(0,0,0,0.05)"></div>`;
    }
    return `<div class="db-grid-lines">${lines}</div>`;
  }
  
  renderWidget(w) {
    const x = w.col * this.cellSize;
    const y = w.row * this.cellSize;
    const width = w.width * this.cellSize;
    const height = w.height * this.cellSize;
    const selected = this.selectedWidget?.id === w.id;
    
    return `
      <div class="db-widget ${selected ? 'selected' : ''}" data-wid="${w.id}"
        style="left:${x}px;top:${y}px;width:${width}px;height:${height}px;">
        <div class="db-widget-header">
          <span class="db-widget-title">${this.esc(w.title)}</span>
          <span style="font-size:10px;color:#9ca3af">${w.type}</span>
        </div>
        <div class="db-widget-body">
          ${this.renderWidgetContent(w)}
        </div>
        <div class="db-resize-handle" data-resize="${w.id}"></div>
      </div>
    `;
  }
  
  renderWidgetContent(w) {
    switch (w.type) {
      case 'kpi':
        return `
          <div class="db-kpi-value">${this.esc(w.value || '—')}</div>
          <div class="db-kpi-change ${w.positive ? 'db-kpi-positive' : 'db-kpi-negative'}">
            ${w.positive ? '↑' : '↓'} ${this.esc(w.change || '')}
          </div>
        `;
      
      case 'bar_chart': {
        const data = w.data || [];
        const max = Math.max(...data, 1);
        const bodyHeight = (w.height * this.cellSize) - 57; // Subtract header + padding
        return `
          <div class="db-chart" style="height:${bodyHeight - 20}px">
            ${data.map((v, i) => `
              <div class="db-bar" style="height:${(v / max) * 100}%">
                <span class="db-bar-label">${this.esc(w.labels?.[i] || '')}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      case 'table':
        return `
          <table class="db-table">
            <thead><tr>${(w.headers || []).map(h => `<th>${this.esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${(w.rows || []).map(row => 
              `<tr>${row.map(cell => `<td>${this.esc(cell)}</td>`).join('')}</tr>`
            ).join('')}</tbody>
          </table>
        `;
      
      case 'text':
        return `<div style="font-size:13px;color:#374151;line-height:1.6">${this.esc(w.content || '')}</div>`;
      
      default:
        return `<div style="color:#9ca3af">Unknown widget type</div>`;
    }
  }
  
  renderConfig(w) {
    return `
      <div class="db-config-title">Configure Widget</div>
      <div class="db-config-field">
        <label class="db-config-label">Title</label>
        <input class="db-config-input" data-config="title" value="${this.esc(w.title)}">
      </div>
      ${w.type === 'kpi' ? `
        <div class="db-config-field">
          <label class="db-config-label">Value</label>
          <input class="db-config-input" data-config="value" value="${this.esc(w.value || '')}">
        </div>
        <div class="db-config-field">
          <label class="db-config-label">Change %</label>
          <input class="db-config-input" data-config="change" value="${this.esc(w.change || '')}">
        </div>
      ` : ''}
      ${w.type === 'text' ? `
        <div class="db-config-field">
          <label class="db-config-label">Content</label>
          <textarea class="db-config-input" data-config="content" rows="4">${this.esc(w.content || '')}</textarea>
        </div>
      ` : ''}
      <div class="db-config-field">
        <label class="db-config-label">Width (columns)</label>
        <input class="db-config-input" type="number" min="1" max="12" data-config="width" value="${w.width}">
      </div>
      <div class="db-config-field">
        <label class="db-config-label">Height (rows)</label>
        <input class="db-config-input" type="number" min="1" max="8" data-config="height" value="${w.height}">
      </div>
      <button class="db-tool-btn" style="margin-top:8px;color:#ef4444;border-color:#fecaca" id="delete-widget">Delete Widget</button>
    `;
  }
  
  attachListeners() {
    // Widget selection
    this.container.querySelectorAll('.db-widget').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        if (e.target.closest('.db-resize-handle')) return;
        const wid = el.dataset.wid;
        this.selectedWidget = this.widgets.find(w => w.id === wid);
        
        // Start drag
        this.isDragging = true;
        const rect = el.getBoundingClientRect();
        this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.render();
      });
    });
    
    // Resize handles
    this.container.querySelectorAll('.db-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const wid = handle.dataset.resize;
        this.selectedWidget = this.widgets.find(w => w.id === wid);
        this.isResizing = true;
        this.render();
      });
    });
    
    // Canvas mouse events for drag/resize
    const canvas = this.container.querySelector('#dashboard-canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => this.onMouseMove(e, canvas));
      canvas.addEventListener('mouseup', () => { this.isDragging = false; this.isResizing = false; });
    }
    
    // Config panel inputs
    this.container.querySelectorAll('[data-config]').forEach(input => {
      input.addEventListener('input', () => {
        if (!this.selectedWidget) return;
        const key = input.dataset.config;
        let value = input.value;
        if (key === 'width' || key === 'height') value = Math.max(1, parseInt(value) || 1);
        this.selectedWidget[key] = value;
        this.render();
      });
    });
    
    // Delete widget
    this.container.querySelector('#delete-widget')?.addEventListener('click', () => {
      if (!this.selectedWidget) return;
      this.widgets = this.widgets.filter(w => w.id !== this.selectedWidget.id);
      this.selectedWidget = null;
      this.render();
    });
    
    // Add widget buttons
    this.container.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => this.addWidget(btn.dataset.add));
    });
    
    // Click outside to deselect
    canvas?.addEventListener('click', (e) => {
      if (e.target === canvas || e.target.closest('.db-grid-lines')) {
        this.selectedWidget = null;
        this.render();
      }
    });
  }
  
  onMouseMove(e, canvas) {
    if (!this.selectedWidget) return;
    const rect = canvas.getBoundingClientRect();
    
    if (this.isDragging) {
      const x = e.clientX - rect.left - this.dragOffset.x;
      const y = e.clientY - rect.top - this.dragOffset.y;
      
      // Snap to grid
      this.selectedWidget.col = Math.max(0, Math.min(this.cols - this.selectedWidget.width, Math.round(x / this.cellSize)));
      this.selectedWidget.row = Math.max(0, Math.round(y / this.cellSize));
      this.render();
    }
    
    if (this.isResizing) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newWidth = Math.max(1, Math.min(this.cols - this.selectedWidget.col, Math.round((x - this.selectedWidget.col * this.cellSize) / this.cellSize)));
      const newHeight = Math.max(1, Math.round((y - this.selectedWidget.row * this.cellSize) / this.cellSize));
      
      this.selectedWidget.width = newWidth;
      this.selectedWidget.height = newHeight;
      this.render();
    }
  }
  
  addWidget(type) {
    const id = 'w_' + Math.random().toString(36).slice(2, 7);
    const defaults = {
      kpi: { title: 'New KPI', value: '0', change: '+0%', positive: true, width: 3, height: 2 },
      bar_chart: { title: 'New Chart', data: [30,50,40,60,45,70], labels: ['A','B','C','D','E','F'], width: 6, height: 4 },
      table: { title: 'New Table', headers: ['Col 1','Col 2'], rows: [['—','—']], width: 6, height: 3 },
      text: { title: 'New Text', content: 'Enter text here...', width: 6, height: 2 },
    };
    
    // Find empty space
    const maxRow = Math.max(0, ...this.widgets.map(w => w.row + w.height));
    
    this.widgets.push({ id, type, ...defaults[type], col: 0, row: maxRow });
    this.selectedWidget = this.widgets[this.widgets.length - 1];
    this.render();
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- SAP Labs T3 FE = **Dashboard widget system with grid layout, drag, resize, configuration**
- **12-column grid**: industry standard (Bootstrap, Ant Design) — `cellSize` determines pixel-per-unit
- **Snap to grid**: `Math.round(x / cellSize)` — ensures widgets align to grid cells
- **Resize**: mouse position relative to widget origin → calculate new width/height in grid units
- **Widget types**: KPI (value + change %), bar chart (Canvas-free CSS bars), table, text — configurable
- **Config panel**: appears on widget selection — edit title, value, dimensions — live updates
- **Add widget**: finds max row → places new widget below all existing ones
- **Bar chart**: CSS `height: (value/max)*100%` with flex layout — no Canvas needed for simple charts
- SAP Analytics Cloud = **enterprise dashboards** — this problem directly maps to product requirements

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| FE Coding (this) | Hard | Grid Layout, Drag & Drop, Widget System |
| System Design | Hard | Analytics Cloud Architecture |
| HM | Medium | Culture |
