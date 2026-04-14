# Adobe — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Jose, CA |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Adobe Express |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical Deep Dive + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Layer-Based Image Editor Canvas

```javascript
/**
 * Layer-based Image Editor:
 * - Layers panel: add/remove/reorder/toggle visibility
 * - Canvas: click to select layer, transform handles for resize/rotate
 * - Operations: undo/redo (Command pattern)
 * - Layer blending: opacity slider per layer
 * - Export: flatten layers to single canvas
 */
class ImageEditor {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.layers = [];     // [{ id, name, type, visible, opacity, x, y, w, h, rotation, data }]
    this.activeLayerId = null;
    this.nextId = 1;
    this.undoStack = [];  // Command[]
    this.redoStack = [];
    this.dragState = null;
    
    this.setup();
  }
  
  setup() {
    this.container.innerHTML = `
      <div class="editor" style="display:flex; height:100%">
        <div class="canvas-area" style="flex:1; position:relative; background:#f5f5f5">
          <canvas id="editor-canvas" width="800" height="600" style="border:1px solid #ddd; background:#fff"></canvas>
        </div>
        <aside class="layers-panel" style="width:250px; border-left:1px solid #e5e7eb; overflow:auto">
          <div class="layers-header" style="padding:8px; display:flex; justify-content:space-between">
            <h3>Layers</h3>
            <div class="layer-actions">
              <button id="add-rect" title="Add Rectangle">▭</button>
              <button id="add-text" title="Add Text">T</button>
            </div>
          </div>
          <div class="layers-list" role="listbox" aria-label="Layers"></div>
        </aside>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#editor-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.container.querySelector('#add-rect').addEventListener('click', () => {
      this.executeCommand(new AddLayerCommand(this, {
        type: 'rect', name: `Rectangle ${this.nextId}`,
        x: 100, y: 100, w: 200, h: 150,
        fill: this.randomColor(), opacity: 1, visible: true, rotation: 0
      }));
    });
    
    this.container.querySelector('#add-text').addEventListener('click', () => {
      this.executeCommand(new AddLayerCommand(this, {
        type: 'text', name: `Text ${this.nextId}`,
        x: 100, y: 100, w: 200, h: 40,
        text: 'Sample Text', fontSize: 24, fill: '#000',
        opacity: 1, visible: true, rotation: 0
      }));
    });
    
    this.setupCanvasInteraction();
    this.render();
  }
  
  // Command pattern for undo/redo
  executeCommand(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    this.render();
  }
  
  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.render();
    }
  }
  
  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.render();
    }
  }
  
  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw layers bottom to top
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      // Transform: translate to center, rotate, translate back
      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      
      if (layer.type === 'rect') {
        ctx.fillStyle = layer.fill;
        ctx.fillRect(layer.x, layer.y, layer.w, layer.h);
      } else if (layer.type === 'text') {
        ctx.fillStyle = layer.fill;
        ctx.font = `${layer.fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(layer.text, layer.x, layer.y);
      }
      
      ctx.restore();
      
      // Selection handles
      if (layer.id === this.activeLayerId) {
        this.drawSelectionHandles(layer);
      }
    }
    
    this.renderLayersPanel();
  }
  
  drawSelectionHandles(layer) {
    const { ctx } = this;
    const { x, y, w, h } = layer;
    
    // Dashed border
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    
    // Corner handles (for resize)
    const handles = [
      { x: x, y: y }, { x: x + w, y: y },
      { x: x, y: y + h }, { x: x + w, y: y + h }
    ];
    
    for (const handle of handles) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
      ctx.fill();
      ctx.stroke();
    }
  }
  
  renderLayersPanel() {
    const listEl = this.container.querySelector('.layers-list');
    
    // Render top to bottom (reverse of draw order)
    listEl.innerHTML = [...this.layers].reverse().map(layer => `
      <div class="layer-item ${layer.id === this.activeLayerId ? 'active' : ''}"
           data-id="${layer.id}" role="option"
           aria-selected="${layer.id === this.activeLayerId}">
        <button class="visibility-toggle" data-id="${layer.id}">
          ${layer.visible ? '👁️' : '👁️‍🗨️'}
        </button>
        <span class="layer-name">${this.sanitize(layer.name)}</span>
        <input type="range" class="opacity-slider" data-id="${layer.id}"
               min="0" max="1" step="0.1" value="${layer.opacity}"
               aria-label="Opacity">
      </div>
    `).join('');
    
    // Layer click to select
    listEl.querySelectorAll('.layer-item').forEach(el => {
      el.addEventListener('click', () => {
        this.activeLayerId = Number(el.dataset.id);
        this.render();
      });
    });
    
    // Visibility toggle
    listEl.querySelectorAll('.visibility-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layer = this.layers.find(l => l.id === Number(btn.dataset.id));
        if (layer) {
          layer.visible = !layer.visible;
          this.render();
        }
      });
    });
    
    // Opacity slider
    listEl.querySelectorAll('.opacity-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        e.stopPropagation();
        const layer = this.layers.find(l => l.id === Number(slider.dataset.id));
        if (layer) {
          layer.opacity = parseFloat(slider.value);
          this.render();
        }
      });
    });
  }
  
  setupCanvasInteraction() {
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.offsetX * (this.canvas.width / rect.width);
      const y = e.offsetY * (this.canvas.height / rect.height);
      
      // Hit test: check layers top-to-bottom (reverse order)
      let hit = null;
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const layer = this.layers[i];
        if (!layer.visible) continue;
        if (x >= layer.x && x <= layer.x + layer.w &&
            y >= layer.y && y <= layer.y + layer.h) {
          hit = layer;
          break;
        }
      }
      
      if (hit) {
        this.activeLayerId = hit.id;
        this.dragState = {
          layerId: hit.id,
          startX: x, startY: y,
          origX: hit.x, origY: hit.y
        };
      } else {
        this.activeLayerId = null;
      }
      
      this.render();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.dragState) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.offsetX * (this.canvas.width / rect.width);
      const y = e.offsetY * (this.canvas.height / rect.height);
      
      const layer = this.layers.find(l => l.id === this.dragState.layerId);
      if (layer) {
        layer.x = this.dragState.origX + (x - this.dragState.startX);
        layer.y = this.dragState.origY + (y - this.dragState.startY);
        this.render();
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      if (this.dragState) {
        const layer = this.layers.find(l => l.id === this.dragState.layerId);
        if (layer) {
          // Record move as command for undo
          this.undoStack.push(new MoveLayerCommand(this, layer.id, 
            this.dragState.origX, this.dragState.origY, layer.x, layer.y));
          this.redoStack = [];
        }
      }
      this.dragState = null;
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      }
    });
  }
  
  randomColor() {
    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  // Export: flatten all visible layers
  exportAsDataURL() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      tempCtx.globalAlpha = layer.opacity;
      if (layer.type === 'rect') {
        tempCtx.fillStyle = layer.fill;
        tempCtx.fillRect(layer.x, layer.y, layer.w, layer.h);
      } else if (layer.type === 'text') {
        tempCtx.fillStyle = layer.fill;
        tempCtx.font = `${layer.fontSize}px sans-serif`;
        tempCtx.fillText(layer.text, layer.x, layer.y + layer.fontSize);
      }
    }
    
    return tempCanvas.toDataURL('image/png');
  }
}

// Command Pattern classes
class AddLayerCommand {
  constructor(editor, layerData) {
    this.editor = editor;
    this.layerData = { ...layerData, id: editor.nextId++ };
  }
  execute() { this.editor.layers.push({ ...this.layerData }); }
  undo() { this.editor.layers = this.editor.layers.filter(l => l.id !== this.layerData.id); }
}

class MoveLayerCommand {
  constructor(editor, layerId, fromX, fromY, toX, toY) {
    this.editor = editor;
    this.layerId = layerId;
    this.fromX = fromX; this.fromY = fromY;
    this.toX = toX; this.toY = toY;
  }
  execute() {
    const layer = this.editor.layers.find(l => l.id === this.layerId);
    if (layer) { layer.x = this.toX; layer.y = this.toY; }
  }
  undo() {
    const layer = this.editor.layers.find(l => l.id === this.layerId);
    if (layer) { layer.x = this.fromX; layer.y = this.fromY; }
  }
}
```

---

## 🎯 Key Takeaways
- Adobe FE = **Layer-based image editor with Canvas + Command pattern undo/redo**
- **Layer rendering**: draw bottom-to-top for correct z-order, hit-test top-to-bottom for selection
- **Transform**: translate to center → rotate → translate back — standard 2D transform pattern
- **Command pattern**: AddLayerCommand, MoveLayerCommand — execute/undo methods for full undo/redo history
- **Selection handles**: dashed border + corner squares — visual indicators for resize points
- **globalAlpha**: per-layer opacity control — set before drawing, restore after
- **Export**: create temp canvas, draw all visible layers, `toDataURL('image/png')`
- Adobe FE = **creative tools expertise** — Canvas, transforms, layers, undo/redo, export

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Very Hard | Canvas, Layers, Command Pattern |
| Technical | Hard | Performance, Architecture |
| HM | Medium | Culture Fit |
