# 356 – LWC Component Lifecycle

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Lightning Web Components (LWC) lifecycle mirrors Custom Elements: `constructor()` → `connectedCallback()` → `renderedCallback()` → `disconnectedCallback()`. LWC adds `errorCallback()` for error boundaries. Key: `renderedCallback` fires after every render (like React's `useEffect` without deps).

## 2. 🔬 DEEP-DIVE EXPLANATION

```javascript
// myComponent.js
import { LightningElement, api, track } from 'lwc';

export default class MyComponent extends LightningElement {
  // ──── CONSTRUCTOR ────
  constructor() {
    super(); // MUST call super() first
    // Don't access DOM here, don't set attributes
    // Initialize private state
    this._internalState = 'initial';
  }

  // ──── CONNECTED CALLBACK ────
  // Called when inserted into DOM
  connectedCallback() {
    // Safe to access attributes, dispatch events
    // Fetch data, add global listeners
    console.log('Component connected');
    window.addEventListener('resize', this.handleResize);
  }

  // ──── RENDERED CALLBACK ────
  // Called after every render (initial + re-render)
  // ⚠️ Guard against infinite loops!
  _isRendered = false;
  renderedCallback() {
    if (this._isRendered) return;
    this._isRendered = true;
    // One-time DOM manipulation after first render
    const el = this.template.querySelector('.chart-container');
    if (el) this.initChart(el);
  }

  // ──── DISCONNECTED CALLBACK ────
  // Called when removed from DOM
  disconnectedCallback() {
    // Cleanup: remove listeners, cancel subscriptions
    window.removeEventListener('resize', this.handleResize);
  }

  // ──── ERROR CALLBACK ────
  // Called when child component throws
  errorCallback(error, stack) {
    console.error('Child error:', error.message);
    this.showError = true;
  }

  handleResize = () => {
    // Handle window resize
  };
}
```

### Lifecycle Order
```
1. constructor()         — init state (no DOM)
2. connectedCallback()   — inserted in DOM (add listeners, fetch)
3. render()              — return template
4. renderedCallback()    — DOM ready (chart init, measurements)
   ↕ re-renders on @track/@api changes
5. disconnectedCallback() — removed (cleanup)
```

### Rules
| Callback | DOM Access | Dispatch Events | Fetch Data |
|---|---|---|---|
| constructor | ❌ | ❌ | ❌ |
| connectedCallback | ✅ | ✅ | ✅ |
| renderedCallback | ✅ | ✅ | ⚠️ (guard loops) |
| disconnectedCallback | ✅ | ❌ | ❌ |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"LWC lifecycle: constructor (init), connectedCallback (DOM ready, fetch data, add listeners), renderedCallback (post-render DOM ops — MUST guard against infinite loops), disconnectedCallback (cleanup), errorCallback (child error boundary). It's built on standard Custom Elements."*

## 4. 🧠 MEMORY AID
**"constructor → connected (fetch/listen) → rendered (DOM ops, guard loops!) → disconnected (cleanup). errorCallback = error boundary."**

## 5. 🎯 KEY INSIGHT
`renderedCallback` fires on EVERY re-render — always use a boolean guard to prevent infinite loops when doing one-time setup.
