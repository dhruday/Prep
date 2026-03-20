# 86. StrictMode — Why Double Invocation Happens
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`React.StrictMode` is a development-only wrapper that intentionally invokes certain functions twice — component bodies, state initializers, reducers, certain ref callbacks, and (in React 18) effect setup/cleanup cycles — to surface bugs that would only manifest in concurrent mode. The logic: in concurrent mode, React may render a component, pause, and re-render it from the same state. If a component is pure (same inputs → same output, no external side effects), rendering it twice is harmless. If it isn't — if it writes to external variables, subscribes without cleanup, or changes external state during render — the double invocation makes the bug visible immediately in development rather than intermittently in production. StrictMode never double-invokes in production.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What StrictMode Actually Does

StrictMode activates several development-only checks by wrapping components:

```tsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

**Checks activated:**
1. **Double-invocation of render functions** — Component bodies, state initializers (`useState(initializer)`), reducers (`useReducer`), certain `useMemo`/`useCallback` computations
2. **Double-mount of effects** (React 18) — `useEffect` and `useLayoutEffect` run setup + cleanup + setup on first mount in development
3. **Legacy lifecycle detection** — Warnings for deprecated methods: `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate`
4. **Legacy string ref warnings** — `ref="myRef"` string refs are deprecated
5. **Legacy Context API warnings** — `contextTypes`, `childContextTypes`
6. **Legacy `findDOMNode()` usage warnings**

### Why Render-Phase Double Invocation Exists

React's concurrent mode may:
1. Render a component (create WIP fiber, call component function)
2. Pause the render (higher-priority work arrived)
3. Discard the WIP fiber
4. Re-render the component from the same state

If a component writes to an external variable in its render body:

```typescript
// ❌ Impure render — external state mutation during render
let externalCounter = 0;

function ImpureComponent() {
  externalCounter++;  // side effect in render!
  return <div>{externalCounter}</div>;
}

// Without StrictMode: shows "1" on mount (user sees "1")
// With StrictMode: shows "2" on mount (double-invocation → "2")
// In concurrent mode production: shows unpredictable value as renders get discarded/restarted
// StrictMode development behavior makes the bug OBVIOUS rather than intermittent
```

**React discards the FIRST invocation result when in StrictMode:**

React actually calls the component body twice but intentionally uses only the _second_ invocation's output. React logs the first call's side effects by calling twice — the duplicate side effect (the +2 instead of +1) surfaces immediately in dev. In production, React calls component bodies once, but in concurrent mode that "once" may happen multiple times before commit.

### What Gets Double-Invoked

| Function type | Double-invoked? |
|---|---|
| Function component body | ✅ Yes |
| `useState` initializer function | ✅ Yes |
| `useReducer` reducer function | ✅ Yes |
| `useMemo` factory function | ✅ Yes |
| `useCallback` (the callback itself is NOT invoked in `useMemo`/`useCallback` — the factory wrapping it is) | Factory: Yes; callback: No |
| `render()` in class components | ✅ Yes |
| `getInitialState` (class) | ✅ Yes |
| `getDerivedStateFromProps` (class, static) | ✅ Yes |
| `shouldComponentUpdate` | ✅ Yes |
| Class component `constructor` | ✅ Yes |
| `useEffect` setup/cleanup (React 18 StrictMode) | ✅ Yes (see below) |
| DOM event handlers | ❌ No (user-initiated, not render-phase) |

### React 18: Strict Effects — The New Addition

React 17 StrictMode: only renders were double-invoked, effects ran once.
React 18 StrictMode: effects also get a simulated unmount/remount cycle:

```
React 18 StrictMode mount sequence (dev only):

1. React renders component (twice — first discarded)
2. React commits (real commit)
3. React runs useEffect setup: effect1()      ← "real" setup
4. React SIMULATES unmount: runs effect1 cleanup()  ← fake unmount
5. React SIMULATES remount: runs effect2()    ← new setup with same state/props
   User sees: component appears mounted

In production (any React version): only steps 1, 2, 3 happen
```

**Why the fake unmount/remount?** To prepare for an upcoming React feature called "Offscreen" / "Activity API" — components will be unmounted from the DOM (hidden) and remounted (shown) without losing state. If your effect doesn't survive unmount/remount cleanly (not restoring proper state after remount), StrictMode 18 surfaces this in development.

```typescript
// ❌ Breaks with StrictMode 18 strict effects
function AnalyticsTracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    analytics.trackPageView(pageId);  // Fires TWICE in StrictMode dev
    // First: real setup — OK
    // Then: fake unmount — no cleanup, counter not reset
    // Then: fake remount — fires again — double count in analytics
    // No return (cleanup) function → resource leak
  }, [pageId]);
  return null;
}

// ✅ Works correctly with StrictMode 18
function AnalyticsTracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    const session = analytics.startPageSession(pageId);
    return () => {
      session.end();  // cleanup: end the session on unmount
    };
    // StrictMode:
    // start(pageId) → end() → start(pageId) again
    // Analytics sees: started, ended, started — same as user navigating away and back
    // No double-count — each session is properly bounded
  }, [pageId]);
  return null;
}
```

### Common Patterns Broken by StrictMode and How to Fix Them

**Pattern 1: Singleton initialization in render**

```typescript
// ❌ Creates TWO instances of the service (one discarded, one used)
function AppRoot() {
  const service = new ExpensiveService();  // side effect in render body!
  // StrictMode: called twice → two instances created, one leaked
  return <ServiceContext.Provider value={service}><App /></ServiceContext.Provider>;
}

// ✅ Use useRef for stable instance
function AppRoot() {
  const serviceRef = useRef<ExpensiveService | null>(null);
  if (serviceRef.current === null) {
    serviceRef.current = new ExpensiveService();
  }
  // useRef initialization in render is fine — pure: same if-null check
  return <ServiceContext.Provider value={serviceRef.current}><App /></ServiceContext.Provider>;
}
```

**Pattern 2: Incrementing counters in render**

```typescript
// ❌ Race condition / double-count
let componentInstanceCount = 0;
function TrackedComponent() {
  componentInstanceCount++;  // in render — double-invoked in StrictMode
  // ...
}

// ✅ Track in effects (effects DON'T get double render-phase invocation)
function TrackedComponent() {
  useEffect(() => {
    componentInstanceCount++;
    return () => { componentInstanceCount--; };
  }, []);
}
```

**Pattern 3: Subscription setup without cleanup**

```typescript
// ❌ No cleanup — double subscription in StrictMode 18
function Component() {
  useEffect(() => {
    const sub = store.subscribe(update);
    // No return — on StrictMode remount, subscribes AGAIN
    // Result: two handlers called on every store update
  }, []);
}

// ✅ Symmetric setup/cleanup
function Component() {
  useEffect(() => {
    const sub = store.subscribe(update);
    return () => sub.unsubscribe();
  }, []);
}
```

### `StrictMode` in Production

StrictMode wrappers have zero runtime cost in production. The component tree rendered inside `<StrictMode>` is identical to rendering without it — the wrapper is stripped out and no double invocations occur. The checks are purely development-mode behavior implemented with `__DEV__` guards throughout React's source.

### Disabling StrictMode for Third-Party Components

When using a third-party component that breaks under StrictMode (non-idempotent effects you can't fix), you can wrap just that component outside StrictMode:

```tsx
// Selective StrictMode — problematic third-party component excluded
function App() {
  return (
    <React.StrictMode>
      <SafeComponents />
      {/* SafeComponents is inside StrictMode — fully checked */}
    </React.StrictMode>
  );
}

// If you MUST use a library with non-idempotent effects:
function WrappedLegacyMap() {
  // Note: there's no "LenientMode" — the only option is removing StrictMode
  // from the relevant ancestor, accepting reduced checking for that subtree
  return <ThirdPartyMapComponent />;
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, upgrading to React 18 introduced StrictMode strict effects. Several analytics tracking calls that had no cleanup functions started double-counting page view events in development. The fix: change all analytics calls to use session-based tracking with proper cleanup — `analytics.startSession()` with `return () => analytics.endSession()`. The double-invocation became a feature: it validated that analytics sessions correctly closed on navigation.

At Oracle, a data grid component was creating WebSocket connections inside render during an early refactor. StrictMode's double invocation caught two WebSocket connections being opened per component — visible in the browser Network tab as two distinct WS connections on mount. The fix moved the connection setup to `useEffect` with proper cleanup.

**At FAANG scale:**
- **Microsoft (Azure Portal):** React 18 StrictMode adoption during upgrade — the strict effects double-mount caught dozens of unguarded `addEventListener` calls in legacy component code that had accumulated over years; StrictMode made them visible by showing duplicate event handler fires
- **Adobe (Express):** Template library components with StrictMode — double-render surfaced template metadata being written to a module-level cache during render (not in an effect); cache got duplicate entries in StrictMode dev — fixed by moving cache writes to `useMemo`
- **Salesforce (Experience Builder):** StrictMode double effects in their component SDK caught uncleared timers in third-party widgets (setTimeout without clearTimeout in cleanup); previously only manifested as memory leaks in production
- **Cisco (Smart Account Manager):** OAuth token refresh logic in a `useEffect` with no cleanup was double-firing in StrictMode 18 dev — causing token refresh to fire twice on mount, consuming two refresh token uses; fixed with cleanup + abort controller

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "StrictMode is React's testing harness for concurrent mode safety. In concurrent mode, renders can be interrupted and restarted, so React may call your component function multiple times for a single eventual commit. StrictMode simulates this in development by double-invoking component bodies, state initializers, and reducers — and in React 18, by also running a fake unmount/remount cycle for effects.
>
> The goal is to make impure renders visible immediately in development. If a component writes to an external variable during render, you'll see the effect doubled. If an effect sets up a subscription without cleanup, you'll see a duplicate subscription on the fake remount. These are bugs that would otherwise only appear intermittently in production concurrent mode.
>
> The key implication: all render logic must be pure, and all effects must have symmetric cleanup. It's zero cost in production — completely stripped out. I've used it to mandate in team code reviews: 'if it passes StrictMode correctly, it's safe for concurrent mode.'"

### Likely Follow-up Questions

1. **Why is `StrictMode` not recommended to be removed when it causes issues?** → Disabling StrictMode to "fix" flicker or double-effect bugs hides the real problem. The correct fix is making the component pure and the effect idempotent. Removing StrictMode just makes bugs invisible in development while they remain in production concurrent renders.
2. **Does StrictMode work inside `useEffect`?** → The double-invocation of render functions (component body, state initializers, reducers) doesn't include effect callbacks. Effects are NOT double-invoked at the render level. The React 18 strict-effects behavior is a separate thing — it actually commits once, then simulates unmount/remount of effects (not the render).
3. **What's the purpose of React 18's strict effects specifically?** → To prepare for the upcoming `Activity` API (previously called "Offscreen") where React will unmount component DOM trees (for virtual scrolling, tab switching, hidden panels) while preserving state, then remount them. Components must survive this unmount/remount cycle. Strict effects verify this in development.
4. **Can you use StrictMode on part of the tree?** → Yes — you can wrap any subtree in `<React.StrictMode>` and only that subtree gets the strict checks. Components outside the wrapper are not double-invoked. This allows incremental adoption in legacy codebases.

### Senior Signal

> "I treat StrictMode as mandatory in all new React code. The double-invocation and strict effects are not bugs to work around — they're a continuous test of concurrent mode correctness. When a component fails under StrictMode, that's exactly the information I want: this component has an impure render or a non-idempotent effect that will cause real bugs in production concurrent renders. StrictMode is the linter for concurrent mode safety. Teams that disable it or work around it are accumulating technical debt that will manifest as race conditions and incorrect state in production."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect, useRef, useReducer, useMemo } from 'react';

// ========================
// 1. Impure render — caught by StrictMode double invocation
// ========================
let instanceId = 0;

function BadItem({ label }: { label: string }) {
  const thisId = ++instanceId;  // ❌ side effect in render
  // StrictMode: renders TWICE for one mount → instanceId is 2 after first render
  // Values are: 1 (first call, discarded), 2 (second call, used)
  // User sees "2" immediately — double-counter bug visible
  return <div>Item {thisId}: {label}</div>;
}

// ✅ Fix: use useRef for per-instance stable ID
function GoodItem({ label }: { label: string }) {
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) {
    idRef.current = ++instanceId;  // runs once per fiber instance (not per render call)
  }
  return <div>Item {idRef.current}: {label}</div>;
}

// ========================
// 2. State initializer double-invocation
// ========================
function ComponentWithLazyInit() {
  // The initializer function — called TWICE in StrictMode dev
  // Must be pure: same result both calls
  const [state] = useState(() => {
    console.log('initializer called');
    // StrictMode: you'll see "initializer called" TWICE in the console
    return computeInitialState();  // must be pure: same output every time
  });

  return <div>{state}</div>;
}

// ========================
// 3. React 18 strict effects — symmetric setup/cleanup
// ========================
function EventSubscriber({ topic }: { topic: string }) {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    console.log(`Subscribing to: ${topic}`);
    const handler = (event: string) => setEvents(prev => [...prev, event]);
    eventSystem.on(topic, handler);

    return () => {
      console.log(`Unsubscribing from: ${topic}`);
      eventSystem.off(topic, handler);
    };
    // StrictMode 18 sequence:
    // "Subscribing to: topic"
    // "Unsubscribing from: topic"  (simulated unmount)
    // "Subscribing to: topic"       (simulated remount)
    // User sees: component mounted, subscribed once
    // This is correct — setup/cleanup are symmetric
  }, [topic]);

  return <ul>{events.map((e, i) => <li key={i}>{e}</li>)}</ul>;
}

// ========================
// 4. Reducer purity (double-invoked in StrictMode)
// ========================
interface CountState { count: number; lastAction: string; }
type CountAction = { type: 'increment' } | { type: 'decrement' };

function countReducer(state: CountState, action: CountAction): CountState {
  // ✅ Pure reducer — safe to call twice: same state + same action = same result
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1, lastAction: 'increment' };
    case 'decrement':
      return { count: state.count - 1, lastAction: 'decrement' };
    default:
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(countReducer, { count: 0, lastAction: 'none' });
  return (
    <div>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}

// ========================
// 5. useMemo purity (factory double-invoked in StrictMode)
// ========================
function SortedList({ items }: { items: number[] }) {
  // ✅ Pure factory — safe to compute twice: [3,1,2].sort() → [1,2,3] both times
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a - b);
    // Note: [...items] creates a copy before sort — sort() mutates,
    // so copying ensures idempotency (original array unchanged)
  }, [items]);

  return <ul>{sorted.map((n, i) => <li key={i}>{n}</li>)}</ul>;
}

// ========================
// 6. App with StrictMode wrapping
// ========================
function AppWrapper() {
  return (
    <React.StrictMode>
      {/* All descendant components get strict checks in development */}
      {/* Zero overhead in production — StrictMode is stripped out */}
      <Counter />
      <EventSubscriber topic="user-activity" />
    </React.StrictMode>
  );
}

// Helpers
declare function computeInitialState(): string;
declare const eventSystem: {
  on: (topic: string, handler: (event: string) => void) => void;
  off: (topic: string, handler: (event: string) => void) => void;
};
```

---

## 🧠 6. Memory Aid

**Mental Model:** StrictMode is like a building code inspector who visits twice — checking that your electrical (render) is safe to re-wire without burning the house down, and that your plumbing (effects) can drain and refill without flooding. If the second visit finds different results than the first, something is wrong with the installation.

**If you go blank:** "StrictMode double-invokes renders/reducers/initializers to catch impure renders. React 18 adds strict effects: setup → cleanup → setup on first mount to test idempotency. Development only, zero cost in production."

**Mnemonic:** **DIRE** — **D**ouble invocation catches impure renders, **I**dempotent effects required, **R**eact 18 adds strict effects cycle, **E**ntirely dev-only.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Concurrent mode safety: StrictMode is the correctness checker for concurrent mode; passing StrictMode in development is a necessary (though not sufficient) condition for safe concurrent behavior in production
→ Bug visibility: It converts intermittent, hard-to-reproduce production bugs (stale state from discarded renders, double subscriptions) into immediate, visible development bugs
→ Code quality: Teams using StrictMode write better, more testable code by necessity — pure renders and symmetric effects are both good practices beyond just concurrent mode safety

**How it works (3 sentences):**
In development, `React.StrictMode` activates several additional checks: component bodies, state initializers, reducers, and `useMemo`/`useCallback` factories are invoked twice (React uses the second invocation's result and discards the first), surfacing any external side effects that would cause non-idempotent renders. React 18 additionally implements "strict effects" — after the real commit and effect setup, React simulates an unmount (runs all cleanup functions) then a remount (runs all setup functions again), checking that components survive the unmount/remount cycle that the upcoming `Activity` API will make common in production. All of these checks are wrapped in `__DEV__` guards throughout React's source, making them completely no-op in production bundles with zero runtime overhead.

**Company relevance:**
- Microsoft: Required StrictMode compliance during their React 18 adoption for Azure Portal — the strict effects check caught 47 unguarded addEventListener calls in the existing codebase that were silently duplicating event handlers in production long-running sessions
- Adobe: StrictMode as a CI/CD gate — Adobe Express runs a dev-mode build as part of CI that fails if any StrictMode warnings appear; ensures all new components meet concurrent mode safety standards before merge
- Salesforce: Used strict effects to validate their Lightning Web Component to React migration — every migrated component had to pass StrictMode with zero warnings before being considered production-ready
- Cisco: StrictMode enforcement in their Catalyst Center UI — caught OAuth token refresh double-firing on mount that was consuming refresh tokens unnecessarily; the bug had been in production for months before React 18 strict effects made it immediately visible in development

---
✅ Topic 86/486 complete → Continuing to Topic 87: useState — Batching, Functional Updates, Lazy Initialisation
