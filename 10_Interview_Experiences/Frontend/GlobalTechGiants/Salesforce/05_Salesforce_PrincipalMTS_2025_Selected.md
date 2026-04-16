# Salesforce — Principal MTS Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Salesforce |
| **Role** | Principal MTS |
| **Level** | Lead MTS |
| **YOE** | 8 years |
| **Date** | August 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Interview Source](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 6 (Online Assessment → Frontend System Design → Bar Raiser + 3 more)
- **Timeline:** 10 days
- **Format:** Onsite at Bangalore campus

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Deep clone with circular refs, Map, Set, RegExp**
2. **Custom module bundler with dependency resolution**
3. **Proxy-based form validation**

### 💡 Interview-Ready Answer — Debounce advanced

```javascript
function debounce(fn, delay, { leading = false, trailing = true, maxWait } = {}) {
  let timer, lastArgs, lastThis, lastCallTime = 0, lastInvokeTime = 0;

  function invoke() {
    const args = lastArgs, context = lastThis;
    lastArgs = lastThis = null;
    lastInvokeTime = Date.now();
    fn.apply(context, args);
  }

  function debounced(...args) {
    const now = Date.now();
    lastArgs = args; lastThis = this; lastCallTime = now;

    if (leading && !timer) {
      invoke();
      timer = setTimeout(() => { timer = null; }, delay);
      return;
    }

    if (maxWait && now - lastInvokeTime >= maxWait) invoke();

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (trailing && lastArgs) invoke();
      timer = null;
    }, delay);
  }

  debounced.cancel = () => {
    clearTimeout(timer); timer = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timer && lastArgs) {
      invoke(); clearTimeout(timer); timer = null;
    }
  };

  return debounced;
}
```

---

## Round 2: Frontend System Design
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design multi-tenant SaaS admin panel**

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

## Round 3: Bar Raiser
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Convinced leadership to reduce tech debt**
2. **Rewritten critical component under deadline**
3. **Handled critical production incident**

### 💡 STAR Answer

**Situation:** Led team of 5 at Salesforce to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Hiring Manager
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Handled scope creep on time-sensitive project**
2. **Led major frontend architecture migration**
3. **Made speed vs quality trade-off**

### 💡 STAR Answer

**Situation:** Led team of 5 at Salesforce to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 5: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Concurrent task runner with max concurrency**
2. **Custom module bundler with dependency resolution**
3. **Signal-based fine-grained reactivity**

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

## Round 6: Low-Level Design
**Duration:** 45 min | **Interviewer:** Principal Engineer

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

## 🎯 Key Takeaways

- Salesforce heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium | JavaScript, DOM, CSS, Async |
| Frontend System Design | Medium | Scalability, Real-time, Caching, Performance |
| Bar Raiser | Very Hard | Customer Obsession, Dive Deep, Bias for Action |
| Hiring Manager | Medium | Team Management, Vision, Growth Strategy |
| Frontend Coding - JS Deep Dive | Very Hard | Closures, Prototypes, Promises, Event Loop |
| Low-Level Design | Hard | Design Patterns, SOLID, API Design |
