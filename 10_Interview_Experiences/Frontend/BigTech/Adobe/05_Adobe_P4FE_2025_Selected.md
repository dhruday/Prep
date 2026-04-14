# Adobe — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Senior Frontend Engineer |
| **Level** | P4 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Creative Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 3 Onsite: FE Coding + System Design + HM)

---

## Round 2: Frontend Coding — Build a Layer-Based Design Tool with Undo/Redo
**Duration:** 60 minutes

### Challenge: Build a design canvas with: layer management (reorder, hide, lock), shape creation (rect, circle, text), drag-to-move, undo/redo using Command pattern.

```javascript
/**
 * Adobe Design Tool with Layers + Undo/Redo:
 * 
 * Architecture:
 * - Command Pattern for undo/redo (each action = undoable command)
 * - Layer stack rendered bottom-to-top
 * - Canvas 2D for rendering, DOM overlay for UI
 * - Selection with bounding-box handles
 */
class DesignTool {
  constructor(container) {
    this.container = container;
    this.layers = [];
    this.selectedLayerId = null;
    this.nextId = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    this.render();
    this.setupCanvas();
  }
  
  // ---- Command Pattern ----
  
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo on new action
    this.redraw();
    this.renderLayerPanel();
  }
  
  undo() {
    if (this.undoStack.length === 0) return;
    const cmd = this.undoStack.pop();
    cmd.undo();
    this.redoStack.push(cmd);
    this.redraw();
    this.renderLayerPanel();
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    const cmd = this.redoStack.pop();
    cmd.execute();
    this.undoStack.push(cmd);
    this.redraw();
    this.renderLayerPanel();
  }
  
  // ---- Layer Operations ----
  
  addShape(type) {
    const id = this.nextId++;
    const shape = {
      id,
      type,
      name: `${type} ${id}`,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: type === 'circle' ? 80 : 120,
      height: type === 'circle' ? 80 : 80,
      fill: ['#276ef1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][id % 5],
      visible: true,
      locked: false,
      opacity: 1,
      text: type === 'text' ? 'Sample Text' : null
    };
    
    this.execute({
      execute: () => { this.layers.push(shape); this.selectedLayerId = shape.id; },
      undo: () => { this.layers = this.layers.filter(l => l.id !== shape.id); this.selectedLayerId = null; }
    });
  }
  
  deleteLayer(id) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    const layer = { ...this.layers[idx] };
    
    this.execute({
      execute: () => { this.layers.splice(this.layers.findIndex(l => l.id === id), 1); this.selectedLayerId = null; },
      undo: () => { this.layers.splice(idx, 0, layer); this.selectedLayerId = id; }
    });
  }
  
  reorderLayer(id, direction) { // direction: -1 (down) or +1 (up)
    const idx = this.layers.findIndex(l => l.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.layers.length) return;
    
    this.execute({
      execute: () => { [this.layers[idx], this.layers[newIdx]] = [this.layers[newIdx], this.layers[idx]]; },
      undo: () => { [this.layers[idx], this.layers[newIdx]] = [this.layers[newIdx], this.layers[idx]]; }
    });
  }
  
  toggleVisibility(id) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    
    this.execute({
      execute: () => { layer.visible = !layer.visible; },
      undo: () => { layer.visible = !layer.visible; }
    });
  }
  
  toggleLock(id) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    
    this.execute({
      execute: () => { layer.locked = !layer.locked; },
      undo: () => { layer.locked = !layer.locked; }
    });
  }
  
  // ---- Canvas ----
  
  setupCanvas() {
    const canvas = this.container.querySelector('#design-canvas');
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.clientWidth * 2;
    canvas.height = canvas.parentElement.clientHeight * 2;
    canvas.style.width = canvas.parentElement.clientWidth + 'px';
    canvas.style.height = canvas.parentElement.clientHeight + 'px';
    this.ctx.scale(2, 2);
    
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedLayerId) { e.preventDefault(); this.deleteLayer(this.selectedLayerId); }
      }
    });
    
    this.redraw();
  }
  
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Hit test from top (last in array = topmost)
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible || layer.locked) continue;
      
      if (this.hitTest(layer, x, y)) {
        this.selectedLayerId = layer.id;
        this.isDragging = true;
        this.dragStart = { x: layer.x, y: layer.y }; // For undo
        this.dragOffset = { x: x - layer.x, y: y - layer.y };
        this.redraw();
        this.renderLayerPanel();
        return;
      }
    }
    
    // Clicked on empty space → deselect
    this.selectedLayerId = null;
    this.redraw();
    this.renderLayerPanel();
  }
  
  onMouseMove(e) {
    if (!this.isDragging) return;
    const layer = this.layers.find(l => l.id === this.selectedLayerId);
    if (!layer) return;
    
    const rect = this.canvas.getBoundingClientRect();
    layer.x = e.clientX - rect.left - this.dragOffset.x;
    layer.y = e.clientY - rect.top - this.dragOffset.y;
    this.redraw();
  }
  
  onMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    const layer = this.layers.find(l => l.id === this.selectedLayerId);
    if (!layer || !this.dragStart) return;
    
    const startX = this.dragStart.x, startY = this.dragStart.y;
    const endX = layer.x, endY = layer.y;
    
    if (startX === endX && startY === endY) return; // No movement
    
    // Push move as undoable command (already executed)
    this.undoStack.push({
      execute: () => { layer.x = endX; layer.y = endY; },
      undo: () => { layer.x = startX; layer.y = startY; }
    });
    this.redoStack = [];
  }
  
  hitTest(layer, mx, my) {
    if (layer.type === 'circle') {
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      const rx = layer.width / 2, ry = layer.height / 2;
      return ((mx - cx) ** 2 / rx ** 2 + (my - cy) ** 2 / ry ** 2) <= 1;
    }
    return mx >= layer.x && mx <= layer.x + layer.width &&
           my >= layer.y && my <= layer.y + layer.height;
  }
  
  redraw() {
    const ctx = this.ctx;
    const w = this.canvas.width / 2;
    const h = this.canvas.height / 2;
    
    // Checkerboard background (transparency pattern)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3f4f6';
    for (let y = 0; y < h; y += 10) {
      for (let x = 0; x < w; x += 10) {
        if ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0) {
          ctx.fillRect(x, y, 10, 10);
        }
      }
    }
    
    // Draw layers bottom-to-top
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      
      ctx.globalAlpha = layer.opacity;
      ctx.fillStyle = layer.fill;
      
      if (layer.type === 'rect') {
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      } else if (layer.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(layer.x + layer.width / 2, layer.y + layer.height / 2,
                     layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.type === 'text') {
        ctx.font = '24px -apple-system, sans-serif';
        ctx.fillText(layer.text, layer.x, layer.y + 30);
        layer.width = ctx.measureText(layer.text).width;
        layer.height = 36;
      }
      
      ctx.globalAlpha = 1;
      
      // Selection outline
      if (layer.id === this.selectedLayerId) {
        ctx.strokeStyle = '#276ef1';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(layer.x - 2, layer.y - 2, layer.width + 4, layer.height + 4);
        ctx.setLineDash([]);
        
        // Resize handles (4 corners)
        const handles = [
          [layer.x - 4, layer.y - 4],
          [layer.x + layer.width, layer.y - 4],
          [layer.x - 4, layer.y + layer.height],
          [layer.x + layer.width, layer.y + layer.height]
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(hx, hy, 8, 8);
          ctx.strokeStyle = '#276ef1';
          ctx.strokeRect(hx, hy, 8, 8);
        });
      }
    }
  }
  
  // ---- UI ----
  
  render() {
    this.container.innerHTML = `
      <style>
        .dt-layout { display:flex; height:600px; font-family:-apple-system,sans-serif; }
        .dt-toolbar { display:flex; gap:4px; padding:8px; background:#1e1e1e; border-bottom:1px solid #333; }
        .dt-tool-btn { padding:6px 12px; border:none; background:#333; color:#fff; border-radius:4px; cursor:pointer; font-size:12px; }
        .dt-tool-btn:hover { background:#444; }
        .dt-canvas-area { flex:1; display:flex; flex-direction:column; }
        .dt-canvas-wrap { flex:1; position:relative; background:#e5e7eb; }
        .dt-canvas { display:block; }
        .dt-layer-panel { width:240px; background:#1e1e1e; color:#e5e7eb; overflow-y:auto; }
        .dt-layer-header { padding:8px 12px; font-size:12px; color:#888; border-bottom:1px solid #333; text-transform:uppercase; letter-spacing:1px; }
        .dt-layer-item { display:flex; align-items:center; gap:6px; padding:6px 8px; cursor:pointer; border-bottom:1px solid #2a2a2a; font-size:13px; }
        .dt-layer-item:hover { background:#2a2a2a; }
        .dt-layer-item.selected { background:#276ef1; }
        .dt-layer-color { width:16px; height:16px; border-radius:3px; flex-shrink:0; }
        .dt-layer-name { flex:1; overflow:hidden; text-overflow:ellipsis; }
        .dt-layer-btn { background:none; border:none; color:#888; cursor:pointer; font-size:12px; padding:2px 4px; }
        .dt-layer-btn:hover { color:#fff; }
      </style>
      <div class="dt-layout">
        <div class="dt-canvas-area">
          <div class="dt-toolbar">
            <button class="dt-tool-btn" id="add-rect">▬ Rect</button>
            <button class="dt-tool-btn" id="add-circle">● Circle</button>
            <button class="dt-tool-btn" id="add-text">T Text</button>
            <span style="flex:1"></span>
            <button class="dt-tool-btn" id="undo-btn">↶ Undo</button>
            <button class="dt-tool-btn" id="redo-btn">↷ Redo</button>
          </div>
          <div class="dt-canvas-wrap"><canvas id="design-canvas" class="dt-canvas"></canvas></div>
        </div>
        <div class="dt-layer-panel">
          <div class="dt-layer-header">Layers</div>
          <div id="layer-list"></div>
        </div>
      </div>
    `;
    
    this.container.querySelector('#add-rect')?.addEventListener('click', () => this.addShape('rect'));
    this.container.querySelector('#add-circle')?.addEventListener('click', () => this.addShape('circle'));
    this.container.querySelector('#add-text')?.addEventListener('click', () => this.addShape('text'));
    this.container.querySelector('#undo-btn')?.addEventListener('click', () => this.undo());
    this.container.querySelector('#redo-btn')?.addEventListener('click', () => this.redo());
  }
  
  renderLayerPanel() {
    const list = this.container.querySelector('#layer-list');
    if (!list) return;
    
    // Reverse order — top layer first in panel
    list.innerHTML = [...this.layers].reverse().map(l => `
      <div class="dt-layer-item ${l.id === this.selectedLayerId ? 'selected' : ''}" data-id="${l.id}">
        <div class="dt-layer-color" style="background:${l.fill};opacity:${l.visible ? 1 : 0.3}"></div>
        <span class="dt-layer-name">${l.name}</span>
        <button class="dt-layer-btn" data-action="visibility" data-id="${l.id}" title="${l.visible ? 'Hide' : 'Show'}">${l.visible ? '👁' : '🚫'}</button>
        <button class="dt-layer-btn" data-action="lock" data-id="${l.id}" title="${l.locked ? 'Unlock' : 'Lock'}">${l.locked ? '🔒' : '🔓'}</button>
        <button class="dt-layer-btn" data-action="up" data-id="${l.id}" title="Move Up">↑</button>
        <button class="dt-layer-btn" data-action="down" data-id="${l.id}" title="Move Down">↓</button>
      </div>
    `).join('');
    
    list.querySelectorAll('.dt-layer-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.dt-layer-btn')) return;
        this.selectedLayerId = parseInt(item.dataset.id);
        this.redraw();
        this.renderLayerPanel();
      });
    });
    
    list.querySelectorAll('.dt-layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (action === 'visibility') this.toggleVisibility(id);
        else if (action === 'lock') this.toggleLock(id);
        else if (action === 'up') this.reorderLayer(id, 1);
        else if (action === 'down') this.reorderLayer(id, -1);
      });
    });
  }
}
```

---

## 🎯 Key Takeaways
- Adobe P4 FE = **Design tool with layers, undo/redo (Command pattern), Canvas rendering**
- **Command pattern**: every operation = `{execute(), undo()}` — pushed to undo stack, redo stack cleared on new action
- **Layer rendering**: bottom-to-top (first in array = bottommost) — natural for z-index ordering
- **Hit testing**: reverse iteration (top layer gets clicks first) — circle uses ellipse equation, rect uses AABB
- **Drag as undoable**: record start position on mouseDown, push command on mouseUp — move already applied
- **Checkerboard background**: alternating gray/white squares — standard "transparency" pattern
- **Selection**: dashed blue border + 4 corner resize handles (white square with blue border)
- **Keyboard shortcuts**: Cmd+Z undo, Cmd+Shift+Z redo, Delete to remove layer
- **Layer panel operations**: visibility toggle, lock toggle, reorder up/down — all undoable

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding (this) | Very Hard | Canvas, Command Pattern, Layer Management |
| System Design | Very Hard | Creative Cloud Sync |
| HM | Medium | Culture |
