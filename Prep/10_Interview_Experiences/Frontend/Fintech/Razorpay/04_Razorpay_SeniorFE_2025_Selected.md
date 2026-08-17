# Razorpay — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build Razorpay Checkout — Multi-Step Payment Form with Live Card Validation

```javascript
/**
 * Razorpay-style checkout with:
 * - Step 1: Contact info (name, email, phone)
 * - Step 2: Payment method selection (card/UPI/netbanking/wallet)
 * - Step 3: Payment details entry
 * - Card: live formatting, Luhn validation, card brand detection
 * - Real-time error display per field
 * - Amount breakdown: subtotal + tax + discount
 * - Secure: no card data in state after submission
 */
class RazorpayCheckout {
  constructor(container, options = {}) {
    this.container = container;
    this.amount = options.amount || 0;
    this.currency = options.currency || 'INR';
    this.businessName = options.businessName || 'Merchant';
    this.orderId = options.orderId;
    
    this.step = 1;
    this.paymentMethod = null;
    this.formData = {};
    this.errors = {};
    this.cardBrand = null;
    this.processing = false;
    
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="rzp-checkout" role="dialog" aria-label="Payment Checkout">
        <header class="rzp-header">
          <h2>${this._sanitize(this.businessName)}</h2>
          <span class="rzp-amount">${this.formatAmount(this.amount)}</span>
        </header>
        
        <div class="rzp-steps">
          ${this.renderStepIndicator()}
        </div>
        
        <div class="rzp-body">
          ${this.step === 1 ? this.renderContactStep() : ''}
          ${this.step === 2 ? this.renderMethodStep() : ''}
          ${this.step === 3 ? this.renderPaymentStep() : ''}
        </div>
        
        <footer class="rzp-footer">
          ${this.step > 1 ? '<button class="rzp-back">← Back</button>' : '<div></div>'}
          <button class="rzp-next" ${this.processing ? 'disabled' : ''}>
            ${this.processing ? 'Processing...' : this.step === 3 ? `Pay ${this.formatAmount(this.amount)}` : 'Continue'}
          </button>
        </footer>
        
        <div class="rzp-secure">
          🔒 Secured by Razorpay
        </div>
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderStepIndicator() {
    return [1, 2, 3].map(s => 
      `<span class="step-dot ${s === this.step ? 'active' : ''} ${s < this.step ? 'done' : ''}"
             aria-label="Step ${s}">${s < this.step ? '✓' : s}</span>`
    ).join('<span class="step-line"></span>');
  }
  
  renderContactStep() {
    return `
      <div class="rzp-contact">
        ${this.renderInput('email', 'Email', 'email', { required: true })}
        ${this.renderInput('phone', 'Phone', 'tel', { required: true, inputmode: 'numeric' })}
      </div>
    `;
  }
  
  renderMethodStep() {
    const methods = [
      { id: 'card', label: 'Card', icon: '💳' },
      { id: 'upi', label: 'UPI', icon: '📱' },
      { id: 'netbanking', label: 'Netbanking', icon: '🏦' },
      { id: 'wallet', label: 'Wallet', icon: '👛' }
    ];
    
    return `
      <div class="rzp-methods" role="radiogroup" aria-label="Payment method">
        ${methods.map(m => `
          <label class="method-option ${this.paymentMethod === m.id ? 'selected' : ''}">
            <input type="radio" name="method" value="${m.id}"
                   ${this.paymentMethod === m.id ? 'checked' : ''}>
            <span class="method-icon">${m.icon}</span>
            <span class="method-label">${m.label}</span>
          </label>
        `).join('')}
      </div>
    `;
  }
  
  renderPaymentStep() {
    switch (this.paymentMethod) {
      case 'card': return this.renderCardForm();
      case 'upi': return this.renderUPIForm();
      default: return '<p>Select a payment method</p>';
    }
  }
  
  renderCardForm() {
    return `
      <div class="rzp-card-form">
        <div class="card-number-row">
          ${this.renderInput('cardNumber', 'Card Number', 'text', {
            maxLength: 19, inputmode: 'numeric', placeholder: '1234 5678 9012 3456'
          })}
          ${this.cardBrand ? `<span class="card-brand">${this.getCardBrandIcon(this.cardBrand)}</span>` : ''}
        </div>
        <div class="card-row">
          ${this.renderInput('expiry', 'MM/YY', 'text', { maxLength: 5, inputmode: 'numeric' })}
          ${this.renderInput('cvv', 'CVV', 'password', { maxLength: 4, inputmode: 'numeric' })}
        </div>
        ${this.renderInput('cardName', 'Name on Card', 'text', {})}
      </div>
    `;
  }
  
  renderUPIForm() {
    return `
      <div class="rzp-upi-form">
        ${this.renderInput('vpa', 'UPI ID', 'text', { placeholder: 'name@upi' })}
        <p class="rzp-hint">Enter your UPI ID (e.g., name@okaxis, name@ybl)</p>
      </div>
    `;
  }
  
  renderInput(name, label, type, opts = {}) {
    const value = this.formData[name] || '';
    const error = this.errors[name];
    
    return `
      <div class="rzp-field ${error ? 'has-error' : ''}">
        <label for="rzp-${name}">${label}</label>
        <input type="${type}" id="rzp-${name}" name="${name}"
               value="${this._sanitize(value)}"
               ${opts.maxLength ? `maxlength="${opts.maxLength}"` : ''}
               ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ''}
               ${opts.placeholder ? `placeholder="${opts.placeholder}"` : ''}
               ${opts.required ? 'required' : ''}
               ${error ? `aria-invalid="true" aria-describedby="err-${name}"` : ''}>
        ${error ? `<span class="rzp-error" id="err-${name}" role="alert">${this._sanitize(error)}</span>` : ''}
      </div>
    `;
  }
  
  // Card brand detection from BIN (first 6 digits)
  detectCardBrand(number) {
    const clean = number.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6(?:011|5)/.test(clean)) return 'discover';
    if (/^35/.test(clean)) return 'jcb';
    if (/^(508|60|65|69)/.test(clean)) return 'rupay';
    return null;
  }
  
  getCardBrandIcon(brand) {
    const icons = { visa: '🟦 Visa', mastercard: '🟠 MC', amex: '🔵 Amex', 
                    rupay: '🟢 RuPay', discover: '🟧 Disc', jcb: '🔲 JCB' };
    return icons[brand] || '';
  }
  
  // Luhn algorithm
  luhnCheck(number) {
    const clean = number.replace(/\s/g, '');
    let sum = 0, alternate = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let n = parseInt(clean[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }
  
  validateStep() {
    this.errors = {};
    
    switch (this.step) {
      case 1:
        if (!this.formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
          this.errors.email = 'Valid email required';
        }
        if (!this.formData.phone || !/^\d{10}$/.test(this.formData.phone)) {
          this.errors.phone = 'Valid 10-digit phone required';
        }
        break;
        
      case 2:
        if (!this.paymentMethod) this.errors.method = 'Select a payment method';
        break;
        
      case 3:
        if (this.paymentMethod === 'card') {
          const card = (this.formData.cardNumber || '').replace(/\s/g, '');
          if (!card || card.length < 13 || !this.luhnCheck(card)) {
            this.errors.cardNumber = 'Invalid card number';
          }
          if (!this.formData.expiry || !/^\d{2}\/\d{2}$/.test(this.formData.expiry)) {
            this.errors.expiry = 'Invalid expiry';
          }
          if (!this.formData.cvv || !/^\d{3,4}$/.test(this.formData.cvv)) {
            this.errors.cvv = 'Invalid CVV';
          }
        } else if (this.paymentMethod === 'upi') {
          if (!this.formData.vpa || !/^[\w.-]+@[\w]+$/.test(this.formData.vpa)) {
            this.errors.vpa = 'Invalid UPI ID format';
          }
        }
        break;
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  formatAmount(paise) {
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }
  
  collectFormData() {
    this.container.querySelectorAll('input').forEach(input => {
      if (input.type === 'radio') {
        if (input.checked) this.paymentMethod = input.value;
      } else if (input.name) {
        this.formData[input.name] = input.value;
      }
    });
  }
  
  async processPayment() {
    this.processing = true;
    this.render();
    
    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 2000));
      
      // Clear sensitive data immediately after processing
      delete this.formData.cardNumber;
      delete this.formData.cvv;
      delete this.formData.expiry;
      
      this.container.innerHTML = `
        <div class="rzp-success" role="status">
          <div class="success-icon">✓</div>
          <h2>Payment Successful</h2>
          <p>${this.formatAmount(this.amount)} paid to ${this._sanitize(this.businessName)}</p>
        </div>
      `;
    } catch (err) {
      this.processing = false;
      this.errors.general = 'Payment failed. Please try again.';
      this.render();
    }
  }
  
  attachListeners() {
    this.container.querySelector('.rzp-next')?.addEventListener('click', () => {
      this.collectFormData();
      if (this.validateStep()) {
        if (this.step === 3) {
          this.processPayment();
        } else {
          this.step++;
          this.render();
        }
      } else {
        this.render();
      }
    });
    
    this.container.querySelector('.rzp-back')?.addEventListener('click', () => {
      this.step--;
      this.render();
    });
    
    // Card number formatting + brand detection
    const cardInput = this.container.querySelector('#rzp-cardNumber');
    if (cardInput) {
      cardInput.addEventListener('input', () => {
        const raw = cardInput.value.replace(/\D/g, '');
        cardInput.value = raw.replace(/(.{4})/g, '$1 ').trim();
        this.formData.cardNumber = cardInput.value;
        this.cardBrand = this.detectCardBrand(raw);
        
        // Update brand icon without full re-render
        const brandEl = this.container.querySelector('.card-brand');
        if (brandEl && this.cardBrand) {
          brandEl.textContent = this.getCardBrandIcon(this.cardBrand);
        }
      });
    }
    
    // Expiry formatting
    const expiryInput = this.container.querySelector('#rzp-expiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', () => {
        let val = expiryInput.value.replace(/\D/g, '');
        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
        expiryInput.value = val;
      });
    }
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Razorpay FE = **Payment checkout form + card validation + brand detection + security**
- **Card brand detection**: regex on BIN (first digits) — Visa=4, MC=51-55, Amex=34/37, RuPay=508/60/65
- **Luhn algorithm**: standard card number validation — double every other digit from right
- **Card formatting**: `replace(/(.{4})/g, '$1 ')` — add space every 4 digits for readability
- **Security**: clear card data from state after submission — no PAN/CVV persistence
- **Multi-step form**: step indicator + back/forward navigation — validate per step
- **UPI ID validation**: regex `[\w.-]+@[\w]+` — format like name@okaxis, name@ybl
- Razorpay FE = **payment UX expertise** — card input formatting, real-time validation, security best practices

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Checkout Form, Card Validation, Security |
| Technical | Medium-Hard | React, JS Concepts |
| HM | Medium | Culture Fit |
