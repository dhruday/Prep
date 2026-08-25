# Deutsche Bank — AVP Engineering Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Deutsche Bank |
| **Role** | AVP Engineering |
| **Level** | AVP |
| **YOE** | 10 years |
| **Date** | November 2025 |
| **Result** | ❌ Rejected |
| **Location** | Pune, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Deutsche-Bank-Interview-Questions-E3150.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - JS Deep Dive → Behavioral / LP → Frontend System Design + 1 more)
- **Timeline:** 10 days
- **Format:** Onsite at Hyderabad campus
- **Rejection Reason:** System design lacked scalability depth

---

## Round 1: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Debounce with leading/trailing/maxWait/cancel/flush**
2. **Function.prototype.bind polyfill with new support**
3. **Build custom Virtual DOM with diff algorithm**

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

## Round 2: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Improved page performance by 60%+**
2. **Handled critical production incident**
3. **Conflict with backend team on API contracts**

### 💡 STAR Answer

**Situation:** Led team of 5 at Deutsche Bank to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Frontend System Design
**Duration:** 60 min | **Interviewer:** Engineering Manager

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

## Round 4: Bar Raiser
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Pushed back on product requirements**
3. **Conflict with backend team on API contracts**

### 💡 STAR Answer

**Situation:** Led team of 5 at Deutsche Bank to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Deutsche Bank heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - JS Deep Dive | Hard | Closures, Prototypes, Promises, Event Loop |
| Behavioral / LP | Hard | Leadership, Ownership, Impact, Mentorship |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Bar Raiser | Hard | Customer Obsession, Dive Deep, Bias for Action |
