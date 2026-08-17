# Story 3 — WCAG AA Certification: Quality, Customer Obsession
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Quality ownership, customer obsession, compliance-driven delivery, cross-functional leadership
- **When to use**: "Tell me about raising the bar on quality" · "When did you deliver for a specific type of customer need?" · "Describe delivering a certification or compliance requirement" · "Tell me about cross-functional work"
- **The headline numbers**: 47 screens audited and brought to WCAG 2.1 AA compliance; formal certification received; opened the app to public sector customers who legally require AA compliance
- **The key customer obsession signal**: this was not a regulatory fine threat — no one forced us; the decision to pursue formal certification was driven by a potential customer segment (public sector) that our product needed to address
- **Growth layer**: "I'd involve the design team's WCAG review at the wireframe phase — two components had to be visually reworked because colour ratios were below 4.5:1, which wasn't caught until the engineering audit; earlier design-phase check = no rework sprint"
- **Story length**: ~2 minutes

---

## 1. One-Line Definition
A 2-minute STAR story about leading the WCAG 2.1 Level AA accessibility certification of 47 screens in an Angular enterprise application — involving engineering, design, and product teams — to open the product to public sector customers who require legal AA compliance.

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | SAP Labs |
| **Product** | Angular-based procurement app |
| **Starting state** | No accessibility standard; no screen reader support; colour contrast violations; no keyboard navigation in custom components; no ARIA attributes |
| **Business driver** | A major public sector procurement agency (government customer) required WCAG 2.1 AA certification for procurement software used by their staff |
| **My role** | Frontend accessibility lead; drove the cross-functional initiative across engineering, design, and product |
| **What I did** | (1) Axe-core automated audit; (2) manual screen reader testing with NVDA; (3) design team WCAG review (caught before rework where possible); (4) component-level fixes; (5) CI axe integration; (6) formal certification via external auditor |
| **Result** | 47 screens certified WCAG 2.1 AA; formal certification letter issued; public sector customer segment unblocked |

---

## 3. Full STAR Script (2 minutes)

### Situation (12 seconds)
"At SAP Labs, a prospective public sector customer asked us for WCAG 2.1 AA compliance certification before they could include our procurement software in their approved vendor list. Accessibility was not something our product had formally addressed."

### Task (8 seconds)
"I volunteered to lead the certification initiative. The product had 47 screens. We had a 12-week window the customer set as their evaluation timeline."

### Action (80 seconds)
"I started with an automated audit using axe-core on every screen, which surfaces colour contrast violations, missing ARIA attributes, and structural issues. That gave me a full list of 140 issues across the 47 screens.

I then did manual testing with NVDA screen reader — automated tools catch about 30% of accessibility issues; the rest require a human navigating with keyboard-only and a screen reader. I found additional issues: form fields that weren't announcing their validation errors to screen readers, modals that didn't trap focus, and custom dropdown components that had no keyboard navigation at all.

I triaged with the design team first. Two components had colour contrast ratios below the WCAG 4.5:1 requirement — those required visual redesign, not just code changes. Getting design involved early meant those were resolved in parallel with the engineering fixes rather than as a serial dependency.

In the code, I fixed ARIA labelling across forms, implemented focus trapping in all modal components, added keyboard navigation to our custom dropdown, and fixed the eight colour contrast violations using our design token system — updating the semantic token values to compliant colours propagated to all components automatically.

I added axe-core to our CI pipeline to prevent regressions — any new accessibility violation would fail the build.

We engaged an external WCAG auditor in week 10. Two minor issues were found; I fixed both within two days."

### Result (20 seconds)
"All 47 screens received WCAG 2.1 Level AA certification from the external auditor. We delivered the certification letter to the customer in week 12. The public sector customer signed the contract. The CI axe gate continues to protect our accessibility standard on every PR. Two additional government procurement agencies have since referenced the certification in their own evaluation criteria."

---

## 4. Follow-Up Questions & Answers

### Q1 — Technical Depth
**"What are the key WCAG 2.1 requirements that engineers most commonly miss?"**

> Four categories come up most often in Angular applications:
>
> First — colour contrast. WCAG AA requires a 4.5:1 ratio for normal text and 3:1 for large text. Developers implement designs using whatever colour values design provides, and no one has checked the ratio. A tool like the Chrome Accessibility DevTools or a browser contrast checker surfaces this instantly — it's a five-second check most teams skip.
>
> Second — keyboard-only navigation. Every interactive element must be reachable by Tab and operable by Enter/Space. Custom components — dropdowns, date pickers, modal overlays — are the common failure points because they're built with `div` and `span` elements and don't receive native keyboard focus or events. ARIA roles plus explicit tabIndex plus keyboard event handlers fix it.
>
> Third — form error announcements. When a form field validation fails, the error message must be programmatically associated with the input via `aria-describedby` so screen readers announce it. Without this, a screen reader user submits the form, the page shows errors, and the user hears nothing.
>
> Fourth — focus management in modals. When a modal opens, focus should move into the modal. When it closes, focus should return to the trigger. Without this, a keyboard user opens a modal and their focus position is lost inside the background page.

### Q2 — Cross-Functional
**"How did you get the design team on board with the WCAG rework they hadn't planned for?"**

> I framed it as a business unlock, not a compliance problem. "We have a government customer who cannot sign unless we have this certification — and two of the design components will block certification unless we update the colour palette" is a very different conversation than "your colours violate accessibility rules."
>
> The design team was genuinely willing once they understood the customer impact. The visual changes were minimal — two component typographies shifted to slightly darker shades (still within the brand palette; compliant colours existed in our token system, they just weren't the ones chosen). It was a one-sprint visual adjustment, not a full redesign.
>
> The lesson: compliance issues die in the abstract ("we should care about accessibility"). They get fixed when connected to a concrete customer outcome (a named customer, a specific contract). I used the business case as the energy source for the cross-functional work.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd involve the design team in the WCAG review at the wireframe phase, not after final mockups. We reworked two components after high-fidelity designs were approved and assets had been exported to the developer handover. That's the most expensive point in the design process to make visual changes — screens need to be re-exported, all annotations updated, developer implementation partially redone.
>
> If I had shared the colour contrast requirement (4.5:1) and a contrast checker plugin link with the designer at wireframe stage, they would have chosen compliant colours before anything was finalised. The rework sprint would have been zero. Accessibility is a design constraint — it should enter the design process before colour decisions are locked, not after.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "Tell me about raising the quality bar" | 0 → 47 screens WCAG AA certified |
| "Describe a time you delivered for a specific customer need" | Public sector customer requirements → signed contract |
| "When did you impact company revenue through engineering work?" | The certification unlocked the customer contract |
| "Tell me about accessibility engineering" | Full WCAG 2.1 AA technical breakdown |
| "Describe leading a cross-functional initiative" | Engineering + design + product + external auditor |
| "Tell me about compliance delivery" | External audit, certification letter, 12-week deadline |

---

## 6. Numbers Reference Card

| Metric | Before | After |
|--------|--------|-------|
| Screens certified WCAG 2.1 AA | 0 | 47 |
| Accessibility issues found (automated) | — | 140 (across all screens) |
| Colour contrast violations | — | 8 fixed |
| CI accessibility gate | None | Active on every PR |
| Public sector customers using certification | 0 | 1 signed + 2 referencing in RFP |

---

## 7. Related Topics — What to Study Next
- **Topic 320 — Story 1 (Lighthouse)** — performance and quality stories pair well; prepare both in sequence to demonstrate range across technical domains
- **Topic 321 — Story 2 (Security)** — three quality stories (performance, security, accessibility): show breadth of what "quality ownership" means
- **Topic 329 — Owning Failures** — the growth layer about involving design at wireframe phase can segue into this topic if the interviewer probes failures

---

*Part 20 · Story 3: WCAG AA Certification · Full Stack Interview Guide · Hruday D · 2026*
