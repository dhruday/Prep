# 26. Reflows vs Repaints
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"A **reflow** (also called layout) is the process where the browser recalculates the position and dimensions of elements in the document. A **repaint** is the process where the browser redraws the visual appearance of elements without changing their geometry. Reflows are more expensive than repaints because they require recalculating the layout of potentially every element on the page — a single element's size change can cascade to affect all its siblings and ancestors. The most critical performance anti-pattern is **layout thrashing**: alternating DOM reads and writes in a loop, forcing the browser to abandon its batched layout queue and re-layout synchronously on every read. The fix is to batch all DOM reads first, then all writes — or use `requestAnimationFrame` to schedule writes to the next frame boundary. At SAP, I eliminated 340ms of layout thrashing in a tile rendering loop by reading all `offsetHeight` values first, then applying all height updates in a single batch."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What Triggers a Reflow (Layout Invalidation)

```
Reflow is triggered by ANY change that affects geometry:

DOM structural changes:
  - Add/remove element to/from DOM
  - Change document content (text node)
  - Toggle display:none → display:block

CSS geometry changes:
  - width, height, margin, padding, border, border-width
  - top, right, bottom, left (with position: relative/absolute/fixed)
  - font-size, font-family, line-height, letter-spacing
  - overflow, overflow-x, overflow-y
  - position, float, clear, display
  
JavaScript geometry reads (FORCED SYNCHRONOUS LAYOUT):
  - element.offsetWidth / offsetHeight / offsetTop / offsetLeft
  - element.scrollWidth / scrollHeight / scrollTop / scrollLeft
  - element.clientWidth / clientHeight / clientTop / clientLeft
  - element.getBoundingClientRect()
  - element.getClientRects()
  - element.getBBox() (SVG)
  - window.getComputedStyle(element) [for geometry properties]
  
Window changes:
  - Viewport resize
  - Scroll (in some cases — see below)
  - Orientation change
```

### What Triggers a Repaint (Only)

```
Repaint does NOT recalculate geometry — it only redraws visual appearance.

CSS visual changes (no geometry impact):
  - color, background-color, background-image
  - border-color, outline, outline-color
  - box-shadow (when no size change)
  - visibility (hidden/visible — space preserved, no layout)
  - text-decoration
  - border-radius (visual only, no layout impact)
  
  (Note: some of these may also trigger Composite if on a GPU layer)
```

### Compositor-Only Changes (No Reflow, No Repaint on Main Thread)

```
Certain properties are handled entirely on the Compositor Thread
(in the GPU Process) — NO Main Thread involvement:

  - transform (translate, rotate, scale, skew)
  - opacity

These changes update only the GPU texture transform/alpha values.
The Main Thread is NOT consulted.
→ These can animate at 60fps even during heavy JavaScript execution.

WHY: Element is on a compositor layer (see Topic 28: will-change).
The Compositor Thread holds a copy of the layer tree.
For transform/opacity changes on composited layers, it updates its
own copy without asking the Main Thread → pixels on screen change
→ without any reflow or repaint.
```

**The rendering pipeline cost hierarchy:**
```
MOST EXPENSIVE → LEAST EXPENSIVE:

Reflow + Repaint + Composite (full pipeline):
  Geometry change (width, top, margin, ...)
  Requires: Layout → Paint → Composite
  Main Thread: heavy
  
Repaint + Composite (skip layout):
  Visual change (color, background, visibility)
  Requires: Paint → Composite
  Main Thread: medium

Composite only (skip layout and paint):
  transform, opacity on composited layer
  Requires: Composite only
  Main Thread: none (Compositor Thread + GPU Process)
  Cost: cheapest possible
```

---

### Layout Thrashing: The Critical Anti-Pattern

```
The browser is LAZY about layout. It batches layout work and only
recalculates when necessary (typically before painting a frame).

Layout queue / "dirty flag":
  A DOM write (style change) marks the layout as "dirty"
  The browser queues a layout recalculation for end of frame
  Multiple writes accumulate in the queue → ONE layout at frame end

The invalidation happens when you READ geometry AFTER writing:
  Element is "dirty" (pending layout recalculation)
  JavaScript asks: "what is element.offsetHeight?"
  Browser CANNOT return stale values (would be wrong)
  Browser FORCES synchronous layout NOW to answer the question
  → "Forced Synchronous Layout" in Chrome DevTools
```

**Layout Thrashing pattern:**
```typescript
// ❌ BAD: Layout thrashing — 1000 forced synchronous layouts
function badExample(items: HTMLElement[]): void {
  items.forEach(item => {
    const height = item.offsetHeight;         // READ → forces layout
    item.style.height = `${height * 2}px`;   // WRITE → invalidates layout
    // Next iteration: READ after WRITE → forced layout again
    // Result: N reflows for N elements
  });
}

// ✅ GOOD: Batch reads then writes — 1 layout
function goodExample(items: HTMLElement[]): void {
  // Phase 1: Read ALL values (triggers at most 1 layout at start)
  const heights = items.map(item => item.offsetHeight);

  // Phase 2: Write ALL values (ONE layout invalidation for all)
  items.forEach((item, i) => {
    item.style.height = `${heights[i] * 2}px`;
  });
  // Browser schedules ONE layout recalculation before next frame
}
```

---

### requestAnimationFrame as a Layout Boundary

```typescript
// ✅ BETTER: Use requestAnimationFrame to split over 2 frames
//           (avoids making current frame do double layout work)

function animateWithRAF(items: HTMLElement[]): void {
  // Frame N: Read phase (stable layout)
  const heights = items.map(item => item.offsetHeight);

  requestAnimationFrame(() => {
    // Frame N+1: Write phase (layout calculated once by browser at frame end)
    items.forEach((item, i) => {
      item.style.height = `${heights[i] * 2}px`;
    });
  });
}
```

---

### Measuring Layout Thrashing

```
Chrome DevTools → Performance tab:
  Look for "Forced reflow" warnings (red triangle on Main Thread tasks)
  Look for "Layout" entries immediately after JavaScript tasks
  Multiple short Layout entries in quick succession = thrashing

Layout timing API:
  performance.measure() around suspect code to detect >16ms layout spikes

PerformanceObserver for layout-shift:
  new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'layout-shift' && entry.value > 0.1) {
        console.warn('CLS contribution:', entry.value);
      }
    });
  }).observe({ type: 'layout-shift', buffered: true });
```

---

### Reflow Scope: Global vs Local

```
Not all reflows are equal in cost:

Global (full document) reflow:
  Triggered by: viewport resize, initial load, document-level changes
  Recalculates layout for ENTIRE document (all elements)
  Most expensive

Subtree reflow:
  Triggered by: changing an element that only affects its subtree
  Browsers optimize: if change is confined to a subtree, only re-layout that subtree
  Still expensive but less than global

Incremental reflow:
  Browsers batch multiple "dirty" elements together
  Only implemented for appending new elements (incremental layout)
  vs. changing existing elements (requires upward propagation)

Cost estimation:
  Wider/deeper subtree → more expensive reflow
  Fixed-size containers (overflow:hidden) can contain reflow scope
    → Layout inside doesn't affect siblings/ancestors if contained
  
  Optimization: Use fixed-dimensions containers for frequently updated content
  (avoids ancestor reflow cascade)
```

---

### Properties to Always Avoid in Animations

```
These all trigger REFLOW (avoid in >16ms frame budget):

❌ top, left, right, bottom (use transform: translateX/Y instead)
❌ width, height (use transform: scale instead, if semantic doesn't matter)
❌ margin, padding, border-width
❌ font-size, line-height (causes reflow of text runs)

Properties safe for animations (compositor only):
✅ transform: translate/rotate/scale/skew
✅ opacity

Properties safe for animations (paint only, no layout):
⚠️ color, background-color (paint, no layout — ok if not thrashing)
⚠️ box-shadow (paint)
⚠️ border-color (paint)
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **Reading layout properties inside `MutationObserver` callbacks:** `MutationObserver` fires after every DOM mutation. Reading `offsetHeight` inside the callback, which had just finished writing, creates a forced layout per mutation. Solution: batch observations and use a debounced layout read, or use `ResizeObserver` instead (specifically designed for layout changes).

- **Animating geometric properties via JavaScript `setInterval`:** Setting `element.style.top = ...` every 16ms in a `setInterval` triggers a full reflow per frame plus is not synchronized with the browser's frame scheduler. Always use `requestAnimationFrame` for JS animations.

- **Inline `style` attribute mutation for conditional visibility:** Using `element.style.display = 'none'/'block'` in event handlers is common but forces a reflow each time. For high-frequency visibility toggles (e.g., tooltip on every mousemove), use `opacity` + `pointer-events` or `visibility` to avoid reflow.

- **Using CSS transitions on `auto` to fixed height:** `height: auto → height: 200px` cannot be transitioned natively (browser doesn't know the intermediate values for `auto`). Using JS to read `scrollHeight` (ONE reflow) and then transition to that fixed value is the workaround — but must be careful to batch the read before the write.

- **Event handlers reading and writing layout in sequence:** A common React/Angular pattern: `onResize` handler reads `clientWidth`, updates state, causes re-render. If the re-render also reads `clientWidth` in the same tick, two reflows occur. Memoize the last known dimension and only update state when it actually changes.

---

## 🏭 3. Real-World Examples

**SAP Fiori Tile Layout — Layout Thrashing Fix:**

SAP Fiori's launchpad displayed 100+ app tiles in a grid. On load, an Angular directive read `offsetHeight` of each tile to equalize heights. The code:
```javascript
tiles.forEach(tile => {
  const h = tile.nativeElement.offsetHeight; // READ
  tile.nativeElement.style.height = h + 'px'; // WRITE → dirties layout
}); // Total: 100 forced synchronous layouts ~ 340ms
```
Fix: Read all heights first (one reflow), then apply all heights (one pending layout):
```typescript
const heights = tiles.map(t => t.nativeElement.offsetHeight); // 1 read
tiles.forEach((t, i) => t.nativeElement.style.height = heights[i] + 'px'); // 1 pending layout
```
Result: 340ms → 8ms, INP improvement from 420ms → 87ms.

**Bosch Dashboard — Sensor tile animation:**

Bosch's WebSocket dashboard animated sensor tiles expanding on new data arrival using `height: 0 → height: auto`. The animation was implemented with CSS transition on `height`. Problem: `height: auto` can't transition — the animation was instant (no visual transition). Fix: Read `scrollHeight` (1 reflow), set `maxHeight` from 0 to `scrollHeight`px (a `max-height` trick), apply CSS transition on `max-height`. This produced a smooth accordion animation without any JavaScript-driven animation loop, using only composited paint (not a compositor-only change, but efficient).

**React Virtual DOM — Batched updates:**

React's batching mechanism is essentially an automated "read then write" organizer. In React 18, all state updates are automatically batched (even in timeouts and Promises), reducing Reflows to one per batch. Before React 18, state updates in setTimeout were unbatched — each `setState` triggered a render+reflow. This was the motivation for `unstable_batchedUpdates()` in older React code.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "Reflow is Layout recalculation — recalculating every element's position and size. Repaint is redrawing visual pixels without changing geometry. Reflow is more expensive because a single size change can cascade — an element's width change can affect all siblings in a flex container. The most dangerous pattern is layout thrashing: alternating DOM reads and writes in a loop. Browsers batch layout work and only recalculate at frame end, but reading a geometry value like `offsetHeight` forces an immediate synchronous layout — disrupting the batch. Fix: batch ALL reads first, then ALL writes. At SAP, a tile height-equalization loop was causing 100 forced synchronous layouts. Reading all heights first then writing all heights reduced it from 340ms to 8ms. For animations, always prefer `transform` and `opacity` — they're handled on the Compositor Thread with no Main Thread involvement."

---

### Likely Follow-up Questions

1. **What is "Forced Synchronous Layout" and when does it happen?** → When JS code writes to the DOM (making layout "dirty") and then immediately reads a geometric value (`offsetWidth`, `getBoundingClientRect`, etc.), the browser cannot return the stale pre-write value (it would be wrong). It must synchronously recalculate layout to answer the read. Normally, layout is batched to end-of-frame. Forced synchronous layout breaks that batch and is visible in Chrome DevTools as orange "Forced reflow" entries.

2. **Which CSS properties only trigger composite update (not reflow or repaint)?** → Only `transform` and `opacity` on composited layers (elements with `will-change: transform` or already composited via `transform`/`filter`). All other CSS changes trigger at minimum a repaint.

3. **How does `requestAnimationFrame` help with reflow performance?** → `rAF` ensures writes happen at the start of a new frame, giving the browser the full frame budget (16ms at 60fps) to perform layout and paint. Using `rAF` for animations ensures no more than one layout per frame. It's also aligned with VSync, preventing "sub-frame" renders that would be invisible.

4. **How does React's batching relate to reflow prevention?** → React batches multiple `setState` calls into one re-render. In terms of browser rendering, this means one DOM update → one reflow/repaint, instead of N re-renders for N state updates. React 18's automatic batching extends this to async contexts. Conceptually, it's the same "batch writes, then commit once" pattern as the manual DOM read/write batching.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Simulating layout thrashing and the fix (from SAP story)

interface TileElement {
  element: HTMLElement;
  desiredHeight?: number;
}

// ❌ BAD — Layout thrashing: 100 forced synchronous layouts
function equalizeHeightsBad(tiles: HTMLElement[]): void {
  const startTime = performance.now();

  tiles.forEach(tile => {
    const currentHeight = tile.offsetHeight; // FORCED LAYOUT (dirty from previous write)
    if (currentHeight < 200) {
      tile.style.height = '200px'; // WRITE → invalidates layout
    }
  });

  console.log(`Bad approach: ${(performance.now() - startTime).toFixed(1)}ms`);
}

// ✅ GOOD — Batched reads then writes: 1 layout max
function equalizeHeightsGood(tiles: HTMLElement[]): void {
  const startTime = performance.now();

  // Phase 1: Read all heights (at most 1 layout here)
  const heights: number[] = tiles.map(tile => tile.offsetHeight);

  // Phase 2: Write all heights (batched → 1 pending layout, resolved at frame end)
  tiles.forEach((tile, i) => {
    if (heights[i] < 200) {
      tile.style.height = '200px';
    }
  });

  console.log(`Good approach: ${(performance.now() - startTime).toFixed(1)}ms`);
}

// DEMO 2: fastdom-style scheduling (inspired by fastdom.js pattern)
class DOMScheduler {
  private reads: Array<() => void> = [];
  private writes: Array<() => void> = [];
  private rafScheduled = false;

  read(fn: () => void): void {
    this.reads.push(fn);
    this.scheduleFlush();
  }

  write(fn: () => void): void {
    this.writes.push(fn);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    const reads = this.reads.splice(0);
    const writes = this.writes.splice(0);

    // All reads first (1 batch layout measurement)
    reads.forEach(fn => fn());
    // All writes second (1 pending layout write, resolved next frame)
    writes.forEach(fn => fn());

    this.rafScheduled = false;
  }
}

const domScheduler = new DOMScheduler();

// Usage: (SAP tile equalization)
function equalizeWithScheduler(tiles: HTMLElement[]): void {
  const heights: number[] = [];

  tiles.forEach((tile, i) => {
    domScheduler.read(() => {
      heights[i] = tile.offsetHeight;
    });
  });

  tiles.forEach((tile, i) => {
    domScheduler.write(() => {
      if (heights[i] < 200) {
        tile.style.height = '200px';
      }
    });
  });
}

// DEMO 3: Using ResizeObserver instead of polling offsetHeight
// (ResizeObserver fires only when element actually resizes)
function observeResize(el: HTMLElement, onResize: (w: number, h: number) => void): () => void {
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
      onResize(width, height);
    }
  });
  observer.observe(el);
  return () => observer.disconnect();
}

// DEMO 4: Detecting layout thrashing via PerformanceLongTaskTiming
function monitorLayoutThrashing(): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        console.warn(
          `Long task (possible layout thrash): ${entry.duration.toFixed(1)}ms`,
          `at ${entry.startTime.toFixed(0)}ms`
        );
      }
    }
  });
  observer.observe({ type: 'longtask', buffered: true });
}

// DEMO 5: Animation — reflow-triggering vs compositor-only
function animatePanel(panel: HTMLElement, show: boolean): void {
  // ❌ Causes Reflow every frame (top is a geometry property):
  // panel.style.top = show ? '0px' : '-300px';

  // ✅ Compositor Thread only (transform — no reflow, no repaint on main thread):
  panel.style.transform = show ? 'translateY(0)' : 'translateY(-300px)';
  // Combined with CSS: .panel { transition: transform 300ms ease; will-change: transform; }
}
```

---

## 🧠 6. Memory Aid

**Mental Model:**
Reflow = measuring everyone in a room to rearrange furniture — you must measure before you can move anything. Repaint = repainting the furniture without moving it. If you keep asking "how tall is this chair?" right after rearranging, you force a new measurement every time. The fast pattern: measure everything once, then rearrange everything at once.

**The 3 cost levels:**
1. **Reflow + Repaint + Composite** — geometry changes (top, width, margin) → ❌ Expensive
2. **Repaint + Composite** — visual changes (color, background) → ⚠️ Medium
3. **Composite only** — transform, opacity on a composited layer → ✅ Cheap/free

**Layout Thrashing trigger:**
`WRITE → READ → WRITE → READ` = layout thrashing.
Pattern fix: `READ → READ → READ → WRITE → WRITE → WRITE`

**Mnemonic: RRR-WWW** — batch all Reads first, then all Writes — "**R**ead **R**ead **R**ead then **W**rite **W**rite **W**rite"

**If you go blank:** *"Reflow = layout recalculation (expensive), triggered by geometry changes or geometry reads after writes. Repaint = visual redraw (medium), geometry unchanged. transform/opacity = compositor only (cheapest). Layout thrashing = write then read in a loop. Fix: batch reads then writes."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Layout thrashing is the most common cause of janky scrolling and unresponsive UI in complex web apps. A SAP dashboard with 100+ dynamic tiles can accumulate 340ms of forced synchronous layouts — making the page feel unresponsive to touch inputs. Fixing layout thrashing directly improves INP (Interaction to Next Paint).
→ **Performance:** Every geometry read after a DOM write forces a synchronous layout, breaking the browser's frame-end batching. Each forced layout takes 2-50ms depending on DOM complexity. 100 such layouts = 200-5000ms blocking the Main Thread — easily visible as dropped frames.
→ **Business:** INP (Interaction to Next Paint) is a Core Web Vitals metric since March 2024. Poor INP (>200ms) negatively impacts Google SEO. Layout thrashing is a primary cause of poor INP. Fixing it (as in the SAP tile example) moves INP from "Poor" to "Good" range.

**How it works (3 sentences):**
Reflow (layout) recalculates all element positions and dimensions and is triggered by any geometry-affecting CSS change, DOM mutation, or — critically — by reading a computed geometry value from JavaScript after a write (Forced Synchronous Layout). Repaint redraws visual pixels without changing geometry (paint-only changes like `color` and `background-color`), while compositor-only changes like `transform` and `opacity` on composited layers bypass both the Main Thread and paint, executing entirely on the GPU Process Compositor Thread. Layout thrashing — alternating DOM reads and writes in a loop — is the most damaging performance anti-pattern because each read-after-write forces the browser to abandon its end-of-frame layout batching and compute layout synchronously, multiplying the cost linearly with iteration count; the fix is always to batch all reads first, then all writes, using either manual read/write separation, the fastdom library pattern, or `requestAnimationFrame` to defer writes to the next frame.

**Company relevance:**
- **Microsoft:** Azure Portal's data tables sort/filter operations historically triggered layout thrashing when re-ordering rows. The fix to batch DOM read/writes via React's reconciler (which handles batching automatically in newer versions) reduced grid sort time from ~400ms to <50ms.
- **Adobe:** Photoshop Web's layer list panel updates (renaming, reordering, visibility changes) involve reading panel heights and writing layer positions — a classic layout thrash opportunity. Adobe uses virtualization (react-virtuoso) which batches DOM mutations to avoid multiple forced layouts.
- **Salesforce:** Lightning Data Table's column resize feature reads `offsetWidth` of every column header and writes new `min-width` values. Salesforce's LWC component framework wraps these in a batched RAF cycle to prevent thrashing during resize drag.
- **Cisco:** WebEx's tile layout for Gallery View (up to 25 concurrent participants) uses CSS Grid exclusively (no JS layout reads) and adjusts via CSS custom properties, eliminating JS-triggered reflows during participant join/leave entirely.

---
✅ **Topic 26/486 complete.**
→ **Continuing to Topic 27: GPU vs CPU Rendering**
