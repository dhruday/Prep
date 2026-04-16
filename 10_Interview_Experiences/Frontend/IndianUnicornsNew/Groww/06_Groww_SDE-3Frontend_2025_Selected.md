# Groww — SDE-3 Frontend Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Groww |
| **Role** | SDE-3 Frontend |
| **Level** | SDE-3 |
| **YOE** | 10 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Groww-Interview-Questions-E2595498.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 5 (Machine Coding → Frontend System Design → Frontend Coding - React/Framework + 2 more)
- **Timeline:** 1 week
- **Format:** Hybrid (OA + Onsite loop)

---

## Round 1: Machine Coding
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Markdown editor with live preview**

### 💡 Interview-Ready Answer

```javascript
// Senior-level approach:
// 1. Parse + validate edge cases
// 2. O(n) or O(n log n) core algorithm
// 3. Handle: empty input, large datasets, concurrent access
// 4. Consider a11y (WCAG 2.1 AA), perf (DevTools), testing

function solve(input) {
  if (!input || !input.length) throw new TypeError('Input required');

  // Use appropriate data structure for O(1) lookups
  const seen = new Map();
  let result = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (seen.has(item)) {
      // Handle duplicate logic
      result.push([seen.get(item), i]);
    }
    seen.set(item, i);
  }

  return result;
}

// Time: O(n), Space: O(n) — optimal for this class of problems
```

---

## Round 2: Frontend System Design
**Duration:** 60 min | **Interviewer:** Staff Engineer

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

## Round 3: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Optimistic updates with rollback**
2. **Accessible autocomplete (WAI-ARIA)**

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

## Round 4: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Director

### Questions Asked
1. **Handled scope creep on time-sensitive project**
2. **Pushed back on product requirements**
3. **Mentored junior developer on complex feature**

### 💡 STAR Answer

**Situation:** Led team of 5 at Groww to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 5: DSA Round
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Median from stream - two heaps**
2. **LRU Cache O(1) - linked list + hashmap**

### 💡 Interview-Ready Answer

```javascript
// Senior-level approach:
// 1. Parse + validate edge cases
// 2. O(n) or O(n log n) core algorithm
// 3. Handle: empty input, large datasets, concurrent access
// 4. Consider a11y (WCAG 2.1 AA), perf (DevTools), testing

function solve(input) {
  if (!input || !input.length) throw new TypeError('Input required');

  // Use appropriate data structure for O(1) lookups
  const seen = new Map();
  let result = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (seen.has(item)) {
      // Handle duplicate logic
      result.push([seen.get(item), i]);
    }
    seen.set(item, i);
  }

  return result;
}

// Time: O(n), Space: O(n) — optimal for this class of problems
```

---

## 🎯 Key Takeaways

- Groww heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Easy | Component Design, State Management, A11y |
| Frontend System Design | Very Hard | Scalability, Real-time, Caching, Performance |
| Frontend Coding - React/Framework | Hard | React Hooks, Virtual DOM, State Management |
| Behavioral / LP | Hard | Leadership, Ownership, Impact, Mentorship |
| DSA Round | Medium | Arrays, Trees, Graphs, Dynamic Programming |
