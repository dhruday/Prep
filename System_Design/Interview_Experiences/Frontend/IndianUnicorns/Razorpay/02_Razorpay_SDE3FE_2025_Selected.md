# Razorpay — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS Fundamentals + Machine Coding + FE System Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Build a Payment Checkout Form with Validation

### Problem
Build a multi-step payment checkout form:
- Step 1: Card number with Luhn validation, real-time card type detection
- Step 2: Amount input with currency formatting
- Card number masking (show last 4 only after moving to next step)
- Inline validation with error messages
- Responsive and accessible

### 💡 Interview-Ready Answer

```javascript
class PaymentCheckout {
  constructor(container) {
    this.container = container;
    this.currentStep = 0;
    this.formData = { cardNumber: '', expiry: '', cvv: '', amount: '' };
    this.errors = {};
    this.cardType = null;

    this.cardPatterns = {
      visa: /^4[0-9]{0,15}$/,
      mastercard: /^5[1-5][0-9]{0,14}$/,
      amex: /^3[47][0-9]{0,13}$/,
      rupay: /^6[0-9]{0,15}$/
    };

    this.render();
  }

  detectCardType(number) {
    const cleaned = number.replace(/\s/g, '');
    for (const [type, pattern] of Object.entries(this.cardPatterns)) {
      if (pattern.test(cleaned)) return type;
    }
    return null;
  }

  luhnCheck(number) {
    const digits = number.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    if (!/^\d+$/.test(digits)) return false;

    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  formatCardNumber(raw) {
    const cleaned = raw.replace(/\D/g, '').slice(0, 16);
    const isAmex = this.cardType === 'amex';
    if (isAmex) {
      // AMEX: 4-6-5 grouping
      return cleaned.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(' ')
      );
    }
    // Standard: 4-4-4-4 grouping
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  maskCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 4) return '****';
    return '**** **** **** ' + cleaned.slice(-4);
  }

  formatExpiry(raw) {
    const cleaned = raw.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length > 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  }

  formatCurrency(raw) {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const intPart = parts[0] || '0';
    const decPart = parts[1]?.slice(0, 2) || '';

    // Indian number formatting (e.g., 1,00,000)
    const formatted = intPart.replace(/\B(?=(\d{2})+(\d)(?!\d))/g, ',');
    return decPart ? `₹${formatted}.${decPart}` : `₹${formatted}`;
  }

  validateStep(step) {
    this.errors = {};

    if (step === 0) {
      const card = this.formData.cardNumber.replace(/\s/g, '');
      if (!card) {
        this.errors.cardNumber = 'Card number is required';
      } else if (!this.luhnCheck(card)) {
        this.errors.cardNumber = 'Invalid card number';
      }

      if (!this.formData.expiry || this.formData.expiry.length < 5) {
        this.errors.expiry = 'Expiry is required (MM/YY)';
      } else {
        const [mm, yy] = this.formData.expiry.split('/').map(Number);
        const now = new Date();
        const expDate = new Date(2000 + yy, mm);
        if (mm < 1 || mm > 12) {
          this.errors.expiry = 'Invalid month';
        } else if (expDate <= now) {
          this.errors.expiry = 'Card has expired';
        }
      }

      const cvvLen = this.cardType === 'amex' ? 4 : 3;
      if (!this.formData.cvv || this.formData.cvv.length !== cvvLen) {
        this.errors.cvv = `CVV must be ${cvvLen} digits`;
      }
    }

    if (step === 1) {
      const amount = parseFloat(this.formData.amount.replace(/[₹,]/g, ''));
      if (!amount || amount <= 0) {
        this.errors.amount = 'Enter a valid amount';
      } else if (amount > 500000) {
        this.errors.amount = 'Maximum transaction limit: ₹5,00,000';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'checkout-container';

    // Progress indicator
    const progress = document.createElement('div');
    progress.className = 'checkout-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuenow', this.currentStep + 1);
    progress.setAttribute('aria-valuemax', 3);

    const steps = ['Card Details', 'Amount', 'Confirm'];
    steps.forEach((label, i) => {
      const step = document.createElement('span');
      step.className = `progress-step ${i <= this.currentStep ? 'active' : ''} ${i < this.currentStep ? 'completed' : ''}`;
      step.textContent = label;
      progress.appendChild(step);
    });
    this.container.appendChild(progress);

    // Form area
    const form = document.createElement('form');
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', (e) => e.preventDefault());

    if (this.currentStep === 0) {
      this.renderCardStep(form);
    } else if (this.currentStep === 1) {
      this.renderAmountStep(form);
    } else {
      this.renderConfirmStep(form);
    }

    this.container.appendChild(form);
  }

  renderCardStep(form) {
    // Card type indicator
    if (this.cardType) {
      const badge = document.createElement('div');
      badge.className = `card-badge card-${this.cardType}`;
      badge.textContent = this.cardType.toUpperCase();
      form.appendChild(badge);
    }

    // Card number
    const cardField = this.createField('Card Number', 'cardNumber', 'text', {
      placeholder: '1234 5678 9012 3456',
      maxLength: 19,
      inputMode: 'numeric',
      autocomplete: 'cc-number'
    });
    cardField.input.addEventListener('input', (e) => {
      this.cardType = this.detectCardType(e.target.value);
      e.target.value = this.formatCardNumber(e.target.value);
      this.formData.cardNumber = e.target.value;
      this.clearError('cardNumber');
      this.render(); // Re-render for card type badge
    });
    form.appendChild(cardField.wrapper);

    // Expiry + CVV row
    const row = document.createElement('div');
    row.className = 'form-row';

    const expiryField = this.createField('Expiry', 'expiry', 'text', {
      placeholder: 'MM/YY', maxLength: 5, inputMode: 'numeric',
      autocomplete: 'cc-exp'
    });
    expiryField.input.addEventListener('input', (e) => {
      e.target.value = this.formatExpiry(e.target.value);
      this.formData.expiry = e.target.value;
      this.clearError('expiry');
    });

    const cvvField = this.createField('CVV', 'cvv', 'password', {
      placeholder: this.cardType === 'amex' ? '1234' : '123',
      maxLength: this.cardType === 'amex' ? 4 : 3,
      inputMode: 'numeric',
      autocomplete: 'cc-csc'
    });
    cvvField.input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      this.formData.cvv = e.target.value;
      this.clearError('cvv');
    });

    row.appendChild(expiryField.wrapper);
    row.appendChild(cvvField.wrapper);
    form.appendChild(row);

    // Next button
    form.appendChild(this.createButton('Continue to Amount →', () => {
      if (this.validateStep(0)) {
        this.currentStep = 1;
        this.render();
      } else {
        this.showErrors();
      }
    }));
  }

  renderAmountStep(form) {
    // Masked card display
    const masked = document.createElement('div');
    masked.className = 'masked-card';
    masked.textContent = `💳 ${this.maskCardNumber(this.formData.cardNumber)} (${(this.cardType || 'card').toUpperCase()})`;
    form.appendChild(masked);

    // Amount
    const amountField = this.createField('Amount', 'amount', 'text', {
      placeholder: '₹0.00', inputMode: 'decimal'
    });
    amountField.input.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/[₹,]/g, '');
      this.formData.amount = raw;
      e.target.value = this.formatCurrency(raw);
      this.clearError('amount');
    });
    if (this.formData.amount) {
      amountField.input.value = this.formatCurrency(this.formData.amount);
    }
    form.appendChild(amountField.wrapper);

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'form-nav';
    nav.appendChild(this.createButton('← Back', () => {
      this.currentStep = 0;
      this.render();
    }, 'secondary'));
    nav.appendChild(this.createButton('Review Payment →', () => {
      if (this.validateStep(1)) {
        this.currentStep = 2;
        this.render();
      } else {
        this.showErrors();
      }
    }));
    form.appendChild(nav);
  }

  renderConfirmStep(form) {
    const summary = document.createElement('div');
    summary.className = 'confirm-summary';
    summary.setAttribute('role', 'region');
    summary.setAttribute('aria-label', 'Payment summary');

    const amount = parseFloat(this.formData.amount.replace(/[₹,]/g, ''));

    summary.innerHTML = `
      <h3>Confirm Payment</h3>
      <div class="summary-row">
        <span>Card</span>
        <span>${this.maskCardNumber(this.formData.cardNumber)}</span>
      </div>
      <div class="summary-row">
        <span>Type</span>
        <span>${(this.cardType || 'Unknown').toUpperCase()}</span>
      </div>
      <div class="summary-row">
        <span>Expiry</span>
        <span>${this.formData.expiry}</span>
      </div>
      <div class="summary-row total">
        <span>Amount</span>
        <span>${this.formatCurrency(String(amount))}</span>
      </div>
    `;
    form.appendChild(summary);

    const nav = document.createElement('div');
    nav.className = 'form-nav';
    nav.appendChild(this.createButton('← Edit', () => {
      this.currentStep = 1;
      this.render();
    }, 'secondary'));
    nav.appendChild(this.createButton('Pay Now', () => {
      this.handlePayment();
    }, 'primary'));
    form.appendChild(nav);
  }

  handlePayment() {
    const btn = this.container.querySelector('.btn-primary');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    // Simulate payment
    setTimeout(() => {
      const success = document.createElement('div');
      success.className = 'payment-success';
      success.setAttribute('role', 'alert');
      success.innerHTML = `
        <div class="success-icon">✓</div>
        <h3>Payment Successful!</h3>
        <p>₹${parseFloat(this.formData.amount).toLocaleString('en-IN')} paid</p>
      `;
      this.container.innerHTML = '';
      this.container.appendChild(success);
    }, 1500);
  }

  createField(label, name, type, attrs = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const lbl = document.createElement('label');
    lbl.setAttribute('for', `field-${name}`);
    lbl.textContent = label;
    wrapper.appendChild(lbl);

    const input = document.createElement('input');
    input.type = type;
    input.id = `field-${name}`;
    input.name = name;
    input.className = this.errors[name] ? 'input-error' : '';
    Object.entries(attrs).forEach(([k, v]) => input.setAttribute(k, v));

    if (this.formData[name]) input.value = this.formData[name];
    wrapper.appendChild(input);

    if (this.errors[name]) {
      const err = document.createElement('span');
      err.className = 'error-msg';
      err.setAttribute('role', 'alert');
      err.textContent = this.errors[name];
      wrapper.appendChild(err);
    }

    return { wrapper, input };
  }

  createButton(text, onClick, variant = 'primary') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn-${variant}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  clearError(field) {
    delete this.errors[field];
    const errEl = this.container.querySelector(`#field-${field}`)
      ?.parentElement?.querySelector('.error-msg');
    if (errEl) errEl.remove();
  }

  showErrors() {
    this.render(); // Re-render to show error states
  }
}

// Usage
// const checkout = new PaymentCheckout(document.getElementById('app'));
```

## 🎯 Key Takeaways
- Razorpay FE interviews focus on **payment UI** — checkout forms, card validation, formatting
- **Luhn algorithm** for card number validation is a must-know
- Card type detection via regex patterns (Visa starts with 4, MC 51-55, AMEX 34/37, RuPay 6)
- Indian currency formatting with lakhs/crores separator pattern
- Multi-step form with proper state preservation across steps
- Card number masking after step transition — security best practice
- ARIA attributes and `role="alert"` for accessibility on errors

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Closures, Promises, Event Loop |
| Machine Coding | Medium-Hard | Form Validation, Luhn, Formatting |
| FE System Design | Hard | Checkout SDK Architecture |
| HM | Medium | Behavioral |
