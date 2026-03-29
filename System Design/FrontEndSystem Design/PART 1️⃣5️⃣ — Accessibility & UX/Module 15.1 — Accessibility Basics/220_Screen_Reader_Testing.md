# 220 – Screen Reader Testing — NVDA, VoiceOver, JAWS

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Screen reader testing validates that your web application is **usable by people who cannot see the screen** — users who rely on software that reads aloud the content, structure, and interactive elements of a page. The three dominant screen readers are **NVDA** (free, Windows, ~40% market share), **JAWS** (paid, Windows, ~30%), and **VoiceOver** (built into macOS/iOS, ~25%). Testing with actual screen readers is non-negotiable because automated tools (axe, Lighthouse) catch only 30-40% of accessibility issues — the remaining 60-70% require manual screen reader testing to discover. At companies like Microsoft and Adobe, screen reader compatibility is a **ship-blocking requirement**.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### How Screen Readers Work (Browser Internals)

```
DOM (Document Object Model)
    ↓ (Browser builds)
Accessibility Tree (parallel to render tree)
    ↓ (Exposes via OS accessibility APIs)
Platform API (MSAA/UIA on Windows, NSAccessibility on macOS)
    ↓ (Screen reader queries)
Screen Reader (NVDA / JAWS / VoiceOver)
    ↓ (Announces to user)
Speech Synthesizer / Braille Display
```

The browser constructs an **Accessibility Tree** from the DOM — a simplified tree containing only semantically meaningful nodes. Each node has:
- **Role**: button, link, heading, textbox, etc.
- **Name**: the accessible name (from `aria-label`, `<label>`, visible text)
- **State**: disabled, expanded, checked, selected
- **Value**: current text input value, slider position

**Critical insight:** Screen readers don't read the visual layout. They read the accessibility tree. If your `<div>` looks like a button but has no role or label, it's **invisible to screen readers**.

### Testing Methodology

**The NVDA Testing Protocol:**
1. Open NVDA (Insert key activates)
2. Navigate with Tab (interactive elements) + Arrow keys (content)
3. Test these specific scenarios:
   - Can I reach every interactive element with Tab?
   - Does each element announce its role and name? ("Button: Submit" not just "Submit")
   - Do form fields announce their labels?
   - Do error messages announce automatically (via `role="alert"` or `aria-live`)?
   - Can I operate dropdowns, modals, date pickers with keyboard alone?
   - Does focus management work in SPAs? (After route change, where does focus go?)

**VoiceOver Testing Protocol (macOS):**
1. Activate with Cmd+F5
2. Navigate with VO+Right Arrow (next element)
3. Interact with VO+Space (activate)
4. Check rotor (VO+U) — lists all headings, links, landmarks on the page

**Common Screen Reader Differences:**

| Behavior | NVDA | JAWS | VoiceOver |
|----------|------|------|-----------|
| Browse mode | Virtual buffer | Virtual buffer | No virtual buffer |
| Heading navigation | H key | H key | VO+Cmd+H |
| Table reading | Ctrl+Alt+Arrows | Ctrl+Alt+Arrows | VO+Arrows |
| Live region support | Good | Good | Inconsistent |
| `role="application"` | Exits browse mode | Exits browse mode | Ignored |

### Anti-Patterns & Pitfalls

- ❌ **Testing only with automated tools** — axe catches missing alt text but not "does the screen reader flow make sense?"
- ❌ **Using `aria-label` on non-interactive elements** — screen readers may ignore `aria-label` on `<div>` or `<span>` in browse mode
- ❌ **Hiding content visually and assuming it's hidden from SR** — `display:none` hides from SR, but `opacity:0` doesn't
- ❌ **Not testing focus management in SPAs** — after a dynamic view change, focus stays on a destroyed element = screen reader announces nothing
- ❌ **Using `role="application"` casually** — disables browse mode, users lose H/K/T navigation shortcuts
- ❌ **Not announcing dynamic content** — adding items to a list without `aria-live` = invisible to screen readers

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs — WCAG AA Screen Reader Testing

At SAP, the WCAG AA certification required screen reader testing with NVDA and JAWS on Windows, plus VoiceOver on Mac. We discovered critical issues that automated tools missed: our custom dropdown component announced "clickable" instead of "combobox, collapsed, 5 of 10 items." We rewrote the component with proper `role="combobox"`, `aria-expanded`, `aria-activedescendant`, and `aria-owns`. Post-fix, NVDA announced: "Priority combobox, collapsed. High, 3 of 5."

### FAANG-Scale: Microsoft

Microsoft requires NVDA and JAWS testing for every feature shipped in Office 365 and Teams. Their internal testing matrix includes 12 screen reader + browser combinations. Microsoft's Accessibility Insights tool captures the accessibility tree for automated + manual verification.

### FAANG-Scale: Adobe

Adobe's accessibility team tests every Creative Cloud component with all three major screen readers. They maintain a "screen reader test script" for each component type (modal, datepicker, combobox, tree view) that verifies specific announcements.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Screen reader testing is the layer that automated tools can't replace. Axe and Lighthouse catch about 30-40% of accessibility issues — missing alt text, no labels, contrast violations. But the other 60% — focus management in SPAs, dynamic content announcements, custom widget operability — requires manual testing with actual screen readers.*

*I test with NVDA on Windows (free, most popular) and VoiceOver on macOS. My testing protocol covers: Tab navigation to every interactive element, verifying each element announces its role and name correctly, checking that form errors announce via aria-live regions, and validating focus management after route changes.*

*At SAP during WCAG AA certification, we discovered our custom dropdown announced 'clickable' instead of the proper combobox role with expanded state and selected item position. Automated tools marked it as passing because it had an aria-label. Only NVDA testing revealed the broken semantics."*

### Likely Follow-up Questions

1. **"What's the difference between NVDA and JAWS?"** — NVDA is free, open-source, more standards-compliant. JAWS is commercial, more forgiving of non-standard markup. Test with both to cover real-world user base.
2. **"How do you handle focus management in SPAs?"** — After a route change, programmatically move focus to the new page's `<h1>` or main content area. Announce the page title via a visually-hidden live region.
3. **"What can't automated tools catch?"** — Focus order logic, screen reader announcement phrasing, custom widget operability, dynamic content announcement timing, and whether the reading order makes semantic sense.
4. **"How do you integrate SR testing into CI?"** — You can't fully automate it, but you can automate the accessibility tree snapshot and compare against expected roles/names. Manual SR testing happens in QA sprint cycles.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Common screen reader fixes — before and after

// ❌ BEFORE: Custom dropdown — screen reader announces "clickable"
<div class="dropdown" onclick="toggleDropdown()">
  <span>High Priority</span>
  <div class="dropdown-menu" style="display: none">
    <div onclick="select('low')">Low</div>
    <div onclick="select('medium')">Medium</div>
    <div onclick="select('high')">High</div>
  </div>
</div>

// ✅ AFTER: Proper ARIA — NVDA announces "Priority combobox, collapsed. High, 3 of 3"
<div role="combobox" aria-expanded="false" aria-haspopup="listbox"
     aria-label="Priority" aria-activedescendant="option-high"
     tabindex="0" onkeydown="handleComboKey(event)">
  <span>High Priority</span>
  <ul role="listbox" id="priority-listbox" aria-label="Priority options">
    <li role="option" id="option-low" aria-selected="false">Low</li>
    <li role="option" id="option-medium" aria-selected="false">Medium</li>
    <li role="option" id="option-high" aria-selected="true">High</li>
  </ul>
</div>

// SPA focus management after route change
function onRouteChange(newRoute: string): void {
  // Wait for new content to render
  requestAnimationFrame(() => {
    const heading = document.querySelector('h1');
    if (heading) {
      (heading as HTMLElement).focus();
      // Announce page title to screen readers
      announceToScreenReader(`Navigated to ${heading.textContent}`);
    }
  });
}

function announceToScreenReader(message: string): void {
  const liveRegion = document.getElementById('sr-announcer');
  if (liveRegion) {
    liveRegion.textContent = '';
    // RAF ensures SR picks up the change
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }
}

// In HTML: <div id="sr-announcer" aria-live="polite" class="sr-only"></div>
// .sr-only { position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0) }
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Automated tools catch the syntax; screen readers test the experience."** axe finds missing `alt` text. NVDA reveals that your modal traps focus incorrectly, your dropdown announces "clickable" instead of "combobox," and your route changes leave focus on destroyed elements. Test with Tab, then test with NVDA, then test with VoiceOver. The three things that break most often: **focus management**, **dynamic content announcements**, and **custom widget semantics**.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ 15% of the global population has some form of disability. Automated accessibility tools only catch 30-40% of issues. Without manual screen reader testing, you're shipping inaccessible software and exposing your company to ADA/EAA litigation risk.

**How it works:**
→ Screen readers query the browser's Accessibility Tree (built from the DOM + ARIA attributes). The accessibility tree exposes role, name, and state for each element. Testing involves navigating the page with keyboard + screen reader and verifying that every interactive element is reachable, operable, and correctly announced.

**Company relevance:**
→ **Microsoft**: Screen reader testing is ship-blocking for all Office 365 products. Microsoft built Accessibility Insights specifically for this.
→ **Adobe**: Adobe Creative Cloud components require testing with NVDA, JAWS, and VoiceOver. Adobe's design system (Spectrum) has built-in screen reader testing scripts.
→ **Salesforce**: Lightning Design System (SLDS) components are tested with screen readers. LWC components must pass NVDA testing.
→ **Cisco**: Cisco Webex accessibility is a major product differentiator — screen reader support in video conferencing is legally mandated in many markets.
