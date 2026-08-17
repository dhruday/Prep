# Airbnb — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Frontend Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | San Francisco, CA |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Coding + System Design + Cross-Functional)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Build a Date Range Picker Component
**Duration:** 45 minutes

### Problem
Build a calendar-based date range picker with:
- Two-month view (start and end month)
- Click to select start date, click again for end date
- Hover preview of range before second click
- Disable past dates and unavailable dates
- Keyboard navigation and ARIA

### 💡 Interview-Ready Answer

```javascript
class DateRangePicker {
  constructor(container, options = {}) {
    this.container = container;
    this.onChange = options.onChange || (() => {});
    this.disabledDates = new Set(
      (options.disabledDates || []).map(d => this._dateKey(new Date(d)))
    );
    this.minDate = options.minDate || new Date();
    this.maxDate = options.maxDate || this._addMonths(new Date(), 12);

    this.startDate = null;
    this.endDate = null;
    this.hoverDate = null;
    this.selecting = false; // true = selecting end date

    // Current view: left month
    this.viewDate = new Date(this.minDate.getFullYear(), this.minDate.getMonth(), 1);

    this._build();
    this._render();
  }

  _build() {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'application');
    this.container.setAttribute('aria-label', 'Date range picker');
    this.container.style.cssText = 'display:inline-flex;gap:16px;font-family:system-ui;user-select:none;';

    // Left and right month panels
    this.leftPanel = this._createPanel('left');
    this.rightPanel = this._createPanel('right');

    // Navigation
    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;';

    this.prevBtn = document.createElement('button');
    this.prevBtn.textContent = '‹';
    this.prevBtn.setAttribute('aria-label', 'Previous month');
    this.prevBtn.style.cssText = 'border:none;background:none;font-size:20px;cursor:pointer;padding:4px 8px;';
    this.prevBtn.addEventListener('click', () => this._navigate(-1));

    this.nextBtn = document.createElement('button');
    this.nextBtn.textContent = '›';
    this.nextBtn.setAttribute('aria-label', 'Next month');
    this.nextBtn.style.cssText = 'border:none;background:none;font-size:20px;cursor:pointer;padding:4px 8px;';
    this.nextBtn.addEventListener('click', () => this._navigate(1));

    // Layout: [prev] [leftMonth] [rightMonth] [next]
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:flex-start;gap:16px;';

    const leftCol = document.createElement('div');
    leftCol.appendChild(this._createHeader(this.prevBtn, 'left'));
    leftCol.appendChild(this.leftPanel);

    const rightCol = document.createElement('div');
    rightCol.appendChild(this._createHeader(this.nextBtn, 'right'));
    rightCol.appendChild(this.rightPanel);

    wrapper.appendChild(leftCol);
    wrapper.appendChild(rightCol);
    this.container.appendChild(wrapper);
  }

  _createHeader(navBtn, side) {
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:center;align-items:center;padding:8px;gap:8px;';

    this[`${side}Title`] = document.createElement('span');
    this[`${side}Title`].style.cssText = 'font-weight:600;font-size:14px;min-width:120px;text-align:center;';

    if (side === 'left') {
      header.appendChild(navBtn);
      header.appendChild(this.leftTitle);
    } else {
      header.appendChild(this.rightTitle);
      header.appendChild(navBtn);
    }

    return header;
  }

  _createPanel(side) {
    const panel = document.createElement('div');
    panel.style.cssText = 'display:grid;grid-template-columns:repeat(7,36px);gap:2px;';

    // Day-of-week headers
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
      const hdr = document.createElement('div');
      hdr.textContent = day;
      hdr.style.cssText = 'text-align:center;font-size:12px;color:#666;padding:4px;font-weight:600;';
      panel.appendChild(hdr);
    });

    return panel;
  }

  _render() {
    const leftMonth = new Date(this.viewDate);
    const rightMonth = this._addMonths(this.viewDate, 1);

    this.leftTitle.textContent = this._formatMonth(leftMonth);
    this.rightTitle.textContent = this._formatMonth(rightMonth);

    this._renderMonth(this.leftPanel, leftMonth);
    this._renderMonth(this.rightPanel, rightMonth);
  }

  _renderMonth(panel, monthDate) {
    // Remove old day cells (keep 7 header cells)
    while (panel.children.length > 7) {
      panel.removeChild(panel.lastChild);
    }

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      panel.appendChild(empty);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const cell = this._createDayCell(date);
      panel.appendChild(cell);
    }
  }

  _createDayCell(date) {
    const cell = document.createElement('button');
    cell.textContent = date.getDate();
    cell.dataset.date = this._dateKey(date);
    cell.setAttribute('role', 'gridcell');

    const isDisabled = this._isDisabled(date);
    const isStart = this.startDate && this._sameDay(date, this.startDate);
    const isEnd = this.endDate && this._sameDay(date, this.endDate);
    const isInRange = this._isInRange(date);
    const isInPreview = this._isInPreview(date);
    const isToday = this._sameDay(date, new Date());

    let bg = 'transparent';
    let color = '#333';
    let borderRadius = '50%';
    let fontWeight = 'normal';

    if (isDisabled) {
      color = '#ccc';
    } else if (isStart || isEnd) {
      bg = '#222';
      color = '#fff';
      fontWeight = 'bold';
    } else if (isInRange) {
      bg = '#f0f0f0';
      borderRadius = '0';
    } else if (isInPreview) {
      bg = '#f7f7f7';
      borderRadius = '0';
    }

    if (isToday && !isStart && !isEnd) {
      fontWeight = 'bold';
    }

    cell.style.cssText = `
      width:36px;height:36px;border:none;background:${bg};color:${color};
      cursor:${isDisabled ? 'default' : 'pointer'};border-radius:${borderRadius};
      font-size:13px;font-weight:${fontWeight};display:flex;align-items:center;
      justify-content:center;transition:background 0.1s;
    `;

    cell.disabled = isDisabled;

    if (!isDisabled) {
      cell.addEventListener('click', () => this._onDateClick(date));
      cell.addEventListener('mouseenter', () => this._onDateHover(date));
    }

    cell.setAttribute('aria-label', date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));
    if (isStart) cell.setAttribute('aria-label', 'Check-in: ' + cell.getAttribute('aria-label'));
    if (isEnd) cell.setAttribute('aria-label', 'Check-out: ' + cell.getAttribute('aria-label'));

    return cell;
  }

  _onDateClick(date) {
    if (!this.selecting || (this.startDate && date < this.startDate)) {
      // Start new selection
      this.startDate = date;
      this.endDate = null;
      this.selecting = true;
    } else {
      // End selection
      this.endDate = date;
      this.selecting = false;
      this.hoverDate = null;
      this.onChange({ start: this.startDate, end: this.endDate });
    }
    this._render();
  }

  _onDateHover(date) {
    if (this.selecting && this.startDate && date > this.startDate) {
      this.hoverDate = date;
      this._render();
    }
  }

  _isDisabled(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || date > this.maxDate
      || this.disabledDates.has(this._dateKey(date));
  }

  _isInRange(date) {
    if (!this.startDate || !this.endDate) return false;
    return date > this.startDate && date < this.endDate;
  }

  _isInPreview(date) {
    if (!this.selecting || !this.startDate || !this.hoverDate) return false;
    return date > this.startDate && date <= this.hoverDate;
  }

  _navigate(direction) {
    this.viewDate = this._addMonths(this.viewDate, direction);
    this._render();
  }

  // === Utility ===

  _dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  _sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  _addMonths(date, months) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
  }

  _formatMonth(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Public API
  getRange() {
    return { start: this.startDate, end: this.endDate };
  }

  clear() {
    this.startDate = null;
    this.endDate = null;
    this.selecting = false;
    this._render();
  }
}

// === Usage ===
/*
const picker = new DateRangePicker(document.getElementById('datepicker'), {
  disabledDates: ['2025-04-15', '2025-04-16'],
  onChange: ({ start, end }) => {
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    console.log(`${start.toDateString()} → ${end.toDateString()} (${nights} nights)`);
  }
});
*/
```

## 🎯 Key Takeaways
- Airbnb **always** asks date range picker — it's their core search UX
- Two-month view with navigation is the standard pattern
- Hover preview shows the range before second click (UX polish)
- Disabled dates via Set for O(1) lookup
- CSS Grid (7 columns) maps perfectly to a calendar layout
- ARIA labels must include context ("Check-in" / "Check-out")

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Date Handling, Calendar Grid, State Machine |
| Design | Hard | Airbnb Search Architecture |
| Cross-Functional | Medium | Collaboration, Communication |
