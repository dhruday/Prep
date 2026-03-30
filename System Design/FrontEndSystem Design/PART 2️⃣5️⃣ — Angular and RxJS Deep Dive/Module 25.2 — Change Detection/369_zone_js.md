# 369 – zone.js – How It Intercepts Async Operations

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**zone.js** monkey-patches all browser async APIs (setTimeout, Promise, addEventListener, XHR, fetch) to notify Angular when async work completes. Angular runs change detection after each async operation exits the zone. This is why Angular "magically" updates the UI — zone.js tells it when to check.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── WHAT ZONE.JS PATCHES ────
// - setTimeout / setInterval
// - Promise.then / catch / finally
// - addEventListener / removeEventListener
// - XMLHttpRequest / fetch
// - MutationObserver, requestAnimationFrame
// - WebSocket events

// ──── HOW ANGULAR USES ZONES ────
// Angular creates an NgZone (wraps zone.js)
// Every async callback → zone.js intercept → NgZone.onMicrotaskEmpty → CD

// Simplified Flow:
// click handler → zone.js intercepts → callback runs →
// zone.js notifies Angular → ApplicationRef.tick() → CD runs

// ──── NgZone API ────
@Component({ /* ... */ })
export class PerformanceComponent {
  constructor(private ngZone: NgZone) {}

  // Run OUTSIDE Angular zone — no CD triggered
  startPolling() {
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
        this.checkForUpdates(); // runs every 1s, no CD!
        if (this.hasNewData) {
          // Re-enter the zone when update needed
          this.ngZone.run(() => {
            this.data = this.newData; // triggers CD
          });
        }
      }, 1000);
    });
  }

  // Mouse move — high frequency, skip CD
  setupMouseTracking(element: HTMLElement) {
    this.ngZone.runOutsideAngular(() => {
      element.addEventListener('mousemove', (e) => {
        // Update canvas/WebGL directly, no CD
        this.updateCursor(e.clientX, e.clientY);
      });
    });
  }
}

// ──── ZONE.JS INTERNALS ────
// Zone.current — the active zone
// Zone.fork() — create child zone
// Zone.run() — execute in zone
// Angular's NgZone has:
//   onMicrotaskEmpty → triggers ApplicationRef.tick()
//   onUnstable → CD about to run
//   onStable → CD finished, no pending tasks

// ──── WHY ZONE.JS IS HEAVY ────
// 1. Patches 200+ browser APIs at startup
// 2. Wraps every async callback in zone context
// 3. ~100KB added to bundle (before tree-shaking)
// 4. Can cause unexpected CD in 3rd-party libs
```

### Zone.js Flow
```
User clicks button
  → zone.js intercepts addEventListener callback
    → callback runs (your handler code)
      → zone.js detects microtask queue empty
        → NgZone.onMicrotaskEmpty fires
          → ApplicationRef.tick()
            → Change detection runs on component tree
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"zone.js monkey-patches async APIs to auto-trigger Angular CD. But for perf-sensitive code — animations, WebSocket streams, mousemove — I use NgZone.runOutsideAngular() to skip unnecessary CD, then NgZone.run() to re-enter when UI update is needed. At Bosch, our real-time dashboard used this pattern for WebSocket data to avoid 60fps CD."*

## 4. 🧠 MEMORY AID
**"zone.js patches async APIs → tells Angular 'something changed' → CD runs. Escape with runOutsideAngular(). Return with run()."**
