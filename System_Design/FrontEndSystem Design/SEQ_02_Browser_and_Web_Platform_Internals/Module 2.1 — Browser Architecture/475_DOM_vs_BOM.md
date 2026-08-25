# 475. DOM vs BOM — Document Object Model vs Browser Object Model

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
The **DOM (Document Object Model)** is a tree-structured API that represents the HTML/XML content of a page — every element, attribute, and text node is a programming object. The **BOM (Browser Object Model)** is the set of APIs that give JavaScript access to the browser itself — `window`, `navigator`, `location`, `history`, `screen`, `localStorage`/`sessionStorage`, timers, and `fetch`. In short: DOM = page content (the document); BOM = browser environment (everything else on `window`).

**Why it matters:**
Every frontend operation falls into either DOM manipulation (rendering UI, handling events, querying elements) or BOM interaction (navigation, storage, network, device detection). Understanding the boundary is critical for SSR (BOM doesn't exist server-side), testing (DOM vs BOM mocking strategies), security (CSP, origin model), and accessibility (the accessibility tree is derived from the DOM).

**When and where it's used:**
- DOM: every single UI component, every framework's rendering system, every accessibility audit
- BOM: SPA routing (`history.pushState`), analytics (`navigator.sendBeacon`), storage, network status, responsive design (`matchMedia`), geolocation, notifications

**Role in large-scale applications:**
At FAANG scale, DOM performance is the primary frontend bottleneck — layout thrashing, forced reflows, and excessive mutations are the top Lighthouse performance killers. BOM misuse causes SSR crashes, storage quota violations, and security vulnerabilities (localStorage for tokens, postMessage without origin checks).

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. The DOM — Complete Architecture**

#### **1. DOM Tree Structure**

```
                         ┌──────────── document ────────────┐
                         │                                  │
                   ┌─── html ───┐                           │
                   │            │                           │
               ┌─ head ─┐   ┌─ body ─────────────┐         │
               │        │   │                     │         │
            title    meta   div#app            script       │
                           │                                │
                    ┌──────┼──────┐                         │
                    │      │      │                         │
                  header  main   footer                     │
                    │      │      │                         │
                   nav   article  p                         │
                    │      │                                │
                  ul>li   h1 + p                            │
```

Every node in this tree is an object inheriting from the Node class:

```
EventTarget → Node → Element → HTMLElement → HTMLDivElement
                  ↘ Document
                  ↘ Text
                  ↘ Comment
                  ↘ DocumentFragment
```

#### **2. Core DOM APIs**

```javascript
// ──── QUERYING ────
// Returns first match (or null)
const container = document.querySelector('.container');

// Returns live NodeList (re-evaluates on DOM changes — EXPENSIVE)
const divs = document.getElementsByTagName('div');

// Returns static NodeList (snapshot — PREFERRED)
const cards = document.querySelectorAll('.card');

// By ID — fastest lookup (browser maintains a hash map)
const app = document.getElementById('app');

// ──── CREATION ────
const el = document.createElement('div');
el.className = 'card';
el.setAttribute('data-id', '42');
el.textContent = 'Safe text — no XSS risk';

// ──── MUTATION ────
parent.appendChild(el);         // Triggers layout
parent.insertBefore(el, ref);   // Triggers layout
parent.removeChild(el);         // Triggers layout
parent.replaceChild(newEl, oldEl);

// ──── BATCH MUTATIONS (Performance) ────
// DocumentFragment — mutations happen off-DOM, single reflow on append
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);  // No reflow — fragment is off-DOM
}
list.appendChild(fragment);  // Single reflow for 1000 items

// ──── OBSERVATION ────
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    console.log(mutation.type);    // 'childList', 'attributes', 'characterData'
    console.log(mutation.target);  // The changed element
  });
});
observer.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true
});
```

#### **3. DOM Performance — The Critical Path**

```
JavaScript → Style Calculation → Layout → Paint → Compositing
                                   ↑
                              DOM mutations
                              trigger this
```

**Layout Thrashing — The #1 Performance Killer:**

```javascript
// ❌ LAYOUT THRASHING — forces synchronous layout on EVERY iteration
for (let i = 0; i < 100; i++) {
  const height = element.offsetHeight;  // READ → forces layout
  element.style.width = height + 'px';  // WRITE → invalidates layout
  // Next iteration: READ again → forces ANOTHER layout
}
// Result: 100 forced synchronous layouts = massive jank

// ✅ BATCH READS, THEN WRITES
const heights = [];
// Read phase — single layout calculation
for (let i = 0; i < 100; i++) {
  heights.push(elements[i].offsetHeight);
}
// Write phase — single layout invalidation, deferred recalc
for (let i = 0; i < 100; i++) {
  elements[i].style.width = heights[i] + 'px';
}
// Result: 1 layout calculation + 1 deferred recalc = smooth
```

**Properties that force layout (synchronous reflow):**

```javascript
// These READS force the browser to calculate layout synchronously:
element.offsetTop / offsetLeft / offsetWidth / offsetHeight
element.clientTop / clientLeft / clientWidth / clientHeight
element.scrollTop / scrollLeft / scrollWidth / scrollHeight
element.getBoundingClientRect()
window.getComputedStyle(element)
element.focus()  // Yes, focus forces layout!
```

#### **4. DOM and the Accessibility Tree**

```
DOM Tree                    Accessibility Tree
──────────                  ──────────────────
<nav>                  →    navigation landmark
  <ul>                 →    list (3 items)
    <li>               →    listitem
      <a href="/">     →    link "Home"
```

The browser derives the **accessibility tree** from the DOM. ARIA attributes modify this mapping:

```html
<!-- DOM node → accessibility node mapping -->
<div role="alert">Error!</div>           → alert "Error!"
<button aria-label="Close">×</button>    → button "Close"
<div aria-hidden="true">Decorative</div> → (removed from a11y tree)
```

**Key insight for Hruday's WCAG AA work at SAP:** The accessibility tree is only as good as the DOM. Semantic HTML produces a correct accessibility tree by default. Using `<div>` for everything forces you to recreate the entire semantic model with ARIA — more work, more bugs, worse screen reader experience.

---

### **B. The BOM — Complete Reference**

#### **1. window — The Global Object**

```javascript
// window IS the global object in browsers
// In Node.js, global is the equivalent — but NO BOM APIs exist

// ──── TIMERS ────
const id1 = setTimeout(fn, 1000);       // One-shot
const id2 = setInterval(fn, 5000);      // Recurring
const id3 = requestAnimationFrame(fn);  // Next frame (~16ms at 60fps)
const id4 = requestIdleCallback(fn);    // When browser is idle

// ──── DIMENSIONS ────
window.innerWidth;   // Viewport width (excludes scrollbar)
window.innerHeight;  // Viewport height
window.outerWidth;   // Window width (includes chrome)
window.scrollX;      // Horizontal scroll offset
window.scrollY;      // Vertical scroll offset
window.devicePixelRatio; // 1 = normal, 2 = Retina

// ──── EVENTS ────
window.addEventListener('resize', handler);
window.addEventListener('scroll', handler, { passive: true });
window.addEventListener('beforeunload', handler);
window.addEventListener('online', handler);
window.addEventListener('offline', handler);
window.addEventListener('storage', handler);  // Cross-tab storage events!
```

#### **2. navigator — Device & Browser Info**

```javascript
// ──── USER AGENT (legacy, but still used) ────
navigator.userAgent;
// "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."

// ──── USER AGENT CLIENT HINTS (modern replacement) ────
// Privacy-preserving, structured data
const ua = navigator.userAgentData;
ua.brands;    // [{brand: "Chromium", version: "124"}, ...]
ua.mobile;    // false
ua.platform;  // "macOS"

// ──── NETWORK ────
navigator.onLine;                     // Boolean
navigator.connection.effectiveType;   // '4g', '3g', '2g', 'slow-2g'
navigator.connection.downlink;        // Mbps estimate
navigator.connection.saveData;        // User's data saver preference

// ──── PERMISSIONS ────
const result = await navigator.permissions.query({ name: 'geolocation' });
// result.state: 'granted' | 'denied' | 'prompt'

// ──── STORAGE ────
const estimate = await navigator.storage.estimate();
// { usage: 1234567, quota: 1073741824 } — usage & quota in bytes

// ──── SEND ANALYTICS (doesn't block page unload) ────
navigator.sendBeacon('/analytics', JSON.stringify(eventData));

// ──── CLIPBOARD ────
await navigator.clipboard.writeText('Copied!');
const text = await navigator.clipboard.readText();

// ──── GEOLOCATION ────
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords.latitude, pos.coords.longitude),
  (err) => console.error(err),
  { enableHighAccuracy: true, timeout: 5000 }
);

// ──── SERVICE WORKERS ────
const reg = await navigator.serviceWorker.register('/sw.js');
```

#### **3. location — URL Management**

```javascript
// URL: https://app.example.com:8080/products?q=laptop#reviews
location.protocol;  // 'https:'
location.hostname;  // 'app.example.com'
location.port;      // '8080'
location.pathname;  // '/products'
location.search;    // '?q=laptop'
location.hash;      // '#reviews'
location.href;      // Full URL
location.origin;    // 'https://app.example.com:8080'

// ──── NAVIGATION ────
location.href = '/new-page';     // Full reload
location.replace('/new-page');   // Full reload, no history entry
location.reload();               // Refresh current page
```

#### **4. history — SPA Routing Foundation**

```javascript
// ──── MODERN SPA ROUTING ────
// Push new state (URL changes, no page reload)
history.pushState(
  { page: 'products', id: 42 },  // State object (serializable)
  '',                              // Title (ignored by most browsers)
  '/products/42'                   // New URL
);

// Replace current state
history.replaceState(
  { page: 'products', id: 42 },
  '',
  '/products/42'
);

// Listen for back/forward button
window.addEventListener('popstate', (event) => {
  console.log('Navigated to:', event.state);
  // Re-render the page based on state
  renderPage(event.state);
});

// Navigate
history.back();         // Go back
history.forward();      // Go forward
history.go(-2);         // Go back 2 entries
console.log(history.length);  // Number of entries in history stack
```

**This is what React Router / Angular Router use under the hood.** Every `<Link>` click calls `pushState`. The router listens for `popstate` to handle back/forward.

#### **5. screen — Display Information**

```javascript
screen.width;         // 2560 (physical pixels)
screen.height;        // 1440
screen.availWidth;    // 2560 (minus OS chrome like taskbar)
screen.availHeight;   // 1400
screen.colorDepth;    // 24 (bits per pixel)
screen.orientation;   // { type: 'landscape-primary', angle: 0 }

// ──── MEDIA QUERIES (preferred over screen API) ────
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isSmall = window.matchMedia('(max-width: 768px)').matches;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Listen for changes
const mq = window.matchMedia('(max-width: 768px)');
mq.addEventListener('change', (e) => {
  console.log('Is mobile:', e.matches);
});
```

---

### **C. Critical Differences**

| **Aspect** | **DOM** | **BOM** |
|------------|---------|---------|
| **Standardised by** | W3C DOM spec (Levels 1–4) | Originally browser-specific; now HTML5 Living Standard |
| **Root object** | `document` | `window` |
| **Scope** | HTML/XML page content — elements, attributes, text nodes | Browser environment — navigation, storage, network, device |
| **SSR available** | ✅ via jsdom, happy-dom, linkedom | ❌ Mostly unavailable (window, navigator, localStorage) |
| **Security concern** | XSS via innerHTML, dangerouslySetInnerHTML | Origin checks, postMessage validation, token storage |
| **Testing** | jsdom renders full DOM tree | Must mock: jest.spyOn(window, 'scrollTo') |
| **Performance impact** | Layout thrashing, forced reflows, paint storms | Synchronous localStorage, excessive scroll listeners |
| **Framework abstraction** | React = Virtual DOM → real DOM. Angular = Renderer2 → real DOM | Router = history API. Storage = custom wrappers |

---

### **D. SSR Implications — The Critical Gap**

When your code runs on a **Node.js server** (Next.js SSR, Angular Universal), there is no browser:

```typescript
// ❌ CRASHES ON SERVER — window doesn't exist
const width = window.innerWidth;
// ReferenceError: window is not defined

// ✅ GUARD 1: typeof check (works everywhere)
const width = typeof window !== 'undefined' ? window.innerWidth : 1024;

// ✅ GUARD 2: React — useEffect runs only on client
import { useEffect, useState } from 'react';
function useWindowWidth() {
  const [width, setWidth] = useState(1024); // SSR default
  useEffect(() => {
    // Runs only in browser
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ✅ GUARD 3: Angular — PLATFORM_ID injection
import { isPlatformBrowser, PLATFORM_ID } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Component({ /* ... */ })
export class MyComponent {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      // Safe to use window, localStorage, etc.
      const saved = localStorage.getItem('theme');
    }
  }
}

// ✅ GUARD 4: Next.js dynamic import with ssr: false
import dynamic from 'next/dynamic';
const MapComponent = dynamic(() => import('./Map'), { ssr: false });
// MapComponent renders only on client — free to use window, navigator
```

**Common SSR Errors and Fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `ReferenceError: window is not defined` | BOM access in SSR | typeof guard, useEffect, PLATFORM_ID |
| `ReferenceError: document is not defined` | DOM access in SSR | Same guards as above |
| `ReferenceError: localStorage is not defined` | Storage in SSR | typeof guard, cookie-based fallback |
| Hydration mismatch | Server HTML ≠ client HTML (BOM-dependent content) | `useEffect` for BOM reads, consistent defaults |

---

### **E. Testing Strategies**

```typescript
// ──── DOM Testing (works in jsdom via Jest/Vitest) ────
import { render, screen } from '@testing-library/react';
test('renders heading', () => {
  render(<App />);
  expect(screen.getByRole('heading')).toHaveTextContent('Hello');
  // jsdom provides full DOM tree — no mocking needed
});

// ──── BOM Testing (requires mocking) ────

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key) => store[key] ?? null),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

// Mock history.pushState
const pushStateSpy = jest.spyOn(history, 'pushState');
// ... test router navigation ...
expect(pushStateSpy).toHaveBeenCalledWith(expect.anything(), '', '/products/42');

// Mock IntersectionObserver (used by lazy loading / infinite scroll)
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

---

### **F. Security Implications**

#### **DOM Security:**

```javascript
// ❌ XSS VECTOR — innerHTML with user input
element.innerHTML = userInput;
// If userInput = '<img src=x onerror="steal(document.cookie)">'
// Attacker steals all cookies and tokens

// ✅ SAFE — textContent escapes everything
element.textContent = userInput;
// Renders raw text, scripts won't execute

// ✅ SAFE — DOMPurify for rich content
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// ✅ React auto-escapes by default
return <div>{userInput}</div>; // Safe — JSX escapes strings

// ❌ React escape hatch — requires manual sanitization
return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
```

#### **BOM Security:**

```javascript
// ❌ Storing JWT in localStorage — accessible via XSS
localStorage.setItem('token', jwt);
// Any XSS script can read: localStorage.getItem('token')

// ✅ Use httpOnly cookies — JavaScript can't access them
// Set-Cookie: token=xyz; HttpOnly; Secure; SameSite=Strict

// ❌ postMessage without origin check
window.addEventListener('message', (event) => {
  processData(event.data);  // Any origin can send data!
});

// ✅ Always validate origin
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.example.com') return;
  processData(event.data);
});
```

---

### **G. Anti-Patterns & Pitfalls**

1. **Using `innerHTML` for user content** → XSS. Use `textContent` or DOMPurify.
2. **Not guarding BOM in SSR** → `ReferenceError: window is not defined`. Guard every BOM access.
3. **Layout thrashing** → Reading then writing in a loop. Batch all reads, then all writes.
4. **Using `getElementsByTagName` / `getElementsByClassName`** → Returns live NodeList that re-evaluates on every DOM change. Use `querySelectorAll` for a static snapshot.
5. **Relying on `localStorage` for sensitive data** → Accessible via XSS. Use `httpOnly` cookies.
6. **Not cleaning up observers** → `MutationObserver`, `IntersectionObserver`, `ResizeObserver` must be `.disconnect()`ed to avoid memory leaks.
7. **Blocking main thread with synchronous `localStorage`** → `localStorage.getItem()` is synchronous and blocks. For >5MB, use IndexedDB (async).
8. **Polling `window.location` for routing** → Use `popstate` event + `pushState`. Polling wastes CPU.

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Microsoft Teams (Electron + Browser)**
Teams uses BOM heavily: `navigator.mediaDevices` for camera/mic, `Notification` API for alerts, `window.matchMedia` for responsive breakpoints. In their Electron wrapper, they extend BOM with native APIs. DOM performance is critical in the chat view — Teams switched to virtualized lists to avoid DOM bloat (50K+ message nodes → only ~30 visible nodes).

### **Example 2: Adobe Creative Cloud**
Adobe's browser-based tools (Express, Photoshop Web) use `window.performance` API for custom performance marks, `navigator.gpu` (WebGPU) for hardware-accelerated rendering, and `navigator.storage.persist()` to prevent cache eviction of large asset files. DOM mutations are minimized — canvas rendering bypasses DOM entirely.

### **Example 3: Hruday @ SAP Labs**
At SAP, Hruday's Lighthouse 60→95 optimization directly relates to DOM performance:
- Reduced layout thrashing in data-heavy tables by batching DOM reads
- Used `DocumentFragment` for bulk row insertions
- Replaced `getElementsByClassName` with `querySelectorAll` for static snapshots
- Guarded BOM access (`localStorage`, `window.navigator`) for SAP UI5's server-rendered initial load

### **Scale Evolution:**
- **1K users**: DOM manipulation via `innerHTML` works fine. localStorage for simple preferences.
- **100K users**: Must virtualize long lists, batch mutations, use `requestAnimationFrame`. localStorage quota management needed.
- **10M users**: CDN-served static assets, SSR with careful BOM guarding, Service Workers for offline, BOM-based feature detection for progressive enhancement.

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer (7+ years level):**

> *"DOM and BOM are the two API surfaces the browser provides to JavaScript. The DOM is the tree representation of the HTML document — I use it to query, create, update, and delete elements. The BOM is everything else on the `window` object: `navigator`, `location`, `history`, `localStorage`, timers, `fetch`, and device APIs.*
>
> *The boundary matters in three areas. First, SSR: BOM APIs don't exist on the server, so in Next.js I guard all `window` access behind `typeof window !== 'undefined'` or put it in `useEffect`. In Angular Universal, I inject `PLATFORM_ID` and check `isPlatformBrowser()`. Second, testing: DOM renders in jsdom out of the box, but BOM APIs like `localStorage`, `matchMedia`, and `IntersectionObserver` all need mocks. Third, performance: DOM mutations are the main source of jank — they trigger style recalculation, layout, and paint. I always batch reads before writes to avoid layout thrashing. BOM calls like `localStorage.getItem()` are synchronous and block the main thread, so for large data I use IndexedDB.*
>
> *Regarding security, DOM manipulation via `innerHTML` is the primary XSS vector — I use `textContent` or DOMPurify. For BOM, the biggest risk is storing JWTs in `localStorage` (accessible via XSS) — I prefer `httpOnly` cookies. And `postMessage` without origin validation is another common vulnerability."*

### **Likely Follow-up Questions:**

1. **"How does the Virtual DOM relate to the real DOM?"** → Virtual DOM is a lightweight JS representation that diffs against previous state. React then applies the minimal set of real DOM mutations. It prevents developers from accidentally causing layout thrashing by batching all writes.

2. **"What causes layout thrashing and how do you fix it?"** → Reading layout properties (`offsetHeight`, `getBoundingClientRect()`) then writing (`style.width`) in a loop forces synchronous layout on every iteration. Fix: batch all reads first, then all writes. Or use `requestAnimationFrame` to defer writes to next frame.

3. **"How do you handle BOM-dependent code in SSR?"** → Three strategies: (a) `typeof window !== 'undefined'` guard, (b) React `useEffect` / Angular `isPlatformBrowser()`, (c) Next.js `dynamic(() => import('./Component'), { ssr: false })`.

4. **"What's the performance cost of `localStorage`?"** → Synchronous read/write on main thread. ~1-5ms for small values, but can spike to 50ms+ for large data. Use IndexedDB for anything over 5KB.

5. **"How does the DOM generate the accessibility tree?"** → The browser maps each DOM node to an accessible object using element semantics + ARIA attributes. `<button>` → button role automatically. `<div>` gets no role unless you add `role="button"`. Semantic HTML = correct accessibility tree by default.

6. **"What's the difference between live and static NodeLists?"** → `getElementsByClassName()` returns a live NodeList that updates whenever the DOM changes — re-evaluating on each access. `querySelectorAll()` returns a static snapshot. For performance, always prefer static.

### **Comparison Table:**

| When You Need... | Use DOM API | Use BOM API |
|-------------------|-------------|-------------|
| Render UI / Modify content | `createElement`, `textContent`, `appendChild` | — |
| Client-side routing | — | `history.pushState`, `popstate` event |
| Persistent storage | — | `localStorage`, `IndexedDB` |
| Responsive design | — | `matchMedia`, `window.innerWidth` |
| Feature detection | — | `navigator.userAgentData`, `'serviceWorker' in navigator` |
| Analytics | — | `navigator.sendBeacon` |
| Animations | `requestAnimationFrame` is on `window` (BOM), but targets DOM elements | `requestAnimationFrame` (BOM) |

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Section 2 for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **UX**: DOM performance directly determines FPS and Lighthouse score. Layout thrashing causes jank visible to users.
- **Reliability**: BOM misuse crashes SSR. Missing mocks break tests.
- **Security**: DOM is the XSS attack surface. BOM is the token theft surface.
- **Accessibility**: The accessibility tree is derived from the DOM — semantic HTML produces it correctly by default.

### **How It Works**
The browser parses HTML into a DOM tree (W3C spec) and exposes browser APIs on the `window` global (BOM). JavaScript accesses both through the same global scope. DOM mutations trigger the rendering pipeline (style → layout → paint → compositing). BOM APIs are mostly asynchronous (except `localStorage`) and unavailable server-side.

### **Company Relevance**
- **Microsoft**: Teams/Outlook use DOM virtualisation for chat + email. BOM for media devices, notifications. Office Online uses DOM extensively for real-time editing.
- **Adobe**: Creative Cloud uses Canvas/WebGL (bypassing DOM for rendering) but relies on BOM for storage persistence, device detection, WebGPU. Express editor uses DOM heavily.
- **Salesforce**: LWC runs in a restricted environment — BOM access is sandboxed. Shadow DOM encapsulation adds complexity to DOM queries.
- **Cisco**: Dashboard apps use BOM for network detection (`navigator.connection`), DOM virtualisation for large device lists, and `matchMedia` for responsive dashboard layouts.
