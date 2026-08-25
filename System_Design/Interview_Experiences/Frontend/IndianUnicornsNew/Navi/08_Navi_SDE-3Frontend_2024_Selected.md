# Navi — SDE-3 Frontend Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Navi |
| **Role** | SDE-3 Frontend |
| **Level** | SDE-3 |
| **YOE** | 14 years |
| **Date** | January 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Navi-Technologies-Interview-Questions-E3526498.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - JS Deep Dive → Frontend System Design → Behavioral / LP + 1 more)
- **Timeline:** 10 days
- **Format:** Onsite at Hyderabad campus

---

## Round 1: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Custom Router with dynamic segments and guards**
2. **Debounce with leading/trailing/maxWait/cancel/flush**
3. **Concurrent task runner with max concurrency**

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

## Round 2: Frontend System Design
**Duration:** 60 min | **Interviewer:** Senior SDE

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

## Round 3: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Improved page performance by 60%+**
2. **Conflict with backend team on API contracts**
3. **Introduced testing culture to zero-coverage team**

### 💡 STAR Answer

**Situation:** Led team of 5 at Navi to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Bar Raiser
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Convinced leadership to reduce tech debt**
2. **Built design system from scratch**
3. **Owned cross-team initiative improving deploy times**

### 💡 STAR Answer

**Situation:** Led team of 5 at Navi to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Navi heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - JS Deep Dive | Medium | Closures, Prototypes, Promises, Event Loop |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
| Behavioral / LP | Easy | Leadership, Ownership, Impact, Mentorship |
| Bar Raiser | Medium | Customer Obsession, Dive Deep, Bias for Action |
