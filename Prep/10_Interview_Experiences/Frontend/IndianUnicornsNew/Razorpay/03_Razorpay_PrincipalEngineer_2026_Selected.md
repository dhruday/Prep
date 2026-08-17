# Razorpay — Principal Engineer Interview Experience (2026)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Razorpay |
| **Role** | Principal Engineer |
| **Level** | Principal |
| **YOE** | 11 years |
| **Date** | May 2026 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 7 (Online Assessment → Architecture Deep Dive → Hiring Manager + 4 more)
- **Timeline:** 10 days
- **Format:** Virtual (Zoom + CoderPad)

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Director

### Questions Asked
1. **Custom Router with dynamic segments and guards**
2. **Proxy-based form validation**
3. **Observable with map/filter/switchMap operators**

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

## Round 2: Architecture Deep Dive
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Design Google Docs collaborative editor**

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

## Round 3: Hiring Manager
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Led major frontend architecture migration**
2. **Conflict with backend team on API contracts**
3. **Rewritten critical component under deadline**

### 💡 STAR Answer

**Situation:** Led team of 5 at Razorpay to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Design stock trading dashboard with WebSocket**

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
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Mentored junior developer on complex feature**
2. **Conflict with backend team on API contracts**
3. **Owned cross-team initiative improving deploy times**

### 💡 STAR Answer

**Situation:** Led team of 5 at Razorpay to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 6: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Search-as-you-type with debounce + cache**
2. **Theme system with CSS variables + Context**

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

## Round 7: Low-Level Design
**Duration:** 45 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Design e-commerce PLP (Amazon/Flipkart)**

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
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium | JavaScript, DOM, CSS, Async |
| Architecture Deep Dive | Medium | Micro-frontends, CI/CD, Observability |
| Hiring Manager | Hard | Team Management, Vision, Growth Strategy |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Bar Raiser | Hard | Customer Obsession, Dive Deep, Bias for Action |
| Frontend Coding - React/Framework | Medium | React Hooks, Virtual DOM, State Management |
| Low-Level Design | Very Hard | Design Patterns, SOLID, API Design |
