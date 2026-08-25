# Swiggy — SDE-3 Frontend Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Swiggy |
| **Role** | SDE-3 Frontend |
| **Level** | SDE-3 |
| **YOE** | 9 years |
| **Date** | December 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - React/Framework → Frontend System Design → Low-Level Design + 1 more)
- **Timeline:** 4 weeks
- **Format:** Virtual (Hackerrank + Zoom)

---

## Round 1: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Accessible autocomplete (WAI-ARIA)**
2. **Theme system with CSS variables + Context**

### 💡 Interview-Ready Answer

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

## Round 2: Frontend System Design
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Design WhatsApp chat frontend**

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

## Round 3: Low-Level Design
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design video conferencing UI (Meet/Zoom)**

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

## Round 4: Hiring Manager
**Duration:** 45 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Convinced leadership to reduce tech debt**
2. **Led major frontend architecture migration**
3. **Handled critical production incident**

### 💡 STAR Answer

**Situation:** Led team of 5 at Swiggy to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Swiggy heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - React/Framework | Very Hard | React Hooks, Virtual DOM, State Management |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
| Low-Level Design | Hard | Design Patterns, SOLID, API Design |
| Hiring Manager | Easy | Team Management, Vision, Growth Strategy |
