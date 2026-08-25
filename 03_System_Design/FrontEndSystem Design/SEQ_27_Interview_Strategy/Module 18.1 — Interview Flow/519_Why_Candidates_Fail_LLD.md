# 519. Why Candidates Fail LLD / Machine Coding Rounds

────────────────────────────────────
## 1. The Failure Statistics
────────────────────────────────────

Based on publicly available interview data and NamasteDev course insights, ~60-70% of candidates fail LLD/Machine Coding rounds at FAANG companies. The failures cluster into predictable patterns.

────────────────────────────────────
## 2. Top 10 Failure Reasons
────────────────────────────────────

### Rank 1: Zero Accessibility (40% of failures)

**The Pattern:** Candidate builds a working component with no ARIA roles, no keyboard navigation, no focus management. Uses `<div onClick>` instead of `<button>`. No `aria-expanded`, no `aria-controls`, no `role`.

**Why It Fails:** At Google/Microsoft/Adobe, accessibility is 30% of the LLD rubric. Zero a11y = automatic rejection at senior level.

**The Fix:** Learn the top 7 WAI-ARIA patterns (Accordion, Tabs, Dialog, Combobox, Menu, Tree, Tooltip). Start every LLD answer by writing the ARIA pattern first, THEN implement.

---

### Rank 2: No Requirements Clarification (35% of failures)

**The Pattern:** Candidate hears "Build an accordion" and immediately starts coding. Doesn't ask about single vs. multi-expand, animation requirements, or screen reader expectations.

**Why It Fails:** Signals mid-level thinking. Senior engineers clarify ambiguity before committing to an approach.

**The Fix:** Spend 3-5 minutes asking: "Single or multi-expand? Animated transitions? Keyboard navigation per WAI-ARIA? Controlled or uncontrolled?"

---

### Rank 3: Div Soup — No Semantic HTML (30% of failures)

**The Pattern:** Everything is a `<div>`. Buttons are `<div onClick>`. Lists are nested `<div>`s. No `<button>`, `<ul>`, `<nav>`, `<main>`, `<header>`, `<fieldset>`.

**Why It Fails:** Non-semantic HTML is invisible to screen readers and lacks default keyboard behavior. Interviewers at FAANG explicitly check for semantic elements.

**The Fix:** Use `<button>` for clickable actions, `<a>` for navigation, `<input>` for form fields. If you must use `<div>`, add `role` and `tabindex`.

---

### Rank 4: No TypeScript Types (25% of failures)

**The Pattern:** All props are `any`. No interfaces defined. Function parameters untyped.

**Why It Fails:** TypeScript is the standard at FAANG. Untyped code signals junior-level engineering.

**The Fix:** Define interfaces for props, state, and API responses. Use generics where appropriate. Type event handlers.

---

### Rank 5: State Spaghetti (25% of failures)

**The Pattern:** 8 useState hooks with complex interdependencies. State duplication. No clear state machine.

**Why It Fails:** Unmaintainable state = unmaintainable component. Senior engineers use reducers or state machines for complex state.

**The Fix:** If you have >3 related state variables, use `useReducer`. Draw a state machine before coding. Consider: expanded/collapsed, loading/success/error, idle/dragging/dropped.

---

### Rank 6: Jumping to Code Without Design (20% of failures)

**The Pattern:** Starts writing JSX within 30 seconds. No component API design, no ARIA planning, no state discussion.

**Why It Fails:** The design discussion IS the interview. Code is just evidence that you can implement what you designed.

**The Fix:** Spend first 15 minutes on: requirements → API design → ARIA pattern → keyboard table → state machine. THEN code.

---

### Rank 7: No Keyboard Navigation (20% of failures)

**The Pattern:** Component works with mouse only. Tab doesn't reach interactive elements. Arrow keys do nothing. No focus indicators.

**Why It Fails:** Keyboard is how 15% of users interact. WCAG 2.1.1 requires keyboard operability. It's on every FAANG rubric.

**The Fix:** For every component, define a keyboard table: Tab, Enter/Space, Arrow keys, Escape, Home, End. Implement `onKeyDown`.

---

### Rank 8: Over-Engineering (15% of failures)

**The Pattern:** Building a design system component with 30 variants when the interviewer asked for a simple accordion. Adding Redux for a single component's state.

**Why It Fails:** Time is wasted on unnecessary complexity. Core features aren't complete.

**The Fix:** Build the minimum viable component first. Extend if time allows. Say: "I'd add [feature] but let me get the core working first."

---

### Rank 9: No Error/Edge Case Handling (15% of failures)

**The Pattern:** Happy path works. Empty state? Crash. 100 items? No virtualization. RTL? Broken. SSR? Hydration mismatch.

**Why It Fails:** Production components must handle edge cases. Mentioning them (even without implementing all) shows senior thinking.

**The Fix:** Last 5 minutes: "Let me cover edge cases — empty state, overflow, RTL support, and SSR compatibility."

---

### Rank 10: Poor Communication (10% of failures)

**The Pattern:** Codes silently for 40 minutes. No explanation of design decisions or trade-offs.

**Why It Fails:** The interviewer can't evaluate your thinking if you don't share it.

**The Fix:** Think aloud. "I'm choosing a controlled component pattern because..." "I'm using `aria-activedescendant` here instead of roving tabindex because..."

────────────────────────────────────
## 3. The Fix — Pre-Flight Checklist
────────────────────────────────────

Before starting any LLD question, check:

- [ ] Requirements clarified (scope, features, constraints)
- [ ] Props interface defined (TypeScript)
- [ ] ARIA pattern identified (from WAI-ARIA spec)
- [ ] Keyboard table written
- [ ] State machine sketched
- [ ] Semantic HTML planned (`<button>`, `<ul>`, etc.)
- [ ] Edge cases listed (empty, overflow, RTL, SSR)

────────────────────────────────────
## 4. Memory Aid
────────────────────────────────────

**"FAANG LLD failures = ASK-TIC":**
- **A**ccessibility missing (ARIA, keyboard, focus)
- **S**emantic HTML missing (div soup)
- **K**ey requirements not clarified
- **T**ypes not defined (TypeScript)
- **I**mplementation before design
- **C**ommunication gaps

**If you go blank:** "The #1 reason candidates fail LLD rounds is zero accessibility. Start with the ARIA pattern and keyboard table — those alone put you above 60% of candidates."
