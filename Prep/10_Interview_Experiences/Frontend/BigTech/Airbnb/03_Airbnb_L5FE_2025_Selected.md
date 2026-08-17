# Airbnb — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 / IC5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + Frontend Architecture + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Build a Multi-Step Form Wizard with Validation and Auto-Save**
   - N steps with different form fields per step
   - Step-level validation before advancing
   - Auto-save to localStorage every 5 seconds
   - Resume from last saved state on page reload
   - Progress indicator with step status (complete/current/upcoming)

### 💡 Interview-Ready Answer

```javascript
class FormWizard {
  constructor(container, steps) {
    this.container = container;
    this.steps = steps; // [{title, fields: [{name, type, label, required, validate}]}]
    this.currentStep = 0;
    this.formData = {};
    this.stepStatus = new Array(steps.length).fill('upcoming');
    this.autoSaveTimer = null;
    this.storageKey = 'form-wizard-draft';
    this.validationErrors = {};
    this.isDirty = false;

    this.loadDraft();
    this.startAutoSave();
    this.render();
  }

  // ============================
  // Persistence (Auto-Save)
  // ============================
  loadDraft() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const draft = JSON.parse(saved);
        this.formData = draft.formData || {};
        this.currentStep = draft.currentStep || 0;
        // Mark completed steps
        for (let i = 0; i < this.currentStep; i++) {
          this.stepStatus[i] = 'complete';
        }
        this.stepStatus[this.currentStep] = 'current';
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }

  saveDraft() {
    if (!this.isDirty) return;
    try {
      const draft = {
        formData: this.formData,
        currentStep: this.currentStep,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(draft));
      this.isDirty = false;
      this.showSaveIndicator();
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => this.saveDraft(), 5000);
  }

  clearDraft() {
    localStorage.removeItem(this.storageKey);
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
  }

  showSaveIndicator() {
    const indicator = this.container.querySelector('.save-indicator');
    if (indicator) {
      indicator.textContent = 'Draft saved';
      indicator.style.opacity = '1';
      setTimeout(() => indicator.style.opacity = '0', 2000);
    }
  }

  // ============================
  // Validation
  // ============================
  validateStep(stepIndex) {
    const step = this.steps[stepIndex];
    const errors = {};

    step.fields.forEach(field => {
      const value = this.formData[field.name];

      // Required check
      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[field.name] = `${field.label} is required`;
        return;
      }

      // Custom validator
      if (field.validate && value) {
        const error = field.validate(value, this.formData);
        if (error) errors[field.name] = error;
      }

      // Built-in type validations
      if (value && field.type === 'email') {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(value)) errors[field.name] = 'Invalid email';
      }
      if (value && field.type === 'tel') {
        const phoneRe = /^\+?[\d\s-]{10,15}$/;
        if (!phoneRe.test(value)) errors[field.name] = 'Invalid phone number';
      }
    });

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // ============================
  // Navigation
  // ============================
  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      this.render();
      return;
    }

    this.stepStatus[this.currentStep] = 'complete';
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepStatus[this.currentStep] = 'current';
    }
    this.isDirty = true;
    this.saveDraft();
    this.render();
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.stepStatus[this.currentStep] = 'upcoming';
      this.currentStep--;
      this.stepStatus[this.currentStep] = 'current';
      this.validationErrors = {};
      this.render();
    }
  }

  goToStep(index) {
    // Only allow going back or to completed steps
    if (index <= this.currentStep || this.stepStatus[index] === 'complete') {
      this.currentStep = index;
      this.stepStatus[index] = 'current';
      this.validationErrors = {};
      this.render();
    }
  }

  submit() {
    // Validate all steps
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.validateStep(i)) {
        this.currentStep = i;
        this.render();
        return;
      }
    }
    console.log('Form submitted:', this.formData);
    this.clearDraft();
    this.renderSuccess();
  }

  // ============================
  // Render
  // ============================
  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      max-width: 600px; margin: 0 auto; font-family: -apple-system, sans-serif;
      background: #fff; border-radius: 12px; padding: 24px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
    `;

    // Progress indicator
    this.renderProgressBar();

    // Step title
    const step = this.steps[this.currentStep];
    const title = document.createElement('h2');
    title.textContent = step.title;
    title.style.cssText = 'margin: 24px 0 16px; font-size: 22px; color: #222;';
    this.container.appendChild(title);

    // Fields
    step.fields.forEach(field => {
      this.renderField(field);
    });

    // Navigation buttons
    this.renderNavButtons();

    // Save indicator
    const saveIndicator = document.createElement('div');
    saveIndicator.className = 'save-indicator';
    saveIndicator.style.cssText = `
      text-align: center; font-size: 12px; color: #4CAF50;
      margin-top: 8px; opacity: 0; transition: opacity 0.3s;
    `;
    this.container.appendChild(saveIndicator);
  }

  renderProgressBar() {
    const bar = document.createElement('div');
    bar.style.cssText = 'display: flex; justify-content: center; gap: 4px; margin-bottom: 8px;';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Form progress');

    this.steps.forEach((step, i) => {
      const stepEl = document.createElement('button');
      const status = this.stepStatus[i];
      const isCurrent = i === this.currentStep;

      let bgColor = '#E0E0E0'; // upcoming
      if (status === 'complete') bgColor = '#4CAF50';
      if (isCurrent) bgColor = '#2196F3';

      stepEl.style.cssText = `
        display: flex; align-items: center; gap: 6px;
        padding: 8px 12px; border-radius: 20px; border: none;
        cursor: ${i <= this.currentStep ? 'pointer' : 'default'};
        background: ${bgColor}; color: ${status === 'upcoming' ? '#666' : '#fff'};
        font-size: 13px; font-weight: 500; transition: all 0.2s;
      `;
      stepEl.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      stepEl.textContent = `${i + 1}. ${step.title}`;

      if (status === 'complete') {
        stepEl.textContent = `✓ ${step.title}`;
      }

      stepEl.addEventListener('click', () => this.goToStep(i));
      bar.appendChild(stepEl);

      // Connector line
      if (i < this.steps.length - 1) {
        const line = document.createElement('div');
        line.style.cssText = `
          width: 20px; height: 2px; align-self: center;
          background: ${this.stepStatus[i] === 'complete' ? '#4CAF50' : '#E0E0E0'};
        `;
        bar.appendChild(line);
      }
    });

    this.container.appendChild(bar);
  }

  renderField(field) {
    const group = document.createElement('div');
    group.style.cssText = 'margin-bottom: 16px;';

    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    label.style.cssText = 'display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #333;';

    const error = this.validationErrors[field.name];

    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = `Select ${field.label}`;
      input.appendChild(placeholder);
      (field.options || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (this.formData[field.name] === opt) option.selected = true;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
    }

    if (field.type !== 'select') {
      input.value = this.formData[field.name] || '';
    }

    input.style.cssText = `
      width: 100%; padding: 10px 12px; border: 1.5px solid ${error ? '#E74C3C' : '#DDD'};
      border-radius: 8px; font-size: 15px; box-sizing: border-box;
      outline: none; transition: border-color 0.2s;
    `;

    input.addEventListener('input', (e) => {
      this.formData[field.name] = e.target.value;
      this.isDirty = true;
      // Clear error on input
      if (this.validationErrors[field.name]) {
        delete this.validationErrors[field.name];
        this.render();
      }
    });

    group.appendChild(label);
    group.appendChild(input);

    if (error) {
      const errorEl = document.createElement('div');
      errorEl.textContent = error;
      errorEl.style.cssText = 'color: #E74C3C; font-size: 12px; margin-top: 4px;';
      group.appendChild(errorEl);
    }

    this.container.appendChild(group);
  }

  renderNavButtons() {
    const nav = document.createElement('div');
    nav.style.cssText = 'display: flex; justify-content: space-between; margin-top: 24px;';

    if (this.currentStep > 0) {
      const backBtn = this.createButton('← Back', false, () => this.prevStep());
      nav.appendChild(backBtn);
    } else {
      nav.appendChild(document.createElement('div')); // spacer
    }

    const isLast = this.currentStep === this.steps.length - 1;
    const nextBtn = this.createButton(
      isLast ? 'Submit' : 'Next →', true,
      isLast ? () => this.submit() : () => this.nextStep()
    );
    nav.appendChild(nextBtn);

    this.container.appendChild(nav);
  }

  createButton(text, primary, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 24px; border-radius: 8px; font-size: 15px;
      font-weight: 600; cursor: pointer;
      ${primary
        ? 'background: #FF5A5F; color: #fff; border: none;'
        : 'background: #fff; color: #333; border: 1px solid #DDD;'}
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  renderSuccess() {
    this.container.innerHTML = `
      <div style="text-align: center; padding: 48px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <h2 style="color: #222;">Submitted Successfully!</h2>
        <p style="color: #666;">Your information has been saved.</p>
      </div>
    `;
  }

  destroy() {
    this.clearDraft();
    this.container.innerHTML = '';
  }
}

// Usage — Airbnb Listing Creation
const wizard = new FormWizard(document.getElementById('wizard'), [
  {
    title: 'Basic Info',
    fields: [
      { name: 'title', type: 'text', label: 'Listing Title', required: true },
      { name: 'type', type: 'select', label: 'Property Type', required: true,
        options: ['Entire place', 'Private room', 'Shared room'] },
      { name: 'description', type: 'textarea', label: 'Description', required: true },
    ],
  },
  {
    title: 'Location',
    fields: [
      { name: 'address', type: 'text', label: 'Address', required: true },
      { name: 'city', type: 'text', label: 'City', required: true },
      { name: 'zip', type: 'text', label: 'ZIP Code', required: true,
        validate: (val) => /^\d{5,6}$/.test(val) ? null : 'Invalid ZIP' },
    ],
  },
  {
    title: 'Pricing',
    fields: [
      { name: 'price', type: 'number', label: 'Price per Night (₹)', required: true,
        validate: (val) => parseFloat(val) > 0 ? null : 'Price must be positive' },
      { name: 'email', type: 'email', label: 'Contact Email', required: true },
      { name: 'phone', type: 'tel', label: 'Phone Number' },
    ],
  },
]);
```

## Round 2: Frontend Coding 2
**Duration:** 60 minutes

### Questions Asked
1. **Build a Drag-and-Drop File Uploader with Progress**
   - Multiple file drag & drop
   - Individual + overall progress bars
   - Retry failed uploads
   - File type/size validation

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design the Frontend Architecture for Airbnb Experiences Marketplace**
   - Category browsing, search, booking flow
   - Map integration with activity pins
   - Wishlist sync across devices

## Round 4: Cross-Functional
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Airbnb loves **multi-step form** questions — it maps directly to their listing creation flow
- **Auto-save with localStorage** is expected, not a bonus
- Form validation must be field-level (on blur), step-level (on next), and form-level (on submit)
- Progress indicators need proper ARIA for accessibility
- Draft resume on page reload shows production thinking

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Multi-step Form, Validation, Auto-save |
| Frontend Coding 2 | Medium-Hard | DnD File Upload, Progress, Retry |
| Architecture | Hard | Marketplace, Map, Sync |
| Cross-Functional | Medium | Behavioral |
