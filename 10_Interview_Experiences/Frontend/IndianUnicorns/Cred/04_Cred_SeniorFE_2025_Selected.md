# Cred — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Cred |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Multi-Step Animated Onboarding Flow** (Cred-style premium UI)
- 3-5 steps with smooth slide/fade transitions
- Step progress indicator (animated bar)
- Form validation per step (inline errors)
- Keyboard navigation (Tab through fields, Enter to advance)
- Motion-reduced: respect `prefers-reduced-motion`
- Persist state across page refresh (sessionStorage)

### 💡 Animated Onboarding Flow

```javascript
class OnboardingFlow {
  constructor(container) {
    this.container = container;
    this.currentStep = 0;
    this.direction = 'forward'; // for slide animation direction
    this.steps = [
      { id: 'personal', title: 'Personal Info', fields: ['name', 'email', 'phone'] },
      { id: 'credit', title: 'Credit Card', fields: ['cardNumber', 'expiry', 'cvv'] },
      { id: 'preferences', title: 'Preferences', fields: ['categories', 'notifications'] },
      { id: 'verify', title: 'Verification', fields: ['otp'] }
    ];
    
    this.formData = this.restoreState() || {};
    this.errors = {};
    this.animating = false;
    
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.render();
  }
  
  render() {
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    
    this.container.innerHTML = `
      <div class="onboarding" role="main" aria-label="Account Setup">
        <!-- Progress Bar -->
        <div class="progress-container" role="progressbar" 
             aria-valuenow="${this.currentStep + 1}" aria-valuemin="1" 
             aria-valuemax="${this.steps.length}"
             aria-label="Step ${this.currentStep + 1} of ${this.steps.length}">
          <div class="progress-bar" style="width: ${progress}%; transition: width ${this.prefersReducedMotion ? '0s' : '0.4s'} ease"></div>
          <div class="step-indicators">
            ${this.steps.map((step, i) => `
              <div class="step-dot ${i < this.currentStep ? 'completed' : ''} ${i === this.currentStep ? 'active' : ''}"
                   aria-label="Step ${i + 1}: ${step.title}">
                ${i < this.currentStep ? '✓' : i + 1}
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Step Content -->
        <div class="steps-viewport" style="overflow: hidden; position: relative">
          <div class="step-panel ${this.prefersReducedMotion ? '' : `slide-${this.direction}`}"
               role="tabpanel" aria-label="${this.steps[this.currentStep].title}">
            <h2>${this.steps[this.currentStep].title}</h2>
            ${this.renderStepContent(this.currentStep)}
          </div>
        </div>
        
        <!-- Navigation -->
        <div class="onboarding-nav">
          ${this.currentStep > 0 
            ? '<button class="btn-back" aria-label="Go to previous step">← Back</button>' 
            : '<div></div>'}
          <button class="btn-next" aria-label="${this.currentStep === this.steps.length - 1 ? 'Complete setup' : 'Go to next step'}">
            ${this.currentStep === this.steps.length - 1 ? 'Complete ✓' : 'Continue →'}
          </button>
        </div>
      </div>
    `;
    
    this.attachListeners();
    
    // Auto-focus first field
    const firstInput = this.container.querySelector('.step-panel input:not([type="checkbox"]), .step-panel select');
    if (firstInput) setTimeout(() => firstInput.focus(), this.prefersReducedMotion ? 0 : 400);
  }
  
  renderStepContent(stepIndex) {
    switch (stepIndex) {
      case 0: return this.renderPersonalStep();
      case 1: return this.renderCreditCardStep();
      case 2: return this.renderPreferencesStep();
      case 3: return this.renderVerifyStep();
      default: return '';
    }
  }
  
  renderPersonalStep() {
    return `
      <div class="form-fields">
        ${this.renderField('name', 'Full Name', 'text', { required: true, minLength: 2 })}
        ${this.renderField('email', 'Email Address', 'email', { required: true })}
        ${this.renderField('phone', 'Phone Number', 'tel', { required: true, pattern: '[0-9]{10}' })}
      </div>
    `;
  }
  
  renderCreditCardStep() {
    return `
      <div class="form-fields">
        ${this.renderField('cardNumber', 'Card Number', 'text', {
          required: true,
          maxLength: 19,
          placeholder: '4111 1111 1111 1111',
          inputmode: 'numeric'
        })}
        <div class="field-row">
          ${this.renderField('expiry', 'Expiry (MM/YY)', 'text', {
            required: true,
            maxLength: 5,
            placeholder: 'MM/YY',
            inputmode: 'numeric'
          })}
          ${this.renderField('cvv', 'CVV', 'password', {
            required: true,
            maxLength: 4,
            placeholder: '•••',
            inputmode: 'numeric'
          })}
        </div>
      </div>
    `;
  }
  
  renderPreferencesStep() {
    const categories = ['Dining', 'Travel', 'Shopping', 'Bills', 'Entertainment'];
    
    return `
      <div class="form-fields">
        <fieldset>
          <legend>Select your spending categories</legend>
          <div class="category-grid">
            ${categories.map(cat => `
              <label class="category-chip ${(this.formData.categories || []).includes(cat) ? 'selected' : ''}">
                <input type="checkbox" name="categories" value="${cat}"
                       ${(this.formData.categories || []).includes(cat) ? 'checked' : ''}>
                ${cat}
              </label>
            `).join('')}
          </div>
        </fieldset>
        
        <label class="toggle-label">
          <input type="checkbox" name="notifications" 
                 ${this.formData.notifications ? 'checked' : ''}>
          <span class="toggle-switch"></span>
          Enable push notifications for rewards
        </label>
      </div>
    `;
  }
  
  renderVerifyStep() {
    return `
      <div class="form-fields verify-step">
        <p>We've sent a 6-digit OTP to ${this._sanitize(this.formData.phone || 'your phone')}</p>
        <div class="otp-input" role="group" aria-label="Enter OTP">
          ${Array.from({ length: 6 }, (_, i) => `
            <input type="text" class="otp-digit" maxlength="1" data-idx="${i}"
                   inputmode="numeric" pattern="[0-9]"
                   aria-label="OTP digit ${i + 1}" autocomplete="one-time-code">
          `).join('')}
        </div>
        <button class="resend-otp" type="button">Resend OTP</button>
        ${this.errors.otp ? `<p class="field-error" role="alert">${this._sanitize(this.errors.otp)}</p>` : ''}
      </div>
    `;
  }
  
  renderField(name, label, type, options = {}) {
    const value = this.formData[name] || '';
    const error = this.errors[name];
    
    return `
      <div class="form-group ${error ? 'has-error' : ''}">
        <label for="field-${name}">${label}${options.required ? ' *' : ''}</label>
        <input type="${type}" id="field-${name}" name="${name}"
               value="${this._sanitize(value)}"
               ${options.required ? 'required aria-required="true"' : ''}
               ${options.minLength ? `minlength="${options.minLength}"` : ''}
               ${options.maxLength ? `maxlength="${options.maxLength}"` : ''}
               ${options.pattern ? `pattern="${options.pattern}"` : ''}
               ${options.placeholder ? `placeholder="${this._sanitize(options.placeholder)}"` : ''}
               ${options.inputmode ? `inputmode="${options.inputmode}"` : ''}
               ${error ? `aria-invalid="true" aria-describedby="error-${name}"` : ''}>
        ${error ? `<p class="field-error" id="error-${name}" role="alert">${this._sanitize(error)}</p>` : ''}
      </div>
    `;
  }
  
  validateStep() {
    this.errors = {};
    const step = this.steps[this.currentStep];
    
    switch (this.currentStep) {
      case 0:
        if (!this.formData.name || this.formData.name.length < 2) this.errors.name = 'Name is required (min 2 chars)';
        if (!this.formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) this.errors.email = 'Valid email is required';
        if (!this.formData.phone || !/^\d{10}$/.test(this.formData.phone)) this.errors.phone = 'Valid 10-digit phone is required';
        break;
        
      case 1:
        const card = (this.formData.cardNumber || '').replace(/\s/g, '');
        if (!card || card.length < 13 || !this.luhnCheck(card)) this.errors.cardNumber = 'Valid card number required';
        if (!this.formData.expiry || !/^\d{2}\/\d{2}$/.test(this.formData.expiry)) this.errors.expiry = 'Valid MM/YY required';
        if (!this.formData.cvv || !/^\d{3,4}$/.test(this.formData.cvv)) this.errors.cvv = 'Valid CVV required';
        break;
        
      case 2:
        // Optional step — no validation needed
        break;
        
      case 3:
        const otp = Array.from(this.container.querySelectorAll('.otp-digit'))
          .map(i => i.value).join('');
        if (otp.length !== 6) this.errors.otp = 'Please enter complete 6-digit OTP';
        break;
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  luhnCheck(cardNumber) {
    let sum = 0;
    let alternate = false;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let n = parseInt(cardNumber[i], 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }
  
  goToStep(stepIndex) {
    if (this.animating) return;
    
    this.direction = stepIndex > this.currentStep ? 'forward' : 'backward';
    this.currentStep = stepIndex;
    this.saveState();
    
    if (this.prefersReducedMotion) {
      this.render();
    } else {
      this.animating = true;
      this.render();
      setTimeout(() => { this.animating = false; }, 400);
    }
  }
  
  saveState() {
    try {
      sessionStorage.setItem('onboarding', JSON.stringify({
        step: this.currentStep,
        formData: this.formData
      }));
    } catch (e) {}
  }
  
  restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('onboarding'));
      if (saved) {
        this.currentStep = saved.step || 0;
        return saved.formData;
      }
    } catch (e) {}
    return null;
  }
  
  collectFormData() {
    const inputs = this.container.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.type === 'checkbox' && input.name === 'categories') {
        if (!this.formData.categories) this.formData.categories = [];
        if (input.checked && !this.formData.categories.includes(input.value)) {
          this.formData.categories.push(input.value);
        } else if (!input.checked) {
          this.formData.categories = this.formData.categories.filter(c => c !== input.value);
        }
      } else if (input.type === 'checkbox') {
        this.formData[input.name] = input.checked;
      } else if (input.name) {
        this.formData[input.name] = input.value;
      }
    });
  }
  
  attachListeners() {
    // Next button
    this.container.querySelector('.btn-next')?.addEventListener('click', () => {
      this.collectFormData();
      
      if (this.validateStep()) {
        if (this.currentStep < this.steps.length - 1) {
          this.goToStep(this.currentStep + 1);
        } else {
          this.complete();
        }
      } else {
        this.render(); // Re-render to show errors
      }
    });
    
    // Back button
    this.container.querySelector('.btn-back')?.addEventListener('click', () => {
      this.collectFormData();
      this.goToStep(this.currentStep - 1);
    });
    
    // OTP auto-advance
    this.container.querySelectorAll('.otp-digit').forEach((input, i, all) => {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value && i < all.length - 1) all[i + 1].focus();
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          all[i - 1].focus();
          all[i - 1].value = '';
        }
      });
      
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        for (let j = 0; j < Math.min(paste.length, all.length - i); j++) {
          all[i + j].value = paste[j];
        }
        all[Math.min(i + paste.length, all.length) - 1].focus();
      });
    });
    
    // Card number formatting (add spaces every 4 digits)
    const cardInput = this.container.querySelector('#field-cardNumber');
    if (cardInput) {
      cardInput.addEventListener('input', () => {
        const raw = cardInput.value.replace(/\D/g, '');
        cardInput.value = raw.replace(/(.{4})/g, '$1 ').trim();
      });
    }
    
    // Expiry formatting (add / after 2 digits)
    const expiryInput = this.container.querySelector('#field-expiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', () => {
        let val = expiryInput.value.replace(/\D/g, '');
        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
        expiryInput.value = val;
      });
    }
    
    // Enter key advances to next step
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.target.matches('textarea')) {
        e.preventDefault();
        this.container.querySelector('.btn-next')?.click();
      }
    });
  }
  
  complete() {
    sessionStorage.removeItem('onboarding');
    this.container.innerHTML = `
      <div class="onboarding-complete" role="status">
        <div class="success-animation">✓</div>
        <h2>Welcome to Cred, ${this._sanitize(this.formData.name)}!</h2>
        <p>Your account is all set up.</p>
      </div>
    `;
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

### CSS Animation (slide transitions):
```css
.step-panel {
  animation-duration: 0.4s;
  animation-fill-mode: forwards;
}
.slide-forward { animation-name: slideInFromRight; }
.slide-backward { animation-name: slideInFromLeft; }

@keyframes slideInFromRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideInFromLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .step-panel { animation: none; }
}
```

---

## 🎯 Key Takeaways
- Cred FE = **Multi-step form + animations + validation + Luhn check + OTP input**
- **prefers-reduced-motion**: respect user preference — disable slide animations, instant transitions
- **Luhn algorithm**: validate credit card number — standard check, easy to implement
- **Card formatting**: add spaces every 4 digits — `replace(/(.{4})/g, '$1 ')`
- **OTP input UX**: auto-advance, backspace goes back, paste distributes digits
- **sessionStorage**: persist form state across refresh (cleared on tab close) — not localStorage
- **Step validation**: validate only current step's fields — don't block on future steps
- Cred FE: **premium UI quality expected** — smooth animations, attention to detail, polished interactions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Multi-Step Form, Animations, Validation |
| Technical | Medium-Hard | JS, React, Performance |
| HM | Medium | Culture Fit |
