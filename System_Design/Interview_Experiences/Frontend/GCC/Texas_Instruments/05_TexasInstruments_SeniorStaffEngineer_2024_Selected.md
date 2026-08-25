# Texas Instruments — Senior Staff Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Texas Instruments |
| **Role** | Senior Staff Engineer |
| **Level** | Senior Staff |
| **YOE** | 8 years |
| **Date** | February 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Texas-Instruments-Interview-Questions-E660.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 5 (Behavioral / LP → Frontend Coding - JS Deep Dive → Architecture Deep Dive + 2 more)
- **Timeline:** 10 days
- **Format:** Onsite at Bangalore campus

---

## Round 1: Behavioral / LP
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Made speed vs quality trade-off**
2. **Pushed back on product requirements**
3. **Mentored junior developer on complex feature**

### 💡 STAR Answer

**Situation:** Led team of 5 at Texas Instruments to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 2: Frontend Coding - JS Deep Dive
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Memoize with LRU cache and TTL expiry**
2. **Reactive state system using Proxy (MobX-like)**
3. **Pub/sub with namespaces and replay**

### 💡 Interview-Ready Answer — Virtual DOM diffing

```javascript
function createElement(type, props = {}, ...children) {
  return { type, props, children: children.flat() };
}

function diff(oldNode, newNode) {
  if (!oldNode) return { type: 'CREATE', node: newNode };
  if (!newNode) return { type: 'REMOVE' };
  if (typeof oldNode !== typeof newNode || oldNode.type !== newNode.type)
    return { type: 'REPLACE', node: newNode };
  if (newNode.type) {
    return {
      type: 'UPDATE',
      props: diffProps(oldNode.props, newNode.props),
      children: newNode.children.map((child, i) => diff(oldNode.children[i], child))
    };
  }
  return null;
}

function diffProps(oldProps = {}, newProps = {}) {
  const patches = [];
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  for (const key of allKeys) {
    if (oldProps[key] !== newProps[key]) patches.push({ key, value: newProps[key] });
  }
  return patches;
}

function patch(parent, patches, index = 0) {
  if (!patches) return;
  const element = parent.childNodes[index];
  switch (patches.type) {
    case 'CREATE': parent.appendChild(render(patches.node)); break;
    case 'REMOVE': parent.removeChild(element); break;
    case 'REPLACE': parent.replaceChild(render(patches.node), element); break;
    case 'UPDATE':
      patches.props.forEach(({ key, value }) =>
        value == null ? element.removeAttribute(key) : element.setAttribute(key, value));
      patches.children.forEach((child, i) => patch(element, child, i));
      break;
  }
}

function render(vnode) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  const el = document.createElement(vnode.type);
  Object.entries(vnode.props || {}).forEach(([k, v]) => el.setAttribute(k, v));
  (vnode.children || []).forEach(child => el.appendChild(render(child)));
  return el;
}
```

---

## Round 3: Architecture Deep Dive
**Duration:** 60 min | **Interviewer:** Director

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

## Round 4: DSA Round
**Duration:** 60 min | **Interviewer:** Director

### Questions Asked
1. **Longest substring without repeats - sliding window**
2. **Median from stream - two heaps**

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

## Round 5: Frontend System Design
**Duration:** 60 min | **Interviewer:** Staff Engineer

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

- Texas Instruments heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Behavioral / LP | Very Hard | Leadership, Ownership, Impact, Mentorship |
| Frontend Coding - JS Deep Dive | Easy | Closures, Prototypes, Promises, Event Loop |
| Architecture Deep Dive | Very Hard | Micro-frontends, CI/CD, Observability |
| DSA Round | Medium | Arrays, Trees, Graphs, Dynamic Programming |
| Frontend System Design | Hard | Scalability, Real-time, Caching, Performance |
