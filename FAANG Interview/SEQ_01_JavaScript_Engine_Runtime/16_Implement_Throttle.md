# 16. Implement throttle
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"Throttle limits a function to execute AT MOST once per specified time interval, regardless of how many times it's called during that period. Unlike debounce which waits for silence, throttle fires at a regular cadence — the first call executes immediately, subsequent calls within the interval are silently ignored, and when the interval expires the function can fire again. This is the right tool when you need continuous feedback during an ongoing action — scroll position tracking, real-time drag coordinates, resize layout updates — where you want regular execution, not just post-action execution. At SAP Bosch, I used throttle for the WebSocket sensor dashboard's chart update handler — incoming data events arrive at 50Hz from machines, but DOM chart updates throttled to 10Hz (100ms interval) provide smooth visual feedback without overwhelming the rendering budget. The result was smooth 60fps UI even at high data rates."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The distinction from debounce:**

```
DEBOUNCE: Wait for silence → fire once at end of burst
THROTTLE: Fire at regular intervals → never faster than N ms apart

Scenario: scroll handler fires 100 times in 1 second

Debounce (200ms):        fires ONCE — 200ms after scrolling stops
Throttle (100ms limit):  fires ~10 times — approximately every 100ms

Use debounce when: you only care about FINAL state (search value, resize end)
Use throttle when: you need REGULAR updates during action (scroll position, drag, data stream)
```

**Why throttle exists:** Some browser events (scroll, mousemove, resize, pointermove, touchmove) can fire at display refresh rate (60–120Hz) or faster. Many operations triggered by these events are expensive:
- Infinite scroll: check if user is near bottom
- Parallax effects: calculate scroll-position-based offsets
- Drag-and-drop: update dragged element position
- Dashboard: update charts from a high-frequency data stream

Throttling these handlers to 16ms (≈60fps) or 100ms achieves visual smoothness without wasted computation.

---

### Implementation Architecture

**Two implementation strategies:**

**Strategy 1 — Timer-based (simpler, trailing-only):**
```
State: timerId = null

On call:
  if timerId exists: return (currently in cooldown period)
  execute fn(args)
  set timer for delay ms
  when timer fires: timerId = null (cooldown over)
```

**Strategy 2 — Timestamp-based (leading + trailing, more accurate):**
```
State: lastCallTime = 0

On call at time T:
  elapsed = T - lastCallTime
  if elapsed >= delay:
    execute fn(args)
    lastCallTime = T (reset timestamp)
  else:
    [schedule trailing execution for (delay - elapsed) ms — optional]
```

**Comparison:**
- Timer-based: simple, guarantees delay between calls, but can't support both leading+trailing cleanly
- Timestamp-based: more accurate (not affected by timer resolution/drift), supports leading+trailing, used in production libraries (Lodash)

**Leading and trailing for throttle:**
- `leading=true`: first call executes immediately (most common behaviour)
- `trailing=true`: last call during the throttle window executes after the window ends
- `leading=false, trailing=true`: first call is delayed by `delay` ms, then regular execution
- The most common production config is `leading=true, trailing=true` — immediate response + trailing to ensure last value is processed

---

### Visual Data Flow

```
THROTTLE (delay=100ms, leading=true, trailing=true):

Events:  e0  e1  e2  e3  e4  e5  e6  e7  e8  e9
         |   |   |   |   |   |   |   |   |   |
Time:    0  10  20  30  40  50  60  70  80  90 100 110 120ms

Executions:
  t=0ms:   e0 → EXECUTE (leading, starts throttle window 0–100ms)
  t=10–90: e1–e8 → IGNORED (inside throttle window)
  t=100ms: trailing timer fires → EXECUTE with e8's args (most recent in window)
  t=100ms: e9 → starts new throttle window
  t=110ms: EXECUTE (leading of new window)

Result: execute at t=0, t=100 (trailing), t=110+ (next window)

THROTTLE (delay=100ms, leading=true, trailing=false):

  t=0ms:   e0 → EXECUTE
  t=1–99:  e1–e8 → IGNORED
  t=100ms: new window opens
  t=100ms: e9 → EXECUTE
  → Fires only at window starts, ignores trailing
```

---

### Performance Implications

**Browser rendering budget:**
```
60fps = 16.67ms per frame
120fps = 8.33ms per frame

Scroll handler called at 120Hz (120 times/sec):
  Without throttle: 120 handler invocations/sec
  With throttle at 16ms: ~60 invocations/sec (1 per frame — optimal)
  With throttle at 100ms: ~10 invocations/sec (fine for non-visual tracking)

Throttle at ~16ms is "requestAnimationFrame throttle" —
synchronised to browser rendering cycle (better: use rAF directly for visual work)
```

**requestAnimationFrame vs throttle for visual handlers:**
```typescript
// Better for visual work — synchronised to actual frame times:
let rafId: number | null = null;
function onScroll(): void {
  if (rafId !== null) return; // already queued for next frame
  rafId = requestAnimationFrame(() => {
    updateParallax();
    rafId = null;
  });
}

// Throttle at 16ms — approximately the same but timing drifts:
const throttledScroll = throttle(updateParallax, 16);
window.addEventListener('scroll', throttledScroll);

// Rule of thumb: use rAF for visual DOM updates, throttle for data processing
```

**Dashboard data stream (Bosch example):**
```
WebSocket message rate: 50/sec per sensor, 20 sensors = 1000 events/sec
Chart DOM update: ~20ms per update (SVG re-render)
Without throttle: 1000 updates/sec → 20,000ms of work/sec → main thread 100% used → UI frozen

With throttle(100ms): 10 updates/sec → 200ms work/sec → 80% main thread free → smooth 60fps UI
```

---

### Scalability Considerations

| Scale | Throttle Concern |
|---|---|
| Simple scroll handler | Throttle at 100ms — noticeable but acceptable for non-visual tracking |
| Smooth animation | Throttle at 16ms OR use requestAnimationFrame directly |
| High-freq data stream (IoT) | Throttle at sensible update rate (10Hz = 100ms for charts) |
| Virtual scrolling (100K items) | throttleWithTrailing — ensure last scroll position always processes |

---

### Trade-offs

| Config | Behaviour | Use case |
|---|---|---|
| `leading=true, trailing=false` | Fire at start of interval, ignore during | Rate-limited buttons, API calls |
| `leading=false, trailing=true` | Fire at end of interval | Less common, similar to slow debounce |
| `leading=true, trailing=true` | Fire at start AND end of interval | Scroll + ensure last position processed |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Throttle when debounce is needed (and vice versa)** — Using throttle on a search input means the API fires every 300ms during typing — multiple API calls with intermediate values. Debounce fires once after typing stops. Use the right tool: search = debounce, scroll tracking = throttle.

- **Not handling the trailing call** — If `trailing=false`, the last event in a window is ignored. For scroll-to-bottom infinite scroll triggers, missing the last scroll event means the trigger condition is never checked after the final scroll position. Use `leading=true, trailing=true` for scroll-based triggers.

- **Creating throttle in React render** — Same issue as debounce — a new throttled function on every render means a new throttle state (timer/timestamp reset) on every render, defeating the throttle. Use `useMemo` or `useRef`.

- **Throttle for leading-only with events that need latest value** — `leading=true, trailing=false` means if the user scrolls from 0% to 100% quickly, only the starting value (0%) is processed by the throttle. For any operation where the final state matters, always enable trailing.

---

## 🏭 3. Real-World Examples

**Bosch Industrial Dashboard — WebSocket chart update throttling:**

Hruday's Angular WebSocket dashboard received temperature/pressure readings at 50Hz per sensor. Direct binding would cause Angular's change detection to fire 50 times/second per sensor. Throttle at 100ms (10Hz) reduced change detection cycles by 80%, keeping the chart updates at a comfortable 10Hz (smooth visually for slow-moving metrics) with the main thread free for user interactions.

**Microsoft OneDrive — infinite scroll throttle:**

OneDrive's file browser uses throttled scroll handlers to check if the user is approaching the bottom of the list (trigger to load next page). Throttle at 100ms — check position at most 10 times/sec. Without throttle, the scroll handler fires 60+ times/sec, performing DOM measurement operations on every event.

**Adobe Illustrator Web — canvas drag throttle:**

Adobe Illustrator Web throttles the `pointermove` handler during shape manipulation. The exact pointer coordinates are captured at 60Hz (via `requestAnimationFrame`-synchronised throttle), and the canvas redraws at exactly 60fps — no wasted frames, no dropped frames.

**Salesforce — Form wizard resize handler:**

Salesforce's multi-step form wizard responds to window resize to reposition sticky progress headers. Throttle at 150ms — the header repositions smoothly 6–7 times/sec during a resize drag, avoiding expensive layout recalculations on every pixel.

---

## 💬 4. Interview Execution

### Sample Answer (LIVE CODING setup)

> "Throttle ensures a function runs at most once per interval. My approach: timestamp-based implementation — check elapsed time since last execution. If enough time has passed, execute and update the timestamp. I'll also implement cancel and support for trailing execution.

Let me write the basic version first, then enhance it."

---

### Likely Follow-up Questions

1. **What is the difference between debounce and throttle?** → Debounce fires once AFTER a quiet period following a burst of calls. Throttle fires at regular intervals DURING a burst, ensuring at most one execution per time window. Debounce: "wait for calm." Throttle: "execute at a cadence."

2. **How would you throttle a scroll event handler in React?** → Create the throttled function outside the render (in `useMemo` or module scope), attach via `useEffect` with `addEventListener`, and clean up in the effect's return. The throttled function reference must be stable across renders — `useMemo([delay])`.

3. **What is `requestAnimationFrame` and how is it related to throttle?** → `requestAnimationFrame` schedules a callback to run before the next browser repaint — effectively throttled at the display refresh rate (60–120Hz). For visual DOM updates, rAF is more precise than `setTimeout`-based throttle because it's synchronised with the actual frame timing.

4. **What is the difference between timer-based and timestamp-based throttle?** → Timer-based: uses `setTimeout` — simpler but the delay between executions is always `delay` ms (timer resolution matters). Timestamp-based: compares `Date.now()` — more accurate, less affected by timer drift, and allows the remaining time to a trailing call to be precisely calculated.

5. **When should you use throttle vs `requestAnimationFrame`?** → rAF: for visual DOM updates (parallax, drag, animation) where you want to synchronise with actual frame rendering. Throttle: for data processing, API calls, or any operation where exact frame timing doesn't matter and you want a fixed cadence regardless of display refresh rate.

---

### vs Debounce

| | Throttle | Debounce |
|---|---|---|
| Fires during burst? | YES — at regular intervals | NO — waits for burst to end |
| Fires at burst end? | Optional (trailing) | YES (default trailing) |
| Good for | Scroll, drag, real-time data stream | Search input, resize-end, form validation |
| When user is actively interacting | Provides regular feedback | Waits until interaction stops |
| When quiet | Stops firing | Fires once |

---

### How to Signal Senior Thinking

> "Throttle and debounce are often presented as interchangeable in tutorials, but they solve genuinely different problems. Any real-time visual feedback during interaction — scroll-driven effects, drag operations, chart updates from a data stream — needs throttle because it needs regular execution. Search and form validation need debounce because they need final-state execution. Using throttle on a search input wastes API calls. Using debounce on a scroll handler means scroll-to-bottom infinite scroll only triggers AFTER scrolling stops — terrible UX. Knowing which to use, and why, is a clear senior signal."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Basic timer-based throttle (leading, no trailing)
// Interview starting point
// ============================================================

function throttleBasic<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>): void {
    if (timerId !== null) return; // in cooldown — ignore call

    fn(...args); // execute immediately (leading)

    timerId = setTimeout(() => {
      timerId = null; // cooldown over — ready for next call
    }, delay);
  };
}

// ============================================================
// DEMO 2: Timestamp-based throttle with leading + trailing + cancel
// Production-grade implementation
// ============================================================

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

interface ThrottledFn<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

function throttle<T extends (...args: unknown[]) => ReturnType<T>>(
  fn: T,
  delay: number,
  options: ThrottleOptions = {}
): ThrottledFn<T> {
  const { leading = true, trailing = true } = options;

  let lastCallTime: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let result: ReturnType<T> | undefined;

  function invoke(args: Parameters<T>, time: number): ReturnType<T> {
    lastCallTime = time;
    result = fn(...args) as ReturnType<T>;
    return result;
  }

  function trailingEdge(): void {
    timerId = null;
    if (trailing && lastArgs !== null) {
      invoke(lastArgs, Date.now());
    }
    lastArgs = null;
  }

  function throttled(...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    lastArgs = args;

    // First call ever
    if (lastCallTime === null) {
      if (leading) {
        return invoke(args, now);
      }
      // leading=false: schedule first call for after delay
      lastCallTime = now;
    }

    const elapsed = now - lastCallTime;
    const remaining = delay - elapsed;

    if (remaining <= 0) {
      // Enough time has passed — execute now
      if (timerId !== null) { clearTimeout(timerId); timerId = null; }
      return invoke(args, now);
    }

    // Inside throttle window: schedule trailing call if not already scheduled
    if (trailing && timerId === null) {
      timerId = setTimeout(trailingEdge, remaining);
    }

    return result;
  }

  throttled.cancel = function (): void {
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    lastCallTime = null;
    lastArgs = null;
  };

  throttled.flush = function (): ReturnType<T> | undefined {
    if (timerId !== null && lastArgs !== null) {
      const args = lastArgs;
      throttled.cancel();
      return invoke(args, Date.now());
    }
    return result;
  };

  return throttled as ThrottledFn<T>;
}

// ============================================================
// DEMO 3: Throttle vs rAF for scroll handlers
// ============================================================

// Approach A: Throttle at ~60fps (16ms)
const throttledScrollHandler = throttle(() => {
  const scrollY = window.scrollY;
  updateParallax(scrollY);
  checkInfiniteScrollTrigger(scrollY);
}, 16, { leading: true, trailing: true });

window.addEventListener('scroll', () => throttledScrollHandler(), { passive: true });

// Approach B: requestAnimationFrame (better for visual work)
let rafPending = false;
function onScrollRAF(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    updateParallax(window.scrollY);
    rafPending = false;
  });
}
window.addEventListener('scroll', onScrollRAF, { passive: true });

// Stubs:
function updateParallax(scrollY: number): void { /* update CSS transform */ }
function checkInfiniteScrollTrigger(scrollY: number): void { /* load more if near bottom */ }

// ============================================================
// DEMO 4: React hook — throttled event handler
// ============================================================

import { useEffect, useMemo, useRef } from 'react';

function useThrottle<T extends (...args: unknown[]) => ReturnType<T>>(
  fn: T,
  delay: number,
  options?: ThrottleOptions
): ThrottledFn<T> {
  const throttledFn = useMemo(
    () => throttle(fn, delay, options),
    [delay] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => () => { throttledFn.cancel(); }, [throttledFn]);

  return throttledFn;
}

// Usage in component:
import React, { useState } from 'react';

function ScrollTracker() {
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = useThrottle(
    () => { setScrollPosition(window.scrollY); },
    100,
    { leading: true, trailing: true }
  );

  useEffect(() => {
    window.addEventListener('scroll', () => handleScroll(), { passive: true });
    return () => window.removeEventListener('scroll', () => handleScroll()); // Note: in real code, use stable reference
  }, [handleScroll]);

  return <div>Scroll position: {scrollPosition}px</div>;
}

// ============================================================
// DEMO 5: Bosch dashboard — WebSocket data throttle (Angular pattern)
// ============================================================

import { Subject, throttleTime } from 'rxjs';

interface SensorReading { sensorId: string; value: number; timestamp: number }

// In Angular component with RxJS (cleaner for Observable streams)
const sensorReadings$ = new Subject<SensorReading>();

// Throttle to 10Hz (100ms) for chart updates
// Note: RxJS throttleTime is leading by default
const throttledReadings$ = sensorReadings$.pipe(
  throttleTime(100, undefined, { leading: true, trailing: true })
);

// Subscribe to throttled stream for chart updates
const sub = throttledReadings$.subscribe(reading => {
  updateChartData(reading.sensorId, reading.value);
});

function updateChartData(id: string, value: number): void { /* chart update */ }
// On destroy: sub.unsubscribe();
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (timer-based, 10 lines) is the interview target — write this fluently and explain the leading-edge behaviour. The interviewer checks that you understand the timer cooldown pattern.
- **Production:** Demo 2 (timestamp-based with trailing support) and Demo 5 (RxJS `throttleTime` in Angular) are the production patterns. RxJS's `throttleTime` is preferable in Angular/RxJS codebases — it's tested, cancellable, and composable with other operators.

---

## 🧠 7. Memory Aid

**Mental Model:** Throttle is a nightclub bouncer at peak hours — once they let someone in, they put up the rope for a fixed amount of time. The first person in the queue gets through immediately. The people who arrive in the next 100ms wait. After 100ms, the next person is let in. The bouncer never lets the crowd rush in all at once — just one at a time, every N ms.

**If you go blank:** *"Throttle: max 1 call per interval. Basic: closure over timerId. On call: if timerId exists, return. Execute fn, set timer. When timer fires: clear timerId (ready for next). Leading = fire immediately first call. Trailing = fire after interval end if calls arrived during window."*

**Mnemonic:** **FIRE-LOCK-UNLOCK** — **F**ire (execute), **L**ock (set timer = cooldown), **U**nlock (timer fires = ready again).

---

## ✅ 8. Why & How Summary

**Why it matters:**
→ **UX:** Smooth scroll effects, responsive drag handles, and real-time dashboard charts all require throttle — not debounce. A scroll parallax effect that fires only after scrolling stops (debounce) is broken UX. Throttled at 60fps it's fluid.
→ **Performance:** WebSocket data streams at 50Hz throttled to 10Hz for UI updates = 80% reduction in DOM operations. Charts stay smooth and the main thread has headroom for user interactions.
→ **Business:** Throttle is a standard interview coding question at all four target companies. Combined with debounce, it tests mastery of closures, timers, and the distinction between rate-limiting strategies — all core to senior frontend engineering.

**How it works (3 sentences):**
Throttle limits a function to execute at most once per specified time interval — either by maintaining a "cooldown" timer (timer-based) or by comparing the current timestamp against the time of the last execution (timestamp-based). With leading edge enabled (the default), the first call executes immediately and subsequent calls within the interval are ignored; with trailing edge enabled, the last call during the interval is held and executed when the interval expires, ensuring the most recent state is always processed. Unlike debounce, which waits for silence, throttle provides regular execution during continuous activity — making it the correct choice for scroll handlers, drag coordinates, and high-frequency data streams where ongoing feedback is needed.

**Company relevance:**
- **Microsoft:** VS Code's editor scroll handler, IntelliSense hover detection, and file tree scrolling all use throttle patterns. Microsoft's Fluent UI library provides a built-in `useThrottle` hook that follows the timestamp-based pattern.
- **Adobe:** Adobe's canvas applications (XD, Illustrator, Photoshop Web) throttle all `pointermove` handlers to `requestAnimationFrame` rate. Adobe's engineering docs describe "rAF throttle" as a standard pattern for any handler that triggers canvas operations.
- **Salesforce:** Lightning Experience's virtual scrolling implementation uses throttle for scroll-position monitoring. Salesforce's LWC Recipes repository includes a `throttle` utility in its shared utilities module.
- **Cisco:** WebEx's video frame rendering pipeline uses a throttled `requestAnimationFrame` loop. Screen sharing frame capture throttled at the target quality level (low bandwidth = lower fps = higher throttle interval).

---
✅ **Topic 16/486 complete.**
→ **Continuing to Topic 17: Implement curry, memoize, once, pipe**
