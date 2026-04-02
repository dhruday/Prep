# 27. GPU vs CPU Rendering
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"CPU rendering is what the Main Thread (and Raster Threads) do when they convert layout boxes and paint records into pixel bitmaps — this is serial, slow, and competes with JavaScript. GPU rendering is when the GPU Process takes pre-rendered layer bitmaps (textures) and composites them together using hardware-accelerated transform math. The key distinction: GPU is massively parallel (thousands of shader cores all operating simultaneously) and is optimized for texture math and matrix transforms — exactly what browser compositing needs. CSS `transform` and `opacity` animations are GPU-composited: once the Compositor Thread hands off a layer texture to the GPU, applying `translateX(100px)` is a single matrix multiply on the GPU — thousands of times faster than moving pixels on the CPU. The practical performance rule: reduce JavaScript-driven style changes, promote animated elements to GPU compositor layers (`will-change: transform`), and avoid too many GPU layers (GPU memory limit per device is finite)."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### CPU Rendering Pipeline (Main Thread + Raster Threads)

```
CPU rendering covers: HTML Parsing → Style → Layout → Paint → Rasterization

Layout (CPU, Main Thread):
  Calculates box model geometry for every element
  Single-threaded — all computation on Main Thread
  Complex flex/grid → more expensive
  
Paint recording (CPU, Main Thread):
  Converts layout boxes to display lists / SkPicture commands
  "Fill rect at (0,0) 800×600 with #fff"
  "Draw border 2px solid #333"
  Paint recording is fast; actual pixel writing happens in Rasterization

Rasterization (CPU, Raster Threads):
  Converts paint records (display lists) to pixel bitmaps
  Can run on multiple threads (typically 4 Raster Threads per Renderer Process)
  Also runs on GPU if GPU rasterization is enabled
  
  CPU Rasterization: slower, runs on regular CPU cores
  GPU Rasterization (Chromium): uses GPU shader to rasterize — much faster
    Enabled for > 500 tiles on the screen (Chrome heuristic)
    
Bottleneck: Single Main Thread for Layout + Paint recording
  JS + Style + Layout + Paint all compete for the same thread
  → GPU rasterization doesn't help if Main Thread is jammed with JS
```

### GPU Rendering Pipeline (Compositor Thread + GPU Process)

```
GPU rendering covers: Compositing final layer textures on screen

Input: Rasterized layer textures (PNG-like bitmaps in GPU memory)
Work:  Apply transform matrices, alpha blending, clipping masks
Output: Final composited frame on screen

GPU architecture advantage:
  CPU: 4-16 cores, optimized for serial instruction execution
  GPU: 1000s of shader cores, optimized for parallel matrix math
  
  Compositing 50 layers at 1920×1080px:
    CPU: process each pixel serially → 50 × 1920 × 1080 = 103M pixels
         At 1 pixel/ns → ~103ms (way too slow for 60fps)
    GPU: process all pixels simultaneously → ~0.3ms for same operation
         GPU shader cores all compute transforms in parallel

Compositor Thread (inside Renderer Process):
  Maintains "cc::LayerTree" (compositor layer tree)
  For CSS transform/opacity changes: updates layer tree WITHOUT main thread
  Sends compositor frame to GPU Process via shared memory

GPU Process:
  Receives compositor frames
  Executes GL/Vulkan/Metal draw calls
  Hands frame buffer to OS display server
  Hardware VSync synchronization (60/90/120Hz)
```

### How Layers Work

```
Not every DOM element gets its own GPU layer.
Browser creates GPU layers for:
  
  "Promoted" composite layers (explicit):
    will-change: transform → always promoted
    will-change: opacity → always promoted
    transform: translateZ(0) → hack to promote (still used widely)
    transform: translate3d(0,0,0) → same hack
    
  "Promoted" by browser heuristics (implicit):
    position: fixed/sticky → own layer (doesn't scroll with page)
    video, canvas, iframe → own layers (separate content sources)
    Elements with CSS animation on transform/opacity
    Elements with CSS filter (blur, etc.) → own layer
    Elements that overlap other promoted layers (overlap testing)

  NON-promoted elements:
    Painted to a shared "root" layer bitmap
    No per-element GPU texture overhead
    BUT: Any paint change repaints the ENTIRE shared layer tile

Layer promotion cost-benefit:
  Benefit: transform/opacity changes are compositor-only (free Main Thread)
  Cost:    Each layer = GPU memory (bitmap at screen resolution)
           2× retina = 4× pixels → 4× GPU memory
           400×400px layer on 2× retina = 640KB VRAM
           100 such layers = 64MB VRAM — significant on mobile
```

---

### GPU Rasterization vs CPU Rasterization

```
Traditional CPU rasterization:
  Raster Threads (CPU) convert paint records to bitmaps
  Written to system RAM
  Uploaded to GPU memory as textures (texture upload is slow!)

GPU rasterization (OOP Raster):
  Chromium uses "OOP Raster" (Out-of-Process Rasterization)
  GPU Process rasterizes using GPU shader programs (GLES2)
  Result is directly in GPU memory — no upload step
  Faster for complex content (gradient backgrounds, border-radius at scale)
  Enabled in Chrome for most hardware-accelerated paths

WebGL / WebGPU:
  JavaScript-controlled GPU compute and rendering
  Bypasses the browser's compositor entirely
  Direct GPU programming via shader languages (GLSL, WGSL)
  Used by: Adobe Photoshop Web, Figma, Google Earth, games
```

---

### Understanding GPU Memory and Limits

```
GPU memory (VRAM) is separate from system RAM:
  Desktop discrete GPU: 4-16GB VRAM
  Mobile GPU (integrated): shared system RAM: 1-2GB allocated to GPU
  
  Budget per tab viewport: ~10-20MB practical limit on mobile
  (to avoid GPU memory pressure causing layer eviction)

Layer eviction:
  When GPU memory is low, browser evicts (removes) some layer textures
  Evicted layer must be re-rasterized when needed again
  → visible as "checkerboard" pattern during scroll or "flicker" on return
  
  Chrome logs: "Tile eviction count" → GPU memory pressure signal

Practical limit:
  Rule of thumb: promote to GPU layer only elements that:
    - Are animated (transform/opacity) AND
    - Are large enough to benefit from GPU compositing AND
    - Appear frequently (persistent UI elements)
    
  Don't blanket-apply will-change: transform to all elements!
  1000 elements × 400×400px × 4 bytes/px × 2× retina = 5.1GB VRAM (impossible)
```

---

### WebGL: Full GPU Pipeline Access

```
WebGL (OpenGL ES 2.0/3.0 for the web):
  Provides direct GPU shader programming
  Bypasses CSS compositor entirely
  Full control over vertex shaders, fragment shaders
  
  Performance ceiling: GPU-limited (not CPU browser rendering)
  Adobe Photoshop Web: WebGL-accelerated canvas
  Figma: WebGL-rendered components (not DOM-based)
  Google Maps: WebGL tiles at zoom/pan
  
WebGPU (2023+):
  Next-generation GPU API for the web
  Compute shaders (general GPU compute, not just rendering)
  Better performance than WebGL for compute workloads
  Used for: AI inference in browser, advanced graphics, physics simulations
  
  Example: TensorFlow.js WebGPU backend runs neural networks on GPU
           (used in face detection, hand tracking, language models in browser)
```

---

### Practical Decision Matrix

```
Rendering path selection:

Need smooth 60fps animation?
  → CSS transform/opacity + will-change: transform → GPU compositor only ✅

Need to animate non-composite properties (width, color)?
  → CSS transition (will trigger Paint on Main Thread, but composited afterward)
  → Prefer short duration (<300ms) to limit Main Thread impact ⚠️

Need complex real-time graphics (particles, simulation, image processing)?
  → Canvas 2D (CPU-rasterized, good for <10K items)
  → WebGL (GPU-accelerated, millions of items at 60fps)

Need GPU-accelerated computation (ML, physics)?
  → WebGPU (compute shaders)
  → TF.js with WebGPU backend

Scroll performance?
  → Avoid JS scroll handlers (run on Main Thread) for visual effects
  → Use CSS position:sticky, overscroll-behavior (GPU compositor)
  → Use passive event listeners for scroll: { passive: true }
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **Over-promoting with `will-change: transform` or `transform: translateZ(0)`:** Every promoted element consumes VRAM. A common Angular/React pattern is applying `will-change: transform` to every list item, tooltip, or modal. On a device with 2GB shared GPU memory and a complex page, this can cause layer eviction → compositing failures → jank worse than no promotion.

- **Canvas 2D with large pixel count on 2× retina display:** A 1920×1080 canvas on a 2× Retina display = 3840×2160 effective pixels. Canvas pixel operations (ImageData, drawImage at scale) are CPU-bound and 4× more work on Retina. Fix: use CSS scaling (CSS width/height ≠ canvas.width/height) and accept 1× canvas pixels (slight blur), or use WebGL for performance-critical canvases.

- **JavaScript-driven animations using `setInterval` instead of `requestAnimationFrame`:** `setInterval` is not VSync-aligned. It can fire mid-frame (causing partial repaints), be throttled in background tabs, or fire multiple times per frame if delayed. Always use `requestAnimationFrame` for animations.

- **CSS `filter: blur()` in animations:** `filter` creates a compositor layer (good) but rasterization of blur is GPU-expensive (shader compute). Animating `filter: blur(0) → blur(10px)` triggers re-rasterization on every frame (paint is not cached for filter changes) — defeating the purpose of GPU compositing.

- **WebGL context loss handling:** GPU processes can crash (driver bug, out-of-memory). WebGL contexts get "context lost" events. Without handling this, your canvas goes black permanently. Always listen for `webglcontextlost` and restore on `webglcontextrestored`.

---

## 🏭 3. Real-World Examples

**Adobe Photoshop Web — WebGL for GPU rendering:**

Adobe rebuilt Photoshop as a web app using WebAssembly for the C++ core and WebGL for canvas rendering. Traditional DOM-based rendering would be CPU-rasterized — too slow for a 100MP image. WebGL allows Adobe to run fragment shaders directly on the GPU — Gaussian blur on a 4000×3000 image takes ~3ms on GPU vs ~300ms on CPU. The GPU architecture parallizes the per-pixel computation that is inherently independent per pixel. Adobe's performance breakthrough was specifically using WebGL2 (shared GPU memory for textures) combined with tile-based rendering (only re-rasterizing changed tiles).

**SAP Fiori — will-change overhead on mobile:**

SAP Fiori UI5 applied `will-change: transform` to all interactive list items (50-200 per page). On a Samsung Galaxy A12 (integrated GPU, shared 4GB RAM with 512MB allocated to GPU), promoting 200 items each at ~300×64px × 3× PPI created 200 GPU textures × ~700KB average = ~140MB VRAM allocation — exceeding the GPU budget. The browser evicted tiles and promoted them on demand, causing visible flickering during scroll. Fix: Apply `will-change: transform` only in the hover/active state via CSS (`:hover { will-change: transform }`), promoting only 1-2 items at a time.

**Cisco WebEx — Hardware video compositing:**

WebEx web client uses the GPU Process for video tile compositing. Each participant's video feed is a separate `<video>` element → separate compositor layer. The GPU composites up to 25 layers for Gallery View. The Compositor Thread handles the layout (where each tile is positioned) and the GPU renders all 25 tiles in parallel at 30fps. This is only possible because of GPU parallelism — CPU compositing 25 1280×720 video tiles would consume the entire Main Thread budget.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "CPU rendering handles the main rendering pipeline: Layout, Paint, and Rasterization — all competing on the Main Thread or Raster Thread pool. GPU rendering is compositing: the GPU receives layer textures and composites them using massively parallel shader cores, which is thousands of times faster for transform and matrix operations than CPU.

> The practical distinction: CSS transform and opacity changes on promoted layers bypass the Main Thread entirely — Compositor Thread updates the layer tree, GPU Process applies the matrix, pixels change on screen at 60fps without touching JS or Layout. Properties like `top`, `width`, or `color` require Main Thread work (Layout or Paint) before compositing.

> The tradeoff: promoting elements to GPU layers costs VRAM. At SAP, applying `will-change: transform` globally to 200 list items on a low-end mobile device exhausted GPU memory and caused flickering. Fix: apply `will-change` only on `:hover` state, promoting at most 1-2 items at a time."

---

### Likely Follow-up Questions

1. **Why are all 1000s of GPU shader cores not faster for everything?** → GPUs are optimized for data-parallel workloads where the same operation is applied to thousands of data points (pixels, vertices). JavaScript execution is serial and branchy — GPUs can't accelerate it. GPU excels at pixel math; CPU excels at control flow and logic.

2. **What is a compositor layer (GPU layer) and how is one created?** → A compositor layer is a bitmap texture uploaded to GPU VRAM, managed by the Compositor Thread. Created when: element has `will-change: transform/opacity`, `transform: translateZ(0)`, `position: fixed/sticky`, `video`/`canvas`/`iframe` elements, CSS filters, or when the browser's heuristic overlap detector decides it's needed. Creating layers unnecessarily wastes VRAM.

3. **Why can animating `filter: blur()` be slow even though filter is GPU-composited?** → `filter: blur()` creates a compositor layer and runs on GPU, but changing the blur RADIUS requires re-rasterizing the element on every frame (the output pixels change). This is a paint invalidation per frame, which is expensive. In contrast, `transform` and `opacity` don't invalidate pixels — they just change the texture's transform/alpha, which is a single uniform change to the GPU shader program.

4. **What's the difference between WebGL and CSS compositing?** → CSS compositing uses the browser's built-in Compositor Thread (Chromium's `cc` library) and operates on pre-rendered DOM layer textures. WebGL is a direct programmable GPU API — you control every vertex and pixel shader yourself, bypassing the browser's compositor entirely. WebGL is used when you need custom rendering (particles, 3D, image processing) that CSS cannot express.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Checking if an element is on a compositor layer
// (Indirect — only Chrome DevTools "Layers" panel shows this directly)

function isLikelyPromotedToGPU(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);

  const willChange = style.willChange;
  const transform = style.transform;
  const filter = style.filter;
  const position = style.position;

  return (
    willChange.includes('transform') ||
    willChange.includes('opacity') ||
    (transform !== 'none' && transform !== '') || // any 3D transform promotes
    filter !== 'none' ||
    position === 'fixed' ||
    position === 'sticky'
  );
}

// DEMO 2: Applying GPU promotion only on hover (SAP fix pattern)
// CSS approach (not TypeScript) — most efficient:
// .list-item { /* no will-change */ }
// .list-item:hover { will-change: transform; }
// .list-item:active { transform: scale(0.98); } /* trigger for GPU */

// TypeScript equivalent for dynamic apply:
function applyGPUPromotionOnHover(items: NodeListOf<HTMLElement>): void {
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.willChange = 'transform';
    }, { passive: true });

    item.addEventListener('mouseleave', () => {
      // Remove will-change (releases GPU VRAM for this layer)
      item.style.willChange = 'auto';
    }, { passive: true });
  });
}

// DEMO 3: WebGL context loss handling (production safety)
function initWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) {
    console.warn('WebGL not supported — falling back to Canvas 2D');
    return null;
  }

  // Handle context loss (GPU driver crash, GPU memory pressure)
  canvas.addEventListener('webglcontextlost', (event: Event) => {
    event.preventDefault(); // Required to allow context restore
    console.warn('WebGL context lost — saving state');
    // Save your scene state here
  });

  canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored — reinitializing');
    // Reinitialize shaders, textures, buffers
  });

  return gl as WebGLRenderingContext;
}

// DEMO 4: Performance-aware canvas scaling for Retina displays
function createOptimalCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio, 2); // Cap at 2× to save GPU memory

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Physical pixels (what GPU renders)
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // CSS pixels (what layout sees)
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr); // Scale context so 1 CSS unit = 1 DPR-adjusted pixel

  return canvas;
}

// DEMO 5: requestAnimationFrame for GPU-synced animations
function animateWithGPU(element: HTMLElement): () => void {
  let rafId: number;
  let startTime: number | null = null;
  const DURATION = 1000; // ms

  function step(timestamp: number): void {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / DURATION, 1);

    // This runs on Compositor Thread via GPU:
    const eased = easeInOut(progress);
    element.style.transform = `translateX(${eased * 200}px)`;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    }
  }

  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId); // cleanup
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
```

---

## 🧠 6. Memory Aid

**Mental Model:**
CPU = a single brilliant professor who calculates every pixel manually. GPU = 3000 students all doing the same simple calculation simultaneously. Compositing is addition (pixel math) — the GPU students win overwhelmingly. JavaScript logic is like solving a unique problem each time — only the professor can do it.

**Rendering modes:**
1. **Full pipeline (CPU-heavy):** `top/width → Layout+Paint+Composite` — Professor does everything
2. **Paint only:** `color/background → Paint+Composite` — Professor paints, students composite
3. **Composite only:** `transform/opacity → Composite` — Students (GPU) do everything, professor is free

**GPU Layer cost:** Each GPU layer = "Student holds a photo in RAM (VRAM)." 100 students holding 100 large photos = out of memory. Only give students photos they actually need to work with.

**Mnemonic: TOM** — **T**ransform, **O**pacity = **M**assive GPU advantage (compositor only, no CPU paint).

**If you go blank:** *"GPU = parallel, fast texture compositing. CPU = serial, layout+paint. transform/opacity = GPU compositor thread only = free from Main Thread. Too many GPU layers = VRAM exhaustion = flickering. Use will-change: transform only on actively animated elements."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** The difference between CPU and GPU rendering at 60fps is the difference between a janky, stuttering animation and a buttery-smooth one. For Cisco's WebEx Gallery View of 25 video tiles, GPU compositing is not optional — CPU compositing of 25 simultaneous 720p video streams would consume >100% of any CPU's rendering budget.
→ **Performance:** GPU parallelism (thousands of shader cores) completes per-frame compositing in <1ms vs. hundreds of milliseconds on CPU. This allows complex layered UIs (Microsoft Teams, Adobe Fresco, Figma) to maintain 60fps even with dozens of simultaneous layers.
→ **Business:** On mobile devices (which have limited integrated GPU memory), over-aggressive GPU layer promotion is a well-known performance regression vector. Salesforce's mobile app reviews consistently cite layer management as a root cause of "white flash" bugs and slow scroll on mid-range Android devices.

**How it works (3 sentences):**
CPU rendering handles the serial layout, paint-recording, and rasterization work on the Main Thread and Raster Threads, producing per-layer pixel bitmaps that are then uploaded to GPU memory as textures; GPU rendering uses a massively parallel architecture with thousands of shader cores to composite those textures together, applying transform matrices and alpha blending to produce final frames in under 1ms. The browser's Compositor Thread (in the Renderer Process) manages layer trees and can update `transform` and `opacity` on compositor-layer elements without consulting the Main Thread at all — the GPU Process carries out the actual draw calls — enabling 60fps animations independent of JavaScript execution. Layer promotion via `will-change: transform` creates GPU-backered layers that allow free compositor-only updates but consumes VRAM proportional to pixel area × device pixel ratio, so over-promotion (e.g., applying `will-change` to every list item) can exhaust GPU memory on mobile devices and cause layer eviction, which paradoxically makes smooth animations jank worse than unpromoted elements.

**Company relevance:**
- **Microsoft:** Teams' video conferencing UI composites up to 9 video tiles in Gallery View using GPU compositor layers; each participant tile is a `<video>` element automatically promoted to a GPU layer. Layout changes (gallery resizing) trigger CPU layout, but frame-by-frame compositing is pure GPU.
- **Adobe:** Photoshop and Creative Cloud's canvas-based tools bypass DOM compositing entirely with WebGL/WebGPU — allowing GPU shader programs to run directly on image data. GPU rasterization via WebGL reduces Gaussian blur filter application time from ~300ms (CPU) to ~3ms.
- **Salesforce:** Salesforce's Mobile SDK documentation explicitly warns against over-using `will-change` on Android (integrated GPU memory constraints), recommending it only on visible animation targets and removing it via `will-change: auto` after animation completes.
- **Cisco:** WebEx's room systems use hardware GPU compositing for the shared-screen annotation overlay — a canvas overlay (separate compositor layer) drawn over the screen-share video layer. GPU handles both layers independently, allowing 60fps annotation even on large 4K displays.

---
✅ **Topic 27/486 complete.**
→ **Continuing to Topic 28: Compositing Layers & will-change**
