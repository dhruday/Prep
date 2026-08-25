# Bounce — SDE-3 Frontend Interview Experience (2026)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Bounce |
| **Role** | SDE-3 Frontend |
| **Level** | SDE-3 |
| **YOE** | 9 years |
| **Date** | August 2026 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Bounce-Interview-Questions-E2416893.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 5 (Online Assessment → Machine Coding → Hiring Manager + 2 more)
- **Timeline:** 3 weeks
- **Format:** Hybrid (OA + Onsite loop)
- **Rejection Reason:** Memory leaks and race conditions in code

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Async generator pagination with abort**
2. **Template engine with expressions/loops/conditionals**
3. **Proxy-based form validation**

### 💡 Interview-Ready Answer — Debounce advanced

```javascript
function debounce(fn, delay, { leading = false, trailing = true, maxWait } = {}) {
  let timer, lastArgs, lastThis, lastCallTime = 0, lastInvokeTime = 0;

  function invoke() {
    const args = lastArgs, context = lastThis;
    lastArgs = lastThis = null;
    lastInvokeTime = Date.now();
    fn.apply(context, args);
  }

  function debounced(...args) {
    const now = Date.now();
    lastArgs = args; lastThis = this; lastCallTime = now;

    if (leading && !timer) {
      invoke();
      timer = setTimeout(() => { timer = null; }, delay);
      return;
    }

    if (maxWait && now - lastInvokeTime >= maxWait) invoke();

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (trailing && lastArgs) invoke();
      timer = null;
    }, delay);
  }

  debounced.cancel = () => {
    clearTimeout(timer); timer = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timer && lastArgs) {
      invoke(); clearTimeout(timer); timer = null;
    }
  };

  return debounced;
}
```

---

## Round 2: Machine Coding
**Duration:** 90 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Nested comment system with CRUD**

### 💡 Interview-Ready Answer

```javascript
// Senior-level approach:
// 1. Parse + validate edge cases
// 2. O(n) or O(n log n) core algorithm
// 3. Handle: empty input, large datasets, concurrent access
// 4. Consider a11y (WCAG 2.1 AA), perf (DevTools), testing

function solve(input) {
  if (!input || !input.length) throw new TypeError('Input required');

  // Use appropriate data structure for O(1) lookups
  const seen = new Map();
  let result = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (seen.has(item)) {
      // Handle duplicate logic
      result.push([seen.get(item), i]);
    }
    seen.set(item, i);
  }

  return result;
}

// Time: O(n), Space: O(n) — optimal for this class of problems
```

---

## Round 3: Hiring Manager
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Built design system from scratch**
2. **Conflict with backend team on API contracts**
3. **Led major frontend architecture migration**

### 💡 STAR Answer

**Situation:** Led team of 5 at Bounce to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design browser code editor (CodeSandbox)**

### 💡 Interview-Ready Answer

```
+----------------------------------------------------------+
|                    CDN Layer (CloudFront)                  |
+----------------------------------------------------------+
|  Load Balancer  |  API Gateway  |  WebSocket Gateway      |
+----------------------------------------------------------+
|  App Shell (Module Federation)                            |
|  +------------+  +----------+  +-----------+              |
|  | Feature A  |  | Feature B|  | Feature C |              |
|  +------------+  +----------+  +-----------+              |
+----------------------------------------------------------+
|  State Store (Redux/Zustand)  |  Cache (Service Worker)   |
+----------------------------------------------------------+
```

**Key Design Decisions:**

| Decision | Choice | Reason |
|----------|--------|--------|
| Rendering | SSR + Hydration | SEO + fast FCP |
| State | Redux Toolkit + RTK Query | Predictable, cached |
| Real-time | WebSocket + SSE fallback | Low latency |
| Code Splitting | Route-based + lazy | Fast initial load |
| Caching | Service Worker + HTTP cache | Offline support |
| Monitoring | Web Vitals + Sentry | Proactive perf tracking |

---

## Round 5: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **structuredClone polyfill for all types**
2. **Custom module bundler with dependency resolution**
3. **Concurrent task runner with max concurrency**

### 💡 Interview-Ready Answer — Promise polyfills

```javascript
class MyPromise {
  #state = 'pending'; #value; #handlers = [];
  constructor(executor) {
    const resolve = (value) => {
      if (this.#state !== 'pending') return;
      this.#state = 'fulfilled'; this.#value = value;
      this.#handlers.forEach(h => h.onFulfilled(value));
    };
    const reject = (reason) => {
      if (this.#state !== 'pending') return;
      this.#state = 'rejected'; this.#value = reason;
      this.#handlers.forEach(h => h.onRejected(reason));
    };
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = {
        onFulfilled: v => {
          try { resolve(typeof onFulfilled === 'function' ? onFulfilled(v) : v); }
          catch (e) { reject(e); }
        },
        onRejected: e => {
          try {
            if (typeof onRejected === 'function') resolve(onRejected(e));
            else reject(e);
          } catch (e2) { reject(e2); }
        }
      };
      if (this.#state === 'pending') this.#handlers.push(handle);
      else if (this.#state === 'fulfilled') queueMicrotask(() => handle.onFulfilled(this.#value));
      else queueMicrotask(() => handle.onRejected(this.#value));
    });
  }

  catch(fn) { return this.then(null, fn); }
  static resolve(v) { return new MyPromise(r => r(v)); }
  static reject(e) { return new MyPromise((_, r) => r(e)); }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = []; let count = 0;
      const arr = [...promises];
      if (!arr.length) return resolve([]);
      arr.forEach((p, i) => MyPromise.resolve(p).then(v => {
        results[i] = v;
        if (++count === arr.length) resolve(results);
      }, reject));
    });
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      for (const p of promises) MyPromise.resolve(p).then(resolve, reject);
    });
  }
}
```

---

## 🎯 Key Takeaways

- Bounce heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium | JavaScript, DOM, CSS, Async |
| Machine Coding | Hard | Component Design, State Management, A11y |
| Hiring Manager | Easy | Team Management, Vision, Growth Strategy |
| Frontend System Design | Medium | Scalability, Real-time, Caching, Performance |
| Frontend Coding - JS Deep Dive | Medium | Closures, Prototypes, Promises, Event Loop |
