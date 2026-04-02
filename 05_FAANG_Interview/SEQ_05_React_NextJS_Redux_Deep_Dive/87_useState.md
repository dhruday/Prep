# 87. useState — Batching, Functional Updates, Lazy Initialisation
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

`useState` is React's primitive for local component state. Three things separate junior from senior usage: **batching** (multiple `setState` calls in one event handler merge into a single re-render — always in React 18, sometimes in React 17); **functional updates** (`setState(prev => next)` rather than `setState(value)` — required when new state depends on previous state to avoid stale closure bugs); and **lazy initialisation** (`useState(() => expensiveComputation())` runs the initializer only once, not on every render). The underlying mechanism: state is stored not in the component function closure but on the fiber's `memoizedState` linked list, which is why state persists across renders and why calling `setState` during render is a footgun.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### How useState Works Internally

`useState` is implemented as `useReducer` with a predefined reducer:

```
useState(initialState)
≡ useReducer((state, action) => action, initialState)
// The "reducer" is just identity: new state IS the action
```

On a fiber, `useState` hook data is stored as an entry in the hook linked list:

```
fiber.memoizedState = {
  memoizedState: currentValue,    // the current state value
  queue: {                        // pending updates queue
    pending: circularLinkedList,  // setState calls accumulate here
    dispatch: setState,            // the stable dispatch function
  },
  next: nextHookEntry              // linked list pointer to next hook
}
```

When `setState(newValue)` is called:
1. Creates an "update" object `{ action: newValue, next: null }`
2. Enqueues it into `queue.pending` (circular linked list)
3. Schedules a re-render on the fiber's lane (SyncLane for events, TransitionLane for transitions)
4. On next render, processes all queued updates, producing final memoizedState

### Batching in React 17 vs React 18

**React 17 — batching only inside React event handlers:**

```typescript
// React 17
function handleClick() {
  setCount(c => c + 1);  // batched — scheduled but not yet processed
  setFlag(f => !f);       // batched — same render cycle
  // 1 re-render triggered
}

setTimeout(() => {
  setCount(c => c + 1);  // NOT batched in React 17 — triggers re-render
  setFlag(f => !f);       // NOT batched — triggers ANOTHER re-render
  // 2 re-renders!
}, 100);
```

**React 18 with `createRoot` — automatic batching everywhere:**

```typescript
// React 18
setTimeout(() => {
  setCount(c => c + 1);  // batched
  setFlag(f => !f);       // batched — 1 re-render
}, 100);

fetch('/api/data').then(res => res.json()).then(data => {
  setData(data);     // batched
  setLoading(false); // batched — 1 re-render
});  // Even async event handler batching works in React 18

// To opt out: flushSync
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1));  // commits immediately — 1 sync render
flushSync(() => setFlag(f => !f));       // commits immediately — another sync render
// 2 sync renders — only use when you must read DOM between updates
```

**Batching internals:** React uses a `executionContext` bitmask. During a React event handler, `executionContext` includes `BatchedContext`. Outside React event handlers in React 17, `executionContext` doesn't include `BatchedContext`, so each `setState` schedules a micro-task render immediately. React 18 auto-batching works by deferring all `setState` calls to a single scheduled render regardless of `executionContext`, unless `flushSync` is used.

### Functional Updates — Avoiding Stale Closure Bugs

The most common `useState` bug at senior level:

```typescript
// ❌ Stale closure bug
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // 'count' is captured from the effect's closure — it's always 0!
      // Even after 5 seconds, count in this closure = 0
      setCount(count + 1);  // always sends: setCount(0 + 1) = setCount(1)
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // empty dep array — closure captures count = 0 forever
  // Counter shows "1" but never increments further
}

// ✅ Functional update — doesn't need count in closure
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1);  // React provides fresh prev value every call
      // No closure dependency on count needed
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // safe with [] — setCount itself is stable, prev is always current
}
```

**Rule of thumb:** Use functional update form `setState(prev => next)` whenever:
- New state depends on previous state
- The setter is called inside `useEffect` with `[]` deps or inside a `useCallback` or `setTimeout`
- Multiple `setState` calls in a batch all need to see each other's intermediate state:

```typescript
function processThree() {
  // ❌ All three see count = 5 (same closure snapshot)
  setCount(count + 1);  // 5 + 1 = 6
  setCount(count + 1);  // 5 + 1 = 6 (not 7!)
  setCount(count + 1);  // 5 + 1 = 6 (not 8!)
  // React batches all three → final state: 6 (not 8)

  // ✅ Each prev is the latest queued value
  setCount(prev => prev + 1);  // 5 → 6
  setCount(prev => prev + 1);  // 6 → 7
  setCount(prev => prev + 1);  // 7 → 8
  // React processes the update queue: 5 → 6 → 7 → 8 → final: 8
}
```

### Lazy Initialisation — One-Time Expensive Computation

The `useState` initializer is called on **every render** if passed as a value. For expensive computations, pass a function:

```typescript
// ❌ Expensive computation runs on EVERY render
function MyComponent() {
  const [state, setState] = useState(parseHugeLocalStorageData());
  // parseHugeLocalStorageData() is called on first render AND every re-render
  // React ignores the result after first render, but the computation still runs
}

// ✅ Lazy initializer — function called ONLY on first render
function MyComponent() {
  const [state, setState] = useState(() => parseHugeLocalStorageData());
  // The function is called once on first render
  // On re-renders: the function is ignored (not even invoked)
  // React checks: "is this a function?" → yes → call it (first render) or skip it (rerenders)
}

// Common lazy init patterns
const [config] = useState(() => JSON.parse(localStorage.getItem('config') || '{}'));
const [items] = useState<Item[]>(() => []);  // empty array — prefer over useState([]) for stable ref
const [map] = useState(() => new Map<string, Value>());  // expensive data structure
```

**Note on `useState([])` vs `useState(() => [])`:**
`useState([])` technically creates a new `[]` on every render invocation (before React ignores it on re-renders). This is fine in practice — React's initializer check is cheap. But `useState(() => [])` is more explicit about intent.

### `useState` with Objects — The Merge Trap

`useState` does NOT merge objects like `setState` did in class components:

```typescript
// Class component: setState MERGES
this.setState({ loading: true });  // { user: 'John', loading: true } — merged

// Function component: useState REPLACES
function Profile() {
  const [state, setState] = useState({ user: 'John', loading: false });

  function startLoad() {
    setState({ loading: true });
    // ❌ Replaces entire state: { loading: true }
    // user is GONE!
  }

  function startLoadCorrectly() {
    setState(prev => ({ ...prev, loading: true }));
    // ✅ Spread merge: { user: 'John', loading: true }
  }
}
```

**Best practice for complex state:** Either use spread on every update, or switch to `useReducer` which makes the update shape explicit.

### When Not to Use `useState`

| Scenario | Prefer instead |
|---|---|
| Derived value that can be computed from existing state | `useMemo` — don't add new state |
| Multiple related values that change together | `useReducer` — atomic updates |
| State shared across multiple components | Context, Redux, Zustand |
| State that doesn't cause re-renders when changed | `useRef` |
| Server-derived state | React Query, SWR, RTK Query |

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a filter toolbar had multiple filter state values. They were using separate `useState` + multiple `setState` calls inside a `handleApplyFilters` function. The problem: the filters weren't all updating together — there was a brief render where some filters were applied and others weren't, causing a flash of intermediate filtered state. Fix 1: move to a single `useState({...allFilters})` object with spread updates. Fix 2: also used functional update form `setFilters(prev => ({...prev, ...newFilters}))` to guard against the click handler closing over stale filter state in async validation callbacks.

At Oracle, a data table had a scroll-based pagination that called `setPage(page + 1)` inside a scroll event listener. The stale closure bug was subtle: rapid scrolling fired multiple scroll events before any re-render, all capturing `page = 1` and setting `page = 2` — fast scroll never got past page 2. Fix: `setPage(prev => prev + 1)`.

**At FAANG scale:**
- **Microsoft (Teams):** Message draft state — functional update `setDraft(prev => applyFormat(prev, format))` ensures formatting operations compose correctly even when multiple formatting shortcuts are pressed in rapid sequence
- **Adobe (Photoshop Web):** History state (undo/redo) — `useState` with lazy init loads the initial history from IndexedDB snapshot; functional updates `setHistory(prev => [...prev, newEntry])` ensure history appends never lose entries from concurrent fast operations
- **Salesforce (Record Form):** Multi-field form state with complex cross-field validation — `useReducer` was preferred over scattered `useState` calls once field count exceeded 8; atomic form updates prevent partial form state renders
- **Cisco (Config Builder):** Multi-step form wizard — lazy init `useState(() => loadDraftFromSession())` avoids re-reading session storage on every render in a component that re-renders frequently due to real-time validation

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)

> "useState is React's local state primitive. Under the hood it's a specialized useReducer where the 'reducer' is the identity function — new state is whatever you pass to setState.
>
> Three things I make sure junior developers on my teams understand:
>
> First, batching. In React 18 with createRoot, all setState calls batch automatically — even in setTimeout and fetch callbacks. One event handler, one render, regardless of how many setState calls. Use flushSync only when you must read the DOM between two distinct state updates.
>
> Second, functional updates. If new state depends on previous state — especially inside a useEffect, setInterval, or setTimeout — always use setState(prev => next). The direct form setState(value) with a value from a closure risks using a stale snapshot of state that was captured when the closure was created.
>
> Third, lazy init. If the initial state requires computation — parsing localStorage, creating a Map, running algorithm — pass a function: useState(() => expensiveInit()). The function is called once. Passing the result directly — useState(expensiveInit()) — runs the computation on every render even though React ignores it after first mount."

### Likely Follow-up Questions

1. **When does `setState` cause a re-render?** → When the new value is different from the current value by `Object.is()` equality. If you call `setState(sameValue)`, React bails out of the re-render (though React may still call the component body once to check for children — this is an optimization detail). For objects, `setState({...obj})` always triggers a re-render even if contents are identical, because `Object.is({...obj}, prev)` is `false` (different references).
2. **Can you call useState outside a component?** → No — hooks must be called inside function components or custom hooks. The React runtime tracks which component is currently rendering via a global "currently rendering fiber" pointer. Calling a hook outside this context throws: "Invalid hook call."
3. **Is `setState` synchronous?** → The state update is enqueued synchronously (the update object is added to the queue immediately). But the re-render is asynchronous — it's scheduled via the Scheduler. So immediately after calling `setState(newVal)`, `state` still holds the old value. The new value is only available in the NEXT render.
4. **What's the difference between calling `setState` during render vs in an effect?** → Calling `setState` during render (meaning in the component function body, not in an event handler or effect) is a special case: React will immediately re-render the component in the same tick, without committing the first render. React limits this to an infinite-loop protection (after 25 re-renders from within render, it throws). This is only valid for derived state corrections — almost always `useMemo` is the right tool instead.

### Senior Signal

> "The stale closure problem with useState is one of the most common senior interview topics precisely because it's easy to know about useState and still write bugs with it. The closure-over-stale-state pattern is insidious because it works correctly during initial development (fresh mounts, fast renders) and only breaks under concurrent mode, tabbed inactivity, interval callbacks, or rapid interactions. The fix — functional updates — is simple once you internalize the rule: 'if new state depends on current state, use the updater function form, always.' I've added this as a standing rule in my team's code review process after catching production bugs at both SAP and Oracle that traced back to this exact pattern."

---

## 💻 5. Code Example

```typescript
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';

// ========================
// 1. Batching demonstration
// ========================
function BatchingDemo() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleClick = () => {
    // React 18: all four setState calls batch → 1 render
    setCount(c => c + 1);
    setFlag(f => !f);
    setCount(c => c + 1);  // functional updates chain correctly
    setLog(prev => [...prev, `clicked at ${Date.now()}`]);
    // Only 1 re-render triggered total
  };

  // React 18: even async batching
  const handleAsyncUpdate = () => {
    fetch('/api/data').then(() => {
      setCount(c => c + 1);  // batched with next line
      setFlag(f => !f);       // batched — 1 render total
    });
  };

  // flushSync: force immediate synchronous re-render
  const handleMeasureAfterUpdate = () => {
    flushSync(() => setCount(c => c + 1));
    // DOM is NOW up to date — safe to measure
    const el = document.getElementById('count-display');
    console.log('DOM text after update:', el?.textContent);
    setFlag(f => !f);  // this one can batch normally
  };

  return (
    <div>
      <span id="count-display">{count}</span>
      <span>{flag ? 'ON' : 'OFF'}</span>
      <button onClick={handleClick}>Batch update</button>
    </div>
  );
}

// ========================
// 2. Functional updates — stale closure fix
// ========================
function StopwatchFixed() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      // ✅ Functional update: always uses fresh previous value
      // Even after this effect is "stale" (running captured as true at setup time)
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);
  // Note: 'seconds' NOT in deps array — we don't need it, thanks to functional update

  return (
    <div>
      <span>{seconds}s</span>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
      <button onClick={() => { setRunning(false); setSeconds(0); }}>Reset</button>
    </div>
  );
}

// ========================
// 3. Lazy initialisation
// ========================
function PersistentForm() {
  // Lazy init: localStorage.getItem called ONCE on mount
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = localStorage.getItem('contactForm');
    return saved ? JSON.parse(saved) : { name: '', email: '', message: '' };
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem('contactForm', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <form>
      <input
        value={formData.name}
        onChange={e => updateField('name', e.target.value)}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={e => updateField('email', e.target.value)}
        placeholder="Email"
      />
      <textarea
        value={formData.message}
        onChange={e => updateField('message', e.target.value)}
        placeholder="Message"
      />
    </form>
  );
}

// ========================
// 4. Object state — avoid the merge trap
// ========================
interface UserProfile { name: string; email: string; role: string; loading: boolean; }

function ProfileEditor({ initialProfile }: { initialProfile: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  async function handleSave() {
    setProfile(prev => ({ ...prev, loading: true }));  // ✅ spread preserves fields

    try {
      const updated = await saveProfile(profile);
      setProfile(prev => ({ ...prev, ...updated, loading: false }));
    } catch {
      setProfile(prev => ({ ...prev, loading: false }));  // ✅ functional update
    }
  }

  return (
    <div>
      <input
        value={profile.name}
        onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
      />
      <input
        value={profile.email}
        onChange={e => setProfile(prev => ({ ...prev, email: e.target.value }))}
      />
      <button onClick={handleSave} disabled={profile.loading}>
        {profile.loading ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// ========================
// 5. Multiple rapid setState — why functional updates matter
// ========================
function MultiIncrementBug() {
  const [count, setCount] = useState(0);

  const handleTripleIncrement = () => {
    // ❌ All three use the SAME count from the closure (e.g., 5)
    setCount(count + 1);  // 5 + 1 = 6
    setCount(count + 1);  // 5 + 1 = 6 (same count!)
    setCount(count + 1);  // 5 + 1 = 6 (same count!)
    // Result: count = 6 (should be 8)
  };

  const handleTripleIncrementFixed = () => {
    // ✅ Each prev is the previously queued result
    setCount(prev => prev + 1);  // 5 → 6
    setCount(prev => prev + 1);  // 6 → 7
    setCount(prev => prev + 1);  // 7 → 8
    // Result: count = 8 ✓
  };

  return (
    <div>
      <span>{count}</span>
      <button onClick={handleTripleIncrement}>+3 (broken)</button>
      <button onClick={handleTripleIncrementFixed}>+3 (correct)</button>
    </div>
  );
}

// Type helpers
interface FormData { name: string; email: string; message: string; }
declare function saveProfile(profile: UserProfile): Promise<Partial<UserProfile>>;
```

---

## 🧠 6. Memory Aid

**Mental Model:** `useState` is a mailbox at the React fiber's address. Every `setState` drops a letter in the mailbox. React collects all letters at the end of the event (batching), reads them in order (functional updates chain), and delivers the final result. The lazy initializer is like only opening the mailbox's initial package once — React knows once it's been unpacked, there's no need to look at the package instructions again.

**If you go blank:** "Batching: React 18 batches everywhere automatically. Functional update: use `prev => next` when new state depends on old. Lazy init: pass a function to useState for expensive initial computation."

**Mnemonic:** **BFL** — **B**atching (auto in React 18), **F**unctional updates (use when dependent on prev), **L**azy init (pass function for expensive init).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Correctness: Stale closure bugs from missing functional updates are subtle production bugs — they work in dev but fail under concurrent mode renders, rapid interactions, or intervals
→ Performance: Lazy initialization prevents expensive computations from running on every render; batching prevents unnecessary re-renders from multiple state updates
→ Architecture: Knowing when to use `useState` vs `useReducer` vs external state is a key architectural judgment — useState is correct for independent, simple state; useReducer for complex grouped state; external state for shared state

**How it works (3 sentences):**
`useState` is implemented as `useReducer` with an identity reducer, storing the current state on the fiber's `memoizedState` linked list entry alongside a dispatch queue where `setState` calls enqueue update objects. React processes the update queue during the next render, applying each queued update in order — if they're functional updates `prev => next`, each receives the result of the previous; if they're value updates, they replace regardless. In React 18, automatic batching defers all `setState` calls to a single scheduled render by deferring flushing the update queue until the current task completes, regardless of whether the calls originated from a React event handler, a Promise callback, a setTimeout, or a native event listener.

**Company relevance:**
- Microsoft: Teams message draft — functional updates ensure rich text formatting operations chain correctly during rapid keyboard shortcut use; batching ensures typing + formatting + spellcheck state updates produce one render per keystroke
- Adobe: Lightroom filter state — lazy init loads saved filter presets from IndexedDB once on mount; functional updates in filter sliders ensure slider drags at 60fps never skip increments even when dragged faster than React rendering
- Salesforce: Record form autosave — functional updates in onChange handlers prevent lost keystrokes during concurrent renders; batching prevents redundant renders when multiple field validation effects fire simultaneously
- Cisco: Network device config form — lazy init loads current device config from server-side props once; spread-based object updates preserve all 50+ config fields when editing any single field

---
✅ Topic 87/486 complete → Continuing to Topic 88: useEffect — Dependency Array Rules, Cleanup, Common Mistakes
