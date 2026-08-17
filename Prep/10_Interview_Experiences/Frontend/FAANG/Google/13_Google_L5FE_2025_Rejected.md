# Google — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | May 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 4 On-site)
- **Timeline:** 5 weeks
- **Format:** Virtual + On-site

## Round 4: Frontend Machine Coding — Collaborative Whiteboard

### Problem
Build a collaborative drawing whiteboard:
1. Canvas drawing with mouse/touch: freehand, line, rectangle, circle tools
2. Color picker and stroke width selector
3. Undo/Redo with history stack
4. Eraser tool
5. Text tool: click on canvas to place text with inline editor
6. Export as PNG
7. Layer-like approach: shapes recorded as objects, selectable and movable after drawing

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Collaborative Whiteboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #1e1e1e; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }

.toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #2d2d2d; border-bottom: 1px solid #404040; flex-wrap: wrap; }
.tool-btn { padding: 6px 10px; background: #3c3c3c; border: 1px solid #555; border-radius: 4px; color: #ddd; font-size: 12px; cursor: pointer; }
.tool-btn:hover { background: #4a4a4a; }
.tool-btn.active { background: #007acc; border-color: #007acc; }
.sep { width: 1px; height: 24px; background: #555; }
.color-pick { width: 28px; height: 28px; border: 2px solid #555; border-radius: 4px; cursor: pointer; padding: 0; }
.stroke-select { padding: 4px; background: #3c3c3c; border: 1px solid #555; border-radius: 4px; color: #ddd; font-size: 12px; }
.action-btn { padding: 6px 10px; background: #3c3c3c; border: 1px solid #555; border-radius: 4px; color: #ddd; font-size: 12px; cursor: pointer; }
.action-btn:hover { background: #4a4a4a; }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.export-btn { background: #2ea043; border-color: #2ea043; color: #fff; }

.canvas-container { flex: 1; position: relative; background: #fff; cursor: crosshair; }
canvas { position: absolute; top: 0; left: 0; }
#drawCanvas { z-index: 2; }
#previewCanvas { z-index: 3; pointer-events: none; }

.text-input { position: absolute; z-index: 10; border: 2px solid #007acc; outline: none; font-family: -apple-system, sans-serif; background: rgba(255,255,255,.9); padding: 2px 4px; min-width: 40px; }

.status-bar { padding: 4px 12px; background: #2d2d2d; color: #888; font-size: 11px; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<div class="toolbar">
  <button class="tool-btn active" data-tool="freehand">✏️ Draw</button>
  <button class="tool-btn" data-tool="line">📏 Line</button>
  <button class="tool-btn" data-tool="rect">▭ Rect</button>
  <button class="tool-btn" data-tool="circle">○ Circle</button>
  <button class="tool-btn" data-tool="text">T Text</button>
  <button class="tool-btn" data-tool="eraser">🧹 Eraser</button>
  <button class="tool-btn" data-tool="select">👆 Select</button>
  <div class="sep"></div>
  <input type="color" class="color-pick" id="colorPick" value="#000000">
  <select class="stroke-select" id="strokeWidth">
    <option value="2">2px</option>
    <option value="4" selected>4px</option>
    <option value="6">6px</option>
    <option value="10">10px</option>
  </select>
  <div class="sep"></div>
  <button class="action-btn" id="undoBtn" disabled>↩ Undo</button>
  <button class="action-btn" id="redoBtn" disabled>↪ Redo</button>
  <button class="action-btn" id="clearBtn">🗑 Clear</button>
  <button class="action-btn export-btn" id="exportBtn">📥 Export PNG</button>
</div>

<div class="canvas-container" id="canvasContainer">
  <canvas id="drawCanvas"></canvas>
  <canvas id="previewCanvas"></canvas>
</div>

<div class="status-bar">
  <span id="toolInfo">Tool: Draw</span>
  <span id="objCount">Objects: 0</span>
</div>

<script>
// ============================================================
// SETUP
// ============================================================
const container = document.getElementById('canvasContainer');
const drawCanvas = document.getElementById('drawCanvas');
const previewCanvas = document.getElementById('previewCanvas');
const drawCtx = drawCanvas.getContext('2d');
const prevCtx = previewCanvas.getContext('2d');

function resizeCanvas() {
  const w = container.offsetWidth;
  const h = container.offsetHeight;
  drawCanvas.width = previewCanvas.width = w;
  drawCanvas.height = previewCanvas.height = h;
  redrawAll();
}

window.addEventListener('resize', resizeCanvas);

let currentTool = 'freehand';
let isDrawing = false;
let startX, startY;
let currentPath = [];

// State
let objects = [];      // drawn shape objects
let undoStack = [];    // snapshots for undo
let redoStack = [];
let selectedObj = null;
let dragOffset = null;

// ============================================================
// SHAPE OBJECTS
// ============================================================
function createShape(type, props) {
  return { type, color: document.getElementById('colorPick').value, width: parseInt(document.getElementById('strokeWidth').value), ...props };
}

// ============================================================
// DRAW FUNCTIONS
// ============================================================
function drawShape(ctx, shape) {
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.type) {
    case 'freehand':
      if (shape.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      break;
    case 'line':
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      break;
    case 'rect':
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'text':
      ctx.font = `${shape.fontSize}px -apple-system, sans-serif`;
      ctx.fillText(shape.text, shape.x, shape.y);
      break;
    case 'eraser':
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineWidth = shape.width * 3;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      break;
  }
}

function redrawAll() {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  objects.forEach(obj => drawShape(drawCtx, obj));

  // Selection highlight
  if (selectedObj) {
    const bounds = getShapeBounds(selectedObj);
    if (bounds) {
      drawCtx.strokeStyle = '#007acc';
      drawCtx.lineWidth = 1;
      drawCtx.setLineDash([4, 4]);
      drawCtx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
      drawCtx.setLineDash([]);
    }
  }

  document.getElementById('objCount').textContent = `Objects: ${objects.length}`;
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function getShapeBounds(shape) {
  switch (shape.type) {
    case 'rect': return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
    case 'circle': return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
    case 'line': return { x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) };
    case 'freehand':
    case 'eraser': {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      const minX = Math.min(...xs), minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    }
    case 'text': return { x: shape.x, y: shape.y - 14, w: shape.text.length * 8, h: 20 };
    default: return null;
  }
}

function isInBounds(x, y, bounds) {
  return bounds && x >= bounds.x - 4 && x <= bounds.x + bounds.w + 4 && y >= bounds.y - 4 && y <= bounds.y + bounds.h + 4;
}

// ============================================================
// SAVE STATE
// ============================================================
function saveState() {
  undoStack.push(JSON.stringify(objects));
  redoStack = [];
  if (undoStack.length > 50) undoStack.shift();
}

// ============================================================
// MOUSE EVENTS
// ============================================================
container.addEventListener('mousedown', e => {
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === 'text') {
    placeTextInput(x, y);
    return;
  }

  if (currentTool === 'select') {
    // Hit test
    selectedObj = null;
    for (let i = objects.length - 1; i >= 0; i--) {
      const bounds = getShapeBounds(objects[i]);
      if (isInBounds(x, y, bounds)) {
        selectedObj = objects[i];
        dragOffset = { dx: x - bounds.x, dy: y - bounds.y };
        break;
      }
    }
    redrawAll();
    if (selectedObj) isDrawing = true;
    return;
  }

  isDrawing = true;
  startX = x;
  startY = y;
  currentPath = [{ x, y }];
});

container.addEventListener('mousemove', e => {
  if (!isDrawing) return;
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === 'select' && selectedObj && dragOffset) {
    saveState();
    moveShape(selectedObj, x - dragOffset.dx, y - dragOffset.dy);
    redrawAll();
    return;
  }

  prevCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (currentTool === 'freehand' || currentTool === 'eraser') {
    currentPath.push({ x, y });
    drawShape(prevCtx, createShape(currentTool, { points: currentPath }));
  } else if (currentTool === 'line') {
    drawShape(prevCtx, createShape('line', { x1: startX, y1: startY, x2: x, y2: y }));
  } else if (currentTool === 'rect') {
    drawShape(prevCtx, createShape('rect', { x: Math.min(startX, x), y: Math.min(startY, y), w: Math.abs(x - startX), h: Math.abs(y - startY) }));
  } else if (currentTool === 'circle') {
    const r = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
    drawShape(prevCtx, createShape('circle', { cx: startX, cy: startY, r }));
  }
});

container.addEventListener('mouseup', e => {
  if (!isDrawing) return;
  isDrawing = false;
  prevCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (currentTool === 'select') return;

  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  saveState();

  if (currentTool === 'freehand' || currentTool === 'eraser') {
    objects.push(createShape(currentTool, { points: [...currentPath] }));
  } else if (currentTool === 'line') {
    objects.push(createShape('line', { x1: startX, y1: startY, x2: x, y2: y }));
  } else if (currentTool === 'rect') {
    objects.push(createShape('rect', { x: Math.min(startX, x), y: Math.min(startY, y), w: Math.abs(x - startX), h: Math.abs(y - startY) }));
  } else if (currentTool === 'circle') {
    const r = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
    objects.push(createShape('circle', { cx: startX, cy: startY, r }));
  }

  currentPath = [];
  redrawAll();
});

function moveShape(shape, nx, ny) {
  const bounds = getShapeBounds(shape);
  if (!bounds) return;
  const dx = nx - bounds.x;
  const dy = ny - bounds.y;

  switch (shape.type) {
    case 'rect': shape.x += dx; shape.y += dy; break;
    case 'circle': shape.cx += dx; shape.cy += dy; break;
    case 'line': shape.x1 += dx; shape.y1 += dy; shape.x2 += dx; shape.y2 += dy; break;
    case 'freehand': case 'eraser': shape.points.forEach(p => { p.x += dx; p.y += dy; }); break;
    case 'text': shape.x += dx; shape.y += dy; break;
  }
}

// ============================================================
// TEXT TOOL
// ============================================================
function placeTextInput(x, y) {
  const existing = document.querySelector('.text-input');
  if (existing) existing.remove();

  const input = document.createElement('input');
  input.className = 'text-input';
  input.style.left = x + 'px';
  input.style.top = y + 'px';
  input.style.fontSize = parseInt(document.getElementById('strokeWidth').value) * 3 + 'px';
  input.style.color = document.getElementById('colorPick').value;
  container.appendChild(input);
  input.focus();

  function commit() {
    if (input.value.trim()) {
      saveState();
      objects.push(createShape('text', {
        x, y: y + parseInt(input.style.fontSize),
        text: input.value.trim(),
        fontSize: parseInt(input.style.fontSize)
      }));
      redrawAll();
    }
    input.remove();
  }

  input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') input.remove(); });
  input.addEventListener('blur', commit);
}

// ============================================================
// TOOLBAR
// ============================================================
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    selectedObj = null;
    redrawAll();
    document.getElementById('toolInfo').textContent = `Tool: ${btn.textContent.trim()}`;
    container.style.cursor = currentTool === 'select' ? 'default' : currentTool === 'eraser' ? 'cell' : 'crosshair';
  });
});

// Undo/Redo
document.getElementById('undoBtn').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(objects));
  objects = JSON.parse(undoStack.pop());
  selectedObj = null;
  redrawAll();
});

document.getElementById('redoBtn').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(objects));
  objects = JSON.parse(redoStack.pop());
  selectedObj = null;
  redrawAll();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear all objects?')) return;
  saveState();
  objects = [];
  selectedObj = null;
  redrawAll();
});

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = drawCanvas.width;
  tempCanvas.height = drawCanvas.height;
  const ctx = tempCanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  objects.forEach(obj => drawShape(ctx, obj));

  const link = document.createElement('a');
  link.href = tempCanvas.toDataURL('image/png');
  link.download = 'whiteboard.png';
  link.click();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); document.getElementById(e.shiftKey ? 'redoBtn' : 'undoBtn').click(); }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedObj) { saveState(); objects = objects.filter(o => o !== selectedObj); selectedObj = null; redrawAll(); }
  }
});

resizeCanvas();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **real-time collaboration via WebSocket** demo
- **Object-based drawing**: shapes stored as objects with type/color/width/coords, re-rendered on `redrawAll()`
- **Preview canvas**: separate transparent canvas on top for live rubber-band shape preview during drag
- **Undo/Redo**: JSON.stringify/parse snapshot stack, max 50 entries, clear redo on new action
- **Select + Move**: reverse hit-test loop, drag with offset calculation, move by applying delta to shape coordinates
- **Text tool**: absolute-positioned `<input>`, blur/enter commits to shape object
- **Export**: temp canvas with white fill + all shapes, `toDataURL('image/png')` + download link
- **Keyboard shortcuts**: Cmd+Z undo, Cmd+Shift+Z redo, Delete removes selected

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, Algorithms |
| On-site 1 | Medium | DOM, Events |
| On-site 2 | Hard | Canvas 2D API, Shape Objects |
| On-site 3 | Hard | Undo/Redo, Hit Testing, Selection |
| On-site 4 | Hard | System Design |
