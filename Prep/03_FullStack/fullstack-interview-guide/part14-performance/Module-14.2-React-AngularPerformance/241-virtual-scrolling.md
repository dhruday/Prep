# Virtual Scrolling for Large Lists
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Virtual scrolling** renders only the items currently visible in the viewport (plus a small buffer above and below); as the user scrolls, items leaving the viewport are removed from the DOM and items entering are added; DOM node count stays constant (e.g., 30 nodes) regardless of whether the total list has 1,000 or 100,000 items
- **Angular CDK**: `@angular/cdk/scrolling` — `<cdk-virtual-scroll-viewport [itemSize]="60">` with `*cdkVirtualFor` as a drop-in replacement for `*ngFor`; `itemSize` is the height in pixels (required for fixed-height rows); supports `minBufferPx` and `maxBufferPx` for tuning the render buffer
- **React (TanStack Virtual v3)**: `useVirtualizer({ count, getScrollElement, estimateSize })` from `@tanstack/react-virtual`; gives you a `virtualItems` array to iterate over; each item has `index`, `size`, and `start` (offset from top); supports variable item heights via `measureElement` callback
- **When NOT to use**: fewer than 100-200 items (virtual scroll overhead isn't worth it); when items need to be fully tab-navigable or indexed by assistive technology in a way that requires all DOM nodes present; when items have highly complex and variable heights that the estimator struggles with (can cause scroll jitter)
- **CSS requirement**: the container must have a fixed height; items in a virtual scroll list flow inside a "spacer" element that provides the full scrollable height to the browser; the container cannot be `height: auto`
- ✅ **Hruday's anchor**: Bosch machine event log — audit trail with 10,000+ events per machine; rendering all 10,000 DOM nodes caused tab switching to freeze for 2+ seconds; Angular CDK virtual scroll reduced DOM nodes from 10,000+ to ~30 visible at any time; tab switching dropped to < 100ms; 60fps scroll performance on factory floor hardware

---

## 1. One-Line Definition
Virtual scrolling is a technique where only the items visible in the scrollable viewport are present in the DOM at any given time — the virtualization layer tracks scroll position, maintains a spacer element to give the browser the correct total scroll height, and swaps DOM nodes in and out as the user scrolls.

---

## 2. The Problem It Solves

Rendering 10,000 list items in the DOM has two problems:

**Initial render cost**: creating 10,000 DOM nodes takes time. Each DOM node requires memory allocation, layout calculation, and paint. For a list of 10,000 rows × 60px height: the browser must allocate DOM nodes for content that occupies 600,000px of height — most of which the user will never see.

**Ongoing performance cost**: every DOM node in the browser's document consumes memory and participates in layout calculations. With 10,000 rows, any operation that triggers reflow (window resize, adding a sibling above the list, font change) requires the browser to recalculate layout for all 10,000 items. JavaScript event delegation still processes all rendered nodes. CSS animations in or near the list affect all nodes.

The concrete impact: at Bosch, the machine event log page had tabs switching between machines. Each machine had 5,000-10,000 diagnostic events rendered as a full list. Switching to a different machine meant the browser destroyed 10,000 DOM nodes and created 10,000 new ones. This took 2-3 seconds. Users though the app had frozen.

Virtual scrolling solves this by keeping only ~30 DOM nodes alive at any time (the visible rows plus a small buffer). The browser renders 30 nodes on initial render. Scroll performance is 60fps because only 30 nodes need layout consideration. Switching focuses is instant because you're only ever creating 30 nodes.

The total scroll height is preserved by a "spacer" element — a single `<div>` with `height: 600000px` (for the 10,000 × 60px example) that tells the browser the scroll container is that tall. The browser shows the correct scrollbar position without actually backing it with 10,000 DOM nodes.

---

## 3. How It Works Internally

### The Virtual Scroll Mechanics

```
User viewport (height: 500px, showing items 10-18):

  ┌─────────────────────────────────────┐
  │ Spacer: height = total list height  │  ← 10,000 items × 60px = 600,000px
  │ (invisible, just provides scroll    │    Browser shows correct scrollbar
  │  track height to the browser)       │
  │                                     │
  │ ├ Items 0-9: NOT in DOM ─────────── │  ← Below viewport, above current position
  │ │                                   │    Represented only by spacer height
  │ │                          ─────────│────── Viewport top (scroll offset: 600px)
  │ ├ Item 10  [in DOM] ────────────────│  ← RENDERED ✅
  │ ├ Item 11  [in DOM] ────────────────│  ← RENDERED ✅
  │ ├ ...                               │
  │ ├ Item 18  [in DOM] ────────────────│  ← RENDERED ✅ (last visible)
  │ │                          ─────────│────── Viewport bottom (offset: 1100px)
  │ │                                   │
  │ ├ Item 19  [in DOM - buffer] ───────│  ← Buffer items rendered below viewport
  │ ├ Item 20  [in DOM - buffer] ───────│    (loaded ahead to prevent blank flash on scroll)
  │                                     │
  │ ├ Items 21-9999: NOT in DOM ────────│  ← 9,979 items not in DOM
  └─────────────────────────────────────┘

Total DOM nodes: ~20-30 (visible + buffer)
Total conceptual items: 10,000
Scroll height: correct (600,000px spacer)
```

### Scroll Event Handling

```
User scrolls down 60px (one item height):
       │
       ▼
Scroll event fires → virtualizer/viewport reads scrollTop
       │
       ▼
Calculates new visible range:
  currentScrollTop = 660px
  visibleItems = floor(660/60) through ceil((660+500)/60) = Items 11-19
       │
       ▼
DOM diff:
  Item 10 is now above viewport → remove its DOM node (or reuse for new item)
  Item 19 was buffer, now visible → already in DOM ✅
  Item 20 needs to enter buffer → create/reuse DOM node
       │
       ▼
Reposition items:
  Each item positioned with CSS transform: translateY(itemIndex × itemHeight)
  translateY is a GPU-accelerated CSS transform — no layout reflow triggered
  → 60fps scroll performance
```

---

## 4. The Code

### Wrong Way — All Items in DOM

```typescript
// ❌ WRONG — Rendering all 10,000 items in the DOM

@Component({
  template: `
    <!-- ❌ *ngFor with 10,000+ items: all rendered in DOM -->
    <!-- Initial render: 2-3 seconds of browser layout + paint -->
    <!-- Tab switch: destroy 10,000 DOM nodes + create 10,000 new ones -->
    <!-- Memory: ~100MB just for DOM nodes on a 10,000 item list -->
    <div class="event-log-container">
      <div *ngFor="let event of events" class="event-row">
        <span>{{ event.timestamp | date:'HH:mm:ss.SSS' }}</span>
        <span [class]="'severity-' + event.severity">{{ event.message }}</span>
        <span>{{ event.machineId }}</span>
      </div>
    </div>
  `
})
export class MachineEventLogComponent {
  @Input() events: MachineEvent[] = [];  // 5,000-10,000 events
}
```

```tsx
// ❌ WRONG — React with all items in DOM

const EventLog: React.FC<{ events: MachineEvent[] }> = ({ events }) => {
  return (
    // ❌ All 10,000 items rendered: sluggish initial load, sluggish filtering
    <ul style={{ overflowY: 'auto', height: '500px' }}>
      {events.map(event => (
        // ❌ Even with React.memo, 10,000 DOM nodes participate in layout
        <li key={event.id}>
          <time>{new Date(event.timestamp).toTimeString()}</time>
          <span>{event.message}</span>
        </li>
      ))}
    </ul>
  );
};
```

### Right Way — Angular CDK Virtual Scroll

```typescript
// ✅ RIGHT — Angular CDK Virtual Scroll

// app.module.ts or standalone component imports:
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [ScrollingModule, DatePipe, NgClass],
  template: `
    <!-- ✅ cdk-virtual-scroll-viewport: manages the virtual scroll container -->
    <!-- itemSize: height of each item in pixels (required for fixed-height items) -->
    <!-- Must have a fixed height (not 'height: auto') -->
    <cdk-virtual-scroll-viewport
      [itemSize]="itemHeight"
      [minBufferPx]="itemHeight * 5"
      [maxBufferPx]="itemHeight * 10"
      class="event-log-viewport"
    >
      <!-- ✅ *cdkVirtualFor: drop-in replacement for *ngFor -->
      <!-- Only the visible items (+ buffer) are in the DOM at any time -->
      <div
        *cdkVirtualFor="let event of events; trackBy: trackById"
        class="event-row"
        [ngClass]="'severity-' + event.severity"
      >
        <span class="timestamp">{{ event.timestamp | date:'HH:mm:ss.SSS' }}</span>
        <span class="message">{{ event.message }}</span>
        <span class="machine">{{ event.machineId }}</span>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    /* ✅ Fixed height required: virtual scroll needs a bounded container */
    .event-log-viewport {
      height: 500px;        /* Fixed height — REQUIRED for virtual scroll */
      overflow-y: auto;
    }
    /* ✅ Fixed item height must match [itemSize] input */
    .event-row {
      height: 48px;         /* Matches itemSize="48" */
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      box-sizing: border-box;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLogComponent {
  @Input() events: MachineEvent[] = [];
  
  readonly itemHeight = 48;   // Must match CSS height
  
  trackById = (index: number, event: MachineEvent) => event.id;
}
```

```typescript
// ✅ RIGHT — Angular CDK Virtual Scroll with variable-height items

// For items with variable heights, use AutoSizeVirtualScrollStrategy
import { 
  ScrollingModule, 
  CdkVirtualScrollViewport 
} from '@angular/cdk/scrolling';

@Component({
  standalone: true,
  imports: [ScrollingModule, NgFor],
  template: `
    <!-- ✅ autosize: CDK measures each item's actual height dynamically -->
    <!-- Slower than fixed itemSize but handles variable heights -->
    <cdk-virtual-scroll-viewport
      autosize
      class="messages-viewport"
    >
      <div *cdkVirtualFor="let message of messages; trackBy: trackById"
           class="message-item">
        <!-- ✅ Variable content: short or long message, image or text only -->
        <strong>{{ message.author }}</strong>
        <p>{{ message.content }}</p>
        <img *ngIf="message.imageUrl" [src]="message.imageUrl" alt="attachment" loading="lazy" />
      </div>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .messages-viewport {
      height: 600px;
    }
    /* ✅ No fixed height on items when using autosize */
    .message-item {
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      /* min-height helps CDK estimate before measurement */
      min-height: 60px;
    }
  `],
})
export class ChatMessagesComponent {
  @Input() messages: ChatMessage[] = [];
  trackById = (i: number, m: ChatMessage) => m.id;
}
```

### Right Way — React with TanStack Virtual

```tsx
// ✅ RIGHT — React virtual scrolling with @tanstack/react-virtual

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface EventLogProps {
  events: MachineEvent[];
}

const EventLog: React.FC<EventLogProps> = ({ events }) => {
  // ✅ Ref to the scrollable container DOM element
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ useVirtualizer: core hook
  const virtualizer = useVirtualizer({
    count: events.length,                    // Total number of items
    getScrollElement: () => containerRef.current,  // The scrollable container
    estimateSize: () => 48,                  // Estimated item height in px (fixed items)
    overscan: 5,                             // Render 5 extra items above and below viewport
    // ✅ For variable heights: measureElement callback
    // measureElement: (element) => element.getBoundingClientRect().height,
  });

  return (
    // ✅ Scrollable container with fixed height
    <div
      ref={containerRef}
      style={{
        height: '500px',
        overflowY: 'auto',
      }}
    >
      {/*
        ✅ Inner div: must have the TOTAL HEIGHT of all items
        This gives the browser the correct scroll track height
        Even though only ~30 items are actually rendered
      */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/*
          ✅ Only virtualizer.getVirtualItems() renders — not all events
          Each virtual item has: index, start (offset from top), size
        */}
        {virtualizer.getVirtualItems().map(virtualItem => {
          const event = events[virtualItem.index];
          return (
            <div
              key={event.id}
              // ✅ Position each item absolutely using its calculated start offset
              // transform is GPU-accelerated: no layout reflow on scroll
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EventRow event={event} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Memoize the individual row to prevent re-renders during scroll
// (scroll causes virtualizer state changes → parent re-renders → all visible rows re-render)
const EventRow = React.memo(({ event }: { event: MachineEvent }) => (
  <div style={{ display: 'flex', gap: 12, padding: '0 16px', height: '100%', alignItems: 'center' }}>
    <time className={`severity-${event.severity}`}>
      {new Date(event.timestamp).toISOString().slice(11, 23)}
    </time>
    <span>{event.message}</span>
    <span>{event.machineId}</span>
  </div>
));
EventRow.displayName = 'EventRow';
```

```tsx
// ✅ RIGHT — TanStack Virtual with variable heights (e.g., chat messages)

const ChatMessages: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80,  // Initial estimate; actual heights measured dynamically
    // ✅ measureElement: called after each item renders to get actual height
    // Virtualizer updates the offset of subsequent items based on real measurements
    // This handles images loading, text wrapping, etc.
    measureElement(element) {
      return element.getBoundingClientRect().height;
    },
  });

  return (
    <div ref={containerRef} style={{ height: '600px', overflowY: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              // ✅ data-index attr used by measureElement to identify the DOM node
              data-index={virtualItem.index}
              // ✅ ref callback: tells virtualizer this is the element to measure
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is virtual scrolling and how does it work?"

**Hruday's answer:**
> Virtual scrolling is a technique where only the items visible in the viewport — plus a small buffer above and below — are present in the DOM at any given time. The total scroll height is maintained by a spacer element that has the same height as if all items were rendered, so the user sees the correct scroll track and position, but the browser only has 20-30 active DOM nodes instead of thousands.
>
> The virtualization layer listens to scroll events from the container. On each scroll, it calculates which items should be visible based on the current scroll position and item sizes. It updates the DOM to show only those items and positions them using `translateY` CSS transforms (GPU-accelerated, no layout reflow). Items leaving the viewport are removed; items entering are added.
>
> The critical CSS requirements: the scrollable container must have a fixed height (not `height: auto`). Items in a fixed-height virtual list must have a consistent known height, or the library must measure actual heights dynamically for variable-height items.
>
> For Angular, the CDK provides `cdk-virtual-scroll-viewport` as a complete solution. For React, TanStack Virtual's `useVirtualizer` hook gives fine-grained control. Both solve the same problem but Angular CDK's solution is more opinionated (simpler to start), while TanStack Virtual is more flexible.

---

### Q2 — Bosch Experience Deep Dive
**Interviewer asks:** "Describe a real case where you implemented virtual scrolling."

**Hruday's answer:**
> At the Bosch-related industrial monitoring project within the SAP ecosystem, we had a machine event log page. Factory equipment generates diagnostic events continuously — status changes, parameter readings, error codes. Our data API returned up to 10,000 events per machine, and a tab on the dashboard let operators review this full audit trail.
>
> The initial implementation used `*ngFor` to render all events. The performance was unacceptable. Switching to the event log tab took 2-3 seconds — the browser was creating 10,000 DOM nodes for each machine. An Angular DevTools performance trace showed that the DOM creation itself (in the `ngAfterContentInit` lifecycle) was taking 1.8 seconds. Then scrolling through the rendered list was also jerky because layout calculations for the 10,000-node DOM were expensive.
>
> The fix was Angular CDK Virtual Scroll. Each event row was 48px tall (fixed height — the same for all events). I replaced `*ngFor` with `*cdkVirtualFor` inside a `<cdk-virtual-scroll-viewport itemSize="48">` with a fixed height of 600px on the container. CDK measured: (600 / 48) + buffer = about 25 DOM nodes visible at any time.
>
> After the change: tab switching dropped from 2-3 seconds to under 100ms. Scroll performance was smooth 60fps even on the factory workstation hardware. The browser was managing 25 DOM nodes instead of 10,000. Memory usage for the component dropped from ~110MB to ~8MB for the same data set.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use virtual scrolling?"

**Hruday's answer:**
> Virtual scrolling adds complexity and has a few specific cases where it creates more problems than it solves.
>
> First: small lists (under 100-200 items). The overhead of the virtualization layer (scroll event listeners, DOM position calculation on each scroll, the inner/outer container structure) is real. For a list of 50 items, just rendering all 50 is simpler, faster to implement, and equally fast to run. Virtual scrolling's benefits are only realized when DOM node count is the bottleneck.
>
> Second: accessibility-critical lists that need to be fully navigable without scrolling — for example, a dropdown with all country codes that screen reader users need to browse through. Virtual scrolling means items not in the viewport don't exist in the DOM, so they can't be focused or announced. This breaks keyboard navigation and screen reader traversal. For accessibility-critical lists, pagination is the better alternative.
>
> Third: when items have highly complex variable heights that the estimator can't approximate. Variable-height virtual scrolling (like TanStack Virtual's `measureElement`) works well for text content that wraps predictably. But for items that contain images with unknown heights (loaded from a CDN) or expandable accordion sections, the height estimation can be wrong enough to cause visible scroll jitter — the scrollbar position jumps as items are measured and actual heights differ from estimates.
>
> Fourth: when you need Ctrl+F browser native find-in-page search to work on list content. Items not in the DOM are not searchable. For auditing and compliance use cases where operators need to search the event log, pagination might be better than virtualization — or a separate search index that doesn't rely on DOM presence.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a scrollable product catalog for an e-commerce site supporting 50,000 products."

**Hruday's answer:**
> 50,000 products is too many to render, too many for virtual scrolling to load at once, and too many for most search experiences. I'd design this with three layers: server-side pagination, client-side windowed rendering, and prefetching.
>
> Data fetching: the initial page loads the first 100 products (1 API call). As the user scrolls toward the bottom of the currently loaded items, the next 100 are prefetched. This is an "infinite scroll with windowed fetch" pattern. The client never holds more than 300-500 items in memory at once (the currently visible page plus 1-2 pages ahead and behind).
>
> Rendering: TanStack Virtual / CDK Virtual Scroll renders only the visible product cards. Each card is a fixed 280px tall (we control this via the design system CardComponent). With a viewport of 800px, that's about 3 rows of 4 items = 12 items visible at any time, plus 2 rows buffer = ~20 items in the DOM.
>
> Image handling: product images use `loading="lazy"` inside virtual scroll — but this interacts with virtual scroll in a subtle way. When items enter the DOM (because the user scrolled to them), they're "near viewport" so `loading="lazy"` triggers immediately. This is correct behavior — images load just before they're needed.
>
> For filter/search: instead of filtering 50,000 items client-side, the API applies filters and returns new results. Each filter change triggers a new API call, clears the virtual scroll state, and starts from the top of the new result set. Client-side filtering is only applied for live search-as-you-type (debounced, on the 100 currently cached items).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Virtual scroll works with height: auto" | "I put the virtual scroll viewport inside a flex container and it handles its own height" | `cdk-virtual-scroll-viewport` and TanStack Virtual's container BOTH require a fixed, bounded height to function correctly; if the height is `auto` (inherits from content), the viewport height would equal the height of all rendered items — the virtualization logic never sees items going "out of viewport" because the viewport grows with the content; the outer container must have `height: Xpx` or `max-height: Xpx` with `overflow-y: auto/scroll`; in flex layouts, this often means giving the parent flex item `flex: 1; overflow: hidden; min-height: 0` (the `min-height: 0` override is crucial — flex items default to `min-height: auto` which lets them grow unbounded) |
| "Virtual scrolling handles all list performance issues" | "Virtual scrolling is the answer for large list performance" | Virtual scrolling addresses DOM SIZE (too many nodes) but NOT render COST PER ITEM; if each list item is a complex component with expensive Angular change detection or React rendering, virtual scrolling + fast scroll will still cause jank because 20-30 items must be created/updated per scroll tick; the full solution is virtual scrolling (DOM size) PLUS OnPush/React.memo (render cost per item); one without the other only solves half the problem |
| "CDK itemSize can be approximate" | "I'll set itemSize to roughly the right value — close enough" | CDK's `itemSize` determines the positioning offset for every item; if `itemSize="60"` but actual items render at 72px, items start to overlap or have gaps as you scroll deeper in the list; the spacer element's height calculation is also wrong → the scrollbar position becomes inaccurate; `itemSize` must be the EXACT pixel height of each item (including border, padding, margin); for variable heights, use `autosize` in Angular CDK or `measureElement` in TanStack Virtual; never approximate — either fix the item height or use the variable-height API |

---

## 7. Hruday's Real Experience Hook
> "The memory reduction from removing 10,000 DOM nodes was the metric that surprised me most. Using Chrome DevTools Memory tab, I snapshoted the heap before and after implementing virtual scroll on the Bosch event log. Before: 112MB for the component tree with 10,000 rows. After: 9MB with the same data. That's 103MB freed — for the SAME functionality.
>
> The 103MB wasn't wasted in any intentional way. It was just the browser's node-per-DOM-element cost: each DOM element requires a JS object, a layout box, a paint record, style data. At 10,000 elements × ~10KB each: 100MB. It's unavoidable per-element overhead that virtual scroll entirely sidesteps by having only 25 elements at a time.
>
> The factory workstations we were targeting had 4GB RAM. A single tab consuming 112MB for one list was meaningful, especially when operators had multiple tabs open monitoring different machines. After virtual scroll, that tab was 9MB — a 12× reduction. Operations staff noticed the difference without being told about it."

---

## 8. Scale Evolution

**Small app (< 200 items per list) →** Don't use virtual scrolling; render all items normally; optimize with React.memo or Angular OnPush if renders are slow; simple is better.

**Medium app (200-5,000 items) →** Angular CDK Virtual Scroll or React Window for fixed-height items; TanStack Virtual for variable heights; pair with OnPush/React.memo to keep per-item render cost low; `trackBy` / stable keys mandatory.

**Large scale (10,000+ items, real-time updates) →** Virtual scrolling + server-side pagination (never load 50,000 items at once — load 100-500 at a time as user scrolls); infinite scroll with windowed data loading (keep only 3 "pages" in memory, discard old ones); combine: CDK virtual scroll for DOM efficiency + windowed fetch for memory efficiency; Redis caching on the API for fast page requests; consider pagination as alternative for accessibility-critical views.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction history lists — merchants may have 10,000s of transactions; payment audit logs per merchant; recurring payment schedules displayed in long lists | Virtual scroll for transaction lists; pagination vs virtual scroll decision; memory efficiency discussion |
| Swiggy / Meesho | Product catalog browsing — thousands of food items or products; order history for heavy users; seller order queue with real-time updates | Infinite scroll + virtual scroll combination; product catalog at scale; real-time order list updates |
| Adobe / Microsoft | Teams meeting participant list (large organizations); SharePoint document library (thousands of files); Outlook email client (tens of thousands of emails in inbox) | React/Angular virtual scroll at scale; accessible virtual scroll; combined with real-time update handling |
| SAP Labs | Direct experience: Bosch machine event log 10,000 → 25 DOM nodes; 2-3s tab switch → 100ms; 112MB → 9MB memory; Angular CDK implementation; taught the pattern to the team; CDK itemSize precision issue encountered and resolved | Specific memory and timing numbers; CDK implementation depth; variable-height considerations |

---

## 10. Related Topics — What to Study Next

- **Topic 240 — Angular OnPush + trackBy** — virtual scrolling (DOM count reduction) pairs with OnPush (render cost reduction per item); both are needed for large lists; `trackBy` inside `*cdkVirtualFor` follows the same rules as in `*ngFor` — essential for preventing DOM node churn on data updates
- **Topic 239 — React.memo + useMemo** — the React equivalent of OnPush; wrapping the list item component in `React.memo` prevents re-renders of the 20-30 currently-visible items when the parent scrolls or data not related to those items changes; without this, each scroll tick can trigger 20-30 unnecessary re-renders
- **Topic 242 — Avoiding Unnecessary Re-renders** — the broader context in which virtual scrolling sits; after you've reduced DOM count with virtual scroll and render cost with memoization, the remaining re-render budget is for genuinely needed updates; this topic covers the full picture
- **Topic 243 — Main Thread Scheduling and Long Tasks** — even with virtual scrolling, creating 20+ item DOM nodes per scroll tick can cause jank on very slow devices; `requestAnimationFrame` batching and yielding to the main thread for smooth scrolling on budget hardware

---

*Part 14 · Virtual Scrolling for Large Lists · Full Stack Interview Guide · Hruday D · 2026*
