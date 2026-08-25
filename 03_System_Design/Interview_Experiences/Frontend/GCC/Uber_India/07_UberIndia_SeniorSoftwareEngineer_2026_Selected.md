# Uber India — Senior Software Engineer Interview Experience (2026)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Uber India |
| **Role** | Senior Software Engineer |
| **Level** | L5a |
| **YOE** | 12 years |
| **Date** | October 2026 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Interview Source](https://leetcode.com/discuss/interview-experience?currentPage=1&orderBy=hot&query=Uber+Frontend+Engineer) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 5 (Behavioral / LP → Frontend Coding - React/Framework → Frontend System Design + 2 more)
- **Timeline:** 3 days (onsite loop)
- **Format:** Virtual (Zoom + CoderPad)

---

## Round 1: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Handled scope creep on time-sensitive project**
2. **Pushed back on product requirements**
3. **Made speed vs quality trade-off**

### 💡 STAR Answer

**Situation:** Led team of 5 at Uber India to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 2: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **File upload with chunked upload and resume**
2. **Calendar with drag-to-resize events**

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

## Round 3: Frontend System Design
**Duration:** 60 min | **Interviewer:** Senior SDE

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

## Round 4: Architecture Deep Dive
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

## Round 5: Bar Raiser
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Convinced leadership to reduce tech debt**
2. **Conflict with backend team on API contracts**
3. **Led major frontend architecture migration**

### 💡 STAR Answer

**Situation:** Led team of 5 at Uber India to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Uber India heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Behavioral / LP | Very Hard | Leadership, Ownership, Impact, Mentorship |
| Frontend Coding - React/Framework | Medium | React Hooks, Virtual DOM, State Management |
| Frontend System Design | Hard | Scalability, Real-time, Caching, Performance |
| Architecture Deep Dive | Easy | Micro-frontends, CI/CD, Observability |
| Bar Raiser | Easy | Customer Obsession, Dive Deep, Bias for Action |
