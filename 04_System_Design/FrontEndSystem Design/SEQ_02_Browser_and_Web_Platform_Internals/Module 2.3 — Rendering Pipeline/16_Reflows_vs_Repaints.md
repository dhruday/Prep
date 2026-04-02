# 16. Reflows vs Repaints

---

## 1. High-Level Explanation (Frontend Interview Level)

Reflows and repaints are the two most expensive operations in the browser's rendering pipeline that get triggered by DOM and style mutations. Understanding them is critical for diagnosing and fixing jank.

**Reflow (also called Layout):**
- Recalculates the **geometry** (position and size) of elements
- A change in one element can cascade and cause the entire document to re-layout
- Triggered by: adding/removing DOM nodes, changing element dimensions, changing fonts, resizing window
- Expensive because it may affect every element in the document

**Repaint (also called Paint):**
- Redraws the **pixels** on screen without recalculating geometry
- Only triggered when visual appearance changes (color, background, shadow, outline) but not geometry
- Cheaper than reflow but still expensive on large surfaces
- Every reflow is followed by a repaint, but not every repaint requires a reflow

**Composite Only (cheapest):**
- Moves or transforms already-painted GPU layers
- No geometry recalculation, no pixel redrawing
- Handled entirely by the compositor thread — doesn't block the main thread
- Only `transform` and `opacity` changes trigger composite-only updates

**The hierarchy:**
```
Reflow → Repaint → Composite    (most expensive chain)
         Repaint → Composite    (skips geometry, still costly on large areas)
                   Composite    (cheapest — GPU layer move only)
```

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### What Triggers Each

**Properties that trigger Reflow:**
| Property Group | Examples |
|---------------|----------|
| Geometry | `width`, `height`, `padding`, `margin`, `border`, `top`, `left`, `right`, `bottom` |
| Display | `display`, `position`, `float`, `clear`, `overflow` |
| Font | `font-size`, `font-family`, `font-weight`, `line-height`, `text-align` |
| Content | `content` (of pseudo-elements) |
| DOM Mutations | Add/remove nodes, `innerHTML`, `textContent` |
| Viewport | `window.resizeTo()`, scrollbar appearance/disappearance |

**Properties that trigger Repaint Only (no reflow):**
| Property Group | Examples |
|---------------|----------|
| Color | `color`, `background-color`, `border-color` |
| Visibility | `visibility` (hidden to visible), `outline-color` |
| Shadows | `box-shadow`, `text-shadow` |
| Images | `background-image` |

**Properties that Composite Only (no reflow, no repaint):**
| Property |
|----------|
| `transform` (translate, rotate, scale) |
| `opacity` |
| `filter` (partially, depends on browser) |
| `will-change: transform` or `will-change: opacity` |

### Synchronous Layout — The Real Performance Killer

The browser **batches** DOM reads and writes and flushes them asynchronously. But if you **read a layout property** (like `offsetHeight`, `scrollTop`, `getBoundingClientRect()`) after making any DOM write in the same JS execution, the browser is **forced to synchronously flush pending layout** before it can return the accurate value.

This is called **Forced Synchronous Layout** (FSL) or **Layout Thrashing** when it happens in a loop.

```javascript
// LAYOUT THRASHING — causes N synchronous layouts in one frame
const elements = document.querySelectorAll('.card'); // 100 cards

elements.forEach(el => {
  el.style.width = '200px';              // WRITE — marks layout dirty
  const h = el.offsetHeight;            // READ — forced synchronous layout!
  el.style.height = (h * 1.5) + 'px';  // WRITE — marks layout dirty again
  const w = el.offsetWidth;             // READ — forced sync layout again!
});
// Result: 200 forced synchronous layouts, frame budget blown at ~100 elements
```

**Chrome DevTools will show this as:** "Forced reflow is a likely performance bottleneck."

### Solving Layout Thrashing — Batching Pattern

```javascript
// CORRECT: Separate read phase from write phase
const elements = document.querySelectorAll('.card');

// READ PHASE — one layout flush
const measurements = Array.from(elements).map(el => ({
  height: el.offsetHeight,
  width: el.offsetWidth,
}));

// WRITE PHASE — no reads, so no forced flush
elements.forEach((el, i) => {
  el.style.width = '200px';
  el.style.height = (measurements[i].height * 1.5) + 'px';
});
// Result: ONE layout call (the initial read phase flush), then ONE batched write/layout
```

**Using `requestAnimationFrame` for batching:**
```javascript
// Queue a write to be batched in the next animation frame
function updateLayout(el, value) {
  requestAnimationFrame(() => {
    el.style.width = value; // All rAF callbacks run before paint — automatically batched
  });
}
```

### The FLIP Animation Technique

FLIP (First, Last, Invert, Play) is a pattern for animating properties that would normally trigger reflow:

```javascript
function animateResize(element, newWidth, newHeight) {
  // First: record current position/size
  const first = element.getBoundingClientRect();
  
  // Last: apply the change
  element.style.width = newWidth + 'px';
  element.style.height = newHeight + 'px';
  
  // Get new position (forces sync layout here, but only once)
  const last = element.getBoundingClientRect();
  
  // Invert: move element BACK to old position using transform (composite)
  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  const deltaW = first.width / last.width;
  const deltaH = first.height / last.height;
  
  element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
  element.style.transformOrigin = 'top left';
  
  // Play: animate transform back to identity (composite-only animation)
  requestAnimationFrame(() => {
    element.style.transition = 'transform 300ms ease';
    element.style.transform = ''; // Animate back to natural position
  });
}
```

FLIP is what the View Transitions API does under the hood.

### `will-change` — Layer Promotion

`will-change` is a hint to the browser to promote an element to its own GPU compositor layer **before** the animation starts:

```css
.animated-element {
  will-change: transform; /* Browser creates GPU layer preemptively */
}
```

**Trade-offs of layer promotion:**
- ✅ `transform` and `opacity` changes now composite-only — smooth 60fps
- ✅ Layer is isolated — changes don't affect other elements' layout
- ❌ Each layer consumes GPU memory (compositor RAM)
- ❌ Excessive layers cause "layer explosion" — crashes on mobile
- ❌ Creating too many layers (via `will-change: transform` everywhere) is worse than not using it

**Rule of thumb:** Apply `will-change` only to elements you know will animate, and remove it after the animation ends.

### Measuring Reflow Cost in DevTools

Chrome DevTools Performance panel shows:
- **Purple "Layout" bars** = reflow happening. Width = cost. Stacked vertical bars = cascading reflow (parent triggered child relayout)
- **Green "Paint" bars** = repaint. Paint flashing overlay shows what was repainted.
- **Orange "Recalculate Style" bars** = CSS selector matching after DOM/style change
- **"Warning" triangles** on "Layout" = Forced Synchronous Layout detected

### CSS Containment — Limiting Reflow Scope

`contain: layout` tells the browser that changes inside an element cannot affect elements outside it:

```css
.independent-component {
  contain: layout; /* Layout changes inside are contained */
}

.completely-isolated {
  contain: strict; /* Layout + Style + Paint + Size all contained */
}
```

This is used extensively in component-based systems to prevent one component's reflow from cascading to the rest of the page.

---

## 3. Real-World Examples

### Google Maps — Avoiding Layout Thrashing
Google Maps constantly updates marker positions as the user pans. They use `transform: translate()` to reposition markers (composite only — no reflow) rather than updating `left`/`top` CSS properties (which would trigger layout for every marker on every pan frame).

### Facebook Feed — CSS Containment
Facebook's news feed items use `contain: content` on each feed card. This ensures a comment update inside one card doesn't cause the browser to re-check layout for the entire feed — critical with hundreds of cards in the virtual DOM.

### React — Batching DOM Mutations
React 18's automatic batching ensures all state updates within event handlers are flushed in a single render cycle, minimizing reflows. Before React 18, mixing sync state updates with async operations could cause multiple intermediate DOM mutations.

### CSS Animations at Instagram
Instagram's story progress bar animation uses `transform: scaleX()` not `width` changes. A `width` animation reflows every frame; `transform: scaleX()` composites every frame. Same visual effect, dramatically different performance on mid-range Android devices.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"Reflow recalculates geometry — positions and sizes — and can cascade through the entire layout tree. Repaint redraws pixels. Composite-only changes, like `transform` and `opacity`, happen entirely on the GPU compositor thread without touching main thread layout or paint.*

*The most dangerous pattern is layout thrashing — interleaving DOM writes and layout reads inside a loop. When you write a style and immediately read a geometry property like `offsetHeight`, the browser is forced to synchronously flush pending layout to give you an accurate answer. In a loop over 100 elements, this creates 100 forced synchronous layouts in a single frame, blowing any 16ms frame budget.*

*The fix is batching: separate all reads into one phase, all writes into another. Libraries like `fastdom` enforce this. React's reconciler is essentially a system that batches DOM mutations and applies them in one flush.*

*For animations, FLIP technique is important: measure old position, apply new position immediately, then use `transform` to visually stay at the old position, and animate the `transform` back to zero. This converts a layout-triggering animation into a composite-only animation.*"

### Likely Follow-up Questions

1. **"What's the difference between `display:none` and `visibility:hidden` from a reflow perspective?"**
   → `display:none` removes the element from flow — changes to it and its children don't cause reflows on siblings. `visibility:hidden` keeps the element in flow, so changes can still affect sibling layout.

2. **"Why is animating `width` bad but `transform: scaleX()` is fine?"**
   → `width` changes geometry → triggers reflow (on main thread) → paint → composite. `transform: scaleX()` is composite-only — the GPU moves an already-painted layer without involving the main thread.

3. **"What is `contain: layout` and when would you use it?"**
   → CSS Containment tells the browser that layout changes inside the element are isolated from outside. Use for independent widgets, feed cards, modals. Prevents one component's DOM mutation from causing a full-page reflow.

4. **"How do you detect layout thrashing in production?"**
   → Chrome DevTools Performance panel: look for "Forced reflow" warnings, stacked purple Layout bars, or consecutive Layout events. In code, use `PerformanceObserver` for long tasks.

---

## 5. Code Examples

### FastDOM — Enforced Batching Library

```javascript
// fastdom.js pattern — strictly separate reads from writes
import fastdom from 'fastdom';

function updateCards(cards) {
  cards.forEach(card => {
    // Queue read — fastdom batches all reads before writes
    fastdom.measure(() => {
      const height = card.offsetHeight; // Read
      
      // Queue write — only after ALL reads are done
      fastdom.mutate(() => {
        card.style.height = (height * 1.5) + 'px'; // Write
      });
    });
  });
}
```

### CSS Animation Performance Analysis

```css
/* ❌ Triggers reflow + repaint every frame */
@keyframes slideIn-bad {
  from { left: -100px; }
  to   { left: 0px; }
}

/* ✅ Composite only — smooth 60fps on any device */
@keyframes slideIn-good {
  from { transform: translateX(-100px); }
  to   { transform: translateX(0); }
}

/* ✅ Fade — composite only */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ❌ Height animation — triggers reflow every frame */
@keyframes expand-bad {
  from { height: 0; }
  to   { height: 200px; }
}

/* ✅ FLIP technique or max-height with very fast auto */
/* Or use View Transition API for height changes */
```

### Profiling Reflow with PerformanceObserver

```javascript
// Detect layout shift in real user sessions
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
      console.warn('Unexpected layout shift:', {
        score: entry.value,
        sources: entry.sources.map(s => ({
          node: s.node?.tagName,
          previousRect: s.previousRect,
          currentRect: s.currentRect,
        })),
      });
    }
  });
});

observer.observe({ type: 'layout-shift', buffered: true });
```

---

## 6. Why & How Summary

**Why it matters:**
Reflows and repaints directly cause dropped frames, jank, and poor INP scores. At scale with hundreds of DOM nodes, a single poorly-placed DOM read in a loop can force dozens of synchronous layout recalculations in one frame, turning a 5ms operation into a 200ms freeze. The patterns to avoid this — batching, FLIP, CSS Containment, `will-change`, composite-only animations — are the bread-and-butter of frontend performance engineering and expected knowledge at senior/staff level.

**How it works:**
The browser's rendering pipeline runs: Style Calculation → Layout (reflow) → Paint (repaint) → Composite. Layout recalculates element geometry based on the current DOM and styles — changes cascade from parent to children and can invalidate the entire layout tree. Paint redraws pixels into layer bitmaps. Composite merges GPU layers without main thread involvement. Forced synchronous layout is triggered when a JS layout property read follows a DOM write — the browser must flush the pending layout queue to return accurate values, which can happen hundreds of times per frame if interleaved in loops. Prevention: batch reads before writes, prefer composite-only CSS properties for animation, use CSS Containment to scope invalidation.
