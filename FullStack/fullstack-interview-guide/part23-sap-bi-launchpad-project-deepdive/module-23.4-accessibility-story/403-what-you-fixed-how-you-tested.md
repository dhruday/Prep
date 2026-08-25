# What You Fixed and How You Tested It
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.4: The Accessibility Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Fixes in three layers**: (1) component-level code changes — ARIA labels, focus management, alt text, (2) CSS fixes — focus ring, contrast ratio colours, and (3) a shared accessible component library so the same correct pattern is used in all four micro-frontend modules
- **Four-step fix methodology**: Audit → Prioritise by severity → Fix and add regression test → Verify with screen reader session, not just axe re-scan
- **Three testing methods used**: automated (axe-core in CI), manual keyboard walkthrough, manual screen reader session (NVDA on Windows + VoiceOver on macOS)
- **Critical distinction**: axe says "no automated violations" ≠ "accessible"; axe cannot tell if alt text is meaningful, if ARIA labels are correct, or if the focus order makes sense — human testing is required for a real sign-off
- **Regression prevention**: axe-core added to each team's Playwright test suite; any PR that introduces a critical or serious violation fails CI; this keeps the violation count from creeping back up
- **The test coverage that convinced the security/quality team**: end-to-end keyboard walkthrough, modal focus trap test, colour contrast check in design review, VoiceOver walkthrough of the chart dashboard

---

## 1. One-Line Definition
Fixing meant writing ARIA attributes at the component level, rebuilding the focus management logic in modals and dropdowns, correcting colour tokens, and testing with real assistive tools — not just re-running axe.

---

## 2. Fix Layer 1 — ARIA Labels and Roles

```typescript
// BEFORE — icon-only button with no name ❌
<button onClick={handleEdit}>
  <EditIcon className="icon" />
</button>

// AFTER — button with accessible name ✅
<button
  onClick={handleEdit}
  aria-label="Edit report name"
>
  <EditIcon aria-hidden="true" />    {/* hide decorative icon from AT */}
</button>

// ─────────────────────────────────────────────────────────────
// BEFORE — modal with no dialog role ❌
<div className="modal-overlay">
  <div className="modal-content">
    <h2>Delete Report</h2>
    {/* content */}
  </div>
</div>

// AFTER — modal with correct semantics ✅
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  ref={modalRef}
>
  <h2 id="modal-title">Delete Report</h2>  {/* matches aria-labelledby */}
  {/* content */}
</div>

// ─────────────────────────────────────────────────────────────
// BEFORE — chart SVG invisible to screen readers ❌
<svg width="600" height="300" className="bar-chart">
  {/* rendered bars */}
</svg>

// AFTER — chart with accessible description ✅
<svg
  role="img"
  aria-labelledby="chart-title chart-desc"
  width="600"
  height="300"
>
  <title id="chart-title">Monthly Report Views — Q1 2024</title>
  <desc id="chart-desc">
    Bar chart. January: 1,240 views. February: 1,580 views.
    March: 1,920 views. Overall upward trend across Q1.
  </desc>
  {/* rendered bars */}
</svg>

// ─────────────────────────────────────────────────────────────
// BEFORE — live filter results not announced ❌
<div className="results-count">{count} reports</div>

// AFTER — announced to screen reader when count changes ✅
<div
  aria-live="polite"
  aria-atomic="true"
  className="results-count"
>
  {count} reports match your filter
</div>
```

---

## 3. Fix Layer 2 — Focus Management

```typescript
// THE MODAL FOCUS TRAP COMPONENT:
interface FocusTrapProps {
  active: boolean;
  children: React.ReactNode;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ active, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    // Move focus into the modal on open
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
};

// ─────────────────────────────────────────────────────────────
// FOCUS RETURN ON MODAL CLOSE:
const DeleteReportModal = ({ isOpen, onClose, triggerRef }) => {
  useEffect(() => {
    if (!isOpen) {
      // Return focus to the button that opened the modal
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // ...
};

// ─────────────────────────────────────────────────────────────
// BACKGROUND HIDDEN WHEN MODAL IS OPEN:
useEffect(() => {
  const mainContent = document.getElementById('main-content');
  if (isOpen) {
    mainContent?.setAttribute('aria-hidden', 'true');
  } else {
    mainContent?.removeAttribute('aria-hidden');
  }
  return () => mainContent?.removeAttribute('aria-hidden');
}, [isOpen]);
```

---

## 4. Fix Layer 3 — CSS and Colour Tokens

```css
/* BEFORE — global focus ring removed ❌ */
* {
  outline: none;
}

/* AFTER — visible focus for keyboard users only ✅ */
/* Remove from global CSS completely */
/* Add explicit focus-visible styles: */

:focus-visible {
  outline: 3px solid #0050AA;
  outline-offset: 2px;
}

/* For elements that have their own focus appearance: */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 3px solid #0050AA;
  outline-offset: 2px;
  border-radius: 2px;
}

/* COLOUR TOKEN CHANGES:
   All colours came from a design token file — changed once, applied everywhere */

/* Before: */
--color-text-primary: #0070D2;  /* 3.8:1 — FAIL */
--color-text-secondary: #767676; /* 4.48:1 — FAIL */
--color-icon: #AAAAAA;           /* 2.1:1 — FAIL */

/* After: */
--color-text-primary: #0050AA;  /* 6.2:1 — PASS */
--color-text-secondary: #636363; /* 5.9:1 — PASS */
--color-icon: #767676;           /* 4.48:1 — PASS */
```

---

## 5. Testing — Three Methods

```
METHOD 1: Automated — axe-core in CI
─────────────────────────────────────
// Playwright test that runs axe on every key page:
import { checkA11y } from 'axe-playwright';

test('dashboard page is accessible', async ({ page }) => {
  await page.goto('/dashboard');
  await checkA11y(page, undefined, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa']   // Only check A and AA criteria
    }
  });
});

// This runs in every PR's CI pipeline
// A critical or serious violation fails the build

WHAT AXE CATCHES: ~57% of automated-detectable issues
  Missing aria-labels, missing document title, colour contrast failures,
  missing alt text, invalid ARIA roles, duplicate IDs

WHAT AXE DOES NOT CATCH:
  Whether the aria-label text is meaningful ("button" vs "Edit report name")
  Whether focus order is logical (it checks focusability, not order)
  Whether a screen reader session is usable
  Whether the chart description is accurate and useful

─────────────────────────────────────────────────────────────
METHOD 2: Manual Keyboard Walkthrough
─────────────────────────────────────
SCRIPT USED (5 minutes per module):
  1. Put mouse aside; Tab through the full page
  2. Can you reach every interactive element?
  3. Can you see which element is focused at all times?
  4. Does Escape close modals and dropdowns?
  5. Tab into a modal — are you trapped inside? (should be)
  6. Close the modal — where does focus go? (should be trigger button)
  7. Can you operate the data table: sort, filter, paginate — keyboard only?
  8. Can you submit every form with only keyboard?

ISSUES FOUND KEYBOARD-ONLY that axe missed:
  Dropdown menus needed custom keydown handling (ArrowUp/Down/Enter)
  A file upload button intercepted Tab and couldn't be reached
  Focus order in the filter panel went off-screen before becoming visible

─────────────────────────────────────────────────────────────
METHOD 3: Screen Reader Session with NVDA
─────────────────────────────────────────
SESSION WALKTHROUGH (used for sign-off, not for finding issues):
  1. Open NVDA on Windows; open Chrome; navigate to the app
  2. Read the page with arrow keys — does headings structure make sense?
  3. Open the Search for Reports modal; is it announced as a dialog?
  4. Tab through the form fields — is each label announced?
  5. Submit with an error — is the error message announced?
  6. Navigate to the dashboard chart — is the description read?
  7. Tab through the data table — are column headers announced per cell?

VERDICT CONDITION:
  "A user who cannot see the screen can complete the primary task
   (find a report, view its data, create a new report) using only
   the screen reader and keyboard."

VoiceOver (macOS) session run on the same script to cover
different screen reader behaviour.
```

---

## 6. Interview Questions & Model Answers

### Q1
**Interviewer asks:** "How did you test that the accessibility fixes actually worked?"

**Hruday's answer:**
> "Three levels. First, automated: we integrated axe-core into each team's Playwright test suite. Every PR runs axe against the key pages, and a critical or serious violation fails the build. That catches maybe 60% of detectable issues automatically. Second, manual keyboard walkthrough: I personally went through the five main user flows — tab through filters, open and close modals, navigate the data table, use the upload feature — using only the keyboard. No mouse. I was checking that every element is reachable, that focus doesn't disappear, that modals trap focus correctly and return it on close. Third, screen reader session: NVDA on Windows and VoiceOver on macOS. The pass criterion was whether a user who can't see the screen can complete the main task — find a report, view its dashboard, create a new one — using only the screen reader. That last test is the one that gives me confidence the fixes are real, not just that the ARIA attributes are technically present."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Test method | "We ran axe and it passed" | "axe catches ~60% of automated issues; manual keyboard + NVDA session is required for sign-off; axe passing ≠ accessible" |
| Focus return | Not mentioning this | "When a modal closes, focus must return to the trigger button — we used a ref to the trigger element and .focus() it on close" |
| Regression | "We fixed it once" | "axe-core in Playwright CI — any PR introducing a critical/serious violation fails the build; violations can't silently creep back in" |
| Easy vs hard fix | "We just added ARIA labels" | "The easy fixes were ARIA attributes (one attribute per element). The harder fix was the focus trap — that required a custom FocusTrap component shared across all four modules, because each team was writing their own modal from scratch" |

---

## 8. Hruday's Real Experience Hook

> "The fix I'm most proud of is the FocusTrap component. Before it, each of the four micro-frontend teams had their own modal implementation, and none of them trapped focus. Fixing all four separately would have taken weeks and introduced inconsistency. Instead I built one FocusTrap component in the shared component library — a React context wrapper that handles Tab and Shift+Tab cycling, focus-on-open, and integration with the aria-hidden background pattern. All four teams replaced their modal focus handling in one sprint. Six months later I ran the NVDA walkthrough again. Every modal across all four modules behaved identically and correctly. That's the leverage of a shared library."

---

## 9. Scale Evolution

**Single module →** axe DevTools browser extension; keyboard walkthrough; NVDA session per release.

**Multi-module micro-frontends →** axe-core in Playwright CI for each team; shared FocusTrap, accessible Modal, accessible DataTable components; accessibility design review checklist added to PR template.

**Enterprise platform →** External WCAG audit before major release. User research panel with screen reader users. JAWS + NVDA + VoiceOver + TalkBack tested per release. VPAT updated after each audit. Accessibility score on product dashboard.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment modals and confirmation dialogs need perfect focus management; an accessible payment flow is also a better UX for all users | FocusTrap on confirmation modal; ARIA live for payment status announcement |
| Swiggy / Meesho | Mobile and web surfaces; screen reader testing on Android (TalkBack); large touch targets for motor-impaired users | Keyboard/touch parity; ARIA live regions for cart updates |
| Adobe / Microsoft | Accessibility is a core product value; deeply complex ARIA patterns (rich text editor, spreadsheet grid) | Custom ARIA implementations; AT regression testing per build |
| SAP Labs | You built the FocusTrap component and shared component library; you ran the NVDA session and signed off on the fix | The candidate who can demo the exact fix, explain why the shared component approach was better than team-by-team fixes |

---

*Part 23 · What You Fixed and How You Tested It · Full Stack Interview Guide · Hruday D · 2026*
