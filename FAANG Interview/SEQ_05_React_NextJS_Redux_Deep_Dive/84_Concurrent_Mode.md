# 84. Concurrent Mode — What Changes Under the Hood
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Concurrent Mode is not a single feature — it's React's ability to prepare multiple UI states simultaneously without committing any of them to the DOM, and to interrupt, pause, or discard in-progress renders when higher-priority work arrives. It's enabled by `createRoot()` in React 18. The concrete features it unlocks are: `startTransition` / `useTransition` (interruptible renders), `useDeferredValue` (deferred re-renders), `Suspense` with streaming (show fallback while content loads without blocking), and automatic batching (all `setState` calls — even in async code — are now batched by default). The key semantic change: rendering a component no longer means it will definitely hit the DOM — React may render it, discard the result, and re-render with different data. This means effects must be idempotent, and setup/teardown symmetry (StrictMode's double invocation checks for this) is required.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Enabling Concurrent Mode: `createRoot`

```typescript
// React 17 (legacy mode — synchronous rendering)
import { render } from 'react-dom';
render(<App />, document.getElementById('root'));
// Every setState → synchronous render → synchronous commit
// No interruptibility, no concurrent features

// React 18 (concurrent mode — default)
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
// setState → fiber work loop → scheduler → potentially interruptible
// All concurrent features unlocked
```

**`root.render()` vs legacy `render()`:**
- Legacy: Always `SyncLane` → immediate synchronous commit
- Concurrent: Schedules via Scheduler → can be SyncLane or TransitionLane depending on trigger context

### What Actually Changes in the Rendering Model

**Legacy (synchronous):** 
```
trigger setState → beginWork (sync) → commitWork (sync) → browser paints
           ^—— entire process blocks main thread ——^
```

**Concurrent:**
```
trigger setState → schedule (lanes) → work loop (interruptible, 5ms slices)
                                          ↓
                              if HIGHER priority work arrives:
                              pause/abort WIP tree
                              run high-priority work
                              resume/restart WIP tree
                                          ↓
                              if WIP tree complete:
                              commit (SYNC, NOT interruptible)
                              browser paints
```

**Critical:** The commit phase is NEVER interrupted even in concurrent mode. Once React enters `commitMutationEffects`, it runs to completion. Only the **render phase** is interruptible.

### Automatic Batching — The Biggest Practical Change

In React 17, batching only happened inside React event handlers:

```typescript
// React 17
setTimeout(() => {
  setCount(c => c + 1);  // triggers re-render
  setFlag(f => !f);       // triggers ANOTHER re-render
  // 2 renders! Not batched because we're outside React's event handler
}, 1000);

// React 17 in React event handler
function handleClick() {
  setCount(c => c + 1);  // batched
  setFlag(f => !f);       // batched — only 1 render
}
```

In React 18 with `createRoot`, **all** `setState` calls are batched by default, regardless of context (setTimeout, Promise.then, native event handlers, WebSocket callbacks):

```typescript
// React 18 — automatic batching everywhere
setTimeout(() => {
  setCount(c => c + 1);  // batched
  setFlag(f => !f);       // batched — only 1 render
}, 1000);

// To opt out of batching (rare):
import { flushSync } from 'react-dom';
flushSync(() => {
  setCount(c => c + 1);  // immediate sync render
});
flushSync(() => {
  setFlag(f => !f);       // another immediate sync render
});
// 2 renders — flushSync forces each to commit synchronously
```

**Why automatic batching matters for Hruday:**
At Bosch, WebSocket message handlers called multiple `setState` calls (chart data + error state + timestamp). In React 17, each WebSocket message triggered multiple renders. Upgrading to React 18 with `createRoot` auto-batched these — exactly 1 render per WebSocket message. No code change required.

### Transitions — The Signature Concurrent Feature

`startTransition` marks state updates as "non-urgent." The Scheduler assigns them `TransitionLane` + `NormalPriority`. The render loop for transitioned updates checks `shouldYield()` at every fiber, making it interruptible:

```typescript
// What "interruptible" means in practice:
function LiveSearch({ data }: { data: string[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);  // SyncLane — always runs immediately

    startTransition(() => {
      // TransitionLane — React starts this work
      // If user types AGAIN before this render finishes:
      // → React DISCARDS this in-progress render (WIP tree)
      // → Starts fresh with the latest query value
      // → User never sees intermediate stale results
      setResults(filterData(data, e.target.value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleInput} />
      {isPending && <LoadingSpinner />}  {/* shown while transition is pending */}
      <SearchResults results={results} />
    </>
  );
}
```

### `useDeferredValue` — Deferred Without Controlling State

When the data source is outside your control (prop from parent, context, external state):

```typescript
// ParentComponent controls `list` state — you can't wrap it in startTransition
function ExpensiveListContainer({ list }: { list: Item[] }) {
  // deferredList is BEHIND list by at most 1 frame
  // When list changes, the component initially renders with old deferredList
  // React schedules a low-priority re-render with the new deferredList
  const deferredList = useDeferredValue(list);
  const isStale = list !== deferredList;  // referential equality

  return (
    <>
      {isStale && <ProgressBar />}
      <ExpensiveList items={deferredList} />
    </>
  );
}
```

**`useDeferredValue` vs `useTransition`:**

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| Who controls state | You call `startTransition(fn)` | Parent/external controls state |
| What defers | The state update itself | A value after it changes |
| Pending state | `isPending` boolean | Manual stale check (`val !== deferred`) |
| Mechanism | `TransitionLane` update | Re-renders old, schedules deferred re-render |

### Suspense in Concurrent Mode — Streaming & Coordination

In legacy React, `Suspense` only worked with `React.lazy` (code splitting). In concurrent mode, it's extended to data fetching and streaming:

```typescript
// Concurrent Suspense with data fetching (via framework integration)
function UserProfile({ userId }: { userId: string }) {
  // This will "suspend" — throw a Promise — until user data is available
  // React catches the Promise, shows the nearest Suspense fallback
  // When Promise resolves, React re-renders UserProfile
  const user = use(fetchUser(userId));

  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userId="123" />
      <UserPosts userId="123" />
    </Suspense>
  );
}
// Concurrent mode: both UserProfile and UserPosts render in parallel
// React renders as much as possible without suspending
// Shows fallback only when necessary
// Reveals components together when ALL are ready (avoid layout flash)
```

**`SuspenseList` for coordinated reveals:**
```typescript
<SuspenseList revealOrder="forwards" tail="collapsed">
  <Suspense fallback={<Skeleton />}>
    <ProfileCard />
  </Suspense>
  <Suspense fallback={<Skeleton />}>
    <ActivityFeed />
  </Suspense>
  <Suspense fallback={<Skeleton />}>
    <Recommendations />
  </Suspense>
</SuspenseList>
// Reveals ProfileCard → ActivityFeed → Recommendations in ORDER
// Even if Recommendations loads first, waits for earlier siblings
// "tail: collapsed" — shows only one fallback skeleton at a time
```

### StrictMode and Concurrent Mode

In concurrent mode, React may invoke the render function multiple times before committing. StrictMode makes this explicit in development:

- **Double invocation:** function components, state initializers, reducers, and some event handlers are called twice in development. React runs, discards the first result, and uses the second. This catches side effects in render.
- **Why:** In concurrent mode, React may render a component on one render pass, then pause, then re-render from a different state. A component that only renders purely (no write to external variables) is safe. A component that increments a counter on every render would double-count. StrictMode's double invocation surfaces these bugs in development.

```typescript
// ❌ Impure render — caught by StrictMode double invocation
let renderCount = 0;
function ImpureComponent() {
  renderCount++;  // external mutation in render
  return <div>Rendered {renderCount} times</div>;
  // StrictMode: shows "2" after first mount — revealing the impurity
}

// ✅ Pure render — StrictMode double invocation is safe
function PureComponent({ count }: { count: number }) {
  return <div>{count * 2}</div>;
  // Calling this twice with same count gives same output — pure
}
```

### When Not to Use Concurrent Mode Features

- **`flushSync` for animation frames:** If you're positioning an element based on a measurement (like `getBoundingClientRect`), you need synchronous rendering before the read. `flushSync` forces this.
- **Third-party DOM libraries:** jQuery plugins, D3 direct DOM manipulation — they rely on synchronous rendering. Wrapping their state updates in `flushSync` ensures React commits before the library reads the DOM.
- **Critical path first render:** For the initial page load, purely synchronous rendering can be slightly faster (no scheduler overhead). React automatically uses SyncLane for first renders.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the upgrade from React 17 to React 18 with `createRoot` had an immediate automatic batching benefit — multiple `setState` calls in HTTP response handlers that were causing unnecessary multiple re-renders (visible as flickering during data loads) were auto-batched without code changes. The dashboard went from 3 renders per API response to 1.

At Oracle, a complex search-filter UI was updated to use `useTransition` for the filter application step. Before: applying a filter on a 5,000-row dataset caused 250ms of jank (input was unresponsive). After: filter state was wrapped in `startTransition` — input stayed responsive, `isPending` showed a subtle spinner, and the filtered results appeared asynchronously without blocking.

**At FAANG scale:**
- **Microsoft (Office Online):** Document editor concurrent rendering — `useTransition` wraps spell-check state updates; SpellCheck suggestions render at low priority while typing on SyncLane remains fluid
- **Adobe (Creative Cloud web):** Asset library search — `useDeferredValue` on the asset list defers the expensive grid re-render while the search query updates synchronously
- **Salesforce (Einstein Copilot):** AI response streaming — Suspense with streaming renders each streamed chunk as it arrives, progressive display without blocking user input
- **Cisco (Security Analytics):** Real-time threat feed — automatic batching handles rapid threat event state updates; `useTransition` for threat details panel preserves threat list responsiveness

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "Concurrent mode in React 18 is fundamentally about two things: the ability to interrupt renders in progress, and the ability to prepare multiple UI states without committing them.
>
> The key enabling mechanism is `createRoot` — it activates the concurrent Scheduler. Once active, you get automatic batching for free (all setState calls batch everywhere, not just event handlers), plus the opt-in concurrent features: `startTransition` for interruptible renders, `useDeferredValue` for deferring a value, and Suspense for coordinated loading states.
>
> The most important constraint to understand is that only the render phase is interruptible. The commit phase always runs synchronously to completion. This means effects must be idempotent, because a component may render multiple times before committing — which is also what StrictMode's double invocation is verifying.
>
> In practice, the wins come from `startTransition` for expensive UI updates that can tolerate a few frames of delay — search results, filter applications, list sorting — and from automatic batching, which silently fixes a class of unnecessary re-render bugs."

### Likely Follow-up Questions

1. **Is React 18 concurrent mode opt-in or opt-out?** → Opt-in via `createRoot`. Upgrading the `react` package to v18 doesn't change behavior if you keep using legacy `render()`. You must switch to `createRoot` to get concurrent behavior. The upgrade path is intentionally non-breaking.
2. **What breaks when migrating to concurrent mode?** → Side effects in render (direct DOM mutation, external state writes, API calls in render body). Also: libraries that depend on synchronous rendering timing (direct DOM measurements between renders). The StrictMode double invocation catches render-side-effect bugs.
3. **What does React render "in parallel" mean?** → Not parallel in threading terms. React can prepare multiple version of the UI state on the same thread — a committed UI and a WIP transition render at the same time. One is "on screen" (current tree), one is "being prepared" (WIP tree). They alternate via the double-buffering pattern (fiber `alternate` pointer). Not true parallelism — cooperation via yielding.
4. **Does concurrent mode affect SSR?** → Yes — React 18 SSR with `renderToPipeableStream` / `renderToReadableStream` uses Suspense for streaming HTML with progressive hydration. Concurrent mode on the client enables hydration interruptibility (React can pause hydration to handle user input).

### Senior Signal

> "The semantic change that concurrent mode introduces is critically important to communicate in an interview: the contract that 'render → commit is atomic and immediate' is broken. A render may be abandoned. A component may re-render more than once for a single eventual commit. This means every assumption based on 'render happens exactly once per setState call' must be re-examined. Effects must no longer be treated as 'cleanup optional — they only run once.' The StrictMode changes in React 18 dev mode (strict effects — mount, unmount, re-mount) are specifically designed to surface this class of bug. For senior engineers, this is the crucial mental shift concurrent mode demands."

---

## 💻 5. Code Example

```typescript
import React, {
  useState, useTransition, useDeferredValue, Suspense,
  startTransition, useEffect
} from 'react';
import { createRoot, flushSync } from 'react-dom/client';

// ========================
// 1. Enabling concurrent mode
// ========================
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// StrictMode: double-invokes renders/effects in dev to surface impurities
// createRoot: opts into concurrent scheduler

// ========================
// 2. Automatic batching — no code changes needed
// ========================
function AutoBatchingDemo() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  useEffect(() => {
    // React 18: both setA and setB batch → 1 render
    // React 17 (without createRoot): 2 renders
    const timeout = setTimeout(() => {
      setA(1);  // batch starts
      setB(1);  // same batch — 1 combined render
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  // flushSync to opt OUT of batching
  function handleCriticalUpdate() {
    flushSync(() => setA(prev => prev + 1));  // commits immediately
    const domElement = document.getElementById('value-a');
    // domElement.textContent is already updated — safe to read
    flushSync(() => setB(prev => prev + 1));  // commits immediately
  }

  return <div id="value-a">{a} / {b}</div>;
}

// ========================
// 3. Concurrent feature: useTransition for expensive filter
// ========================
interface Employee { id: string; name: string; department: string; }

function EmployeeDirectory({ employees }: { employees: Employee[] }) {
  const [filterText, setFilterText] = useState('');
  const [filteredList, setFilteredList] = useState(employees);
  const [isPending, startTransition] = useTransition();

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFilterText(value);  // SyncLane — input stays responsive

    startTransition(() => {
      // TransitionLane — runs when scheduler has cycles
      // If user types again before this completes: this WIP is discarded
      const filtered = employees.filter(
        emp =>
          emp.name.toLowerCase().includes(value.toLowerCase()) ||
          emp.department.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredList(filtered);
    });
  }

  return (
    <div>
      <input
        value={filterText}
        onChange={handleFilterChange}
        placeholder="Filter employees..."
      />
      {isPending && <div className="loading-bar" />}
      <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 200ms' }}>
        {filteredList.map(emp => (
          <EmployeeCard key={emp.id} employee={emp} />
        ))}
      </div>
    </div>
  );
}

// ========================
// 4. useDeferredValue for prop-driven deferred render
// ========================
function AnalyticsChart({ dataPoints }: { dataPoints: number[] }) {
  // dataPoints comes from parent's state — we can't wrap parent's setState
  // Defer the expensive chart render without touching parent code
  const deferredPoints = useDeferredValue(dataPoints);
  const isStale = dataPoints !== deferredPoints;

  return (
    <div className={`chart-wrapper ${isStale ? 'chart-loading' : ''}`}>
      <Canvas width={800} height={400} data={deferredPoints} />
    </div>
  );
}

// ========================
// 5. Suspense coordination in concurrent mode
// ========================
function Dashboard() {
  return (
    <React.SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<KPISkeleton />}>
        <KPICards />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <MainChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </React.SuspenseList>
    // KPIs reveal first when ready, then Chart, then Table
    // Even if Table loads first, it waits for KPIs and Chart
    // Only one skeleton shown at a time (tail: collapsed)
  );
}

// Placeholder declarations
declare function App(): JSX.Element;
declare function EmployeeCard(props: { employee: Employee }): JSX.Element;
declare function Canvas(props: { width: number; height: number; data: number[] }): JSX.Element;
declare function KPICards(): JSX.Element;
declare function MainChart(): JSX.Element;
declare function DataTable(): JSX.Element;
declare function KPISkeleton(): JSX.Element;
declare function ChartSkeleton(): JSX.Element;
declare function TableSkeleton(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**Mental Model:** Concurrent Mode is React's ability to "draft before publishing." In legacy mode, every render was instantly and irrevocably sent to the printer. In concurrent mode, React can draft a new version, hold it, revise it, or discard it — and only print when it has the final version ready. The `key` insight: draft rendering doesn't appear to the user, but commits do.

**If you go blank:** "createRoot enables it. Automatic batching everywhere. startTransition = interruptible renders. useDeferredValue = deferred re-renders. Commit phase is always synchronous — only render phase is interruptible."

**Mnemonic:** **CATS** — **C**reateRoot enables it, **A**utomatic batching is the free win, **T**ransitions are the primary API, **S**uspense is elevated for streaming/data.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ User experience: Concurrent mode is the technical foundation that separates "good enough" React performance from "buttery smooth" — the difference is whether expensive renders steal input responsiveness
→ Architecture decisions: Knowing when and where to apply concurrent features (not everywhere — `flushSync` still has legitimate uses) requires understanding what concurrent mode actually does, not just what APIs it exposes
→ Upgrade path: For teams upgrading from React 17 to 18, understanding what changing `render` to `createRoot` actually changes is critical for a safe migration

**How it works (3 sentences):**
Concurrent mode is enabled by `createRoot`, which activates the Scheduler for all state updates — instead of synchronously running renders to completion, React slices render work into small units, suspending after each 5ms budget and resuming via `MessageChannel` callbacks, allowing the browser to handle user input and paint between slices. The double-buffering model (current tree + WIP tree via fiber `alternate` pointers) allows React to work on a new version of the UI while the committed version remains on screen — and to discard the WIP tree entirely if a higher-priority update invalidates the in-progress work. Automatic batching (all `setState` calls merge within the same task), `startTransition` / `useTransition` (interruptible mid-priority renders), `useDeferredValue` (deferred low-priority re-renders), and Suspense streaming are all built on this single concurrent scheduling primitive.

**Company relevance:**
- Microsoft: Visual Studio Online IDE — concurrent rendering allows code indexing and linting indicators to update on TransitionLane, keeping the editor input on SyncLane; large files stay editable during heavy analysis
- Adobe: Photoshop Web layer panel — layer operations (merge, group, transform) update the canvas on TransitionLane; tool state input remains on SyncLane and never blocks during complex layer operations
- Salesforce: Flow Builder canvas — complex workflow diagram re-renders on TransitionLane; node drag interactions always on SyncLane giving fluid drag even on 200-node flows
- Cisco: Network topology visualizer — graph layout recalculation (CPU-heavy D3 + React hybrid) on TransitionLane; node selection and hover state on SyncLane ensuring topology UX feels instant

---
✅ Topic 84/486 complete → Continuing to Topic 85: Commit Phase vs Render Phase — Side Effects Timing
