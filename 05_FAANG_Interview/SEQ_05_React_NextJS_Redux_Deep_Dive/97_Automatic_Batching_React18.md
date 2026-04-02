# 97. Automatic Batching in React 18
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Batching means React groups multiple `setState` calls into a single re-render. In React 17, batching only happened inside React event handlers — `setState` calls inside `setTimeout`, Promises, or native event listeners triggered one re-render per call. React 18 with `createRoot` extends batching to **every context**: timers, Promises, native events, and async callbacks all batch automatically, reducing re-renders to once per "tick" regardless of where the state updates happen. To opt out — for cases where you need intermediate states to render between two updates — use `flushSync` from `react-dom`. The performance improvement can be significant: code that called `setState` twice in a Promise callback used to trigger two re-renders; with automatic batching it triggers one.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### React 17: Batching Only in Synthetic Events

```typescript
// React 17 batching — ONLY synthetic React event handlers batched
function Example() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // ✅ React 17: batched — ONE re-render
  function handleClick() {
    setCount(c => c + 1);   // no re-render yet
    setFlag(f => !f);        // no re-render yet — batched together
    // React batches these: ONE re-render here
  }

  // ❌ React 17: NOT batched — TWO re-renders
  function handleClickAsync() {
    setTimeout(() => {
      setCount(c => c + 1);   // re-render 1
      setFlag(f => !f);        // re-render 2
      // Not inside React's synthetic event handler → React bails out of batching
    }, 0);
  }

  // ❌ React 17: NOT batched — TWO re-renders
  async function fetchAndUpdate() {
    const data = await fetch('/api/data').then(r => r.json());
    setCount(data.count);    // re-render 1
    setFlag(data.active);    // re-render 2
    // After await, execution is no longer inside React's event handler
  }
}
```

### React 18: Automatic Batching Everywhere

```typescript
// React 18 (requires createRoot) — ALL contexts are batched
function Example() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  // ✅ React 18: batched — ONE re-render (same as React 17)
  function handleClick() {
    setCount(c => c + 1);
    setFlag(f => !f);
  }

  // ✅ React 18: batched — ONE re-render (NEW! React 17 did not batch this)
  function handleClickAsync() {
    setTimeout(() => {
      setCount(c => c + 1);
      setFlag(f => !f);
      // ONE re-render — automatic batching
    }, 0);
  }

  // ✅ React 18: batched — ONE re-render (NEW!)
  async function fetchAndUpdate() {
    const data = await fetch('/api/data').then(r => r.json());
    setCount(data.count);    // no render yet
    setFlag(data.active);    // no render yet
    // ONE re-render when Promise microtask queue clears
  }

  // ✅ React 18: batched — ONE re-render (NEW!)
  function handleNativeEvent() {
    document.addEventListener('click', () => {
      setCount(c => c + 1);
      setFlag(f => !f);
      // ONE re-render — even native events are batched
    });
  }
}
```

### The `createRoot` Requirement

```typescript
// main.tsx — React 17 style (legacy mode — NO automatic batching in React 18 either)
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));
// Even with React 18 package, this uses legacy render mode
// Legacy mode: no automatic batching, no concurrent features

// main.tsx — React 18 style (concurrent mode — automatic batching enabled)
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
// Automatic batching active everywhere
// Concurrent scheduling active
```

### `flushSync` — Opt Out of Batching

```typescript
import { flushSync } from 'react-dom';

// Scenario: you need TWO separate re-renders 
// (e.g., first render updates DOM, second render reads layout from it)
function form() {
  function handleSubmit() {
    flushSync(() => {
      setIsSubmitting(true);   // triggers IMMEDIATE synchronous re-render
    });
    // DOM has been updated: spinner appears NOW, before the next line runs
    const rect = buttonRef.current!.getBoundingClientRect();
    // Now schedule the rest normally
    setSubmitResult('success');
  }
}

// Another case: third-party integration that reads the DOM synchronously
function updateThirdParty() {
  flushSync(() => {
    setTableData(newData);
  });
  // ↑ DOM reflects new table data synchronously
  thirdPartyPlugin.refresh();  // reads the DOM — must see the new data
}

// WARNING: flushSync forces a synchronous render — expensive
// It defeats concurrent rendering benefits
// Use only when you explicitly need intermediate state visible in DOM
```

### Why Batching Matters for Performance

```typescript
// Scenario: Receiving WebSocket data and updating 5 state variables
function useDashboard() {
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [uptime, setUptime] = useState(100);

  useEffect(() => {
    const ws = new WebSocket('/api/telemetry');
    ws.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      // React 17: 5 re-renders — one per setState call
      // React 18: 1 re-render — all batched
      setTraffic(data.traffic);
      setAlerts(data.alerts);
      setLatency(data.latency);
      setPacketLoss(data.packetLoss);
      setUptime(data.uptime);
    };
    return () => ws.close();
  }, []);
}
```

In a high-frequency WebSocket scenario (10 messages/second × 5 state updates = 50 renders/second in React 17 → 10 renders/second in React 18), this is a 5x reduction in rendering work.

### The Internal Mechanism

React 18's batching works through the scheduler's "batch context":
1. Every call to `setState` increments a "batch depth" counter
2. Within a given event loop tick, React accumulates updates
3. React flushes the accumulated updates together at the end of the microtask queue
4. `flushSync` forces an immediate flush, bypassing this mechanism

### Potential Breaking Change: React 17 → 18 Migration

Most apps benefit from automatic batching. But some code relied on React 17's non-batching behaviour in async contexts:

```typescript
// This worked differently in React 17:
async function updateStatuses() {
  await save();
  setState1(a);   // React 17: re-render 1 immediately → causes useEffect to fire
  setState2(b);   // React 17: re-render 2 immediately → another useEffect fires
  // Some code depended on effects firing between these two setState calls
}

// In React 18: both setStates batch → ONE re-render → ONE effect fire
// If your effects depended on the TWO separate renders: use flushSync between them
async function updateStatuses() {
  await save();
  flushSync(() => setState1(a));   // immediate render + effects
  setState2(b);                    // separate render
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a dashboard received analytics updates from a polling API. Before React 18 migration, the update function called 6 `setState` calls after each API response (each metric had its own state), resulting in 6 re-renders per poll cycle. After migrating to `createRoot`, the same code caused only 1 re-render per cycle with zero code changes — the automatic batching in Promise callbacks handled it automatically.

At Bosch, WebSocket telemetry for equipment dashboards updated multiple state slices. The explicit batching workaround (`unstable_batchedUpdates` from React 17) was removed after React 18 upgrade — automatic batching replaced it entirely, simplifying the code.

**At FAANG scale:**
- **Microsoft Teams:** Tab rendering with multiple concurrent data sources (presence, message status, channel metadata) — React 18 automatic batching reduces re-renders significantly when multiple data feeds update simultaneously
- **Adobe Express:** Tool state updates (active tool, options, history) — a tool switch required updating 3-4 state variables; React 18 batching merges them into one render without wrapping in a reducer
- **Salesforce:** Dashboard widgets receive data from multiple backend services simultaneously; async callbacks updating multiple state variables get automatically batched
- **Cisco:** Network status updates — device health + traffic + alerts update together from one WebSocket message; React 18 batches all updates into one render

---

## 💬 4. Interview Execution

### Sample Answer

> "Batching is React grouping multiple setState calls into a single re-render to avoid unnecessary work. React 17 only batched inside synthetic React event handlers — any setState call after an `await` or inside a `setTimeout` triggered its own synchronous re-render. React 18 with `createRoot` extends batching to all contexts: Promises, timers, native event listeners — everywhere.
>
> The change requires no code modifications — it's automatic when you upgrade and switch to `createRoot`. For our SAP dashboard, this was a free 5x reduction in renders per WebSocket update cycle just by switching to `createRoot`.
>
> The one opt-out is `flushSync` from `react-dom` — it forces an immediate synchronous re-render, bypassing batching. You need it when intermediate DOM state must be visible before the next line of code runs — like positioning a popover relative to an element that just appeared, or when a third-party library needs to read the DOM synchronously between two state updates.
>
> The important migration note: code that relied on the two separate renders in async contexts should be checked. Effects that were triggered by back-to-back setState calls in React 17's async context might now only trigger once in React 18. Use `flushSync` to restore the intermediate render if your effect logic depended on it."

### Likely Follow-ups

1. **Was batching in React 17 always just event handlers?** → Yes, React 17 batched synchronous updates within the same synthetic event handler. But `unstable_batchedUpdates` from `react-dom` was available to manually enable batching in other contexts — it was used inside Redux's `connect` implementation to batch Redux-triggered updates.
2. **Does useReducer benefit from automatic batching?** → Yes. `dispatch` calls inside async callbacks in React 17 triggered separate renders. In React 18, multiple `dispatch` calls within the same microtask batch together. However, because `dispatch` updates state functionally (reducer function), it was already less likely to have the "reading stale state" problem that multiple `setState` calls can have — batching primarily reduces the render count.
3. **What about third-party libraries that called `unstable_batchedUpdates`?** → They work correctly in React 18 — `unstable_batchedUpdates` still exists and is no longer necessary for the use case it was solving, but calling it manually has no negative effect. Libraries like Redux have already updated to not call it in React 18 when using `createRoot`.
4. **Can automatic batching cause bugs?** → Very rarely. The only case that could be a breaking change: effects or derived state that expected to see intermediate render states (each setState producing a distinct render) in async contexts. React's concurrent rendering was already producing one render per commit, so this only affects code that relied on legacy synchronous re-rendering of individual setStates.

---

## 💻 5. Code Example

```typescript
import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';

// Demonstrating batching behavior difference

// ========================
// React 17 simulation: manual batching (now unnecessary in React 18)
// ========================
// Before React 18, you had to manually call unstable_batchedUpdates:
//
// import { unstable_batchedUpdates } from 'react-dom';
//
// socket.onmessage = (event) => {
//   unstable_batchedUpdates(() => {
//     setTraffic(data.traffic);  // batched manually
//     setLatency(data.latency);  // batched manually
//   });
// };
//
// React 18: no longer needed

// ========================
// React 18: all batched automatically
// ========================
interface DashboardMetrics {
  traffic: number;
  latency: number;
  packetLoss: number;
  uptime: number;
  alertCount: number;
}

function useDashboardMetrics() {
  const [traffic, setTraffic] = useState(0);
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [uptime, setUptime] = useState(100);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket('wss://telemetry.example.com/metrics');

    ws.onmessage = (event: MessageEvent<string>) => {
      const metrics: DashboardMetrics = JSON.parse(event.data);

      // React 18: ONE re-render for all 5 updates
      // React 17 without unstable_batchedUpdates: 5 re-renders
      setTraffic(metrics.traffic);
      setLatency(metrics.latency);
      setPacketLoss(metrics.packetLoss);
      setUptime(metrics.uptime);
      setAlertCount(metrics.alertCount);
    };

    return () => ws.close();
  }, []);

  return { traffic, latency, packetLoss, uptime, alertCount };
}

// ========================
// flushSync: forced intermediate render
// ========================
function AnimatedList() {
  const [items, setItems] = useState<string[]>([]);
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  function addItem(item: string) {
    // Need to scroll to the new item after it's added
    // If we just setState and then scroll, the DOM hasn't updated yet
    
    flushSync(() => {
      setItems(prev => [...prev, item]);   // force immediate render
    });
    // DOM is now updated — the new item exists in the DOM
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
    
    // Without flushSync:
    // setItems(prev => [...prev, item]);  ← batched, DOM not updated yet
    // listRef.current?.lastElementChild  ← would be the PREVIOUS last item (stale)
  }

  return (
    <div>
      <button onClick={() => addItem(`Item ${items.length + 1}`)}>Add Item</button>
      <ul ref={listRef}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ========================
// Demonstrating the migration concern
// ========================
function ComponentWithEffectDependency() {
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');

  // In React 17 (async): this effect fires TWICE if setStep + setMessage
  // are called separately in a Promise callback (two renders = two effect runs)
  // In React 18: this effect fires ONCE (batched → one render → one effect run)
  useEffect(() => {
    console.log(`Step: ${step}, Message: ${message}`);
    // If your logic requires this to run once per update pair → works correctly in React 18
    // If it relied on running for the intermediate step=2, message='' state in React 17 → use flushSync
  }, [step, message]);

  async function handleAction() {
    await doWork();
    
    // React 18: batched → effect fires ONCE with step=2, message='done'
    setStep(2);
    setMessage('done');

    // If you need the old React 17 behavior (effect fires for step=2, message='' then step=2, message='done'):
    // flushSync(() => setStep(2));
    // setMessage('done');
  }

  return <button onClick={handleAction}>Do Work</button>;
}

declare function doWork(): Promise<void>;
declare const React: typeof import('react');
```

---

## 🧠 6. Memory Aid

**One liner:** "React 18 with `createRoot` batches setState calls everywhere — timers, Promises, native events. React 17 only batched inside React synthetic event handlers."

**Two keywords:** "Automatic Batching = less renders everywhere. `flushSync` = opt out for intermediate DOM reads."

**Mental model:** Batching is like drafting multiple emails and sending them together in one send operation, instead of clicking send after every email. React 18's post office now accepts batched delivery from anywhere, not just from its own counter.

**Mnemonic:** **CAPE** — **C**reateRoot required, **A**ll contexts batch, **P**romises included, **E**scape with `flushSync`.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Performance: high-frequency state updates (WebSocket, polling, form interactions) trigger far fewer re-renders, reducing CPU usage and improving Frame Rate on mobile/low-end devices
→ Migration: upgrading existing React 17 apps to React 18 requires `createRoot` change, but code that multiple setStates in async contexts gets performance improvements for free
→ Mental model simplification: developers no longer need to manually batch updates or know which execution contexts React batches — the rule is simply "React batches all state updates before rendering"

**How it works (2 sentences):**
React 18's automatic batching works by having `setState` and `dispatch` flush their updates asynchronously — rather than synchronously re-rendering on each call, they queue updates and React processes the queue at the end of the current microtask, applying all pending updates in one render pass.
`flushSync` is the escape hatch that forces React to process its update queue synchronously at that exact point, committing the render immediately before returning control to the caller — used when code must read a DOM state that depends on a React state update having been committed.

**Company relevance:**
- Microsoft, Adobe, Salesforce, Cisco: All large-scale React apps with real-time data updates (dashboards, collaboration tools) benefit directly from React 18 automatic batching — fewer renders, smoother UI, lower CPU at the same data-update frequency

---
✅ Topic 97/486 complete → Continuing to Topic 98: Suspense for Data Fetching — How It Works Internally
