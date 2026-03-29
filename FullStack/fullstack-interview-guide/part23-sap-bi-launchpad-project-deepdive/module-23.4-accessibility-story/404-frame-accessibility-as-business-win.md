# Frame Accessibility as a Business Win
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.4: The Accessibility Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three business frames for accessibility** — know which audience you're talking to: (1) revenue: WCAG AA violations were blocking VPAT approval, stalling enterprise deals; fixing them unblocked the pipeline; (2) legal/compliance: Section 508 (US federal), EAA (EU, June 2025), Equality Act (UK) — non-compliance is a lawsuit risk for an enterprise tool; (3) employee inclusion: enterprise tools used by employees with disabilities; excluding them is an HR and reputational risk for the customer
- **The one number that made leadership care immediately**: a large enterprise deal had been stalled for 3 months because the procurement checklist flagged accessibility violations in the VPAT; fixing accessibility = directly unblocking revenue in the current quarter
- **Technical fix → business outcome chain**: 33 violations → VPAT showed "Does Not Support" in key criteria → procurement team flags it → deal requires exception approval → quarter slips; fix the violations → VPAT updated to "Supports" → procurement check passes → deal moves forward
- **What NOT to say in a business meeting**: don't say "it's the right thing to do" first in a business conversation — that's true but not persuasive to someone managing a pipeline; lead with the deal, the compliance risk, the procurement check; the inclusion argument is then secondary
- **Career angle**: knowing how to frame technical work in business language is the difference between a developer who gets budget for the next improvement and one who doesn't; this framing is the skill interviewers are testing when they ask "why did you prioritise accessibility?"

---

## 1. One-Line Definition
Accessibility work got funded and prioritised because it was framed correctly: not as "the right thing to do" but as "unblocking a stalled enterprise deal, satisfying legal compliance requirements, and reducing HR liability for our customers."

---

## 2. The Three Business Frames

```
FRAME 1: REVENUE (most persuasive for product and sales leadership)
─────────────────────────────────────────────────────────────────
Situation:
  Enterprise procurement checklist at a large customer flagged WCAG violations
  The VPAT showed "Does Not Support" for 4 AA criteria
  Deal was on hold pending an exception approval from their accessibility team
  Deal had been in pipeline for 3 months with no movement

Connection:
  Accessibility violations → VPAT issue → procurement blocker → deal stall
  Fixing violations → VPAT updated → procurement check passed → deal moved

How to say it:
  "The accessibility work directly unblocked a deal that had been stalled for
   three months. The procurement team's accessibility checklist is a standard
   hurdle in enterprise procurement. Fixing the violations updated the VPAT,
   which satisfied the checklist. We don't know the exact deal value — that's
   sales data — but the connection between the technical work and the resumed
   pipeline conversation was direct."

──────────────────────────────────────────────────────────────────
FRAME 2: LEGAL COMPLIANCE (most persuasive for legal and compliance teams)
──────────────────────────────────────────────────────────────────
The laws:
  US: Section 508 — federal agencies and contractors; updated 2018
  US: ADA Title III — commercial SaaS; courts increasingly apply it
  EU: European Accessibility Act — enforceable June 2025; covers digital products
  UK: Equality Act 2010 — covers enterprise web applications
  Fines: EAA fines are at member state discretion; market exclusion is the practical risk

How to frame it:
  "With the EAA becoming enforceable in mid-2025, our European customers
   started flagging accessibility in contract reviews. An EU-based customer
   cannot legally procure a product that doesn't meet the standard. For SAP,
   which sells to European enterprises, this is a compliance pre-requisite,
   not a nice-to-have."

──────────────────────────────────────────────────────────────────
FRAME 3: EMPLOYEE INCLUSION (most persuasive for HR and DEI teams)
──────────────────────────────────────────────────────────────────
The situation:
  BI Launchpad is used by analysts and business users inside the customer's org
  ~15-20% of the working population has some form of disability
  (WHO estimate: 15% globally; often higher when including temporary disabilities)
  An employee who can't use the analytics tool can't do their job effectively

How to frame it:
  "Our customers' employees use this tool daily. If an employee with a visual
   impairment can't navigate the reports filter with a screen reader, they
   either need a workaround — expensive, slow — or they're effectively excluded
   from using the data. That's an HR risk for the customer: they may have DEI
   commitments and reasonable accommodation obligations that BI Launchpad's
   inaccessibility makes harder to fulfil."
```

---

## 3. The Stakeholder Translation Table

```
WHAT THE FIX WAS          WHAT TO SAY TO WHOM
─────────────────────────────────────────────────────────────────────────────
Added aria-label to 5     "Icon-only buttons were invisible to screen reader
icon buttons               users. Fixed with one attribute per button."
                           ← for engineers

                          "We resolved 5 WCAG AA violations (criterion 4.1.2)
                           that were showing as 'Does Not Support' in the VPAT.
                           Procurement checklists flag these specifically."
                           ← for product/sales leadership

─────────────────────────────────────────────────────────────────────────────
Fixed modal focus trap     "Added keyboard Tab cycling inside modal dialogs
                            so focus doesn't escape to background content."
                            ← for engineers

                           "Keyboard users and screen reader users couldn't
                            operate dialogs. This is a WCAG 2.1.1 failure —
                            it means the feature is legally non-compliant in
                            the US (Section 508) and EU (EAA)."
                            ← for legal/compliance

─────────────────────────────────────────────────────────────────────────────
Darkened SAP blue          "Colour contrast was 3.8:1. Changed token to
from #0070D2 to #0050AA    #0050AA which passes at 6.2:1."
                            ← for engineers

                           "Low vision users couldn't read our primary text
                            colour. Changed the design token once, applied
                            everywhere. Removed the last contrast violation
                            from the VPAT."
                            ← for design/product

─────────────────────────────────────────────────────────────────────────────
Added axe-core to CI       "Violations can't ship silently anymore. CI fails
                            if a critical/serious violation is introduced."
                            ← for engineers

                           "We locked in the compliance state. New code can't
                            accidentally break the VPAT status. This is
                            continuous compliance, not a one-time remediation."
                            ← for compliance/legal teams
```

---

## 4. Interview Questions & Model Answers

### Q1 — Business Frame Test
**Interviewer asks:** "Why did your team prioritise accessibility work? How did you get it into the roadmap?"

**Hruday's answer:**
> "Three things together made it prioritisable. The immediate trigger was a deal being stalled — a large enterprise customer's procurement team had flagged accessibility violations in our VPAT, and the deal needed exception approval to move. That's a direct revenue conversation. The second was compliance: the EU Accessibility Act became enforceable in June 2025, and our European customer conversations were starting to include accessibility requirements in contract reviews. The third was that we had a product audit that produced a list of 33 specific violations — it's much easier to resource a clarified list of fixable items than a vague 'we should do accessibility.' The combination of a stalled deal, a legal timeline, and a concrete fix list made it a straightforward roadmap prioritisation. We did the bulk of the work in a four-week sprint."

---

### Q2 — Outcome Connection
**Interviewer asks:** "How do you know the accessibility work had business impact?"

**Hruday's answer:**
> "The most direct signal: the enterprise deal that had been on hold moved forward after the VPAT was updated. I don't have access to sales numbers, but the procurement conversation that was blocked became unblocked. The second signal: after we updated the VPAT, our account team used it proactively in two other enterprise procurement conversations — they now had a document to submit rather than explaining an exception. The third signal, less direct but important: we added axe-core to CI, which means the compliance state is maintained automatically. Future teams can't silently introduce violations that would create the same procurement problem again. Locking in the gain is as important as achieving it."

---

## 5. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Wrong first frame | "We did it because it's the right thing to do" | Lead with the revenue frame (stalled deal, VPAT) and legal frame (Section 508, EAA); inclusion is true but not what gets roadmap priority in a B2B SaaS context |
| No business connection | "We fixed 33 violations" | "Fixing violations updated the VPAT → unblocked procurement conversation → deal resumed" |
| Vague compliance mention | "We had to comply with laws" | "Section 508 for US federal customers; EAA enforceable June 2025 for EU customers; Equality Act UK — these are specific laws with specific timelines and consequences" |
| Not knowing the VPAT | "Some document the customer asked for" | "The Voluntary Product Accessibility Template — enterprise procurement teams use it to evaluate WCAG conformance status per criterion; our 'Does Not Support' entries were flagged directly" |

---

## 6. Hruday's Real Experience Hook

> "The moment the business impact became clear was a weekly planning meeting where the product manager showed a summarised view of our enterprise pipeline. One deal was highlighted in yellow — 'blocked by accessibility'. That's the moment accessibility stopped being a technical backlog item and became a sprint commitment. The framing that worked wasn't about inclusion or WCAG criteria — it was 'this deal is blocked, here's the list of what's blocking it, here's how long it takes to fix each one.' A 4-week sprint cleared the block. The deal moved. That's the language that gets engineering work funded."

---

## 7. Scale Evolution

**Product audit + sprint fix →** VPAT updated. Deal unblocked. axe-core in CI prevents regression.

**Proactive VPAT management →** VPAT becomes a living document updated with each major release. Account team uses it in early-stage enterprise conversations. Reduced exception approval cycle time.

**Enterprise accessibility programme →** Annual third-party VPAT audit provides an independent certification. Accessibility is a named product feature in marketing materials. Procurement team has a direct link to the current VPAT. Accessibility roadmap shared with top customers quarterly.

---

## 8. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial products: RBI doesn't yet mandate WCAG but it's coming; enterprise customers (banks, NBFCs) are starting to add it to their vendor contracts | VPAT readiness; axe-core CI for continuous compliance |
| Swiggy / Meesho | Consumer: 15%+ of users have a disability; accessible checkout is better UX for everyone; risk of negative press from inaccessible checkout | Customer inclusion frame; keyboard operability for checkout flow |
| Adobe / Microsoft | Accessibility is a product differentiator and a Fortune 500 procurement requirement | Deep VPAT; accessibility as product marketing; AT compatibility programme |
| SAP Labs | You connected the technical fix to the commercial outcome; you know the VPAT, the laws, and the deal story | The candidate who can explain accessibility in a business planning meeting, not just in a code review |

---

*Part 23 · Frame Accessibility as a Business Win · Full Stack Interview Guide · Hruday D · 2026*
