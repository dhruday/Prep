# Groww — Principal Engineer Interview Experience (2024)

## 📋 Meta

| Field | Details |
|-------|--------|
| **Company** | Groww |
| **Role** | Principal Engineer |
| **Level** | Principal |
| **YOE** | 12 years |
| **Date** | November 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [Interview Source](https://www.glassdoor.co.in/Interview/Groww-Interview-Questions-E2595498.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview

- **Total Rounds:** 6 (Online Assessment → Frontend Coding - React/Framework → Low-Level Design + 3 more)
- **Timeline:** 1 week
- **Format:** Onsite at Hyderabad campus
- **Rejection Reason:** Missed critical rendering path analysis

---

## Round 1: Online Assessment
**Duration:** 90 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Pub/sub with namespaces and replay**
2. **Undo/redo system using command pattern**
3. **Observable with map/filter/switchMap operators**

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

## Round 2: Frontend Coding - React/Framework
**Duration:** 60 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Calendar with drag-to-resize events**
2. **Real-time collaborative text editor (CRDTs)**

### 💡 Interview-Ready Answer

```javascript
class MyPromise {
  #state = 'pending'; #value; #handlers = [];
  constructor(executor) {
    const resolve = (value) => {
      if (this.#state !== 'pending') return;
      this.#state = 'fulfilled'; this.#value = value;
      this.#handlers.forEach(h => h.onFulfilled(value));
    };
    const reject = (reason) => {
      if (this.#state !== 'pending') return;
      this.#state = 'rejected'; this.#value = reason;
      this.#handlers.forEach(h => h.onRejected(reason));
    };
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = {
        onFulfilled: v => {
          try { resolve(typeof onFulfilled === 'function' ? onFulfilled(v) : v); }
          catch (e) { reject(e); }
        },
        onRejected: e => {
          try {
            if (typeof onRejected === 'function') resolve(onRejected(e));
            else reject(e);
          } catch (e2) { reject(e2); }
        }
      };
      if (this.#state === 'pending') this.#handlers.push(handle);
      else if (this.#state === 'fulfilled') queueMicrotask(() => handle.onFulfilled(this.#value));
      else queueMicrotask(() => handle.onRejected(this.#value));
    });
  }

  catch(fn) { return this.then(null, fn); }
  static resolve(v) { return new MyPromise(r => r(v)); }
  static reject(e) { return new MyPromise((_, r) => r(e)); }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = []; let count = 0;
      const arr = [...promises];
      if (!arr.length) return resolve([]);
      arr.forEach((p, i) => MyPromise.resolve(p).then(v => {
        results[i] = v;
        if (++count === arr.length) resolve(results);
      }, reject));
    });
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      for (const p of promises) MyPromise.resolve(p).then(resolve, reject);
    });
  }
}
```

---

## Round 3: Low-Level Design
**Duration:** 45 min | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design social feed (Twitter/LinkedIn)**

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

## Round 4: Frontend System Design
**Duration:** 60 min | **Interviewer:** Principal Engineer

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

## Round 5: Hiring Manager
**Duration:** 45 min | **Interviewer:** Principal Engineer

### Questions Asked
1. **Owned cross-team initiative improving deploy times**
2. **Improved page performance by 60%+**
3. **Made speed vs quality trade-off**

### 💡 STAR Answer

**Situation:** Led team of 5 at Groww to migrate legacy jQuery codebase to React + TypeScript.

**Task:** Maintain feature parity while reducing bundle size by 40% and improving Core Web Vitals.

**Action:** Implemented incremental migration strategy with Module Federation, set up Lighthouse CI gates in PR pipeline, mentored 2 junior developers on React patterns.

**Result:** Completed 3 months ahead of schedule, bundle size reduced by 52%, LCP improved from 4.2s to 1.8s, zero production incidents during migration.

---

## Round 6: Architecture Deep Dive
**Duration:** 60 min | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design e-commerce PLP (Amazon/Flipkart)**

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

- Groww heavily tests JavaScript fundamentals at the senior level
- System design rounds expect thorough discussion of scalability, real-time features, and caching strategies
- Need to quantify impact with specific metrics in behavioral rounds
- Practice more system design with real-time architecture patterns

## 📊 Difficulty Assessment

| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Hard | JavaScript, DOM, CSS, Async |
| Frontend Coding - React/Framework | Hard | React Hooks, Virtual DOM, State Management |
| Low-Level Design | Easy | Design Patterns, SOLID, API Design |
| Frontend System Design | Easy | Scalability, Real-time, Caching, Performance |
| Hiring Manager | Very Hard | Team Management, Vision, Growth Strategy |
| Architecture Deep Dive | Easy | Micro-frontends, CI/CD, Observability |
