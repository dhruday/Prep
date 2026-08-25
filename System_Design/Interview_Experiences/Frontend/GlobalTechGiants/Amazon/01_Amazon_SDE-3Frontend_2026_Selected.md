# Amazon — SDE-3 Frontend Interview Experience (2026)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Amazon |
| **Role** | SDE-3 Frontend |
| **Level** | L6 |
| **YOE** | 14 years |
| **Date** | October 2026 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Interview Source](https://leetcode.com/discuss/interview-experience?currentPage=1&orderBy=hot&query=Amazon+Frontend+Engineer) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - JS Deep Dive → Bar Raiser → Frontend System Design + 1 more)
- **Timeline:** 3 weeks
- **Format:** Onsite at Bangalore campus

---

## Round 1: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Template engine with expressions/loops/conditionals**
2. **Debounce with leading/trailing/maxWait/cancel/flush**
3. **Async generator pagination with abort**

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

## Round 2: Bar Raiser
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Handled scope creep on time-sensitive project**
2. **Conflict with backend team on API contracts**
3. **Owned cross-team initiative improving deploy times**

### 💡 STAR Answer

**Situation:** Led team of 5 at Amazon to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Frontend System Design
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Design payment checkout with 3DS**

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
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Introduced testing culture to zero-coverage team**
2. **Improved page performance by 60%+**
3. **Mentored junior developer on complex feature**

### 💡 STAR Answer

**Situation:** Led team of 5 at Amazon to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Amazon heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - JS Deep Dive | Very Hard | Closures, Prototypes, Promises, Event Loop |
| Bar Raiser | Easy | Customer Obsession, Dive Deep, Bias for Action |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Hiring Manager | Hard | Team Management, Vision, Growth Strategy |
