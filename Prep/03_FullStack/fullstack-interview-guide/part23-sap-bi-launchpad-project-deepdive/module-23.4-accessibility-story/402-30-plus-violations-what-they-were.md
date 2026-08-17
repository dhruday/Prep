# 30+ Violations — What They Were
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.4: The Accessibility Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Total violations before**: 33 unique WCAG AA failures across the four micro-frontend modules
- **Discovery tools**: axe DevTools (Chrome extension) for automated detection; manual screen reader testing with NVDA on Windows and VoiceOver on macOS; keyboard-only navigation walkthrough
- **Biggest category (13 violations): missing ARIA labels** — icon-only buttons had no accessible name; charts had no description; modal dialogs had no `aria-labelledby` pointing to the title
- **Second category (8 violations): focus management** — modal dialogs didn't trap focus inside; closing a modal sent focus to the top of the page instead of the trigger button; dropdown menus didn't work with keyboard at all; Tab key went to hidden elements behind modals
- **Third category (7 violations): colour contrast** — SAP brand blue `#0070D2` on white background gives 3.8:1 (WCAG requires 4.5:1); icon-only toolbar buttons had 2.1:1 (requires 3:1); placeholder text in filters was 2.3:1
- **Fourth category (5 violations): missing alt text** — SVG chart elements had no `<title>` or `aria-label`; decorative dividers had `alt="divider"` (should be `alt=""`); table sort icons had `alt="icon"` instead of `alt="Sort reports table by name, ascending"`
- **How to talk about them in an interview**: group into the four categories above; give one concrete example from each; state the criterion number and principle; this shows you know WCAG, not just "we had some issues"

---

## 1. One-Line Definition
The 33 violations fell into four categories — missing ARIA labels, focus mismanagement, insufficient colour contrast, and unhelpful alt text — each discovered via a combination of automated axe scanning and manual keyboard + screen reader walkthrough.

---

## 2. Category 1: Missing ARIA Labels (13 violations)

```
WCAG 4.1.2: Name, Role, Value
  Every user interface component must have a name, role, and value
  that can be determined by assistive technology

VIOLATIONS FOUND:

1. Icon-only toolbar buttons (5 buttons):
   <button><svg class="edit-icon" /></button>
   Screen reader announces: "button"  ← no meaningful name
   Fix:
   <button aria-label="Edit report name"><svg aria-hidden="true" /></button>

2. Modal dialogs (3 modals):
   <div class="modal">...</div>
   Screen reader announces: nothing meaningful when modal opens
   Fix:
   <div
     role="dialog"
     aria-modal="true"
     aria-labelledby="modal-title"
   >
     <h2 id="modal-title">Delete Report</h2>

3. Chart SVGs (3 charts):
   <svg class="bar-chart">...</svg>
   Screen reader announces: "chart" or nothing
   Fix:
   <svg role="img" aria-labelledby="chart-title chart-desc">
     <title id="chart-title">Monthly Report Views</title>
     <desc id="chart-desc">
       Bar chart showing 1,240 views in January, 1,580 in February,
       1,920 in March — an upward trend
     </desc>
   </svg>

4. Live filter/search region (2 violations):
   Results count updated without announcement
   Fix:
   <div aria-live="polite" aria-atomic="true">
     <span>{count} reports match your filter</span>
   </div>

KEY POINT FOR INTERVIEWS:
  axe DevTools automated scan caught 9 of these 13
  The other 4 required a screen reader walkthrough —
  axe can detect missing attributes but not whether the text is meaningful
  "button" vs "Edit report name" — both are technically present,
  but only the second is useful to a screen reader user
```

---

## 3. Category 2: Focus Management (8 violations)

```
WCAG 2.1.1: Keyboard Accessible
WCAG 2.4.3: Focus Order
WCAG 2.4.7: Focus Visible

VIOLATIONS FOUND:

1. Global CSS suppressed focus ring:
   * { outline: none; }   ← applied everywhere in the old CSS reset
   Keyboard users could not see which element was focused
   Fix: Remove the rule; use :focus-visible instead of :focus

   button:focus-visible,
   a:focus-visible,
   [tabindex]:focus-visible {
     outline: 3px solid #0050AA;
     outline-offset: 2px;
   }

2. Modal focus trap missing (3 modals affected):
   Tab key inside modal could reach elements behind it
   Focus escaped to the page behind on the last Tab press
   A screen reader user could not tell they were in a modal

   Fix: FocusTrap component (or focus-trap-react library):
   const modalRef = useRef<HTMLDivElement>(null);
   useEffect(() => {
     if (isOpen) {
       const focusable = modalRef.current?.querySelectorAll(
         'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
       );
       const first = focusable?.[0] as HTMLElement;
       const last = focusable?.[focusable.length - 1] as HTMLElement;
       // Trap Tab and Shift+Tab within modal
     }
   }, [isOpen]);

3. Focus not returned after modal close (3 modals affected):
   Closing modal sent focus to document.body
   User lost their place in the page
   Fix:
   const triggerRef = useRef<HTMLButtonElement>(null);
   // When modal closes:
   triggerRef.current?.focus();

4. Dropdown menus not keyboard-navigable:
   Arrow keys did nothing; Enter key did not select
   Tab moved to next focusable element, skipping the menu
   Fix: Added keydown handlers for ArrowUp / ArrowDown / Enter / Escape

5. Hidden elements focusable behind modals:
   Background DOM was not aria-hidden when modal was open
   Screen reader could read behind the modal
   Fix:
   // When modal opens:
   document.getElementById('main-content')
     ?.setAttribute('aria-hidden', 'true');
   // When modal closes: remove aria-hidden
```

---

## 4. Category 3: Colour Contrast (7 violations)

```
WCAG 1.4.3: Contrast (Minimum) — text: 4.5:1 (normal), 3:1 (large text ≥18pt)
WCAG 1.4.11: Non-text Contrast — UI components: 3:1

VIOLATIONS FOUND — and exact colour changes:

1. SAP primary brand blue text on white:
   Before: #0070D2 on #FFFFFF = 3.8:1  ❌
   After:  #0050AA on #FFFFFF = 6.2:1  ✅
   (Darkened the blue — brand team approved for UI component use)

2. Secondary label text (table column headers, filter labels):
   Before: #767676 on #FFFFFF = 4.48:1  ❌ (just below 4.5:1)
   After:  #636363 on #FFFFFF = 5.9:1   ✅

3. Icon-only toolbar buttons:
   Before: #AAAAAA icon on #FFFFFF = 2.1:1  ❌ (non-text contrast needs 3:1)
   After:  #767676 icon on #FFFFFF = 4.48:1 ✅

4. Input field placeholder text (5 filter inputs):
   Before: placeholder #AAAAAA on white = 2.1:1  ❌
   After:  #767676 placeholder supported by most browsers = 4.5:1  ✅
   (WCAG 2.1 doesn't require placeholder to pass contrast — but we fixed it
    for real usability; users with low vision couldn't read the hint text)

5. Disabled button state:
   Before: #CCCCCC text on #EEEEEE background = 1.6:1  ❌
   After:  Added a visible pattern/icon rather than colour-only disabled state;
           also improved contrast to 3.1:1 for the disabled label
   (WCAG 1.4.3 exempts disabled controls — but usability required the improvement)

TOOL USED FOR DISCOVERY:
  Chrome DevTools colour picker shows contrast ratio in real-time
  axe DevTools flags anything below the threshold automatically
  Colour Contrast Analyser (desktop tool) for checking design mockups
```

---

## 5. Category 4: Images and Alt Text (5 violations)

```
WCAG 1.1.1: Non-text Content

VIOLATIONS FOUND:

1. Decorative dividers had meaningless alt text:
   <img src="divider.svg" alt="divider">
   Screen reader announced "divider image" between every section
   Fix: <img src="divider.svg" alt="" role="presentation">

2. Sort order icons:
   <img src="sort-asc.svg" alt="icon">
   Screen reader announced "icon" — told the user nothing about sort state
   Fix: <img src="sort-asc.svg" alt="Sorted ascending">
   (Combined with aria-sort="ascending" on the <th> element)

3. Loading spinners:
   <img src="spinner.gif" alt="loading">
   For screen reader users, a spinner is the wrong pattern anyway
   Fix: Remove the spinner img; use:
   <div role="status" aria-live="polite">
     <span class="sr-only">Loading reports, please wait...</span>
   </div>

4. Brand logo:
   <img src="sap-logo.svg" alt="logo">
   Fix: <img src="sap-logo.svg" alt="SAP">
   (Describes what it is, not that it's a logo)

5. Error state illustrations:
   <img src="error-state.svg" alt="">  (empty — treated as decorative)
   But the illustration was the only indicator of an error state
   Fix: alt="An error occurred. No reports could be loaded."
```

---

## 6. Interview Questions & Model Answers

### Q1
**Interviewer asks:** "You mentioned 30+ violations. Can you name a few?"

**Hruday's answer:**
> "Yes — they fell into four groups. The biggest was missing ARIA labels: icon-only buttons with no accessible name, chart SVGs with no description, modal dialogs that weren't announced as dialogs to screen readers. Second was focus management: we had a global CSS rule that removed the focus outline entirely, modals didn't trap focus inside them, and closing a modal sent focus to the top of the page instead of the button that opened it. Third, colour contrast: SAP's brand blue on white was 3.8:1 — just below the 4.5:1 that WCAG requires for normal text. We darkened the blue to 6.2:1. Fourth, alt text: decorative dividers announced as 'divider image', sort icons labelled 'icon' instead of 'Sorted ascending'. We found nine of these through automated axe scanning; the rest showed up only in a manual keyboard walkthrough and a screen reader session with NVDA."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Vague violation list | "We had issues with colours and keyboard stuff" | Group by the four categories with specific criterion numbers (4.1.2, 2.4.7, 1.4.3, 1.1.1) |
| Only automated | "axe caught all issues" | "axe caught about 9 of the 13 ARIA label issues; manual NVDA walkthrough caught the rest — a button can have an aria-label attribute and axe is satisfied, but if the label says 'button' it tells the user nothing useful" |
| No tool knowledge | Not mentioning the discovery tools | "axe DevTools, Chrome DevTools contrast checker, Colour Contrast Analyser, NVDA on Windows, VoiceOver on macOS" |
| Not knowing the numbers | "Some ratio thing for contrast" | "4.5:1 for normal text, 3:1 for large text (≥18pt or 14pt bold), 3:1 for non-text UI components like icons and borders" |

---

## 8. Hruday's Real Experience Hook

> "The eye-opening moment was the screen reader session. I knew intellectually that icon-only buttons needed aria-label — axe had flagged them. But running NVDA through the dashboard filter flow made it concrete: Tab, Tab, Tab, 'button', Tab, 'button', Tab, 'button'. Six buttons in the toolbar with no names. A user navigating by screen reader heard only 'button' six times with no way to know what any of them did. That's not a WCAG criterion number — that's unusable. The automated scan gave me a list; the manual walkthrough gave me a sense of priority."

---

## 9. Scale Evolution

**One team, audit phase →** axe DevTools browser extension. Manual keyboard walkthrough. NVDA screen reader session. List of violations with criterion references.

**Multi-team micro-frontends →** axe-core integrated into each team's CI pipeline (fails PR on critical and serious violations). Shared accessible component library so charts and modals are already correct. Accessibility integration test: Playwright clicks through key user flows as keyboard-only.

**Enterprise product →** NVDA, JAWS, VoiceOver, TalkBack all tested per release. External VPAT audit annually. User research panel including users with disabilities. AT lab (assistive technology lab) for device testing.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow accessibility: if a user with a visual impairment cannot complete a transaction, it's a legal and ethical failure | Focus management in modals; ARIA live regions for error announcements |
| Swiggy / Meesho | Mobile app accessibility; TalkBack and VoiceOver on native apps follow same principles as web | Contrast ratios; alt text for product images; live region for cart count |
| Adobe / Microsoft | Document and creative tools must be deeply accessible; accessibility is part of the product identity | Complex ARIA patterns (tree views, data grids, rich text editors); AT compatibility testing |
| SAP Labs | You found and fixed 33 violations across 4 micro-frontend modules; you know the categories, the tools, and the criterion numbers | The only candidate who can name the violations, group them, and explain the fix for each |

---

*Part 23 · 30+ Violations — What They Were · Full Stack Interview Guide · Hruday D · 2026*
