# Zerodha — Staff Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Zerodha |
| **Role** | Staff Engineer |
| **Level** | Staff |
| **YOE** | 10 years |
| **Date** | July 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Zerodha-Interview-Questions-E1474855.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 7 (Online Assessment → Frontend System Design → Frontend Coding - JS Deep Dive + 4 more)
- **Timeline:** 4 weeks
- **Format:** Onsite at Hyderabad campus
- **Rejection Reason:** Too implementation-focused in design

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Debounce with leading/trailing/maxWait/cancel/flush**
2. **Virtual scroll for 100K+ items**
3. **Memoize with LRU cache and TTL expiry**

### 💡 Interview-Ready Answer — Virtual DOM diffing

```javascript
function createElement(type, props = {}, ...children) {
  return { type, props, children: children.flat() };
}

function diff(oldNode, newNode) {
  if (!oldNode) return { type: 'CREATE', node: newNode };
  if (!newNode) return { type: 'REMOVE' };
  if (typeof oldNode !== typeof newNode || oldNode.type !== newNode.type)
    return { type: 'REPLACE', node: newNode };
  if (newNode.type) {
    return {
      type: 'UPDATE',
      props: diffProps(oldNode.props, newNode.props),
      children: newNode.children.map((child, i) => diff(oldNode.children[i], child))
    };
  }
  return null;
}

function diffProps(oldProps = {}, newProps = {}) {
  const patches = [];
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  for (const key of allKeys) {
    if (oldProps[key] !== newProps[key]) patches.push({ key, value: newProps[key] });
  }
  return patches;
}

function patch(parent, patches, index = 0) {
  if (!patches) return;
  const element = parent.childNodes[index];
  switch (patches.type) {
    case 'CREATE': parent.appendChild(render(patches.node)); break;
    case 'REMOVE': parent.removeChild(element); break;
    case 'REPLACE': parent.replaceChild(render(patches.node), element); break;
    case 'UPDATE':
      patches.props.forEach(({ key, value }) =>
        value == null ? element.removeAttribute(key) : element.setAttribute(key, value));
      patches.children.forEach((child, i) => patch(element, child, i));
      break;
  }
}

function render(vnode) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  const el = document.createElement(vnode.type);
  Object.entries(vnode.props || {}).forEach(([k, v]) => el.setAttribute(k, v));
  (vnode.children || []).forEach(child => el.appendChild(render(child)));
  return el;
}
```

---

## Round 2: Frontend System Design
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Design search engine results page**

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

## Round 3: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **structuredClone polyfill for all types**
2. **Retry with exponential backoff + jitter + AbortController**
3. **Function.prototype.bind polyfill with new support**

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

## Round 4: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Led major frontend architecture migration**
2. **Convinced leadership to reduce tech debt**
3. **Owned cross-team initiative improving deploy times**

### 💡 STAR Answer

**Situation:** Led team of 5 at Zerodha to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 5: DSA Round
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Min window substring - sliding window**
2. **Alien dictionary - topological sort**

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

## Round 6: Bar Raiser
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Pushed back on product requirements**
2. **Mentored junior developer on complex feature**
3. **Built design system from scratch**

### 💡 STAR Answer

**Situation:** Led team of 5 at Zerodha to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 7: Architecture Deep Dive
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Design Figma-like collaborative design tool**

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

## 🎯 Key Takeaways

- Zerodha heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Easy | JavaScript, DOM, CSS, Async |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Frontend Coding - JS Deep Dive | Very Hard | Closures, Prototypes, Promises, Event Loop |
| Behavioral / LP | Medium | Leadership, Ownership, Impact, Mentorship |
| DSA Round | Medium | Arrays, Trees, Graphs, Dynamic Programming |
| Bar Raiser | Easy | Customer Obsession, Dive Deep, Bias for Action |
| Architecture Deep Dive | Hard | Micro-frontends, CI/CD, Observability |
