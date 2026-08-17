# Acko — Staff Engineer Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Acko |
| **Role** | Staff Engineer |
| **Level** | Staff |
| **YOE** | 13 years |
| **Date** | November 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Acko-Interview-Questions-E2127085.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - React/Framework → Hiring Manager → Frontend System Design + 1 more)
- **Timeline:** 2 weeks
- **Format:** Onsite at Hyderabad campus

---

## Round 1: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Infinite scroll with IntersectionObserver**
2. **Theme system with CSS variables + Context**

### 💡 Interview-Ready Answer

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

## Round 2: Hiring Manager
**Duration:** 45 min | **Interviewer:** Director

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Owned cross-team initiative improving deploy times**
3. **Mentored junior developer on complex feature**

### 💡 STAR Answer

**Situation:** Led team of 5 at Acko to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Frontend System Design
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Design social feed (Twitter/LinkedIn)**

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

## Round 4: DSA Round
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Serialize/deserialize binary tree**
2. **Merge K sorted lists - min heap**

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

## 🎯 Key Takeaways

- Acko heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - React/Framework | Medium | React Hooks, Virtual DOM, State Management |
| Hiring Manager | Easy | Team Management, Vision, Growth Strategy |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| DSA Round | Easy | Arrays, Trees, Graphs, Dynamic Programming |
