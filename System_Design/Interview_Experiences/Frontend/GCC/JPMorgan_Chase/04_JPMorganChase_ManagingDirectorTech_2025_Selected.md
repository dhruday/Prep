# JPMorgan Chase — Managing Director Tech Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | JPMorgan Chase |
| **Role** | Managing Director Tech |
| **Level** | MD |
| **YOE** | 10 years |
| **Date** | October 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/JPMorgan-Chase-Interview-Questions-E145.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - React/Framework → Behavioral / LP → Frontend System Design + 1 more)
- **Timeline:** 4 weeks
- **Format:** Onsite at Hyderabad campus

---

## Round 1: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **React.lazy + Suspense route splitting**
2. **Multi-step wizard with validation**

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

## Round 2: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Introduced testing culture to zero-coverage team**
2. **Owned cross-team initiative improving deploy times**
3. **Made speed vs quality trade-off**

### 💡 STAR Answer

**Situation:** Led team of 5 at JPMorgan Chase to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Frontend System Design
**Duration:** 60 min | **Interviewer:** Engineering Manager

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

## Round 4: Bar Raiser
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Improved page performance by 60%+**
2. **Handled scope creep on time-sensitive project**
3. **Led major frontend architecture migration**

### 💡 STAR Answer

**Situation:** Led team of 5 at JPMorgan Chase to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- JPMorgan Chase heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - React/Framework | Easy | React Hooks, Virtual DOM, State Management |
| Behavioral / LP | Very Hard | Leadership, Ownership, Impact, Mentorship |
| Frontend System Design | Medium | Scalability, Real-time, Caching, Performance |
| Bar Raiser | Hard | Customer Obsession, Dive Deep, Bias for Action |
