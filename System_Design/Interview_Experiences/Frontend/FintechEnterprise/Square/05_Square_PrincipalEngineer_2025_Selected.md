# Square — Principal Engineer Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Square |
| **Role** | Principal Engineer |
| **Level** | L7 |
| **YOE** | 14 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, US |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Square-Interview-Questions-E422592.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Behavioral / LP → Frontend Coding - JS Deep Dive → Bar Raiser + 1 more)
- **Timeline:** 3 weeks
- **Format:** Virtual (Zoom + CoderPad)

---

## Round 1: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Owned cross-team initiative improving deploy times**
2. **Rewritten critical component under deadline**
3. **Made speed vs quality trade-off**

### 💡 STAR Answer

**Situation:** Led team of 5 at Square to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 2: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **JSON.parse from scratch (recursive descent)**
2. **Pub/sub with namespaces and replay**
3. **Web Worker pool with task scheduling**

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

## Round 3: Bar Raiser
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Handled scope creep on time-sensitive project**
2. **Improved page performance by 60%+**
3. **Pushed back on product requirements**

### 💡 STAR Answer

**Situation:** Led team of 5 at Square to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Principal Engineer

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

## 🎯 Key Takeaways

- Square heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Behavioral / LP | Medium | Leadership, Ownership, Impact, Mentorship |
| Frontend Coding - JS Deep Dive | Very Hard | Closures, Prototypes, Promises, Event Loop |
| Bar Raiser | Medium | Customer Obsession, Dive Deep, Bias for Action |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
