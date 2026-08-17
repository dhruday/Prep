# Cisco — Senior Software Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Cisco |
| **Role** | Senior Software Engineer |
| **Level** | L8 |
| **YOE** | 12 years |
| **Date** | July 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Cisco-Interview-Questions-E1425.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 6 (Bar Raiser → Frontend Coding - JS Deep Dive → DSA Round + 3 more)
- **Timeline:** 2 weeks
- **Format:** Hybrid (OA + Onsite loop)

---

## Round 1: Bar Raiser
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Introduced testing culture to zero-coverage team**
2. **Led major frontend architecture migration**
3. **Handled critical production incident**

### 💡 STAR Answer

**Situation:** Led team of 5 at Cisco to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 2: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **structuredClone polyfill for all types**
2. **Deep clone with circular refs, Map, Set, RegExp**
3. **Custom Router with dynamic segments and guards**

### 💡 Interview-Ready Answer — Event emitter

```javascript
class EventEmitter {
  #events = new Map();

  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    const entry = { fn: listener, once: false };
    this.#events.get(event).add(entry);
    return () => this.#events.get(event).delete(entry); // unsubscribe
  }

  once(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add({ fn: listener, once: true });
  }

  emit(event, ...args) {
    const listeners = this.#events.get(event);
    if (!listeners) return false;
    for (const entry of [...listeners]) {
      entry.fn(...args);
      if (entry.once) listeners.delete(entry);
    }
    return true;
  }

  off(event, listener) {
    const listeners = this.#events.get(event);
    if (!listeners) return;
    for (const entry of listeners) {
      if (entry.fn === listener) { listeners.delete(entry); break; }
    }
  }

  removeAllListeners(event) {
    event ? this.#events.delete(event) : this.#events.clear();
  }
}
```

---

## Round 3: DSA Round
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Longest substring without repeats - sliding window**
2. **Serialize/deserialize binary tree**

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

## Round 4: Hiring Manager
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Led major frontend architecture migration**
3. **Built design system from scratch**

### 💡 STAR Answer

**Situation:** Led team of 5 at Cisco to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 5: Frontend System Design
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design spreadsheet app (Google Sheets)**

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

## Round 6: Machine Coding
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Spreadsheet with formula evaluation**

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

- Cisco heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bar Raiser | Medium | Customer Obsession, Dive Deep, Bias for Action |
| Frontend Coding - JS Deep Dive | Medium | Closures, Prototypes, Promises, Event Loop |
| DSA Round | Medium | Arrays, Trees, Graphs, Dynamic Programming |
| Hiring Manager | Very Hard | Team Management, Vision, Growth Strategy |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Machine Coding | Hard | Component Design, State Management, A11y |
