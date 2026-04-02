# React Fiber and Reconciliation Algorithm
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Reconciliation**: the algorithm React uses to diff the CURRENT virtual DOM tree against the NEW virtual DOM tree when state changes, and determine the minimal set of actual DOM mutations needed; instead of "blow away the DOM and re-render everything," React applies only the exact changes (insert node, update text, remove element)
- **React Fiber (React 16+)**: the complete rewrite of React's reconciliation engine; the key innovation: Fiber makes rendering INTERRUPTIBLE; before Fiber (stack reconciler), rendering was synchronous and couldn't be paused mid-tree — a large render (30ms) blocked the main thread for the full 30ms; Fiber splits work into small units that can be paused, resumed, and prioritised
- **Render phase** (interruptible in React 18): React walks the Fiber tree, computes what changed, runs component functions/class render methods, runs hooks — produces a "work-in-progress" Fiber tree with flagged mutations; NO DOM changes yet; CAN be interrupted (React 18 concurrent mode uses this for `startTransition`)
- **Commit phase** (synchronous, CANNOT be interrupted): React applies all flagged mutations to the real DOM in one synchronous pass; runs effect cleanups + fires `useLayoutEffect`; then asynchronously fires `useEffect`; the commit phase must be atomic — partial DOM updates would leave the UI in an inconsistent visual state
- **Reconciliation heuristics** (two assumptions): (1) elements of DIFFERENT types produce entirely different trees (React doesn't try to reconcile a `<div>` with a `<span>` — it unmounts the old, mounts the new); (2) the `key` prop signals stable identity across renders — same key = reconcile this element; changed key = treat as new element (unmounts + remounts)
- **Keys**: must be STABLE (same across renders for the same logical item), UNIQUE (unique among siblings at the same level), NOT INDEXES (avoid — index doesn't represent item identity; reordering causes all items to reconcile as if mutated, missing the update optimisation)

---

## 1. One-Line Definition
React Fiber is the data structure and scheduling engine that represents each component as a unit of work, enabling React to pause and resume rendering mid-tree so expensive renders can yield to high-priority user interactions — turning rendering from a blocking synchronous procedure into a cooperative scheduled process.

---

## 2. The Problem It Solves

Before React Fiber (the "stack reconciler" in React ≤ 15): rendering was a single synchronous recursive call. React would call `render()` on the root, walk down the tree recursively, compute all changes, and update the DOM — without stopping. A large component tree with a complex re-render (say, 15ms of computation) blocked the main thread for 15ms. If the user pressed a key during that 15ms, the keypress event wasn't handled until rendering finished. At 60fps, each frame is 16.6ms — a 15ms render consumed the entire frame budget, leaving no time for layout and paint, causing a dropped frame.

The Fiber rewrite fixed this by converting the recursive stack-based model into an iterative, Fiber-node-based model where React can process one Fiber node at a time, check if the deadline is approaching (using `MessageChannel` as the macrotask boundary), and yield to let the browser handle user input before resuming the render. React 18's Concurrent Mode builds on this — `startTransition` tells React to treat a state update as low-priority, so React will interrupt it to handle urgent user input (typing, clicking).

---

## 3. How It Works Internally

### Fiber Tree Structure

```
Each React element maps to a Fiber node:
A Fiber node is a JavaScript object with:
  {
    type: 'div' | ComponentFunction | ClassComponent,
    stateNode: DOM node | class instance,
    pendingProps: new props for this render,
    memoizedProps: props from last completed render,
    memoizedState: state hooks linked list (for function components),
    flags: bitmask of mutations (Update, Placement, Deletion),
    child: pointer to first child Fiber,
    sibling: pointer to next sibling Fiber,
    return: pointer to parent Fiber (not "parent" — "return" refers to control flow),
    alternate: pointer to the "other" version of this Fiber (current ↔ work-in-progress)
  }

DOUBLE BUFFERING — Two Fiber trees exist simultaneously:
  Current Fiber Tree:          The tree currently displayed in the DOM
  Work-in-Progress (WIP) Tree: The tree being built for the next render
  
  Each node in current has an "alternate" pointing to its WIP counterpart
  When WIP completes: current and WIP are SWAPPED (WIP becomes current)
  
  Visual:
  Current:  [App] ↔ [App WIP]
              ↓            ↓
            [Nav] ↔ [Nav WIP]
              ↓            ↓  
            [Button] ↔ [Button WIP]

React walks the WIP tree, computing changes, flagging mutations in flags bitmask
When done: atomically swaps current ↔ WIP
```

### Reconciliation Algorithm

```
Reconciliation happens during the RENDER PHASE.

Algorithm for reconciling children:
Given: current Fiber children list, new elements array from render output

Step 1 — First pass: reconcile elements with matching keys (or indices if no keys)
  For each new element (left-to-right):
    Find matching current Fiber (by key, or by position if no key)
    If SAME TYPE: reuse/update the Fiber node (cheapest operation — in-place update)
    If DIFFERENT TYPE: flag old for deletion, create new Fiber (expensive — full mount)

Step 2 — Second pass: handle remaining elements
  If new elements remaining (no matching current): create + mount
  If current Fibers remaining (no matching new element): flag for deletion

Example with keys — WHY KEYS MATTER:

Without keys (use index):
  Initial render: [A(0), B(1), C(2)]
  After remove A:  [B(0), C(1)]
  
  Reconciler compares by position:
    position 0: was A, now B → UPDATE A to B (wrong! B is different)
    position 1: was B, now C → UPDATE B to C (wrong!)
    position 2: was C, now nothing → DELETE C
  
  Result: 2 updates + 1 delete (3 DOM operations)
  Worse: state inside old A is "reused" for B (stale state bug!)

With stable keys:
  Initial render: [A(key="a"), B(key="b"), C(key="c")]
  After remove A:  [B(key="b"), C(key="c")]
  
  Reconciler compares by key:
    key "a": existed, now gone → DELETE A
    key "b": B exists in both → no change
    key "c": C exists in both → no change
  
  Result: 1 delete (1 DOM operation). State preserved correctly.
```

### Render Phase vs Commit Phase

```
RENDER PHASE (interruptible in React 18 Concurrent Mode):
  React walks the Fiber tree depth-first
  For each Fiber node:
    1. Call the function component / class render()
    2. Run hooks (useState, useReducer, useMemo, useCallback)
    3. Reconcile new element outputs against existing child Fibers
    4. Flag Fibers with mutations: {Update, Placement, Deletion, ChildDeletion}
  
  Result: Work-in-Progress tree fully built, mutations flagged, NO DOM touched yet
  
  In React 18 Concurrent Mode: React can pause between any two Fibers.
  Uses MessageChannel (a macrotask) to yield to the browser's event loop.
  If a higher-priority update arrives (user typed in a text field), React
  discards the in-progress low-priority render and starts fresh with the new state.
  (Discarding = simple: just don't flush the WIP tree. Start WIP over.)

COMMIT PHASE (SYNCHRONOUS — cannot be interrupted):
  Three sub-phases, all synchronous:
  
  1. beforeMutation phase:
     Run getSnapshotBeforeUpdate() for class components
     React reads layout information here (before DOM mutations happen)
  
  2. mutation phase:
     Apply ALL flagged mutations to the real DOM:
       - Placement: insert new DOM nodes
       - Update: update DOM properties (className, value, event listeners)
       - Deletion: remove DOM nodes and clean up their effects
     Run useLayoutEffect CLEANUP functions (for nodes being removed)
  
  3. layout phase:
     Run useLayoutEffect callbacks (synchronously after DOM mutations)
     Update refs (ref.current is set here)
  
  After commit is complete:
     React schedules passive effects to run asynchronously (next macrotask):
     - Run useEffect cleanup functions from previous render
     - Run useEffect callbacks from this render

  Why 3 sub-phases? Because some operations (getSnapshotBeforeUpdate) need
  to read the DOM before mutation, and useLayoutEffect needs the DOM after mutation.
  Grouping all mutations in the middle guarantees a consistent DOM state at each phase.
```

---

## 4. The Code

### Wrong Way — Breaking Reconciliation with Unstable Keys and Type Mismatches

```typescript
// ❌ WRONG — Using array index as key (common mistake)
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((product, index) => (
        // index as key: if product at position 0 changes (filter, sort, delete),
        // React reconciles by position — thinks position 0's element CHANGED
        // instead of realising a DIFFERENT product is now at position 0
        <ProductCard key={index} product={product} />
      ))}
    </ul>
  );
}
// Bug: user has ProductCard at position 0 expanded/focused
// After filtering out the first product: the card at position 0 is still
// "expanded" because the state from the old position-0 card was reused

// ❌ WRONG — Creating components inside render (new function reference every render)
function Dashboard() {
  // ❌ This creates a NEW function reference every time Dashboard renders
  // React sees a different type every render → unmounts + remounts the child
  // every time the parent renders (even if props didn't change)
  // This causes: input fields losing focus, animations resetting, state lost
  const InlineUserCard = ({ user }: { user: User }) => (
    <div className="card">{user.name}</div>
  );
  
  return (
    <div>
      <InlineUserCard user={currentUser} />  {/* ← new component type every render! */}
    </div>
  );
}

// ❌ WRONG — Forcing full remount unnecessarily (key change trick misused)
function TabPanel({ activeTab }: { activeTab: string }) {
  // ❌ Changing key on EVERY render forces unmount+remount
  // Intentional key changes for reset are valid; accidental ones destroy perf
  const unstableKey = `${activeTab}-${Date.now()}`; // changes every render!
  return <PanelContent key={unstableKey} tab={activeTab} />;
}
```

> **Why this fails:** index keys cause stale state reuse, incorrect reconciliation, and missed DOM-update optimisations. Inline component definitions create a new function reference every render, making React think the component TYPE changed, causing full unmount/remount. Unstable keys force React to throw away and recreate the entire subtree on every render.

### Right Way — Keys, Stable References, and Understanding Reconciliation

```typescript
// ✅ RIGHT — Stable, meaningful keys from data
function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((product) => (
        // product.id is stable: same product always has same key
        // React reconciles by ID: if product moves position (sort), it keeps the component
        // If product is removed: React deletes JUST that key's Fiber
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}

// ✅ RIGHT — Define components at module level (stable reference)
// Component function is defined ONCE, not on every render
const UserCard = ({ user }: { user: User }) => (
  <div className="card">{user.name}</div>
);

function Dashboard() {
  return (
    <div>
      <UserCard user={currentUser} />
      {/* React reconciles UserCard against previous UserCard — same type → update in place */}
    </div>
  );
}

// ✅ RIGHT — Intentional key reset (one valid use case)
// Force a child component to fully reset when tab changes
// React unmount+remounts the form when activeTab changes — all form state cleared
function TabPanel({ activeTab }: { activeTab: string }) {
  return (
    // Using same KEY for same tab means React reuses the component (correct)
    // Changing KEY when tab changes means React unmounts old tab's form (correct reset)
    <PanelContent key={activeTab} tab={activeTab} />
  );
}

// ✅ RIGHT — Understanding when React.memo helps (relies on reconciliation shallow compare)
const ExpensiveChart = React.memo(
  ({ data, config }: { data: DataPoint[]; config: ChartConfig }) => {
    // React.memo adds a check BEFORE the render phase:
    // If props are shallowly equal to previous render's props, SKIP rendering entirely
    // React doesn't even enter the render phase for this component
    // The Fiber node is reused as-is — zero reconciliation work
    return <LineChart data={data} config={config} />;
  },
  // Custom comparison: use deep equality for the config object if needed
  (prevProps, nextProps) => {
    return prevProps.data === nextProps.data && 
           JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config);
  }
);

// ✅ RIGHT — Component that uses keys to control reconciliation precisely
function SortableList({ items, sortKey }: { items: Item[]; sortKey: string }) {
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a[sortKey].localeCompare(b[sortKey])),
    [items, sortKey]
  );
  
  return (
    <div>
      {sortedItems.map(item => (
        <ListRow
          key={item.id}  // ✅ Stable key: same item ID regardless of sort position
          item={item}
        />
        // When sortKey changes, items move to new positions
        // React's reconciler matches by key (item.id), not by position
        // Result: React reorders existing DOM nodes rather than delete/recreate
        // —> 0 unmounts, 0 mounts, just DOM rearrangement. Very fast.
      ))}
    </div>
  );
}

// ✅ RIGHT — useLayoutEffect vs useEffect (timing in the commit phase)
function TooltipPositioner({ targetRef, children }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // ✅ useLayoutEffect runs SYNCHRONOUSLY after DOM mutations but BEFORE browser paint
  // Use it when: you need to read layout (getBoundingClientRect) and MUST update
  // the DOM before the user sees the layout (otherwise they see a flash/jump)
  useLayoutEffect(() => {
    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    
    // Position tooltip relative to target — MUST happen before paint
    // (visible flicker if we use useEffect here — browser would paint THEN reposition)
    tooltip.style.top = `${targetRect.bottom + 8}px`;
    tooltip.style.left = `${targetRect.left}px`;
  }); // No dep array: run after every render (position recalculates on resize/scroll)
  
  // useEffect (standard): runs asynchronously after browser has painted
  // Use it for: data fetching, subscriptions, logging — work that doesn't affect layout  
  useEffect(() => {
    // Non-critical: analytics, subscriptions
    analytics.track('tooltip_shown');
  }, []);
  
  return <div ref={tooltipRef}>{children}</div>;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the reconciliation algorithm and what are its two main simplifying assumptions?"

**Hruday's answer:**
> Reconciliation is how React figures out what changed between two virtual DOM trees and computes the minimal set of actual DOM operations needed. Without simplifying assumptions, comparing two arbitrary trees optimally is an O(n³) problem — way too slow for practical use.
>
> React makes two assumptions that reduce this to O(n):
>
> First: elements of different types will produce entirely different trees. If a `<div>` was in the current tree and the new output has a `<section>` in the same position, React doesn't try to reconcile their children — it unmounts everything under the `<div>` and mounts everything under the `<section>` fresh. This is aggressive but practical — in real component trees, changing a container type usually does mean a completely different subtree.
>
> Second: the `key` prop tells React which elements are stable across renders. Same key in the current tree and the new output means "this is the same logical element, even if it moved position." React reconciles by updating that element in-place instead of unmounting/remounting. This is why list rendering requires keys — without them, React falls back to positional comparison, which is incorrect when list items reorder.

---

### Q2 — Deep Dive
**Interviewer asks:** "What does React Fiber enable that the old stack reconciler couldn't do?"

**Hruday's answer:**
> The core innovation is interruptibility. The old stack reconciler used call-stack recursion — to render a component tree, it made recursive function calls, unwinding the entire tree in one synchronous pass. You can't pause call-stack recursion midway. If a render took 15ms, those 15ms were locked to the main thread, blocking user events.
>
> Fiber replaces recursion with an explicit data structure — a linked list of Fiber nodes (each representing a component). React processes one Fiber node at a time in a loop, not as recursive calls. Between any two Fiber nodes, React can check: "Has a deadline been reached? Is there pending user input?" If yes, React saves the in-progress work-in-progress tree and yields to the browser.
>
> This enables three things React 18 uses directly: First, `startTransition` — marking an update as low-priority so React will interrupt and yield to urgent inputs (typing in a search field while a heavy results list is rendering). Second, `Suspense` — if a component suspends (throws a Promise during render), Fiber can gracefully "suspend" that subtree while showing a fallback. Third, automatic batching — React 18 batches all state updates across `setTimeout`, Promises, and event handlers because Fiber's scheduling model knows how to collect multiple updates into one render.

---

### Q3 — Practical
**Interviewer asks:** "When would you NOT use a data ID as a key in a list, and instead use another strategy?"

**Hruday's answer:**
> There are a few cases where the data ID isn't the right key:
>
> First: virtual lists (windowed lists). Libraries like `react-window` or `tanstack/react-virtual` render only the visible items. If you have 50,000 items and show 20 at a time, the SAME DOM row DOM is reused for different data as the user scrolls. In that case you want to key by the ROW INDEX (the virtual position), not the data ID — because you WANT React to reuse and update the same DOM nodes as data changes scroll into view not unmount/remount them.
>
> Second: truly transient UI items without identity. Notification "toasts" that appear and disappear. Each notification should have a unique key so they animate in/out correctly, but the key could be a counter or timestamp rather than a database ID.
>
> Third: when the identity of elements doesn't map to dataset identity. A multi-step wizard with 5 steps: each step is a different form — you might key by step number (1-5) rather than data IDs, because you deliberately WANT React to unmount the old step's form state when advancing to the next step.
>
> The meta-rule: the key should represent THE IDENTITY OF THE LOGICAL ELEMENT in the user's mental model — not necessarily the data ID. Most of the time that aligns, but these special cases are where we deviate.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "React re-renders the whole DOM when state changes" | "React updates the whole page when state changes" | React re-renders the VIRTUAL DOM (runs component functions) and then DIFFS the result against the current virtual DOM; only actual differences are applied to the real DOM; React can also SKIP re-rendering entirely for memoised components; the DOM mutations are minimal, not full rebuilds — this is the entire point of reconciliation |
| "Index keys are fine for static lists" | "If my list doesn't change, index keys are fine" | Index keys are ONLY safe for lists that: never reorder, never filter, and never have items added in the middle (only appended to the end); ANY of these conditions being violated causes incorrect reconciliation with index keys; since requirements change, static lists today become dynamic lists tomorrow — use stable IDs from the start |
| "Fiber means React is multi-threaded" | "React Fiber runs renders in parallel threads" | Fiber is still single-threaded; it runs on the main thread; "interruptible" means React can YIELD the main thread (pause a render to let the browser process events), not that it spawns worker threads; all of React runs on the main thread; React 18's concurrent mode is about cooperative scheduling (yielding), not parallel execution |
| "useEffect runs synchronously after render" | "`useEffect` is like componentDidUpdate — runs right after render" | `useEffect` runs ASYNCHRONOUSLY after the browser has painted; it's scheduled as a passive effect for the next macrotask after commit; `useLayoutEffect` runs synchronously after DOM mutations but BEFORE paint — it's the equivalent of `componentDidMount`/`componentDidUpdate`; confusing these two causes layout flash bugs (update DOM in useEffect → user sees old layout for one frame) |

---

## 7. Hruday's Real Experience Hook
> "The reconciliation algorithm became very tangible when we had a performance problem at SAP with a dynamically sorted data table. The table had 500 rows, and when the user clicked 'Sort by Date', the entire table appeared to re-render from scratch — all rows flashed briefly. The Stacking trace showed 500 component unmounts followed by 500 component mounts. Classic key problem.
>
> We were using the `rowIndex` as key (common default in data table libraries). When sort order changed, row 0 became row 247 in the data — but React saw that position 0 had a different OBJECT as props, flagged it as an UPDATE (not a reorder), and re-rendered that position with new data. The animation library interpreted this as a 'new element appearing' because the item left the viewport and re-entered as a different item.
>
> Fix: use `row.id` (the entity ID from the database) as the key. Now when sort order changes, React's reconciler matches each Fiber by ID, recognises that Fiber 247 is now at DOM position 0, and MOVES the existing DOM node rather than delete/recreate. Result: 0 unmounts, 0 mounts, just DOM node reordering — visually the rows smoothly animated to new positions. The entire sort re-render went from 180ms to 12ms.
>
> That experience crystallised why keys aren't a 'nice to have' — they're the signal React uses to decide whether to update or replace."

---

## 8. Scale Evolution

**Basic React app →** Know the two reconciliation heuristics, always use stable IDs as keys, never create components inside render functions. These three rules eliminate 90% of reconciliation-related bugs in a typical application.

**Production SPA, performance-conscious →** React DevTools Profiler to see which components render, how long they take, and what caused them to render. `React.memo` for expensive pure components. `useMemo`/`useCallback` to stabilise props passed to memoised components. `useTransition` from React 18 for expensive filter/sort operations in UI.

**Large scale / data-heavy apps →** Virtualization for lists over 100 items (react-window, tanstack/react-virtual) — not a React issue per se, but critical when reconciling large lists; the key strategy changes for virtual lists. React's built-in profiler plus custom trace events to measure per-component render budgets. Server Components (Next.js / React 19+) to eliminate client-side reconciliation for static content — the best reconciliation work is no reconciliation at all.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Checkout steps with conditional UI elements (payment method selector, OTP forms, EMI options appearing/disappearing) — correct reconciliation prevents stale state in payment flows; a user selecting EMI that inherits DOM state from a UPI form is a real UX bug | Key prop strategies for conditional rendering; unmount/remount vs update semantics for form state |
| Swiggy / Meesho | Product/restaurant listing pages with real-time updates (availability, price changes while user browses) — reconcilation efficiency for large lists; live cart updates — reconciliation of cart line items; search results that filter/sort | Reconciliation performance for large lists; stable keys from entity IDs; memoization strategy |
| Adobe / Microsoft | Document component trees with complex nested structures (PDF viewer, spreadsheet cells, design canvas); predictable reconciliation behaviour is critical when thousands of elements are in the tree at once; Microsoft interview style specifically asks how Fiber enables concurrent rendering | React Fiber internals depth; commit phase timing (useLayoutEffect vs useEffect); how Fiber enables startTransition |
| SAP Labs | Production sort performance bug fixed via key strategy (real Hruday experience); SAP data tables with server-side pagination — keys must be stable across page loads; dynamic forms where fields appear/disappear conditionally (correct key strategy prevents input state leaks) | Real reconciliation debugging story; key strategies for data tables; performance profiling with React DevTools |

---

## 10. Related Topics — What to Study Next

- **Topic 211 — React 18 Concurrent Mode and Suspense** — Concurrent Mode is built entirely on the React Fiber architecture described here; `startTransition` uses Fiber's interruptibility to defer low-priority renders; `Suspense` uses Fiber's ability to suspend a subtree mid-render; understanding Fiber's render/commit phases makes the concurrent mode APIs clear rather than magical
- **Topic 210 — All React Hooks** — hooks are stored as a linked list on each Fiber node (`memoizedState`); the rules of hooks ("don't call in loops or conditionals") exist because React identifies each hook by its call order within the Fiber — changing the number of hooks changes which slot each hook maps to; understanding Fiber makes the rules of hooks make sense
- **Topic 213 — Custom Hooks Patterns and Composition** — custom hooks are functions that call built-in hooks; they're transparent to Fiber (the same hook storage applies); understanding when `useCallback` and `useMemo` are worth using (stabilising props for `React.memo`-wrapped children) requires understanding what reconciliation does when props change
- **Topic 215 — Angular Change Detection** — a useful parallel: both React's reconciliation and Angular's change detection solve the same problem (detecting UI state changes) with different approaches; React uses diffing against a virtual DOM tree; Angular uses zone.js to detect any async operation, then dirty-checks component trees; understanding both frameworks' answers to "how do we know what changed" is strong senior-engineer territory

---

*Part 12 · React Fiber and Reconciliation Algorithm · Full Stack Interview Guide · Hruday D · 2026*
