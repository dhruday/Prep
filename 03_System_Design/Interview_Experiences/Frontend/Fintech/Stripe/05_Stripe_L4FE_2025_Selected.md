# Stripe — L4 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Frontend Engineer |
| **Level** | L4 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Remote (US) |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 4 Onsite: FE Coding + Bug Squash + Integration + Architecture)

---

## Round 2: Frontend Coding — Build a Dynamic Form Builder with Validation Pipeline
**Duration:** 60 minutes

### Challenge: Build a form builder that renders forms from a JSON schema, supports conditional fields, cross-field validation, and async validation (e.g., check username availability).

```javascript
/**
 * Dynamic Form Builder with Validation Pipeline:
 * 
 * Schema-driven:
 * - JSON schema defines fields, types, validators, conditions
 * - Conditional visibility: field X shown only if field Y = value
 * - Validation pipeline: sync validators → async validators → cross-field
 * - Field types: text, email, number, select, checkbox, radio, textarea
 * - Debounced async validation (e.g., API check)
 * - Error summary with field links
 */
class DynamicFormBuilder {
  constructor(container, schema, options = {}) {
    this.container = container;
    this.schema = schema; // { fields: [...], submitUrl, title }
    this.values = {};
    this.errors = {};     // field.name → error message
    this.touched = {};    // field.name → boolean
    this.asyncTimers = {};
    this.isSubmitting = false;
    this.onSubmit = options.onSubmit || (() => {});
    
    // Initialize default values
    for (const field of schema.fields) {
      this.values[field.name] = field.defaultValue ?? '';
    }
    
    this.render();
  }
  
  // ---- Visibility (Conditional Fields) ----
  
  isVisible(field) {
    if (!field.condition) return true;
    
    const { dependsOn, operator, value } = field.condition;
    const depValue = this.values[dependsOn];
    
    switch (operator) {
      case 'eq': return depValue === value;
      case 'neq': return depValue !== value;
      case 'in': return Array.isArray(value) && value.includes(depValue);
      case 'gt': return Number(depValue) > Number(value);
      case 'lt': return Number(depValue) < Number(value);
      case 'truthy': return !!depValue;
      case 'falsy': return !depValue;
      default: return true;
    }
  }
  
  // ---- Validation Pipeline ----
  
  async validateField(field) {
    if (!this.isVisible(field)) {
      delete this.errors[field.name];
      return;
    }
    
    const value = this.values[field.name];
    const validators = field.validators || [];
    
    // Sync validators (run all, report first error)
    for (const validator of validators.filter(v => !v.async)) {
      const error = this.runSyncValidator(validator, value, field);
      if (error) {
        this.errors[field.name] = error;
        return;
      }
    }
    
    // Async validators (debounced)
    const asyncValidators = validators.filter(v => v.async);
    if (asyncValidators.length > 0 && value) {
      for (const validator of asyncValidators) {
        const error = await this.runAsyncValidator(validator, value, field);
        if (error) {
          this.errors[field.name] = error;
          return;
        }
      }
    }
    
    delete this.errors[field.name];
  }
  
  runSyncValidator(validator, value, field) {
    switch (validator.type) {
      case 'required':
        if (!value && value !== 0) return validator.message || `${field.label} is required`;
        break;
      case 'minLength':
        if (String(value).length < validator.value) 
          return validator.message || `Minimum ${validator.value} characters`;
        break;
      case 'maxLength':
        if (String(value).length > validator.value)
          return validator.message || `Maximum ${validator.value} characters`;
        break;
      case 'pattern':
        if (!new RegExp(validator.value).test(value))
          return validator.message || 'Invalid format';
        break;
      case 'min':
        if (Number(value) < validator.value)
          return validator.message || `Minimum value is ${validator.value}`;
        break;
      case 'max':
        if (Number(value) > validator.value)
          return validator.message || `Maximum value is ${validator.value}`;
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return validator.message || 'Invalid email address';
        break;
      case 'match':
        if (value !== this.values[validator.field])
          return validator.message || `Must match ${validator.field}`;
        break;
      case 'custom':
        if (typeof validator.fn === 'function') {
          const result = validator.fn(value, this.values);
          if (result) return result;
        }
        break;
    }
    return null;
  }
  
  async runAsyncValidator(validator, value, field) {
    try {
      // Simulate API call (in real app, this would be fetch())
      if (typeof validator.fn === 'function') {
        return await validator.fn(value, this.values);
      }
    } catch {
      return 'Validation failed';
    }
    return null;
  }
  
  async validateAll() {
    const visibleFields = this.schema.fields.filter(f => this.isVisible(f));
    
    // Mark all as touched
    for (const field of visibleFields) {
      this.touched[field.name] = true;
    }
    
    // Validate all fields
    await Promise.all(visibleFields.map(f => this.validateField(f)));
    
    // Cross-field validation
    if (this.schema.crossValidators) {
      for (const cv of this.schema.crossValidators) {
        const error = cv.fn(this.values);
        if (error) {
          this.errors[cv.field] = error;
        }
      }
    }
    
    return Object.keys(this.errors).length === 0;
  }
  
  // ---- Rendering ----
  
  render() {
    this.container.innerHTML = `
      <style>
        .df-form { font-family:-apple-system,sans-serif; max-width:520px; margin:0 auto; }
        .df-title { font-size:22px; font-weight:700; margin-bottom:20px; }
        .df-field { margin-bottom:16px; }
        .df-label { display:block; font-size:13px; font-weight:600; margin-bottom:4px; color:#374151; }
        .df-required { color:#ef4444; }
        .df-input { width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; box-sizing:border-box; transition:border-color 0.15s; }
        .df-input:focus { border-color:#2563eb; outline:none; box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .df-input.error { border-color:#ef4444; }
        .df-error { font-size:12px; color:#ef4444; margin-top:4px; display:flex; align-items:center; gap:4px; }
        .df-error::before { content:'⚠'; }
        .df-hint { font-size:12px; color:#6b7280; margin-top:2px; }
        .df-submit { width:100%; padding:12px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; }
        .df-submit:disabled { background:#93c5fd; cursor:not-allowed; }
        .df-submit:hover:not(:disabled) { background:#1d4ed8; }
        .df-error-summary { background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px; margin-bottom:16px; }
        .df-error-summary h4 { margin:0 0 8px; font-size:14px; color:#991b1b; }
        .df-error-summary a { color:#dc2626; font-size:13px; text-decoration:underline; cursor:pointer; }
        .df-radio-group, .df-checkbox-group { display:flex; flex-direction:column; gap:6px; }
        .df-radio-item, .df-checkbox-item { display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer; }
        .df-hidden { display:none; }
      </style>
      <form class="df-form" id="dynamic-form" novalidate>
        ${this.schema.title ? `<div class="df-title">${this.esc(this.schema.title)}</div>` : ''}
        <div id="error-summary"></div>
        <div id="form-fields"></div>
        <button type="submit" class="df-submit" id="submit-btn">
          ${this.schema.submitLabel || 'Submit'}
        </button>
      </form>
    `;
    
    this.renderFields();
    
    this.container.querySelector('#dynamic-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  }
  
  renderFields() {
    const fieldsEl = this.container.querySelector('#form-fields');
    if (!fieldsEl) return;
    
    fieldsEl.innerHTML = this.schema.fields.map(field => {
      const visible = this.isVisible(field);
      const error = this.touched[field.name] ? this.errors[field.name] : null;
      const value = this.values[field.name];
      const isRequired = (field.validators || []).some(v => v.type === 'required');
      
      return `
        <div class="df-field ${visible ? '' : 'df-hidden'}" data-field="${field.name}" id="field-${field.name}">
          <label class="df-label" for="input-${field.name}">
            ${this.esc(field.label)}
            ${isRequired ? '<span class="df-required"> *</span>' : ''}
          </label>
          ${this.renderInput(field, value, error)}
          ${error ? `<div class="df-error" role="alert">${this.esc(error)}</div>` : ''}
          ${field.hint ? `<div class="df-hint">${this.esc(field.hint)}</div>` : ''}
        </div>
      `;
    }).join('');
    
    this.attachFieldListeners();
    this.renderErrorSummary();
  }
  
  renderInput(field, value, error) {
    const errorClass = error ? 'error' : '';
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'password':
        return `<input class="df-input ${errorClass}" type="${field.type}" id="input-${field.name}" 
                  name="${field.name}" value="${this.esc(String(value))}" 
                  placeholder="${this.esc(field.placeholder || '')}"
                  aria-describedby="${error ? `error-${field.name}` : ''}"
                  aria-invalid="${error ? 'true' : 'false'}">`;
                  
      case 'textarea':
        return `<textarea class="df-input ${errorClass}" id="input-${field.name}" 
                  name="${field.name}" rows="${field.rows || 4}"
                  placeholder="${this.esc(field.placeholder || '')}"
                  aria-invalid="${error ? 'true' : 'false'}">${this.esc(String(value))}</textarea>`;
                  
      case 'select':
        return `<select class="df-input ${errorClass}" id="input-${field.name}" name="${field.name}"
                  aria-invalid="${error ? 'true' : 'false'}">
                  <option value="">${this.esc(field.placeholder || 'Select...')}</option>
                  ${(field.options || []).map(opt => 
                    `<option value="${this.esc(opt.value)}" ${value === opt.value ? 'selected' : ''}>${this.esc(opt.label)}</option>`
                  ).join('')}
                </select>`;
                
      case 'radio':
        return `<div class="df-radio-group" role="radiogroup" aria-labelledby="label-${field.name}">
          ${(field.options || []).map(opt => `
            <label class="df-radio-item">
              <input type="radio" name="${field.name}" value="${this.esc(opt.value)}" ${value === opt.value ? 'checked' : ''}>
              ${this.esc(opt.label)}
            </label>
          `).join('')}
        </div>`;
        
      case 'checkbox':
        return `<label class="df-checkbox-item">
          <input type="checkbox" id="input-${field.name}" name="${field.name}" ${value ? 'checked' : ''}>
          ${this.esc(field.checkboxLabel || '')}
        </label>`;
        
      default:
        return `<input class="df-input" type="text" id="input-${field.name}" name="${field.name}" value="${this.esc(String(value))}">`;
    }
  }
  
  attachFieldListeners() {
    for (const field of this.schema.fields) {
      const selector = field.type === 'radio' 
        ? `input[name="${field.name}"]` 
        : `#input-${field.name}`;
      
      const elements = this.container.querySelectorAll(selector);
      
      elements.forEach(el => {
        const eventType = ['select', 'checkbox', 'radio'].includes(field.type) ? 'change' : 'input';
        
        el.addEventListener(eventType, () => {
          // Update value
          if (field.type === 'checkbox') {
            this.values[field.name] = el.checked;
          } else {
            this.values[field.name] = el.value;
          }
          
          this.touched[field.name] = true;
          
          // Debounce async validation
          clearTimeout(this.asyncTimers[field.name]);
          this.asyncTimers[field.name] = setTimeout(async () => {
            await this.validateField(field);
            this.renderFields(); // Re-render to show/hide conditional fields + errors
          }, 300);
        });
        
        // Blur validation
        el.addEventListener('blur', async () => {
          this.touched[field.name] = true;
          await this.validateField(field);
          this.renderFields();
        });
      });
    }
  }
  
  renderErrorSummary() {
    const summary = this.container.querySelector('#error-summary');
    if (!summary) return;
    
    const errors = Object.entries(this.errors).filter(([name]) => this.touched[name]);
    
    if (errors.length === 0) {
      summary.innerHTML = '';
      return;
    }
    
    summary.innerHTML = `
      <div class="df-error-summary" role="alert">
        <h4>Please fix ${errors.length} error${errors.length > 1 ? 's' : ''}:</h4>
        ${errors.map(([name, msg]) => {
          const field = this.schema.fields.find(f => f.name === name);
          return `<div><a onclick="document.getElementById('input-${name}')?.focus()">${this.esc(field?.label || name)}: ${this.esc(msg)}</a></div>`;
        }).join('')}
      </div>
    `;
  }
  
  async handleSubmit() {
    if (this.isSubmitting) return;
    
    const valid = await this.validateAll();
    this.renderFields();
    
    if (!valid) {
      // Focus first error field
      const firstError = Object.keys(this.errors)[0];
      if (firstError) {
        this.container.querySelector(`#input-${firstError}`)?.focus();
      }
      return;
    }
    
    // Collect only visible field values
    this.isSubmitting = true;
    const submitBtn = this.container.querySelector('#submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
    
    const data = {};
    for (const field of this.schema.fields) {
      if (this.isVisible(field)) {
        data[field.name] = this.values[field.name];
      }
    }
    
    try {
      await this.onSubmit(data);
    } finally {
      this.isSubmitting = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = this.schema.submitLabel || 'Submit'; }
    }
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- Stripe L4 FE = **Schema-driven form builder with conditional fields and async validation pipeline**
- **Validation pipeline**: sync validators → async validators → cross-field — first error wins per field
- **Conditional visibility**: `field.condition = { dependsOn, operator, value }` — show/hide dynamically
- **Only submit visible values**: fields hidden by conditions → excluded from submit payload
- **Debounced async validation**: 300ms after typing stops — prevents API spam for username checks
- **Error summary with links**: WCAG pattern — linked error list at top, clicking focuses the field
- **`novalidate`**: disables browser validation — we handle all validation ourselves
- **`aria-invalid="true"`**: announced by screen readers when field has error
- Stripe FE = **forms, payment UIs, developer dashboards** — form handling + validation is core

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding (this) | Very Hard | Form Builder, Validation, Accessibility |
| Bug Squash | Hard | Debugging |
| Integration | Hard | API Design |
| Architecture | Very Hard | Frontend System Design |
