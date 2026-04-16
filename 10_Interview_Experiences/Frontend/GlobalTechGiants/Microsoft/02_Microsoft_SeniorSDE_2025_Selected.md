# Microsoft — Senior SDE Interview Experience (2025)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Microsoft |
| **Role** | Senior SDE |
| **Level** | L63 |
| **YOE** | 13 years |
| **Date** | December 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Interview Source](https://leetcode.com/discuss/interview-experience?currentPage=1&orderBy=hot&query=Microsoft+Frontend+Engineer) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 6 (Online Assessment → Hiring Manager → DSA Round + 3 more)
- **Timeline:** 1 month
- **Format:** Onsite at Bangalore campus

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Function.prototype.bind polyfill with new support**
2. **Concurrent task runner with max concurrency**
3. **EventEmitter with wildcard, once(), namespaces**

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

## Round 2: Hiring Manager
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Conflict with backend team on API contracts**
2. **Rewritten critical component under deadline**
3. **Improved page performance by 60%+**

### 💡 STAR Answer

**Situation:** Led team of 5 at Microsoft to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 3: DSA Round
**Duration:** 60 min | **Interviewer:** Senior SDE

### Questions Asked
1. **Alien dictionary - topological sort**
2. **Min window substring - sliding window**

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

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Director

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

## Round 5: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Data grid with virtualization/sort/filter/inline edit**
2. **Accessible autocomplete (WAI-ARIA)**

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

## Round 6: Machine Coding
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Spreadsheet with formula evaluation**

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

- Microsoft heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Strong communication and structured thinking compensated for minor technical gaps
- Production-level thinking (error handling, accessibility, testing) was the key differentiator

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Very Hard | JavaScript, DOM, CSS, Async |
| Hiring Manager | Easy | Team Management, Vision, Growth Strategy |
| DSA Round | Medium | Arrays, Trees, Graphs, Dynamic Programming |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
| Frontend Coding - React/Framework | Hard | React Hooks, Virtual DOM, State Management |
| Machine Coding | Easy | Component Design, State Management, A11y |
