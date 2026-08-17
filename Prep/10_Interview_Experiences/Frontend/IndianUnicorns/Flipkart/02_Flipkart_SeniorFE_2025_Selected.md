# Flipkart — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | UI Engineer (SDE-3) |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + 3 Technical + Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** Flipkart UI Engineer is a specialized FE role — expect deep CSS/perf questions

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Multi-Step Checkout Form with validation**
   - Steps: Address → Payment → Review → Confirmation
   - Form validation, step navigation, persistence on refresh

### 💡 Interview-Ready Answer

```javascript
class CheckoutWizard {
  constructor(rootEl) {
    this.root = rootEl;
    this.currentStep = this.loadStep();
    this.formData = this.loadFormData();
    
    this.steps = [
      { id: 'address', title: 'Address', validate: this.validateAddress },
      { id: 'payment', title: 'Payment', validate: this.validatePayment },
      { id: 'review',  title: 'Review',  validate: () => ({ valid: true }) },
      { id: 'confirm', title: 'Confirm', validate: () => ({ valid: true }) },
    ];
    
    this.render();
  }
  
  loadStep() {
    return parseInt(sessionStorage.getItem('checkout_step') || '0');
  }
  
  loadFormData() {
    try { return JSON.parse(sessionStorage.getItem('checkout_data') || '{}'); }
    catch { return {}; }
  }
  
  saveState() {
    sessionStorage.setItem('checkout_step', this.currentStep.toString());
    sessionStorage.setItem('checkout_data', JSON.stringify(this.formData));
  }
  
  render() {
    this.root.innerHTML = `
      <div class="checkout-wizard">
        <nav class="stepper" aria-label="Checkout progress">
          <ol>
            ${this.steps.map((step, i) => `
              <li class="${i < this.currentStep ? 'completed' : ''} 
                         ${i === this.currentStep ? 'active' : ''}"
                  aria-current="${i === this.currentStep ? 'step' : 'false'}">
                <span class="step-number">${i < this.currentStep ? '✓' : i + 1}</span>
                <span class="step-title">${step.title}</span>
              </li>
            `).join('')}
          </ol>
        </nav>
        
        <div class="step-content" id="step-content">
          ${this.renderStep(this.currentStep)}
        </div>
        
        <div class="step-actions">
          ${this.currentStep > 0 ? '<button id="prev-btn" class="btn-secondary">Back</button>' : ''}
          ${this.currentStep < this.steps.length - 1 
            ? '<button id="next-btn" class="btn-primary">Continue</button>'
            : '<button id="place-order-btn" class="btn-primary">Place Order</button>'}
        </div>
        
        <div id="error-container" role="alert" aria-live="assertive" class="error-msg"></div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  renderStep(index) {
    switch (index) {
      case 0: return this.renderAddressForm();
      case 1: return this.renderPaymentForm();
      case 2: return this.renderReview();
      case 3: return this.renderConfirmation();
      default: return '';
    }
  }
  
  renderAddressForm() {
    const d = this.formData.address || {};
    return `
      <fieldset>
        <legend>Delivery Address</legend>
        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input type="text" id="fullName" name="fullName" value="${d.fullName || ''}" 
                 required aria-required="true" />
        </div>
        <div class="form-group">
          <label for="phone">Phone *</label>
          <input type="tel" id="phone" name="phone" value="${d.phone || ''}" 
                 pattern="[0-9]{10}" required aria-required="true" />
        </div>
        <div class="form-group">
          <label for="pincode">Pincode *</label>
          <input type="text" id="pincode" name="pincode" value="${d.pincode || ''}" 
                 pattern="[0-9]{6}" required aria-required="true" />
        </div>
        <div class="form-group">
          <label for="address">Address *</label>
          <textarea id="address" name="address" required 
                    aria-required="true">${d.address || ''}</textarea>
        </div>
      </fieldset>
    `;
  }
  
  renderPaymentForm() {
    const d = this.formData.payment || {};
    return `
      <fieldset>
        <legend>Payment Method</legend>
        <div class="payment-options">
          ${['UPI', 'Credit Card', 'Debit Card', 'COD'].map(method => `
            <label class="radio-option">
              <input type="radio" name="paymentMethod" value="${method}" 
                     ${d.method === method ? 'checked' : ''} />
              ${method}
            </label>
          `).join('')}
        </div>
        <div id="card-fields" ${d.method?.includes('Card') ? '' : 'hidden'}>
          <div class="form-group">
            <label for="cardNumber">Card Number</label>
            <input type="text" id="cardNumber" name="cardNumber" 
                   value="${d.cardNumber || ''}" maxlength="19" 
                   placeholder="1234 5678 9012 3456" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="expiry">Expiry</label>
              <input type="text" id="expiry" name="expiry" value="${d.expiry || ''}" 
                     placeholder="MM/YY" maxlength="5" />
            </div>
            <div class="form-group">
              <label for="cvv">CVV</label>
              <input type="password" id="cvv" name="cvv" maxlength="3" />
            </div>
          </div>
        </div>
      </fieldset>
    `;
  }
  
  renderReview() {
    const addr = this.formData.address || {};
    const pay = this.formData.payment || {};
    return `
      <div class="review-section">
        <h3>Delivery Address</h3>
        <p>${addr.fullName}<br>${addr.address}<br>PIN: ${addr.pincode}<br>Phone: ${addr.phone}</p>
        
        <h3>Payment Method</h3>
        <p>${pay.method}${pay.cardNumber ? ` ending ${pay.cardNumber.slice(-4)}` : ''}</p>
        
        <h3>Order Summary</h3>
        <p>Total: ₹2,499</p>
      </div>
    `;
  }
  
  renderConfirmation() {
    return `
      <div class="confirmation" role="alert">
        <div class="success-icon">✓</div>
        <h2>Order Placed Successfully!</h2>
        <p>Order #FK${Date.now().toString(36).toUpperCase()}</p>
        <p>You'll receive a confirmation email shortly.</p>
      </div>
    `;
  }
  
  validateAddress() {
    const form = document.querySelector('fieldset');
    const data = {
      fullName: form.querySelector('#fullName')?.value.trim(),
      phone: form.querySelector('#phone')?.value.trim(),
      pincode: form.querySelector('#pincode')?.value.trim(),
      address: form.querySelector('#address')?.value.trim(),
    };
    
    const errors = [];
    if (!data.fullName) errors.push('Full name is required');
    if (!/^\d{10}$/.test(data.phone)) errors.push('Valid 10-digit phone required');
    if (!/^\d{6}$/.test(data.pincode)) errors.push('Valid 6-digit pincode required');
    if (!data.address) errors.push('Address is required');
    
    return { valid: errors.length === 0, errors, data };
  }
  
  validatePayment() {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!method) return { valid: false, errors: ['Select a payment method'] };
    
    const data = { method };
    
    if (method.includes('Card')) {
      data.cardNumber = document.querySelector('#cardNumber')?.value.replace(/\s/g, '');
      data.expiry = document.querySelector('#expiry')?.value;
      
      if (!/^\d{16}$/.test(data.cardNumber)) {
        return { valid: false, errors: ['Valid 16-digit card number required'] };
      }
      if (!/^\d{2}\/\d{2}$/.test(data.expiry)) {
        return { valid: false, errors: ['Valid MM/YY expiry required'] };
      }
    }
    
    return { valid: true, data };
  }
  
  goNext() {
    const step = this.steps[this.currentStep];
    const result = step.validate();
    
    if (!result.valid) {
      this.showErrors(result.errors);
      return;
    }
    
    // Save step data
    if (this.currentStep === 0) this.formData.address = result.data;
    if (this.currentStep === 1) this.formData.payment = result.data;
    
    this.currentStep++;
    this.saveState();
    this.render();
  }
  
  goPrev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.saveState();
      this.render();
    }
  }
  
  showErrors(errors) {
    const container = this.root.querySelector('#error-container');
    container.innerHTML = errors.map(e => `<p>⚠ ${e}</p>`).join('');
  }
  
  attachEvents() {
    this.root.querySelector('#next-btn')?.addEventListener('click', () => this.goNext());
    this.root.querySelector('#prev-btn')?.addEventListener('click', () => this.goPrev());
    this.root.querySelector('#place-order-btn')?.addEventListener('click', () => this.goNext());
    
    // Toggle card fields visibility
    this.root.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const cardFields = this.root.querySelector('#card-fields');
        if (cardFields) cardFields.hidden = !e.target.value.includes('Card');
      });
    });
  }
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement a deep diff between two objects** (return the changes)
2. **Event Loop output prediction with Promise + setTimeout + queueMicrotask**

### 💡 Deep Diff

```javascript
function deepDiff(oldObj, newObj) {
  const changes = [];
  
  function diff(path, a, b) {
    // Type changed
    if (typeof a !== typeof b || (a === null) !== (b === null) || Array.isArray(a) !== Array.isArray(b)) {
      changes.push({ type: 'changed', path, oldValue: a, newValue: b });
      return;
    }
    
    // Primitive comparison
    if (typeof a !== 'object' || a === null) {
      if (a !== b) {
        changes.push({ type: 'changed', path, oldValue: a, newValue: b });
      }
      return;
    }
    
    // Object/Array comparison
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    
    for (const key of allKeys) {
      const newPath = Array.isArray(a) ? `${path}[${key}]` : `${path}.${key}`;
      
      if (!(key in a)) {
        changes.push({ type: 'added', path: newPath, newValue: b[key] });
      } else if (!(key in b)) {
        changes.push({ type: 'removed', path: newPath, oldValue: a[key] });
      } else {
        diff(newPath, a[key], b[key]);
      }
    }
  }
  
  diff('$', oldObj, newObj);
  return changes;
}

// Example:
deepDiff(
  { name: 'Alice', age: 25, skills: ['JS', 'React'] },
  { name: 'Alice', age: 26, skills: ['JS', 'Vue'], city: 'BLR' }
);
// [
//   { type: 'changed', path: '$.age', oldValue: 25, newValue: 26 },
//   { type: 'changed', path: '$.skills[1]', oldValue: 'React', newValue: 'Vue' },
//   { type: 'added', path: '$.city', newValue: 'BLR' }
// ]
```

### 💡 Event Loop Output Prediction

```javascript
console.log('1');                           // Sync

setTimeout(() => console.log('2'), 0);       // Macrotask queue

Promise.resolve().then(() => {
  console.log('3');                          // Microtask
  queueMicrotask(() => console.log('4'));    // Nested microtask
});

queueMicrotask(() => console.log('5'));      // Microtask

Promise.resolve().then(() => console.log('6')); // Microtask

console.log('7');                           // Sync

// Output: 1, 7, 3, 5, 6, 4, 2
// Explanation:
// 1. Synchronous: log 1, log 7
// 2. Drain microtask queue: 3, 5, 6 (in order they were queued)
// 3. Drain nested microtasks: 4 (queued by the '3' microtask during drain)
// 4. Macrotask: 2
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Product Detail Page (PDP) for scale**
   - Image gallery, offer/coupon display, size selector, reviews, performance

### 💡 Interview-Ready Answer

```
Performance-First PDP Architecture:
┌──────────────────────────────────────────────────────────────┐
│  SSR for First Paint:                                         │
│  - Server renders above-the-fold: product image, title,      │
│    price, offer badge, "Add to Cart" CTA                     │
│  - Below-the-fold lazy loaded: reviews, Q&A, related         │
│  - Critical CSS inlined in <head>                            │
│                                                                │
│  Image Gallery (Hero section):                                │
│  - First image: eager load, preloaded in <head>              │
│  - Other images: lazy loaded on swipe/click                  │
│  - srcset for responsive: 200w, 400w, 800w                  │
│  - LQIP (Low Quality Image Placeholder): 10x10 blurred      │
│  - Pinch-to-zoom: CSS transform (not new image download)     │
│  - AVIF → WebP → JPEG (server negotiation via Accept header) │
│                                                                │
│  Size Selector:                                               │
│  - Fetch availability per size from inventory API             │
│  - Pin code-wise delivery estimation (separate API call)     │
│  - "Only 2 left" urgency: stock count from inventory         │
│                                                                │
│  Offers Section:                                              │
│  - Coupon list from Offers API (personalized per user)       │
│  - "Apply" copies coupon code to clipboard                   │
│  - Bank offer modals loaded on demand                        │
│                                                                │
│  Reviews:                                                     │
│  - Infinite scroll with cursor pagination                    │
│  - Sort by: most helpful (default), recent, rating           │
│  - Image reviews: separate "with images" filter              │
│  - Star distribution bar chart (pre-computed on server)      │
│                                                                │
│  Performance Budget:                                          │
│  - LCP < 2.5s (hero image load time)                        │
│  - FID < 100ms (Add to Cart responsive)                      │
│  - CLS < 0.1 (no layout shift from lazy content)            │
│  - Total JS < 200KB gzipped                                  │
│  - React tree splits: main chunk + reviews chunk + QA chunk  │
│                                                                │
│  State Management:                                            │
│  - Product data: React Query (server state caching)          │
│  - Cart: Redux/Zustand (global client state)                 │
│  - UI state (selected size, tab): local useState             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Flipkart machine coding = **Vanilla JS** or React — always ask which one
- **Multi-step form with persistence** → sessionStorage for refresh resilience
- **Deep diff** is a common Flipkart/Amazon FE question — handle all types
- **Event loop prediction** → know microtask queue drains completely before macrotask
- **PDP performance** is Flipkart's bread-and-butter system design question
- **LQIP + srcset + format negotiation** for image optimization — expect depth here

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Multi-Step Form, Validation, Persistence |
| JS Deep Dive | Hard | Deep Diff, Event Loop, Microtasks |
| System Design | Hard | E-Commerce PDP, Performance, SSR |
| Bar Raiser | Hard | Behavioral + Quick Problem |
