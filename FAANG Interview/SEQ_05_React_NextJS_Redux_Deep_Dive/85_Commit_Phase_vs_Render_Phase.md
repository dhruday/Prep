# 85. Commit Phase vs Render Phase — Side Effects Timing
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React's work is split into two fundamentally different phases: the render phase (pure computation — calling your components to produce fiber trees, no DOM changes) and the commit phase (applying the computed changes to the actual DOM). The render phase can be interrupted, paused, and restarted. The commit phase never can — once it starts, it runs synchronously to completion. `useEffect` runs **after** commit and paint (asynchronously). `useLayoutEffect` runs **after** commit but **before** paint (synchronously). `useInsertionEffect` runs **before** any DOM mutations (for CSS-in-JS). Getting this timing wrong causes layout flash, infinite loops, and subtle state corruption bugs — especially when React-rendered components interact with animation libraries, focus management, or DOM measurement.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Two Phases in Detail

```
RENDER PHASE (React's computation — no DOM touches)
├── beginWork(fiber): call your component function — get JSX output
├── reconcileChildFibers(): diff children, produce placement/update/deletion flags
├── completeWork(fiber): create DOM node for new elements (but don't insert)
└── [concurrent mode: can yield/pause/restart this entire phase]

COMMIT PHASE (applying to DOM — synchronous, never interrupted)
├── Sub-phase 1: Before Mutation
│   ├── getSnapshotBeforeUpdate (class components — read DOM before it changes)
│   └── useLayoutEffect cleanup from previous render
│
├── Sub-phase 2: Mutation
│   ├── DOM insertions, updates, deletions
│   ├── ref assignments (DOM refs updated here)
│   └── useInsertionEffect (CSS-in-JS style injection)
│
└── Sub-phase 3: Layout
    ├── useLayoutEffect setup (runs SYNCHRONOUSLY after DOM changes, BEFORE paint)
    ├── componentDidMount / componentDidUpdate
    └── After this sub-phase: React yields to browser → BROWSER PAINTS
        Then async: useEffect cleanup + setup (passive effects queue)
```

### The Rendering Timeline

```
trigger setState
  │
  ▼
[RENDER PHASE — async with concurrent, sync without]
  │  beginWork → reconcile → completeWork
  │  [can pause here in concurrent mode]
  │
  ▼
[COMMIT: Before Mutation]
  │  getSnapshotBeforeUpdate, useLayoutEffect cleanup
  │
  ▼
[COMMIT: Mutation] ← DOM changes happen HERE
  │  insertions, updates, deletions, ref updates, useInsertionEffect
  │
  ▼
[COMMIT: Layout] ← DOM is updated, NOT YET painted
  │  useLayoutEffect (setup)
  │  componentDidMount / componentDidUpdate
  │
  ▼
[BROWSER PAINT] ← User sees the new UI here
  │
  ▼
[PASSIVE EFFECTS] ← Async, after paint
   useEffect (cleanup from previous render)
   useEffect (setup for current render)
```

### `useEffect` vs `useLayoutEffect`

The most critical difference is **when relative to browser paint** they run:

| Hook | When | DOM updated | Browser painted | Thread |
|---|---|---|---|---|
| `useInsertionEffect` | Before Mutation | ❌ | ❌ | Sync |
| `useLayoutEffect` | Layout sub-phase | ✅ | ❌ | Sync (blocks paint) |
| `useEffect` | After paint | ✅ | ✅ | Async (runs as microtask/macrotask after paint) |
| `getSnapshotBeforeUpdate` | Before Mutation | ❌ (not yet) | ❌ | Sync |

**`useLayoutEffect` — use when you need to measure or mutate the DOM before the user sees it:**

```typescript
// ❌ useEffect — causes flash of wrong position
function Tooltip({ targetRef }: { targetRef: React.RefObject<HTMLElement> }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // This runs AFTER paint — user briefly sees tooltip at (0, 0)
    // then it jumps to the correct position
    const target = targetRef.current!.getBoundingClientRect();
    const tooltip = tooltipRef.current!.getBoundingClientRect();
    setPosition({ top: target.top - tooltip.height, left: target.left });
  }, []);

  return <div ref={tooltipRef} style={position}>Tooltip content</div>;
}

// ✅ useLayoutEffect — measure and position before paint
function Tooltip({ targetRef }: { targetRef: React.RefObject<HTMLElement> }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    // DOM is updated, browser has NOT painted yet
    // Measure and immediately update state → React synchronously re-renders
    // → re-enters layout sub-phase → browser paints ONCE with correct position
    const target = targetRef.current!.getBoundingClientRect();
    const tooltip = tooltipRef.current!.getBoundingClientRect();
    setPosition({ top: target.top - tooltip.height, left: target.left });
  }, []);
  // User never sees the flash — only the correctly-positioned tooltip

  return <div ref={tooltipRef} style={position}>Tooltip content</div>;
}
```

**`useInsertionEffect` — for CSS-in-JS libraries:**

```typescript
// Use case: inject styles BEFORE the DOM mutations so elements have styles on first paint
// Called before refs are attached and before useLayoutEffect
// Cannot access refs (DOM not updated yet)
// Primarily for library authors (styled-components, emotion, stitches)
function DynamicStyledComponent({ color }: { color: string }) {
  useInsertionEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `.dynamic-${color} { color: ${color}; }`;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, [color]);

  return <div className={`dynamic-${color}`}>Styled text</div>;
}
```

### The `getSnapshotBeforeUpdate` Class Lifecycle

This is the class component equivalent of reading DOM values before a commit — for example, capturing scroll position before a list prepend so you can adjust it after:

```typescript
class ChatWindow extends React.Component<Props, State> {
  private divRef = React.createRef<HTMLDivElement>();

  getSnapshotBeforeUpdate(prevProps: Props, prevState: State) {
    // Called BEFORE mutation phase — DOM is at PRE-update state
    if (prevProps.messages.length < this.props.messages.length) {
      const div = this.divRef.current!;
      // Return snapshot: how far from bottom before the new message is added
      return div.scrollHeight - div.scrollTop;
    }
    return null;
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: number | null) {
    // snapshot is what getSnapshotBeforeUpdate returned
    // DOM is now updated — adjust scroll to maintain user's position
    if (snapshot !== null) {
      const div = this.divRef.current!;
      div.scrollTop = div.scrollHeight - snapshot;
    }
  }
  // In hooks: use useLayoutEffect with a ref to snapshot pre-update DOM values
}
```

### Effect Timing in Concurrent Mode

In concurrent mode, the render phase may execute multiple times before committing (due to interruptions and restarts). Effects only fire when the render **commits**:

- If React renders a component but then discards the WIP tree (e.g., a higher-priority update arrived), `useEffect` and `useLayoutEffect` are NOT called — no commit happened
- Effects fire in the order: layout effects (sync), then passive effects (async, after paint)
- Cleanup always runs before setup on re-renders: cleanup → paint → setup

**StrictMode effect doubling (React 18 dev only):**

```
Mount:
  1. React renders, commits, runs setup (setup1)
  2. React simulates unmount: runs cleanup1
  3. React simulates remount: runs setup2 (with same props)

This ensures: setup2 works correctly, cleanup1 + setup2 leave expected state
Real environment runs only: setup (on mount), cleanup (on unmount)
```

### Why You Must Have Idempotent Effects

```typescript
// ❌ Non-idempotent — breaks with StrictMode / concurrent mode restarts
function DestructiveEffect() {
  useEffect(() => {
    // First time: works
    // StrictMode second run: tries to subscribe twice → error or duplicate subscription
    eventBus.subscribe('dataUpdate', handleUpdate);
    // No cleanup → subscription leaks
  }, []);
}

// ✅ Idempotent with cleanup
function SafeEffect() {
  useEffect(() => {
    eventBus.subscribe('dataUpdate', handleUpdate);
    return () => {
      eventBus.unsubscribe('dataUpdate', handleUpdate);
    };
    // Subscribe + immediate unsubscribe + resubscribe = correct end state
    // Works with StrictMode's double invocation
  }, []);
}
```

### Effect Ordering Across Component Tree

Effects run **bottom-up** (children before parents) in both setup and cleanup:

```
Component tree: App → Parent → Child → GrandChild

useLayoutEffect SETUP order:
GrandChild → Child → Parent → App   (bottom-up)

useLayoutEffect CLEANUP order (on unmount):
GrandChild → Child → Parent → App   (also bottom-up)

useEffect SETUP order:
GrandChild → Child → Parent → App   (bottom-up)
```

This matters when parent effects depend on children being mounted (DOM measurements from children).

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a drag-and-drop interface had a tooltip that showed field descriptions. Using `useEffect` for positioning caused visible tooltip jumps (rendered at 0,0 then repositioned). Converting to `useLayoutEffect` eliminated the flash — the tooltip calculated its final position before the browser first painted it.

At Oracle, the team used `componentDidMount` to initialize a D3 chart. Migrating to hooks incorrectly used `useEffect`, which ran after paint, and the chart briefly showed as empty. Switching to `useLayoutEffect` ensured the chart was initialized before the user saw the component, matching the old `componentDidMount` behavior.

**At FAANG scale:**
- **Microsoft (VS Code Web):** Editor scroll sync — `useLayoutEffect` reads line heights and updates scroll positions after every render to maintain synchronized scroll between the editor and minimap; using `useEffect` would cause visible one-frame scroll desync flashes
- **Adobe (XD):** Canvas overlays and guides — position calculations with `useLayoutEffect` ensure guides render at correct pixel positions from frame one; no jump/flash on canvas zoom or resize
- **Salesforce (Record Page):** Custom field editors — `useLayoutEffect` for auto-resize textarea height prevents layout shift; the textarea height is calculated and set before paint, so the user sees the correctly-sized control immediately
- **Cisco (Security Dashboard):** Alert panel positioning — tooltip placement for network topology nodes uses `useLayoutEffect` to avoid showing alert panels at wrong positions during panel opening transitions

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "React's two phases have completely different guarantees. The render phase calls your component functions and produces a new fiber tree, but does no DOM mutations — it's purely computational. In concurrent mode it can be interrupted and restarted. The commit phase takes that fiber tree and applies it to the DOM; it always runs synchronously to completion, even in concurrent mode.
>
> The commit phase has three sub-phases. Before Mutation reads snapshots (getSnapshotBeforeUpdate, useLayoutEffect cleanup from previous render). Mutation makes actual DOM changes and fires useInsertionEffect. Layout runs useLayoutEffect and component lifecycle methods synchronously — the DOM is updated but the browser hasn't painted.
>
> Then the browser paints, and after that, useEffect fires asynchronously.
>
> The practical implication: if you need to read a DOM measurement and apply a correction before the user sees anything, use useLayoutEffect. Examples: tooltip positioning, auto-scroll, textarea resizing. If you need to set up subscriptions, fetch data, or do work where a brief delay is acceptable, use useEffect. Using useLayoutEffect unnecessarily blocks paint and can degrade performance."

### Likely Follow-up Questions

1. **Can `useLayoutEffect` cause performance issues?** → Yes — it blocks browser paint. All `useLayoutEffect` callbacks complete before the browser draws the frame. A slow `useLayoutEffect` directly delays when the user sees any update. Keep `useLayoutEffect` minimal and fast; if you find yourself doing heavy work in it, reconsider the design.
2. **What's the difference between `useEffect` cleanup timing and unmount?** → Cleanup runs before the next setup (on every dependency change), not just on unmount. This order is: cleanup(old), then setup(new). Forgetting this causes stale closures and resource leaks when deps change frequently.
3. **Why does SSR show a `useLayoutEffect` warning?** → `useLayoutEffect` requires a DOM, which doesn't exist during server-side rendering. React warns because `useLayoutEffect` fires sync with commit, but there's no commit during SSR. Solutions: use `useEffect` if possible, or `useIsomorphicLayoutEffect` (uses `useLayoutEffect` on client, `useEffect` on server).
4. **What about `useEffect` in React Server Components?** → Server Components don't have a browser lifecycle. `useEffect`, `useLayoutEffect`, and `useInsertionEffect` are client-only hooks. They cannot be used in Server Components — doing so causes a compile-time error in Next.js App Router. Mark the component with `'use client'` directive if it needs effects.

### Senior Signal

> "The timing model is the foundation of correct hook usage. The rule is: render phase must be pure (no DOM mutations, no external writes); useInsertionEffect is pre-mutation (CSS injection only, no DOM reads); useLayoutEffect is post-mutation pre-paint (DOM measurement and correction); useEffect is post-paint (async operations, subscriptions, data fetching). The 'use useEffect unless there's a specific reason to use useLayoutEffect' guideline exists because useLayoutEffect unnecessarily blocks paint, and most work doesn't need to happen before the browser draws. But for DOM measurement-based corrections — tooltip positioning, scroll preservation, textarea auto-resize — useLayoutEffect is not optional, it's required for correctness."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

// ========================
// 1. The flash problem: useEffect vs useLayoutEffect for positioning
// ========================
function Popover({ anchorEl, children }: { anchorEl: HTMLElement | null; children: React.ReactNode }) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 }); // hidden off-screen initially

  // ✅ useLayoutEffect: DOM updated, not yet painted
  // User never sees the popover at (-9999, -9999)
  useLayoutEffect(() => {
    if (!anchorEl || !popoverRef.current) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    // Position below anchor, centered
    setPos({
      top: anchorRect.bottom + 8,
      left: anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2,
    });
    // React synchronously re-renders with new pos → layout effect runs again
    // → browser paints ONCE with correct position
  }, [anchorEl]);

  return (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
    >
      {children}
    </div>
  );
}

// ========================
// 2. Scroll preservation before/after list prepend
// ========================
interface Message { id: string; text: string; }

function ChatRoom({ messages }: { messages: Message[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollSnapRef = useRef<{ prevScrollHeight: number } | null>(null);

  // BEFORE mutation — capture scroll state
  // Equivalent to getSnapshotBeforeUpdate in class components
  useLayoutEffect(() => {
    const list = listRef.current!;

    // If we have a saved snapshot, restore scroll position
    if (scrollSnapRef.current !== null) {
      const { prevScrollHeight } = scrollSnapRef.current;
      list.scrollTop = list.scrollTop + (list.scrollHeight - prevScrollHeight);
      scrollSnapRef.current = null;
    }
  }, [messages]); // runs after every messages change, before paint

  // Function to capture scroll before a prepend (simulating getSnapshotBeforeUpdate)
  function prepareForPrepend() {
    scrollSnapRef.current = { prevScrollHeight: listRef.current!.scrollHeight };
  }

  return (
    <div ref={listRef} style={{ height: '400px', overflowY: 'auto' }}>
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}

// ========================
// 3. Effect timing and cleanup order
// ========================
function SubscriptionComponent({ channelId }: { channelId: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    console.log(`[SETUP] Subscribing to channel: ${channelId}`);
    const subscription = eventBus.subscribe(channelId, (msg: string) => {
      setMessages(prev => [...prev, msg]);
    });

    // CLEANUP runs BEFORE next setup on dep change, AND on unmount
    return () => {
      console.log(`[CLEANUP] Unsubscribing from channel: ${channelId}`);
      subscription.unsubscribe();
    };
    // Order when channelId changes: cleanup(old) → setup(new)
    // Order on unmount: cleanup(current)
    // With StrictMode: setup1 → cleanup1 → setup2 → [user sees result] → cleanup2 (unmount)
  }, [channelId]);

  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}

// ========================
// 4. useIsomorphicLayoutEffect — SSR compatibility
// ========================
// useLayoutEffect shows warning in SSR environments (no DOM)
// This pattern uses useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function DimensionAwareWidget({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.getBoundingClientRect().width);
  }, [content]);

  return (
    <div ref={ref}>
      <span>{content}</span>
      <span style={{ fontSize: width > 400 ? '16px' : '12px' }}>
        (width: {width}px)
      </span>
    </div>
  );
}

// Placeholder for eventBus
declare const eventBus: {
  subscribe: (channel: string, cb: (msg: string) => void) => { unsubscribe: () => void };
};
```

---

## 🧠 6. Memory Aid

**Mental Model:** Think of React as a movie studio. The render phase is the **filming** — actors perform, but nothing is on screen. The commit phase is the **projection** — first, change the film reel (mutation), then dim the lights and roll (layout effects), then the audience sees the movie (paint), then the cinema runs cleaning/maintenance (passive effects / useEffect). You can pause filming, but you can't pause mid-projection.

**If you go blank:** "Render: pure, interruptible. Commit: DOM changes, then layout effects (sync, before paint), then browser paints, then passive effects (async). useLayoutEffect = before paint. useEffect = after paint."

**Mnemonic:** **MBPL** — **M**utation (DOM changes), before **B**rowser paint runs **L**ayout sync effects, then **P**aint, then **P**assive effects (useEffect).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Choosing the wrong effect hook causes flash-of-incorrect-content (using `useEffect` for DOM measurement), performance degradation (using `useLayoutEffect` for data fetching), and hard-to-debug bugs where effects fire at unexpected times
→ Performance: `useLayoutEffect` blocks browser paint — every millisecond of `useLayoutEffect` work directly delays when the user sees the result; keep it for DOM measurement and correction only
→ Testing: Effect timing affects test reliability — `act()` in testing library flushes passive effects, but `useLayoutEffect` fires synchronously; knowing this timing lets you write reliable assertions

**How it works (3 sentences):**
React's commit phase is split into three synchronous sub-phases: Before Mutation (reads DOM snapshots, runs `useLayoutEffect` cleanup from previous render), Mutation (applies all DOM insertions/updates/deletions, fires `useInsertionEffect`), and Layout (fires `useLayoutEffect` setup and `componentDidMount/Update`), all of which complete before the browser paints the updated DOM. After the browser paints, React schedules passive effects (`useEffect`) asynchronously — first running cleanup functions from the previous render, then setup functions for the current render, always in bottom-up component tree order. The critical operational rule follows: anything requiring the DOM to be in its new state before the user sees it (position measurement, scroll preservation, auto-focus, DOM correction) uses `useLayoutEffect`; everything else uses `useEffect` to avoid blocking paint.

**Company relevance:**
- Microsoft: VS Code Online editor — minimap synchronization with main editor uses `useLayoutEffect` to read and set scroll positions synchronously, preventing the one-frame scroll desync that was causing users to report the minimap "flickering" after cursor moves
- Adobe: Firefly canvas rulers and guides — position calculations tied to canvas transforms use `useLayoutEffect` ensuring ruler marks render at correct positions from the first frame of every zoom/pan operation
- Salesforce: Record Detail page — auto-resizing rich text fields use `useLayoutEffect` to measure and set textarea height preventing layout shift during record loads and inline edits
- Cisco: Security event timeline — high-density event marker positioning on timeline uses `useLayoutEffect` to cluster overlapping markers before paint, preventing marker overlap flicker

---
✅ Topic 85/486 complete → Continuing to Topic 86: StrictMode — Why Double Invocation Happens
