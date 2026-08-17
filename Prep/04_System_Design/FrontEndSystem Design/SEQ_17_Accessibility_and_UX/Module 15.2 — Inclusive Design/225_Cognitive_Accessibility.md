# 225 – Cognitive Accessibility — Plain Language, Error Prevention

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Cognitive accessibility ensures that web applications are usable by people with **cognitive disabilities** — including dyslexia, ADHD, autism spectrum conditions, intellectual disabilities, memory impairments, and age-related cognitive decline. This affects **10-15% of the global population**. Unlike visual accessibility (solved with ARIA and screen readers) or motor accessibility (solved with keyboard navigation), cognitive accessibility requires **design-level thinking**: plain language, error prevention (not just error recovery), predictable navigation, clear feedback, and reduced cognitive load. WCAG 2.2 added new cognitive accessibility criteria (3.3.7 Redundant Entry, 3.3.8 Accessible Authentication), signaling that this is the next major frontier of web accessibility.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Core Principles of Cognitive Accessibility

| Principle | What It Means | Implementation |
|-----------|--------------|----------------|
| **Plain Language** | Write at an 8th-grade reading level | Short sentences, common words, avoid jargon |
| **Error Prevention** | Prevent mistakes, don't just report them | Confirmations, undo, inline validation, autosave |
| **Predictability** | Consistent patterns across the app | Same navigation, same button positions, same terminology |
| **Reduced Cognitive Load** | Show less, group logically | Progressive disclosure, chunking, one task per screen |
| **Clear Feedback** | Confirm every user action | Success messages, progress indicators, state changes |
| **Memory Independence** | Don't require users to remember across steps | Show context, pre-fill data, persistent breadcrumbs |

### WCAG 2.2 Cognitive Accessibility Criteria

| Criterion | Level | What It Requires |
|-----------|-------|-----------------|
| 3.3.7 Redundant Entry | A | Don't ask for the same info twice in a multi-step flow |
| 3.3.8 Accessible Authentication | AA | Don't require cognitive function tests (CAPTCHA memorization) for login |
| 3.2.6 Consistent Help | A | Help mechanism must be in same location on every page |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | No object recognition or personal content recognition for auth |

### Implementation Patterns

**Error Prevention > Error Recovery:**
```html
<!-- ❌ Error recovery only -->
<form>
  <input type="text" name="email" />
  <button type="submit">Submit</button>
  <!-- Error shown AFTER submission -->
  <div class="error">Invalid email format</div>
</form>

<!-- ✅ Error prevention (cognitive-friendly) -->
<form>
  <label for="email">Email address</label>
  <input type="email" id="email" 
         aria-describedby="email-hint email-error"
         autocomplete="email" 
         inputmode="email" />
  <div id="email-hint" class="hint">Example: name@company.com</div>
  <div id="email-error" class="error" role="alert" aria-live="polite">
    <!-- Real-time validation feedback -->
  </div>
</form>
```

**Progressive Disclosure:**
```tsx
// Show complexity only when needed
function CheckoutForm() {
  const [showGiftOptions, setShowGiftOptions] = useState(false);
  
  return (
    <form>
      {/* Essential fields first */}
      <AddressSection />
      <PaymentSection />
      
      {/* Optional complexity hidden until needed */}
      <button type="button" onClick={() => setShowGiftOptions(true)}>
        🎁 Add gift wrapping (optional)
      </button>
      {showGiftOptions && <GiftOptionsSection />}
      
      <SubmitButton />
    </form>
  );
}
```

**Consistent Help Pattern (WCAG 3.2.6):**
```tsx
// Help mechanism in the same location on every page
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      {/* Always in bottom-right, every page */}
      <HelpButton position="fixed-bottom-right" />
      <Footer />
    </div>
  );
}
```

### Anti-Patterns

- ❌ **Wall of text without structure** — use headings, bullet points, short paragraphs
- ❌ **Time-limited tasks without extension** — WCAG 2.2.1 requires ability to extend, turn off, or adjust time limits
- ❌ **Disappearing error messages** — keep errors visible until the user fixes them
- ❌ **Complex CAPTCHA** — WCAG 3.3.8 prohibits cognitive function tests for authentication
- ❌ **Multi-step forms without context** — show where the user is (step 2 of 4) and what they've already entered
- ❌ **Inconsistent terminology** — using "Cart," "Basket," and "Bag" interchangeably confuses users with cognitive disabilities

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs — Invoice Approval Error Prevention

At SAP, the Invoice Approval flow had a single "Approve" button that immediately submitted approval with no confirmation. Users with cognitive disabilities accidentally approved incorrect invoices. We added: (1) a confirmation dialog showing invoice summary, (2) a 10-second undo window after approval, and (3) inline preview of what would change. Error rates dropped by 40%.

### FAANG: Microsoft 365

Microsoft 365 uses progressive disclosure extensively — Outlook shows essential email fields by default, with "More options" for CC, BCC, importance. This reduces cognitive load for simple tasks while allowing power users to access all features.

### FAANG: Google Forms

Google Forms implements error prevention — it validates each field in real-time with clear, persistent error messages. Required fields are clearly marked with explanatory text, not just a red asterisk.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Cognitive accessibility is about reducing cognitive load and preventing errors, not just detecting them. It affects 10-15% of users — people with ADHD, dyslexia, memory impairments, or age-related cognitive decline.*

*My approach has four pillars: (1) Plain language — write at 8th-grade reading level, short sentences, no jargon. (2) Error prevention — real-time validation, confirmation dialogs for destructive actions, undo capability. (3) Predictability — consistent navigation, terminology, and help location across every page (WCAG 3.2.6). (4) Progressive disclosure — show only what's needed now, reveal complexity on demand.*

*WCAG 2.2 added new cognitive criteria — 3.3.7 Redundant Entry (don't ask for the same info twice) and 3.3.8 Accessible Authentication (no CAPTCHA-style cognitive tests for login). At SAP, we added confirmation dialogs and undo for invoice approvals, reducing accidental approvals by 40%."*

### Likely Follow-up Questions

1. **"How do you measure cognitive accessibility?"** — No single automated metric. Use readability scores (Flesch-Kincaid), task completion rates, error rates, and user testing with participants who have cognitive disabilities.
2. **"What about CAPTCHA?"** — WCAG 3.3.8 prohibits cognitive function tests. Use alternatives: passkeys, email magic links, SMS verification.
3. **"Error prevention vs error recovery — which is more important?"** — Prevention always. Users with memory impairments may not understand error messages or how to fix them.

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Design for the stressed, tired, distracted version of every user."** Cognitive accessibility isn't only for people with diagnosed disabilities — it's for everyone at their worst moment: tired, stressed, multitasking, unfamiliar with technology. Four pillars: **Plain language, Error prevention, Predictability, Progressive disclosure**. The mnemonic: **PEPP** (Prevent errors, Easy language, Predictable patterns, Progressive disclosure).

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ 10-15% of the population has a cognitive disability. Everyone experiences cognitive impairment situationally (stress, fatigue, multitasking). Cognitive accessibility improves UX for ALL users, not just those with disabilities.

**How it works:**
→ Apply four principles: plain language (8th-grade level), error prevention (validate early, confirm destructive actions, provide undo), predictability (consistent patterns), and progressive disclosure (show less, reveal on demand). WCAG 2.2 codifies these principles with specific success criteria.

**Company relevance:**
→ **Microsoft**: Microsoft's Inclusive Design toolkit emphasizes cognitive accessibility. Expected in product design discussions.
→ **Adobe**: Adobe's content authoring tools must themselves be cognitively accessible. Document Cloud accessibility is a key differentiator.
→ **Salesforce**: CRM users often multitask — cognitive accessibility directly impacts Salesforce user productivity.
→ **Cisco**: Webex meetings involve high cognitive load — interface simplicity is critical.
