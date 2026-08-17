# Acko — SDE-3 Frontend Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Acko |
| **Role** | SDE-3 Frontend |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | July 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Acko-Interview-Questions-E2127085.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 4 (Frontend Coding - React/Framework → Hiring Manager → Bar Raiser + 1 more)
- **Timeline:** 1 month
- **Format:** Onsite at Hyderabad campus

---

## Round 1: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Search-as-you-type with debounce + cache**
2. **Real-time collaborative text editor (CRDTs)**

### 💡 Interview-Ready Answer

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

## Round 2: Hiring Manager
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Led major frontend architecture migration**
2. **Conflict with backend team on API contracts**
3. **Mentored junior developer on complex feature**

### 💡 STAR Answer

**Situation:** Led team of 5 at Acko to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: Bar Raiser
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Mentored junior developer on complex feature**
2. **Owned cross-team initiative improving deploy times**
3. **Conflict with backend team on API contracts**

### 💡 STAR Answer

**Situation:** Led team of 5 at Acko to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Engineering Manager

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

## 🎯 Key Takeaways

- Acko heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Frontend Coding - React/Framework | Easy | React Hooks, Virtual DOM, State Management |
| Hiring Manager | Medium | Team Management, Vision, Growth Strategy |
| Bar Raiser | Easy | Customer Obsession, Dive Deep, Bias for Action |
| Frontend System Design | Medium | Scalability, Real-time, Caching, Performance |
