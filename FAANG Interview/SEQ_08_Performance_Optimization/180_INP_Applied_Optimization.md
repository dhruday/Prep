# 180. Interaction to Next Paint (INP) — Applied Optimization
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"INP — Interaction to Next Paint — measures the 98th percentile of all interaction latencies on a page: clicks, keyboard presses, and touch events. It replaced FID as a Core Web Vital in March 2024 because FID only measured the first interaction's input delay, while INP captures the full responsiveness pattern throughout the session. The threshold is 200ms: interactions under 200ms feel instant. Every millisecond above 200ms degrades perceived performance, with 500ms being 'poor'. INP has three phases: Input Delay (from user gesture to event handler start), Processing Time (event handler execution), and Presentation Delay (handler done to browser paint). The most common cause at SAP was long synchronous event handlers — dispatching a Redux action that triggered a saga chain of 8 synchronous operations. The fix was moving non-visual work to the background: dispatch the action, return synchronously to paint the optimistic UI change immediately, then let the side effects run asynchronously. Processing time dropped from 280ms to 18ms, and INP went from 340ms to 90ms."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### INP Phase Breakdown

```
User taps/clicks
│
├─── Input Delay Phase ──────────────────────────────────────────────────────
│    │
│    │  Causes of long input delay:
│    │  • Long task running when input arrives (most common)
│    │  • Synchronous timer callbacks blocking the queue
│    │  • Third-party scripts hogging the main thread
│    │
│    └─ Event handler starts  [target: < 50ms]
│
├─── Processing Time Phase ──────────────────────────────────────────────────
│    │
│    │  Causes of long processing time:
│    │  • Expensive calculations in event handler
│    │  • Synchronous Redux dispatch + sagas
│    │  • Large state update triggering massive re-render
│    │  • Synchronous layout reads in handler (getBoundingClientRect, offsetHeight)
│    │
│    └─ Event handler returns [target: < 100ms]
│
└─── Presentation Delay Phase ───────────────────────────────────────────────
     │
     │  Causes of long presentation delay:
     │  • Handler returns but rendering pipeline backed up
     │  • RequestAnimationFrame scheduled but busy
     │  • Too many DOM nodes to lay out
     │  • CSS animations blocking compositor
     │
     └─ Browser paints new frame  [target: < 50ms]

Total INP = Input Delay + Processing Time + Presentation Delay
Target: < 200ms
```

### Diagnosing INP Issues

**Step 1: Measure with web-vitals attribution**
```typescript
import { onINP } from 'web-vitals/attribution';

onINP(({ value, attribution, rating }) => {
  const {
    interactionType,      // 'pointer' | 'keyboard' | 'drag'
    interactionTarget,    // CSS selector of element interacted with
    eventEntry,           // PerformanceEventTiming entry
    processingStart,      // when handler started
    processingEnd,        // when handler finished
    nextPaintTime,        // when browser painted the next frame
  } = attribution;

  const inputDelay     = processingStart! - (eventEntry?.startTime ?? 0);
  const processingTime = processingEnd!   - processingStart!;
  const presentDelay   = nextPaintTime!   - processingEnd!;

  console.log(`INP: ${value}ms (${rating})
  Interaction: ${interactionType} on ${interactionTarget}
  Input Delay:    ${inputDelay.toFixed(1)}ms
  Processing:     ${processingTime.toFixed(1)}ms
  Presentation:   ${presentDelay.toFixed(1)}ms`);

  // Send to RUM backend
  navigator.sendBeacon('/telemetry/inp', JSON.stringify({
    value, rating,
    interactionType,
    interactionTarget,
    inputDelay: Math.round(inputDelay),
    processingTime: Math.round(processingTime),
    presentDelay: Math.round(presentDelay),
    url: location.pathname,
  }));
});
```

**Step 2: Chrome DevTools — Performance panel**
```
Record → interact → stop

Look for:
1. "Long task" badge (red triangle) on main thread timeline
2. Long "Event" bar in the Interactions track
3. The gap between "Event" end and next "Frame" in Frames track

Click the red task → call stack shows which function dominated
```

**Step 3: LoAF scripts array for production attribution**
```typescript
// Already covered in Topic 179 — combine with INP attribution:
// match LoAF blockingDuration to INP input delay for root cause

function correlateINPwithLoAF(inpStartTime: number): string | null {
  const entries = performance.getEntriesByType('long-animation-frame') as PerformanceLoAFEntry[];
  const matching = entries.find(e =>
    e.startTime <= inpStartTime && (e.startTime + e.duration) >= inpStartTime
  );

  if (!matching) return null;

  const topScript = matching.scripts.sort((a, b) => b.duration - a.duration)[0];
  return topScript
    ? `${topScript.sourceURL?.split('/').pop()}::${topScript.sourceFunctionName}`
    : null;
}
```

### Fix Phase 1 — Reducing Input Delay

Input delay is caused by a long task running when the user interacts. The fix is to ensure there are no long tasks on the main thread during interaction windows:

```typescript
// Cause: Third-party script runs 150ms on page load, delays first interaction
// Fix 1: Defer third-party scripts
<script src="third-party.js" defer></script>  // or
<script src="third-party.js" async></script>

// Fix 2: Load non-critical scripts in requestIdleCallback
requestIdleCallback(() => {
  const script = document.createElement('script');
  script.src = 'chat-widget.js';
  document.body.appendChild(script);
}, { timeout: 5000 });

// Fix 3: Use Partytown for isolating third-party scripts in a Web Worker
// (Partytown intercepts third-party calls and runs them off main thread)
```

### Fix Phase 2 — Reducing Processing Time

**Pattern A: Optimistic UI — return visual update immediately**

```typescript
// ❌ BEFORE: event handler does everything synchronously before painting
function handleAddToCart(productId: string): void {
  // All of this runs before the browser can paint the button animation:
  const cart = calculateNewCart(productId);      // 30ms
  updateLocalStorage(cart);                       // 20ms
  dispatchReduxAction({ type: 'ADD_TO_CART', cart }); // triggers 8 sagas: 150ms
  updateBadgeCount(cart.totalItems);             // 5ms
  // Total: 205ms before any visual feedback
}

// ✅ AFTER: paint immediately, do expensive work asynchronously
function handleAddToCartOptimistic(productId: string): void {
  // Phase 1: Synchronous minimum for visual feedback (~5ms)
  incrementCartBadgeOptimistically(); // immediate visual response

  // Phase 2: Yield, then do expensive work in next task
  // User sees the button animation and badge increment BEFORE this runs
  setTimeout(() => {
    const cart = calculateNewCart(productId);
    updateLocalStorage(cart);
    store.dispatch({ type: 'ADD_TO_CART', cart });
    // Revert optimistic update if server fails
  }, 0);
}
```

**Pattern B: useTransition for non-urgent state updates (React 18+)**

```typescript
import { useTransition, useState } from 'react';

function SearchableList({ items }: { items: Product[] }) {
  const [query, setQuery] = useState('');
  const [displayedItems, setDisplayedItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;

    // Urgent: update the input value immediately (user sees what they typed)
    setQuery(value);

    // Non-urgent: defer the expensive filter operation
    // React will render the input update first, then start the filter
    // If a new keystroke arrives mid-filter, React cancels and restarts
    startTransition(() => {
      const lower = value.toLowerCase();
      setDisplayedItems(
        items.filter(p => p.name.toLowerCase().includes(lower))
      );
    });
  }

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending && <span>Filtering...</span>}
      <ProductList items={displayedItems} />
    </div>
  );
}
```

**Pattern C: useDeferredValue for components that can render with stale data**

```typescript
import { useDeferredValue } from 'react';

function ParentComponent({ items }: { items: Product[] }) {
  const [query, setQuery] = useState('');

  return (
    <>
      {/* Input renders immediately — no deferral */}
      <input value={query} onChange={e => setQuery(e.target.value)} />

      {/* This component gets a deferred version of query:
          it re-renders with the new query only when the browser
          has spare capacity — it may temporarily show stale results */}
      <ExpensiveFilteredList items={items} query={query} />
    </>
  );
}

function ExpensiveFilteredList({ items, query }: { items: Product[]; query: string }) {
  // useDeferredValue: this query may lag behind the actual query
  // React renders the "old" query result while computing the new one
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() =>
    items.filter(p => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [items, deferredQuery]
  );

  return <ProductList items={filtered} />;
}
```

### Fix Phase 3 — Reducing Presentation Delay

Presentation delay (between handler completing and frame paint) is often caused by expensive rendering work:

```typescript
// Cause: Handler triggers large React subtree re-render
// Fix: Split expensive rendering from the interaction response

// ❌ Handler dispatches state that causes 500 components to re-render
function handleFilterChange(category: string): void {
  // This dispatch triggers re-render of the entire product tree →
  // 500 component renders → 180ms presentation delay
  dispatch({ type: 'SET_CATEGORY', category });
}

// ✅ Batch: update UI state in two stages
function handleFilterChangeFix(category: string): void {
  // Stage 1: update only filter UI immediately (1 component re-render)
  setActiveFilter(category);   // ~2ms

  // Stage 2: defer the expensive data update
  startTransition(() => {
    dispatch({ type: 'SET_CATEGORY', category }); // 500 re-renders happen here
    // React Fiber will interrupt this if new input arrives
  });
}
```

```css
/* CSS: Use contain to scope layout/paint to component bounds */
.product-grid {
  /* Layout containment: changes inside don't cause reflow outside */
  contain: layout style;

  /* content-visibility: browser skips off-screen components entirely */
  content-visibility: auto;
  contain-intrinsic-size: auto 800px; /* estimated size for scroll calculation */
}
```

### INP Optimization Checklist

```
Input Delay (target < 50ms):
  □ No long tasks (> 50ms) running during interaction windows
  □ Third-party scripts deferred or in worker (Partytown)
  □ Route transition scripts preloaded (not loaded on click)
  □ Event listeners registered early (not lazy)

Processing Time (target < 100ms):
  □ Event handlers do minimum work before returning
  □ Optimistic UI: visual change applied before async work starts
  □ React 18 useTransition for non-urgent state updates
  □ No synchronous layout reads (getBoundingClientRect) in handlers
  □ Redux/NgRx effects are async (non-blocking)
  □ Large re-renders deferred via useTransition / startTransition

Presentation Delay (target < 50ms):
  □ OnPush / React.memo to limit re-render scope
  □ Virtual scroll for large lists (Topic 174)
  □ CSS contain on independent component trees
  □ content-visibility: auto for off-screen sections
  □ No layout-triggering property reads after DOM writes
  □ CSS animations on compositor-only properties (transform, opacity)
```

---

## 🌍 3. Real-World Examples

### SAP — Cart Button: INP 340ms → 90ms
SAP's "Add to Cart" button had an INP of 340ms. Attribution showed: Input Delay 40ms, Processing Time 280ms, Presentation Delay 20ms. The 280ms processing time traced to a Redux saga chain that ran synchronously: 8 side effects — localStorage write, analytics event, recommendation recalculation, badge update, cart sync, coupon validation, stock check, and notification toast. All synchronous with the click. Fix: immediately increment badge optimistically (visual response: 5ms), yield via `setTimeout(0)`, then run all side effects asynchronously. Processing time: 280ms → 18ms. INP: 340ms → 90ms.

### Google Search — Instant Response Pattern  
Google Search's query input has near-zero-INP. The technique: the event handler only writes the character to the input and schedules one thing — a debounced search. The actual search network request and results rendering happen asynchronously. The instant feedback (character appears in input) comes from the browser's native input handling, not JavaScript at all. The lesson: the event handler should do as little as possible; the browser's built-in handling of form input is faster than any JS-driven approach.

### Shopify — Checkout Button INP
Shopify's checkout button had an INP of 450ms — worse than SAP's example. The handler was running 6 analytical tracking pixels synchronously before showing any visual feedback. Fix: fire the tracking pixels asynchronously (`navigator.sendBeacon`, or deferred via `setTimeout`), put the visual "Proceeding to checkout..." change as the first synchronous operation. INP: 450ms → 80ms.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "INP is the 98th percentile of all interaction latencies, measuring from user gesture to next frame paint. It replaced FID as a Core Web Vital in March 2024 because FID only measured the first interaction's input delay. INP captures the full picture. It has three phases: input delay, processing time, and presentation delay. My approach to optimization starts with attribution: `web-vitals/attribution` gives me per-phase breakdown and the CSS selector of which element was interacted with. LoAF gives me the specific script causing blocking. Then I fix by phase. For long input delay: ensure no long tasks run during interaction windows — defer third-party scripts, preload route chunks. For long processing time: apply the optimistic UI pattern — do minimum work for visual feedback synchronously, yield, then run heavy work. In React 18, `useTransition` is the idiomatic pattern. For long presentation delay: scope re-renders with React.memo and OnPush, apply CSS `contain` to independent trees, use `content-visibility: auto` for off-screen sections. At SAP, this reduced the Add-to-Cart INP from 340ms to 90ms in one sprint."

### Follow-Up Q&A

**Q: What is the difference between useTransition and useDeferredValue?**
A: Both mark work as non-urgent so React can prioritize urgent updates. The difference is in where the deferral lives. `useTransition` wraps a state setter call: it marks the state update triggered inside `startTransition` as non-urgent, so React renders the previous state synchronously and the new state when it has time. `useDeferredValue` wraps a value: it returns a "stale" copy of the value while React is busy computing with the new value. Use `useTransition` when you control the state setter (you own the state). Use `useDeferredValue` when you receive a prop you don't own and want to render it with lower priority.

**Q: How would you find which interaction is causing the worst INP in production?**
A: Three-step process: (1) RUM data from `web-vitals onINP` with attribution — segment by `interactionTarget` and `interactionType` to find the worst-performing element and operation type. (2) In Chrome DevTools, reproduce the worst interaction with Performance recording and look for the long task in the Main thread timeline. (3) For production attribution without DevTools: LoAF's `scripts[]` array with `sourceURL` and `sourceFunctionName`, correlated with the INP `eventEntry.startTime`. This triangle — RUM for which element, DevTools for profiling, LoAF for production attribution — is the complete diagnostic workflow.

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete INP optimization: optimistic update + useTransition + RUM reporting

import { useState, useTransition, useCallback, useRef } from 'react';
import { onINP } from 'web-vitals/attribution';

// ── 1. RUM setup — report INP with phase breakdown ───────────────────────────

type INPReport = {
  value: number;
  rating: string;
  interactionType: string;
  interactionTarget: string;
  inputDelay: number;
  processingTime: number;
  presentDelay: number;
  url: string;
  worstPhase: 'input-delay' | 'processing' | 'presentation';
};

function initINPMonitoring(): void {
  onINP(({ value, attribution, rating }) => {
    const inputDelay = Math.round(
      (attribution.processingStart ?? 0) - (attribution.eventEntry?.startTime ?? 0)
    );
    const processingTime = Math.round(
      (attribution.processingEnd ?? 0) - (attribution.processingStart ?? 0)
    );
    const presentDelay = Math.round(
      (attribution.nextPaintTime ?? value) - (attribution.processingEnd ?? 0)
    );

    const worstPhase = inputDelay > processingTime && inputDelay > presentDelay
      ? 'input-delay'
      : processingTime > presentDelay
      ? 'processing'
      : 'presentation';

    const report: INPReport = {
      value,
      rating: rating as string,
      interactionType: attribution.interactionType ?? 'unknown',
      interactionTarget: attribution.interactionTarget ?? '',
      inputDelay,
      processingTime,
      presentDelay,
      url: location.pathname,
      worstPhase,
    };

    navigator.sendBeacon('/telemetry/inp', JSON.stringify(report));
  });
}

// ── 2. Optimistic add-to-cart with INP in mind ───────────────────────────────

interface CartItem { productId: string; qty: number }

function useCart() {
  const [cartCount, setCartCount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addToCart = useCallback((productId: string): void => {
    // Phase 1: synchronous — visual feedback immediately (< 5ms)
    setCartCount(c => c + 1);  // badge increment — user sees this at next paint
    setIsAdding(true);

    // Phase 2: yield, then run expensive work
    // setTimeout(0) yields to browser for the paint before this runs
    setTimeout(() => {
      startTransition(() => {
        // Non-urgent: update full cart state (may cause many re-renders)
        // React Concurrent can interrupt this if new interaction arrives
        persistCartToLocalStorage(productId);
        trackAddToCartEvent(productId);
      });

      // Network call: async — fire and forget (or handle error for revert)
      fetch('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(r => r.json())
        .then((serverCart: CartItem[]) => {
          startTransition(() => {
            // Server confirmation — update with authoritative count
            setCartCount(serverCart.reduce((sum, i) => sum + i.qty, 0));
          });
        })
        .catch(() => {
          // Revert optimistic update
          setCartCount(c => c - 1);
        })
        .finally(() => setIsAdding(false));
    }, 0);
  }, []);

  return { cartCount, isAdding: isAdding || isPending, addToCart };
}

// ── 3. Search with useDeferredValue ─────────────────────────────────────────
import { useDeferredValue, useMemo } from 'react';

function ProductSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // True when deferred hasn't caught up yet
  const isStale = query !== deferredQuery;

  const filtered = useMemo(() => {
    const lower = deferredQuery.toLowerCase();
    return lower ? products.filter(p => p.name.toLowerCase().includes(lower)) : products;
  }, [products, deferredQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        {/* Dim results while deferred query is catching up — "computing" signal */}
        {filtered.map(p => <ProductRow key={p.id} product={p} />)}
      </div>
    </div>
  );
}

// Initialize on app start
initINPMonitoring();
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"IPP"** (the three phases)
- **I** — Input Delay (long task blocked the queue — eliminate long tasks before interactions)
- **P** — Processing Time (event handler too slow — optimistic UI + useTransition)
- **P** — Presentation Delay (too much rendering work — scope re-renders, CSS contain)

### INP Targets
```
Good:    ≤ 200ms  → interaction feels instant  ✅
Needs Improvement: 201–500ms → noticeable lag  ⚠️
Poor:    > 500ms  → interaction feels broken   ❌

Measured at P98 — 98th percentile of all interactions in a session
This means even one jank interaction out of 50 can push you into "poor"
```

### Analogy
INP is like measuring a restaurant's table service: not just how fast the first table is served (FID) but every table's experience throughout the evening (INP). The three phases: Input Delay = how long before a waiter acknowledges you; Processing Time = how long the waiter takes to write the order and send it to the kitchen; Presentation Delay = how long the kitchen takes to prepare and serve the dish after the order is in.

---

## ✅ 7. Why & How Summary

- **Why it matters:** INP replaced FID as a Core Web Vital (March 2024) because FID missed post-first-interaction responsiveness; a page with good FID but slow subsequent interactions scores "poor" INP; direct correlation with conversion — every 100ms of INP improvement ≈ 0.7% conversion improvement (Google data)
- **How it works:** `web-vitals/attribution` provides per-phase INP breakdown; LoAF provides script-level attribution in production; fix Input Delay by eliminating long tasks; fix Processing Time with optimistic UI patterns and `useTransition`; fix Presentation Delay with React.memo/OnPush scoping, CSS `contain`, and `content-visibility: auto`
- **How Hruday uses it:** Added `onINP` RUM reporting with phase breakdown at SAP; identified Add-to-Cart handler as the worst INP interaction (340ms); applied optimistic UI pattern (visual feedback in < 5ms, heavy work in setTimeout(0)); INP 340ms → 90ms; LCP + INP improvements combined raised Lighthouse score to 95

---

✅ Topic 180/486 complete → Continuing to Topic 181: scheduler.postTask() API
