# Meta — Senior Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Senior Frontend Engineer |
| **Level** | E5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [Blind](https://www.teamblind.com/post/Meta-E5-FE-Interview) |
| **Author** | Anonymous |
| **Team** | Instagram Reels |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + FE System Design + Behavioral)

---

## Round 1: FE Coding — Implement a Reactive Form Library
**Duration:** 45 minutes

### Question: Build a lightweight form library with validation, dirty tracking, and subscription-based reactivity.

```javascript
/**
 * Reactive Form Library (inspired by React Hook Form / Angular Forms):
 * - Define form schema with validators
 * - Subscribe to field changes
 * - Track dirty/touched/pristine state
 * - Async validation support
 * - Submit with validation gate
 * 
 * Key design: Observable pattern for reactivity,
 * no framework dependency (vanilla JS).
 */
class FormControl {
  constructor(initialValue = '', validators = []) {
    this.initialValue = initialValue;
    this.value = initialValue;
    this.validators = validators;
    this.errors = [];
    this.touched = false;
    this.dirty = false;
    this._subscribers = new Set();
    this._statusSubscribers = new Set();
  }
  
  setValue(value) {
    this.value = value;
    this.dirty = value !== this.initialValue;
    this.validate();
    this._notify();
  }
  
  markTouched() {
    if (!this.touched) {
      this.touched = true;
      this._notifyStatus();
    }
  }
  
  reset() {
    this.value = this.initialValue;
    this.dirty = false;
    this.touched = false;
    this.errors = [];
    this._notify();
    this._notifyStatus();
  }
  
  validate() {
    this.errors = [];
    for (const validator of this.validators) {
      const error = validator(this.value);
      if (error) this.errors.push(error);
    }
    this._notifyStatus();
    return this.errors.length === 0;
  }
  
  get valid() { return this.errors.length === 0; }
  get invalid() { return !this.valid; }
  get pristine() { return !this.dirty; }
  
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }
  
  subscribeStatus(fn) {
    this._statusSubscribers.add(fn);
    return () => this._statusSubscribers.delete(fn);
  }
  
  _notify() {
    for (const fn of this._subscribers) fn(this.value);
  }
  
  _notifyStatus() {
    for (const fn of this._statusSubscribers) {
      fn({ valid: this.valid, dirty: this.dirty, touched: this.touched, errors: this.errors });
    }
  }
}

class FormGroup {
  constructor(controls = {}) {
    this.controls = controls; // { fieldName: FormControl }
    this._subscribers = new Set();
    
    // Subscribe to each control's changes to propagate
    for (const [name, control] of Object.entries(controls)) {
      control.subscribe(() => this._notify());
    }
  }
  
  get value() {
    const result = {};
    for (const [name, control] of Object.entries(this.controls)) {
      result[name] = control.value;
    }
    return result;
  }
  
  get valid() {
    return Object.values(this.controls).every(c => c.valid);
  }
  
  get dirty() {
    return Object.values(this.controls).some(c => c.dirty);
  }
  
  get errors() {
    const errors = {};
    for (const [name, control] of Object.entries(this.controls)) {
      if (control.errors.length > 0) {
        errors[name] = control.errors;
      }
    }
    return errors;
  }
  
  validate() {
    let allValid = true;
    for (const control of Object.values(this.controls)) {
      if (!control.validate()) allValid = false;
    }
    return allValid;
  }
  
  reset() {
    for (const control of Object.values(this.controls)) {
      control.reset();
    }
  }
  
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }
  
  _notify() {
    for (const fn of this._subscribers) fn(this.value);
  }
}

// Built-in validators
const Validators = {
  required: (msg = 'Required') => (value) => 
    (value === '' || value == null) ? msg : null,
  
  minLength: (min, msg) => (value) =>
    (typeof value === 'string' && value.length < min) ? (msg || `Min ${min} characters`) : null,
  
  maxLength: (max, msg) => (value) =>
    (typeof value === 'string' && value.length > max) ? (msg || `Max ${max} characters`) : null,
  
  pattern: (regex, msg = 'Invalid format') => (value) =>
    (typeof value === 'string' && !regex.test(value)) ? msg : null,
  
  email: (msg = 'Invalid email') => (value) =>
    (typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ? msg : null,
    
  min: (minVal, msg) => (value) =>
    (Number(value) < minVal) ? (msg || `Min value ${minVal}`) : null,
  
  // Async validator wrapper
  async: (asyncFn) => {
    const validator = (value) => {
      // Return a promise instead of string
      // FormControl needs async validate support
      return asyncFn(value);
    };
    validator._isAsync = true;
    return validator;
  }
};

// Usage:
const form = new FormGroup({
  email: new FormControl('', [
    Validators.required(), 
    Validators.email()
  ]),
  password: new FormControl('', [
    Validators.required(),
    Validators.minLength(8),
    Validators.pattern(/(?=.*[A-Z])(?=.*[0-9])/, 'Must contain uppercase and number')
  ]),
  confirmPassword: new FormControl('', [Validators.required()])
});

// Cross-field validator (passwords match)
const crossFieldValidator = () => {
  const pwd = form.controls.password.value;
  const confirm = form.controls.confirmPassword.value;
  if (pwd && confirm && pwd !== confirm) {
    form.controls.confirmPassword.errors.push('Passwords must match');
  }
};

// Subscribe to form changes
form.subscribe((values) => {
  console.log('Form values:', values);
  crossFieldValidator();
});

// Connect to DOM
document.querySelector('#email').addEventListener('input', (e) => {
  form.controls.email.setValue(e.target.value);
});
document.querySelector('#email').addEventListener('blur', () => {
  form.controls.email.markTouched();
});

// Submit
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.validate()) {
    console.log('Submit:', form.value);
  } else {
    console.log('Errors:', form.errors);
  }
});
```

---

## 🎯 Key Takeaways
- Meta E5 FE = **Reactive form library with validation + dirty tracking + observable pattern**
- **FormControl**: smallest unit — value, validators, dirty/touched/pristine state, subscriber pattern
- **FormGroup**: composed of FormControls — aggregates value/validity, propagates changes
- **Validator pattern**: function that takes value → returns error string or null — composable
- **Dirty/Touched/Pristine**: dirty = value changed, touched = field blurred, pristine = not dirty
- **Cross-field validation**: compare multiple controls — e.g., password === confirmPassword
- **Observable subscription**: `subscribe(fn)` returns unsubscribe function — prevents memory leaks
- Meta FE = **framework internals knowledge** — build your own form library, state management, etc.

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Coding |
| Coding 1 | Hard | Reactive Pattern, Form Library |
| Coding 2 | Medium-Hard | DSA + JS |
| FE System Design | Very Hard | Instagram Reels Architecture |
| Behavioral | Medium | Meta values |
