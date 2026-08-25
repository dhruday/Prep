# Intuit — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior (IC3) |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Tax Form Wizard with Validation

### Problem
Build a multi-step tax form wizard with:
1. Step indicator showing current/completed/pending steps
2. Each step has form fields with inline validation
3. Back/Next with field-level and step-level validation
4. Summary review step with edit-in-place
5. Progress auto-save to sessionStorage
6. Accessible: keyboard navigation, ARIA attributes, focus management

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Tax Form Wizard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; }

.wizard { width: 680px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }

/* Step Indicator */
.step-indicator { display: flex; background: #f8f9fa; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
.step { flex: 1; display: flex; align-items: center; gap: 8px; position: relative; }
.step::after { content: ''; flex: 1; height: 2px; background: #d1d5db; margin: 0 12px; }
.step:last-child::after { display: none; }
.step.completed::after { background: #10b981; }
.step-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; border: 2px solid #d1d5db; color: #6b7280; background: #fff; flex-shrink: 0; transition: all 0.2s; }
.step.active .step-circle { border-color: #365ebf; background: #365ebf; color: #fff; }
.step.completed .step-circle { border-color: #10b981; background: #10b981; color: #fff; }
.step-label { font-size: 13px; color: #6b7280; white-space: nowrap; }
.step.active .step-label { color: #365ebf; font-weight: 600; }
.step.completed .step-label { color: #10b981; }

/* Form Content */
.form-content { padding: 32px; min-height: 380px; }
.step-title { font-size: 20px; font-weight: 600; color: #1f2937; margin-bottom: 20px; }
.field-group { margin-bottom: 18px; }
.field-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.field-group input, .field-group select { width: 100%; padding: 10px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.15s; }
.field-group input:focus, .field-group select:focus { border-color: #365ebf; box-shadow: 0 0 0 3px rgba(54,94,191,0.1); }
.field-group.error input, .field-group.error select { border-color: #ef4444; }
.error-msg { color: #ef4444; font-size: 12px; margin-top: 4px; display: none; }
.field-group.error .error-msg { display: block; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* Summary */
.summary-section { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; }
.summary-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; }
.summary-header h3 { font-size: 15px; color: #374151; }
.edit-btn { background: none; border: none; color: #365ebf; font-size: 13px; cursor: pointer; }
.edit-btn:hover { text-decoration: underline; }
.summary-body { padding: 12px 14px; }
.summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
.summary-row span:first-child { color: #6b7280; }
.summary-row span:last-child { color: #1f2937; font-weight: 500; }

/* Actions */
.form-actions { display: flex; justify-content: space-between; padding: 16px 32px 24px; border-top: 1px solid #f0f0f0; }
.btn { padding: 10px 28px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.btn-back { background: #f3f4f6; color: #374151; }
.btn-back:hover { background: #e5e7eb; }
.btn-next { background: #365ebf; color: #fff; }
.btn-next:hover { background: #2c4fa0; }
.btn-submit { background: #10b981; color: #fff; }
.btn-submit:hover { background: #059669; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-back[style*="hidden"] { visibility: hidden; }

.success-msg { text-align: center; padding: 60px 20px; }
.success-msg h2 { font-size: 24px; color: #10b981; margin-bottom: 8px; }
.success-msg p { color: #6b7280; }
</style>
</head>
<body>
<div class="wizard" role="form" aria-label="Tax Filing Wizard">
  <div class="step-indicator" role="navigation" aria-label="Form steps" id="stepIndicator"></div>
  <div class="form-content" id="formContent" role="main"></div>
  <div class="form-actions" id="formActions"></div>
</div>

<script>
// ============================================================
// STEP DEFINITIONS & VALIDATION RULES
// ============================================================
const STEPS = [
  {
    id: 'personal', title: 'Personal Information', label: 'Personal',
    fields: [
      { name: 'fullName', label: 'Full Name', type: 'text', required: true, pattern: /^[a-zA-Z\s]{2,60}$/, errorMsg: 'Enter a valid name (2-60 letters)' },
      { name: 'pan', label: 'PAN Number', type: 'text', required: true, pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, errorMsg: 'Enter valid PAN (e.g. ABCDE1234F)', maxlength: 10, transform: 'uppercase' },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true, errorMsg: 'Date of birth is required' },
      { name: 'email', label: 'Email', type: 'email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMsg: 'Enter a valid email' },
      { name: 'phone', label: 'Phone', type: 'tel', required: true, pattern: /^\d{10}$/, errorMsg: 'Enter 10-digit phone number', maxlength: 10 }
    ]
  },
  {
    id: 'income', title: 'Income Details', label: 'Income',
    fields: [
      { name: 'employer', label: 'Employer Name', type: 'text', required: true, errorMsg: 'Employer name required' },
      { name: 'salary', label: 'Annual Salary (₹)', type: 'number', required: true, min: 0, errorMsg: 'Enter a valid salary' },
      { name: 'otherIncome', label: 'Other Income (₹)', type: 'number', required: false, min: 0, errorMsg: 'Enter a valid amount' },
      { name: 'filingStatus', label: 'Filing Status', type: 'select', options: ['Select', 'Individual', 'HUF', 'Firm'], required: true, errorMsg: 'Select filing status' }
    ]
  },
  {
    id: 'deductions', title: 'Deductions', label: 'Deductions',
    fields: [
      { name: 'section80C', label: 'Section 80C (Max ₹1,50,000)', type: 'number', required: false, min: 0, max: 150000, errorMsg: 'Max ₹1,50,000' },
      { name: 'section80D', label: 'Section 80D - Medical (Max ₹50,000)', type: 'number', required: false, min: 0, max: 50000, errorMsg: 'Max ₹50,000' },
      { name: 'hra', label: 'HRA Exemption (₹)', type: 'number', required: false, min: 0, errorMsg: 'Enter valid amount' },
      { name: 'homeLoan', label: 'Home Loan Interest (Max ₹2,00,000)', type: 'number', required: false, min: 0, max: 200000, errorMsg: 'Max ₹2,00,000' }
    ]
  },
  { id: 'review', title: 'Review & Submit', label: 'Review', fields: [] }
];

const STORAGE_KEY = 'intuit_tax_wizard';
let currentStep = 0;
let formData = loadData();

function loadData() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveData() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData)); } catch {}
}

// ============================================================
// VALIDATION
// ============================================================
function validateField(field) {
  const value = formData[field.name] ?? '';
  const strVal = String(value).trim();

  if (field.required && !strVal) return field.errorMsg;
  if (!strVal) return null; // Optional empty = ok

  if (field.type === 'select' && strVal === 'Select') return field.errorMsg;
  if (field.pattern && !field.pattern.test(strVal)) return field.errorMsg;
  if (field.type === 'number') {
    const num = parseFloat(strVal);
    if (isNaN(num)) return field.errorMsg;
    if (field.min !== undefined && num < field.min) return field.errorMsg;
    if (field.max !== undefined && num > field.max) return field.errorMsg;
  }
  return null;
}

function validateStep(stepIdx) {
  const step = STEPS[stepIdx];
  let firstError = null;
  step.fields.forEach(field => {
    const err = validateField(field);
    const group = document.querySelector(`[data-field="${field.name}"]`);
    if (!group) return;
    const errEl = group.querySelector('.error-msg');
    if (err) {
      group.classList.add('error');
      errEl.textContent = err;
      if (!firstError) firstError = group.querySelector('input, select');
    } else {
      group.classList.remove('error');
    }
  });
  if (firstError) firstError.focus();
  return !firstError;
}

// ============================================================
// RENDERING
// ============================================================
function render() {
  renderIndicator();
  renderContent();
  renderActions();
}

function renderIndicator() {
  const el = document.getElementById('stepIndicator');
  el.innerHTML = STEPS.map((step, i) => {
    const state = i < currentStep ? 'completed' : i === currentStep ? 'active' : '';
    const ariaLabel = `Step ${i + 1}: ${step.label}${state === 'completed' ? ' (completed)' : state === 'active' ? ' (current)' : ''}`;
    return `
      <div class="step ${state}" aria-label="${ariaLabel}">
        <div class="step-circle" aria-hidden="true">${i < currentStep ? '✓' : i + 1}</div>
        <span class="step-label">${step.label}</span>
      </div>
    `;
  }).join('');
}

function renderContent() {
  const container = document.getElementById('formContent');
  const step = STEPS[currentStep];

  if (step.id === 'review') { renderReview(container); return; }

  let html = `<h2 class="step-title">${step.title}</h2>`;
  step.fields.forEach(field => {
    const val = formData[field.name] ?? '';
    if (field.type === 'select') {
      html += `
        <div class="field-group" data-field="${field.name}">
          <label for="f_${field.name}">${field.label}</label>
          <select id="f_${field.name}" data-name="${field.name}" aria-required="${field.required}">
            ${field.options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
          <div class="error-msg" role="alert"></div>
        </div>`;
    } else {
      html += `
        <div class="field-group" data-field="${field.name}">
          <label for="f_${field.name}">${field.label}</label>
          <input id="f_${field.name}" type="${field.type}" data-name="${field.name}" value="${val}"
            ${field.maxlength ? `maxlength="${field.maxlength}"` : ''}
            ${field.required ? 'aria-required="true"' : ''}>
          <div class="error-msg" role="alert"></div>
        </div>`;
    }
  });
  container.innerHTML = html;

  // Attach listeners
  container.querySelectorAll('input, select').forEach(input => {
    const fieldName = input.dataset.name;
    const fieldDef = step.fields.find(f => f.name === fieldName);

    input.addEventListener('input', () => {
      let val = input.value;
      if (fieldDef.transform === 'uppercase') { val = val.toUpperCase(); input.value = val; }
      formData[fieldName] = val;
      saveData();
      // Clear error on edit
      input.closest('.field-group').classList.remove('error');
    });

    input.addEventListener('change', () => {
      formData[fieldName] = input.value;
      saveData();
    });

    // Validate on blur
    input.addEventListener('blur', () => {
      const err = validateField(fieldDef);
      const group = input.closest('.field-group');
      const errEl = group.querySelector('.error-msg');
      if (err && formData[fieldName]) {
        group.classList.add('error');
        errEl.textContent = err;
      } else {
        group.classList.remove('error');
      }
    });
  });

  // Focus first field
  const first = container.querySelector('input, select');
  if (first) first.focus();
}

function renderReview(container) {
  let html = '<h2 class="step-title">Review & Submit</h2>';
  STEPS.slice(0, -1).forEach((step, i) => {
    html += `<div class="summary-section">
      <div class="summary-header"><h3>${step.title}</h3><button class="edit-btn" data-step="${i}">Edit</button></div>
      <div class="summary-body">
        ${step.fields.map(f => {
          const val = formData[f.name] || '—';
          const display = f.type === 'number' && val !== '—' ? `₹${Number(val).toLocaleString('en-IN')}` : val;
          return `<div class="summary-row"><span>${f.label}</span><span>${display}</span></div>`;
        }).join('')}
      </div>
    </div>`;
  });

  // Tax calculation
  const salary = parseFloat(formData.salary) || 0;
  const other = parseFloat(formData.otherIncome) || 0;
  const gross = salary + other;
  const deductions = (parseFloat(formData.section80C) || 0) + (parseFloat(formData.section80D) || 0) +
    (parseFloat(formData.hra) || 0) + (parseFloat(formData.homeLoan) || 0);
  const taxable = Math.max(0, gross - deductions);

  html += `<div class="summary-section">
    <div class="summary-header"><h3>Tax Estimate</h3></div>
    <div class="summary-body">
      <div class="summary-row"><span>Gross Income</span><span>₹${gross.toLocaleString('en-IN')}</span></div>
      <div class="summary-row"><span>Total Deductions</span><span>₹${deductions.toLocaleString('en-IN')}</span></div>
      <div class="summary-row"><span><strong>Taxable Income</strong></span><span><strong>₹${taxable.toLocaleString('en-IN')}</strong></span></div>
    </div>
  </div>`;

  container.innerHTML = html;

  // Edit buttons
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => { currentStep = parseInt(btn.dataset.step); render(); });
  });
}

function renderActions() {
  const container = document.getElementById('formActions');
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  container.innerHTML = `
    <button class="btn btn-back" ${isFirst ? 'style="visibility:hidden"' : ''} aria-label="Go to previous step">← Back</button>
    ${isLast
      ? '<button class="btn btn-submit" aria-label="Submit tax form">Submit Filing</button>'
      : '<button class="btn btn-next" aria-label="Go to next step">Next →</button>'
    }
  `;

  if (!isFirst) {
    container.querySelector('.btn-back').addEventListener('click', () => { currentStep--; render(); });
  }

  if (isLast) {
    container.querySelector('.btn-submit').addEventListener('click', () => {
      document.querySelector('.wizard').innerHTML = `
        <div class="success-msg">
          <h2>✅ Filing Submitted!</h2>
          <p>Your tax return has been submitted for ${formData.fullName} (PAN: ${formData.pan}).</p>
        </div>
      `;
      sessionStorage.removeItem(STORAGE_KEY);
    });
  } else {
    container.querySelector('.btn-next').addEventListener('click', () => {
      if (validateStep(currentStep)) { currentStep++; render(); }
    });
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
    const nextBtn = document.querySelector('.btn-next');
    if (nextBtn) nextBtn.click();
  }
});

render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Intuit (TurboTax) focuses heavily on **form wizard patterns** — multi-step with validation
- Field-level validation on **blur** + step-level on **Next** — dual validation layers
- PAN number auto-uppercase with transform — real-world input normalization
- **sessionStorage** auto-save prevents data loss on page refresh
- Review step with inline **Edit** buttons that jump to specific step — key UX pattern
- Tax estimate calculation in review gives immediate value preview
- ARIA: `aria-required`, `role="alert"` on errors, focus management on step change
- Step indicator: completed ✓, active highlighted, pending greyed — clear visual progression

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms, Problem Solving |
| Technical 1 | Medium | JavaScript, DOM |
| Technical 2 | Hard | Form Wizard, Validation, State |
| Technical 3 | Hard | Accessibility, Step-based UX |
| Hiring Manager | Medium | Product Thinking, Tax Domain |
