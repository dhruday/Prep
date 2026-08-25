# Google — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + 1 FE Design + 1 Behavioral)
- **Timeline:** 4 weeks
- **Format:** Virtual (FE-specific loop)
- **Rejection Reason:** HC (Hiring Committee) down-leveled to L4, candidate declined

---

## Round 1: Phone Screen — JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement a retry function with exponential backoff**
2. **Explain how JavaScript garbage collection works**

### 💡 Interview-Ready Answer — Retry with Backoff

```javascript
function retry(fn, maxRetries = 3, baseDelay = 1000) {
  return async function (...args) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = delay * 0.5 * Math.random(); // 0-50% jitter
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError;
  };
}

// Usage
const fetchWithRetry = retry(fetch, 3, 1000);
// Retries: 1s, 2s, 4s (with jitter)

// Advanced: with abort controller for cancellation
function retryWithAbort(fn, maxRetries = 3, baseDelay = 1000) {
  return function (...args) {
    const controller = new AbortController();
    
    const promise = (async () => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        try {
          return await fn(...args, { signal: controller.signal });
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, baseDelay * Math.pow(2, attempt));
              controller.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
              });
            });
          }
        }
      }
      throw lastError;
    })();
    
    promise.abort = () => controller.abort();
    return promise;
  };
}
```

### 💡 Interview-Ready Answer — GC in JavaScript

```
V8 Garbage Collection (Generational):

1. Young Generation (Scavenge — Minor GC):
   - New objects allocated in "Semi-space" (2 halves: from-space, to-space)
   - When from-space full → copy live objects to to-space → swap
   - Objects surviving 2 scavenges → promoted to Old Generation
   - Very fast (< 1ms) but pauses JS execution (stop-the-world)

2. Old Generation (Mark-Sweep-Compact — Major GC):
   - Mark: traverse from GC roots (global, stack, closures), mark reachable
   - Sweep: free unmarked objects
   - Compact: defragment memory (move objects together)
   - Incremental marking: break work into small chunks between JS tasks
   - Concurrent marking (Orinoco): mark in background thread

3. Common Memory Leaks in JS:
   a. Forgotten event listeners (addEventListener without removeEventListener)
   b. Closures holding references to large objects
   c. Detached DOM nodes (removed from DOM but referenced in JS)
   d. Uncleared timers (setInterval without clearInterval)
   e. Global variables (accidental window.xxx assignment)
```

---

## Round 2: Coding — DOM Manipulation
**Duration:** 45 minutes

### Questions Asked
1. **Build a Virtual DOM diff algorithm**
   - Given two virtual DOM trees, compute minimal operations to transform one into the other

### 💡 Interview-Ready Answer

```javascript
// Virtual DOM node representation
function h(tag, props, ...children) {
  return { tag, props: props || {}, children: children.flat() };
}

// Diff two virtual DOM trees → produce patches
function diff(oldTree, newTree) {
  const patches = [];
  diffNodes(oldTree, newTree, patches, []);
  return patches;
}

function diffNodes(oldNode, newNode, patches, path) {
  // Case 1: New node doesn't exist → REMOVE
  if (newNode === undefined || newNode === null) {
    patches.push({ type: 'REMOVE', path: [...path] });
    return;
  }
  
  // Case 2: Old node doesn't exist → ADD
  if (oldNode === undefined || oldNode === null) {
    patches.push({ type: 'ADD', path: [...path], node: newNode });
    return;
  }
  
  // Case 3: Text nodes
  if (typeof oldNode === 'string' || typeof newNode === 'string') {
    if (oldNode !== newNode) {
      patches.push({ type: 'REPLACE', path: [...path], node: newNode });
    }
    return;
  }
  
  // Case 4: Different tag → REPLACE entire subtree
  if (oldNode.tag !== newNode.tag) {
    patches.push({ type: 'REPLACE', path: [...path], node: newNode });
    return;
  }
  
  // Case 5: Same tag → diff props and children
  const propPatches = diffProps(oldNode.props, newNode.props);
  if (propPatches.length > 0) {
    patches.push({ type: 'UPDATE_PROPS', path: [...path], props: propPatches });
  }
  
  // Diff children
  const maxLen = Math.max(oldNode.children.length, newNode.children.length);
  for (let i = 0; i < maxLen; i++) {
    diffNodes(
      oldNode.children[i],
      newNode.children[i],
      patches,
      [...path, i]
    );
  }
}

function diffProps(oldProps, newProps) {
  const patches = [];
  
  // Changed or new props
  for (const [key, value] of Object.entries(newProps)) {
    if (oldProps[key] !== value) {
      patches.push({ key, value });
    }
  }
  
  // Removed props
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      patches.push({ key, value: undefined });
    }
  }
  
  return patches;
}

// Apply patches to real DOM
function applyPatches(rootEl, patches) {
  for (const patch of patches) {
    const el = navigatePath(rootEl, patch.path);
    
    switch (patch.type) {
      case 'REMOVE':
        el.remove();
        break;
      case 'ADD':
        el.parentNode.appendChild(createElement(patch.node));
        break;
      case 'REPLACE':
        el.replaceWith(createElement(patch.node));
        break;
      case 'UPDATE_PROPS':
        for (const { key, value } of patch.props) {
          if (value === undefined) el.removeAttribute(key);
          else el.setAttribute(key, value);
        }
        break;
    }
  }
}

function createElement(vnode) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  const el = document.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props)) {
    el.setAttribute(key, value);
  }
  for (const child of vnode.children) {
    el.appendChild(createElement(child));
  }
  return el;
}
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Sheets (collaborative spreadsheet)**

### 💡 Interview-Ready Answer

```
Google Sheets Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Client (Browser)                                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Spreadsheet Engine                                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐   │    │
│  │  │ Cell Grid   │  │ Formula     │  │ Render     │   │    │
│  │  │ (Virtual    │  │ Engine      │  │ Layer      │   │    │
│  │  │  Rendering) │  │ (Parse →    │  │ (Canvas or │   │    │
│  │  │             │  │  Evaluate → │  │  DOM-based)│   │    │
│  │  │ Only render │  │  Dependency │  │            │   │    │
│  │  │ visible     │  │  Graph)     │  │            │   │    │
│  │  │ cells       │  │             │  │            │   │    │
│  │  └─────────────┘  └─────────────┘  └────────────┘   │    │
│  │  ┌─────────────┐  ┌─────────────┐                    │    │
│  │  │ Selection   │  │ OT Client   │  ← Operational    │    │
│  │  │ Manager     │  │ (transform  │    Transformation  │    │
│  │  │ (multi-     │  │  local ops  │    for real-time   │    │
│  │  │  cursor)    │  │  against    │    collaboration   │    │
│  │  │             │  │  remote)    │                    │    │
│  │  └─────────────┘  └─────────────┘                    │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Server                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ OT Server    │  │ Storage      │  │ Presence     │       │
│  │ (transform + │  │ (cell data   │  │ Service      │       │
│  │  broadcast)  │  │  in sparse   │  │ (who's       │       │
│  │              │  │  format)     │  │  editing     │       │
│  └──────────────┘  └──────────────┘  │  where)      │       │
│                                       └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

#### Formula Engine (Dependency Graph)
```javascript
class FormulaEngine {
  // Cell dependency graph: if A1 = B1 + C1, then A1 depends on [B1, C1]
  // When B1 changes, recalculate A1
  
  constructor() {
    this.cells = new Map();       // cellRef → { value, formula, display }
    this.deps = new Map();        // cellRef → Set<cellRef> (who depends on me)
    this.reverseDeps = new Map(); // cellRef → Set<cellRef> (who I depend on)
  }
  
  setCell(ref, input) {
    // Remove old dependencies
    this.clearDeps(ref);
    
    if (typeof input === 'string' && input.startsWith('=')) {
      // Parse formula: "=SUM(A1:A10)" → AST → extract references
      const ast = this.parseFormula(input);
      const references = this.extractReferences(ast);
      
      // Check for circular references
      if (this.wouldCreateCycle(ref, references)) {
        this.cells.set(ref, { value: '#CIRCULAR!', formula: input });
        return;
      }
      
      // Register dependencies
      for (const depRef of references) {
        if (!this.deps.has(depRef)) this.deps.set(depRef, new Set());
        this.deps.get(depRef).add(ref);
        if (!this.reverseDeps.has(ref)) this.reverseDeps.set(ref, new Set());
        this.reverseDeps.get(ref).add(depRef);
      }
      
      // Evaluate
      const value = this.evaluate(ast);
      this.cells.set(ref, { value, formula: input, display: value });
    } else {
      this.cells.set(ref, { value: input, formula: null, display: input });
    }
    
    // Propagate changes to dependents (topological order)
    this.recalculateDependents(ref);
  }
  
  recalculateDependents(changedRef) {
    // BFS: find all cells that need recalculation, in topological order
    const visited = new Set();
    const queue = [changedRef];
    const order = [];
    
    while (queue.length > 0) {
      const ref = queue.shift();
      if (visited.has(ref)) continue;
      visited.add(ref);
      
      const dependents = this.deps.get(ref) || new Set();
      for (const dep of dependents) {
        order.push(dep);
        queue.push(dep);
      }
    }
    
    // Recalculate in order
    for (const ref of order) {
      const cell = this.cells.get(ref);
      if (cell && cell.formula) {
        const ast = this.parseFormula(cell.formula);
        cell.value = this.evaluate(ast);
        cell.display = cell.value;
      }
    }
  }
  
  wouldCreateCycle(ref, newDeps) {
    // DFS from each newDep to see if we can reach ref
    const visited = new Set();
    const stack = [...newDeps];
    
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === ref) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const deps = this.reverseDeps.get(current) || new Set();
      for (const dep of deps) stack.push(dep);
    }
    return false;
  }
}
```

#### Virtual Rendering for Large Sheets
```javascript
class VirtualGrid {
  constructor(container, totalRows, totalCols, rowHeight, colWidth) {
    this.container = container;
    this.totalRows = totalRows;   // 1M rows
    this.totalCols = totalCols;   // 26K columns
    this.rowHeight = rowHeight;   // 25px
    this.colWidth = colWidth;     // 100px
    
    // Only render visible cells + buffer
    this.buffer = 5; // extra rows/cols to render outside viewport
    
    container.addEventListener('scroll', () => this.render());
    this.render();
  }
  
  render() {
    const { scrollTop, scrollLeft, clientHeight, clientWidth } = this.container;
    
    const startRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
    const endRow = Math.min(this.totalRows, Math.ceil((scrollTop + clientHeight) / this.rowHeight) + this.buffer);
    const startCol = Math.max(0, Math.floor(scrollLeft / this.colWidth) - this.buffer);
    const endCol = Math.min(this.totalCols, Math.ceil((scrollLeft + clientWidth) / this.colWidth) + this.buffer);
    
    // Use position: absolute for each visible cell
    // Or: use CSS Grid with grid-row/grid-column
    // Or: Canvas-based rendering (fastest for large sheets)
    
    const fragment = document.createDocumentFragment();
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.position = 'absolute';
        cell.style.top = `${r * this.rowHeight}px`;
        cell.style.left = `${c * this.colWidth}px`;
        cell.style.width = `${this.colWidth}px`;
        cell.style.height = `${this.rowHeight}px`;
        cell.textContent = getCellValue(r, c);
        fragment.appendChild(cell);
      }
    }
    
    // Replace visible cells
    this.container.querySelector('.cells').replaceChildren(fragment);
  }
}
```

---

## 🎯 Key Takeaways
- Google FE interviews test **JavaScript fundamentals deeply** — GC internals, closures, event loop
- **Retry with exponential backoff + jitter** is a must-know utility
- **Virtual DOM diff** algorithm — understand patch-based reconciliation
- **Google Sheets** is THE hardest FE system design — formula engine, OT, virtual rendering
- **Formula dependency graph** with cycle detection is the core challenge
- **Virtual rendering** (only render visible cells) is critical for performance
- **Operational Transformation** for real-time collaboration — know the concept even if you can't implement full OT

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Async, JS Internals, GC |
| Coding 1 | Hard | Virtual DOM, Diffing, Reconciliation |
| FE Design | Very Hard | Spreadsheet, Formula Engine, OT, Virtual Grid |
| Behavioral | Medium | Googleyness, Leadership |
