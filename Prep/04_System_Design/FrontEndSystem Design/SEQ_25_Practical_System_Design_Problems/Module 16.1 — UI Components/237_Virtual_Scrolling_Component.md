# 237 – Virtual Scrolling Component from Scratch

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Virtual Scrolling (or windowing) renders only the items currently visible in the viewport, plus a small buffer, instead of rendering all items to the DOM. For a list of 100,000 items, only ~20 DOM nodes exist at any time, keeping memory usage constant and scroll performance at 60fps. Building one from scratch tests understanding of **scroll position math**, **dynamic container heights**, **the spacer technique** (padding/margin to simulate full list height), **Intersection Observer vs onScroll**, and **handling variable-height items**. This is a classic senior frontend interview problem.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Core Concept

```
Full list height: totalItems × itemHeight = 100,000 × 50px = 5,000,000px

Viewport:              ┌────────────┐
                       │  Item 45   │  ← visible
                       │  Item 46   │  ← visible
                       │  Item 47   │  ← visible
                       │  Item 48   │  ← visible
                       │  Item 49   │  ← visible
                       └────────────┘
                       
DOM contains only: Items 43-51 (visible + 2 overscan)
Spacer div: height = 5,000,000px (or use paddingTop/paddingBottom)
```

### Architecture

```
┌───────────────────────────────────┐
│ VirtualList                       │
│  ┌─────────────────────────────┐  │
│  │ Outer Container              │  │  ← overflow: auto; height: fixed
│  │  ┌───────────────────────┐  │  │
│  │  │ Inner Container       │  │  │  ← height: totalHeight (creates scrollbar)
│  │  │                       │  │  │
│  │  │  [paddingTop: offset] │  │  │  ← space above visible items
│  │  │  ┌─────────────────┐  │  │  │
│  │  │  │ Visible Item 1  │  │  │  │
│  │  │  │ Visible Item 2  │  │  │  │
│  │  │  │ ...              │  │  │  │
│  │  │  └─────────────────┘  │  │  │
│  │  │  [paddingBottom]      │  │  │  ← space below visible items
│  │  └───────────────────────┘  │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

### Fixed Height Implementation (Simpler)

```typescript
function calculateVisibleRange(scrollTop: number, containerHeight: number, itemHeight: number, totalItems: number, overscan = 3) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + 2 * overscan);
  return { startIndex, endIndex };
}
```

Math:
- `startIndex = Math.floor(scrollTop / itemHeight)` — which item is at the top
- `endIndex = startIndex + visibleCount` — which item is at the bottom  
- Overscan: render extra items above/below to prevent flashing during fast scroll

### Variable Height Implementation (Complex)

For items with unknown/variable heights, you need:
1. **Estimated heights**: Start with an estimate, measure after render
2. **Position cache**: `Map<index, { offset: number, height: number }>`
3. **Binary search**: Find the start index using binary search on cumulative offsets
4. **ResizeObserver**: Detect when items change height after render

```typescript
// Binary search for variable-height items
function findStartIndex(positions: { offset: number }[], scrollTop: number): number {
  let low = 0, high = positions.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (positions[mid].offset <= scrollTop) low = mid + 1;
    else high = mid - 1;
  }
  return Math.max(0, low - 1);
}
```

### Performance Optimization

- **Use `requestAnimationFrame`** for scroll handler — ensures we calculate at most once per frame
- **`will-change: transform`** on the inner container — promotes to compositor layer
- **`transform: translateY(offset)`** instead of `paddingTop` — avoids triggering layout
- **Scroll anchoring**: `overflow-anchor: auto` for browser-managed scroll position stability
- **Object pooling**: Recycle DOM nodes instead of creating/destroying (advanced)

### Accessibility

- The container should have `role="list"` or `role="listbox"`
- Visible items have `role="listitem"` or `role="option"` with proper index
- `aria-setsize` (total items) and `aria-posinset` (current index) on each item — tells screen readers the full list size
- Keyboard: Arrow keys scroll one item at a time, Page Up/Down scrolls one page
- `aria-label` on container: "List of 100,000 items, showing items 45 through 55"

### Anti-Patterns

- ❌ Creating/destroying React components — use `key` prop with item ID, not index
- ❌ No overscan — items flash in/out at scroll boundaries
- ❌ Using `margin`/`padding-top` for offset — triggers layout; use `transform: translateY`
- ❌ Synchronous layout reads in scroll handler — causes forced reflow; batch with rAF
- ❌ No `aria-setsize`/`aria-posinset` — screen readers think the list has only visible items

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Twitter/Meta Feed
Both use windowed rendering for their feeds. Twitter's timeline virtualizes tweets, measuring each tweet's height after render and caching it. Scrolling back up uses cached heights for instant positioning.

### Libraries: react-window, react-virtual, react-virtuoso
- `react-window`: Brian Vaughn (React team), 6KB, fixed and variable height
- `react-virtuoso`: Auto-measures items, supports grouped lists, 12KB
- `@tanstack/react-virtual`: Headless, framework-agnostic, 3KB

### Hruday @ SAP Labs
SAP UI5's `sap.m.List` with `growing="true"` uses virtual scrolling internally when rendering thousands of OData entities. The same offset-based calculation applies — understanding the math is transferable.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd build a virtual list with two containers: an outer container with `overflow: auto` (creates the scrollbar) and an inner container whose height equals `totalItems × itemHeight` (creates the full scroll extent).*

*On scroll, I calculate the visible range: `startIndex = Math.floor(scrollTop / itemHeight)`, with 3 items of overscan above and below. Only those items are rendered, positioned with `transform: translateY(startIndex × itemHeight)` on a wrapper div.*

*For variable-height items, I use estimated heights initially, measure actual heights via ResizeObserver after render, cache them in a position map, and binary-search for the start index based on cumulative offsets.*

*Performance: scroll handler wrapped in rAF to batch calculations. `will-change: transform` on the inner container. Overscan of 3-5 items prevents flashing.*

*Accessibility: `aria-setsize={totalItems}` and `aria-posinset={index}` on each visible item so screen readers know the full list size even though only 20 DOM nodes exist."*

### Follow-ups

1. **"How do you handle scroll to a specific item?"** — Calculate `offset = items.slice(0, targetIndex).reduce((sum, h) => sum + h, 0)` and `container.scrollTop = offset`.
2. **"What about reverse scrolling (chat)?"** — Start scrolled to bottom. Prepend new items at top. Use scroll anchoring to maintain position.
3. **"Horizontal virtualization?"** — Same math on X axis. `scrollLeft` instead of `scrollTop`, `translateX` instead of `translateY`.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Virtual List from Scratch — Fixed Height
function VirtualList<T>({ items, itemHeight, containerHeight, renderItem }: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const overscan = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback(() => {
    if (outerRef.current) {
      requestAnimationFrame(() => {
        setScrollTop(outerRef.current!.scrollTop);
      });
    }
  }, []);

  return (
    <div
      ref={outerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto' }}
      role="list"
      aria-label={`List of ${items.length} items`}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}
                 role="listitem"
                 aria-setsize={items.length}
                 aria-posinset={startIndex + i + 1}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Virtual List = Outer (overflow:auto) + Inner (totalHeight) + translateY(offset)."** Calculate: `startIndex = Math.floor(scrollTop / itemHeight) - overscan`. Render only visible + overscan items. Position with `transform: translateY`. Variable height: estimate → measure → cache → binary search. Accessibility: `aria-setsize` + `aria-posinset` on each item. Performance: rAF scroll handler, `will-change: transform`, no layout thrashing.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Virtual scrolling is THE performance technique for large lists. Every target company has list-heavy UIs — feeds, tables, logs. Building one from scratch proves deep understanding of DOM performance.
**How:** Two nested containers (outer for scroll, inner for total height). Calculate visible range from scrollTop. Render only visible items with offset via translateY. Overscan prevents flashing. variable-height needs measurement + caching.
**Companies:** Microsoft (Teams messages, Outlook inbox), Adobe (asset grids), Salesforce (record lists — thousands of records), Cisco (log viewers, device lists).
