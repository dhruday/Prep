# 81. React Fiber Architecture — What It Is and Why It Was Built
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React Fiber is the complete reimplementation of React's core reconciliation engine, shipped in React 16. The old "Stack Reconciler" was a single synchronous recursive walk of the component tree — once started, it couldn't be interrupted, causing dropped frames and janky UIs when trees were large. Fiber replaces the call stack with a hand-managed linked list of work units called "fibers" — one per component. This structure allows React to pause work mid-tree, yield back to the browser to paint a frame, prioritize urgent updates (user input) over non-urgent ones (background data), and resume or abandon in-progress work. Every concurrent feature in React 18 — `useTransition`, `Suspense`, streaming SSR — is built on Fiber's pausable, prioritizable work loop.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The Stack Reconciler problem (React 15 and before):**

React's old reconciler mirrored the JavaScript call stack — `reconcileChildren` called `reconcileChild` which called `reconcileChildren` recursively. For a 1000-node component tree, this was a 1000-frame-deep synchronous call stack that could not be interrupted.

```
Stack reconciler rendering 1000 components:
Frame 0: render App
Frame 1: render Layout
Frame 2: render DashboardPage
...
Frame 998: render TileKPI
Frame 999: render Icon
JS engine holds main thread for entire duration
Browser cannot paint, user cannot interact
```

**The consequence:** On a slow device, a large React re-render could block the main thread for 50–200ms+, causing visible frame drops during animations and unresponsive interactions.

**Fiber's solution:** Convert the recursive tree walk into a loop over a linked list of units of work. A loop can be paused after any iteration; a recursive call cannot.

### How Fiber Works Internally

**The Fiber Node — unit of work:**

Each React component/element maps to a Fiber node. A fiber is a plain JavaScript object containing:

```typescript
interface Fiber {
  // Identity
  type: Function | string;         // component function or 'div', 'span', etc.
  key: string | null;

  // Tree structure — linked list, not nested objects
  return: Fiber | null;           // parent fiber
  child: Fiber | null;            // first child
  sibling: Fiber | null;          // next sibling

  // Work
  pendingProps: Props;            // new props for this render
  memoizedProps: Props;           // props from last committed render
  memoizedState: Hook | null;     // first hook in the hooks linked list

  // Type of work needed
  flags: number;                  // bitmask: Placement, Update, Deletion, etc.
  lanes: Lanes;                   // priority bits

  // Double-buffering
  alternate: Fiber | null;        // the "work-in-progress" or "current" twin

  // Effects list
  updateQueue: UpdateQueue | null;
}
```

**Double buffering — current tree vs work-in-progress tree:**

React always maintains two fiber trees:
1. **Current tree** — describes what's currently rendered on screen
2. **Work-in-progress (WIP) tree** — the in-progress new render

Every fiber has an `alternate` pointer to its twin in the other tree. While React renders, it builds the WIP tree. When complete, it switches the "current" pointer to point at the WIP tree — a single pointer swap, atomic from React's perspective.

This is why React can "abandon" in-progress work: it just discards the WIP tree and starts fresh without affecting what's on screen.

**The work loop — two phases:**

```
Render phase (async, interruptible):
  workLoopConcurrent():
    while (workInProgress !== null && !shouldYield()) {
      workInProgress = performUnitOfWork(workInProgress);
    }
    // shouldYield(): checks if time budget expired (scheduler.shouldYield())
    // If work remains: schedule a continuation via MessageChannel
    // If work complete: proceed to commit phase

Commit phase (synchronous, NOT interruptible):
  commitRoot():
    → commitBeforeMutationEffects()  (getSnapshotBeforeUpdate)
    → commitMutationEffects()        (DOM insertions, updates, deletions)
    → commitLayoutEffects()          (useLayoutEffect, componentDidMount/Update)
    → PAINT frame                    (browser paints; react yields)
    → startPassiveEffects()          (useEffect runs asynchronously)
```

**The render phase (reconciliation) IS interruptible.** The commit phase (DOM mutation) is NOT — React never interrupts a DOM write mid-way.

### The Fiber Work Traversal

Fiber traverses the tree depth-first using the linked list structure:

```
1. beginWork(current, workInProgress, renderLanes)
   → processes the fiber: calls the component function, diffs children
   → returns child fiber if has children, null if leaf node

2. If beginWork returns a child → move to child (depth first)

3. If no child (leaf) → completeWork(workInProgress)
   → creates/updates DOM nodes for host fibers
   → appends effects to the "effects list"
   → returns sibling if exists, else moves up to parent

4. After completing all work → commit phase
```

**Why linked list vs recursion:**
- A recursive call is implicit — controlled by the JS engine, stored on the call stack
- A linked list traversal is explicit — React controls the "next" pointer, can stop between steps
- `shouldYield()` from the Scheduler package checks if 5ms time slice has expired; if so, pause and schedule resumption via `MessageChannel`

### Architecture & Component Boundaries

**Fiber as the reconciliation abstraction:**

Every React feature sits above Fiber:
- **Class components:** `memoizedState` on the fiber holds the class instance
- **Function components + hooks:** `memoizedState` holds a linked list of hook nodes (one per `useState`, `useEffect`, etc. in call order)
- **Context:** Fiber stores context value reads; when context changes, all fibers that read it are marked dirty
- **Suspense:** A special fiber type that catches thrown Promises; the fiber subtree is "suspended" until the Promise resolves
- **Error boundaries:** Commit phase catches errors; fiber tree above the error boundary continues; subtree is replaced with fallback

### Performance Implications

**Before Fiber (React 15):**
- A 1000-component re-render: single 60ms main thread block
- Result: animations stutter, typing lags, INP catastrophic

**After Fiber (React 16–17 — still synchronous by default):**
- Same rendering, but now interruptible — React 16/17 didn't yet use concurrent rendering by default
- Fiber provided the infrastructure but `ReactDOM.render()` still used legacy sync mode

**React 18 — Concurrent Mode activated:**
- `createRoot()` activates concurrent scheduling
- Urgent updates (typing, button clicks) are prioritized
- Non-urgent updates (background data loads) can be deferred via `useTransition`
- `startTransition` wraps low-priority state updates; Fiber treats them as lower-priority lanes

### Scalability Considerations

- **Small component tree (<100 nodes):** Fiber's overhead vs Stack Reconciler is negligible; both run in <5ms
- **Medium tree (500–2000 nodes):** Fiber starts to matter — concurrent mode can slice the work across frames
- **Large tree (5000+ nodes or deep re-renders):** Without Fiber/concurrent mode, the blocking render causes noticeable jank; with Fiber + `useTransition`, the UI stays responsive

### Trade-offs

| Synchronous rendering (legacy mode) | Concurrent rendering (React 18 createRoot) | When to use concurrent |
|---|---|---|
| Simpler mental model | Complex time-slicing | Always in new React 18 apps |
| Predictable timing | Effects may run at unexpected times | Requires understanding async nature |
| No StrictMode effects double-call | StrictMode double-invokes in dev | Concurrent features (transitions, Suspense) |
| Good for small/simple trees | Required for large, interactive trees | Any app with complex interactions |

### ⚠️ Anti-Patterns & Pitfalls

- **Treating React rendering as synchronous in concurrent mode** — Side effects in the render function (function component body) may be called multiple times or discarded. Store state in refs or state, not in module-level variables.
- **Large subtrees without memoization in concurrent apps** — React can interrupt and restart renders; without `React.memo` / `useMemo`, an interrupted render restarts and re-renders the entire subtree. Memoization reduces re-render cost.
- **Blocking work in render phase** — Any synchronous blocking operation (heavy computation, synchronous localStorage read) in a component body prevents the Scheduler from yielding. Move heavy work to `useEffect` or Web Workers.
- **Relying on render timing for side effects** — In concurrent mode, the render phase may run multiple times for one commit. Use `useEffect` (after commit) for side effects, never in render.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Bosch, the real-time monitoring dashboard had simultaneous WebSocket updates feeding 50 chart components. Before understanding Fiber/concurrent mode, the team noticed that user interactions (filter changes) felt sluggish during data bursts. The fix was `useTransition` — wrapping filter state updates with `startTransition` told React's Fiber scheduler these were low-priority, keeping WebSocket data renders responsive while filter UI remained interactive. This is only possible because Fiber can hold multiple renders in flight at different priorities.

At SAP, understanding Fiber's double-buffering explained why `StrictMode` caused effects to run twice in development — React intentionally discards and replays the WIP tree to find impure renders. This insight prevented an entire class of bugs where developers wrote impure render functions thinking the first run would "stick."

**At FAANG scale:**
- **Microsoft (Office Online/Teams):** The collaborative editor must handle real-time incoming character insertions at 60fps while the user is actively typing; Fiber's concurrent scheduling separates "user is typing" (urgent, high-priority lane) from "remote user inserted text" (normal lane) — the editor stays responsive under collaborative load
- **Adobe (Photoshop Web):** Tool rendering (canvas, layer panels) uses `useTransition` for non-urgent panel updates; user brush strokes remain in a high-priority lane; layer list refresh is wrapped in `startTransition`
- **Salesforce (Tableau):** Dashboard filter application sends low-priority `startTransition` updates while the existing visualization remains visible and interactive during recalculation
- **Cisco (WebEx):** Participant video grid updates (join/leave/layout) are wrapped in `startTransition`; active speaker highlighting is in a high-priority state — separate lanes ensure smooth video while layout changes don't block audio

**How it evolves with scale:**
- Small scale: React 15's stack reconciler adequate; re-renders complete in <5ms
- Medium scale: Fiber's infrastructure needed; concurrent mode beneficial for interactive components
- Large scale (Photoshop, Office): Concurrent mode required; without it, complex UIs would drop to single-digit fps during heavy updates

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "React Fiber is React's core engine rewrite, shipped in React 16. The fundamental problem it solved was that the old Stack Reconciler was a synchronous recursive algorithm — once React started reconciling a large tree, it couldn't stop. On large trees or slow devices, this blocked the main thread for 50–200ms, causing dropped frames and unresponsive input.
>
> Fiber converts the recursive tree walk into an explicit loop over a hand-managed linked list of 'fiber' nodes — one per component. Because it's an explicit loop, React controls the iteration, and the Scheduler package can pause it after each unit if the time budget (5ms) is exceeded. React saves its position in the linked list and yields back to the browser to paint.
>
> The infrastructure enables everything in React 18: `startTransition` tells Fiber to treat a state update as low-priority, so typing stays responsive while a slow search rerender happens in the background. Suspense works because Fiber can suspend a subtree (pause at a Promise boundary) and resume it later without affecting the rest of the tree.
>
> The two-phase architecture is key: the render phase (reconciliation) is async and interruptible; the commit phase (actual DOM mutation) is synchronous and never interrupted — React never writes to the DOM halfway through."

### Likely Follow-up Questions

1. **What's the difference between React 16 Fiber and React 18 Concurrent Mode?** → Fiber is the data structure and work loop infrastructure (React 16+). Concurrent Mode is the feature set built on top of Fiber — time-slicing, priority lanes, `startTransition`, `useDeferredValue` — enabled by `createRoot()` in React 18. Fiber was the internal rewrite; concurrent mode is the user-facing capability.
2. **What are "lanes" in Fiber?** → Lanes are a bitmask priority system replacing the old "expiration time" priority. Each update is assigned a lane (e.g., SyncLane for user events, TransitionLane for `startTransition`, OffscreenLane for pre-rendering). Fiber processes higher-priority lanes first when work is batched.
3. **How does React Fiber relate to `useEffect` timing?** → `useEffect` runs asynchronously after the commit phase (after paint). `useLayoutEffect` runs synchronously during the commit phase, before paint. Fiber's two-phase commit is why this distinction exists — layout effects fire during `commitLayoutEffects`, passive effects fire after the browser paints.
4. **Can React Fiber create race conditions?** → Yes — in concurrent mode, a render may start, be interrupted, and restart. If render logic has side effects (counter increments, module state mutations), the interruption causes those side effects to run multiple times before a commit. `StrictMode` deliberately double-invokes renders in development to surface exactly this.

### vs Alternatives

| React Fiber (concurrent) | React 15 Stack Reconciler | Angular zone.js CD |
|---|---|---|
| Interruptible, priority-based | Synchronous, blocking | Synchronous, zone-patched |
| Complex mental model | Simple, predictable | Predictable with OnPush |
| Required for large interactive apps | Fine for simple apps | Fine for Angular with Signals |

### How to Signal Senior Thinking

> "The key insight for staff-level understanding is that Fiber is a virtual stack machine. React manually manages what the JavaScript call stack would have managed automatically — the difference being that React's explicit linked list gives it control the JS engine doesn't provide: the ability to pause between any two components, prioritize some work over other work, and discard in-progress renders without affecting the committed state. Every React 18 feature is an exercise of this control."

---

## 💻 5. Code Example

```typescript
// ========================
// Demonstrating Fiber's priority system via useTransition
// ========================
import { useState, useTransition, startTransition } from 'react';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const newQuery = e.target.value;

    // URGENT update (high-priority lane): input value reflects immediately
    setQuery(newQuery);

    // LOW-PRIORITY update (transition lane): search results can lag
    startTransition(() => {
      // React Fiber processes this update in a lower-priority lane
      // If user types again before this finishes, this render is ABANDONED
      // The abandoned work-in-progress tree is discarded; new render starts
      const newResults = performSearch(newQuery);
      setResults(newResults);
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending && <span aria-live="polite">Searching...</span>}
      {/* isPending = true while the transition render is in-flight */}
      <SearchResults results={results} />
    </>
  );
}

// ========================
// Fiber's double-buffering visible in StrictMode
// ========================
function ComponentWithSideEffect() {
  // In StrictMode + React 18: this body may execute TWICE per mount
  // React renders, discards WIP tree, renders again to detect impurity
  console.log('render');   // appears twice in dev, once in production

  const [count, setCount] = useState(() => {
    // Lazy initializer: also called twice in StrictMode dev
    // Must be pure — no observable side effects
    return computeInitialCount();  // must be idempotent
  });

  return <div>{count}</div>;
}

// ========================
// useLayoutEffect vs useEffect — Fiber commit phase timing
// ========================
function MeasureComponent() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Fires during commitLayoutEffects — BEFORE browser paint
  // Reads layout synchronously, updates state → triggers synchronous re-render
  // Use for DOM measurements that must happen before paint to avoid visual flicker
  useLayoutEffect(() => {
    if (ref.current) {
      setHeight(ref.current.getBoundingClientRect().height);
    }
  }, []);

  // Fires AFTER browser paint — asynchronously
  // Use for subscriptions, analytics, non-visual side effects
  useEffect(() => {
    console.log('Component mounted and painted');
  }, []);

  return (
    <div ref={ref}>
      <p>Height: {height}px</p>
    </div>
  );
}
```

**Interview vs Production difference:**
In an interview, explain the two phases + priority lanes + double buffering. In production, add `useTransition` for any state updates that produce slow renders, profile with React DevTools Profiler to identify components in the critical path, and ensure render functions are pure.

---

## 🧠 6. Memory Aid

**Mental Model:** Fiber is like a task manager. The old Stack Reconciler was like a single-threaded batch job — all or nothing, can't interrupt. Fiber is like a preemptive scheduler — each component is a task unit, tasks have priorities, the scheduler can pause a low-priority task when a high-priority one arrives, save the position in the task queue, and resume later.

**If you go blank:** "Fiber replaces recursive rendering with an interruptible loop over a linked list. Each component = one fiber node. Render phase: async, can pause. Commit phase: synchronous, never interrupted. This enables React 18's concurrent features: `startTransition`, `Suspense`, time-slicing."

**Mnemonic:** **PILE** — **P**ausable loop, **I**nterruptible render phase, **L**inked list of work units, **E**nables concurrent mode.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Fiber enables React 18's concurrent features — without Fiber, `startTransition`, `Suspense`, and streaming SSR would be architecturally impossible
→ Performance: Interruptible rendering keeps the main thread available for user input during large tree updates — the difference between a responsive and janky interface at scale
→ Foundation: Every React optimization pattern (`useMemo`, `useCallback`, `React.memo`, `useTransition`) only makes sense in the context of how Fiber schedules and processes work

**How it works (3 sentences):**
Fiber replaces React's old synchronous recursive reconciler with an explicit linked list of fiber nodes — one per component — that React traverses in a pausable loop, allowing the Scheduler to interrupt the render phase between any two components when the 5ms time budget expires and yield back to the browser. Each fiber stores all state (`memoizedState` for hook linked list), pending work (`pendingProps`, `flags`), and tree pointers (`child`, `sibling`, `return`) to enable resumption, and every fiber has an `alternate` pointer to its twin in the double-buffered "current" vs "work-in-progress" tree, letting React discard in-progress renders without affecting the committed tree. The render phase (reconciliation) is async and interruptible, allowing priority lanes to determine which updates process first; the commit phase (DOM mutation, layout effects) is always synchronous and never interrupted so the DOM is never left in a partial state.

**Company relevance:**
- Microsoft: Office Online and Teams collaborative editor rely on Fiber's concurrent scheduling — incoming remote character insertions run in a lower priority lane than the local user's typing; the result is zero-latency local typing even under high collaborative traffic
- Adobe: Photoshop Web's tool render pipeline uses `startTransition` for layer panel updates while brush stroke canvas rendering stays in high-priority Sync lane; Fiber's lane system makes this paint-first, data-second ordering possible
- Salesforce: Tableau's filter pipeline wraps state updates in `startTransition`; the existing chart remains visible and interactive while the new filtered data processes in background fiber work; without Fiber this would be a blocking rerender
- Cisco: WebEx participant grid layout changes (16-person gallery, speaker view) are `startTransition` updates; active speaker highlighting and audio level indicators are in high-priority sync lanes; Fiber ensures audio UI is always instant while layout recalculation is deferred

---
✅ Topic 81/486 complete → Continuing to Topic 82: Reconciliation Algorithm — How React Diffs the Virtual DOM
