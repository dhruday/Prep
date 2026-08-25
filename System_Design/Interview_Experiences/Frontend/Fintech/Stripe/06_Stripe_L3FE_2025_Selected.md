# Stripe — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Frontend Engineer |
| **Level** | L3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + FE Coding + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: FE Coding — Build a Payment Element Embed (SDK Preview)

### Problem
Build a Stripe-style embeddable payment element:
- Renders inside an iframe for security isolation
- Parent page communicates via `postMessage`
- Card input fields with real-time validation
- Theming support (passed from parent)
- Focus management across iframe boundary
- Loading states and error handling

### 💡 Interview-Ready Answer

```javascript
/**
 * Host-side: PaymentElement controller.
 * Creates an iframe and communicates with the embedded payment form.
 */
class PaymentElement {
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      theme: config.theme || 'light',
      locale: config.locale || 'en',
      fonts: config.fonts || [],
      ...config
    };
    this.callbacks = {
      onChange: config.onChange || (() => {}),
      onReady: config.onReady || (() => {}),
      onError: config.onError || (() => {})
    };
    this.isReady = false;
    this.origin = window.location.origin;

    this.mount();
  }

  mount() {
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.cssText = 'width:100%;border:none;min-height:200px;transition:height 0.2s;';
    this.iframe.setAttribute('title', 'Payment input form');
    this.iframe.setAttribute('allow', 'payment');
    // In production, src would be a Stripe-hosted URL
    // For demo, we inject content directly
    this.iframe.srcdoc = this.getEmbeddedHTML();

    this.container.appendChild(this.iframe);

    // Listen for messages from iframe
    this.messageHandler = (event) => {
      // In production: validate event.origin against known domain
      if (event.source !== this.iframe.contentWindow) return;
      this.handleMessage(event.data);
    };
    window.addEventListener('message', this.messageHandler);

    // Send config once iframe loads
    this.iframe.addEventListener('load', () => {
      this.postToFrame({ type: 'INIT', config: this.config });
    });
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'READY':
        this.isReady = true;
        this.callbacks.onReady();
        break;
      case 'RESIZE':
        this.iframe.style.height = msg.height + 'px';
        break;
      case 'CHANGE':
        this.callbacks.onChange({
          complete: msg.complete,
          empty: msg.empty,
          error: msg.error,
          cardType: msg.cardType
        });
        break;
      case 'TOKEN':
        if (this.tokenResolve) {
          this.tokenResolve(msg.token);
          this.tokenResolve = null;
        }
        break;
      case 'ERROR':
        this.callbacks.onError(msg.error);
        break;
      case 'FOCUS':
        this.container.classList.toggle('focused', msg.focused);
        break;
    }
  }

  /**
   * Request tokenization from the embedded form.
   * Returns a promise that resolves with the token.
   */
  createToken() {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Payment element not ready'));
        return;
      }
      this.tokenResolve = resolve;
      this.postToFrame({ type: 'CREATE_TOKEN' });

      // Timeout
      setTimeout(() => {
        if (this.tokenResolve) {
          this.tokenResolve = null;
          reject(new Error('Token creation timed out'));
        }
      }, 10000);
    });
  }

  update(config) {
    this.config = { ...this.config, ...config };
    this.postToFrame({ type: 'UPDATE', config: this.config });
  }

  postToFrame(msg) {
    this.iframe.contentWindow?.postMessage(msg, '*');
  }

  destroy() {
    window.removeEventListener('message', this.messageHandler);
    this.iframe.remove();
  }

  getEmbeddedHTML() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; }
    .form { padding: 12px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-size: 13px; margin-bottom: 4px; font-weight: 500; }
    .field input { width: 100%; padding: 10px; border: 1px solid #d4d4d4; border-radius: 6px; font-size: 15px; outline: none; transition: border-color 0.2s; }
    .field input:focus { border-color: #635bff; box-shadow: 0 0 0 3px rgba(99,91,255,0.15); }
    .field input.error { border-color: #df1b41; }
    .error-text { color: #df1b41; font-size: 12px; margin-top: 4px; }
    .row { display: flex; gap: 12px; }
    .row .field { flex: 1; }
    .card-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; }
    .field-wrap { position: relative; }

    /* Themes */
    body.dark { background: #1a1a2e; color: #e0e0e0; }
    body.dark input { background: #16213e; border-color: #334155; color: #e0e0e0; }
    body.dark label { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="form">
    <div class="field">
      <label for="card-number">Card number</label>
      <div class="field-wrap">
        <input id="card-number" inputmode="numeric" placeholder="1234 1234 1234 1234" maxlength="19" autocomplete="cc-number">
        <span class="card-icon" id="card-icon"></span>
      </div>
      <div class="error-text" id="card-error"></div>
    </div>
    <div class="row">
      <div class="field">
        <label for="expiry">Expiry</label>
        <input id="expiry" inputmode="numeric" placeholder="MM / YY" maxlength="7" autocomplete="cc-exp">
        <div class="error-text" id="expiry-error"></div>
      </div>
      <div class="field">
        <label for="cvc">CVC</label>
        <input id="cvc" inputmode="numeric" placeholder="CVC" maxlength="4" autocomplete="cc-csc">
        <div class="error-text" id="cvc-error"></div>
      </div>
    </div>
  </div>

  <script>
    const cardInput = document.getElementById('card-number');
    const expiryInput = document.getElementById('expiry');
    const cvcInput = document.getElementById('cvc');
    const cardIcon = document.getElementById('card-icon');

    const cardPatterns = {
      visa: { regex: /^4/, icon: '💳', cvcLen: 3 },
      mastercard: { regex: /^5[1-5]/, icon: '💳', cvcLen: 3 },
      amex: { regex: /^3[47]/, icon: '💳', cvcLen: 4 }
    };

    let cardType = null;
    let state = { number: '', expiry: '', cvc: '', numberValid: false, expiryValid: false, cvcValid: false };

    function postToParent(msg) {
      window.parent.postMessage(msg, '*');
    }

    function notifyResize() {
      postToParent({ type: 'RESIZE', height: document.body.scrollHeight });
    }

    // Format card number
    cardInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\\D/g, '').slice(0, 16);
      val = val.replace(/(\\d{4})(?=\\d)/g, '$1 ').trim();
      e.target.value = val;
      state.number = val;

      // Detect card type
      const clean = val.replace(/\\s/g, '');
      cardType = null;
      for (const [type, p] of Object.entries(cardPatterns)) {
        if (p.regex.test(clean)) { cardType = type; break; }
      }
      cardIcon.textContent = cardType ? cardPatterns[cardType].icon : '';
      cvcInput.maxLength = cardType === 'amex' ? 4 : 3;

      // Validate
      state.numberValid = luhnCheck(clean) && clean.length >= 13;
      document.getElementById('card-error').textContent =
        clean.length >= 13 && !state.numberValid ? 'Invalid card number' : '';
      cardInput.classList.toggle('error', clean.length >= 13 && !state.numberValid);

      notifyChange();
    });

    // Format expiry
    expiryInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\\D/g, '').slice(0, 4);
      if (val.length > 2) val = val.slice(0, 2) + ' / ' + val.slice(2);
      e.target.value = val;
      state.expiry = val;

      const parts = val.replace(/\\s/g, '').split('/');
      if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 2) {
        const mm = parseInt(parts[0]), yy = parseInt(parts[1]);
        state.expiryValid = mm >= 1 && mm <= 12 && new Date(2000 + yy, mm) > new Date();
      } else {
        state.expiryValid = false;
      }
      document.getElementById('expiry-error').textContent =
        val.length >= 7 && !state.expiryValid ? 'Invalid expiry' : '';
      expiryInput.classList.toggle('error', val.length >= 7 && !state.expiryValid);

      notifyChange();
    });

    // CVC
    cvcInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\\D/g, '');
      state.cvc = e.target.value;
      const reqLen = cardType === 'amex' ? 4 : 3;
      state.cvcValid = state.cvc.length === reqLen;
      notifyChange();
    });

    // Focus management
    [cardInput, expiryInput, cvcInput].forEach(input => {
      input.addEventListener('focus', () => postToParent({ type: 'FOCUS', focused: true }));
      input.addEventListener('blur', () => postToParent({ type: 'FOCUS', focused: false }));
    });

    function luhnCheck(num) {
      if (!/^\\d+$/.test(num)) return false;
      let sum = 0, alt = false;
      for (let i = num.length - 1; i >= 0; i--) {
        let n = parseInt(num[i]);
        if (alt) { n *= 2; if (n > 9) n -= 9; }
        sum += n; alt = !alt;
      }
      return sum % 10 === 0;
    }

    function notifyChange() {
      postToParent({
        type: 'CHANGE',
        complete: state.numberValid && state.expiryValid && state.cvcValid,
        empty: !state.number && !state.expiry && !state.cvc,
        error: null,
        cardType
      });
    }

    // Handle messages from parent
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'INIT' || msg.type === 'UPDATE') {
        if (msg.config?.theme === 'dark') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
      }
      if (msg.type === 'CREATE_TOKEN') {
        // Simulate tokenization
        if (state.numberValid && state.expiryValid && state.cvcValid) {
          postToParent({
            type: 'TOKEN',
            token: { id: 'tok_' + Math.random().toString(36).slice(2, 10), card: { last4: state.number.slice(-4), type: cardType } }
          });
        } else {
          postToParent({ type: 'ERROR', error: 'Incomplete card details' });
        }
      }
    });

    // Notify parent we're ready
    setTimeout(() => {
      postToParent({ type: 'READY' });
      notifyResize();
    }, 100);

    new ResizeObserver(() => notifyResize()).observe(document.body);
  </script>
</body>
</html>`;
  }
}

// Usage:
// const el = new PaymentElement(document.getElementById('payment-container'), {
//   theme: 'light',
//   onChange: (state) => {
//     document.getElementById('pay-btn').disabled = !state.complete;
//     console.log('Card type:', state.cardType);
//   },
//   onReady: () => console.log('Payment element ready'),
//   onError: (err) => console.error('Error:', err)
// });
// 
// document.getElementById('pay-btn').addEventListener('click', async () => {
//   const { token } = await el.createToken();
//   console.log('Token:', token);
// });
```

## 🎯 Key Takeaways
- Stripe FE interviews test **iframe-based SDK** architecture — core to their payment elements
- `postMessage` API for cross-origin iframe communication with message type protocol
- Security: iframe isolates sensitive card data from merchant's page (PCI compliance)
- Promise-based `createToken()` with timeout prevents hanging
- `ResizeObserver` inside iframe + `RESIZE` message keeps host in sync with content height
- Theming via message passing — parent sends config, iframe applies CSS classes
- Focus events bridged across iframe boundary for consistent UX

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium | Algorithms, Data Structures |
| FE Coding | Hard | iframe, postMessage, Security |
| System Design | Hard | Payment SDK Architecture |
| HM | Medium | Behavioral |
