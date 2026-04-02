# 20. Implement EventEmitter / Pub-Sub
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"An EventEmitter — also called a Pub-Sub (publish-subscribe) system — decouples event producers from event consumers. Producers emit events with data; consumers subscribe to specific events via listeners. The core API is three methods: `on(event, listener)` to subscribe, `off(event, listener)` to unsubscribe, and `emit(event, ...args)` to publish. Underneath, it's a `Map` from event names to `Set`s of listener functions — `Map` for O(1) event lookup, `Set` for O(1) listener removal without array filtering. `emit` must iterate a **snapshot** of the Set (not the live Set) so that listeners added or removed during emission don't corrupt the iteration. The production implementation also needs `once` (fire and auto-remove after first call), a `maxListeners` warning, and TypeScript generics for type-safe event names and payloads. At SAP, I built a typed EventEmitter as the cross-micro-frontend communication bus — three independent Angular/React teams emitted and subscribed to namespaced events without direct imports, enabling fully decoupled deployment across the Fiori Launchpad."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The coupling problem:**
```
Without Pub-Sub:
  ModuleA → calls B.handleUpdate()
             calls C.handleUpdate()
             calls D.handleUpdate()
  A must import B, C, D — tightly coupled

With Pub-Sub:
  A → emitter.emit('dataUpdated', data)
  B → emitter.on('dataUpdated', handler) 
  C → emitter.on('dataUpdated', handler)
  D → emitter.on('dataUpdated', handler)
  A knows NOTHING about B, C, D — fully decoupled
```

**Use cases:**
- Micro-frontend cross-module communication (SAP)
- Browser DOM events (addEventListener IS a Pub-Sub system)
- Node.js EventEmitter — foundation of streams, HTTP server, ChildProcess
- React's synthetic event system
- Angular's EventEmitter (component outputs)
- Vue's event bus pattern (deprecated in Vue 3 — use mitt or pinia)

---

### Core Internal Architecture

```
EventEmitter state:

  listeners: Map<string, Set<Listener>>
  // Key insight: Set over Array
  //   Array.splice(index, 1) for off() = O(n) — must find the item
  //   Set.delete(fn) for off() = O(1) — hash lookup

  maxListeners: number (default: 10)
  // Node.js warns when > 10 listeners on same event (likely leak)

API:
  on(event, listener)           → add to Set
  once(event, listener)         → add wrapped listener (auto-removes after first emit)
  off(event, listener)          → remove from Set
  emit(event, ...args)          → snapshot Set, call each listener
  removeAllListeners(event?)    → clear Set (or all Sets)
  listenerCount(event)          → Set size
  eventNames()                  → Map keys
```

---

### Critical Implementation Detail: `once` Wrapper

```
once(event, listener):
  
  wrapper = (...args) => {
    this.off(event, wrapper)   // ← removes ITSELF before calling original
    listener(...args)
  }
  
  // Store reference from wrapper → original for off() lookup:
  wrapper._original = listener
  
  this.on(event, wrapper)

off(event, listener):
  // Must find the wrapper if listener is the original:
  for fn in Set:
    if fn === listener OR fn._original === listener:
      Set.delete(fn)
      break
```

Why remove BEFORE calling? If the listener itself calls `emit` on the same event, the `once` wrapper has already been removed — no risk of double-firing.

---

### Critical Implementation Detail: `emit` Snapshot

```typescript
emit(event: string, ...args: unknown[]): boolean {
  const listeners = this.listeners.get(event);
  if (!listeners || listeners.size === 0) return false;

  // SNAPSHOT: copy to array before iterating
  const snapshot = [...listeners];
  
  for (const listener of snapshot) {
    listener(...args);
    // If listener calls this.off() → modifies the live Set
    // But we're iterating the snapshot — safe, no corruption
  }
  return true;
}
```

Without snapshot: if a listener calls `this.off(event, anotherListener)` or `this.on(event, newListener)` during iteration, the Set changes mid-iteration — unpredictable behavior (skipped listeners or infinite attachment).

---

### Architecture: Pub-Sub vs EventEmitter vs Observer

```
EventEmitter:
  - Synchronous callbacks (Node.js default)
  - Single emitter instance — listeners register directly
  - Named events (strings or symbols)
  
Pub-Sub:
  - Publisher and subscriber don't know each other (channel as intermediary)
  - Often asynchronous
  - Redis Pub-Sub, RabbitMQ = async distributed Pub-Sub

Observer Pattern:
  - Observable holds list of observers
  - Observers implement an interface (update() method)
  - More tightly coupled than Pub-Sub (observer knows observable)

RxJS Observable:
  - Lazy and cold by default (no emissions until subscribed)
  - Cancellable with unsubscribe()
  - Composable (operators: map, filter, debounceTime...)
  - EventEmitter: eager, fire-and-forget, simpler API
```

---

### Data Flow: SAP Micro-Frontend Architecture

```
SAP Fiori Launchpad (Shell App)
  │
  ├── Micro App 1 – Tile Catalog (Angular)
  ├── Micro App 2 – Analytics (React)  
  └── Micro App 3 – User Settings (Vue)

Communication problem:
  User changes locale in Settings → Tile Catalog + Analytics must re-render
  But they're separate bundles — cannot import each other

Solution: event bus on window (or shared module loaded by shell):

  window.__eventBus = new TypedEventEmitter<{
    'shell:localeChanged': [string];
    'shell:userLoaded': [{ id: string; name: string }];
    'analytics:drilldown': [string, string];
  }>();

  Settings: window.__eventBus.emit('shell:localeChanged', 'de-DE');
  Tile Catalog: window.__eventBus.on('shell:localeChanged', updateTiles);
  Analytics: window.__eventBus.on('shell:localeChanged', refreshCharts);

  Settings knows nothing about Tile Catalog or Analytics.
```

---

### Memory Leak — The #1 EventEmitter Pitfall

```
Scenario:
  Component mounts   → emitter.on('event', callback)
                       callback closes over: this, props, state, refs
  Component unmounts → emitter still holds reference to callback
                       callback closure → component still alive → HEAP LEAK

Each navigation: new component, new listener registered.
Old listeners never removed. Memory grows linearly with navigations.

Fix:
  Angular: ngOnDestroy() { emitter.off('event', this.callback); }
  React:   useEffect(() => { ...; return () => emitter.off('event', cb); }, []);
  
Node.js signals this with:
  MaxListenersExceededWarning when > 10 listeners on same event

Inline anonymous function anti-pattern:
  emitter.on('event', () => this.update()); // ← can never be removed!
  No reference stored → .off('event', ????) → impossible

Fix: always store the reference:
  this.handler = () => this.update();
  emitter.on('event', this.handler);
  // cleanup: emitter.off('event', this.handler);
```

---

### Performance Implications

**`Set` vs `Array` for listeners:**
| Operation | `Set` | `Array` |
|---|---|---|
| `on()` add listener | O(1) amortized | O(1) push |
| `off()` remove listener | O(1) delete | O(n) filter |
| `emit()` iterate | O(n) | O(n) |
| Deduplication | Automatic | Manual |

For codebases with frequent subscribe/unsubscribe (navigation-heavy SPAs), `Set` is measurably faster for `off()`.

**Synchronous vs async emit:**
- Synchronous (default): listeners called immediately, in order, blocking
- Async: `return Promise.all(snapshot.map(fn => Promise.resolve(fn(...args))))` — non-blocking, parallel, errors isolated

---

### ⚠️ Anti-Patterns & Pitfalls

- **Storing listeners as anonymous functions:** `emitter.on('event', () => {})` stores a unique closure reference that can never be matched by `off()`. Always store the reference: `const handler = () => {}; emitter.on('event', handler); emitter.off('event', handler)`.

- **Not unsubscribing on component cleanup:** Every `on()` without cleanup `off()` is a memory leak and causes ghost callbacks on destroyed components. In Angular: `ngOnDestroy`; in React: `useEffect` return function; in Vue: `beforeUnmount`.

- **`removeAllListeners()` affecting other modules:** Calling `removeAllListeners()` with no argument removes ALL listeners across ALL events — including those registered by other modules or teams. Only clear events you own, or use per-module EventEmitter instances.

- **Colliding event names in micro-frontends:** `emitter.on('update', handler)` from Team A and `emitter.on('update', handler)` from Team B on a shared bus will both fire for either team's `emit('update')`. Use namespaced events: `'catalog:tileUpdated'`, `'analytics:filterApplied'`.

- **Synchronous emit with long-running listeners:** If a listener does expensive synchronous work, it blocks the emitter — subsequent listeners are delayed. Offload to `setTimeout(0)` / `queueMicrotask` / Web Worker for heavy processing.

---

## 🏭 3. Real-World Examples

**SAP Fiori — Typed Micro-Frontend Event Bus:**

Shell exposes `window.__fioriEventBus` — a TypedEventEmitter instance. Events namespaced by team: `'shell:userLoaded'`, `'analytics:drilldown'`, `'catalog:tileSelected'`. Micro-apps subscribe in their initialization hooks and unsubscribe when they unmount. The TypeScript generic ensures event names and payload shapes are validated at compile time — impossible to emit `'shell:localeChanged'` with a number payload or subscribe to a non-existent event.

**Node.js — EventEmitter as platform foundation:**

Node.js HTTP server, streams, ChildProcess, and network sockets all extend `EventEmitter`. Every `request.on('data', handler)`, `server.on('request', handler)`, `child.on('exit', handler)` is the EventEmitter pattern. Understanding internals is prerequisite for Node.js backend debugging — the MaxListenersExceededWarning is a signal to look for uncleaned listeners.

**Microsoft VS Code — Extension API:**

VS Code's extension API uses a typed `EventEmitter<T>` pattern throughout: `workspace.onDidChangeTextDocument`, `window.onDidChangeActiveTextEditor`. Each returns a `Disposable` — the unsubscribe handle. Extensions collect all disposables in `context.subscriptions` and VS Code disposes them on extension deactivation automatically — a superior memory management pattern vs manual `off()` calls.

**Adobe Firefly — Generation Pipeline Events:**

Adobe Firefly's image generation pipeline emits lifecycle events: `'generation:queued'`, `'generation:started'`, `'generation:progress'` (with percent), `'generation:complete'` (with result URL), `'generation:error'`. The progress bar UI subscribes to `progress`, the result panel subscribes to `complete`, and the error toast subscribes to `error`. The generator knows nothing about the UI — pure Pub-Sub.

**How it evolves with scale:**
- **Small scale:** React props/callbacks or React Context — EventEmitter is overkill
- **Medium scale (SPA, multiple modules):** EventEmitter for cross-module events; scoped per feature domain
- **Large scale (SAP micro-frontends):** Typed namespaced EventEmitter on shared runtime; strict ownership rules per namespace

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "I'll implement EventEmitter with `on`, `off`, `once`, and `emit`. Internally it's a `Map<event, Set<listener>>` — Map for O(1) event lookup, Set for O(1) listener removal without array scanning. `once` wraps the listener in a self-removing wrapper that calls `off(self)` before invoking the original; I store a `_original` reference on the wrapper so `off(originalListener)` can find and remove it. `emit` creates a snapshot of the Set before iterating — if a listener calls `off()` during emit, we're iterating the snapshot not the live Set, so no corruption.

> Production additions: TypeScript generics for type-safe event names and payloads, a `maxListeners` warning like Node.js (signals likely leak), and a `Disposable` return from `on()` so callers can clean up with `disposable.dispose()` instead of storing the listener reference manually."

---

### Likely Follow-up Questions

1. **Why `Set` over `Array` for listeners?** → `Set` gives O(1) `.delete()` for `off()` — no need to scan and filter the array. Also provides automatic deduplication — calling `on()` twice with the same function reference only registers it once. `Array.splice(indexOf(fn))` for off is O(n), measurable in subscriber-heavy reactive SPAs.

2. **How do you implement `once`?** → Wrap the original listener in a new function that calls `this.off(event, wrapper)` before calling the original. Store the original as a property on the wrapper (`wrapper._original = listener`) so that when `off(event, originalFn)` is called, the loop can find the wrapper by matching `wrapper._original === originalFn` and delete the wrapper.

3. **Why snapshot the Set before iterating in `emit`?** → If a listener calls `this.off()` on another listener or `this.on()` adds a new listener during `emit`, the live Set changes mid-iteration — listeners can be skipped or the iteration can become non-deterministic. Snapshotting (`[...listeners]`) creates a fixed array we iterate safely while the live Set mutates freely.

4. **How is EventEmitter different from Pub-Sub?** → EventEmitter is a concrete implementation of Pub-Sub: listeners register directly on the emitter, events are string-named, dispatch is synchronous. Pub-Sub is the broader pattern where publishers and subscribers are decoupled via a message channel (topic). Distributed Pub-Sub (Redis, RabbitMQ) adds async delivery, persistence, and cross-process/machine routing.

5. **How would you prevent memory leaks in a React component that uses EventEmitter?** → In `useEffect`: register the listener, and return a cleanup function that calls `off()`. Store the listener reference before calling `on()` (don't use inline anonymous functions — they can't be removed). Alternatively, `on()` returns a `Disposable` with a `dispose()` method — call it in the cleanup return from useEffect.

---

### vs Alternatives

| EventEmitter | React Context | Redux | RxJS Subject | Choose when |
|---|---|---|---|---|
| Framework-agnostic | React-only | React-oriented | Observable stream | EventEmitter: pure JS, cross-framework |
| Imperative emit | Declarative re-render | Declarative state | Composable stream | EventEmitter: side effects, not render triggers |
| No re-renders | Triggers re-renders | Triggers re-renders | Can trigger re-renders | EventEmitter: micro-frontends, non-React |
| Simple API | Provider/consumer API | Structured state | Operator chain | EventEmitter: simple coordination |

---

### How to Signal Senior Thinking

> "The moment you add a shared EventEmitter to a codebase, you've taken on a maintenance contract: every `on` must have a paired `off`. This is the same discipline as `malloc`/`free` or `addEventListener`/`removeEventListener`. In practice I enforce this with the Disposable pattern — `on()` returns a `{ dispose() }` object. The component pushes all its disposables into an array and calls `dispose()` on each in its cleanup hook. This makes it structurally impossible to forget an unsubscribe — the pattern is enforced by the type system and code review checklist. VS Code's extension API uses exactly this pattern via `context.subscriptions.push(disposable)`."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Core EventEmitter — Map<string, Set<Listener>>
// ============================================================

type ListenerFn = (...args: unknown[]) => void;
type WrappedFn = ListenerFn & { _original?: ListenerFn };

interface Disposable {
  dispose(): void;
}

class EventEmitter {
  private listeners = new Map<string, Set<WrappedFn>>();
  private maxListeners: number;

  constructor(maxListeners = 10) {
    this.maxListeners = maxListeners;
  }

  on(event: string, listener: ListenerFn): Disposable {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    if (set.size >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: ${set.size} listeners on '${event}'. Possible memory leak.`
      );
    }
    set.add(listener as WrappedFn);
    // Return Disposable — caller can cleanup without storing listener reference
    return { dispose: () => this.off(event, listener) };
  }

  once(event: string, listener: ListenerFn): Disposable {
    const wrapper: WrappedFn = (...args: unknown[]) => {
      this.off(event, wrapper); // remove BEFORE calling (handles recursive emit)
      listener(...args);
    };
    wrapper._original = listener; // allows off(event, originalFn) to find this wrapper
    return this.on(event, wrapper);
  }

  off(event: string, listener: ListenerFn): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      if (fn === listener || fn._original === listener) {
        set.delete(fn);
        break;
      }
    }
    if (set.size === 0) this.listeners.delete(event);
  }

  emit(event: string, ...args: unknown[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;

    // SNAPSHOT before iterating — safe if a listener calls on/off during emit
    const snapshot = [...set];
    for (const fn of snapshot) {
      try {
        fn(...args);
      } catch (err) {
        if (event !== 'error') this.emit('error', err);
        else throw err; // re-throw uncaught error events
      }
    }
    return true;
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  eventNames(): string[] {
    return [...this.listeners.keys()];
  }
}

// ============================================================
// DEMO 2: Typed EventEmitter — type-safe event names + payloads
// ============================================================

class TypedEventEmitter<TMap extends Record<string, unknown[]>> {
  private delegate = new EventEmitter();

  on<K extends keyof TMap & string>(
    event: K,
    listener: (...args: TMap[K]) => void
  ): Disposable {
    return this.delegate.on(event, listener as ListenerFn);
  }

  once<K extends keyof TMap & string>(
    event: K,
    listener: (...args: TMap[K]) => void
  ): Disposable {
    return this.delegate.once(event, listener as ListenerFn);
  }

  off<K extends keyof TMap & string>(
    event: K,
    listener: (...args: TMap[K]) => void
  ): void {
    this.delegate.off(event, listener as ListenerFn);
  }

  emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): boolean {
    return this.delegate.emit(event, ...args);
  }
}

// ============================================================
// DEMO 3: SAP Micro-Frontend event bus
// ============================================================

interface FioriEventMap {
  'shell:localeChanged': [locale: string];
  'shell:userLoaded': [user: { id: string; name: string }];
  'analytics:drilldown': [dimension: string; value: string];
  'catalog:tileSelected': [tileId: string];
}

const fioriEventBus = new TypedEventEmitter<FioriEventMap>();

// In User Settings micro-app:
// fioriEventBus.emit('shell:localeChanged', 'de-DE');

// In Tile Catalog micro-app (Angular ngOnInit / ngOnDestroy):
const disposable = fioriEventBus.on('shell:localeChanged', (locale) => {
  console.log(`Refreshing tiles for locale: ${locale}`);
});
// In ngOnDestroy: disposable.dispose();

// TypeScript guards (these would be compile errors):
// fioriEventBus.on('unknownEvent', () => {}); // ← TS error: not in FioriEventMap
// fioriEventBus.emit('shell:localeChanged', 42); // ← TS error: expects string

// ============================================================
// DEMO 4: React hook using Disposable pattern (no memory leaks)
// ============================================================

import { useEffect } from 'react';

function useEventBus<K extends keyof FioriEventMap & string>(
  event: K,
  handler: (...args: FioriEventMap[K]) => void
): void {
  useEffect(() => {
    const disposable = fioriEventBus.on(event, handler);
    return () => disposable.dispose(); // ✅ auto-cleanup on unmount
  }, [event, handler]);
}

// Usage in component:
// useEventBus('shell:localeChanged', (locale) => refreshUI(locale));
```

**Interview vs Production difference:**
- **Interview:** Demo 1 — write `on`, `off`, `once`, `emit` from scratch. Key talking points: Map + Set, snapshot in emit, `_original` on once wrapper. Approximately 15-20 minutes.
- **Production:** Demo 2 (TypedEventEmitter) for compile-time safety + Demo 4 (Disposable return + React hook) for memory leak prevention. In real projects use `mitt` (< 200 bytes) or `eventemitter3` over custom implementations.

---

## 🧠 6. Memory Aid

**Mental Model:** An EventEmitter is a bulletin board. Subscribers pin their phone numbers under topic headers (events). The emitter calls every number under a topic when something happens. `once` is a sticky note that falls off after the first call. `off` is taking your number off the board. The `maxListeners` warning is a fire marshal telling you the board is getting too crowded.

**If you go blank:** *"EventEmitter: Map<event, Set<listener>>. on = Set.add. off = Set.delete (match _original for once wrappers). once = wrapper that calls off(itself) before calling original. emit = snapshot Set → iterate → call each. KEY DETAILS: snapshot before iterating, store _original on wrapper, maxListeners warning, Disposable return from on()."*

**Mnemonic:** **OOOES** — **O**n (subscribe), **O**ff (unsubscribe), **O**nce (auto-remove wrapper), **E**mit (snapshot + call all), **S**et not Array (O(1) removal).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** EventEmitter enables reactive architecture — components respond to application-wide events (locale change, auth state, theme toggle) without polling or brittle prop-drilling chains. At SAP, the event bus allowed 3 micro-frontend teams to ship locale/user changes independently without coordination meetings.
→ **Performance:** Pub-Sub decouples producers from consumers — adding a new subscriber costs zero modifications to the emitter. This scales linearly. Direct coupling scales as O(n) modifications per new consumer. `Set`-backed listeners give O(1) subscribe/unsubscribe; snapshot emit gives safe iteration under any mutation pattern.
→ **Business:** EventEmitter is the foundation of Node.js (every stream, HTTP server, and child process), Angular's `@Output()` decorator, and enterprise plugin architectures. Understanding its internals is a prerequisite for debugging Node.js memory leaks, designing Angular component communication, and building extensible frontend SDK APIs at Microsoft/Adobe/Salesforce/Cisco scale.

**How it works (3 sentences):**
An EventEmitter maintains a `Map<eventName, Set<listenerFn>>` where `on()` adds a listener to the appropriate Set, `off()` removes it (scanning for either the function itself or a `_original` property pointing to it for `once` wrappers), and `emit()` copies the Set to a snapshot array before iterating so that listeners calling `on()`/`off()` mid-emission don't corrupt the iteration. The `once()` method wraps the original listener in a self-removing wrapper that calls `this.off(event, wrapper)` before invoking the original — removing itself from the Set before the first call so it can never fire twice — and stores a `_original` reference on the wrapper so that `off(event, originalFn)` can locate and remove the wrapper by its `_original` property. Memory leak prevention requires either: calling `off()` explicitly in component cleanup hooks (Angular `ngOnDestroy`, React `useEffect` return), or having `on()` return a `Disposable` object whose `dispose()` method calls `off()` — making cleanup impossible to forget via the type system.

**Company relevance:**
- **Microsoft:** VS Code's extension API is built entirely on typed `EventEmitter<T>` with `IDisposable` cleanup — every extension listens to workspace, editor, and debug events via this pattern. Node.js (a Microsoft-stewarded project) uses EventEmitter as its core async communication primitive.
- **Adobe:** Firefly's generation pipeline, Photoshop Web's tool change system, and Experience Cloud's component communication all use EventEmitter-style patterns. Adobe's plugin API (Bridge, InDesign Scripting) is built on event subscription architectures.
- **Salesforce:** Lightning Message Service (LMS) in LWC is a typed Pub-Sub system with the same semantics as TypedEventEmitter — `publish()` = emit, `subscribe()` = on, `unsubscribe()` = off. The channel-based API prevents cross-domain event collisions.
- **Cisco:** WebEx SDK exposes meeting events (`PARTICIPANT_JOINED`, `AUDIO_MUTED`, `CHAT_MESSAGE`) via EventEmitter-pattern subscription. Cisco DevNet's network automation SDK uses event-driven callbacks for device state changes.

---
✅ **Topic 20/486 complete.**
→ **Topic 21 (LRU Cache) already exists. SEQ 1 is COMPLETE.**

---

# ✅ SEQ 1 FULLY COMPLETE — 21/486 topics done.

All 21 files present in `SEQ_01_JavaScript_Engine_Runtime/`.

**Say GO to start SEQ 2: Browser & Web Platform Internals**
