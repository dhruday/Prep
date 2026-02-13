# 10. Critical Rendering Path (CRP)

## 1. High-Level Explanation (Frontend Interview Level)

**Critical Rendering Path (CRP)** is the sequence of steps the browser executes to convert HTML, CSS, and JavaScript into pixels on screen—optimizing CRP is the foundation of fast page loads, directly impacting FCP, LCP, and TTI metrics.

- **What**: DOM → CSSOM → Render Tree → Layout → Paint → Composite = pixels
- **Why**: Every millisecond in CRP delays user seeing content (FCP) and interacting with page (TTI)
- **When**: Initial page load, navigation, dynamic content injection
- **Role**: Core performance optimization—reducing CRP = faster perceived performance

**Key Principle**: "Eliminate render-blocking resources" – CSS blocks rendering, synchronous JS blocks parsing.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The 6-Step Critical Rendering Path

```
1. HTML Parsing → DOM Tree
   ├── Bytes → Characters → Tokens → Nodes → DOM
   └── Incremental: Streams from network

2. CSS Parsing → CSSOM Tree
   ├── Bytes → Characters → Tokens → Nodes → CSSOM
   └── Blocking: Must complete before rendering

3. JavaScript Execution
   ├── Blocks HTML parsing (unless async/defer)
   └── Can modify DOM and CSSOM

4. Render Tree Construction
   ├── DOM + CSSOM → Render Tree
   └── Only visible elements (excludes display:none, <head>, <script>)

5. Layout (Reflow)
   ├── Calculate geometry (position, size)
   └── Recursive: Parent affects children

6. Paint
   ├── Convert layout to pixels
   └── Multiple layers

7. Composite
   ├── Combine layers (GPU-accelerated)
   └── Display on screen
```

---

### Step 1: HTML Parsing → DOM Construction

**Incremental Parsing**:
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Page</title>
    <link rel="stylesheet" href="style.css"> <!-- ⚠️ Blocks rendering -->
  </head>
  <body>
    <h1>Hello</h1>
    <script src="app.js"></script> <!-- ⚠️ Blocks parsing -->
    <p>World</p>
  </body>
</html>
```

**Parsing Timeline**:
```
0ms:   Start parsing HTML
10ms:  <html>, <head>, <title> parsed → DOM nodes created
15ms:  <link rel="stylesheet"> found
       → Pause rendering (not parsing)
       → Fetch style.css
100ms: style.css downloaded (85ms network latency)
       → Parse CSS → CSSOM
110ms: CSSOM complete, resume rendering
115ms: <h1> parsed, added to DOM
120ms: <script src="app.js"> found
       → Pause HTML parsing
       → Fetch app.js
250ms: app.js downloaded (130ms latency)
       → Execute JavaScript
270ms: JS execution complete, resume HTML parsing
275ms: <p> parsed, added to DOM
280ms: HTML parsing complete → DOMContentLoaded event
```

**Key Insight**: HTML parsing is **incremental** (streams from network), but **blocked** by:
- Synchronous `<script>` tags (pause parsing)
- CSS files (pause rendering, not parsing)

---

### Step 2: CSS Parsing → CSSOM Construction

**Why CSS Blocks Rendering**:
```css
/* style.css */
body { font-size: 16px; }
h1 { color: blue; }
p { color: red; }
```

```
Browser Logic:
1. Start building Render Tree
2. Need to know h1 color → Check CSSOM
3. CSSOM not ready? → Wait
4. Cannot render partial styles (flash of unstyled content)

Result: CSS is render-blocking
```

**CSSOM Structure**:
```
CSSOM Tree:
body
├── font-size: 16px
├── h1
│   ├── font-size: 16px (inherited)
│   └── color: blue (specific)
└── p
    ├── font-size: 16px (inherited)
    └── color: red (specific)
```

**Critical CSS**:
```html
<!-- ✅ GOOD: Inline critical CSS (above-the-fold) -->
<head>
  <style>
    /* Critical CSS (visible without scrolling) */
    body { margin: 0; font-family: sans-serif; }
    header { background: #000; color: #fff; padding: 20px; }
    h1 { font-size: 32px; margin: 0; }
  </style>
  
  <!-- Non-critical CSS (below-the-fold): Load asynchronously -->
  <link rel="preload" href="style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="style.css"></noscript>
</head>
```

---

### Step 3: JavaScript Execution

**Parser-Blocking JavaScript**:
```html
<html>
  <body>
    <h1 id="title">Hello</h1>
    
    <script>
      // Blocks HTML parsing
      document.getElementById('title').textContent = 'Hi';
    </script>
    
    <p>World</p> <!-- Not parsed yet, waiting for script -->
  </body>
</html>
```

**Timeline**:
```
0ms:   Parse <h1>, add to DOM
5ms:   Encounter <script>
       → Pause HTML parsing
       → Execute JavaScript (DOM API calls)
10ms:  JS execution complete
       → Resume HTML parsing
15ms:  Parse <p>, add to DOM
```

**Async vs Defer**:
```html
<!-- ❌ Default: Blocks parsing, executes immediately -->
<script src="app.js"></script>

<!-- ✅ async: Doesn't block parsing, executes when ready (unordered) -->
<script async src="analytics.js"></script>

<!-- ✅ defer: Doesn't block parsing, executes after HTML parsed (ordered) -->
<script defer src="app.js"></script>
```

**Execution Order**:
```html
<script defer src="a.js"></script>
<script defer src="b.js"></script>
<script async src="c.js"></script>

Execution Order:
1. c.js (async, executes when downloaded, could be first)
2. a.js (defer, executes after HTML parsing, in order)
3. b.js (defer, executes after a.js)
```

---

### Step 4: Render Tree Construction

**DOM + CSSOM = Render Tree**:
```
DOM Tree:
html
├── head
│   └── title ("Page")
└── body
    ├── h1 ("Hello")
    └── p ("World")

CSSOM Tree:
body
├── font-size: 16px
├── h1
│   └── color: blue
└── p
    └── display: none

Render Tree (only visible elements):
body
├── font-size: 16px
└── h1
    ├── font-size: 16px
    ├── color: blue
    └── content: "Hello"

(p excluded: display: none)
(head excluded: not rendered)
```

**Excluded from Render Tree**:
- `display: none` elements
- `<head>`, `<script>`, `<meta>` tags
- `visibility: hidden` **IS INCLUDED** (takes space, just invisible)

---

### Step 5: Layout (Reflow)

**Calculate Geometry**:
```html
<style>
  body { margin: 20px; }
  div { width: 50%; padding: 10px; }
  p { font-size: 16px; }
</style>

<body>
  <div>
    <p>Text</p>
  </div>
</body>
```

**Layout Calculation**:
```
Viewport: 1000px × 800px

body:
  x: 0, y: 0
  width: 1000px, height: 800px
  margin: 20px
  content-box: 960px × 760px (1000 - 20*2)

div:
  x: 20 (body margin), y: 20
  width: 50% of parent = 480px (960 * 0.5)
  padding: 10px
  content-box: 460px (480 - 10*2)

p:
  x: 30 (20 + 10), y: 30 (20 + 10)
  width: 460px (parent content-box)
  height: auto (calculated from font-size + content)
  font-size: 16px
  line-height: ~24px (default 1.5)
  height: 24px (single line)
```

**Layout is Recursive**:
- Parent width affects child width (%)
- Child height affects parent height (auto)
- Changing parent re-layouts all descendants

**Layout Cost**: O(n) where n = DOM nodes, but expensive for large trees (1000+ nodes).

---

### Step 6: Paint

**Convert Layout to Pixels**:
```
Paint Records (draw commands):
1. Fill background (white, 1000×800)
2. Fill div background (inherit, 480×content-height)
3. Draw text "Text" (font: 16px, color: black, x:30, y:30)
4. Draw border (if any)
5. Draw shadows (if any)
```

**Paint Order** (back to front):
1. Background color/image
2. Border
3. Children
4. Outline

**Paint Layers**:
```css
/* Creates new paint layer (GPU-accelerated) */
.accelerated {
  transform: translateZ(0); /* Or */
  will-change: transform;   /* Or */
  position: fixed;          /* Or */
  video, canvas, iframe     /* Automatically */
}
```

**Why Layers**: Separate layers can be painted independently and composited by GPU (faster animations).

---

### Step 7: Composite

**GPU-Accelerated Compositing**:
```
Compositor Thread (not Main Thread):
1. Receive paint layers
2. Rasterize (draw commands → pixels)
3. Composite layers (GPU)
4. Display on screen
```

**Transform/Opacity Animations**:
```css
/* ✅ GOOD: GPU-accelerated (no layout/paint) */
.box {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ BAD: Triggers layout + paint */
.box {
  left: 100px;  /* Triggers layout (reflow) */
  background: red; /* Triggers paint */
}
```

**Why**: `transform` and `opacity` only affect compositing (GPU), not layout/paint (Main Thread).

---

### Critical Rendering Path Metrics

**1. Critical Resources**: Number of resources that block rendering.
```html
<!-- 3 Critical Resources -->
<link rel="stylesheet" href="a.css">   <!-- 1: Render-blocking -->
<link rel="stylesheet" href="b.css">   <!-- 2: Render-blocking -->
<script src="app.js"></script>         <!-- 3: Parser-blocking -->
```

**2. Critical Bytes**: Total size of critical resources.
```
a.css: 50KB
b.css: 30KB
app.js: 100KB
Total: 180KB (must download before rendering)
```

**3. Critical Path Length**: Longest dependency chain (RTTs).
```
HTML (1 RTT)
├── a.css (1 RTT in parallel)
└── b.css (1 RTT in parallel)
└── app.js (1 RTT after HTML)

Critical Path Length: 2 RTTs
```

**Optimize CRP**:
- **Minimize Critical Resources**: Async/defer JS, async CSS, inline critical CSS
- **Minimize Critical Bytes**: Minify, compress (Gzip/Brotli), remove unused CSS
- **Minimize Critical Path Length**: Preconnect, preload, HTTP/2 multiplexing

---

### What NOT to Do

- ❌ **Blocking JS in `<head>`** (delays parsing)
- ❌ **Large CSS files** (delays rendering)
- ❌ **Synchronous `document.write()`** (blocks parsing)
- ❌ **JavaScript before CSS** (JS waits for CSSOM, delays execution)
- ❌ **Deep DOM nesting** (expensive layout)

---

## 3. Clear Real-World Examples

### Example 1: BBC – Critical CSS Inlining

**Problem**: External CSS (200KB) delayed FCP to 3s on 3G.

**Solution**: Inline critical CSS (above-the-fold):
```html
<head>
  <style>
    /* Critical CSS (5KB, above-the-fold) */
    header { background: #000; color: #fff; padding: 20px; }
    h1 { font-size: 32px; }
    .article-preview { ... }
  </style>
  
  <!-- Load full CSS asynchronously -->
  <link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'">
</head>
```

**Result**: FCP reduced from 3s to 1.2s (60% improvement).

---

### Example 2: Amazon – Script async/defer

**Problem**: Synchronous scripts in `<head>` delayed LCP by 2s.

**Before**:
```html
<head>
  <script src="analytics.js"></script>   <!-- Blocks parsing -->
  <script src="tracking.js"></script>    <!-- Blocks parsing -->
</head>
```

**After**:
```html
<head>
  <script async src="analytics.js"></script>   <!-- Doesn't block -->
  <script defer src="app.js"></script>          <!-- Doesn't block -->
</head>
```

**Result**: LCP improved from 3.5s to 1.5s (57% improvement).

---

### Example 3: Twitter – Preconnect

**Problem**: DNS lookup + TLS handshake for CDN delayed image loading by 400ms.

**Solution**: Preconnect to CDN:
```html
<head>
  <link rel="preconnect" href="https://cdn.twitter.com">
  <link rel="dns-prefetch" href="https://cdn.twitter.com">
</head>
```

**Result**: Image loading 400ms faster (DNS + TLS done during HTML parsing).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain the Critical Rendering Path and how to optimize it."

**Answer**:

"CRP is the **6-step pipeline** from HTML bytes to pixels:

**1. HTML Parsing → DOM**
- Incremental: Streams from network
- Blocked by synchronous `<script>` tags

**2. CSS Parsing → CSSOM**
- Render-blocking: Must complete before rendering
- Prevents flash of unstyled content (FOUC)

**3. JavaScript Execution**
- Parser-blocking (default)
- Can modify DOM and CSSOM
- async: Doesn't block parsing, executes when ready
- defer: Doesn't block parsing, executes after HTML

**4. Render Tree = DOM + CSSOM**
- Only visible elements (excludes `display: none`, `<head>`)
- `visibility: hidden` included (takes space)

**5. Layout (Reflow)**
- Calculate geometry (position, size)
- Recursive: Parent affects children
- Expensive: O(n) for n DOM nodes

**6. Paint**
- Convert layout to pixels
- Generate draw commands
- Multiple layers (GPU-accelerated)

**7. Composite**
- Combine layers (GPU)
- Display on screen

**CRP Metrics**:

1. **Critical Resources**: Count of render/parser-blocking resources
2. **Critical Bytes**: Total size of critical resources
3. **Critical Path Length**: Longest dependency chain (RTTs)

**Example**:
```html
<!-- 3 Critical Resources, 180KB, 2 RTTs -->
<link rel="stylesheet" href="a.css">  <!-- 50KB, 1 RTT -->
<link rel="stylesheet" href="b.css">  <!-- 30KB, 1 RTT parallel -->
<script src="app.js"></script>        <!-- 100KB, 1 RTT after HTML -->
```

**Optimization Strategies**:

**1. Minimize Critical Resources**:
```html
<!-- ❌ Before: 3 critical resources -->
<link rel="stylesheet" href="style.css">
<script src="app.js"></script>

<!-- ✅ After: 1 critical resource -->
<style>/* Critical CSS inlined */</style>
<script defer src="app.js"></script>
<link rel="preload" href="style.css" as="style" onload="this.rel='stylesheet'">
```

**2. Minimize Critical Bytes**:
- Minify CSS/JS (remove whitespace, shorten names)
- Compress (Gzip 70% reduction, Brotli 20% better)
- Remove unused CSS (PurgeCSS, UnCSS)

**3. Minimize Critical Path Length**:
```html
<!-- Preconnect to CDN (saves DNS + TLS) -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- HTTP/2: Multiplexing (parallel downloads, 1 connection) -->
```

**Real-World Examples**:

**BBC**: Inlined critical CSS (5KB above-the-fold). FCP improved 3s → 1.2s (60%).

**Amazon**: async/defer scripts. LCP improved 3.5s → 1.5s (57%).

**Twitter**: Preconnect to CDN. Image loading 400ms faster.

**Trade-offs**:

- **Inline CSS**: Faster FCP, but not cacheable (repeated on every page load)
- **async scripts**: Faster parsing, but execution order unpredictable
- **defer scripts**: Ordered execution, but delays interactive features

**Follow-up I Expect**:

Q: 'What's the difference between FCP and LCP?'
A: FCP = first pixel painted (any content). LCP = largest content element painted (main content, typically image/text). LCP more meaningful for UX.

Q: 'How would you measure CRP in production?'
A: Performance API: `navigationTiming` for TTFB, `paintTiming` for FCP, `largestContentfulPaint` for LCP. Lighthouse CI for synthetic monitoring."

---

## 6. Why & How Summary

### Why It Matters

**User Experience**: Every ms in CRP delays FCP (First Contentful Paint) and LCP (Largest Contentful Paint)  
**Business Impact**: 100ms delay = 1% revenue loss (Amazon data)  
**Core Web Vitals**: CRP optimization directly improves FCP (<1.8s), LCP (<2.5s), TTI (<3.8s)

### How It Works

**6-Step Pipeline**: HTML → DOM, CSS → CSSOM, JS Execution, Render Tree, Layout, Paint, Composite  
**Blocking Resources**: CSS blocks rendering, synchronous JS blocks parsing  
**Optimization**: Minimize critical resources (inline CSS, async JS), bytes (minify, compress), path length (preconnect, HTTP/2)

**FAANG Expectation**: Explain full pipeline (DOM → pixels), identify render-blocking resources, calculate CRP metrics (resources, bytes, RTTs), optimize with critical CSS, async/defer, preconnect, measure with Performance API + Lighthouse, understand trade-offs (inline vs cache, async vs defer)
