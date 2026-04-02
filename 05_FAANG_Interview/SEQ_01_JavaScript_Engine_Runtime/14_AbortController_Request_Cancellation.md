# 14. AbortController & Request Cancellation
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 1 — JavaScript Engine & Runtime | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"`AbortController` is the standard Web API for cancelling asynchronous operations — primarily `fetch`, but also Event Listeners, WebSockets, and custom async workflows. You create a controller, pass its `signal` to `fetch`, and call `controller.abort()` to cancel. The `signal` is an `AbortSignal` — it fires an `abort` event wherever it's being used. `fetch` listens to this signal and rejects its Promise with a `DOMException('AbortError')` if aborted. This is critical for two production patterns: race conditions (cancel previous request when user types a new search query) and timeouts (abort requests that exceed SLA). At SAP, I used `AbortController` in the Fiori global search — every keystroke cancelled the prior request before starting a new one. Before this, users saw stale results from slower previous requests appearing after faster recent ones — a subtle but noticeable UX defect in a tool used by thousands of SAP employees daily."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**The problem before `AbortController`:**
Before `AbortController` (standardised ES2018, Chrome 66), the `XMLHttpRequest` API had an `.abort()` method. But `fetch` — the modern replacement — had NO cancellation mechanism. You couldn't tell an in-flight `fetch` to stop. This caused:

1. **Race conditions** — user types "reac" (triggers fetch), then "react" (another fetch). "react" resolves quickly, renders results. Then "reac" resolves slowly, overwrites "react" results with wrong data.

2. **Resource waste** — unmounted React components couldn't cancel pending fetches. The `fetch` completed, tried to `setState`, triggered "Can't perform a React state update on an unmounted component" warning (React 16) or silent logic error (React 18).

3. **Timeout limitation** — no native way to abort `fetch` after N seconds.

**`AbortController` solves all three:**
- Series of requests: abort previous on each new request
- Component unmount: abort all pending requests on `useEffect` cleanup
- Timeout: `setTimeout(() => controller.abort(), N)`

---

### How It Works Internally

**The AbortController / AbortSignal design:**

```
AbortController:
  .signal  → AbortSignal object (passed to fetch, event listeners)
  .abort(reason?) → sets signal.aborted = true, fires 'abort' event on signal

AbortSignal:
  .aborted  → boolean — true after abort() called
  .reason   → DOMException or custom reason passed to abort()
  .onabort  → event handler OR use signal.addEventListener('abort', fn)

Static methods (newer APIs):
  AbortSignal.timeout(ms)  → AbortSignal that auto-aborts after ms
  AbortSignal.any([s1,s2]) → AbortSignal that aborts when ANY input signal aborts
```

**Internal signal propagation:**

```
controller.abort() is called
  ↓
signal.aborted = true
signal.reason = DOMException('AbortError') or custom reason
  ↓
'abort' event fires on signal
  ↓
fetch API's internal listener on the signal receives the event
  ↓
fetch rejects its Promise with the signal.reason (DOMException AbortError)

Custom async code can: signal.addEventListener('abort', () => cleanup())
                  OR:  check signal.aborted inside async loops
```

---

### Architecture: The 3 Production Patterns

**Pattern 1 — Search debounce with cancellation (race condition fix):**
```
User types "r" → fetch(/search?q=r), AbortController AC1 created
User types "re" → AC1.abort() → fetch(r) cancelled
               → fetch(/search?q=re), AbortController AC2 created
User types "rea" → AC2.abort() → fetch(re) cancelled
                → fetch(/search?q=rea), AbortController AC3 created
Response arrives → render "rea" results
[r and re responses may arrive later but are already aborted → ignored]
```

**Pattern 2 — React useEffect cleanup:**
```
Component mounts → useEffect runs → fetch starts → AbortController created
Component unmounts → useEffect cleanup runs → controller.abort()
→ fetch rejects with AbortError → catch(e) ignores AbortError → no setState
```

**Pattern 3 — Timeout:**
```
// Option A: Manual
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), 3000);
fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(id));

// Option B: AbortSignal.timeout() (Chrome 103+)
fetch(url, { signal: AbortSignal.timeout(3000) });
```

---

### Data Flow

```
SEARCH COMPONENT:
─────────────────────────────────────────────────────────────────
onInput('react'):
  prevController?.abort()       ← cancel previous
  const controller = new AbortController();
  prevController = controller;

  fetch(`/search?q=react`, { signal: controller.signal })
    .then(res => res.json())
    .then(results => {
      if (!controller.signal.aborted) { // defensive check
        setResults(results);
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') throw err; // only ignore AbortError
    });

─────────────────────────────────────────────────────────────────
Network timeline:
   [fetch /search?q=r]  ─── AbortError ─────────────────────X
   [fetch /search?q=re] ─── AbortError ──────────X
   [fetch /search?q=rea]────────────────────────────────► resolves
   RENDER: "rea" results (correct — only latest request completes)
```

---

### Performance Implications

**Real network savings — AbortController does cancel the request:**
- In HTTP/1.1: The TCP connection is closed when fetch is aborted. Browser stops sending/receiving data.
- In HTTP/2: The stream is reset (RST_STREAM frame) — server is notified, can stop processing.
- In HTTP/3 (QUIC): Stream cancellation signal sent to server.

**Important:** Server may still process the request even after cancellation, depending on how far along it was when the signal arrived. ABort cancels the browser-side processing, but server-side work may be in progress.

**With debouncing vs without:**
```
Without AbortController + no debounce:
  User types 10 characters quickly → 10 HTTP requests fired
  Server processes all 10 (wasted compute)
  Client processes all 10 responses (may render stale results)

With AbortController (cancel on new keystroke):
  User types 10 characters quickly → 10 requests initiated, 9 cancelled immediately
  Server receives at most a few (network latency determines how many got through)
  Client renders only the final, correct response
  
Best practice: COMBINE debounce (don't start request until 300ms pause) 
               + AbortController (cancel if new request starts anyway)
```

---

### Scalability Considerations

| Scale | AbortController Concern |
|---|---|
| Simple app | Prevents memory leaks on component unmount (React warning eliminated) |
| Search-heavy app | Critical for correctness — without cancellation, stale results overwrite current |
| Realtime dashboards (Bosch) | WebSocket + AbortController for switching between data streams |
| API Gateway / BFF | Server-side AbortController in Node.js: pass `request.signal` from Fetch API server to downstream API calls — cancel downstream if browser cancels |

---

### Trade-offs

| Pattern | Trade-off |
|---|---|
| AbortController per request | Simple, standard | Each request needs its own controller |
| Shared controller for related requests | One `.abort()` cancels all | Must create new controller for next batch |
| `AbortSignal.timeout(ms)` | Cleanest syntax | Chrome 103+; polyfill needed for older |
| `AbortSignal.any([s1,s2])` | Combine timeout + cancel | Experimental — check support |

---

### ⚠️ Anti-Patterns & Pitfalls

- **Catching AbortError and swallowing ALL errors** — `catch(e => {})` — this hides real network errors too. Always check `e.name === 'AbortError'` before swallowing.

- **Not clearing the timeout when fetch succeeds** — `setTimeout(() => controller.abort(), 3000)` + successful fetch → timeout fires after 3s and aborts (now-completed) signal. Benign but wastes resources. Use `finally(() => clearTimeout(id))`.

- **Reusing an AbortController after abort()** — Once aborted, the signal is permanently `aborted: true`. Passing it to a new `fetch` immediately rejects that fetch. Create a new `AbortController` for each new request.

- **Not checking `signal.aborted` in custom async pipelines** — If you build an async loop that accepts a signal, check `if (signal.aborted) return;` or `if (signal.aborted) throw signal.reason;` at each iteration. Otherwise, your loop continues even after abort.

- **Not ignoring AbortError in catch** — `AbortError` is expected behaviour, not an application error. Logging it as an error creates false alerts in monitoring systems.

---

## 🏭 3. Real-World Examples

**SAP Fiori Global Search — cancellation per keystroke:**

SAP Fiori's global search bar triggers debounced API calls. Without `AbortController`, faster results from older queries would appear after slower queries — stale result overwrite. Adding `AbortController`: each new query aborts the previous. Implementation pattern exactly matches Pattern 1 above. Result: eliminated race condition bug reported in 3 separate tickets, tested across 5 browsers.

**Microsoft Outlook — email list refresh cancellation:**

Outlook Web cancels pending email refresh requests when the user switches mailbox folders quickly. `AbortController` per refresh operation, aborted when folder changes. Without this, switching between Inbox → Sent → Trash quickly could result in Sent's emails displaying in Inbox due to a late-arriving response rendering into the wrong view.

**React useEffect canonical pattern (all companies):**

Every company that uses React enforces this pattern in code review:
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal)
    .catch(err => { if (err.name !== 'AbortError') console.error(err); });
  return () => controller.abort(); // cleanup on unmount or re-run
}, [dependencies]);
```

**Adobe Stock — high-concurrency image preview cancellation:**

Adobe Stock's image grid: hundreds of thumbnail fetches in flight as the user scrolls. When a thumbnail scrolls out of the viewport, its fetch is aborted. This dramatically reduces bandwidth and server load — only fetches for visible thumbnails complete. Combining `IntersectionObserver` + `AbortController` per thumbnail is the standard pattern.

**Bosch WebSocket dashboard — stream switching:**

In Hruday's Bosch dashboard, switching between sensor data streams (e.g., changing from machine-A telemetry to machine-B telemetry) required closing the current WebSocket and opening a new one. `AbortController` was used to signal all pending data processing tasks for the previous stream to cancel before the new stream's data started flowing — ensuring no cross-stream data contamination in the shared chart state.

---

## 💬 4. Interview Execution

### Sample Answer (3-minute verbal)

> "`AbortController` is the standard API for cancelling async operations. You create a controller, extract its `signal`, pass the signal to `fetch` (or other async operations), and call `controller.abort()` to cancel. The signal becomes a communication channel — when aborted, it fires an event that fetch listens to, causing the Promise to reject with `DOMException AbortError`.
>
> The three production patterns I use: cancelling previous search requests when a new query starts (race condition prevention), aborting fetch in React's `useEffect` cleanup to prevent state updates on unmounted components, and implementing request timeouts via `setTimeout(() => controller.abort(), ms)`.
>
> The critical detail: AbortError is expected behaviour — not an application error. Always check `if (err.name !== 'AbortError')` before re-throwing or logging in your catch block.
>
> At SAP, implementing `AbortController` in the global search eliminated a stale-result race condition bug — previous slow queries were overwriting fresh fast results. One controller per keystroke, abort previous on each new input."

---

### Likely Follow-up Questions

1. **What error does `fetch` throw when aborted?** → `DOMException` with `name: 'AbortError'` and `message: 'The user aborted a request'`. This is the same error regardless of whether you called `controller.abort()` or a `AbortSignal.timeout()` expired. Check `err.name === 'AbortError'` or `err instanceof DOMException && err.name === 'AbortError'`.

2. **Can you pass a reason to `abort()`?** → Yes — `controller.abort(new Error('User cancelled'))` or `controller.abort('user-cancelled')`. The reason is available on `signal.reason` and is used as the rejection reason of the fetch Promise (instead of the default `DOMException`). ES2022+ feature.

3. **What is `AbortSignal.timeout(ms)`?** → A static method that creates an AbortSignal that automatically aborts after the specified milliseconds. No `AbortController` needed. Available since Chrome 103 / Node 17.3. Returns `DOMException` with `name: 'TimeoutError'` (not `AbortError`). Check both in your error handler if supporting timeouts.

4. **What happens if you call `abort()` after the fetch has already completed?** → Nothing harmful. A completed fetch's Promise has already resolved/rejected. The abort signal becomes permanently `aborted: true` but the fetch already settled. However, never reuse this controller for a new request — it will be immediately aborted.

5. **How would you cancel multiple fetch calls at once?** → Create one `AbortController` and pass the SAME `signal` to all `fetch` calls. One `controller.abort()` cancels all of them simultaneously. This is useful for "cancel all pending requests when user navigates away."

---

### vs Alternatives

| AbortController | Old XHR `.abort()` | Promise timeout pattern | Choose when |
|---|---|---|---|
| Works with fetch, Streams, Listeners | Only XHR | Hides in-flight request (doesn't cancel it) | AbortController: always, for modern fetch |
| Cancels in browser mid-request | Cancels mid-request | Promise resolves/rejects, request continues | AbortController: actual cancellation |
| Standard, composable | Legacy | Simpler for non-fetch cases | Timeout pattern: non-fetch async operations |
| Can combine signals (`AbortSignal.any`) | N/A | N/A | `AbortSignal.any`: composite cancellation |

---

### How to Signal Senior Thinking

> "Every non-trivial `useEffect` that makes a fetch call should have an `AbortController` in its cleanup function — this isn't optional defensive coding, it's required correct behaviour. In React 18's strict mode, effects run twice in development — this means you'll see your AbortController abort the 'extra' fetch immediately. If you see 'AbortError' in React dev tools, that's actually a sign your cleanup is working correctly. I use this to explain to junior developers why they should never be surprised by AbortError in their error boundary logs."

---

## 💻 5. Code Example

```typescript
// ============================================================
// DEMO 1: Basic AbortController with fetch
// ============================================================

async function fetchWithCancel(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal }); // pass signal to fetch
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);
  return response.json();
}

// Usage:
const acDemo = new AbortController();
fetchWithCancel('/api/data', acDemo.signal)
  .then(data => console.log('Success:', data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('Request cancelled — expected');
    } else {
      console.error('Network error:', err);
    }
  });
setTimeout(() => acDemo.abort(), 2000); // cancel after 2s if not resolved

// ============================================================
// DEMO 2: React useEffect with AbortController — canonical pattern
// ============================================================

import React, { useEffect, useState } from 'react';

interface User { id: number; name: string }

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUser(): Promise<void> {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        const data: User = await response.json();
        setUser(data); // only called if not aborted
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Expected — don't set error state for aborted request
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    loadUser();
    return () => controller.abort(); // cleanup: abort on unmount or userId change
  }, [userId]); // re-runs when userId changes — aborts previous, starts new

  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}

// ============================================================
// DEMO 3: Search with request cancellation (SAP Fiori pattern)
// ============================================================

class SearchService {
  private currentController: AbortController | null = null;

  async search(query: string): Promise<SearchResult[]> {
    // Cancel previous request
    this.currentController?.abort();
    this.currentController = new AbortController();

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
        { signal: this.currentController.signal }
      );
      return response.json() as Promise<SearchResult[]>;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return []; // Cancelled — return empty (previous result still showing)
      }
      throw err;
    }
  }

  cancelPending(): void {
    this.currentController?.abort();
    this.currentController = null;
  }
}

interface SearchResult { id: string; title: string }

// ============================================================
// DEMO 4: Request timeout with AbortSignal.timeout() (modern)
// + fallback pattern for older browsers
// ============================================================

function createTimeoutSignal(ms: number): AbortSignal {
  // Modern: Chrome 103+, Node 17.3+
  if ('timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  // Fallback: manual timeout
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
  return controller.signal;
}

async function fetchWithSLA<T>(url: string, slaMs: number): Promise<T> {
  const response = await fetch(url, { signal: createTimeoutSignal(slaMs) });
  return response.json() as Promise<T>;
}

// ============================================================
// DEMO 5: Cancel all pending requests on navigation (SPA pattern)
// ============================================================

class RequestManager {
  private controller = new AbortController();

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  cancelAll(reason = 'Navigation'): void {
    this.controller.abort(reason);
    this.controller = new AbortController(); // fresh controller for next batch
  }

  fetch<T>(url: string): Promise<T> {
    return fetch(url, { signal: this.signal }).then(r => r.json() as Promise<T>);
  }
}

// In router: on route change, cancel all pending requests
const requestManager = new RequestManager();
// router.beforeEach(() => requestManager.cancelAll('Route change'));
```

**Interview vs Production difference:**
- **Interview:** Demo 1 (basic cancel) and Demo 2 (React `useEffect`) — the must-know patterns. Being able to write Demo 2 from memory is a senior-level signal.
- **Production:** Demo 3 (`SearchService` class) is a clean abstraction used in real SPAs. Demo 4 (SLA timeout with modern `AbortSignal.timeout`) + Demo 5 (global request manager) are the production-hardened versions.

---

## 🧠 6. Memory Aid

**Mental Model:** `AbortController` is a remote control for async operations. The remote (controller) has one button: `abort()`. The TV (fetch) has a sensor (signal) that listens for the button press. Multiple TVs (fetches) can share the same remote's sensor. When you press the button, all listening TVs turn off simultaneously. You can't bring a turned-off TV back on — you need a new remote for the next operation.

**If you go blank:** *"AbortController: create controller, pass .signal to fetch, call .abort() to cancel. fetch rejects with AbortError. Always check err.name === 'AbortError' in catch before re-throwing. Patterns: cancel previous on new search, cancel on component unmount (useEffect cleanup), timeout via setTimeout + abort."*

**Mnemonic:** **CSC** — **C**reate controller, **S**ignal to fetch, **C**ancel on abort → ignore AbortError.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Stale search results overwriting current results is a confusing, jarring UX defect. `AbortController` eliminates this class of race-condition bugs entirely.
→ **Performance:** Aborting unnecessary fetches saves bandwidth (browser stops sending/receiving), server compute (HTTP/2 RST_STREAM notifies server to stop), and client work (no JSON parsing, no setState calls for stale responses).
→ **Business:** React's "setState on unmounted component" warning — eliminated with proper `useEffect` + `AbortController` cleanup. Enterprise apps with strict error monitoring (SAP, Salesforce) need clean logs — unnecessary warnings create on-call noise.

**How it works (3 sentences):**
`AbortController` creates a controller-signal pair where the controller's `.abort()` method sets the signal's `aborted` flag to true and fires an `abort` event; `fetch` listens to this signal and rejects its Promise with a `DOMException('AbortError')` when the signal fires. The pattern enables request cancellation (cancel previous search on new keystroke), component lifecycle management (abort all fetches when React component unmounts via `useEffect` return cleanup), and timeout enforcement (call `abort()` from `setTimeout`). The essential error-handling rule: always check `err.name === 'AbortError'` before re-throwing, because an `AbortError` is expected, not exceptional behaviour.

**Company relevance:**
- **Microsoft:** Office 365 enforces `AbortController` in all React data-fetching hooks. Azure Portal's component library provides a `useAbortableFetch` hook as a standard utility. TypeScript's compiler itself tests with AbortController for cancellable build operations.
- **Adobe:** Adobe Experience Manager's content search uses `AbortController` for autocomplete — each keystroke cancels prior requests. Adobe's Creative Cloud thumbnail loading uses IntersectionObserver + AbortController to cancel off-screen thumbnail fetches.
- **Salesforce:** LWC's `@salesforce/apex` wire service integration supports AbortController for cancelling apex method calls. Salesforce's Lightning Design System documentation includes `AbortController` in all async fetch examples.
- **Cisco:** WebEx's room join flow uses `AbortController` for the media negotiation sequence — if the user cancels "Joining..." midway, all pending signaling requests are aborted cleanly, preventing orphaned server-side session state.

---
✅ **Topic 14/486 complete.**
→ **Continuing to Topic 15: Implement debounce (with leading/trailing options)**
