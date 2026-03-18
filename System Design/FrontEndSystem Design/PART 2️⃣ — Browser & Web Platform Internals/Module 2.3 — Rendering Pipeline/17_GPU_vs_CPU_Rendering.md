# 17. GPU vs CPU Rendering

---

## 1. High-Level Explanation (Frontend Interview Level)

The browser uses both the CPU (main thread) and the GPU to render web pages, and understanding when work shifts between them is key to diagnosing and fixing animation performance.

- **CPU Rendering (Main Thread):** Style calculation, layout, and paint — drawing commands are generated on the CPU and the pixels are drawn into layer bitmaps in system RAM
- **GPU Rendering (Compositor Thread):** Layer compositing, scroll, `transform` and `opacity` animations — GPU takes pre-painted bitmaps and combines them at display refresh rate

**The core principle:**
If you can move visual work to the compositor thread (GPU), it runs at 60fps regardless of main thread load. The GPU is massively parallel, purpose-built for bitmap operations, and its compositor thread runs independently of JavaScript execution.

**Why it matters in frontend design:**
- CSS animations using `transform` / `opacity` run on the GPU → always smooth
- CSS animations using `width` / `top` / `color` run on the CPU → affected by JS load
- Scroll performance is compositor-thread: smooth even during heavy JS
- Understanding layers is essential for debugging performance regressions

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Full Pipeline: CPU → GPU

```
Main Thread (CPU)
  ↓
1. Style Calculation (CSS matching)
  ↓
2. Layout (geometry — position, size)
  ↓
3. Update Layer Tree (which elements become GPU layers)
  ↓
4. Paint (generate Skia display list — draw commands, NOT pixels yet)
  ↓
Compositor Thread (separate thread, CPU-side)
  ↓
5. Commit (copy layer tree to compositor)
  ↓
Raster Threads (CPU thread pool)
  ↓
6. Rasterize (execute Skia commands → bitmap tiles in memory)
  ↓
GPU Process
  ↓
7. Draw (upload bitmaps to GPU, composite layers, send frame to display)
```

**Key insight:** The main thread generates draw COMMANDS (a display list), not actual pixels. Rasterization (converting commands to pixels) happens on raster threads (CPU), and GPU compositing happens last.

### Layer Model — When Elements Get Their Own GPU Layer

By default, all elements are drawn onto a small number of layers. The browser promotes certain elements to their own **compositor layer** (a separate GPU texture):

**Automatic layer promotion:**
- `<video>` and `<canvas>` elements
- Elements with CSS `will-change: transform` (or explicit `transform: translateZ(0)`)
- Elements with `position: fixed` or `position: sticky`
- Elements with `transform`, `opacity`, or `filter` CSS animations (timing function != step-end)
- Overlapping elements where the one underneath has a composited layer
- `<iframe>` elements

**What happens with a composited layer:**
1. The element is painted into its own separate bitmap (GPU texture)
2. The compositor combines all layer bitmaps on each frame
3. Changing `transform` or `opacity` on that element only requires updating composite parameters — no repaint, no layout

**Visualizing layers in Chrome DevTools:**
- DevTools → Rendering → Layer borders (shows layer boundaries as colored outlines)
- DevTools → Layers panel (3D visualization of all compositor layers)

### Why `transform` and `opacity` Don't Trigger Paint

When a composited element's `transform` or `opacity` changes, the compositor needs to:
1. Read the existing painted bitmap for that layer (already in GPU memory)
2. Apply the new transform matrix / opacity during composite
3. Send the composited frame to the display

**Steps 1 and 4 (Layout, Paint) are skipped entirely.** The existing bitmap is reused. This is why these properties can animate at display refresh rate even when the main thread is executing JavaScript.

**In contrast, changing `width` or `background-color`:**
1. Layout (if geometry changed)
2. Paint (redraw the element's pixels into the bitmap)
3. Upload new bitmap to GPU
4. Composite

Every frame pays this full cost on the main thread.

### Layer Explosion Anti-Pattern

`will-change: transform` promotes elements to their own GPU layer. But:

```css
/* 🚨 ANTI-PATTERN: will-change on everything */
* {
  will-change: transform; /* Hundreds of GPU layers — out of memory on mobile! */
}

/* 🚨 ANTI-PATTERN: on static elements */
.static-header {
  will-change: transform; /* Never animates. Wastes GPU memory for entire lifetime */
}

/* ✅ CORRECT: Only for elements that WILL animate, applied temporarily */
.menu-panel {
  /* will-change is NOT set by default */
}

.menu-panel.is-animating {
  will-change: transform; /* Set before animation starts */
}
/* Remove will-change class after animation ends to free the GPU layer */
```

**GPU memory budgets:** Mobile devices may have 256MB–1GB of GPU memory. Creating hundreds of layers can exhaust it, causing the browser to fall back to CPU-side compositing — worse than no layers at all.

### CSS `transform` vs Top/Left Positioning

```css
/* 🚨 Layout-triggering movement — triggers full layout + repaint per frame */
.box-bad {
  position: absolute;
  transition: left 300ms ease, top 300ms ease;
}
.box-bad:hover { left: 100px; top: 50px; }

/* ✅ Compositor-only movement — GPU layer, smooth 60fps */
.box-good {
  position: absolute;
  transition: transform 300ms ease;
}
.box-good:hover { transform: translate(100px, 50px); }
```

Both produce identical visual output. The `transform` version runs entirely on the compositor thread; the `left/top` version runs on the main thread and blocks animation smoothness when JS is executing.

### `contain: paint` and `content-visibility`

Modern CSS isolation properties help segment the rendering work:

```css
/* contain: paint — creates a new stacking context and paint layer */
.isolated-widget {
  contain: paint; /* Paints can't overflow. Creates implicit stacking context */
}

/* content-visibility: auto — browser skips paint + layout for off-screen elements */
.article-card {
  content-visibility: auto;   /* Skip rendering until in viewport */
  contain-intrinsic-size: 0 500px; /* Estimated size while not rendered (prevents scroll jumping) */
}
```

`content-visibility: auto` can reduce initial page render time by 50%+ on long pages by deferring off-screen content rendering.

### Identifying GPU Rendering Issues in DevTools

**Chrome DevTools — Rendering Panel:**
- **Paint Flashing** (green overlay): Shows what areas are being repainted on every frame. Large areas = expensive
- **Layer Borders** (orange = raster, blue = other): Shows compositor layer boundaries
- **FPS Meter**: Shows live frame rate and GPU memory usage
- **Scrolling Performance Issues**: Highlights elements accidentally on main thread scroll path

**Performance Panel:**
- Green bars = Paint / Rasterize
- Yellow bars = JavaScript
- Purple bars = Layout/Style
- Look for green bars in frames during scroll/animation — means non-composited content is repainted

---

## 3. Real-World Examples

### Gmail — Sidebar Animations
Gmail's sidebar slide animation uses `transform: translateX()` — compositor-only. Even if your inbox is loading thousands of threads (heavy JS), the sidebar slides in smoothly because it's on a GPU layer independent of the main thread.

### Google Maps — Tile Compositing
Google Maps is a classic compositor use case. Map tiles are pre-rendered on the server, loaded as images, each tile on its own GPU layer. Panning moves tiles using `transform: translate()` — pure compositor work. No layout, no repaint per pan frame.

### iOS Safari vs Android Chrome — GPU Memory
iOS devices have tighter GPU memory limits. Facebook and Instagram specifically monitor layer counts and remove `will-change` after animations complete to stay within iOS's layer budget, which is more restrictive than Android Chrome's.

### Netflix — Video Compositing
Netflix's video player overlays subtitles, progress bar, and UI controls as separate GPU layers over the video. The video layer composites at 60fps because it's entirely GPU compositor work. UI controls fading in/out use `opacity` transitions — compositor only.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"The browser uses both CPU and GPU for rendering. The CPU main thread handles style calculation, layout, and paint — generating draw commands into layer bitmaps. The GPU compositor thread handles the final composition — taking those pre-painted bitmaps and combining them at display refresh rate.*

*The key insight is that `transform` and `opacity` animations bypass the main thread entirely. When an element is on its own compositor layer, changing its transform or opacity requires only updating composite parameters — the existing bitmap is reused. No layout, no repaint. This is why CSS animations using these properties are smooth even with heavy JavaScript running.*

*`will-change: transform` promotes an element to its own GPU layer preemptively, avoiding the one-frame cost of layer promotion when animation starts. But it has a cost: GPU memory. On mobile devices with limited GPU RAM, promiscuous use of `will-change` can cause layer explosion, exhausting GPU memory and causing worse performance than not using it.*

*`content-visibility: auto` is a newer but powerful tool — it tells the browser to skip layout and paint for off-screen content. For a long article page with 50 sections, only the visible ones are rendered, cutting initial render time significantly while the browser estimates off-screen element heights for correct scroll behavior."*

### Likely Follow-up Questions

1. **"Why can some CSS animations cause 'compositor-layer jank'?"**
   → If a composited animation triggers a `paint` due to other styles changing simultaneously, it forces repaint even on a composited layer. Example: animating `transform` but with a `box-shadow` that also changes.

2. **"What does 'layer squashing' mean?"**
   → The browser merges multiple small overlapping layers into one GPU texture to reduce layer count. It's an optimization but can sometimes merge layers you wanted separate.

3. **"How would you debug a page that feels slow to scroll despite no long JS tasks?"**
   → Open DevTools Rendering → enable Scrolling Performance Issues. Look for non-composited scroll-blocking event listeners (`touchstart`, `wheel` without `passive: true`). Check for paint flashing on scroll — large repaint areas on scroll indicate non-composited content.

4. **"What is `passive: true` for event listeners?"**
   → `addEventListener('touchstart', fn, { passive: true })` tells the browser the handler will never call `preventDefault()` (which would block scroll). The browser can then start compositing scroll immediately without waiting for the JS handler to run. Critical for smooth touch scroll.

---

## 5. Code Examples

### Proper GPU Layer Management

```javascript
// Manage will-change lifecycle correctly
class AnimationManager {
  static prepare(element) {
    // Set before animation starts to pre-create GPU layer
    element.style.willChange = 'transform, opacity';
  }
  
  static cleanup(element) {
    // CRITICAL: Remove after animation to free GPU layer
    element.addEventListener('transitionend', () => {
      element.style.willChange = 'auto';
    }, { once: true });
  }
  
  static animate(element, toTransform, duration = 300) {
    this.prepare(element);
    
    requestAnimationFrame(() => {
      element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
      element.style.transform = toTransform;
      this.cleanup(element);
    });
  }
}

// Usage
AnimationManager.animate(menuPanel, 'translateX(0)', 300);
```

### `content-visibility` for Long Pages

```css
/* Apply to repeated, vertically-stacked sections */
.article-section {
  content-visibility: auto;
  
  /* containIntrinsicSize prevents scroll bar jumping
     as sections transition from "skipped" to "rendered" */
  contain-intrinsic-size: 0 600px; /* estimated height */
}

/* Ensure above-fold content is NEVER skipped */
.hero-section {
  content-visibility: visible; /* or just don't apply content-visibility */
}
```

### Passive Event Listeners for Scroll Performance

```javascript
// WITHOUT passive: browser waits for JS before compositing scroll
document.addEventListener('touchstart', (e) => {
  // e.preventDefault() could be here — browser doesn't know until JS runs
  handleTouch(e);
});

// WITH passive: browser immediately composites scroll, runs JS in parallel
document.addEventListener('touchstart', handleTouch, { passive: true });
document.addEventListener('wheel', handleWheel, { passive: true });

// For scroll-jacking (rare, intentional):
// Only use passive: false when you NEED to call preventDefault
document.addEventListener('wheel', (e) => {
  e.preventDefault(); // Scroll-jacks — only when intentional
  customScrollBehavior(e);
}, { passive: false });
```

---

## 6. Why & How Summary

**Why it matters:**
Knowing the boundary between CPU and GPU rendering is what separates engineers who fix "it feels laggy" complaints from those who only know to add `transition: all 0.3s` and hope for the best. Animation jank, scroll jitter, and unresponsive UI under load are all explainable through this model. The same visual effect implemented with `transform` vs `left/top` can be the difference between 60fps at full JS load vs 12fps. At FAANG scale with hundreds of millions of users on mid-range devices, this is not a micro-optimization — it's a core design requirement.

**How it works:**
The browser's rendering pipeline runs on multiple threads. The main thread (CPU) handles style, layout, paint — generating bitmap data. The compositor thread (also CPU, but separate) manages the layer tree. Raster threads (CPU thread pool) convert paint commands to pixels. The GPU process composites all layers and presents them to the display. CSS properties that trigger only compositing (`transform`, `opacity`) bypass the main thread entirely — the existing GPU layer bitmaps are reused and only their composite parameters are updated. Layer promotion (via `will-change` or composited animation triggers) moves an element to its own GPU texture, isolating its visual updates from the rest of the page.
