# 422 – React Scheduler and Priority Lanes

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React's **Scheduler** assigns priority to updates via **Lanes** (bitmask-based priority system). User interactions = high priority (Sync Lane). Data fetching = lower priority (Transition Lane). High-priority work can interrupt low-priority work. This enables concurrent features: `useTransition`, `useDeferredValue`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── LANE PRIORITY LEVELS (simplified) ────
// SyncLane            — highest priority (click handlers, typed input)
// InputContinuousLane — continuous events (scroll, mousemove)  
// DefaultLane         — normal priority (setState in effects)
// TransitionLane      — low priority (startTransition, useDeferredValue)
// IdleLane            — lowest (offscreen rendering)

// ──── HOW LANES WORK ────
// Each update is tagged with a priority lane
// React processes higher lanes first
// Lower-priority work can be interrupted

// Click handler → SyncLane (immediate)
function handleClick() {
  setCount(c => c + 1); // Sync priority — rendered ASAP
}

// Transition → TransitionLane (deferrable)
function handleSearch(query: string) {
  setInputValue(query);        // SyncLane — update input immediately
  startTransition(() => {
    setSearchResults(query);   // TransitionLane — can be interrupted
  });
}

// ──── SCHEDULER BEHAVIOR ────
// 1. User types in search box
// 2. Input update: SyncLane → rendered immediately
// 3. Results filter: TransitionLane → starts rendering
// 4. User types another character
// 5. Scheduler INTERRUPTS step 3 (stale work)
// 6. New SyncLane input update rendered
// 7. New TransitionLane results filter starts
// Result: input is always responsive, results catch up

// ──── TIME SLICING ────
// Scheduler yields back to browser every ~5ms
// Prevents long renders from blocking input/animations
function workLoop(hasTimeRemaining, deadline) {
  let currentTask = peek(taskQueue);
  while (currentTask !== null) {
    if (currentTask.expirationTime > deadline && !hasTimeRemaining) {
      break; // Yield to browser
    }
    performWork(currentTask);
    currentTask = peek(taskQueue);
  }
  return currentTask !== null; // more work?
}

// ──── EXPIRATION TIMES ────
// Sync:       expires immediately (must complete)
// Continuous:  250ms expiration
// Normal:     5000ms expiration
// Transition:  5000ms expiration (can be interrupted)
// Idle:        never expires (runs when nothing else to do)
```

### Priority Flow
```
User clicks ──→ SyncLane ──→ Immediate render
User scrolls ──→ ContinuousLane ──→ Within 250ms
setState ──→ DefaultLane ──→ Within 5s
startTransition ──→ TransitionLane ──→ Can be interrupted
Offscreen ──→ IdleLane ──→ When idle
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React Scheduler uses Lanes — a bitmask priority system. User interactions get SyncLane (immediate), transitions get lower priority and can be interrupted. Time slicing yields to the browser every ~5ms, keeping the main thread responsive. This is what powers useTransition and useDeferredValue."*

## 4. 🧠 MEMORY AID
**"Lanes = priority bitmask. SyncLane (clicks) > ContinuousLane (scroll) > DefaultLane > TransitionLane (deferrable). Higher lanes interrupt lower lanes."**
