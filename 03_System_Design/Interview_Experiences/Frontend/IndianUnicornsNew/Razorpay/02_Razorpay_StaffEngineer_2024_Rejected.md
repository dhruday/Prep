# Razorpay — Staff Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Razorpay |
| **Role** | Staff Engineer |
| **Level** | Staff |
| **YOE** | 8 years |
| **Date** | January 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Machine Coding → Behavioral / LP → Frontend Coding - React/Framework + 1 more)
- **Timeline:** 1 month
- **Format:** Virtual (Hackerrank + Zoom)
- **Rejection Reason:** Behavioral lacked quantifiable metrics

---

## Round 1: Machine Coding
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Chat UI with threading + emoji**

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

## Round 2: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Rewritten critical component under deadline**
2. **Convinced leadership to reduce tech debt**
3. **Owned cross-team initiative improving deploy times**

### 💡 STAR Answer

**Situation:** Led team of 5 at Razorpay to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Notification system with toast queue**
2. **Data grid with virtualization/sort/filter/inline edit**

### 💡 Interview-Ready Answer

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

## Round 4: Frontend System Design
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

## 🎯 Key Takeaways

- Razorpay heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Very Hard | Component Design, State Management, A11y |
| Behavioral / LP | Very Hard | Leadership, Ownership, Impact, Mentorship |
| Frontend Coding - React/Framework | Very Hard | React Hooks, Virtual DOM, State Management |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
