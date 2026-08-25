# CRED — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Animated Progress Stepper with Validation

### Problem
Build a multi-step form with animated progress:
- Progress stepper showing numbered steps with connecting lines
- Step-by-step navigation (next/back) with slide animation
- Per-step validation before allowing progress
- Step completion indicators (check marks)
- Allow clicking on completed steps to go back
- Responsive (horizontal on desktop, vertical on mobile)

### 💡 Interview-Ready Answer

```javascript
class AnimatedStepper {
  constructor(container, steps) {
    this.container = container;
    this.steps = steps; // [{ title, validate: (data) => errors, render: (container, data) => void }]
    this.currentStep = 0;
    this.completedSteps = new Set();
    this.formData = {};
    this.direction = 'forward'; // for animation direction

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'stepper-container';
    this.container.style.cssText = 'max-width:600px;margin:0 auto;font-family:system-ui;';

    this.renderProgressBar();
    this.renderStepContent();
    this.renderNavigation();
  }

  renderProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'stepper-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Progress');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:24px;padding:16px 0;';

    this.steps.forEach((step, i) => {
      const isDone = this.completedSteps.has(i);
      const isCurrent = i === this.currentStep;
      const isClickable = isDone || i < this.currentStep;

      // Step circle
      const circle = document.createElement('button');
      circle.className = `step-circle ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`;
      circle.setAttribute('aria-label', `Step ${i + 1}: ${step.title}`);
      circle.setAttribute('aria-current', isCurrent ? 'step' : 'false');
      circle.disabled = !isClickable;
      circle.style.cssText = `
        width:40px;height:40px;border-radius:50%;border:3px solid ${
          isDone ? '#22c55e' : isCurrent ? '#1a73e8' : '#ddd'
        };
        background:${isDone ? '#22c55e' : isCurrent ? '#1a73e8' : '#fff'};
        color:${isDone || isCurrent ? '#fff' : '#999'};
        font-weight:600;font-size:14px;cursor:${isClickable ? 'pointer' : 'default'};
        display:flex;align-items:center;justify-content:center;
        transition:all 0.3s ease;position:relative;flex-shrink:0;
      `;

      if (isDone) {
        circle.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
      } else {
        circle.textContent = i + 1;
      }

      // Pulse animation for current step
      if (isCurrent) {
        circle.style.boxShadow = '0 0 0 4px rgba(26,115,232,0.2)';
      }

      circle.addEventListener('click', () => {
        if (isClickable) this.goToStep(i);
      });

      bar.appendChild(circle);

      // Step title (below circle)
      const titlePopover = document.createElement('div');
      titlePopover.style.cssText = `
        position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);
        font-size:11px;white-space:nowrap;
        color:${isCurrent ? '#1a73e8' : isDone ? '#22c55e' : '#999'};
        font-weight:${isCurrent ? '600' : '400'};
      `;
      titlePopover.textContent = step.title;
      circle.appendChild(titlePopover);

      // Connector line (between steps)
      if (i < this.steps.length - 1) {
        const line = document.createElement('div');
        const lineProgress = isDone ? 100 : (isCurrent ? 50 : 0);
        line.style.cssText = `
          flex:1;height:3px;background:#eee;margin:0 4px;position:relative;
          border-radius:2px;min-width:40px;
        `;
        const fill = document.createElement('div');
        fill.style.cssText = `
          height:100%;background:${isDone ? '#22c55e' : '#1a73e8'};
          border-radius:2px;width:${lineProgress}%;
          transition:width 0.5s ease;
        `;
        line.appendChild(fill);
        bar.appendChild(line);
      }
    });

    this.container.appendChild(bar);
  }

  renderStepContent() {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'overflow:hidden;position:relative;min-height:200px;';

    const content = document.createElement('div');
    content.className = 'step-content';
    content.setAttribute('role', 'tabpanel');
    content.style.cssText = `
      padding:24px;border:1px solid #eee;border-radius:12px;
      animation:${this.direction === 'forward' ? 'slideInRight' : 'slideInLeft'} 0.3s ease;
    `;

    // Inject CSS animations
    if (!document.getElementById('stepper-styles')) {
      const style = document.createElement('style');
      style.id = 'stepper-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // Error display
    this.errorEl = document.createElement('div');
    this.errorEl.className = 'step-errors';
    this.errorEl.setAttribute('role', 'alert');
    this.errorEl.style.cssText = 'display:none;background:#fef2f2;color:#e53e3e;padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px;';
    content.appendChild(this.errorEl);

    // Step title
    const title = document.createElement('h3');
    title.textContent = this.steps[this.currentStep].title;
    title.style.cssText = 'margin:0 0 16px;';
    content.appendChild(title);

    // Render step-specific content
    const stepContainer = document.createElement('div');
    this.steps[this.currentStep].render(stepContainer, this.formData);
    content.appendChild(stepContainer);

    wrapper.appendChild(content);
    this.container.appendChild(wrapper);
  }

  renderNavigation() {
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;justify-content:space-between;margin-top:16px;';

    // Back button
    if (this.currentStep > 0) {
      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.style.cssText = 'padding:12px 24px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:15px;';
      backBtn.addEventListener('click', () => this.prevStep());
      nav.appendChild(backBtn);
    } else {
      nav.appendChild(document.createElement('div'));
    }

    // Next / Submit button
    const isLast = this.currentStep === this.steps.length - 1;
    const nextBtn = document.createElement('button');
    nextBtn.textContent = isLast ? 'Submit ✓' : 'Continue →';
    nextBtn.style.cssText = `
      padding:12px 24px;border:none;border-radius:8px;
      background:${isLast ? '#22c55e' : '#1a73e8'};color:#fff;
      cursor:pointer;font-size:15px;font-weight:600;
    `;
    nextBtn.addEventListener('click', () => {
      if (isLast) this.handleSubmit(nextBtn);
      else this.nextStep();
    });
    nav.appendChild(nextBtn);

    this.container.appendChild(nav);

    // Step counter
    const counter = document.createElement('div');
    counter.style.cssText = 'text-align:center;margin-top:12px;font-size:13px;color:#999;';
    counter.textContent = `Step ${this.currentStep + 1} of ${this.steps.length}`;
    this.container.appendChild(counter);
  }

  nextStep() {
    const step = this.steps[this.currentStep];
    if (step.validate) {
      const errors = step.validate(this.formData);
      if (errors && errors.length > 0) {
        this.showErrors(errors);
        return;
      }
    }

    this.completedSteps.add(this.currentStep);
    this.direction = 'forward';
    this.currentStep++;
    this.render();
  }

  prevStep() {
    this.direction = 'backward';
    this.currentStep--;
    this.render();
  }

  goToStep(index) {
    this.direction = index > this.currentStep ? 'forward' : 'backward';
    this.currentStep = index;
    this.render();
  }

  handleSubmit(btn) {
    const step = this.steps[this.currentStep];
    if (step.validate) {
      const errors = step.validate(this.formData);
      if (errors && errors.length > 0) {
        this.showErrors(errors);
        return;
      }
    }

    this.completedSteps.add(this.currentStep);
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    setTimeout(() => {
      this.container.innerHTML = `
        <div style="text-align:center;padding:48px;">
          <div style="font-size:48px;">🎉</div>
          <h2>All Done!</h2>
          <p style="color:#666;">Form submitted successfully.</p>
        </div>
      `;
    }, 1500);
  }

  showErrors(errors) {
    this.errorEl.style.display = 'block';
    this.errorEl.textContent = errors.join(' • ');
    setTimeout(() => {
      if (this.errorEl) this.errorEl.style.display = 'none';
    }, 4000);
  }
}

// Usage:
// new AnimatedStepper(document.getElementById('app'), [
//   {
//     title: 'Personal Info',
//     render: (container, data) => {
//       container.innerHTML = `
//         <input placeholder="Full Name" value="${data.name || ''}" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
//         <input placeholder="Email" value="${data.email || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
//       `;
//       container.querySelector('input:nth-child(1)').addEventListener('input', e => data.name = e.target.value);
//       container.querySelector('input:nth-child(2)').addEventListener('input', e => data.email = e.target.value);
//     },
//     validate: (data) => {
//       const errors = [];
//       if (!data.name) errors.push('Name is required');
//       if (!data.email?.includes('@')) errors.push('Valid email required');
//       return errors;
//     }
//   },
//   {
//     title: 'Address',
//     render: (container, data) => { container.innerHTML = '<input placeholder="Address">'; },
//     validate: () => []
//   },
//   {
//     title: 'Confirm',
//     render: (container, data) => { container.innerHTML = `<p>Name: ${data.name}</p><p>Email: ${data.email}</p>`; },
//     validate: () => []
//   }
// ]);
```

## 🎯 Key Takeaways
- CRED values **polish and animations** — smooth slide transitions between steps
- SVG checkmark in completed circles is cleaner than Unicode characters
- CSS keyframe animations with direction-awareness (slideInRight vs slideInLeft)
- Per-step validation with error display — prevents skipping incomplete steps
- Completed steps are clickable for navigation, pending steps are disabled
- Connector line fill percentage indicates progress visually

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Hard | Generators, Proxy, WeakRef |
| Machine Coding | Medium | CSS Animations, State Machine, Validation |
| FE System Design | Hard | Multi-step Flow Architecture |
| HM | Medium | Behavioral, Design Taste |
