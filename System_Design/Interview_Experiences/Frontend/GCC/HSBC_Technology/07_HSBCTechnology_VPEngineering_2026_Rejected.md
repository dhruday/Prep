# HSBC Technology — VP Engineering Interview Experience (2026)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | HSBC Technology |
| **Role** | VP Engineering |
| **Level** | VP |
| **YOE** | 12 years |
| **Date** | February 2026 |
| **Result** | ❌ Rejected |
| **Location** | Pune, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/HSBC-Interview-Questions-E3482.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 5 (Frontend System Design → Frontend Coding - JS Deep Dive → Low-Level Design + 2 more)
- **Timeline:** 3 weeks
- **Format:** Hybrid (OA + Onsite loop)
- **Rejection Reason:** Could not optimize DSA in time

---

## Round 1: Frontend System Design
**Duration:** 60 min | **Interviewer:** Principal Engineer

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

## Round 2: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Undo/redo system using command pattern**
2. **Deep clone with circular refs, Map, Set, RegExp**
3. **Memoize with LRU cache and TTL expiry**

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

## Round 3: Low-Level Design
**Duration:** 45 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design real-time analytics dashboard**

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

## Round 4: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Director

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Pushed back on product requirements**
3. **Improved page performance by 60%+**

### 💡 STAR Answer

**Situation:** Led team of 5 at HSBC Technology to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 5: Bar Raiser
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Convinced leadership to reduce tech debt**
2. **Made speed vs quality trade-off**
3. **Improved page performance by 60%+**

### 💡 STAR Answer

**Situation:** Led team of 5 at HSBC Technology to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- HSBC Technology heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
| Frontend Coding - JS Deep Dive | Hard | Closures, Prototypes, Promises, Event Loop |
| Low-Level Design | Medium | Design Patterns, SOLID, API Design |
| Behavioral / LP | Easy | Leadership, Ownership, Impact, Mentorship |
| Bar Raiser | Easy | Customer Obsession, Dive Deep, Bias for Action |
