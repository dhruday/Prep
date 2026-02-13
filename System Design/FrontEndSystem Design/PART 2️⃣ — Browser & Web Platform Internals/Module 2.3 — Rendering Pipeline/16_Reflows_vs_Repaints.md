# 16. Reflows vs Repaints

## 1. High-Level Explanation (Frontend Interview Level)

**Reflows vs Repaints** are two stages of browser rendering with vastly different performance costs—reflows recalculate layout geometry (expensive), while repaints redraw pixels without layout changes (cheaper).

- **Reflow** (Layout): Geometry changes (width, height, margin) → expensive recursive recalculation
- **Repaint** (Paint): Visual changes (color, background) → cheaper pixel redrawing
- **Composite-Only**: GPU-accelerated (transform, opacity) → cheapest, no layout/paint

**Key Principle**: "Minimize reflows (expensive), tolerate repaints (cheaper), prefer compositing (cheapest)."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Rendering Pipeline Stages

**Full Pipeline** (most expensive):
```
1. JavaScript (DOM change)
   ↓
2. Style Calculation (CSS recalc)
   ↓
3. Layout (Reflow) ← EXPENSIVE (geometry)
   ↓
4. Paint (Repaint) ← CHEAPER (pixels)
   ↓
5. Composite ← CHEAPEST (GPU layers)
```

**What Triggers Each Stage**:

| Change | Style | Layout | Paint | Composite | Cost |
|--------|-------|--------|-------|-----------|------|
| `width`, `height`, `margin` | ✅ | ✅ | ✅ | ✅ | 💰💰💰💰 Very Expensive |
| `color`, `background` | ✅ | ❌ | ✅ | ✅ | 💰💰💰 Expensive |
| `transform`, `opacity` | ✅ | ❌ | ❌ | ✅ | 💰 Cheap (GPU) |
| `visibility: hidden` | ✅ | ❌ | ✅ | ✅ | 💰💰💰 Expensive |
| `display: none` | ✅ | ✅ | ✅ | ✅ | 💰💰💰💰 Very Expensive |

---

### Reflow (Layout Recalculation)

**What is Reflow**:
```
Reflow = Recalculate geometry (position, size) for elements

Recursive:
<div>                    ← Parent width changes
  <div>                  ← Child must reflow (depends on parent)
    <span>Text</span>    ← Span must reflow (depends on parent)
  </div>
</div>

Cost: O(n) where n = affected elements
Expensive: 1000+ element tree = 1-10ms reflow
```

**Properties That Trigger Reflow**:

**Geometry Properties**:
- `width`, `height`
- `margin`, `padding`, `border`
- `top`, `left`, `right`, `bottom` (positioned elements)
- `font-size`, `font-family`, `font-weight`
- `line-height`, `text-align`, `vertical-align`
- `white-space`, `overflow`

**Display Properties**:
- `display` (especially `none` ↔ block)
- `position`
- `float`, `clear`

**Content Changes**:
- Adding/removing DOM nodes
- Changing text content (if affects size)

---

**Forced Synchronous Layout** (Layout Thrashing):

**Problem**: Reading layout properties forces immediate reflow.

```javascript
// ❌ BAD: Forces 100 reflows
for (let i = 0; i < 100; i++) {
  const div = divs[i];
  
  // Read: Forces layout
  const width = div.offsetWidth;
  
  // Write: Invalidates layout
  div.style.width = width + 10 + 'px';
  
  // Next iteration: Read forces layout again
}

// Result: 100 reflows (janky, 100-500ms)
```

**Timeline**:
```
Iteration 1:
  Read offsetWidth  → Forces Layout (1ms)
  Write width       → Invalidates Layout
  
Iteration 2:
  Read offsetWidth  → Forces Layout AGAIN (1ms)
  Write width       → Invalidates Layout
  
... × 100 = 100ms+ (janky)
```

**Solution: Batch Reads, Then Batch Writes**:
```javascript
// ✅ GOOD: 2 reflows total
// Read phase (batched)
const widths = [];
for (let i = 0; i < 100; i++) {
  widths[i] = divs[i].offsetWidth; // Forces layout ONCE
}

// Write phase (batched)
for (let i = 0; i < 100; i++) {
  divs[i].style.width = widths[i] + 10 + 'px';
}

// Result: 2 reflows (1 read, 1 write) = ~2ms (smooth)
```

---

**Properties That Force Synchronous Layout**:

Reading these properties forces immediate layout recalculation:

```javascript
// Geometry
element.offsetWidth, element.offsetHeight
element.offsetTop, element.offsetLeft
element.clientWidth, element.clientHeight
element.scrollWidth, element.scrollHeight
element.scrollTop, element.scrollLeft

// Computed styles
window.getComputedStyle(element)
element.getBoundingClientRect()

// Specific properties
element.scrollIntoView()
element.focus() // Sometimes
```

**Avoid in Loops**:
```javascript
// ❌ BAD
for (let el of elements) {
  const height = el.offsetHeight; // Forces layout each time
  doSomething(height);
}

// ✅ GOOD
const heights = elements.map(el => el.offsetHeight); // Force once
for (let i = 0; i < elements.length; i++) {
  doSomething(heights[i]);
}
```

---

### Repaint (Pixel Redrawing)

**What is Repaint**:
```
Repaint = Redraw pixels (no geometry change)

Example:
element.style.color = 'red';

Process:
1. Style recalculation (color changed)
2. No Layout (geometry unchanged)
3. Paint (redraw pixels with new color)
4. Composite (GPU combines layers)

Cost: Cheaper than reflow (no geometry recalc)
Still expensive: 1000+ elements = 0.5-5ms repaint
```

**Properties That Trigger Repaint (No Reflow)**:

**Visual Properties**:
- `color`
- `background`, `background-color`, `background-image`
- `border-color` (not `border-width`)
- `visibility` (vs `display: none` which triggers reflow)
- `outline`, `outline-color`
- `box-shadow` (if not changing size)
- `text-decoration`

**Example**:
```javascript
// Repaint only (no reflow)
element.style.color = 'blue';           // ✅ Repaint
element.style.backgroundColor = 'red';  // ✅ Repaint

// Reflow + Repaint
element.style.width = '200px';          // ❌ Reflow + Repaint
element.style.fontSize = '20px';        // ❌ Reflow + Repaint
```

---

### Composite-Only (GPU-Accelerated)

**What is Composite**:
```
Composite = GPU combines layers (no CPU layout/paint)

GPU-Accelerated Properties:
- transform (translate, scale, rotate)
- opacity
- filter (some, like blur)

Process:
1. Style recalculation
2. No Layout
3. No Paint (pixels already rasterized)
4. Composite ONLY (GPU moves/blends layers)

Cost: CHEAPEST (< 0.1ms, 60fps animations)
```

**Example**:
```css
/* ❌ BAD: Reflow + Repaint (janky animation) */
.box {
  position: absolute;
  left: 0;
  transition: left 0.3s;
}

.box:hover {
  left: 100px; /* Triggers layout every frame */
}

/* ✅ GOOD: Composite-only (smooth 60fps) */
.box {
  transform: translateX(0);
  transition: transform 0.3s;
}

.box:hover {
  transform: translateX(100px); /* GPU-accelerated */
}
```

**Layer Promotion**:
```css
/* Force layer creation (GPU-accelerated) */
.animated {
  will-change: transform; /* Hint to browser */
}

/* Or use 3D transform hack */
.animated {
  transform: translateZ(0); /* Forces layer */
}
```

---

### Minimizing Reflows/Repaints

**1. Batch DOM Changes**:

**❌ BAD** (multiple reflows):
```javascript
element.style.width = '100px';   // Reflow
element.style.height = '100px';  // Reflow
element.style.margin = '10px';   // Reflow
// = 3 reflows
```

**✅ GOOD** (single reflow with CSS class):
```javascript
element.className = 'resized'; // 1 reflow

// CSS
.resized {
  width: 100px;
  height: 100px;
  margin: 10px;
}
```

**✅ GOOD** (single reflow with cssText):
```javascript
element.style.cssText = `
  width: 100px;
  height: 100px;
  margin: 10px;
`;
// = 1 reflow
```

---

**2. Use DocumentFragment** (batch insertions):

**❌ BAD** (100 reflows):
```javascript
for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  container.appendChild(div); // Reflow each time
}
```

**✅ GOOD** (1 reflow):
```javascript
const fragment = document.createDocumentFragment();

for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  fragment.appendChild(div); // No reflow (not in DOM)
}

container.appendChild(fragment); // Single reflow
```

---

**3. Hide Element During Manipulation**:

**❌ BAD** (multiple reflows):
```javascript
element.style.width = '100px';   // Reflow
element.style.height = '200px';  // Reflow
element.style.fontSize = '14px'; // Reflow
```

**✅ GOOD** (2 reflows):
```javascript
element.style.display = 'none'; // Reflow (removes from layout)

// Multiple changes (no reflow, element not in layout)
element.style.width = '100px';
element.style.height = '200px';
element.style.fontSize = '14px';

element.style.display = 'block'; // Reflow (adds back)

// = 2 reflows instead of 4
```

---

**4. Cache Layout Properties**:

**❌ BAD** (reads in loop):
```javascript
for (let i = 0; i < 100; i++) {
  if (element.offsetWidth > 500) { // Forces layout × 100
    doSomething();
  }
}
```

**✅ GOOD** (cache outside loop):
```javascript
const width = element.offsetWidth; // Force layout ONCE

for (let i = 0; i < 100; i++) {
  if (width > 500) {
    doSomething();
  }
}
```

---

**5. Use CSS Classes Over Inline Styles**:

**❌ BAD** (multiple style recalcs):
```javascript
elements.forEach(el => {
  el.style.color = 'red';
  el.style.fontSize = '14px';
  el.style.fontWeight = 'bold';
});
```

**✅ GOOD** (single style recalc per element):
```javascript
elements.forEach(el => {
  el.classList.add('highlighted');
});

// CSS
.highlighted {
  color: red;
  font-size: 14px;
  font-weight: bold;
}
```

---

**6. Debounce Resize/Scroll Handlers**:

**❌ BAD** (layout on every scroll event):
```javascript
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY; // Frequent layout reads
  updateStickyHeader(scrollY);
});
```

**✅ GOOD** (throttle with requestAnimationFrame):
```javascript
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      updateStickyHeader(scrollY);
      ticking = false;
    });
    ticking = true;
  }
});

// Max 60 layout reads/sec (synced with render)
```

---

**7. Virtualization for Large Lists**:

**Problem**: Rendering 10,000 list items = expensive layout.

**Solution**: Render only visible items:
```javascript
function VirtualList({ items, itemHeight, visibleCount }) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = startIndex + visibleCount;
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div onScroll={(e) => setScrollTop(e.target.scrollTop)}>
      {/* Spacer for scroll height */}
      <div style={{ height: items.length * itemHeight }}>
        {/* Only render visible items */}
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map(item => <Item key={item.id} {...item} />)}
        </div>
      </div>
    </div>
  );
}

// Result: 10,000 items → render 20 visible (fast)
```

---

**8. CSS Containment**:

**Problem**: Layout changes propagate to parents/siblings.

**Solution**: Isolate layout with `contain`:
```css
.list-item {
  contain: layout style; /* Isolate layout + style */
}

/* Changes inside .list-item don't affect siblings/parents */
```

**Containment Types**:
- `contain: layout` — Layout isolated (width/height changes don't affect outside)
- `contain: style` — Style counters isolated
- `contain: paint` — Painting clipped to box (overflow hidden)
- `contain: size` — Size doesn't depend on children (fixed size)

**Example**:
```css
.email-item {
  contain: layout style paint;
  /* Expanding email doesn't reflow other emails */
}
```

---

### Performance Monitoring

**Chrome DevTools**:
```
1. Performance Tab
   └── Record page interaction
       └── Green bars: Paint
       └── Purple bars: Layout (reflow)

2. Rendering Tab
   └── Paint flashing (green = repaint)
   └── Layout shift regions (blue = reflow)

3. Layers Tab
   └── View compositing layers
   └── Layer promotion (will-change, transform)
```

**Performance API**:
```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long layout task:', entry.duration, 'ms');
    }
  }
});

observer.observe({ entryTypes: ['layout-shift', 'longtask'] });
```

---

## 3. Clear Real-World Examples

### Example 1: Facebook – Virtualized News Feed

**Challenge**: Render 1000+ posts without janky scrolling.

**Solution**: Virtual scrolling (render only visible):
```javascript
function NewsFeed({ posts }) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  const onScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const start = Math.floor(scrollTop / POST_HEIGHT);
    const end = start + VISIBLE_COUNT;
    setVisibleRange({ start, end });
  };
  
  const visiblePosts = posts.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div onScroll={onScroll}>
      {/* Spacer for scroll height */}
      <div style={{ height: posts.length * POST_HEIGHT }}>
        {visiblePosts.map(post => <Post key={post.id} {...post} />)}
      </div>
    </div>
  );
}

// Result: 1000 posts → render 10 visible → smooth 60fps
```

---

### Example 2: Gmail – CSS Containment

**Challenge**: Expanding email reflows entire list (slow).

**Solution**: CSS containment isolates layout:
```css
.email-item {
  contain: layout style paint;
  /* Layout changes inside email don't affect other emails */
}

/* Before: Expand email → reflow 100 items → 10ms
   After:  Expand email → reflow 1 item → 1ms */
```

**Result**: 10× faster email interactions (10ms → 1ms).

---

### Example 3: Twitter – Smooth Animations

**Challenge**: Animating tweet cards with `top` property (janky).

**Solution**: Use `transform` (composite-only):
```css
/* ❌ BEFORE (janky, 30fps) */
.tweet {
  position: absolute;
  top: 0;
  transition: top 0.3s;
}

.tweet.expanded {
  top: 100px; /* Triggers layout every frame */
}

/* ✅ AFTER (smooth, 60fps) */
.tweet {
  transform: translateY(0);
  transition: transform 0.3s;
}

.tweet.expanded {
  transform: translateY(100px); /* GPU-accelerated */
}
```

**Result**: Smooth 60fps animations (no layout, composite-only).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain reflows vs repaints."

**Answer**:

"**Reflows** and **repaints** are rendering stages with different costs:

---

### Rendering Pipeline

```
JavaScript → Style → Layout (Reflow) → Paint (Repaint) → Composite
```

**Cost**: Layout > Paint > Composite

---

### Reflow (Layout Recalculation)

**What**: Recalculate geometry (position, size).

**Triggers**:
- Geometry properties: `width`, `height`, `margin`, `padding`, `border`
- Display: `display`, `position`, `float`
- Font: `font-size`, `line-height`
- DOM changes: Add/remove nodes

**Cost**: **Expensive** (recursive, O(n) for n elements).

**Example**:
```javascript
element.style.width = '100px'; // Triggers reflow
```

**Forced Synchronous Layout** (layout thrashing):
```javascript
// ❌ BAD: 100 reflows
for (let i = 0; i < 100; i++) {
  const width = divs[i].offsetWidth; // Forces layout
  divs[i].style.width = width + 10 + 'px'; // Invalidates
}

// ✅ GOOD: 2 reflows (batch reads, then writes)
const widths = divs.map(d => d.offsetWidth); // 1 reflow
widths.forEach((w, i) => divs[i].style.width = w + 10 + 'px'); // 1 reflow
```

**Properties that force layout**:
- `offsetWidth/Height/Top/Left`
- `clientWidth/Height`
- `scrollWidth/Height`
- `getComputedStyle()`
- `getBoundingClientRect()`

**Avoid reading layout in loops.**

---

### Repaint (Pixel Redrawing)

**What**: Redraw pixels (no geometry change).

**Triggers**:
- Visual properties: `color`, `background`, `border-color`
- `visibility` (vs `display: none` which reflows)
- `box-shadow` (if not size change)

**Cost**: **Cheaper than reflow** (no geometry recalc).

**Example**:
```javascript
element.style.color = 'red'; // Repaint only
```

**Still expensive** for 1000+ elements (0.5-5ms).

---

### Composite-Only (GPU-Accelerated)

**What**: GPU combines layers (no layout/paint).

**Triggers**:
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (some, like blur)

**Cost**: **CHEAPEST** (<0.1ms, 60fps).

**Example**:
```css
/* ❌ Reflow (janky) */
.box {
  transition: left 0.3s;
  left: 0;
}
.box:hover { left: 100px; }

/* ✅ Composite-only (smooth) */
.box {
  transition: transform 0.3s;
  transform: translateX(0);
}
.box:hover { transform: translateX(100px); }
```

**Layer promotion**:
```css
.animated {
  will-change: transform; /* GPU layer */
}
```

---

### Minimizing Reflows/Repaints

**1. Batch DOM changes** (CSS class > inline styles):
```javascript
// ❌ 3 reflows
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';

// ✅ 1 reflow
element.className = 'resized';
```

**2. DocumentFragment** (batch insertions):
```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  fragment.appendChild(createElement('div'));
}
container.appendChild(fragment); // Single reflow
```

**3. Hide during manipulation**:
```javascript
element.style.display = 'none'; // Reflow
// Multiple changes (no reflow)
element.style.display = 'block'; // Reflow
// = 2 reflows instead of many
```

**4. Cache layout properties**:
```javascript
const width = element.offsetWidth; // Once
for (let i = 0; i < 100; i++) {
  if (width > 500) { /* ... */ }
}
```

**5. CSS classes** (faster than inline):
```javascript
// ❌ Per-element recalc
el.style.color = 'red';

// ✅ Optimized by browser
el.classList.add('highlighted');
```

**6. Debounce scroll/resize**:
```javascript
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateUI();
      ticking = false;
    });
    ticking = true;
  }
});
```

**7. Virtualization** (large lists):
```javascript
// Render only visible items (10 of 10,000)
const visible = items.slice(startIdx, endIdx);
```

**8. CSS Containment** (isolate layout):
```css
.list-item {
  contain: layout style; /* Changes don't affect siblings */
}
```

---

### Real-World Examples

**Facebook**: Virtual scrolling (1000 posts → render 10 visible → 60fps).

**Gmail**: CSS containment (expand email doesn't reflow list, 10ms → 1ms).

**Twitter**: `transform` animations (smooth 60fps vs janky `top` property).

---

### Trade-offs

**Reflow**:
- ❌ Most expensive (recursive geometry recalc)
- ✅ Necessary for size/position changes

**Repaint**:
- ✅ Cheaper than reflow (no geometry)
- ❌ Still expensive for many elements

**Composite**:
- ✅ Cheapest (GPU, <0.1ms)
- ❌ Only `transform`, `opacity` (limited properties)

**Follow-up I Expect**:

Q: 'How do you debug reflows?'
A: Chrome DevTools → Performance tab. Purple bars = layout (reflow), green = paint. Rendering tab → Paint flashing (green highlight on repaint), Layout shift regions (blue on reflow). PerformanceObserver for 'layout-shift' entries.

Q: 'What's the cost of reflow vs repaint?'
A: Reflow: 1-10ms for 1000 elements (recursive). Repaint: 0.5-5ms (no geometry). Composite: <0.1ms (GPU). Target <50ms total (responsive UI).

Q: 'When would you use will-change?'
A: Before animation starts (e.g., on hover intent), tells browser to promote to GPU layer. Remove after animation (will-change: auto). Don't overuse (memory cost per layer ~1-5MB)."

---

## 6. Why & How Summary

### Why It Matters

**Performance Impact**: Reflow (1-10ms per 1000 elements) vs Repaint (0.5-5ms) vs Composite (<0.1ms)  
**User Experience**: Smooth 60fps requires <16ms per frame—minimize expensive reflows  
**Layout Thrashing**: Reading layout in loops forces synchronous reflow (100× = 100ms jank)  
**Optimization Priority**: Prefer composite-only (transform/opacity) > repaint (color) > reflow (width/height)

### How It Works

**Reflow**: Geometry changes (width/height/margin/padding/border/fontSize/display/position) trigger recursive layout recalculation O(n) for n elements, expensive 1-10ms, avoid forced synchronous layout (offsetWidth/getComputedStyle in loops)  
**Repaint**: Visual changes (color/background/border-color/visibility/box-shadow) trigger pixel redrawing without geometry recalc, cheaper 0.5-5ms, still expensive for many elements  
**Composite**: GPU-accelerated (transform/opacity/filter) combines layers without layout/paint, cheapest <0.1ms, 60fps animations, layer promotion with will-change or translateZ(0)  
**Minimization**: Batch DOM changes (CSS class not inline), DocumentFragment for insertions, hide during manipulation, cache layout properties, CSS classes over inline styles, debounce scroll/resize with RAF, virtualization (render visible only), CSS containment (contain: layout style isolates changes)

**FAANG Expectation**: Explain three rendering stages (reflow/repaint/composite) with cost differences, properties triggering each stage, forced synchronous layout anti-pattern (read-write-read in loops), batching strategies (reads then writes), optimization techniques (CSS classes, DocumentFragment, virtualization, containment), transform vs top for animations (composite vs reflow), will-change for layer promotion, real-world examples (Facebook virtual scrolling, Gmail containment, Twitter transforms), profiling with Chrome DevTools (Performance tab purple/green bars, paint flashing, layout shift regions)
