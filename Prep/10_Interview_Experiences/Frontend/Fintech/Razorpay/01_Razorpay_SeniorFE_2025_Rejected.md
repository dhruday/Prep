# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 1 week
- **Rejection Reason:** Machine coding round — didn't handle edge cases in payment form

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Payment Checkout Widget** (like Razorpay's embeddable checkout)
   - Credit card form with validation, card type detection, real-time formatting

### 💡 Interview-Ready Answer

```javascript
class PaymentWidget {
  constructor(container) {
    this.container = container;
    this.render();
  }
  
  // Luhn algorithm for credit card validation
  validateCardNumber(number) {
    const digits = number.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) return false;
    
    let sum = 0;
    let isDouble = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      if (isDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isDouble = !isDouble;
    }
    
    return sum % 10 === 0;
  }
  
  // Detect card type from first few digits
  detectCardType(number) {
    const clean = number.replace(/\s/g, '');
    
    const patterns = [
      { type: 'visa',       regex: /^4/,                      lengths: [13, 16, 19] },
      { type: 'mastercard', regex: /^(5[1-5]|2[2-7])/,        lengths: [16] },
      { type: 'amex',       regex: /^3[47]/,                   lengths: [15] },
      { type: 'rupay',      regex: /^(60|65|81|82|508)/,       lengths: [16] },
      { type: 'diners',     regex: /^(36|38|30[0-5])/,        lengths: [14, 16] },
    ];
    
    for (const { type, regex } of patterns) {
      if (regex.test(clean)) return type;
    }
    return 'unknown';
  }
  
  // Format card number with spaces (4-4-4-4 for most, 4-6-5 for Amex)
  formatCardNumber(value) {
    const clean = value.replace(/\D/g, '');
    const type = this.detectCardType(clean);
    
    if (type === 'amex') {
      // Amex: 4-6-5 grouping
      return clean.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) => 
        [a, b, c].filter(Boolean).join(' ')
      );
    }
    
    // Default: 4-4-4-4 grouping
    return clean.match(/.{1,4}/g)?.join(' ') || '';
  }
  
  formatExpiry(value) {
    const clean = value.replace(/\D/g, '');
    if (clean.length >= 2) {
      return clean.substring(0, 2) + '/' + clean.substring(2, 4);
    }
    return clean;
  }
  
  validateExpiry(value) {
    const match = value.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return { valid: false, error: 'Format: MM/YY' };
    
    const month = parseInt(match[1]);
    const year = parseInt('20' + match[2]);
    
    if (month < 1 || month > 12) return { valid: false, error: 'Invalid month' };
    
    const now = new Date();
    const expiry = new Date(year, month); // First day of next month
    if (expiry <= now) return { valid: false, error: 'Card expired' };
    
    return { valid: true };
  }
  
  validateCVV(cvv, cardType) {
    const length = cardType === 'amex' ? 4 : 3;
    const regex = new RegExp(`^\\d{${length}}$`);
    return regex.test(cvv);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="payment-widget" role="form" aria-label="Payment form">
        <div class="card-preview" id="card-preview">
          <div class="card-brand" id="card-brand">💳</div>
          <div class="card-number-display" id="card-display">•••• •••• •••• ••••</div>
          <div class="card-name-display" id="name-display">CARDHOLDER NAME</div>
          <div class="card-expiry-display" id="expiry-display">MM/YY</div>
        </div>
        
        <div class="form-fields">
          <div class="field-group">
            <label for="cardNumber">Card Number</label>
            <input type="text" id="cardNumber" inputmode="numeric" 
                   maxlength="23" placeholder="1234 5678 9012 3456"
                   aria-describedby="cardNumber-error" autocomplete="cc-number" />
            <div class="field-error" id="cardNumber-error" role="alert"></div>
          </div>
          
          <div class="field-group">
            <label for="cardName">Name on Card</label>
            <input type="text" id="cardName" placeholder="John Doe" 
                   autocomplete="cc-name" />
          </div>
          
          <div class="field-row">
            <div class="field-group">
              <label for="expiry">Expiry</label>
              <input type="text" id="expiry" inputmode="numeric" 
                     maxlength="5" placeholder="MM/YY" autocomplete="cc-exp" />
              <div class="field-error" id="expiry-error" role="alert"></div>
            </div>
            
            <div class="field-group">
              <label for="cvv">CVV</label>
              <input type="password" id="cvv" inputmode="numeric" 
                     maxlength="4" placeholder="•••" autocomplete="cc-csc" />
              <div class="field-error" id="cvv-error" role="alert"></div>
            </div>
          </div>
          
          <button id="pay-btn" class="pay-button" disabled>
            Pay ₹2,499
          </button>
        </div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  attachEvents() {
    const cardInput = this.container.querySelector('#cardNumber');
    const nameInput = this.container.querySelector('#cardName');
    const expiryInput = this.container.querySelector('#expiry');
    const cvvInput = this.container.querySelector('#cvv');
    const payBtn = this.container.querySelector('#pay-btn');
    
    // Real-time card number formatting + type detection
    cardInput.addEventListener('input', (e) => {
      const cursorPos = e.target.selectionStart;
      const prevLen = e.target.value.length;
      
      e.target.value = this.formatCardNumber(e.target.value);
      
      // Adjust cursor position after formatting (spaces inserted)
      const diff = e.target.value.length - prevLen;
      e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);
      
      const type = this.detectCardType(e.target.value);
      const brandIcons = { visa: '💙', mastercard: '🔴', amex: '💚', rupay: '🇮🇳', unknown: '💳' };
      this.container.querySelector('#card-brand').textContent = brandIcons[type] || '💳';
      this.container.querySelector('#card-display').textContent = e.target.value || '•••• •••• •••• ••••';
      
      this.validateForm();
    });
    
    // Blur validation
    cardInput.addEventListener('blur', () => {
      const error = this.container.querySelector('#cardNumber-error');
      if (cardInput.value && !this.validateCardNumber(cardInput.value)) {
        error.textContent = 'Invalid card number';
      } else {
        error.textContent = '';
      }
    });
    
    nameInput.addEventListener('input', () => {
      this.container.querySelector('#name-display').textContent = 
        nameInput.value.toUpperCase() || 'CARDHOLDER NAME';
    });
    
    expiryInput.addEventListener('input', (e) => {
      e.target.value = this.formatExpiry(e.target.value);
      this.container.querySelector('#expiry-display').textContent = e.target.value || 'MM/YY';
      this.validateForm();
    });
    
    expiryInput.addEventListener('blur', () => {
      const result = this.validateExpiry(expiryInput.value);
      this.container.querySelector('#expiry-error').textContent = result.valid ? '' : result.error;
    });
    
    cvvInput.addEventListener('input', () => this.validateForm());
    
    payBtn.addEventListener('click', () => this.handlePayment());
  }
  
  validateForm() {
    const card = this.container.querySelector('#cardNumber').value;
    const name = this.container.querySelector('#cardName').value;
    const expiry = this.container.querySelector('#expiry').value;
    const cvv = this.container.querySelector('#cvv').value;
    
    const cardType = this.detectCardType(card);
    const isValid = 
      this.validateCardNumber(card) &&
      name.trim().length > 0 &&
      this.validateExpiry(expiry).valid &&
      this.validateCVV(cvv, cardType);
    
    this.container.querySelector('#pay-btn').disabled = !isValid;
  }
  
  async handlePayment() {
    const btn = this.container.querySelector('#pay-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    // Simulate payment API call
    await new Promise(r => setTimeout(r, 2000));
    btn.textContent = '✓ Payment Successful';
    btn.classList.add('success');
  }
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Observable pattern (like RxJS simplified)**
2. **Explain and implement generators + async generators**

### 💡 Simplified Observable

```javascript
class Observable {
  constructor(subscribeFn) {
    this._subscribe = subscribeFn;
  }
  
  subscribe(observer) {
    // Normalize: accept function or { next, error, complete }
    const normalized = typeof observer === 'function' 
      ? { next: observer, error: () => {}, complete: () => {} }
      : { next: observer.next || (() => {}), 
          error: observer.error || (() => {}), 
          complete: observer.complete || (() => {}) };
    
    const subscription = { unsubscribed: false };
    
    const safeObserver = {
      next: (val) => { if (!subscription.unsubscribed) normalized.next(val); },
      error: (err) => { if (!subscription.unsubscribed) { normalized.error(err); subscription.unsubscribed = true; } },
      complete: () => { if (!subscription.unsubscribed) { normalized.complete(); subscription.unsubscribed = true; } },
    };
    
    const teardown = this._subscribe(safeObserver);
    
    return {
      unsubscribe() {
        subscription.unsubscribed = true;
        if (typeof teardown === 'function') teardown();
      }
    };
  }
  
  // Operators
  map(project) {
    return new Observable(observer => {
      const sub = this.subscribe({
        next: val => observer.next(project(val)),
        error: err => observer.error(err),
        complete: () => observer.complete(),
      });
      return () => sub.unsubscribe();
    });
  }
  
  filter(predicate) {
    return new Observable(observer => {
      const sub = this.subscribe({
        next: val => { if (predicate(val)) observer.next(val); },
        error: err => observer.error(err),
        complete: () => observer.complete(),
      });
      return () => sub.unsubscribe();
    });
  }
  
  static fromEvent(element, eventName) {
    return new Observable(observer => {
      const handler = e => observer.next(e);
      element.addEventListener(eventName, handler);
      return () => element.removeEventListener(eventName, handler);
    });
  }
  
  static interval(ms) {
    return new Observable(observer => {
      let count = 0;
      const id = setInterval(() => observer.next(count++), ms);
      return () => clearInterval(id);
    });
  }
}

// Usage:
const clicks$ = Observable.fromEvent(document, 'click')
  .map(e => ({ x: e.clientX, y: e.clientY }))
  .filter(pos => pos.x > 100);

const sub = clicks$.subscribe(pos => console.log(pos));
// Later: sub.unsubscribe();
```

---

## 🎯 Key Takeaways
- Razorpay machine coding = **Payment Widget** — know Luhn algorithm, card type detection
- **Real-time card formatting** with cursor position preservation is tricky — practice this
- **Expiry validation** — check against current date, not just format
- Got **rejected** because I missed: cursor position after format, Amex 4-6-5, expired card check
- **Observable pattern** = core reactive programming — understand subscribe/unsubscribe/teardown
- Razorpay uses RxJS-like patterns heavily — know map, filter, fromEvent, interval
- **autocomplete attributes** (cc-number, cc-name, cc-exp, cc-csc) = accessibility + browser autofill

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Payment Form, Luhn, Card Detection |
| JavaScript | Medium-Hard | Observable, Generators |
| System Design | Hard | Checkout Widget, Embeddable |
| HM | Medium | Behavioral |
