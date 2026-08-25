# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 (Frontend) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Payment Checkout Form with Real-Time Validation**
   - Card number with Luhn validation and card type detection (Visa, Mastercard, Amex)
   - Expiry date picker (MM/YY format)
   - CVV field (3 or 4 digits based on card type)
   - Amount display with currency formatting
   - UPI ID validation (regex pattern)

### 💡 Interview-Ready Answer

```javascript
class PaymentCheckout {
  constructor(container) {
    this.container = container;
    this.state = {
      paymentMethod: 'card', // 'card' | 'upi' | 'netbanking'
      card: { number: '', expiry: '', cvv: '', name: '' },
      upi: { vpa: '' },
      amount: 0,
      currency: 'INR',
      errors: {},
      cardType: null,
      isSubmitting: false,
    };
    this.render();
  }

  // ============================
  // Card Type Detection
  // ============================
  static CARD_PATTERNS = {
    visa: { pattern: /^4/, lengths: [16], cvvLength: 3, name: 'Visa' },
    mastercard: { pattern: /^5[1-5]|^2[2-7]/, lengths: [16], cvvLength: 3, name: 'Mastercard' },
    amex: { pattern: /^3[47]/, lengths: [15], cvvLength: 4, name: 'American Express' },
    rupay: { pattern: /^6[0-9]/, lengths: [16], cvvLength: 3, name: 'RuPay' },
  };

  detectCardType(number) {
    const cleaned = number.replace(/\s/g, '');
    for (const [type, config] of Object.entries(PaymentCheckout.CARD_PATTERNS)) {
      if (config.pattern.test(cleaned)) return { type, ...config };
    }
    return null;
  }

  // ============================
  // Luhn Algorithm
  // ============================
  luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\s/g, '').split('').reverse().map(Number);
    if (digits.some(isNaN)) return false;

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = digits[i];
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }

  // ============================
  // Formatting
  // ============================
  formatCardNumber(value) {
    const cleaned = value.replace(/\D/g, '');
    const cardType = this.detectCardType(cleaned);

    // Amex: 4-6-5, Others: 4-4-4-4
    if (cardType && cardType.type === 'amex') {
      return cleaned.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(' ')
      ).trim();
    }

    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  formatExpiry(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  }

  formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // ============================
  // Validation
  // ============================
  validate() {
    const errors = {};

    if (this.state.paymentMethod === 'card') {
      const { number, expiry, cvv, name } = this.state.card;
      const cleaned = number.replace(/\s/g, '');
      const cardType = this.detectCardType(cleaned);

      // Card number
      if (!cleaned) {
        errors.number = 'Card number is required';
      } else if (!cardType) {
        errors.number = 'Unrecognized card type';
      } else if (!cardType.lengths.includes(cleaned.length)) {
        errors.number = `Card number must be ${cardType.lengths.join(' or ')} digits`;
      } else if (!this.luhnCheck(cleaned)) {
        errors.number = 'Invalid card number';
      }

      // Expiry
      if (!expiry || expiry.length < 5) {
        errors.expiry = 'Expiry date is required (MM/YY)';
      } else {
        const [mm, yy] = expiry.split('/').map(Number);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear() % 100;
        if (mm < 1 || mm > 12) {
          errors.expiry = 'Invalid month';
        } else if (yy < currentYear || (yy === currentYear && mm < currentMonth)) {
          errors.expiry = 'Card has expired';
        }
      }

      // CVV
      const expectedCvvLen = cardType ? cardType.cvvLength : 3;
      if (!cvv) {
        errors.cvv = 'CVV is required';
      } else if (cvv.length !== expectedCvvLen) {
        errors.cvv = `CVV must be ${expectedCvvLen} digits`;
      }

      // Name
      if (!name.trim()) {
        errors.name = 'Cardholder name is required';
      }
    } else if (this.state.paymentMethod === 'upi') {
      const vpaPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (!this.state.upi.vpa) {
        errors.vpa = 'UPI ID is required';
      } else if (!vpaPattern.test(this.state.upi.vpa)) {
        errors.vpa = 'Invalid UPI ID format (e.g., user@okbank)';
      }
    }

    this.state.errors = errors;
    return Object.keys(errors).length === 0;
  }

  // ============================
  // Render
  // ============================
  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      max-width: 420px; margin: 0 auto; font-family: -apple-system, sans-serif;
      background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      padding: 24px;
    `;

    // Amount display
    const amountEl = this.el('div', {
      style: 'text-align: center; margin-bottom: 24px;',
      innerHTML: `
        <div style="color: #666; font-size: 14px;">Total Amount</div>
        <div style="font-size: 32px; font-weight: 700; color: #2D2D2D;">
          ${this.formatCurrency(this.state.amount || 1499.00, this.state.currency)}
        </div>
      `,
    });
    this.container.appendChild(amountEl);

    // Payment method tabs
    const tabs = this.el('div', {
      style: 'display: flex; gap: 8px; margin-bottom: 20px;',
    });
    ['card', 'upi', 'netbanking'].forEach(method => {
      const tab = this.el('button', {
        textContent: method === 'upi' ? 'UPI' : method.charAt(0).toUpperCase() + method.slice(1),
        style: `
          flex: 1; padding: 10px; border: 2px solid ${this.state.paymentMethod === method ? '#528FF0' : '#E0E0E0'};
          background: ${this.state.paymentMethod === method ? '#EDF2FF' : '#fff'};
          border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;
          color: ${this.state.paymentMethod === method ? '#528FF0' : '#666'};
        `,
      });
      tab.addEventListener('click', () => {
        this.state.paymentMethod = method;
        this.state.errors = {};
        this.render();
      });
      tabs.appendChild(tab);
    });
    this.container.appendChild(tabs);

    // Render payment form based on method
    if (this.state.paymentMethod === 'card') {
      this.renderCardForm();
    } else if (this.state.paymentMethod === 'upi') {
      this.renderUPIForm();
    }

    // Pay button
    const payBtn = this.el('button', {
      textContent: this.state.isSubmitting ? 'Processing...' : `Pay ${this.formatCurrency(1499.00, 'INR')}`,
      style: `
        width: 100%; padding: 14px; background: #528FF0; color: #fff;
        border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
        cursor: pointer; margin-top: 16px;
        opacity: ${this.state.isSubmitting ? '0.7' : '1'};
      `,
    });
    payBtn.disabled = this.state.isSubmitting;
    payBtn.addEventListener('click', () => this.handleSubmit());
    this.container.appendChild(payBtn);
  }

  renderCardForm() {
    // Card number
    this.addField('Card Number', 'number', this.state.card.number, (val) => {
      this.state.card.number = this.formatCardNumber(val);
      this.state.cardType = this.detectCardType(val.replace(/\D/g, ''));
      this.render();
    }, { placeholder: '1234 5678 9012 3456', maxLength: 19, inputMode: 'numeric' });

    // Card type indicator
    if (this.state.cardType) {
      const indicator = this.el('div', {
        textContent: `${this.state.cardType.name} detected`,
        style: 'font-size: 12px; color: #528FF0; margin: -12px 0 12px 0;',
      });
      this.container.appendChild(indicator);
    }

    // Expiry + CVV row
    const row = this.el('div', { style: 'display: flex; gap: 12px;' });

    const expiryGroup = this.createFieldGroup('Expiry', 'expiry', this.state.card.expiry, (val) => {
      this.state.card.expiry = this.formatExpiry(val);
      this.render();
    }, { placeholder: 'MM/YY', maxLength: 5, inputMode: 'numeric' });

    const cvvGroup = this.createFieldGroup('CVV', 'cvv', this.state.card.cvv, (val) => {
      this.state.card.cvv = val.replace(/\D/g, '');
      this.render();
    }, {
      placeholder: this.state.cardType?.cvvLength === 4 ? '1234' : '123',
      maxLength: this.state.cardType?.cvvLength || 3,
      inputMode: 'numeric',
      type: 'password',
    });

    row.appendChild(expiryGroup);
    row.appendChild(cvvGroup);
    this.container.appendChild(row);

    // Name
    this.addField('Cardholder Name', 'name', this.state.card.name, (val) => {
      this.state.card.name = val;
    }, { placeholder: 'John Doe' });
  }

  renderUPIForm() {
    this.addField('UPI ID', 'vpa', this.state.upi.vpa, (val) => {
      this.state.upi.vpa = val;
    }, { placeholder: 'yourname@okbank' });
  }

  addField(label, errorKey, value, onChange, attrs = {}) {
    const group = this.createFieldGroup(label, errorKey, value, onChange, attrs);
    this.container.appendChild(group);
  }

  createFieldGroup(label, errorKey, value, onChange, attrs = {}) {
    const group = this.el('div', { style: 'margin-bottom: 16px; flex: 1;' });
    const labelEl = this.el('label', {
      textContent: label,
      style: 'display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 4px;',
    });
    const error = this.state.errors[errorKey];
    const input = this.el('input', {
      value: value,
      type: attrs.type || 'text',
      placeholder: attrs.placeholder || '',
      maxLength: attrs.maxLength || 100,
      inputMode: attrs.inputMode || 'text',
      style: `
        width: 100%; padding: 10px 12px; border: 1.5px solid ${error ? '#E74C3C' : '#E0E0E0'};
        border-radius: 6px; font-size: 15px; outline: none;
        box-sizing: border-box;
      `,
    });
    input.addEventListener('input', (e) => onChange(e.target.value));
    input.addEventListener('blur', () => { this.validate(); this.render(); });

    group.appendChild(labelEl);
    group.appendChild(input);

    if (error) {
      const errEl = this.el('div', {
        textContent: error,
        style: 'color: #E74C3C; font-size: 12px; margin-top: 4px;',
      });
      group.appendChild(errEl);
    }

    return group;
  }

  handleSubmit() {
    if (!this.validate()) {
      this.render();
      return;
    }
    this.state.isSubmitting = true;
    this.render();
    // Simulate API call
    setTimeout(() => {
      this.state.isSubmitting = false;
      alert('Payment successful!');
      this.render();
    }, 2000);
  }

  el(tag, props = {}) {
    const element = document.createElement(tag);
    Object.entries(props).forEach(([key, val]) => {
      if (key === 'style') element.style.cssText = val;
      else if (key === 'innerHTML') element.innerHTML = val;
      else element[key] = val;
    });
    return element;
  }
}

// Usage
const checkout = new PaymentCheckout(document.getElementById('checkout'));
```

## Round 2: Technical — JavaScript Deep Dive
**Duration:** 60 minutes

### Topics Discussed
- Event loop: microtask vs macrotask ordering
- Closures and memory leaks in payment forms
- Prototype chain and `this` binding in class methods
- Promise.allSettled for parallel payment validations

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design the Frontend for Razorpay Dashboard**
   - Real-time transaction feed (WebSocket)
   - Analytics charts with date range filters
   - Multi-merchant support with role-based access

## Round 4: Hiring Manager
**Duration:** 30 minutes

## 🎯 Key Takeaways
- Razorpay machine coding tests **payment-domain knowledge** — Luhn, card detection, formatting
- **Real-time validation** with visual feedback is expected (not just on submit)
- UPI ID validation regex is a common fintech interview pattern
- Card type detection by BIN prefix is a must-know
- `Intl.NumberFormat` for currency formatting shows production awareness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Luhn, Card Detection, Form Validation |
| JS Deep Dive | Medium | Event Loop, Closures, Promises |
| Frontend Architecture | Hard | WebSocket, Analytics, RBAC |
| Hiring Manager | Easy | Behavioral |
