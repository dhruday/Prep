# 128. React Performance — Profiler, DevTools, Metrics
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React performance measurement has two layers: **React DevTools Profiler** (identifies slow components, unnecessary re-renders, long render times) and **browser performance tools** (Lighthouse, Chrome Performance panel, Core Web Vitals — measures real user impact). The React `<Profiler>` component provides programmatic measurement: it calls a callback with every render's `actualDuration` (time rendering the component tree), `baseDuration` (estimated time without memoization), `startTime`, and `commitTime`. The workflow is: measure first → identify the bottleneck (wasted renders vs. expensive computation) → apply the targeted fix (`React.memo` / `useMemo` / `useCallback` / `lazy`) → measure again to confirm improvement. Optimizing without measuring is premature optimization — the fix often targets the wrong component.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### React DevTools Profiler — Reading the Data

```
React DevTools Profiler shows:
  ┌─────────────────────────────────────────────────────────┐
  │ Commit #12  Duration: 45ms  Interactions: click         │
  │                                                         │
  │ [ProductList  4.2ms  ██████████]  ← re-rendered         │
  │   [ProductCard  0.3ms]  ← re-rendered (×30)             │
  │   [ProductCard  0.3ms]                                  │
  │   [AddToCartButton  0.1ms]                              │
  │ [SearchBar  38.2ms  ██████████████████████]  ← SLOW!    │
  │   [Autocomplete  37.1ms]  ← culprit                     │
  └─────────────────────────────────────────────────────────┘

Key metrics:
- actualDuration:  time spent rendering this commit (including children)
- baseDuration:    estimated time WITHOUT memoization (shows memoization ROI)
- If actualDuration << baseDuration: React.memo/useMemo is working
- If they're equal: no memoization active (or memoization is missing/broken)

Color code:
- Grey:   didn't render this commit
- Yellow: rendered but not slow
- Red/orange: slow — investigate
```

### React `<Profiler>` Component

```typescript
import { Profiler, type ProfilerOnRenderCallback, useState } from 'react';

// ProfilerOnRenderCallback type:
type ProfilerCallback = (
  id: string,               // Profiler id prop
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,   // ms spent rendering the commit
  baseDuration: number,     // estimated ms without memoization
  startTime: number,        // when React started rendering
  commitTime: number,       // when React committed the update
) => void;

const onRenderCallback: ProfilerCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // Only log slow renders (> 16ms = below 60fps)
  if (actualDuration > 16) {
    console.warn(`[Profiler] Slow render: ${id} - ${actualDuration.toFixed(2)}ms (${phase})`);
  }

  // Send to monitoring (production profiling — use sparingly, has overhead)
  if (process.env.NODE_ENV === 'production' && actualDuration > 100) {
    sendPerformanceMetric({
      component: id,
      phase,
      actualDuration,
      baseDuration,
      memoizationSavings: baseDuration - actualDuration,
    });
  }
};

// Wrap slow subtrees to measure:
export function ProductListWithProfiling({ products }: { products: Product[] }) {
  return (
    <Profiler id="ProductList" onRender={onRenderCallback}>
      <ProductList products={products} />
    </Profiler>
  );
}

// Nest Profilers to isolate:
export function Dashboard() {
  return (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      <Profiler id="Dashboard.Header" onRender={onRenderCallback}>
        <Header />
      </Profiler>
      <Profiler id="Dashboard.Content" onRender={onRenderCallback}>
        <Content />
      </Profiler>
    </Profiler>
  );
}
```

### Identifying Wasted Renders

```typescript
// React DevTools: "Highlight updates" mode
// Every component that re-renders flashes — if components flash unexpectedly,
// something above them is creating new object/array/function references on every render

// WHY-DID-YOU-RENDER — library for detecting unnecessary renders
// Install: npm install -D @welldone-software/why-did-you-render
// Setup (in _app.tsx or similar bootstrap file, DEV ONLY):
import React from 'react';
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: false,  // ONLY track components you opt in:
  });
}

// On components you want to track:
function ProductCard({ product }: { product: Product }) {
  return <div>{product.name}</div>;
}
// Static property to opt this component into WDYR tracking:
ProductCard.whyDidYouRender = true;

// WDYR will log to console:
// ProductCard re-rendered because:
//   prev props: { product: { id: '1', name: 'Shoes' } }
//   next props: { product: { id: '1', name: 'Shoes' } }
//   reason: different object references (but same values)
// → This tells you: parent is creating a new product object on each render
// → Fix: memoize the product object, or useCallback/useMemo in parent
```

### Chrome Performance Panel — Long Tasks

```
Performance panel workflow:
1. Open DevTools → Performance tab
2. Click Record
3. Perform the interaction (click, type, navigate)
4. Stop recording

Read the flame chart:
  Flame chart:  shows call stack over time
  Long Task:     any task > 50ms = red box at top
  
  ┌─────────────────────────────────────────────────────────┐
  │ Main Thread                                             │
  │ [Long Task 87ms]                                        │
  │   [React - handleClick]                                 │
  │     [renderWithHooks]                                   │
  │       [ProductList - render]                            │
  │         [sort()]  ← 72ms!  expensive in render          │
  └─────────────────────────────────────────────────────────┘

Fix: memoize the sort:
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.price - b.price),
    [products]
  );
```

### Scheduling API — Breaking Up Long Tasks

```typescript
// React 18: startTransition for non-urgent updates
import { startTransition, useState } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Urgent: update input value immediately
    setQuery(e.target.value);

    // Non-urgent: search results can be deferred
    startTransition(() => {
      setResults(expensiveSearch(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {/* results update is interruptible — typing doesn't feel blocked */}
      <SearchResults results={results} isPending={false} />
    </>
  );
}

// useTransition: get isPending state to show loading indicator
import { useTransition } from 'react';

function TabSwitcher() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview');

  return (
    <>
      <button
        onClick={() => startTransition(() => setTab('analytics'))}
        aria-busy={isPending}
        disabled={isPending}
      >
        {isPending ? 'Loading...' : 'Analytics'}
      </button>
      {tab === 'analytics' ? <Analytics /> : <Overview />}
    </>
  );
}

// useDeferredValue: defer expensive derived state (like startTransition but for values)
import { useDeferredValue, memo } from 'react';
const ExpensiveList = memo(function ExpensiveList({ query }: { query: string }) {
  // This computation only runs when deferred value settles
  const filtered = hugeList.filter(item => item.includes(query));
  return <ul>{filtered.map(item => <li key={item}>{item}</li>)}</ul>;
});

function SearchWithDeferred() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);  // lags behind query during typing
  
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* ExpensiveList only re-renders when user stops typing (deferredQuery settles) */}
      <ExpensiveList query={deferredQuery} />
    </>
  );
}
```

### Performance Metrics to Track in Production

```typescript
// Custom metrics via Performance API
function measureTTI() {
  // PerformanceObserver: watch for long tasks to infer TTI
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`Long task: ${entry.duration}ms at ${entry.startTime}ms`);
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}

// React-specific custom metric: measure time to interactive within React app
function measureReactHydration() {
  // Mark when hydration starts:
  performance.mark('hydration-start');

  // In root component's useEffect (fires after hydration):
  useEffect(() => {
    performance.mark('hydration-end');
    performance.measure('react-hydration', 'hydration-start', 'hydration-end');
    const [measure] = performance.getEntriesByName('react-hydration');
    console.log(`Hydration: ${measure.duration.toFixed(2)}ms`);
    performance.clearMarks();
    performance.clearMeasures();
  }, []);
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product listing page had a 400ms click-to-response time on filter change. Chrome Performance panel showed a 380ms long task: opening flame chart revealed a `sort()` inside the `ProductList` render function (not memoized), sorting 1,200 items on every render including unrelated parent re-renders. Adding `useMemo` for the sort reduced the long task to 12ms. whyDidYouRender then revealed `ProductCard` was still re-rendering unnecessarily because the parent was creating a new `handlers` object on every render — wrapping with `React.memo` + `useCallback` on the handlers eliminated 1,200 × 2ms = wasted 2.4 seconds per interaction cycle.

**At FAANG scale:**
- **Microsoft:** React DevTools Profiler built into the internal Azure dev portal build pipeline — slow renders (> 50ms) automatically generate Slack alerts with component name and actualDuration; engineers fix before merge
- **Adobe:** whyDidYouRender enabled in Storybook stories for all design system components — every PR checks that component re-renders are justified, preventing design system consumers from hitting performance regressions
- **Salesforce:** `startTransition` wrapping all filter/sort state updates in the CRM list views — search input responds instantly at 60fps even with 10,000 record virtual lists
- **Cisco:** Custom `<Profiler>` wrapper around network topology visualization components — `actualDuration` vs `baseDuration` ratio tracked in Datadog; ratio > 0.8 (memoization saving < 20%) triggers automated tech debt tickets

---

## 💬 4. Interview Execution

### Sample Answer

> "My React performance diagnostic workflow is: measure → identify bottleneck type → apply targeted fix → re-measure.
>
> In React DevTools Profiler I look at `actualDuration` vs `baseDuration`. If `actualDuration` is much less than `baseDuration`, memoization is working well. If they're equal, memoization isn't active or is broken — usually because a prop is a new object/array reference every render.
>
> For detecting unnecessary re-renders: `whyDidYouRender` is the best tool — it tells you exactly which props changed and whether they were value-identical but reference-different objects, which is the most common cause of wasted renders.
>
> For long tasks — things that block the main thread and cause INP issues — I use the Chrome Performance panel's flame chart to find the expensive call within a render. Common culprits: array sorts or filters in component bodies (should be `useMemo`), expensive selectors not memoized with `createSelector`, or synchronous computations on large datasets.
>
> For state updates that cause janky typing or scrolling, `startTransition` marks them as non-urgent so React can interrupt them to handle urgent input events first."

---

## 💻 5. Code Example

```typescript
// Complete performance monitoring setup
// lib/profiling.tsx

import { Profiler, type ProfilerOnRenderCallback } from 'react';

const onRender: ProfilerOnRenderCallback = (id, phase, actual, base) => {
  // Only warn about genuinely slow renders
  if (actual > 16) {
    console.warn(`⚠️ Slow render [${id}] ${phase}: ${actual.toFixed(1)}ms (base: ${base.toFixed(1)}ms)`);
  }
};

export function withProfiling<T extends object>(
  Component: React.ComponentType<T>,
  profileId: string
) {
  return function ProfiledComponent(props: T) {
    return (
      <Profiler id={profileId} onRender={onRender}>
        <Component {...props} />
      </Profiler>
    );
  };
}

// Usage:
const ProfiledProductList = withProfiling(ProductList, 'ProductList');

// ---- useDeferredValue example ----
import { useState, useDeferredValue, memo } from 'react';

const FilteredList = memo(function FilteredList({ query }: { query: string }) {
  // expensive: only runs when deferredQuery settles
  const results = items.filter(i =>
    i.name.toLowerCase().includes(query.toLowerCase())
  );
  return <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
});

export function SearchableList() {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const isStale = deferred !== query;

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        <FilteredList query={deferred} />
      </div>
    </>
  );
}

const items: { id: string; name: string }[] = [];
```

---

## 🧠 6. Memory Aid

**MILD — the profiling workflow:**
- **M**easure first: Profiler, Chrome Performance, DevTools
- **I**dentify: wasted re-renders (WDYR) vs expensive computation (flame chart)
- **L**everage the right fix: memo/useMemo/useCallback vs startTransition/useDeferredValue
- **D**one: re-measure to confirm

**Two categories of React perf problems:**
1. Wasted renders: component re-renders but output unchanged → React.memo + stable refs
2. Expensive renders: component re-renders and the computation is slow → useMemo for computation, startTransition for non-urgent state

**Mnemonic:** **MILD** — Measure, Identify, Leverage fix, Done. Never fix before you Measure.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ "How do you diagnose React performance issues?" is a universal senior interview question — having a specific workflow (measure → DevTools Profiler → WDYR → flame chart → targeted fix → re-measure) with specific tool names and anecdotes shows operational experience vs. theoretical knowledge
→ The `actualDuration` vs `baseDuration` relationship in the Profiler API is a non-obvious insight — most candidates only know "use Profiler to find slow components" but don't know what baseDuration means or how to read the memoization signal; articulating this demonstrates depth
→ `startTransition` and `useDeferredValue` are React 18 APIs that most candidates have heard of but confuse — being able to explain when to use each (startTransition = wrapping non-urgent setState calls; useDeferredValue = deferring a derived value without controlling the original setter) shows React 18 fluency

**How it works (2 sentences):**
React's `<Profiler>` component uses the browser's `performance.now()` API to record timestamps at the start and end of each render pass — `actualDuration` is the measured wall-clock time of the commit, `baseDuration` is estimated by recursively summing each fiber node's `selfBaseDuration` (the time to render that node without any memoization), so if `actualDuration < baseDuration`, it means memo/useMemo bailed out on some subtrees and prevented work, saving `baseDuration - actualDuration` milliseconds.
`startTransition` works by setting a flag on the React scheduler: state updates inside the transition callback are scheduled at "transition" priority (lower than "user input" and "default" priorities), meaning if a higher-priority update arrives (like another keystroke), React will pause the ongoing transition render, process the urgent update, then resume the transition — this is React's concurrent rendering at work, where the fiber tree can be partially rendered and then interrupted or discarded without the user seeing an inconsistent UI.

---
✅ Topic 128/486 complete → Continuing to Topic 129: Code Splitting — React.lazy, Suspense, Dynamic Import
