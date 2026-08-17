# Freshworks — Senior Software Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Freshworks |
| **Role** | Senior Software Engineer |
| **Level** | IC3 |
| **YOE** | 7 years |
| **Date** | September 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Freshworks-Interview-Questions-E1009498.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - JS Deep Dive → Frontend System Design → Bar Raiser + 1 more)
- **Timeline:** 1 week
- **Format:** Virtual (Hackerrank + Zoom)
- **Rejection Reason:** LP answers lacked org-wide impact

---

## Round 1: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Custom Router with dynamic segments and guards**
2. **EventEmitter with wildcard, once(), namespaces**
3. **Build custom Virtual DOM with diff algorithm**

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

## Round 3: Bar Raiser
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Built design system from scratch**
2. **Rewritten critical component under deadline**
3. **Handled scope creep on time-sensitive project**

### 💡 STAR Answer

**Situation:** Led team of 5 at Freshworks to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Handled critical production incident**
2. **Owned cross-team initiative improving deploy times**
3. **Improved page performance by 60%+**

### 💡 STAR Answer

**Situation:** Led team of 5 at Freshworks to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## 🎯 Key Takeaways

- Freshworks heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - JS Deep Dive | Easy | Closures, Prototypes, Promises, Event Loop |
| Frontend System Design | Medium | Scalability, Real-time, Caching, Performance |
| Bar Raiser | Hard | Customer Obsession, Dive Deep, Bias for Action |
| Behavioral / LP | Hard | Leadership, Ownership, Impact, Mentorship |
