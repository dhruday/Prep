# Amazon — SDE-2 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 Frontend |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Shopping |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Bar Raiser)

---

## Round 1: UI Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build an Accessible Multi-Step Wizard/Form** (like Amazon checkout flow)
   - Steps: Address → Payment → Review → Confirm
   - Step indicator (progress bar)
   - Next/Back navigation
   - Validation per step before allowing Next
   - Keyboard accessible, ARIA attributes

### 💡 Multi-Step Wizard

```javascript
class StepWizard {
  constructor(container, steps) {
    this.container = container;
    this.steps = steps; // [{ title, validate, render }]
    this.currentStep = 0;
    this.data = {}; // Accumulated form data across steps
    
    this.render();
  }
  
  render() {
    const step = this.steps[this.currentStep];
    
    this.container.innerHTML = `
      <div class="wizard" role="group" aria-label="Multi-step form">
        <!-- Progress Indicator -->
        <nav class="wizard-progress" aria-label="Progress">
          <ol>
            ${this.steps.map((s, i) => `
              <li class="step-indicator ${i < this.currentStep ? 'completed' : ''} 
                         ${i === this.currentStep ? 'active' : ''}"
                  aria-current="${i === this.currentStep ? 'step' : 'false'}">
                <span class="step-number" aria-hidden="true">${i < this.currentStep ? '✓' : i + 1}</span>
                <span class="step-title">${this._sanitize(s.title)}</span>
              </li>
            `).join('<li class="step-divider" aria-hidden="true"></li>')}
          </ol>
        </nav>
        
        <!-- Step Content -->
        <div class="wizard-content" role="region" 
             aria-label="Step ${this.currentStep + 1} of ${this.steps.length}: ${step.title}">
          <h2>${this._sanitize(step.title)}</h2>
          <div class="step-body" id="step-body"></div>
          
          <div class="wizard-errors" role="alert" aria-live="assertive" id="wizard-errors"></div>
        </div>
        
        <!-- Navigation Buttons -->
        <div class="wizard-nav">
          <button class="btn-back" ${this.currentStep === 0 ? 'disabled' : ''}>
            ← Back
          </button>
          <div class="step-counter">
            Step ${this.currentStep + 1} of ${this.steps.length}
          </div>
          ${this.currentStep < this.steps.length - 1
            ? '<button class="btn-next">Next →</button>'
            : '<button class="btn-submit">Place Order</button>'
          }
        </div>
      </div>
    `;
    
    // Render step content
    const stepBody = this.container.querySelector('#step-body');
    step.render(stepBody, this.data);
    
    this.attachListeners();
    
    // Focus the first form element in the step
    const firstInput = stepBody.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }
  
  attachListeners() {
    const backBtn = this.container.querySelector('.btn-back');
    const nextBtn = this.container.querySelector('.btn-next, .btn-submit');
    
    if (backBtn) backBtn.addEventListener('click', () => this.goBack());
    if (nextBtn) nextBtn.addEventListener('click', () => this.goNext());
    
    // Enter key in form fields → go next
    this.container.querySelector('.step-body').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.goNext();
      }
    });
  }
  
  async goNext() {
    const step = this.steps[this.currentStep];
    const errorsEl = this.container.querySelector('#wizard-errors');
    
    // Collect form data from current step
    const formData = this.collectFormData();
    Object.assign(this.data, formData);
    
    // Validate current step
    const errors = step.validate ? step.validate(this.data) : [];
    
    if (errors.length > 0) {
      errorsEl.innerHTML = errors.map(e => 
        `<div class="error-message">${this._sanitize(e)}</div>`
      ).join('');
      
      // Focus first error field
      const firstErrorField = this.container.querySelector('.field-error, [aria-invalid="true"]');
      if (firstErrorField) firstErrorField.focus();
      return;
    }
    
    errorsEl.innerHTML = '';
    
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.render();
    } else {
      // Final submit
      this.onSubmit(this.data);
    }
  }
  
  goBack() {
    if (this.currentStep > 0) {
      // Save current form data before going back
      Object.assign(this.data, this.collectFormData());
      this.currentStep--;
      this.render();
    }
  }
  
  collectFormData() {
    const data = {};
    this.container.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }
  
  onSubmit(data) {
    console.log('Order submitted:', data);
    this.container.innerHTML = `
      <div class="wizard-success" role="alert">
        <h2>✓ Order Placed Successfully!</h2>
        <p>Thank you for your purchase. Order confirmation will be sent to ${this._sanitize(data.email || '')}</p>
      </div>
    `;
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Usage with Amazon checkout-style steps:
const wizard = new StepWizard(document.getElementById('app'), [
  {
    title: 'Shipping Address',
    validate: (data) => {
      const errors = [];
      if (!data.fullName?.trim()) errors.push('Full name is required');
      if (!data.address?.trim()) errors.push('Address is required');
      if (!data.pincode?.match(/^\d{6}$/)) errors.push('Enter a valid 6-digit pincode');
      if (!data.phone?.match(/^\d{10}$/)) errors.push('Enter a valid 10-digit phone number');
      return errors;
    },
    render: (el, data) => {
      el.innerHTML = `
        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input id="fullName" name="fullName" type="text" value="${data.fullName || ''}" 
                 required aria-required="true" autocomplete="name">
        </div>
        <div class="form-group">
          <label for="address">Address *</label>
          <textarea id="address" name="address" required aria-required="true" 
                    autocomplete="street-address">${data.address || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="pincode">Pincode *</label>
            <input id="pincode" name="pincode" type="text" value="${data.pincode || ''}" 
                   pattern="\\d{6}" required autocomplete="postal-code">
          </div>
          <div class="form-group">
            <label for="phone">Phone *</label>
            <input id="phone" name="phone" type="tel" value="${data.phone || ''}" 
                   pattern="\\d{10}" required autocomplete="tel">
          </div>
        </div>
      `;
    }
  },
  {
    title: 'Payment Method',
    validate: (data) => {
      if (!data.paymentMethod) return ['Please select a payment method'];
      return [];
    },
    render: (el, data) => {
      el.innerHTML = `
        <fieldset>
          <legend>Choose payment method</legend>
          <label class="radio-option">
            <input type="radio" name="paymentMethod" value="upi" 
                   ${data.paymentMethod === 'upi' ? 'checked' : ''}> UPI
          </label>
          <label class="radio-option">
            <input type="radio" name="paymentMethod" value="card"
                   ${data.paymentMethod === 'card' ? 'checked' : ''}> Credit/Debit Card
          </label>
          <label class="radio-option">
            <input type="radio" name="paymentMethod" value="cod"
                   ${data.paymentMethod === 'cod' ? 'checked' : ''}> Cash on Delivery
          </label>
        </fieldset>
      `;
    }
  },
  {
    title: 'Review & Confirm',
    validate: () => [],
    render: (el, data) => {
      el.innerHTML = `
        <div class="review-section">
          <h3>Shipping To:</h3>
          <p>${data.fullName}<br>${data.address}<br>Pin: ${data.pincode}<br>Phone: ${data.phone}</p>
          <h3>Payment:</h3>
          <p>${data.paymentMethod?.toUpperCase()}</p>
        </div>
      `;
    }
  }
]);
```

---

## 🎯 Key Takeaways
- Amazon FE = **Multi-Step Wizard + Accessibility + LP Stories**
- **Progress indicator**: `aria-current="step"` on active step, `✓` for completed steps
- **Validation per step**: block Next until current step is valid, show errors in `aria-live="assertive"` region
- **Data persistence**: `this.data` accumulates across steps — going back preserves earlier entries
- **Enter key handling**: Enter in input fields navigates to next step (not in textarea — allows newlines)
- **Focus management**: auto-focus first input when step renders, focus first error field on validation failure
- **Bar Raiser**: Amazon LP stories needed at every round — prepare "Customer Obsession" and "Dive Deep" stories
- Amazon FE L5: expect accessible, production-quality code with proper form handling

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA + LP |
| UI Coding | Hard | Multi-Step Wizard, Accessibility |
| Technical 2 | Medium-Hard | React Patterns, Performance |
| Bar Raiser | Hard | Leadership Principles |
