# Microsoft — Senior Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer (Front End) |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Redmond, WA (Hybrid) |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Microsoft-Interview-Questions-E1651.htm) |
| **Author** | Anonymous |
| **Team** | Power BI |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite)

---

## Round 1: Machine Coding
**Duration:** 60 minutes

### Challenge: Build a Drag-and-Drop Dashboard Layout Builder
- Canvas with a grid system (12 columns)
- Drag widgets from a palette onto the canvas
- Resize widgets by dragging corners
- Rearrange: drag existing widgets to new positions
- Snap to grid
- Collision detection: prevent overlapping
- Serialize/deserialize layout as JSON

```javascript
/**
 * Dashboard Layout Builder:
 * - 12-column grid with configurable row height
 * - Drag from palette to create widgets
 * - Drag to move, drag corners to resize
 * - Collision detection prevents overlapping
 * - Layout saves to/loads from JSON
 */
class DashboardLayoutBuilder {
  constructor(container, options = {}) {
    this.container = container;
    this.columns = options.columns || 12;
    this.rowHeight = options.rowHeight || 80;
    this.gap = options.gap || 8;
    this.widgets = []; // [{ id, type, x, y, w, h }]
    this.nextId = 1;
    
    this.dragState = null; // { widgetId, type:'move'|'resize', startX, startY, startWidget }
    
    this.setup();
    this.render();
  }
  
  setup() {
    this.container.innerHTML = `
      <div class="dashboard-builder">
        <aside class="widget-palette" role="toolbar" aria-label="Widget palette">
          <h3>Widgets</h3>
          <div class="palette-item" data-type="chart" draggable="true">📊 Chart</div>
          <div class="palette-item" data-type="table" draggable="true">📋 Table</div>
          <div class="palette-item" data-type="metric" draggable="true">🔢 Metric</div>
          <div class="palette-item" data-type="map" draggable="true">🗺️ Map</div>
        </aside>
        <div class="canvas-wrapper">
          <div class="grid-canvas" role="application" aria-label="Dashboard canvas"
               style="position:relative; min-height:600px">
          </div>
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('.grid-canvas');
    this.setupPaletteDrag();
    this.setupCanvasDrop();
  }
  
  getColumnWidth() {
    return (this.canvas.clientWidth - (this.columns + 1) * this.gap) / this.columns;
  }
  
  // Convert grid coords to pixel coords
  gridToPixel(gridX, gridY) {
    const colW = this.getColumnWidth();
    return {
      left: this.gap + gridX * (colW + this.gap),
      top: this.gap + gridY * (this.rowHeight + this.gap)
    };
  }
  
  // Convert pixel coords to grid coords (snap)
  pixelToGrid(px, py) {
    const colW = this.getColumnWidth();
    return {
      x: Math.max(0, Math.round((px - this.gap) / (colW + this.gap))),
      y: Math.max(0, Math.round((py - this.gap) / (this.rowHeight + this.gap)))
    };
  }
  
  // Collision detection: does placing widget at (x,y,w,h) overlap any existing widget?
  hasCollision(x, y, w, h, excludeId = null) {
    return this.widgets.some(widget => {
      if (widget.id === excludeId) return false;
      
      return !(x + w <= widget.x || 
               x >= widget.x + widget.w || 
               y + h <= widget.y || 
               y >= widget.y + widget.h);
    });
  }
  
  // Find first available position for a widget of given size
  findAvailablePosition(w, h) {
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= this.columns - w; x++) {
        if (!this.hasCollision(x, y, w, h)) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  }
  
  addWidget(type, x, y, w = 4, h = 3) {
    // Check bounds
    if (x + w > this.columns) x = this.columns - w;
    if (x < 0) x = 0;
    
    // Check collision and adjust
    if (this.hasCollision(x, y, w, h)) {
      const pos = this.findAvailablePosition(w, h);
      x = pos.x;
      y = pos.y;
    }
    
    const widget = { id: this.nextId++, type, x, y, w, h };
    this.widgets.push(widget);
    this.render();
    return widget;
  }
  
  moveWidget(id, newX, newY) {
    const widget = this.widgets.find(w => w.id === id);
    if (!widget) return false;
    
    // Clamp to grid bounds
    newX = Math.max(0, Math.min(newX, this.columns - widget.w));
    newY = Math.max(0, newY);
    
    if (!this.hasCollision(newX, newY, widget.w, widget.h, id)) {
      widget.x = newX;
      widget.y = newY;
      this.render();
      return true;
    }
    return false;
  }
  
  resizeWidget(id, newW, newH) {
    const widget = this.widgets.find(w => w.id === id);
    if (!widget) return false;
    
    newW = Math.max(1, Math.min(newW, this.columns - widget.x));
    newH = Math.max(1, newH);
    
    if (!this.hasCollision(widget.x, widget.y, newW, newH, id)) {
      widget.w = newW;
      widget.h = newH;
      this.render();
      return true;
    }
    return false;
  }
  
  removeWidget(id) {
    this.widgets = this.widgets.filter(w => w.id !== id);
    this.render();
  }
  
  render() {
    // Clear existing widgets from canvas
    this.canvas.querySelectorAll('.grid-widget').forEach(el => el.remove());
    
    const colW = this.getColumnWidth();
    
    // Draw grid background
    this.canvas.style.backgroundSize = `${colW + this.gap}px ${this.rowHeight + this.gap}px`;
    this.canvas.style.backgroundImage = 'radial-gradient(circle, #ddd 1px, transparent 1px)';
    this.canvas.style.backgroundPosition = `${this.gap}px ${this.gap}px`;
    
    // Calculate canvas height
    const maxRow = this.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    this.canvas.style.minHeight = `${(maxRow + 3) * (this.rowHeight + this.gap)}px`;
    
    // Render each widget
    for (const widget of this.widgets) {
      const { left, top } = this.gridToPixel(widget.x, widget.y);
      const width = widget.w * (colW + this.gap) - this.gap;
      const height = widget.h * (this.rowHeight + this.gap) - this.gap;
      
      const el = document.createElement('div');
      el.className = 'grid-widget';
      el.dataset.id = widget.id;
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', `${widget.type} widget`);
      el.setAttribute('tabindex', '0');
      
      el.style.cssText = `
        position:absolute; left:${left}px; top:${top}px;
        width:${width}px; height:${height}px;
        border:1px solid #e5e7eb; border-radius:8px;
        background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);
        cursor:grab; user-select:none;
      `;
      
      el.innerHTML = `
        <div class="widget-header" style="padding:8px; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between">
          <span>${this.getWidgetIcon(widget.type)} ${widget.type}</span>
          <button class="btn-remove" data-id="${widget.id}" aria-label="Remove widget">×</button>
        </div>
        <div class="widget-content" style="padding:8px; color:#9ca3af; font-size:12px">
          ${widget.type} (${widget.w}×${widget.h})
        </div>
        <div class="resize-handle" style="position:absolute; bottom:0; right:0; width:16px; height:16px; cursor:nwse-resize">⌟</div>
      `;
      
      this.canvas.appendChild(el);
      this.setupWidgetDrag(el, widget);
    }
    
    // Remove buttons
    this.canvas.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeWidget(Number(btn.dataset.id));
      });
    });
  }
  
  getWidgetIcon(type) {
    return { chart: '📊', table: '📋', metric: '🔢', map: '🗺️' }[type] || '📦';
  }
  
  setupWidgetDrag(el, widget) {
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('btn-remove')) return;
      
      const isResize = e.target.classList.contains('resize-handle');
      
      this.dragState = {
        widgetId: widget.id,
        type: isResize ? 'resize' : 'move',
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startWidget: { ...widget }
      };
      
      el.style.cursor = isResize ? 'nwse-resize' : 'grabbing';
      el.style.zIndex = '10';
      el.style.opacity = '0.8';
      
      const onMouseMove = (e) => {
        if (!this.dragState) return;
        
        const dx = e.clientX - this.dragState.startMouseX;
        const dy = e.clientY - this.dragState.startMouseY;
        const colW = this.getColumnWidth();
        
        if (this.dragState.type === 'move') {
          const gridDx = Math.round(dx / (colW + this.gap));
          const gridDy = Math.round(dy / (this.rowHeight + this.gap));
          const newX = this.dragState.startWidget.x + gridDx;
          const newY = this.dragState.startWidget.y + gridDy;
          this.moveWidget(widget.id, newX, newY);
        } else {
          const gridDw = Math.round(dx / (colW + this.gap));
          const gridDh = Math.round(dy / (this.rowHeight + this.gap));
          const newW = this.dragState.startWidget.w + gridDw;
          const newH = this.dragState.startWidget.h + gridDh;
          this.resizeWidget(widget.id, newW, newH);
        }
      };
      
      const onMouseUp = () => {
        this.dragState = null;
        el.style.cursor = 'grab';
        el.style.zIndex = '';
        el.style.opacity = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
  
  setupPaletteDrag() {
    this.container.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('widget-type', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
  }
  
  setupCanvasDrop() {
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('widget-type');
      if (!type) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { x, y } = this.pixelToGrid(px, py);
      
      this.addWidget(type, x, y);
    });
  }
  
  // Serialize/Deserialize
  toJSON() { return JSON.stringify(this.widgets); }
  
  fromJSON(json) {
    this.widgets = JSON.parse(json);
    this.nextId = Math.max(...this.widgets.map(w => w.id), 0) + 1;
    this.render();
  }
}
```

---

## 🎯 Key Takeaways
- Microsoft L63 FE = **Drag-and-drop dashboard builder with grid system + collision detection**
- **12-column grid**: standard responsive grid — snap positions with `Math.round(px / cellSize)`
- **Collision detection**: AABB (axis-aligned bounding box) — two rects overlap if NOT (left > right || right < left || ...)
- **Palette drag**: HTML5 `dragstart` + `setData('widget-type')` → canvas `drop` + `getData`
- **Widget drag**: mousedown → mousemove → mouseup — convert pixel delta to grid units
- **Resize handle**: bottom-right corner — mousemove delta → change w/h in grid units
- **Grid background**: CSS `background-image: radial-gradient` — visual grid dots without DOM elements
- Microsoft FE = **rich interactive UI** — drag-drop, grid systems, collision detection, serialization

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS/React |
| Machine Coding | Very Hard | Drag-Drop, Grid, Collision |
| Technical | Hard | Performance, Architecture |
| HM | Medium | Growth Mindset |
