# Samsung RnD — Distinguished Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Samsung RnD |
| **Role** | Distinguished Engineer |
| **Level** | Distinguished |
| **YOE** | 8 years |
| **Date** | June 2024 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Samsung-Interview-Questions-E3363.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Online Assessment → Frontend Coding - JS Deep Dive → Hiring Manager + 1 more)
- **Timeline:** 2 weeks
- **Format:** Hybrid (OA + Onsite loop)

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Deep clone with circular refs, Map, Set, RegExp**
2. **Function.prototype.bind polyfill with new support**
3. **Pub/sub with namespaces and replay**

### 💡 Interview-Ready Answer — Deep clone

```javascript
function deepClone(obj, visited = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (visited.has(obj)) return visited.get(obj);

  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (obj instanceof Map) {
    const map = new Map();
    visited.set(obj, map);
    obj.forEach((v, k) => map.set(deepClone(k, visited), deepClone(v, visited)));
    return map;
  }
  if (obj instanceof Set) {
    const set = new Set();
    visited.set(obj, set);
    obj.forEach(v => set.add(deepClone(v, visited)));
    return set;
  }

  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  visited.set(obj, clone);
  for (const key of [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)]) {
    clone[key] = deepClone(obj[key], visited);
  }
  return clone;
}
```

---

## Round 2: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Template engine with expressions/loops/conditionals**
2. **Virtual scroll for 100K+ items**
3. **Custom Router with dynamic segments and guards**

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

## Round 3: Hiring Manager
**Duration:** 45 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Led major frontend architecture migration**
3. **Conflict with backend team on API contracts**

### 💡 STAR Answer

**Situation:** Led team of 5 at Samsung RnD to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Engineering Manager

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

## 🎯 Key Takeaways

- Samsung RnD heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Easy | JavaScript, DOM, CSS, Async |
| Frontend Coding - JS Deep Dive | Medium | Closures, Prototypes, Promises, Event Loop |
| Hiring Manager | Very Hard | Team Management, Vision, Growth Strategy |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
