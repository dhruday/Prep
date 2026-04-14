# Salesforce — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Frontend Engineer |
| **Level** | MTS |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Salesforce-Interview-Questions-E11159.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Technical 1 + Technical 2 + HM)

---

## Round 2: Technical — Implement a Schema-Driven Form Engine (LWC-Style)

### Challenge: Build a form engine that takes a JSON schema and renders a dynamic form with validation, conditional visibility, and field dependencies.

```javascript
/**
 * Schema-Driven Form Engine:
 * - JSON schema → dynamic form fields
 * - Field types: text, number, email, select, checkbox, date, textarea
 * - Validation rules: required, min, max, pattern, custom
 * - Conditional visibility: show field X only when field Y = value
 * - Field dependencies: change in A auto-fills B
 * - Error summary and inline errors
 * - Submit handler with validated data
 */
class FormEngine {
  constructor(container, schema, options = {}) {
    this.container = container;
    this.schema = schema; // { fields: [...], title, submitLabel }
    this.onSubmit = options.onSubmit || (() => {});
    
    // Initialize form values from defaults
    this.values = {};
    this.errors = {};
    this.touched = {};
    this.submitted = false;
    
    for (const field of schema.fields) {
      this.values[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    }
    
    this.render();
  }
  
  /**
   * Check if a field should be visible based on conditional rules.
   * condition: { field: 'otherField', operator: 'eq|neq|in|gt|lt', value: ... }
   */
  isVisible(field) {
    if (!field.condition) return true;
    
    const { field: depField, operator, value } = field.condition;
    const depValue = this.values[depField];
    
    switch (operator) {
      case 'eq': return depValue === value;
      case 'neq': return depValue !== value;
      case 'in': return Array.isArray(value) && value.includes(depValue);
      case 'gt': return Number(depValue) > Number(value);
      case 'lt': return Number(depValue) < Number(value);
      case 'contains': return String(depValue).includes(String(value));
      case 'truthy': return !!depValue;
      case 'falsy': return !depValue;
      default: return true;
    }
  }
  
  /**
   * Validate a single field. Returns error message or null.
   */
  validateField(field) {
    if (!this.isVisible(field)) return null; // Hidden fields skip validation
    
    const value = this.values[field.name];
    const rules = field.validation || {};
    
    if (rules.required && (value === '' || value === null || value === undefined)) {
      return rules.requiredMessage || `${field.label} is required`;
    }
    
    if (value === '' || value === null) return null; // Optional + empty = valid
    
    if (rules.minLength && String(value).length < rules.minLength) {
      return `Minimum ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && String(value).length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters`;
    }
    
    if (rules.min !== undefined && Number(value) < rules.min) {
      return `Minimum value is ${rules.min}`;
    }
    
    if (rules.max !== undefined && Number(value) > rules.max) {
      return `Maximum value is ${rules.max}`;
    }
    
    if (rules.pattern && !new RegExp(rules.pattern).test(String(value))) {
      return rules.patternMessage || 'Invalid format';
    }
    
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return 'Invalid email address';
      }
    }
    
    if (rules.custom) {
      return rules.custom(value, this.values);
    }
    
    return null;
  }
  
  /**
   * Validate all fields. Returns true if all valid.
   */
  validateAll() {
    this.errors = {};
    let valid = true;
    
    for (const field of this.schema.fields) {
      const error = this.validateField(field);
      if (error) {
        this.errors[field.name] = error;
        valid = false;
      }
    }
    
    return valid;
  }
  
  /**
   * Handle field change. Apply dependencies and validate.
   */
  handleChange(fieldName, value) {
    this.values[fieldName] = value;
    this.touched[fieldName] = true;
    
    // Apply field dependencies
    const field = this.schema.fields.find(f => f.name === fieldName);
    if (field?.dependencies) {
      for (const dep of field.dependencies) {
        // dep: { target: 'fieldName', transform: (value, allValues) => newValue }
        this.values[dep.target] = dep.transform(value, this.values);
      }
    }
    
    // Validate on change if already submitted or touched
    if (this.submitted || this.touched[fieldName]) {
      const error = this.validateField(field);
      if (error) {
        this.errors[fieldName] = error;
      } else {
        delete this.errors[fieldName];
      }
    }
    
    this.render();
  }
  
  handleSubmit() {
    this.submitted = true;
    
    if (this.validateAll()) {
      // Collect only visible field values
      const data = {};
      for (const field of this.schema.fields) {
        if (this.isVisible(field)) {
          data[field.name] = this.values[field.name];
        }
      }
      this.onSubmit(data);
    } else {
      this.render();
      // Focus first error field
      const firstError = Object.keys(this.errors)[0];
      if (firstError) {
        this.container.querySelector(`[name="${firstError}"]`)?.focus();
      }
    }
  }
  
  render() {
    const errorCount = Object.keys(this.errors).length;
    
    this.container.innerHTML = `
      <form class="form-engine" novalidate
            style="font-family:-apple-system,sans-serif; max-width:600px; margin:0 auto; padding:24px">
        
        ${this.schema.title ? `<h2 style="margin:0 0 24px">${this.sanitize(this.schema.title)}</h2>` : ''}
        
        <!-- Error Summary -->
        ${this.submitted && errorCount > 0 ? `
          <div role="alert" style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px; margin-bottom:16px">
            <strong style="color:#dc2626">${errorCount} error(s) found:</strong>
            <ul style="margin:8px 0 0; padding-left:20px; color:#dc2626; font-size:13px">
              ${Object.entries(this.errors).map(([name, msg]) => {
                const field = this.schema.fields.find(f => f.name === name);
                return `<li><a href="#field-${name}" style="color:#dc2626">${this.sanitize(field?.label || name)}: ${this.sanitize(msg)}</a></li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}
        
        <!-- Fields -->
        ${this.schema.fields.map(field => {
          if (!this.isVisible(field)) return '';
          
          const error = this.errors[field.name];
          const hasError = !!error;
          const describedBy = hasError ? `error-${field.name}` : undefined;
          
          return `
            <div class="form-field" id="field-${field.name}" style="margin-bottom:16px">
              ${field.type !== 'checkbox' ? `
                <label for="input-${field.name}" style="display:block; margin-bottom:4px; font-weight:500; font-size:14px">
                  ${this.sanitize(field.label)}
                  ${field.validation?.required ? '<span style="color:#dc2626">*</span>' : ''}
                </label>
              ` : ''}
              
              ${field.helpText ? `<p style="font-size:12px; color:#6b7280; margin:0 0 4px">${this.sanitize(field.helpText)}</p>` : ''}
              
              ${this.renderInput(field, hasError, describedBy)}
              
              ${hasError ? `
                <p id="error-${field.name}" role="alert" style="color:#dc2626; font-size:12px; margin:4px 0 0">
                  ${this.sanitize(error)}
                </p>
              ` : ''}
            </div>
          `;
        }).join('')}
        
        <button type="submit" style="padding:12px 32px; background:#3b82f6; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:15px; font-weight:600; margin-top:8px">
          ${this.sanitize(this.schema.submitLabel || 'Submit')}
        </button>
      </form>
    `;
    
    this.attachListeners();
  }
  
  renderInput(field, hasError, describedBy) {
    const value = this.values[field.name];
    const borderColor = hasError ? '#dc2626' : '#d1d5db';
    const style = `width:100%; padding:8px 12px; border:1px solid ${borderColor}; border-radius:6px; font-size:14px; box-sizing:border-box`;
    const ariaAttrs = `name="${field.name}" id="input-${field.name}" ${describedBy ? `aria-describedby="${describedBy}"` : ''} aria-invalid="${hasError}"`;
    
    switch (field.type) {
      case 'select':
        return `
          <select ${ariaAttrs} style="${style}" data-field="${field.name}">
            <option value="">-- Select --</option>
            ${(field.options || []).map(opt => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return `<option value="${optValue}" ${value === optValue ? 'selected' : ''}>${this.sanitize(optLabel)}</option>`;
            }).join('')}
          </select>
        `;
      
      case 'checkbox':
        return `
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
            <input type="checkbox" ${ariaAttrs} ${value ? 'checked' : ''} data-field="${field.name}"
                   style="width:16px; height:16px">
            <span style="font-size:14px">${this.sanitize(field.label)}</span>
            ${field.validation?.required ? '<span style="color:#dc2626">*</span>' : ''}
          </label>
        `;
      
      case 'textarea':
        return `<textarea ${ariaAttrs} style="${style}; min-height:80px; resize:vertical" data-field="${field.name}"
                  placeholder="${this.sanitize(field.placeholder || '')}">${this.sanitize(String(value))}</textarea>`;
      
      default: // text, number, email, date, tel
        return `<input type="${field.type || 'text'}" ${ariaAttrs} value="${this.sanitize(String(value))}" 
                  data-field="${field.name}" style="${style}" 
                  placeholder="${this.sanitize(field.placeholder || '')}"
                  ${field.validation?.min !== undefined ? `min="${field.validation.min}"` : ''}
                  ${field.validation?.max !== undefined ? `max="${field.validation.max}"` : ''}>`;
    }
  }
  
  attachListeners() {
    // Input/change handlers
    this.container.querySelectorAll('input, select, textarea').forEach(el => {
      const fieldName = el.dataset.field;
      if (!fieldName) return;
      
      const eventType = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(eventType, () => {
        const val = el.type === 'checkbox' ? el.checked : 
                    el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : 
                    el.value;
        this.handleChange(fieldName, val);
      });
    });
    
    // Submit
    this.container.querySelector('form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}

// ==========  Usage Example ==========
const schema = {
  title: 'New Lead Form',
  submitLabel: 'Create Lead',
  fields: [
    { name: 'firstName', label: 'First Name', type: 'text', 
      validation: { required: true, minLength: 2 } },
    { name: 'lastName', label: 'Last Name', type: 'text', 
      validation: { required: true } },
    { name: 'email', label: 'Email', type: 'email', 
      validation: { required: true } },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'industry', label: 'Industry', type: 'select',
      options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Other'] },
    { name: 'otherIndustry', label: 'Specify Industry', type: 'text',
      condition: { field: 'industry', operator: 'eq', value: 'Other' },
      validation: { required: true } },
    { name: 'revenue', label: 'Annual Revenue', type: 'number',
      validation: { min: 0 },
      dependencies: [
        { target: 'leadScore', transform: (val) => val > 1000000 ? 'Hot' : val > 100000 ? 'Warm' : 'Cold' }
      ] },
    { name: 'leadScore', label: 'Lead Score', type: 'text', 
      helpText: 'Auto-calculated based on revenue' },
    { name: 'terms', label: 'I agree to the terms', type: 'checkbox',
      validation: { required: true, requiredMessage: 'You must agree to terms' } },
  ]
};

new FormEngine(document.getElementById('app'), schema, {
  onSubmit: (data) => console.log('Submitted:', data)
});
```

---

## 🎯 Key Takeaways
- Salesforce FE = **Schema-driven form engine with conditional visibility, dependencies, validation**
- **Conditional visibility**: `{ field, operator, value }` — supports eq/neq/in/gt/lt/truthy/falsy
- **Field dependencies**: `dependencies: [{ target, transform }]` — change in revenue auto-fills leadScore
- **Validation pipeline**: required → minLength → maxLength → min/max → pattern → email regex → custom function
- **Error summary**: WCAG pattern — error count banner + linked list jumping to error fields
- **aria-invalid + aria-describedby**: error ID links input to error message — screen reader announces errors
- **Hidden fields skip validation**: `if (!isVisible(field)) return null` — prevents invalid form when conditional fields hidden
- **Only submit visible values**: filters out hidden conditional fields from submitted data
- Salesforce = **CRM / form-heavy enterprise** — schema-driven UIs, Lightning Web Components, admin-configurable

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Technical 1 | Hard | Schema-Driven Forms, Validation |
| Technical 2 | Hard | LWC, Performance, A11y |
| HM | Medium | Culture Fit |
