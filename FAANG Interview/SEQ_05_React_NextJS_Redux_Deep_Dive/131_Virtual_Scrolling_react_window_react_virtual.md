# 131. Virtual Scrolling — react-window, react-virtual
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Virtual scrolling (also called windowing) renders only the items visible in the viewport — plus a small overscan buffer — instead of rendering the entire list. For a list of 10,000 items where each item renders to a DOM node, the difference is rendering ~20 visible items vs 10,000 DOM nodes (each consuming memory, layout, and paint time). The two main React libraries are: **react-window** (lightweight, minimal API, good for fixed-height items) and **TanStack Virtual** (formerly react-virtual — framework-agnostic, supports variable heights, table virtualization, bi-directional scrolling). The rule: under ~300-500 items, render everything. Above that threshold, virtual scrolling prevents janky UX — especially on mobile — where a 10,000-item DOM tree causes 200ms+ of layout thrashing per scroll event.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Why Virtual Scrolling Works

```
Without virtualization (10,000 items):
  DOM nodes:          10,000 × ~8 nodes each = 80,000 DOM nodes
  Memory:             ~1.5-3GB
  Initial render:     400-1200ms
  Scroll event:       Layout recalc for 80,000 nodes  → janky at 5-10fps

With virtualization (10,000 items, 20 visible):
  DOM nodes:          (20 + overscan) × ~8 nodes each = ~200 DOM nodes
  Memory:             ~5MB
  Initial render:     5-15ms
  Scroll event:       Update ~5 items (recycle in/out of viewport) → smooth 60fps

Mechanism:
  1. Container div with CSS: overflow-y: auto, height: 500px (fixed viewport)
  2. Inner div: height = itemCount × itemHeight (creates correct scrollbar)
  3. On scroll: calculate which items are visible based on scrollTop
  4. Render ONLY those items, positioned absolutely at correct offsets
  5. Items outside viewport: not in DOM at all (or shifted out of viewport)
```

### react-window — FixedSizeList

```typescript
// npm install react-window @types/react-window
import { FixedSizeList, type ListChildComponentProps } from 'react-window';

type Item = { id: string; name: string; price: number };

// Row renderer: receives index, style (REQUIRED), and custom data
const ItemRow = ({ index, style, data }: ListChildComponentProps<Item[]>) => {
  const item = data[index];
  return (
    // ⚠️ CRITICAL: must spread style onto the outermost element
    // style sets position: absolute, top: N*itemHeight, left: 0, width: 100%
    <div style={style} className="item-row">
      <span>{item.name}</span>
      <span>${item.price}</span>
    </div>
  );
};

export function ItemList({ items }: { items: Item[] }) {
  return (
    <FixedSizeList
      height={600}          // ← height of the visible viewport
      itemCount={items.length}
      itemSize={60}         // ← height of each item in px (must be consistent)
      width="100%"
      itemData={items}      // ← passed as `data` to each row renderer
      overscanCount={5}     // ← render 5 extra items above/below viewport (default: 2)
    >
      {ItemRow}
    </FixedSizeList>
  );
}
```

### react-window — VariableSizeList

```typescript
import { VariableSizeList, type ListChildComponentProps } from 'react-window';
import { useCallback, useRef } from 'react';

// Variable heights: provide a function to return height per index
const ITEM_HEIGHTS = [80, 60, 120, 40, 60, 80, /* ... */];  // from API or measured

const VariableRow = ({ index, style, data }: ListChildComponentProps<Item[]>) => (
  <div style={style} className={`item-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
    {data[index].name}
  </div>
);

export function VariableList({ items }: { items: Item[] }) {
  const listRef = useRef<VariableSizeList>(null);

  const getItemSize = useCallback(
    (index: number) => ITEM_HEIGHTS[index] ?? 60,
    []
  );

  // If heights change (e.g., after expansion): reset cached sizes
  const handleItemChange = (index: number) => {
    listRef.current?.resetAfterIndex(index, false);
  };

  return (
    <VariableSizeList
      ref={listRef}
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
      itemData={items}
      estimatedItemSize={60}  // ← hint for initial scroll height estimation
    >
      {VariableRow}
    </VariableSizeList>
  );
}
```

### TanStack Virtual (react-virtual v3) — More Flexible

```typescript
// npm install @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function TanStackVirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,   // estimated item height (can be dynamic)
    overscan: 5,
  });

  return (
    // Scrollable container — you control the styles
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      {/* Inner content: height equals total content height (creates scrollbar) */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {/* Only virtual items: items that are currently in viewport + overscan */}
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Variable Heights with Dynamic Measurement

```typescript
// TanStack Virtual: measure actual rendered height for variable-height items
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function DynamicHeightList({ items }: { items: { id: string; description: string }[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,   // initial estimate
    // measureElement callback: called after item renders; TanStack measures actual height
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            // data-index: required for measureElement to work
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {/* Variable height content — paragraph, cards, etc. */}
            <div className="item-card">
              <h3>{items[virtualItem.index].id}</h3>
              <p>{items[virtualItem.index].description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Infinite Scroll + Virtual — Combining Both Patterns

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function InfiniteVirtualList() {
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch data in pages
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: ({ pageParam = 0 }) => fetchItems({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Flatten pages into single array
  const allItems = data?.pages.flatMap(page => page.items) ?? [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  // Trigger next page fetch when last item enters viewport
  useEffect(() => {
    const lastItem = [...virtualizer.getVirtualItems()].pop();
    if (!lastItem) return;

    if (
      lastItem.index >= allItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allItems.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => {
          const isLoaderRow = virtualItem.index > allItems.length - 1;
          const item = allItems[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {isLoaderRow
                ? <div>Loading more...</div>
                : <div>{item.name}</div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

declare function fetchItems(args: { cursor: number }): Promise<{ items: Item[]; nextCursor: number | null }>;
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product category page rendered 5,000 product cards at once — initial render was 1.8s, scrolling was 8-12fps. Switching to `react-window` `FixedSizeList` with `itemSize={120}` reduced initial render to 8ms and made scrolling smooth at 60fps. One non-obvious issue: the list's parent container needed `overflow: hidden` removed (it was preventing the virtual scroller from calculating scroll position correctly). Added memoization via `React.memo` on the row component and passed item data via `itemData` prop (vs. closure) to prevent re-renders when non-list state changed.

**At FAANG scale:**
- **Microsoft:** GitHub Issues list — TanStack Virtual with `measureElement` (variable height issues/PRs based on title length, labels, reactions); scroll from top to issue #50,000 in < 1s with 50ms TTI
- **Adobe:** Asset library grid (2D virtualization) — `react-window` `FixedSizeGrid` for 2D virtual grid; thumbnail images lazy-loaded as grid items enter viewport via `IntersectionObserver`
- **Salesforce:** Contact list (CRM) — TanStack Virtual with infinite scroll + React Query; as user scrolls near bottom, next page pre-fetches; old data retained in virtual list for instant back-scroll
- **Cisco:** Log viewer — virtual list for real-time log streams; up to 100,000 log entries; `react-window` with `FixedSizeList` enabling real-time tail mode (auto-scrolls to bottom as new logs arrive)

---

## 💬 4. Interview Execution

### Sample Answer

> "Virtual scrolling is a fundamental technique for large lists: instead of rendering all 10,000 items, you render only the ~20-30 visible in the viewport. The total content height is maintained via a spacer element so the scrollbar is accurate, and items are absolutely positioned at the correct offsets.
>
> For fixed-height items, `react-window` is the right choice — simple API, minimal overhead. The non-obvious requirement is that `style` prop from the render function MUST be applied to the outermost element — that's what positions each item correctly. For variable heights or more complex layouts like 2D grids, I use TanStack Virtual, which lets me measure the actual rendered height of each item via the `measureElement` callback.
>
> The threshold for virtual scrolling: I profile before adding it, but generally above 300-500 items the DOM pressure starts becoming measurable. Below that, just rendering everything is simpler and has no meaningful performance cost.
>
> Combined with infinite scroll, TanStack Virtual integrates well with React Query's `useInfiniteQuery` — you watch the last virtual item's index and trigger `fetchNextPage` when it enters the viewport."

---

## 💻 5. Code Example

```typescript
// react-window fixed list — complete, production-ready
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { memo } from 'react';

interface Product { id: string; name: string; price: number; inStock: boolean }

const ProductRow = memo(({ index, style, data }: ListChildComponentProps<Product[]>) => {
  const product = data[index];
  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', padding: '0 16px',
               borderBottom: '1px solid #eee' }}
    >
      <span style={{ flex: 1 }}>{product.name}</span>
      <span style={{ width: 80, textAlign: 'right' }}>${product.price.toFixed(2)}</span>
      <span style={{ width: 80, textAlign: 'right', color: product.inStock ? 'green' : 'red' }}>
        {product.inStock ? 'In Stock' : 'Out'}
      </span>
    </div>
  );
});

export function ProductVirtualList({ products }: { products: Product[] }) {
  if (products.length < 200) {
    // Don't over-engineer: render normally for small lists
    return (
      <div>
        {products.map(p => (
          <ProductRow
            key={p.id}
            index={products.indexOf(p)}
            style={{}}
            data={products}
            isScrolling={false}
          />
        ))}
      </div>
    );
  }

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={64}
      width="100%"
      itemData={products}
      overscanCount={5}
    >
      {ProductRow}
    </FixedSizeList>
  );
}
```

---

## 🧠 6. Memory Aid

**VOID — virtual scrolling core concepts:**
- **V**iewport rendering: only visible items are in the DOM
- **O**verall height preserved: spacer div maintains correct scrollbar
- **I**ndex + scrollTop → calculate which items are visible
- **D**OM nodes constant: ~20 items always, regardless of list size

**Library choice:**
- Fixed heights + simple: `react-window` FixedSizeList
- Variable heights / complex: `@tanstack/react-virtual` + measureElement
- 2D grid: `react-window` FixedSizeGrid

**Key gotchas:**
1. `style` prop MUST be on outermost element (react-window)
2. Parent container must have a fixed height + `overflow-y: auto`
3. `itemData` prop prevents passing closures to rows (enables memo)

**Mnemonic:** **VOID** — Viewport only, Overall height preserved, Index-based calculation, DOM stays small.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Large lists are a concrete, measurable performance scenario that comes up in every enterprise product (CRM contacts, product catalogs, analytics tables, log viewers) — describing the specific before/after (1.8s → 8ms initial render, 8fps → 60fps scrolling) with a library name shows you've solved it in production, not just read about it
→ The "when NOT to virtualize" answer (under 200-300 items) is a senior signal — premature optimization has a complexity cost; a senior engineer knows the threshold and profiles before applying the technique
→ Combining virtual scrolling with infinite scroll + RTK Query/React Query is an advanced pattern that many candidates can describe individually but not together — demonstrating the combined architecture (useInfiniteQuery + useVirtualizer + last item trigger) shows architectural synthesis

**How it works (2 sentences):**
Virtual scrolling works by listening to the container's `scroll` event, computing `scrollTop / itemSize` to find the first visible index and `(scrollTop + containerHeight) / itemSize` for the last visible index, then rendering only items within `[firstVisible - overscan, lastVisible + overscan]` — each item is positioned with `position: absolute; top: index * itemSize` so it appears at the correct location within a fixed-height inner container that has `height: itemCount * itemSize` (ensuring the scrollbar reflects the full list length).
For variable heights, TanStack Virtual maintains a measurement cache that stores the measured height of each rendered item (obtained via `ResizeObserver` on each element), computes prefix sums for the correct `top` offset of each item, and invalidates and recomputes the sums from the changed index whenever an item's height changes (via `virtualizer.measureElement`) — this makes `O(n)` offset computation avoidable in the common case (only changed items force recomputation) through the `resetAfterIndex` mechanism.

---
✅ Topic 131/486 complete → Continuing to Topic 132: Web Workers with React
