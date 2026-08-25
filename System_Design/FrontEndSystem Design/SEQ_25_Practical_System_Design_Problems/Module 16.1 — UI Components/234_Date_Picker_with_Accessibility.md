# 234 – Date Picker with Accessibility

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Date Picker is a form control that allows users to select a date via a calendar grid, with keyboard navigation, screen reader support, and flexible input methods (typing, clicking, navigation). It's a rich accessibility challenge because the WAI-ARIA APG specifies a complete **dialog + grid pattern** with arrow-key navigation, month/year switching, and proper labeling. Building one from scratch tests component architecture, state management (current view month, selected date, focus date), date math, internationalization, and advanced keyboard interaction patterns.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Component Architecture

```
┌──────────────────────────────────────┐
│           DatePicker                  │
│  ┌──────────────────────────────┐    │
│  │ DateInput                     │    │  ← text input with format mask
│  │ [📅 MM/DD/YYYY           ]   │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ CalendarDialog (role=dialog)  │    │  ← opened on click/Enter
│  │  ◀  January 2025  ▶          │    │  ← month/year navigation
│  │  Su Mo Tu We Th Fr Sa        │    │  ← role="grid"
│  │           1  2  3  4         │    │
│  │   5  6  7  8  9 10 11        │    │
│  │  12 13 14 15 16 17 18        │    │
│  │  19 20 21 22 23 24 25        │    │
│  │  26 27 28 29 30 31           │    │
│  │  [Today]                     │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### WAI-ARIA Pattern (Dialog Grid Date Picker)

```html
<div role="dialog" aria-modal="true" aria-label="Choose date">
  <div role="grid" aria-label="January 2025">
    <div role="row">
      <abbr role="columnheader" title="Sunday">Su</abbr>
      <!-- ... -->
    </div>
    <div role="row">
      <span role="gridcell">
        <button tabindex="-1" aria-selected="false">1</button>
      </span>
      <!-- selected date -->
      <span role="gridcell">
        <button tabindex="0" aria-selected="true">15</button>
      </span>
    </div>
  </div>
</div>
```

### Keyboard Navigation (Critical for Accessibility)

| Key | Action |
|-----|--------|
| Arrow Right | Next day |
| Arrow Left | Previous day |
| Arrow Down | Same day next week |
| Arrow Up | Same day prev week |
| Home | First day of week |
| End | Last day of week |
| Page Up | Same day previous month |
| Page Down | Same day next month |
| Shift+Page Up | Same day previous year |
| Shift+Page Down | Same day next year |
| Enter/Space | Select focused date, close dialog |
| Escape | Close dialog without selecting |

### State Management

```typescript
interface DatePickerState {
  selectedDate: Date | null;    // user's chosen date
  focusedDate: Date;            // currently focused cell in grid
  viewMonth: number;            // 0-11
  viewYear: number;
  isOpen: boolean;
  inputValue: string;           // raw text input
}
```

The `focusedDate` drives grid navigation. Arrow keys move `focusedDate`, which may cross month boundaries (triggering `viewMonth` update). `selectedDate` only changes on Enter/Space/click.

### Date Math Edge Cases

- Months with different day counts: Jan 31 → Page Down → Feb 28 (clamp)
- Leap years: Feb 29 exists only in leap years
- Timezone: Use date-only (no time component) to avoid DST issues
- Min/max: Disable dates outside allowed range, skip them in keyboard navigation

### Internationalization

- Date format: MM/DD/YYYY (US) vs DD/MM/YYYY (EU) — use `Intl.DateTimeFormat`
- First day of week: Sunday (US) vs Monday (EU) — configurable
- Month/day names: Use `Intl.DateTimeFormat` for localized names
- RTL languages: Calendar grid reverses direction

### Anti-Patterns

- ❌ Using `<select>` dropdowns for month/day/year — terrible UX, not a calendar
- ❌ No keyboard navigation — fails WCAG 2.1.1 (Keyboard)
- ❌ Using `aria-label` on each day button without context — "15" alone is meaningless, use "January 15, 2025"
- ❌ No `role="dialog"` on the calendar popup — screen readers don't announce it
- ❌ Closing on blur without Escape handler — traps keyboard users

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Material UI Date Picker
MUI's date picker follows the WAI-ARIA dialog grid pattern with full keyboard navigation. It supports mobile-native pickers (`<input type="date">`) as a fallback, desktop calendar dialogs, and localization via `@mui/x-date-pickers` with adapter pattern for date libraries.

### Hruday @ SAP Labs
SAP UI5's `sap.m.DatePicker` provides a fully accessible calendar with keyboard navigation, localization (50+ locales), and Islamic/Hijri calendar support. At SAP, we achieved WCAG AA certification partly due to using these accessible date controls throughout Fiori apps.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd decompose this into DateInput (text input with format mask) and CalendarDialog (the popup grid). The dialog opens on icon click or Enter key, and uses `role='dialog'` with `aria-modal='true'`.*

*The calendar grid uses `role='grid'` with row/columnheader elements. Each date is a button inside a gridcell. The focused date gets `tabindex='0'`, all others `tabindex='-1'` — this is the roving tabindex pattern. Arrow keys move focus between days, crossing month boundaries automatically.*

*State: `selectedDate` (what the user chose), `focusedDate` (where the keyboard focus is), `viewMonth`/`viewYear` (what month is displayed). Arrow keys update `focusedDate`, Enter/Space sets `selectedDate` and closes the dialog.*

*Edge cases: clamping when crossing months (Jan 31 → Feb 28), leap years, disabled dates (min/max range skipped in keyboard nav). Localization via `Intl.DateTimeFormat` for month names and first-day-of-week.*

*At SAP, we achieved WCAG AA certification using this exact dialog+grid pattern across all Fiori date entry points."*

### Follow-ups

1. **"How do you handle typing vs clicking?"** — Input accepts typed dates with format validation (regex or date parsing). Calendar syncs to typed date. Invalid input shows inline error.
2. **"Date range picker?"** — Track `startDate` and `endDate`. Visual highlight between them. Keyboard: first Enter sets start, second sets end.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Calendar Grid with Roving Tabindex
function CalendarGrid({ viewYear, viewMonth, focusedDate, selectedDate, onSelect, onFocusChange, minDate, maxDate }: CalendarGridProps) {
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDayOfWeek).fill(null);
  
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const handleKeyDown = (e: React.KeyboardEvent, day: number) => {
    const current = new Date(viewYear, viewMonth, day);
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowRight': next = addDays(current, 1); break;
      case 'ArrowLeft':  next = addDays(current, -1); break;
      case 'ArrowDown':  next = addDays(current, 7); break;
      case 'ArrowUp':    next = addDays(current, -7); break;
      case 'Enter': case ' ': onSelect(current); e.preventDefault(); return;
    }
    if (next && isWithinRange(next, minDate, maxDate)) {
      onFocusChange(next);
      e.preventDefault();
    }
  };

  return (
    <div role="grid" aria-label={`${monthNames[viewMonth]} ${viewYear}`}>
      <div role="row">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <abbr key={d} role="columnheader" title={fullDayNames[d]}>{d}</abbr>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} role="row">
          {week.map((day, di) => (
            <span key={di} role="gridcell">
              {day && (
                <button
                  tabIndex={isSameDay(new Date(viewYear, viewMonth, day), focusedDate) ? 0 : -1}
                  aria-selected={isSameDay(new Date(viewYear, viewMonth, day), selectedDate)}
                  aria-label={formatFullDate(new Date(viewYear, viewMonth, day))}
                  onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
                  onKeyDown={(e) => handleKeyDown(e, day)}
                >
                  {day}
                </button>
              )}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Date Picker = Dialog + Grid + Roving Tabindex + Arrow Navigation."** The popup is `role="dialog"`, `aria-modal="true"`. Calendar is `role="grid"` with gridcells. One button per day; focused day has `tabindex="0"`, rest have `tabindex="-1"` (roving tabindex). Arrow keys navigate days (crossing months auto-updates view). Enter/Space selects. Page Up/Down changes month. Localize with `Intl.DateTimeFormat`. Clamp edge cases (Jan 31 → Feb 28).

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Date pickers are among the most complex accessible components — the WAI-ARIA APG has a dedicated pattern. Tests keyboard navigation, grid ARIA, dialog management, date math, and i18n.
**How:** Dialog+grid ARIA pattern. Roving tabindex for keyboard navigation. State separates focusedDate (keyboard), selectedDate (chosen), and viewMonth (displayed). Date math handles month boundaries and constraints.
**Companies:** Microsoft (Fluent UI DatePicker — they wrote the APG), Adobe (Spectrum DatePicker), Salesforce (Lightning DatePicker), Cisco (form-heavy enterprise UIs).
