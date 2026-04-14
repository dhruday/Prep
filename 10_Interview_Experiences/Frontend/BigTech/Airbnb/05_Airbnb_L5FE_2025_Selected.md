# Airbnb — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Frontend Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 FE + 1 Cross-functional + 1 Culture)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 2: Frontend Coding — Date Range Picker with Calendar View

### Problem
Build a date range picker component with:
1. Calendar grid showing month view with week headers
2. Click to select start date, click again for end date (range highlight)
3. Hover preview of range before confirming end date
4. Navigate between months (prev/next month arrows)
5. Disable past dates and dates beyond 1 year
6. Display selected range as formatted text
7. Clear selection button

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Date Range Picker</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f7f7f7; display: flex; justify-content: center; padding: 40px; }

.picker-wrapper { width: 340px; }
.trigger-input { width: 100%; padding: 12px 16px; border: 2px solid #ddd; border-radius: 10px; font-size: 14px; cursor: pointer; background: #fff; text-align: left; }
.trigger-input:focus { border-color: #ff385c; outline: none; }
.trigger-input .placeholder { color: #999; }

.calendar { background: #fff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); margin-top: 8px; overflow: hidden; display: none; }
.calendar.open { display: block; }

.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; }
.cal-header button { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; color: #333; }
.cal-header button:hover { background: #f0f0f0; }
.cal-header button:disabled { opacity: 0.3; cursor: default; }
.cal-title { font-size: 16px; font-weight: 600; color: #222; }

.weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 12px; }
.weekdays span { text-align: center; font-size: 12px; color: #999; font-weight: 500; padding: 4px; }

.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 4px 12px 16px; gap: 2px; }
.day-cell { text-align: center; padding: 8px 0; font-size: 14px; border-radius: 50%; cursor: pointer; position: relative; transition: all 0.1s; }
.day-cell:hover:not(.disabled):not(.empty) { background: #f0f0f0; }
.day-cell.empty { cursor: default; }
.day-cell.disabled { color: #ccc; cursor: default; }
.day-cell.today { font-weight: 700; color: #ff385c; }
.day-cell.start, .day-cell.end { background: #ff385c; color: #fff; font-weight: 600; }
.day-cell.in-range { background: #ffe4e9; border-radius: 0; }
.day-cell.start { border-radius: 50% 0 0 50%; }
.day-cell.end { border-radius: 0 50% 50% 0; }
.day-cell.start.end { border-radius: 50%; }
.day-cell.hover-range { background: #fff0f3; border-radius: 0; }

.selection-display { padding: 12px 20px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
.selection-text { font-size: 13px; color: #555; }
.clear-btn { background: none; border: none; color: #ff385c; cursor: pointer; font-size: 13px; font-weight: 500; }
.clear-btn:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="picker-wrapper">
  <button class="trigger-input" id="trigger">
    <span class="placeholder">Select dates</span>
  </button>
  <div class="calendar" id="calendar"></div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();
let startDate = null;
let endDate = null;
let hoverDate = null;
let isOpen = false;

const today = new Date();
today.setHours(0, 0, 0, 0);
const maxDate = new Date(today);
maxDate.setFullYear(maxDate.getFullYear() + 1);

const trigger = document.getElementById('trigger');
const calendar = document.getElementById('calendar');

// ============================================================
// HELPERS
// ============================================================
function toKey(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(d1, d2) {
  return d1 && d2 && d1.getTime() === d2.getTime();
}

function isDisabled(date) {
  return date < today || date > maxDate;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

// ============================================================
// RENDER
// ============================================================
function render() {
  calendar.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'cal-header';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  prevBtn.disabled = !canGoPrev;
  prevBtn.addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });

  const title = document.createElement('span');
  title.className = 'cal-title';
  title.textContent = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;
  nextBtn.disabled = !canGoNext;
  nextBtn.addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });

  header.append(prevBtn, title, nextBtn);
  calendar.appendChild(header);

  // Weekdays
  const weekdays = document.createElement('div');
  weekdays.className = 'weekdays';
  ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(d => {
    const span = document.createElement('span');
    span.textContent = d;
    weekdays.appendChild(span);
  });
  calendar.appendChild(weekdays);

  // Days grid
  const grid = document.createElement('div');
  grid.className = 'days-grid';

  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  // Empty cells for padding
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = d;

    const disabled = isDisabled(date);
    if (disabled) {
      cell.classList.add('disabled');
    }

    if (isSameDay(date, today)) cell.classList.add('today');

    // Range highlighting
    if (startDate && isSameDay(date, startDate)) cell.classList.add('start');
    if (endDate && isSameDay(date, endDate)) cell.classList.add('end');

    if (startDate && endDate && date > startDate && date < endDate) {
      cell.classList.add('in-range');
    }

    // Hover preview
    if (startDate && !endDate && hoverDate && !disabled) {
      const rangeStart = startDate < hoverDate ? startDate : hoverDate;
      const rangeEnd = startDate < hoverDate ? hoverDate : startDate;
      if (date > rangeStart && date < rangeEnd) {
        cell.classList.add('hover-range');
      }
      if (isSameDay(date, hoverDate)) {
        cell.classList.add(startDate < hoverDate ? 'end' : 'start');
      }
    }

    if (!disabled) {
      cell.addEventListener('click', () => handleDateClick(date));
      cell.addEventListener('mouseenter', () => {
        hoverDate = date;
        if (startDate && !endDate) render();
      });
    }

    grid.appendChild(cell);
  }

  calendar.appendChild(grid);

  // Selection display
  const display = document.createElement('div');
  display.className = 'selection-display';
  const text = document.createElement('span');
  text.className = 'selection-text';

  if (startDate && endDate) {
    text.textContent = formatDisplay(startDate) + ' — ' + formatDisplay(endDate);
    const nights = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    text.textContent += ` (${nights} night${nights !== 1 ? 's' : ''})`;
  } else if (startDate) {
    text.textContent = formatDisplay(startDate) + ' — Select end date';
  } else {
    text.textContent = 'Select check-in date';
  }

  display.appendChild(text);

  if (startDate) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      startDate = null;
      endDate = null;
      hoverDate = null;
      updateTrigger();
      render();
    });
    display.appendChild(clearBtn);
  }

  calendar.appendChild(display);
}

// ============================================================
// INTERACTION
// ============================================================
function handleDateClick(date) {
  if (!startDate || (startDate && endDate)) {
    // New selection
    startDate = date;
    endDate = null;
  } else {
    // Set end date
    if (date < startDate) {
      endDate = startDate;
      startDate = date;
    } else if (isSameDay(date, startDate)) {
      return; // same date click — ignore
    } else {
      endDate = date;
    }
    updateTrigger();
  }
  render();
}

function updateTrigger() {
  if (startDate && endDate) {
    trigger.innerHTML = formatDisplay(startDate) + ' → ' + formatDisplay(endDate);
  } else {
    trigger.innerHTML = '<span class="placeholder">Select dates</span>';
  }
}

trigger.addEventListener('click', () => {
  isOpen = !isOpen;
  calendar.classList.toggle('open', isOpen);
  if (isOpen) render();
});

// Close on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.picker-wrapper')) {
    isOpen = false;
    calendar.classList.remove('open');
  }
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    isOpen = false;
    calendar.classList.remove('open');
  }
});
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Airbnb FE interviews focus on **travel-domain UI components** like date pickers
- Range selection UX: first click = start, second click = end (swap if reversed)
- **Hover preview** shows tentative range before confirming — essential detail
- Calendar grid: `getDay()` for first-day offset, padding with empty cells
- Disable past dates and dates >1 year out — boundary validation
- Night count display: `(endDate - startDate) / (24*60*60*1000)`
- Border-radius trick for range: `50% 0 0 50%` for start, `0 50% 50% 0` for end
- Close on outside click using `document.addEventListener` + `.closest()` check

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS, Promise, DOM |
| FE Coding 1 | Medium | Component Design |
| FE Coding 2 | Hard | Date Picker, Range Selection, Calendar Math |
| Cross-functional | Medium | Accessibility, i18n, Edge Cases |
| Culture | Medium | Airbnb Values, Belonging |
