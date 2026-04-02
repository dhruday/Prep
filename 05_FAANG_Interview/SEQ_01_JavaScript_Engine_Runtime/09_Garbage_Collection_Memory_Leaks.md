# 9. Garbage Collection & Memory Leaks in JS
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds. Crisp. Confident. Numbers included where relevant.

"V8 uses a generational garbage collector — most objects are short-lived and collected quickly in the Young Generation (Minor GC), while long-lived objects are promoted to the Old Generation (Major GC / Mark-Sweep-Compact). GC is the main thread — when a Major GC triggers, it can pause JavaScript execution for 10–100ms, which directly impacts INP and causes visible jank. V8 mitigates this through incremental marking, concurrent sweeping, and parallel compaction — but GC pressure is still a real performance concern at scale. The most important thing I do as a senior engineer is not just knowing how GC works but knowing how to prevent memory leaks that force unnecessary GC cycles. At SAP, I identified and fixed a session-wide memory leak on our Fiori Launchpad where event listeners were retaining 2MB component trees for the full browser session — fixing it reduced peak heap from 400MB to 120MB, which in turn eliminated intermittent GC pauses that were appearing as 80ms jank spikes in production."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Garbage Collection (GC)** is automatic memory management — the JavaScript engine reclaims memory that is no longer reachable from the program's root references (global objects, call stack variables, CPU registers).

**Why automatic?** Manual memory management (C/C++) requires `malloc/free` — error-prone (double-free, use-after-free, memory leaks from forgotten frees). JavaScript's target developers (web designers, 1995) needed a safe model. Automatic GC sacrifices some control for dramatic safety and productivity gains.

**The foundational concept:** An object is eligible for GC when it is **unreachable** — no live path of references from any root leads to it. Unreachable ≠ "no variables pointing to it locally." The reference graph from roots determines liveness.

---

### How It Works Internally

**V8 Heap Architecture:**

```
V8 Heap:
┌─────────────────────────────────────────────────────────┐
│                     Young Generation                     │
│  ┌────────────────────────┐  ┌────────────────────────┐  │
│  │       Semi-space 1      │  │       Semi-space 2      │  │
│  │   (from-space active)   │  │     (to-space empty)    │  │
│  │  New objects allocated  │  │  Survivors copied here  │  │
│  │  here first             │  │  then spaces flip       │  │
│  └────────────────────────┘  └────────────────────────┘  │
│  Minor GC: ~1ms, very frequent (Scavenger algorithm)     │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                     Old Generation                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  Old Space   │  │ Code Space   │  │ Large Object  │   │
│  │  Promoted    │  │ JIT-compiled │  │ Space (>512KB)│   │
│  │  objects     │  │ code objects │  │ never moved   │   │
│  └──────────────┘  └──────────────┘  └───────────────┘   │
│  Major GC: 10–100ms, infrequent (Mark-Sweep-Compact)     │
└─────────────────────────────────────────────────────────┘
```

**Young Generation — Scavenger (Cheney's algorithm):**
1. New objects allocated in `from-space`
2. When `from-space` fills (~1–8MB), Minor GC triggers
3. Live objects in `from-space` are **copied** to `to-space`
4. Objects that survive 2 Minor GCs are **promoted** to Old Generation
5. `from-space` and `to-space` flip (from becomes empty, to becomes active)

**Cost:** ~1ms. Very fast — allocations are cheap (bump pointer allocation), short-lived objects are efficiently reclaimed. This is why most objects in typical JS code are cheap to allocate and reclaim.

**Old Generation — Mark-Sweep-Compact:**

Three phases:
1. **Marking:** Starting from GC roots (global, stack, registers), traverse all reachable objects and mark them alive. Uses **incremental marking** (spread over multiple ms slices) to avoid pausing.
2. **Sweeping:** Unreachable objects are reclaimed — swept into a free list. Uses **concurrent sweeping** (runs on background thread while JS executes).
3. **Compaction:** Moves live objects together to reduce fragmentation. Uses **parallel compaction** (multiple helper threads). This IS stop-the-world for pointer updating.

**GC Roots:**
- Global variables (`window`, `globalThis`)
- Variables on the call stack (current execution frame)
- CPU registers (active values)
- DOM roots (any element attached to document)

**WeakRef and FinalizationRegistry (ES2021):**
```typescript
const wr = new WeakRef(target); // doesn't prevent GC
const registry = new FinalizationRegistry(key => {
  console.log(`${key} was GC'd`);
});
registry.register(target, 'my-object'); // callback when target is GC'd
```

---

### Architecture & Component Boundaries

**Common Memory Leak Patterns in Frontend:**

```
LEAK TYPE 1: Detached DOM nodes
┌─────────────────────────────────────┐
│  const el = document.getElementById │
│  document.body.removeChild(el)       │ ← el removed from DOM
│  // BUT: el is still referenced by  │
│  // a JavaScript variable or closure │
│  // → el not GC'd, its entire sub-  │
│  // tree retained                    │
└─────────────────────────────────────┘

LEAK TYPE 2: Forgotten event listeners
┌─────────────────────────────────────┐
│  element.addEventListener(           │
│    'click', bigHandlerClosingOverBigObj │
│  )                                   │
│  // Element removed from DOM         │
│  // BUT: listener still registered  │
│  // → listener retains handler      │
│  // → handler closes over big object │
│  // → big object not GC'd            │
└─────────────────────────────────────┘

LEAK TYPE 3: Forgotten timers/intervals
┌─────────────────────────────────────┐
│  const id = setInterval(fn, 1000)    │
│  // Component destroyed but          │
│  // clearInterval(id) never called  │
│  // → fn retained → fn closure      │
│  // → all captured variables alive  │
└─────────────────────────────────────┘

LEAK TYPE 4: Accumulating closures/caches
┌─────────────────────────────────────┐
│  const cache = {}                    │
│  function memoize(key, val) {        │
│    cache[key] = val; // grows forever│
│  }                                   │
│  // No eviction policy → unbounded  │
└─────────────────────────────────────┘

LEAK TYPE 5: Circular references (old engines) / RxJS subscriptions
┌─────────────────────────────────────┐
│  // RxJS: subscription not unsubscribed
│  this.stream$.pipe(...).subscribe(  │
│    data => this.update(data)         │
│  );                                  │
│  // 'this' (component) retained    │
│  // until stream completes or unsub │
└─────────────────────────────────────┘
```

---

### Data Flow & State Flow

**Memory Leak Lifecycle — SAP BI Launchpad example:**

```
App starts: heap = 80MB
  ↓
User navigates to Page 1:
  - Component A created (2MB — models, UI state, service refs)
  - window.resize listener added (closes over Component A)
  heap = 82MB
  ↓
User navigates away:
  - Angular destroys Component A
  - BUT: window.resize listener NOT removed
  - Component A's closure: still alive in listener
  heap = 82MB (Component A's 2MB NOT freed)
  ↓
User navigates to 10 more pages:
  - 10 more components leak their listeners
  heap = 82 + 20 = 102MB (and rising)
  ↓
After 30 min of navigation (50 pages):
  heap = 80 + 100 = 180MB
  Major GC triggers: 60ms pause → visible jank
  ↓
Fix: removeEventListener in ngOnDestroy
  heap stabilises at 82–90MB (only current component alive)
```

---

### Performance Implications

**GC pause impact on Core Web Vitals:**

| GC Type | Typical duration | CWV impact |
|---|---|---|
| Minor GC (Scavenger) | 0.5–2ms | Barely perceptible |
| Major GC (Mark-Sweep) | 10–100ms | Bad INP if during interaction |
| Major GC Compaction | 20–200ms | Very bad INP — stop-the-world for pointer update |

**V8's mitigations:**
- **Incremental marking**: 1–5ms slices spread across idle time
- **Concurrent sweeping**: background thread, JS runs alongside
- **Idle-time GC**: V8 schedules GC during `requestIdleCallback` idle windows
- **Orinoco GC project** (Chrome 57+): Parallel and concurrent collection — reduced GC pause by 60%

**Allocation rate matters:** If you allocate objects faster than the Scavenger can collect them, they get promoted to Old Generation (even if short-lived) — triggering expensive Major GCs. Avoid creating excessive temporary objects in hot loops.

**Hidden cost — GC pressure from React:**

```typescript
// EXPENSIVE: creates new object on every render (allocation pressure)
const style = { color: 'red', fontSize: 14 }; // inline — new object per render

// BETTER: stable reference, single allocation
const STYLE = { color: 'red', fontSize: 14 } as const; // module constant

// EXPENSIVE: new array every render
return items.filter(x => x.active).map(x => <Item key={x.id} data={x} />);
// Creates 2 new arrays (filter + map) on EVERY render

// BETTER: memoize expensive derivations
const activeItems = useMemo(() => items.filter(x => x.active), [items]);
```

---

### Scalability Considerations

| Scale | GC Concerns |
|---|---|
| < 10K users | Short sessions, frequent page reloads — leaks rarely noticed. DevTools Memory panel for investigation |
| 100K users | SPAs with long sessions accumulate leaks. `performance.memory` API (Chrome) for RUM. Alert on heap > 256MB |
| 10M+ users | GC pause rate tracked as SLO metric. V8 heap snapshot comparisons in CI against baseline. `PerformanceObserver` for GC marks. Memory budget per component/page. `WeakRef` + `FinalizationRegistry` for leak detection |

---

### Trade-offs

| Approach | Alternative | When to Choose |
|---|---|---|
| Plain `Map` as cache | `WeakMap` as cache | `WeakMap`: keys are objects, auto-GC when key unreachable; `Map`: primitive keys or need iteration |
| Manual subscription cleanup | RxJS `takeUntil` | Both effective; `takeUntil` declarative — prefer in Angular |
| Object pooling (reuse objects) | Let GC handle allocation | Pooling: very hot paths (game loops, 60fps rendering); GC: normal app code |
| `WeakRef` for optional references | Strong reference | `WeakRef`: caches, observer registries where you don't want to keep objects alive |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Not removing event listeners on component destroy** — Every `addEventListener` without a matching `removeEventListener` in the cleanup phase is a closure leak. Angular: `ngOnDestroy`. React: `useEffect` return. UI5: `exit` hook.

- **Unbounded caches / accumulating arrays** — `cache[key] = value` without an eviction policy grows unbounded. Use an LRU cache with a max size, or `WeakMap` for object keys to allow automatic GC.

- **RxJS subscriptions without unsubscription** — `this.service.data$.subscribe(...)` in a component without `takeUntil(this.destroy$)` or explicit `.unsubscribe()` keeps the subscriber (and its closure — the component) alive for the stream's entire lifetime.

- **console.log retaining object references in DevTools** — In DevTools-attached sessions, `console.log(bigObject)` keeps `bigObject` alive in DevTools' internal log. Objects logged to console are NOT garbage collected while DevTools is open and the log entry exists. Causes confusion during memory profiling.

- **Storing DOM elements in long-lived data structures** — `const elements = getAllElements()` at module scope stores DOM references permanently. If those elements are removed from the DOM later, they become "detached DOM nodes" — alive in memory but not rendered. Can accumulate to 10s of MB.

- **Circular references involving DOM** — Pre-ES5, circular references between JS objects and DOM nodes caused leaks in IE due to the reference counting GC. Modern mark-sweep handles cycles correctly. However, circular references in userland data structures can cause other logic bugs even if not a GC issue.

- **`setInterval` without clearInterval** — Even if the component that created the interval is destroyed, the interval keeps firing and its callback closure retains all captured references indefinitely. This is the most common timer-related leak.

---

## 🏭 3. Real-World Examples

**At Hruday's level — SAP BI Launchpad (400MB → 120MB):**

As described above: 50 SAP UI5 components leaked their `window.resize` event listener closures over a 30-minute session. Each listener retained the component's full MVC context (model, controller, view tree). Total accumulated leak: ~280MB. After enforcing `removeEventListener` in all UI5 `exit()` hooks and switching to `addEventListener` via a lifecycle-managed service, heap stabilised.

The diagnostic path:
1. Chrome DevTools Memory tab → Take Heap Snapshot on page load
2. Navigate through 10 pages
3. Take second Heap Snapshot
4. Use "Comparison" view — filter by `Detached HTMLDivElement` nodes
5. Found 47 detached component root elements, each with 2MB+ retained size
6. Traced retaining path: `window` → event listener → handler function → component closure

**At FAANG scale — Microsoft Outlook Web:**

Outlook Web is a long-running SPA — users may leave it open for days. Microsoft's memory team tracks a "memory leak rate" metric per user session — MB/hour of heap growth above baseline. Acceptable threshold is < 5MB/hour. Their React component cleanup uses a custom `useCleanup` hook pattern that registers cleanup functions and ensures all are called on unmount:

```typescript
// Microsoft Fluent UI pattern
function useCleanup() {
  const cleanups = useRef<(() => void)[]>([]);
  const addCleanup = useCallback((fn: () => void) => {
    cleanups.current.push(fn);
  }, []);
  useEffect(() => () => { cleanups.current.forEach(fn => fn()); }, []);
  return addCleanup;
}
```

**Adobe Photoshop Web — Large Object Space:**

Adobe's image processing allocates large `ArrayBuffer` objects (10MB–200MB for a single layer). These go directly to V8's Large Object Space and are never moved by compaction (too expensive to copy). Adobe relies heavily on `Transferable` objects (ArrayBuffer ownership transfer to/from Workers) to ensure these large buffers are explicitly released rather than relying on GC — because even a 100ms GC pause on a 200MB buffer transfer is unacceptable during active editing.

**How it evolves with scale:**
- **Small scale (< 10K users):** Memory leaks are QA issues caught in manual testing.
- **Medium scale (100K users):** RUM monitoring `performance.memory.usedJSHeapSize`. Alert when > 150MB threshold. Heap profiling on devs' own machines.
- **Large scale (10M+ users):** GC pause tracking via `PerformanceObserver({ type: 'gc' })` (Chrome experiment). Heap budget per page-type enforced in CI. `WeakRef`-based leak detector utility in SDK.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "V8 uses a generational garbage collector. New objects go to the Young Generation — collected very frequently (~1–2ms) by the Scavenger algorithm, which copies live objects between two semi-spaces. Objects that survive two Minor GCs are promoted to the Old Generation, which uses Mark-Sweep-Compact — marking from GC roots, sweeping dead objects, compacting live ones together. Major GC takes 10–100ms and pauses the main thread during pointer-update phases — directly impacting INP.
>
> V8 minimises pauses through incremental marking (spread across idle slices), concurrent sweeping (background thread), and idle-time GC scheduling. But the best GC is no GC — which means preventing memory leaks.
>
> The four leak patterns I watch for are: event listeners not removed on destroy, RxJS/observable subscriptions not unsubscribed, timers/intervals not cleared, and unbounded caches without eviction. At SAP, I fixed a session-wide leak where window.resize listeners retained 2MB component trees across 50 page navigations — peak heap went from 400MB to 120MB, and the 80ms GC jank spikes disappeared.
>
> My diagnostic approach: Chrome DevTools Memory tab, heap snapshot comparison before/after navigation. Filter by 'Detached' nodes — those are your retained DOM trees. Trace the retaining path to find what's keeping them alive."

---

### Likely Follow-up Questions

1. **What is a detached DOM node?** → A DOM element that has been removed from the document (not attached to the live tree) but is still referenced by a JavaScript variable or closure. It stays in memory, cannot be rendered, but consumes memory. Common leak source.

2. **What is `WeakMap` and how does it help with GC?** → `WeakMap` holds weak references to its keys — if the key object is otherwise unreachable, it gets GC'd and the entry is automatically removed. Unlike `Map`, WeakMap doesn't prevent GC of its key objects. Ideal for associating metadata with DOM elements or component instances without preventing their cleanup.

3. **How do you identify a memory leak in production?** → `performance.memory.usedJSHeapSize` (Chrome) in RUM to track heap over time. DevTools Heap Snapshot comparison between page loads. Chrome DevTools Memory → Allocation Timeline to see allocation origin. `WeakRef` + `FinalizationRegistry` to detect when specific objects are collected.

4. **What is the difference between stack memory and heap memory?** → Stack: function call frames, primitive values, managed automatically by push/pop with function calls — very fast. Heap: all objects, arrays, closures — managed by GC — slower allocation/deallocation but unlimited (until system memory exhaustion).

5. **How does React's reconciliation affect GC pressure?** → React creates many short-lived objects (fiber nodes, event objects, reconciler state) during renders. These are ideal GC candidates — short-lived, collected quickly by the Scavenger. The concern is inline object/array creation in JSX (e.g., `style={{ color: 'red' }}`) which creates new objects every render — use stable references outside component functions to reduce allocation rate.

---

### vs Alternatives

| JavaScript (automatic GC) | Rust / C++ (manual memory) | Wasm | Choose when |
|---|---|---|---|
| Automatic — no leaks if no retained refs | Manual — explicit free | Manual via Rust ownership system | JS: most app code; Wasm/Rust: image processing, crypto, no GC pauses |
| GC pauses possible | No pauses | No pauses | Photoshop-level work: use Wasm |
| `WeakRef` / `WeakMap` for GC-friendly patterns | Smart pointers (shared_ptr) | N/A in browser | Performance-critical SDKs: consider Wasm modules |

---

### How to Signal Senior Thinking

> "The best way to reduce GC pressure is to reduce allocation rate — not by avoiding GC but by creating fewer objects in hot paths. And the best way to prevent Major GC pauses is to prevent memory leaks — large retained heaps trigger expensive collections more frequently. My mental model: the GC is a safety net, not a garbage disposal service. Don't leave garbage sitting around expecting immediate collection."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: 4 common leak patterns + their fixes in React/Angular
// ============================================================

// --- LEAK 1: Event listener not cleaned up ---
// React pattern
function LeakyComponent() {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => console.log(e.key);
    window.addEventListener('keydown', handler);
    // ❌ LEAK: no cleanup — handler retains component closure forever
  }, []);
  return null;
}

function FixedComponent() {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => console.log(e.key);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler); // ✅ Cleanup
  }, []);
  return null;
}

// --- LEAK 2: setInterval without cleanup ---
function IntervalLeak() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(id); // ✅ Always clear timers
  }, []);
  return <div>{count}</div>;
}

// --- LEAK 3: WeakMap vs Map for DOM metadata (avoids detached node leak) ---
// ❌ LEAK: Map keeps DOM elements alive even after removal
const elementDataMap = new Map<Element, { clicks: number }>();

// ✅ SAFE: WeakMap allows GC of element when it's removed from DOM
const elementDataWeakMap = new WeakMap<Element, { clicks: number }>();

function trackElement(el: Element): void {
  elementDataWeakMap.set(el, { clicks: 0 }); // el can still be GC'd when removed
  el.addEventListener('click', () => {
    const data = elementDataWeakMap.get(el);
    if (data) data.clicks++;
  });
}

// --- LEAK 4: Angular RxJS subscription cleanup ---
import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({ selector: 'app-safe', template: '' })
export class SafeComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // ✅ takeUntil ensures subscription cleaned up on component destroy
    someObservable$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => this.processData(data));
  }

  private processData(data: unknown): void { /* ... */ }

  ngOnDestroy(): void {
    this.destroy$.next();    // trigger completion
    this.destroy$.complete(); // clean up the subject itself
  }
}

declare const someObservable$: import('rxjs').Observable<unknown>;


// ============================================================
// DEMO 2: Bounded LRU-style cache to prevent unbounded growth
// Prevents LEAK 4: accumulating cache
// ============================================================

class BoundedCache<K, V> {
  private map = new Map<K, V>();

  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict LRU (first entry in Map — least recently used)
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  get size(): number { return this.map.size; }
}

// SAFE: bounded cache — never grows beyond 100 entries
const apiCache = new BoundedCache<string, unknown>(100);
```

**Interview vs Production difference:**
- **Interview:** Show Demo 1 patterns — event listener, interval, subscription — with the React/Angular fixes. These are the exact patterns every senior interview tests.
- **Production:** Add heap snapshot comparison workflow, `performance.memory` RUM monitoring, `WeakRef` + `FinalizationRegistry` for leak detection infrastructure, and `PerformanceObserver({ type: 'gc' })` once it lands as stable API.

---

## 🧠 6. Memory Aid

**Mental Model:** V8 GC is an automatic janitor. Young Generation is the hallway trash (cleaned every few minutes — Minor GC, 1ms). Old Generation is the building dumpster (emptied occasionally — Major GC, 100ms). But the janitor can't throw away items that are still chained to the building (retained references). Memory leaks = chains you forgot to cut.

**If you go blank:** *"V8 uses generational GC — Scavenger for short-lived, Mark-Sweep for long-lived. The 4 common leak patterns: unreleased event listeners, uncleared timers, unsubscribed observables, unbounded caches. Fix: pair every listen/subscribe/start with remove/unsubscribe/stop in cleanup."*

**Mnemonic:** **LETS** — **L**isteners, **E**vent timers (intervals), **T**imer callbacks, **S**ubscriptions — the 4 leak sources to audit.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** GC pauses cause visible jank — 100ms pauses are perceptible and break smooth interactions. Memory leaks cause progressive performance degradation over long sessions.
→ **Performance:** At SAP, eliminating the 280MB leak removed 80ms GC jank spikes. Heap reduction from 400MB to 120MB reduced Major GC frequency by 70%.
→ **Business:** Enterprise users (SAP Fiori, Office 365, Salesforce) keep browser tabs open all day. Memory discipline directly affects daily productivity — a slow, memory-heavy SPA becomes a support ticket.

**How it works (3 sentences):**
V8 uses a generational collector where most short-lived objects are quickly reclaimed by the Scavenger (~1ms) in the Young Generation's semi-space copy algorithm; long-lived objects are promoted to the Old Generation where Mark-Sweep-Compact collects them with brief (10–100ms) pauses. Memory leaks occur when objects remain reachable from GC roots through unintended retained references — primarily unreleased event listeners, uncleaned timers, unsubscribed observables, and unbounded caches. The fix for all leaks is the same: pair every resource acquisition with an explicit release in the corresponding cleanup hook.

**Company relevance:**
- **Microsoft:** MS Edge and Office 365 teams publish detailed GC metrics. Microsoft's Fluid Framework uses `WeakRef` + `FinalizationRegistry` for collaborative object lifecycle tracking. MS Teams has a documented memory SLO: < 500MB active heap for a typical user session.
- **Adobe:** Photoshop Web's pixel buffers are 10–200MB ArrayBuffers. Adobe relies on explicit memory management (Transferable, `SharedArrayBuffer`) for large objects rather than GC to avoid unpredictable Major GC pauses during active editing. They document their strategy in public engineering blog posts.
- **Salesforce:** LWC apps run in long Salesforce sessions. Salesforce documents leak prevention as a component authoring contract — every `connectedCallback` subscription must have a `disconnectedCallback` cleanup. Memory is a first-class concern in LWC code reviews.
- **Cisco:** WebEx handles video frame buffers in real time. Cisco uses Worker + Transferable pattern to manage frame buffer memory explicitly — pushing frames to worker, processing, transferring back, and explicitly releasing references when done to prevent heap growth during long meetings.

---
✅ **Topic 9/486 complete.**
→ **Continuing to Topic 10: Promises Internals — Microtask Queue, .then Chaining**
