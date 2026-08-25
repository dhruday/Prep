# Stripe — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Frontend Engineer |
| **Level** | L3 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Bug Squash + Integration + System Design + Manager)
- **Rejection Reason:** Integration round — didn't handle error states comprehensively

---

## Round 1: Bug Squash (Frontend)
**Duration:** 45 minutes

### Questions Asked
1. **Fix 4 bugs in a React payment form component**

### 💡 Bug Fixes

```javascript
// Bug 1: Race condition in auto-save
// BROKEN CODE:
const [saving, setSaving] = useState(false);
const save = async (data) => {
  setSaving(true);
  await api.save(data);
  setSaving(false);
};
// Rapid typing → save called multiple times → out-of-order responses
// FIXED:
const latestRequestRef = useRef(0);
const save = async (data) => {
  const requestId = ++latestRequestRef.current;
  setSaving(true);
  await api.save(data);
  // Only update state if this is still the latest request
  if (requestId === latestRequestRef.current) {
    setSaving(false);
  }
};

// Bug 2: Memory leak — event listener not cleaned up
// BROKEN:
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);
// FIXED:
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Bug 3: Stale closure in setInterval
// BROKEN:
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1); // Always uses initial count value (stale closure)
  }, 1000);
  return () => clearInterval(interval);
}, []); // Empty deps → closure over initial count
// FIXED:
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1); // Functional update — no stale closure
  }, 1000);
  return () => clearInterval(interval);
}, []);

// Bug 4: XSS vulnerability in rendered HTML
// BROKEN:
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// FIXED:
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
// Or better: don't use dangerouslySetInnerHTML at all
// Parse the content and render safe React elements
```

---

## Round 2: Integration (Where I Failed)
**Duration:** 60 minutes

### Questions Asked
1. **Build a Stripe Elements-like embeddable form with comprehensive error handling**
   - iframe communication, PCI compliance, field validation, error recovery

### 💡 What I Should Have Built

```javascript
// Host page creates Stripe-like embedded payment element
class PaymentElement {
  #iframe;
  #origin;
  #messageHandlers = new Map();
  #ready = false;
  #readyPromise;
  #retryQueue = [];
  
  constructor(containerId, publishableKey) {
    this.#origin = 'https://js.stripe.com';
    this.#readyPromise = new Promise((resolve) => {
      this.#messageHandlers.set('ELEMENT_READY', () => {
        this.#ready = true;
        // Process queued messages
        this.#retryQueue.forEach(msg => this.#postMessage(msg));
        this.#retryQueue = [];
        resolve();
      });
    });
    
    // Create sandboxed iframe (PCI compliance: card data never touches merchant's page)
    const container = document.getElementById(containerId);
    this.#iframe = document.createElement('iframe');
    this.#iframe.src = `${this.#origin}/v3/elements?key=${encodeURIComponent(publishableKey)}`;
    this.#iframe.style.cssText = 'border:none;width:100%;height:auto;';
    this.#iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    this.#iframe.title = 'Secure payment input';
    
    container.appendChild(this.#iframe);
    
    // Listen for messages from iframe
    window.addEventListener('message', this.#handleMessage);
  }
  
  #handleMessage = (event) => {
    // CRITICAL: Verify origin to prevent XSS
    if (event.origin !== this.#origin) return;
    
    const { type, payload } = event.data;
    
    if (this.#messageHandlers.has(type)) {
      this.#messageHandlers.get(type)(payload);
    }
  };
  
  #postMessage(message) {
    if (!this.#ready) {
      this.#retryQueue.push(message);
      return;
    }
    this.#iframe.contentWindow.postMessage(message, this.#origin);
  }
  
  // Public API
  on(event, callback) {
    // Events: 'change', 'ready', 'focus', 'blur', 'error'
    this.#messageHandlers.set(`EVENT_${event.toUpperCase()}`, callback);
    return this; // Chainable
  }
  
  async confirmPayment(clientSecret) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Payment confirmation timed out'));
      }, 30000); // 30s timeout
      
      this.#messageHandlers.set('PAYMENT_RESULT', (result) => {
        clearTimeout(timeout);
        if (result.error) reject(result.error);
        else resolve(result);
      });
      
      this.#postMessage({ type: 'CONFIRM_PAYMENT', payload: { clientSecret } });
    });
  }
  
  update(options) {
    // Update appearance, locale, etc.
    this.#postMessage({ type: 'UPDATE_OPTIONS', payload: options });
  }
  
  destroy() {
    window.removeEventListener('message', this.#handleMessage);
    this.#iframe.remove();
  }
}

// Inside the iframe (Stripe-owned code):
class SecurePaymentForm {
  constructor() {
    this.#setupMessageHandler();
    this.#renderForm();
    
    // Notify parent that element is ready
    window.parent.postMessage(
      { type: 'ELEMENT_READY' },
      '*' // In production: specific merchant origin
    );
  }
  
  #setupMessageHandler() {
    window.addEventListener('message', (event) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'CONFIRM_PAYMENT':
          this.#handleConfirmPayment(payload.clientSecret);
          break;
        case 'UPDATE_OPTIONS':
          this.#updateOptions(payload);
          break;
      }
    });
  }
  
  async #handleConfirmPayment(clientSecret) {
    try {
      // Validate all fields first
      const errors = this.#validateFields();
      if (errors.length > 0) {
        this.#sendResult({ error: { type: 'validation_error', errors } });
        return;
      }
      
      // Tokenize card data (never send raw card to merchant)
      const response = await fetch('https://api.stripe.com/v1/payment_intents/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_secret: clientSecret,
          'payment_method_data[type]': 'card',
          'payment_method_data[card][number]': this.cardNumber,
          'payment_method_data[card][exp_month]': this.expMonth,
          'payment_method_data[card][exp_year]': this.expYear,
          'payment_method_data[card][cvc]': this.cvc,
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        this.#sendResult({ error: result.error });
      } else if (result.status === 'requires_action') {
        // 3D Secure: open authentication in new window
        this.#handle3DSecure(result.next_action);
      } else {
        this.#sendResult({ paymentIntent: result });
      }
    } catch (error) {
      // Network error: show retry UI
      this.#sendResult({
        error: {
          type: 'api_connection_error',
          message: 'Network error. Please check your connection and try again.',
        }
      });
    }
  }
  
  #validateFields() {
    const errors = [];
    
    if (!this.cardNumber || !isValidLuhn(this.cardNumber)) {
      errors.push({ field: 'cardNumber', message: 'Your card number is invalid.' });
    }
    if (!this.expMonth || !this.expYear || isExpired(this.expMonth, this.expYear)) {
      errors.push({ field: 'expiry', message: 'Your card\'s expiration date is in the past.' });
    }
    if (!this.cvc || this.cvc.length < 3) {
      errors.push({ field: 'cvc', message: 'Your card\'s security code is incomplete.' });
    }
    
    return errors;
  }
  
  #sendResult(result) {
    window.parent.postMessage({ type: 'PAYMENT_RESULT', payload: result }, '*');
  }
}

// Error states I should have handled:
// 1. iframe load failure → show fallback UI with retry button
// 2. postMessage timeout → reject with timeout error
// 3. 3D Secure popup blocked → detect and show instructions
// 4. Network failure mid-payment → idempotency key ensures no double charge
// 5. Browser back button during 3DS → handle payment intent in pending state
// 6. Iframe sandboxing violations → graceful degradation
```

---

## 🎯 Key Takeaways
- Stripe FE = **iframe-based PCI compliance + error handling is everything**
- **Bug Squash**: race conditions, memory leaks, stale closures, XSS — know all 4
- **postMessage security**: ALWAYS verify `event.origin` — top vulnerability
- **PCI compliance**: card data lives in Stripe's iframe, never touches merchant JS
- **3D Secure (3DS)**: two-factor auth for card payments — must handle the redirect flow
- **Idempotency key**: prevents double charges on network retry — Stripe's core principle
- I failed because I didn't handle: iframe load failure, 3DS popup blocked, network mid-payment
- Stripe expects **exhaustive error handling** — every edge case matters for payment UX

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Medium | Race Conditions, Memory Leaks, XSS |
| Integration | Very Hard | iframe, postMessage, PCI, 3DS, Error States |
| System Design | Hard | Developer Dashboard, Analytics |
| Manager | Medium | Behavioral, Technical Depth |
