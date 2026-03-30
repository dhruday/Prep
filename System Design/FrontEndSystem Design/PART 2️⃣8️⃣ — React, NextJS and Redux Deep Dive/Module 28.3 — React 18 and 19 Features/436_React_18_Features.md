# 436 – React 18 Features — Concurrent Rendering, Auto Batching, Suspense

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React 18 introduced: **Concurrent rendering** (opt-in via createRoot), **Automatic batching** (everywhere), **Transitions** (startTransition/useTransition), **Suspense for data** (streaming SSR), **new hooks** (useId, useTransition, useDeferredValue, useSyncExternalStore). Migration: `ReactDOM.render` → `createRoot`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── MIGRATION: createRoot ────
// React 17
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// React 18
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// ──── AUTOMATIC BATCHING ────
// React 17: only batched in event handlers
// React 18: batched everywhere
setTimeout(() => {
  setCount(1); // batched
  setFlag(true); // batched — single re-render
}, 100);

fetch('/api').then(() => {
  setData(response); // batched
  setLoading(false); // batched — single re-render
});

// ──── TRANSITIONS ────
import { startTransition, useTransition } from 'react';

// Component-level
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchResults(filter(query)));

// Module-level (without isPending)
startTransition(() => setPage(newPage));

// ──── SUSPENSE IMPROVEMENTS ────
// Server-side: streaming HTML + selective hydration
// Client-side: Suspense works with lazy() and data fetching libs

// Streaming SSR with renderToPipeableStream
import { renderToPipeableStream } from 'react-dom/server';

function handler(req, res) {
  const { pipe } = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: ['/main.js'],
      onShellReady() {
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');
        pipe(res); // stream HTML as Suspense boundaries resolve
      },
    },
  );
}

// ──── NEW HOOKS SUMMARY ────
// useId()               — SSR-safe unique IDs
// useTransition()       — mark updates as non-urgent
// useDeferredValue()    — defer expensive re-renders
// useSyncExternalStore() — subscribe to external stores
// useInsertionEffect()  — CSS-in-JS library hook (before DOM)
```

### React 18 Feature Summary
| Feature | What It Does |
|---|---|
| `createRoot` | Opt into concurrent features |
| Auto batching | All setState calls batched |
| `startTransition` | Non-urgent updates |
| `useDeferredValue` | Defer expensive values |
| `Suspense` on server | Streaming SSR |
| `useId` | SSR-safe IDs |
| `useSyncExternalStore` | Safe external store subscription |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React 18: createRoot enables concurrent rendering. Auto-batching everywhere (promises, timeouts). Transitions let you mark updates as interruptible. Streaming SSR with renderToPipeableStream sends HTML progressively as Suspense boundaries resolve. New hooks: useId, useTransition, useDeferredValue."*

## 4. 🧠 MEMORY AID
**"React 18 = createRoot + auto-batch + transitions + streaming SSR + useId/useTransition/useDeferredValue/useSyncExternalStore."**
