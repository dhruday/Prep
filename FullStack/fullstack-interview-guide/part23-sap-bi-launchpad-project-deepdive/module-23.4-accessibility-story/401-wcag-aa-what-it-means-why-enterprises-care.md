# WCAG AA — What It Means and Why Enterprises Care
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.4: The Accessibility Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **WCAG = Web Content Accessibility Guidelines**, published by the W3C; the standard for accessible web content globally
- **Three conformance levels**: A (minimum), AA (standard used by most enterprises and laws), AAA (strict — nearly impossible for complex apps); SAP BI Launchpad targeted AA
- **Four WCAG principles** — POUR: **P**erceivable, **O**perable, **U**nderstandable, **R**obust
- **Why enterprises care about it — three reasons**: (1) legal compliance — Section 508 (US federal), EAA (EU Accessibility Act enforced 2025), Equality Act (UK); non-compliance is a lawsuit risk for an enterprise tool; (2) enterprise procurement — Fortune 500 companies require VPAT (Voluntary Product Accessibility Template) before purchase; no WCAG AA = no sale; (3) employee inclusion — enterprise tools are used by employees with disabilities; excluding them is an HR and legal risk
- **The business impact at SAP**: BI Launchpad is sold to enterprises; the enterprise's procurement team checks the VPAT; if the VPAT doesn't exist or shows AA non-compliance, the deal is stalled; a large enterprise deal can be $500K+ so one VPAT gap can cost significant revenue
- **Key AA criteria to know**: 1.4.3 contrast ratio ≥ 4.5:1 for text, 2.4.7 visible focus indicator, 2.1.1 all functionality keyboard-operable, 4.1.2 all form controls have a name/role/value, 1.1.1 all images have alt text

---

## 1. One-Line Definition
WCAG 2.1 Level AA is the international standard for web accessibility — the baseline that laws in the US, EU, and UK require, that enterprise procurement departments check for, and that real users with visual, motor, auditory, or cognitive disabilities depend on to use the product.

---

## 2. WCAG Core Structure

```
FOUR PRINCIPLES (POUR):
  Perceivable   — users can perceive the content (see, hear, or feel it)
                  Example: images have alt text; video has captions
  Operable      — users can operate the interface without a mouse
                  Example: all interactive elements are keyboard-reachable
  Understandable — content and UI behave predictably
                  Example: error messages explain what to do, not just "error"
  Robust        — works with assistive technologies (screen readers, braille displays)
                  Example: ARIA roles and labels are correct for screen reader announcements

THREE CONFORMANCE LEVELS:
  A   — minimum: 30 criteria; skipping these blocks access entirely
  AA  — standard: 50 criteria (A + 20 more); what laws require; what VPATs cover
  AAA — strict: 78 criteria; not required by any law; impractical for complex apps

SAP BI LAUNCHPAD TARGET: Level AA

KEY AA CRITERIA HRUDAY FIXED:
  1.1.1 — Non-text content: chart SVGs had no alt text → screen reader said "image"
  1.4.3 — Contrast ≥ 4.5:1: SAP blue on white was 3.8:1 → darkened to 4.6:1
  1.4.11 — Non-text contrast ≥ 3:1: icon-only buttons had 2.1:1 ratio
  2.1.1 — Keyboard accessible: dropdown menus closed on Escape; had to trap Tab inside modal
  2.4.3 — Focus order: after modal close, focus returned correctly to the trigger button
  2.4.7 — Focus visible: removed :focus { outline: none } from global CSS
  4.1.2 — Name/role/value: icon-only buttons had no aria-label
```

---

## 3. The Law Landscape

```
US — Section 508 (1998, updated 2018):
  Applies to federal agencies and any contractor selling to them
  "Substantially equivalent access" to all users
  SAP sells to US federal government agencies → Section 508 compliance required

US — ADA Title III (case law since 2024):
  Courts increasingly apply ADA to commercial websites
  Domino's v. Robles (9th Circuit, 2019) — ADA applies to websites
  Enterprise SaaS is not exempt

EU — European Accessibility Act (EAA):
  Enforceable from June 2025
  Applies to digital products and services sold in EU member states
  SAP's European customers are covered
  Non-compliance → fines, removal from market

UK — Equality Act 2010 / BS 8878:
  Requires reasonable adjustments for disability
  Enterprise web applications are covered

HOW THIS AFFECTS A DEAL:
  Enterprise procurement checklist (standard at large companies):
    ✅ VPAT submitted and reviewed
    ✅ WCAG 2.1 AA claim substantiated with test evidence
    ✅ Known defects listed with planned remediation dates
    If ✅ boxes are not checked → deal requires exception approval → stalls
    A $500K+ deal stalling because of a missing VPAT is money lost in-quarter
```

---

## 4. The VPAT

```
VPAT = Voluntary Product Accessibility Template
  Template published by ITI (Information Technology Industry Council)
  Completed by the vendor (SAP), listing compliance status per criterion
  Four status categories:
    Supports              — fully meets the criterion
    Partially Supports    — meets it in some cases, not all
    Does Not Support      — fails the criterion
    Not Applicable        — criterion does not apply to this feature

WHY IT'S CALLED "VOLUNTARY":
  No law requires a VPAT document specifically
  But enterprise procurement processes require WCAG compliance evidence
  VPAT is the industry-standard format for providing that evidence
  In practice, "voluntary" means "you'll lose the deal if you don't have it"

SAP BI LAUNCHPAD VPAT SITUATION:
  Before: 30+ violations across the product → VPAT showed multiple "Does Not Support"
  After:  Accessibility fixes implemented → VPAT updated to "Supports" / "Partially Supports"
  Result: Procurement conversations moved forward again
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's WCAG AA and why did your team have to care about it?"

**Hruday's answer:**
> "WCAG 2.1 AA is the international standard for web accessibility — it's about 50 specific criteria covering four areas: whether content can be perceived, whether the interface can be operated without a mouse, whether it behaves predictably, and whether it works with assistive technology like screen readers. SAP sells BI Launchpad to enterprise customers. Two reasons drove us to care about it specifically. First, legal compliance: one of our large US customers is a federal agency, and Section 508 requires AA compliance for any tool they procure. The EU Accessibility Act became enforceable in 2025 for European customers. Second, procurement: enterprise companies check for a VPAT document — a template where we document our accessibility compliance status — before approving a purchase. We had a product audit that showed 30+ violations. Those violations were appearing in the VPAT as 'Does Not Support', which was stalling procurement conversations."

---

### Q2 — Trade-Off
**Interviewer asks:** "Do you think accessibility is worth the effort in B2B SaaS?"

**Hruday's answer:**
> "Yes — but the frame has to be right. In B2C, the argument is about user inclusion and moral responsibility, which is true but hard to prioritise in a backlog. In B2B enterprise SaaS, the argument is entirely economic: a procurement team check that fails accessibility costs you a deal valued at potentially hundreds of thousands. The VPAT is a required document in sourcing processes at large companies. An honest 'Does Not Support' entry is a blocker, not a footnote. Beyond procurement, enterprise tools are used by employees with disabilities. An employee who can't use the internal analytics tool either can't do their job or needs a workaround — both are HR issues. The remediation work in our case was about 4 weeks for a team of three. The return on that is measured in deals unblocked and compliance risk removed."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "What's AA mean?" | "I think it's like... intermediate level" | "Level AA = 50 criteria covering perceivability, operability, understandability, and robustness; it's what US Section 508, the EU Accessibility Act, and UK Equality Act require" |
| Why enterprises care | Vague: "for inclusivity" | Two specific reasons: legal compliance (Section 508, EAA June 2025) and procurement (VPAT required to close enterprise deals) |
| VPAT knowledge | "What's a VPAT?" | "The template enterprise procurement teams check — we list our conformance status per criterion; 'Does Not Support' entries stall deals" |
| Treating it as optional | "We did it as a nice-to-have" | "It was blocking enterprise sales conversations; 30+ violations showed as 'Does Not Support' in the VPAT" |

---

## 7. Hruday's Real Experience Hook

> "The moment accessibility became a priority in our team wasn't from a user complaint — it came from the sales team forwarding an email from a large enterprise customer's procurement office. The email listed four WCAG criteria where our VPAT showed 'Does Not Support' and asked for a remediation timeline before they could proceed. The deal had been in pipeline for months. That email translated accessibility criteria into a budget conversation immediately. We built a 4-week remediation sprint, fixed 27 of the 30+ violations, and updated the VPAT. The deal moved forward. That's how B2B accessibility gets resourced."

---

## 8. Scale Evolution

**Single app →** Manual accessibility audit with axe DevTools. VPAT completed for current state. Fix list prioritised by severity.

**Multi-module app (micro-frontends) →** Each team runs axe-core in CI. Shared accessible component library so the same chart component has the right ARIA roles everywhere. Accessibility champions in each team.

**Enterprise platform →** Annual third-party VPAT audit. User research with users with disabilities. AT (assistive technology) lab testing (NVDA/JAWS on Windows, VoiceOver on macOS, TalkBack on Android).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial products: if a user with a visual impairment can't complete a payment, it's a legal and regulatory issue | Know Section 508 + EAA; relate to payment flow keyboard operability |
| Swiggy / Meesho | Consumer apps: mobile accessibility (TalkBack, VoiceOver) for 2%+ of users; WCAG mobile guidelines | Focus on 1.4.3 contrast, 2.1.1 keyboard, touch target sizes |
| Adobe / Microsoft | Enterprise SaaS: VPAT is a standard procurement document; accessibility is part of the product contract | VPAT process; "Does Not Support" → "Supports" narrative |
| SAP Labs | You built this fix — 30+ violations to AA compliance; VPAT updated; deal unblocked | The candidate who connects WCAG criteria directly to enterprise revenue impact |

---

*Part 23 · WCAG AA — What It Means and Why Enterprises Care · Full Stack Interview Guide · Hruday D · 2026*
