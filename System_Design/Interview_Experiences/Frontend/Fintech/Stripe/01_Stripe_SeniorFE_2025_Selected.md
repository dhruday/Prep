# Stripe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Frontend Engineer |
| **Level** | L3 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Blind](https://www.teamblind.com/post/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Integration + Bug Squash + System Design + Cross-Functional)
- **Timeline:** 2 weeks
- **Note:** Stripe's interview is unique — no traditional LeetCode. All practical/product-focused.

---

## Round 1: Integration (FE-specific)
**Duration:** 60 minutes

### Questions Asked
1. **Build Stripe's Embeddable Payment Element** (frontend SDK challenge)
   - Create a drop-in payment form component that works via `<script>` tag on any website

### 💡 Interview-Ready Answer

```javascript
// Stripe.js SDK — embeddable payment element
// Challenge: Must work on ANY website, sandbox from host, communicate securely

(function(window) {
  'use strict';
  
  class Stripe {
    constructor(publishableKey) {
      if (!publishableKey || !publishableKey.startsWith('pk_')) {
        throw new Error('Invalid Stripe publishable key');
      }
      this.key = publishableKey;
      this.elements = new Elements(this);
    }
  }
  
  class Elements {
    constructor(stripe) {
      this.stripe = stripe;
    }
    
    create(type, options = {}) {
      switch (type) {
        case 'card':
          return new CardElement(this.stripe, options);
        case 'payment':
          return new PaymentElement(this.stripe, options);
        default:
          throw new Error(`Unknown element type: ${type}`);
      }
    }
  }
  
  class CardElement {
    constructor(stripe, options) {
      this.stripe = stripe;
      this.options = options;
      this.iframe = null;
      this.listeners = {};
      this.ready = false;
    }
    
    mount(selector) {
      const container = typeof selector === 'string' 
        ? document.querySelector(selector) 
        : selector;
      
      if (!container) throw new Error(`Element not found: ${selector}`);
      
      // Create iframe for payment form (security sandbox!)
      // Why iframe? PCI compliance — card data never touches merchant's page
      this.iframe = document.createElement('iframe');
      this.iframe.src = `https://js.stripe.com/v3/elements-inner.html`;
      this.iframe.style.cssText = 'border: none; width: 100%; height: 44px;';
      this.iframe.setAttribute('title', 'Secure payment input');
      this.iframe.setAttribute('allowtransparency', 'true');
      
      container.innerHTML = ''; // Clear container
      container.appendChild(this.iframe);
      
      // Cross-origin communication via postMessage
      window.addEventListener('message', (event) => {
        if (event.origin !== 'https://js.stripe.com') return; // Security check!
        
        const { type, data } = event.data;
        
        switch (type) {
          case 'element.ready':
            this.ready = true;
            this.emit('ready');
            // Send initial config to iframe
            this.iframe.contentWindow.postMessage({
              type: 'config',
              data: { 
                key: this.stripe.key,
                style: this.options.style,
                locale: this.options.locale || 'auto'
              }
            }, 'https://js.stripe.com');
            break;
            
          case 'element.change':
            // data: { complete, empty, error, brand }
            this.emit('change', data);
            break;
            
          case 'element.focus':
            this.emit('focus');
            break;
            
          case 'element.blur':
            this.emit('blur');
            break;
            
          case 'token.created':
            // Card data tokenized inside iframe → only token sent to merchant
            this.emit('token', data); // { token: "tok_xxxx" }
            break;
        }
      });
    }
    
    on(event, callback) {
      (this.listeners[event] = this.listeners[event] || []).push(callback);
      return this;
    }
    
    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }
    
    // Trigger tokenization (called when merchant submits form)
    createToken() {
      return new Promise((resolve, reject) => {
        this.iframe.contentWindow.postMessage(
          { type: 'createToken' },
          'https://js.stripe.com'
        );
        
        const handler = (event) => {
          if (event.origin !== 'https://js.stripe.com') return;
          if (event.data.type === 'token.success') {
            window.removeEventListener('message', handler);
            resolve(event.data.token);
          } else if (event.data.type === 'token.error') {
            window.removeEventListener('message', handler);
            reject(event.data.error);
          }
        };
        window.addEventListener('message', handler);
      });
    }
    
    destroy() {
      if (this.iframe) this.iframe.remove();
    }
  }
  
  // Expose globally
  window.Stripe = Stripe;
})(window);

// Merchant usage:
// const stripe = new Stripe('pk_test_xxxx');
// const card = stripe.elements.create('card', { style: { base: { fontSize: '16px' } } });
// card.mount('#card-element');
// card.on('change', (e) => { if (e.error) showError(e.error); });
// form.onsubmit = async () => { const token = await card.createToken(); }
```

**Key Security Points:**
- **iframe isolation**: Card number, expiry, CVV are entered inside Stripe's iframe
- **postMessage** with strict origin check: only accept from `js.stripe.com`
- **PCI DSS compliance**: Sensitive card data NEVER touches the merchant's JavaScript
- **Token exchange**: Card → token inside iframe, only token leaves iframe
- **CSP**: Merchant can't read iframe contents (same-origin policy)

---

## Round 2: Bug Squash
**Duration:** 60 minutes

### Questions Asked
1. **Debug 4 bugs in a pre-built React dashboard** (provided codebase)
   - Bug 1: Memory leak from uncleared interval in useEffect
   - Bug 2: Race condition in async state update (stale closure)
   - Bug 3: CSS z-index stacking context issue (modal behind backdrop)
   - Bug 4: Incorrect decimal arithmetic in payment amounts

### 💡 Key Bugfixes

```javascript
// Bug 1: Memory leak — timer not cleared
// BROKEN:
useEffect(() => {
  setInterval(() => fetchData(), 5000);
}, []);

// FIXED:
useEffect(() => {
  const id = setInterval(() => fetchData(), 5000);
  return () => clearInterval(id); // Cleanup!
}, []);

// Bug 2: Stale closure — using state directly in async callback
// BROKEN:
const handleUpdate = async () => {
  const result = await updateAPI(count); // 'count' is stale!
  setCount(count + 1);
};

// FIXED:
const handleUpdate = async () => {
  const result = await updateAPI(countRef.current);
  setCount(prev => prev + 1); // Functional update
};

// Bug 3: z-index stacking context
// BROKEN: Modal has z-index:1000 but sidebar has transform:translateX()
// which creates a new stacking context → modal is inside sidebar's context
// FIXED: Move modal to portal (outside sidebar DOM tree)
const Modal = ({ children }) => createPortal(
  <div className="modal-overlay">{children}</div>,
  document.body // Render outside sidebar's stacking context
);

// Bug 4: Floating point arithmetic
// BROKEN: 0.1 + 0.2 = 0.30000000000000004
const total = items.reduce((sum, item) => sum + item.price, 0);

// FIXED: Use integer cents, convert to dollars only for display
const totalCents = items.reduce((sum, item) => sum + Math.round(item.price * 100), 0);
const displayTotal = (totalCents / 100).toFixed(2);

// Or use a dedicated library:
// import Dinero from 'dinero.js';
// Dinero({ amount: 1099 }).add(Dinero({ amount: 501 })).toFormat('$0,0.00');
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Stripe's Developer Dashboard**
   - API keys management, webhook configurations, real-time logs, analytics charts

### 💡 Interview-Ready Answer

```
Stripe Dashboard Frontend Architecture:
┌──────────────────────────────────────────────────────────────┐
│  API Keys Management:                                         │
│  - Show publishable key in full (pk_test_xxx / pk_live_xxx) │
│  - Secret key: masked by default, "Reveal" requires re-auth │
│  - Roll key: generates new key + 24h grace period for old   │
│  - Restricted keys: custom permissions panel                 │
│  - Security: keys stored in-memory only, never localStorage! │
│                                                                │
│  Webhook Configuration UI:                                    │
│  - Endpoint URL input with validation                        │
│  - Event type picker (multi-select tree):                    │
│    ▶ payment_intent.*                                        │
│      ☑ payment_intent.succeeded                              │
│      ☑ payment_intent.failed                                 │
│    ▶ customer.*                                              │
│  - Signing secret: auto-generated, reveal-once pattern       │
│  - Test webhook: "Send test event" button → real HTTP call   │
│  - Delivery log: success/failure for each delivery attempt   │
│                                                                │
│  Real-Time API Logs:                                          │
│  - SSE stream for live log entries                           │
│  - Each entry: method, path, status, duration, timestamp     │
│  - Color-coded: green (2xx), yellow (4xx), red (5xx)        │
│  - Filter: by method, status, path prefix                    │
│  - Expandable: click row → full request/response JSON        │
│  - Virtual scrolling for 1000+ log entries                   │
│  - Auto-scroll: enabled by default, paused on manual scroll  │
│    Resume button appears at bottom when paused               │
│                                                                │
│  Analytics Charts:                                            │
│  - Payment volume over time (Canvas chart, not SVG)          │
│  - Success rate pie chart                                    │
│  - Geographic distribution (map visualization)               │
│  - Time range selector: 24h, 7d, 30d, 90d, custom           │
│  - Data fetching: pre-aggregated (not raw events)            │
│  - Export: CSV download for any chart data                   │
└──────────────────────────────────────────────────────────────┘

Security Considerations:
- Dashboard behind 2FA + session management
- API keys: never stored in browser storage (only in-memory)
- CSP headers: strict, no inline scripts
- All API calls via HTTPS + CSRF tokens
- Log data: PII redacted (card numbers masked to last 4)
- Session timeout: 30 min idle → re-auth required
```

---

## 🎯 Key Takeaways
- Stripe interview is **unique** — no LeetCode, all practical/product-focused
- **Embeddable payment SDK** = iframe + postMessage for PCI compliance — the #1 Stripe question
- **Bug Squash** tests debugging skill: memory leaks, stale closures, z-index, floating point
- **Floating point in money** → ALWAYS use integer cents, never float dollars
- **createPortal** solves z-index stacking context issues — know when and why
- **Reveal-once pattern** for secrets — generate, show once, mask forever
- Stripe values **API design thinking** — design your components like APIs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Integration | Hard | iframe, postMessage, PCI, SDK Design |
| Bug Squash | Medium-Hard | Memory Leak, Stale Closure, z-index, Float |
| System Design | Hard | Dashboard, Security, Real-Time Logs |
| Cross-Functional | Medium | Product Sense, Communication |
