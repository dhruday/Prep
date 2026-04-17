# 497 – Excalidraw / Collaborative Whiteboard Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Excalidraw is a collaborative, infinite canvas drawing tool that tests **Canvas/WebGL rendering** (thousands of shapes at 60fps), **CRDT-based real-time collaboration** (conflict-free concurrent editing), **infinite canvas** (pan, zoom, coordinate transforms), **shape manipulation** (selection, resize, rotate, snapping), and **undo/redo** (operation log, per-user undo). The key challenge is rendering and manipulating thousands of vector shapes on an infinite canvas while keeping collaboration lag-free.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Excalidraw Client                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Toolbar: Select | Shapes | Text | Pen | Eraser       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │              Infinite Canvas (HTML5 Canvas)           │  │
│  │                                                      │  │
│  │    ┌──────┐    ┌─────────────┐    ┌──────┐          │  │
│  │    │ Rect │    │   Text Box  │    │ Arrow│──────►   │  │
│  │    └──────┘    └─────────────┘    └──────┘          │  │
│  │                 ┌─────┐                              │  │
│  │                 │ 🟡  │ ← Selection handle           │  │
│  │                 └─────┘                              │  │
│  │                                                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Status: Zoom 100% | Collaborators: 👤👤👤 | Saved     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ State Layer                                          │   │
│  │ ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │   │
│  │ │ Elements  │  │ App State│  │ Collaboration     │  │   │
│  │ │ (shapes)  │  │ (zoom,   │  │ (CRDT doc,        │  │   │
│  │ │           │  │  cursor, │  │  presence,         │  │   │
│  │ │           │  │  tool)   │  │  WebSocket)        │  │   │
│  │ └──────────┘  └──────────┘  └───────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### Element Data Model

```typescript
interface ExcalidrawElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow'
    | 'text' | 'freedraw' | 'image';

  // Position & dimensions (in scene coordinates)
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;              // rotation in radians

  // Style
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'cross-hatch' | 'solid';
  strokeWidth: number;
  roughness: number;          // 0 = clean, 2 = sketchy (rough.js)
  opacity: number;

  // Metadata
  isDeleted: boolean;         // soft delete for CRDT compatibility
  version: number;            // incremented on each edit
  versionNonce: number;       // random nonce for conflict resolution
  groupIds: string[];         // for grouped elements
  boundElements: Binding[];   // arrows bound to shapes

  // Point-based elements (line, arrow, freedraw)
  points?: [number, number][];

  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: 'left' | 'center' | 'right';
}
```

### Canvas Rendering Engine

```typescript
class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private roughCanvas: RoughCanvas;  // rough.js for hand-drawn style
  private appState: AppState;

  render(elements: ExcalidrawElement[]) {
    const ctx = this.ctx;
    const { scrollX, scrollY, zoom } = this.appState;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    // Apply viewport transform: pan + zoom
    ctx.scale(zoom, zoom);
    ctx.translate(scrollX, scrollY);

    // Only render visible elements (viewport culling)
    const viewport = this.getViewportBounds();
    const visible = elements.filter(el =>
      !el.isDeleted && this.isInViewport(el, viewport)
    );

    // Sort by layer order (z-index)
    visible.sort((a, b) => a.index - b.index);

    for (const element of visible) {
      ctx.save();

      // Apply element rotation
      if (element.angle) {
        const cx = element.x + element.width / 2;
        const cy = element.y + element.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(element.angle);
        ctx.translate(-cx, -cy);
      }

      ctx.globalAlpha = element.opacity / 100;

      this.renderElement(element);
      ctx.restore();
    }

    // Render selection handles, collaborator cursors
    this.renderUI();

    ctx.restore();
  }

  private renderElement(el: ExcalidrawElement) {
    switch (el.type) {
      case 'rectangle':
        this.roughCanvas.rectangle(el.x, el.y, el.width, el.height, {
          stroke: el.strokeColor,
          fill: el.backgroundColor || undefined,
          fillStyle: el.fillStyle,
          strokeWidth: el.strokeWidth,
          roughness: el.roughness,
        });
        break;

      case 'freedraw':
        if (el.points) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = el.strokeColor;
          this.ctx.lineWidth = el.strokeWidth;
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';

          for (let i = 0; i < el.points.length; i++) {
            const [px, py] = el.points[i];
            if (i === 0) this.ctx.moveTo(el.x + px, el.y + py);
            else this.ctx.lineTo(el.x + px, el.y + py);
          }
          this.ctx.stroke();
        }
        break;

      case 'text':
        this.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        this.ctx.fillStyle = el.strokeColor;
        this.ctx.textAlign = el.textAlign || 'left';
        this.ctx.fillText(el.text || '', el.x, el.y + el.fontSize!);
        break;

      // ... arrow, ellipse, diamond, line, image
    }
  }

  // Viewport culling: skip elements outside visible area
  private isInViewport(el: ExcalidrawElement, vp: Bounds): boolean {
    return !(el.x + el.width < vp.minX ||
             el.x > vp.maxX ||
             el.y + el.height < vp.minY ||
             el.y > vp.maxY);
  }
}
```

### Infinite Canvas: Pan & Zoom

```typescript
function useCanvasInteraction(canvasRef: RefObject<HTMLCanvasElement>) {
  const appState = useAppState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ──── Wheel: Zoom + Pan ────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+Scroll → Zoom
        const zoomFactor = 1 - e.deltaY * 0.001;
        const newZoom = Math.min(10, Math.max(0.1, appState.zoom * zoomFactor));

        // Zoom toward cursor position
        const rect = canvas.getBoundingClientRect();
        const cursorX = (e.clientX - rect.left) / appState.zoom - appState.scrollX;
        const cursorY = (e.clientY - rect.top) / appState.zoom - appState.scrollY;

        appState.setZoom(newZoom);
        appState.setScroll(
          cursorX - (e.clientX - rect.left) / newZoom,
          cursorY - (e.clientY - rect.top) / newZoom
        );
      } else {
        // Regular scroll → Pan
        appState.setScroll(
          appState.scrollX - e.deltaX / appState.zoom,
          appState.scrollY - e.deltaY / appState.zoom
        );
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [appState.zoom, appState.scrollX, appState.scrollY]);
}
```

### CRDT Collaboration (Yjs)

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class CollaborationManager {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider;
  private yElements: Y.Map<ExcalidrawElement>;
  private awareness: Awareness;

  constructor(roomId: string) {
    this.ydoc = new Y.Doc();
    this.provider = new WebsocketProvider(
      'wss://collab.excalidraw.com', roomId, this.ydoc
    );

    // Shared element map — CRDT-based, conflict-free
    this.yElements = this.ydoc.getMap('elements');

    // Awareness: cursors + selections of other users
    this.awareness = this.provider.awareness;
    this.awareness.setLocalState({
      user: { name: currentUser.name, color: randomColor() },
      cursor: null,
      selectedElementIds: [],
    });
  }

  // Local edit → propagated to all peers via CRDT
  updateElement(element: ExcalidrawElement) {
    this.ydoc.transact(() => {
      this.yElements.set(element.id, {
        ...element,
        version: element.version + 1,
        versionNonce: Math.random(),
      });
    });
  }

  deleteElement(id: string) {
    this.ydoc.transact(() => {
      const el = this.yElements.get(id);
      if (el) {
        this.yElements.set(id, { ...el, isDeleted: true });
      }
    });
  }

  // Listen for remote changes
  onRemoteChange(callback: (elements: ExcalidrawElement[]) => void) {
    this.yElements.observe(() => {
      const elements = Array.from(this.yElements.values());
      callback(elements);
    });
  }

  // Update local cursor position for others to see
  updateCursor(x: number, y: number) {
    this.awareness.setLocalStateField('cursor', { x, y });
  }

  // Get all collaborator cursors
  getCollaboratorCursors(): CollaboratorCursor[] {
    const states = this.awareness.getStates();
    const cursors: CollaboratorCursor[] = [];
    states.forEach((state, clientId) => {
      if (clientId !== this.ydoc.clientID && state.cursor) {
        cursors.push({
          user: state.user,
          cursor: state.cursor,
          selectedElementIds: state.selectedElementIds,
        });
      }
    });
    return cursors;
  }
}
```

### Undo/Redo (Per-User Operation Log)

```typescript
class UndoManager {
  private undoStack: Operation[][] = [];  // grouped operations
  private redoStack: Operation[][] = [];

  pushOperation(ops: Operation[]) {
    this.undoStack.push(ops);
    this.redoStack = []; // clear redo on new action
  }

  undo(collab: CollaborationManager): void {
    const ops = this.undoStack.pop();
    if (!ops) return;

    const inverses = ops.map(op => this.invert(op));
    inverses.forEach(inv => collab.updateElement(inv.element));
    this.redoStack.push(ops);
  }

  redo(collab: CollaborationManager): void {
    const ops = this.redoStack.pop();
    if (!ops) return;

    ops.forEach(op => collab.updateElement(op.element));
    this.undoStack.push(ops);
  }

  private invert(op: Operation): Operation {
    return { ...op, element: op.previousState };
  }
}
```

### Anti-Patterns

- ❌ Using SVG for the canvas — DOM overhead with 10K+ shapes; use HTML5 Canvas
- ❌ Re-rendering all shapes every frame — viewport culling + dirty region tracking
- ❌ OT (Operational Transform) for whiteboard — CRDT (Yjs) is simpler and handles offline
- ❌ Global undo — must be per-user (my undo shouldn't undo your changes)
- ❌ Storing pixel data — store vector data (shapes + properties) for infinite zoom
- ❌ No hover detection optimization — use spatial index (R-tree) for hit testing

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Excalidraw Actual Architecture
- **Rendering**: HTML5 Canvas with rough.js for hand-drawn style
- **Collaboration**: Yjs CRDT + WebSocket (self-hostable)
- **State**: Immutable element array with version tracking
- **Export**: SVG, PNG, Clipboard
- **Libraries**: Reusable shape libraries (UML, flowchart, wireframe)

### Figma
- **Rendering**: WebGL (C++ compiled to WebAssembly)
- **Collaboration**: Custom CRDT protocol
- **Performance**: 100K+ shapes at 60fps via GPU rendering

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design a collaborative whiteboard around three systems: canvas rendering, state management with CRDT collaboration, and interaction handling.*

*Canvas: HTML5 Canvas API (not SVG — too many DOM nodes at scale). Viewport culling: only render shapes within the visible area. Pan via scroll offset, zoom via canvas scale transform. rough.js for the hand-drawn aesthetic.*

*State: Each shape is an object with id, type, x, y, width, height, style properties. Stored in a Yjs CRDT Map for conflict-free multi-user editing. When a user draws/moves/resizes, the element's version is incremented and synced via WebSocket.*

*Collaboration: Yjs awareness protocol for cursor positions and selections. Each user sees others' cursors in real-time. Undo is per-user via a local operation log — my undo reverses only my operations.*

*Interaction: Mouse/touch events mapped to scene coordinates via inverse zoom/pan transform. Hit testing against shapes for selection. Resize handles with aspect-ratio constraints. Snapping guides for alignment."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Collaborative whiteboard combines Canvas rendering, CRDTs, infinite canvas math, and real-time presence — a uniquely complex frontend system design question.
**How:** Canvas rendering + viewport culling → Yjs CRDT shared Map → WebSocket sync + awareness cursors → per-user undo log → coordinate transforms for pan/zoom.
**Companies:** Excalidraw, Figma (WebGL + custom CRDT), Miro, Microsoft Whiteboard, Google Jamboard.
