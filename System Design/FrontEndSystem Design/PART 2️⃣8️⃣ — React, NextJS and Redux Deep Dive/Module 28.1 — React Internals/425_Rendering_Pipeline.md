# 425 – React Rendering Pipeline — Batching, Flushes, Commits

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React **batches** multiple `setState` calls into a single re-render. React 18 introduced **automatic batching** everywhere (events, promises, timeouts). The pipeline: setState → batch → schedule → render phase → commit phase → DOM update → layout effects → passive effects.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── AUTOMATIC BATCHING (React 18+) ────
function Counter() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);

  function handleClick() {
    // React 18: batched into ONE re-render
    setCount(c => c + 1);
    setFlag(f => !f);
    // Component renders once, not twice
  }

  async function handleAsync() {
    const response = await fetch('/api/data');
    // React 18: ALSO batched (new!)
    setCount(c => c + 1);
    setFlag(f => !f);
    // React 17: would cause TWO re-renders
    // React 18: ONE re-render
  }

  function handleTimeout() {
    setTimeout(() => {
      // React 18: ALSO batched
      setCount(c => c + 1);
      setFlag(f => !f);
    }, 1000);
  }

  return <div>{count} {String(flag)}</div>;
}

// ──── OPT OUT OF BATCHING ────
import { flushSync } from 'react-dom';

function handleUrgent() {
  flushSync(() => {
    setCount(c => c + 1);
  });
  // DOM is updated here

  flushSync(() => {
    setFlag(f => !f);
  });
  // DOM is updated again — two re-renders
}

// ──── RENDERING PIPELINE ────
/*
1. setState() called
   ↓
2. Update enqueued (batched with other setStates)
   ↓
3. Scheduler assigns priority lane
   ↓
4. RENDER PHASE (interruptible)
   - Walk fiber tree, call component functions
   - Calculate new VDOM, diff against current
   - Collect list of effects (DOM mutations needed)
   - NO side effects allowed here
   ↓
5. COMMIT PHASE (synchronous)
   5a. "Before mutation" — getSnapshotBeforeUpdate
   5b. "Mutation" — apply DOM insertions, updates, deletions
   5c. "Layout" — run useLayoutEffect callbacks (sync, blocks paint)
   ↓
6. Browser paints
   ↓
7. "Passive effects" — run useEffect callbacks (async, after paint)
*/

// ──── EFFECT TIMING ────
function EffectTiming() {
  useLayoutEffect(() => {
    // Runs SYNCHRONOUSLY after DOM mutations, BEFORE browser paint
    // Use for: measuring DOM, preventing visual flicker
    const height = ref.current.getBoundingClientRect().height;
    console.log('1. useLayoutEffect:', height);
    return () => console.log('cleanup: useLayoutEffect');
  });

  useEffect(() => {
    // Runs ASYNCHRONOUSLY after browser paint
    // Use for: data fetching, subscriptions, analytics
    console.log('2. useEffect (after paint)');
    return () => console.log('cleanup: useEffect');
  });

  // Render order: component render → useLayoutEffect → paint → useEffect
}

// ──── STRICT MODE DOUBLE RENDERING ────
// In development, React.StrictMode renders components twice
// to detect impure renders and side effects in render phase
// Only in development — not in production
```

### Batching Comparison
| Scenario | React 17 | React 18 |
|---|---|---|
| Event handler | ✅ Batched | ✅ Batched |
| setTimeout | ❌ Not batched | ✅ Batched |
| Promise.then | ❌ Not batched | ✅ Batched |
| Native events | ❌ Not batched | ✅ Batched |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React 18 auto-batches ALL state updates — events, promises, timeouts — into single re-renders. Pipeline: setState → batch → render (interruptible) → commit (sync DOM) → useLayoutEffect (before paint) → paint → useEffect (after paint). flushSync opts out of batching when immediate DOM update is needed."*

## 4. 🧠 MEMORY AID
**"React 18 = auto-batch everywhere. Pipeline: setState → render (diff) → commit (DOM) → layoutEffect → paint → effect. flushSync = force immediate."**
