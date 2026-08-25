# Apple — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Frontend Engineer |
| **Level** | ICT3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | System design round — didn't address offline-first requirements strongly enough |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite loops)

---

## Round 1: JavaScript Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Implement `Promise.allSettled` from scratch**
2. **Follow-up: Implement `Promise.any` from scratch**

### 💡 Promise.allSettled

```javascript
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    const results = [];
    let settled = 0;
    const promiseArray = Array.from(promises);
    
    if (promiseArray.length === 0) {
      resolve([]);
      return;
    }
    
    promiseArray.forEach((promise, index) => {
      Promise.resolve(promise) // Handle non-promise values
        .then(
          (value) => {
            results[index] = { status: 'fulfilled', value };
          },
          (reason) => {
            results[index] = { status: 'rejected', reason };
          }
        )
        .finally(() => {
          settled++;
          if (settled === promiseArray.length) {
            resolve(results);
          }
        });
    });
  });
}

// Promise.any: resolves with the first fulfilled, rejects if ALL reject
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejectedCount = 0;
    const promiseArray = Array.from(promises);
    
    if (promiseArray.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }
    
    promiseArray.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => resolve(value), // First fulfilled wins
        (error) => {
          errors[index] = error;
          rejectedCount++;
          if (rejectedCount === promiseArray.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
}

// Tests:
promiseAllSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
]).then(console.log);
// [{status:'fulfilled',value:1}, {status:'rejected',reason:'error'}, {status:'fulfilled',value:3}]

promiseAny([
  Promise.reject('a'),
  new Promise(r => setTimeout(() => r('first!'), 100)),
  new Promise(r => setTimeout(() => r('second'), 200))
]).then(console.log); // 'first!'
```

---

## Round 2: Machine Coding
**Duration:** 60 minutes

### Challenge
**Build an Accessible Date Picker Component** (from scratch, no libraries)
- Month navigation (prev/next)
- Keyboard accessible (arrow keys to navigate, Enter to select)
- ARIA roles: grid, gridcell, dialog
- Min/max date range constraint
- Highlight today, selected date
- Mobile touch-friendly

### 💡 Accessible Date Picker

```javascript
class DatePicker {
  constructor(container, options = {}) {
    this.container = container;
    this.selectedDate = options.initialDate || new Date();
    this.viewDate = new Date(this.selectedDate); // Current month view
    this.minDate = options.minDate || null;
    this.maxDate = options.maxDate || null;
    this.focusedDate = new Date(this.selectedDate);
    this.onSelect = options.onSelect || (() => {});
    
    this.render();
    this.attachKeyboardHandlers();
  }
  
  render() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // First day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    
    this.container.innerHTML = `
      <div class="datepicker" role="dialog" aria-label="Choose date" aria-modal="true">
        <div class="dp-header">
          <button class="dp-prev" aria-label="Previous month">&larr;</button>
          <div class="dp-title" aria-live="polite" id="dp-month-label">
            ${monthNames[month]} ${year}
          </div>
          <button class="dp-next" aria-label="Next month">&rarr;</button>
        </div>
        <table role="grid" aria-labelledby="dp-month-label">
          <thead>
            <tr>${['Su','Mo','Tu','We','Th','Fr','Sa']
              .map(d => `<th scope="col" abbr="${d}">${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${this._renderDays(year, month, firstDay, daysInMonth, today)}</tbody>
        </table>
      </div>
    `;
    
    // Event delegation
    this.container.querySelector('.dp-prev').addEventListener('click', () => this.navigate(-1));
    this.container.querySelector('.dp-next').addEventListener('click', () => this.navigate(1));
    
    this.container.querySelector('tbody').addEventListener('click', (e) => {
      const cell = e.target.closest('[data-date]');
      if (cell && !cell.hasAttribute('aria-disabled')) {
        this.selectDate(new Date(cell.dataset.date));
      }
    });
    
    // Focus the currently focused date cell
    const focusCell = this.container.querySelector('[tabindex="0"]');
    if (focusCell) focusCell.focus();
  }
  
  _renderDays(year, month, firstDay, daysInMonth, today) {
    let html = '<tr>';
    let dayOfWeek = 0;
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<td></td>';
      dayOfWeek++;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      if (dayOfWeek === 7) {
        html += '</tr><tr>';
        dayOfWeek = 0;
      }
      
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      const isToday = date.getTime() === today.getTime();
      const isSelected = this._isSameDate(date, this.selectedDate);
      const isFocused = this._isSameDate(date, this.focusedDate);
      const isDisabled = this._isOutOfRange(date);
      
      const classes = [
        'dp-day',
        isToday ? 'dp-today' : '',
        isSelected ? 'dp-selected' : '',
      ].filter(Boolean).join(' ');
      
      html += `<td
        role="gridcell"
        class="${classes}"
        data-date="${dateStr}"
        tabindex="${isFocused ? '0' : '-1'}"
        aria-selected="${isSelected}"
        ${isDisabled ? 'aria-disabled="true"' : ''}
        aria-label="${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}"
      >${day}</td>`;
      
      dayOfWeek++;
    }
    
    // Fill remaining cells
    while (dayOfWeek > 0 && dayOfWeek < 7) {
      html += '<td></td>';
      dayOfWeek++;
    }
    
    html += '</tr>';
    return html;
  }
  
  attachKeyboardHandlers() {
    this.container.addEventListener('keydown', (e) => {
      const key = e.key;
      let newDate = new Date(this.focusedDate);
      
      switch (key) {
        case 'ArrowRight': newDate.setDate(newDate.getDate() + 1); break;
        case 'ArrowLeft': newDate.setDate(newDate.getDate() - 1); break;
        case 'ArrowDown': newDate.setDate(newDate.getDate() + 7); break;
        case 'ArrowUp': newDate.setDate(newDate.getDate() - 7); break;
        case 'Home': newDate.setDate(1); break; // First of month
        case 'End': newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0); break;
        case 'PageDown': newDate.setMonth(newDate.getMonth() + 1); break;
        case 'PageUp': newDate.setMonth(newDate.getMonth() - 1); break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!this._isOutOfRange(this.focusedDate)) {
            this.selectDate(this.focusedDate);
          }
          return;
        case 'Escape':
          this.container.dispatchEvent(new CustomEvent('datepicker-close'));
          return;
        default: return;
      }
      
      e.preventDefault();
      
      if (!this._isOutOfRange(newDate)) {
        this.focusedDate = newDate;
        // If month changed, re-render
        if (newDate.getMonth() !== this.viewDate.getMonth() 
            || newDate.getFullYear() !== this.viewDate.getFullYear()) {
          this.viewDate = new Date(newDate);
        }
        this.render();
      }
    });
  }
  
  navigate(direction) {
    this.viewDate.setMonth(this.viewDate.getMonth() + direction);
    this.focusedDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    this.render();
  }
  
  selectDate(date) {
    this.selectedDate = new Date(date);
    this.focusedDate = new Date(date);
    this.render();
    this.onSelect(date);
  }
  
  _isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() 
        && a.getMonth() === b.getMonth() 
        && a.getDate() === b.getDate();
  }
  
  _isOutOfRange(date) {
    if (this.minDate && date < this.minDate) return true;
    if (this.maxDate && date > this.maxDate) return true;
    return false;
  }
}
```

---

## 🎯 Key Takeaways
- Apple = **accessibility-first + polished UI + keyboard navigation**
- **Promise.allSettled vs .any**: allSettled waits for ALL (never rejects), .any resolves on FIRST success
- **Promise.allSettled**: wraps non-promises with `Promise.resolve()`, uses `.finally()` to count
- **Date Picker ARIA**: `role="grid"`, `role="gridcell"`, `aria-selected`, `aria-disabled`, `aria-label` with full date
- **Keyboard mapping** (WAI-ARIA Date Picker pattern): Arrow keys = day/week, Home/End = first/last of month, PageUp/Down = month nav
- **Roving tabindex**: only focused cell has `tabindex="0"`, all others `-1`
- **Min/max date range**: `aria-disabled="true"` for out-of-range dates, prevent selection
- Apple rejects if accessibility or offline-first isn't thorough

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals |
| JS Deep Dive | Medium-Hard | Promise Polyfills |
| Machine Coding | Hard | Accessible Date Picker, ARIA |
| System Design | Hard | Offline-First, Apple Design Standards |
| Behavioral | Medium | Cross-Functional Collaboration |
