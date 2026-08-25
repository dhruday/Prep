# Microsoft — SDE-2 Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Frontend Engineer |
| **Level** | L63 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Microsoft Teams |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Online Assessment + 2 Technical + System Design)

---

## Round 1: Machine Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build a Collaborative Whiteboard** (real-time drawing canvas with multi-cursor)
   - Free-hand drawing with multiple colors and brush sizes
   - Show other users' cursors in real-time
   - Undo/Redo per user
   - Export as PNG

### 💡 Collaborative Whiteboard

```javascript
class CollaborativeWhiteboard {
  constructor(canvasElement, userId, wsUrl) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.userId = userId;
    this.isDrawing = false;
    this.currentPath = [];
    this.undoStack = []; // Per-user stroke history
    this.redoStack = [];
    this.remoteCursors = new Map(); // userId → {x, y, color}
    this.allStrokes = []; // All strokes from all users (for redraw)
    
    this.color = '#000000';
    this.lineWidth = 3;
    
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = (event) => this.handleRemoteMessage(JSON.parse(event.data));
    
    this.setupEventListeners();
    this.startCursorBroadcast();
  }
  
  setupEventListeners() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };
    
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.currentPath = [pos];
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.canvas.setPointerCapture(e.pointerId);
    });
    
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.currentPath.push(pos);
      
      // Draw locally immediately (optimistic)
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    });
    
    this.canvas.addEventListener('pointerup', () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      
      const stroke = {
        userId: this.userId,
        path: this.currentPath,
        color: this.color,
        lineWidth: this.lineWidth,
        timestamp: Date.now()
      };
      
      this.undoStack.push(stroke);
      this.redoStack = []; // Clear redo on new stroke
      this.allStrokes.push(stroke);
      
      // Broadcast to other users
      this.ws.send(JSON.stringify({ type: 'stroke', data: stroke }));
    });
  }
  
  startCursorBroadcast() {
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const pos = {
        x: (e.clientX - rect.left) / rect.width,  // Normalized 0-1
        y: (e.clientY - rect.top) / rect.height
      };
      
      // Throttle: send cursor position every 50ms max
      if (!this._lastCursorSent || Date.now() - this._lastCursorSent > 50) {
        this.ws.send(JSON.stringify({
          type: 'cursor',
          data: { userId: this.userId, x: pos.x, y: pos.y, color: this.color }
        }));
        this._lastCursorSent = Date.now();
      }
    });
  }
  
  handleRemoteMessage(message) {
    switch (message.type) {
      case 'stroke':
        this.allStrokes.push(message.data);
        this.drawStroke(message.data);
        break;
        
      case 'cursor':
        this.remoteCursors.set(message.data.userId, message.data);
        this.renderCursors();
        break;
        
      case 'undo':
        this.allStrokes = this.allStrokes.filter(
          s => !(s.userId === message.data.userId && s.timestamp === message.data.timestamp)
        );
        this.redrawAll();
        break;
    }
  }
  
  drawStroke(stroke) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    const [first, ...rest] = stroke.path;
    this.ctx.moveTo(first.x, first.y);
    rest.forEach(p => this.ctx.lineTo(p.x, p.y));
    this.ctx.stroke();
  }
  
  undo() {
    if (this.undoStack.length === 0) return;
    const stroke = this.undoStack.pop();
    this.redoStack.push(stroke);
    
    // Remove from allStrokes
    const idx = this.allStrokes.findIndex(
      s => s.userId === stroke.userId && s.timestamp === stroke.timestamp
    );
    if (idx !== -1) this.allStrokes.splice(idx, 1);
    
    this.redrawAll();
    this.ws.send(JSON.stringify({ type: 'undo', data: { userId: this.userId, timestamp: stroke.timestamp } }));
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop();
    this.undoStack.push(stroke);
    this.allStrokes.push(stroke);
    
    this.drawStroke(stroke);
    this.ws.send(JSON.stringify({ type: 'stroke', data: stroke }));
  }
  
  redrawAll() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.allStrokes.forEach(stroke => this.drawStroke(stroke));
  }
  
  renderCursors() {
    // Use a separate overlay canvas for cursors (avoid redrawing strokes)
    const overlay = this._getOverlayCtx();
    overlay.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const [userId, cursor] of this.remoteCursors) {
      if (userId === this.userId) continue;
      const x = cursor.x * this.canvas.width;
      const y = cursor.y * this.canvas.height;
      
      // Draw cursor arrow
      overlay.fillStyle = cursor.color;
      overlay.beginPath();
      overlay.moveTo(x, y);
      overlay.lineTo(x + 12, y + 8);
      overlay.lineTo(x + 6, y + 10);
      overlay.lineTo(x + 8, y + 16);
      overlay.lineTo(x + 4, y + 14);
      overlay.lineTo(x, y + 12);
      overlay.closePath();
      overlay.fill();
      
      // Username label
      overlay.font = '11px system-ui';
      overlay.fillText(userId.slice(0, 8), x + 14, y + 10);
    }
  }
  
  exportPNG() {
    return this.canvas.toDataURL('image/png');
  }
}
```

---

## Round 2: DSA + Performance
**Duration:** 60 minutes

### Questions Asked
1. **Implement a function `deepFreeze`** that recursively freezes an object (prevents modifications at all levels)
2. **Follow-up: Handle circular references**

### 💡 Deep Freeze with Circular Reference Handling

```javascript
function deepFreeze(obj, frozen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (frozen.has(obj)) return obj; // Circular reference guard
  
  frozen.add(obj);
  Object.freeze(obj);
  
  // Freeze all property values
  const propNames = Object.getOwnPropertyNames(obj);
  const symbolProps = Object.getOwnPropertySymbols(obj);
  
  for (const key of [...propNames, ...symbolProps]) {
    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      deepFreeze(value, frozen);
    }
  }
  
  return obj;
}

// Tests:
const a = { x: 1, nested: { y: 2 } };
a.circular = a; // Circular reference
deepFreeze(a);

a.x = 999; // Silently fails (or throws in strict mode)
a.nested.y = 999; // Also frozen
console.log(a.x); // 1
console.log(a.nested.y); // 2
```

---

## 🎯 Key Takeaways
- Microsoft = **collaborative features + Canvas + real-time + performance**
- **Collaborative Whiteboard**: optimistic local rendering + broadcast strokes via WebSocket
- **Multi-cursor**: separate overlay canvas (avoid redrawing all strokes), throttled at 50ms
- **Per-user undo/redo**: separate stacks, broadcast undo events → others redraw without that stroke
- **deepFreeze**: `WeakSet` for circular references, `Object.getOwnPropertySymbols` for complete coverage
- **Export as PNG**: `canvas.toDataURL('image/png')` — trivial but shows Canvas API knowledge
- **Pointer events** over mouse events: works for touch, pen, and mouse
- Microsoft Teams interviews: heavy focus on real-time collaboration and accessibility

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Canvas, WebSocket, Real-time Drawing |
| DSA + Performance | Medium | Object Manipulation, Circular References |
| System Design | Hard | Collaborative Tools |
