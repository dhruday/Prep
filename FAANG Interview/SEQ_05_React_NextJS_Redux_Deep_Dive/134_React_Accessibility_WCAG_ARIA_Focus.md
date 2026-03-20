# 134. React Accessibility (a11y) — WCAG, ARIA, Focus Management
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Accessibility (a11y) in React means building UIs usable by people with disabilities — screen reader users, keyboard-only navigation, low vision, motor impairments. The standard is **WCAG 2.1 AA** (Web Content Accessibility Guidelines — 4 principles: Perceivable, Operable, Understandable, Robust). The implementation has three layers: **Semantic HTML** (use `<button>`, `<nav>`, `<h1>-<h6>`, `<label>` — screen readers understand these natively), **ARIA** (Accessible Rich Internet Applications — add roles and attributes that HTML alone can't express for dynamic components like modals, tabs, comboboxes), and **Focus Management** (ensure focus follows the user's interaction: trap focus in modals, restore focus on close, manage focus on route changes). In React, accessibility bugs are often introduced by using `<div onClick>` instead of `<button>`, un-labelled form inputs, or missing focus traps in modals.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Semantic HTML First (ARIA is the backup)

```typescript
// The five most common accessibility anti-patterns in React:

// ❌ 1. div as button (no keyboard access, no screen reader role)
<div onClick={handleSubmit} className="btn">Submit</div>

// ✅ Use real button (keyboard focusable, Space/Enter activated, role="button" free)
<button onClick={handleSubmit} type="button">Submit</button>

// ❌ 2. Input without label (screen reader can't announce what field this is)
<input type="text" placeholder="Email" />

// ✅ Associate label explicitly
<label htmlFor="email">Email address</label>
<input id="email" type="email" />
// Or: aria-label for compact UI where visible label isn't possible:
<input type="text" aria-label="Search products" placeholder="Search..." />

// ❌ 3. Icon button with no accessible name
<button onClick={handleClose}><XIcon /></button>  // Screen reader says "button"

// ✅ Accessible name via aria-label
<button onClick={handleClose} aria-label="Close modal" type="button">
  <XIcon aria-hidden="true" />  // hide decorative icon from screen reader
</button>

// ❌ 4. Images without alt text
<img src="/product.jpg" />

// ✅ Descriptive alt for meaningful images, empty alt for decorative
<img src="/product.jpg" alt="Blue running shoes with white sole" />
<img src="/decorative-squiggle.svg" alt="" />  // decorative: empty string (not "decorative")

// ❌ 5. Custom modal without focus trap / ARIA
<div className="modal">...</div>

// ✅ Proper modal (see focus management section below)
```

### ARIA — When HTML Semantics Are Insufficient

```typescript
// Rule: No ARIA is better than bad ARIA.
// First rule of ARIA: don't use ARIA if native HTML can do it.

// ---- Tabs (no native HTML element) ----
function TabPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Overview', 'Details', 'Reviews'];

  return (
    <div>
      {/* tablist: container for tabs */}
      <div role="tablist" aria-label="Product information">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            role="tab"
            id={`tab-${index}`}
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}     // links tab to panel
            tabIndex={activeTab === index ? 0 : -1}  // roving tabindex
            onClick={() => setActiveTab(index)}
            onKeyDown={e => handleTabKeyDown(e, index, tabs.length, setActiveTab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}    // links panel to tab
          hidden={activeTab !== index}        // hidden: completely hidden from AT
          tabIndex={0}                        // panelbe focusable
        >
          <Tab{index}Content />
        </div>
      ))}
    </div>
  );
}

// Arrow key navigation for tabs (roving tabindex pattern)
function handleTabKeyDown(
  e: React.KeyboardEvent,
  currentIndex: number,
  total: number,
  setActive: (i: number) => void
) {
  const KEYS = { ArrowLeft: -1, ArrowRight: 1, Home: -currentIndex, End: total - 1 - currentIndex };
  const delta = KEYS[e.key as keyof typeof KEYS];
  if (delta !== undefined) {
    e.preventDefault();
    const newIndex = (currentIndex + delta + total) % total;
    setActive(newIndex);
    // Focus the new tab button:
    document.getElementById(`tab-${newIndex}`)?.focus();
  }
}

// ---- Live regions: announce dynamic content ----
// aria-live: screen readers announce content changes in this region
function StatusMessage({ message }: { message: string | null }) {
  return (
    // polite: announces after current speech finishes (for non-critical updates)
    <div aria-live="polite" aria-atomic="true">
      {message}
    </div>
    // assertive: interrupts immediately (use ONLY for critical alerts)
  );
}

// ---- Progress indicators ----
function LoadingSpinner({ progress }: { progress?: number }) {
  if (progress !== undefined) {
    return (
      <progress
        value={progress}
        max={100}
        aria-label="Upload progress"
      >
        {progress}%
      </progress>
    );
  }
  return (
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <Spinner />  {/* visual only — role="status" announces to screen reader */}
    </div>
  );
}
```

### Focus Management — Modal Pattern

```typescript
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

// Focus trap: all Tab navigation stays within the modal
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => !el.hasAttribute('disabled') && !el.closest('[hidden]'));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // ① Save the element that opened the modal (to restore focus on close)
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // ② Move focus into modal when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = getFocusableElements(modalRef.current);
      const firstFocusable = focusable[0];
      firstFocusable?.focus();  // focus first interactive element
    }
  }, [isOpen]);

  // ③ Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // ④ Trap focus inside modal
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = getFocusableElements(modalRef.current);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();  // Shift+Tab from first → wrap to last
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();  // Tab from last → wrap to first
    }
  };

  // ⑤ Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    // aria-modal prevents virtual cursor from leaving the modal on some screen readers
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      onKeyDown={handleKeyDown}
      style={{ position: 'fixed', inset: 0 }}
    >
      {/* Backdrop: clicking closes the modal */}
      <div
        aria-hidden="true"  // decorative — screen readers ignore backdrop
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
      />

      <div role="document" style={{ position: 'relative', background: 'white', padding: '24px' }}>
        <h2 id="modal-title">{title}</h2>

        <button
          type="button"
          aria-label={`Close ${title} dialog`}
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          ×
        </button>

        {children}
      </div>
    </div>,
    document.body
  );
}
```

### Focus Management — Route Changes (SPA Navigation)

```typescript
// In SPAs, route changes don't naturally move focus — screen reader users
// stay at the last focused element on the old page and can miss new content

// Next.js App Router: use context or a page title focus mechanism
// Option: announce page title on navigation, move focus to main content area

'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus to main content on route change
    // tabIndex={-1} makes it programmatically focusable
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div
      ref={mainRef}
      tabIndex={-1}
      style={{ outline: 'none' }}  // don't show focus ring on the div
    >
      {/* Route change focus target */}
    </div>
  );
}
// Place in root layout above main content
```

### Automated Accessibility Testing

```typescript
// jest-axe: detects WCAG violations in Jest tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from '../Modal';

expect.extend(toHaveNoViolations);

describe('Modal accessibility', () => {
  it('meets WCAG AA baseline', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
        <button>Confirm</button>
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
    // Catches: missing labels, insufficient color contrast, wrong ARIA usage,
    //          interactive elements without accessible names, etc.
  });
});

// eslint-plugin-jsx-a11y: catches a11y issues in your editor/CI
// .eslintrc
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
// Catches: <img> without alt, onClick div without role, etc.
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product required WCAG 2.1 AA compliance for enterprise customers (many have government contracts requiring standards compliance). Audit identified 47 violations: modal dialogs missing `role="dialog"` + focus trap, 12 icon buttons without accessible names, form inputs associated only by `placeholder` (not labels), and custom dropdown menus not operable by keyboard. Systematically fixed all 47, integrated `jest-axe` into every component test, added `eslint-plugin-jsx-a11y` to CI. Zero new a11y violations in subsequent 6 months — violations caught at code review before reaching production.

**At FAANG scale:**
- **Microsoft:** Windows accessibility guidelines (WCAG + extra requirements) are part of Microsoft's accessibility standard; every Azure Portal component requires keyboard navigation testing, screen reader testing (Narrator, NVDA, JAWS), and automated axe scan in CI
- **Adobe:** Creative Cloud — `aria-live` regions for auto-save status ("Changes saved" announcements), toolbar components with full roving tabindex + keyboard navigation, all tool names announced to screen readers
- **Salesforce:** Lightning Design System — comprehensive ARIA patterns for every component; custom combobox, date picker, data table with row selection, all with complete keyboard + screen reader support
- **Cisco:** DevNet portal — Section 508 compliance (US government standard derived from WCAG 2.1 AA) mandatory for government customer access; `@axe-core/react` integration in development with overlay showing live violations

---

## 💬 4. Interview Execution

### Sample Answer

> "WCAG 2.1 AA is the standard I build to — four principles: Perceivable (content must be perceivable by all senses a user can use), Operable (interface must be keyboard-navigable), Understandable (content and operations must be understandable), Robust (content must work with current and future assistive technologies).
>
> In React, there are three layers of implementation. First, semantic HTML — use `<button>` not `<div onClick>`, `<nav>`, proper heading hierarchy, associate labels with form inputs via `htmlFor`. Semantic HTML handles most accessibility automatically.
>
> Second, ARIA for cases HTML doesn't cover — custom tabs with `role='tablist'`, `role='tab'`, `aria-selected`, `aria-controls`; modals with `role='dialog'`, `aria-modal='true'`, `aria-labelledby`. The first rule of ARIA is don't use ARIA if HTML can do it — wrong ARIA is worse than no ARIA.
>
> Third, focus management — the thing most implementations miss. When a modal opens, focus must move to the first focusable element inside it. While open, Tab must be trapped within the modal (focus wrapping). When it closes, focus must return to the element that triggered the open. In SPAs, route changes must move focus to the main content area so screen readers announce the new page.
>
> For automated testing: `jest-axe` catches WCAG violations in unit/integration tests, `eslint-plugin-jsx-a11y` catches violations at author time."

---

## 💻 5. Code Example

```typescript
// Accessible form with all patterns applied
import { useId } from 'react';

export function ContactForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const nameId = useId();    // stable IDs for label association
  const emailId = useId();
  const msgId = useId();
  const nameErrorId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // validation...
    onSubmit(data);
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact us">
      <div>
        <label htmlFor={nameId}>Full name <span aria-hidden="true">*</span></label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          autoComplete="name"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? nameErrorId : undefined}
        />
        {errors.name && (
          <p id={nameErrorId} role="alert" style={{ color: 'red' }}>{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor={emailId}>Email address <span aria-hidden="true">*</span></label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor={msgId}>Message</label>
        <textarea id={msgId} name="message" rows={5} />
      </div>

      <button type="submit">Send message</button>

      {/* Live region: announces submission result to screen readers */}
      <div aria-live="polite" aria-atomic="true">
        {submitted && 'Your message has been sent. We will respond within 24 hours.'}
      </div>
    </form>
  );
}
```

---

## 🧠 6. Memory Aid

**POUR — WCAG's four principles:**
- **P**erceivable: content available to all senses (alt text, captions, color contrast)
- **O**perable: keyboard navigable, no time limits, no flashing
- **U**nderstandable: clear language, predictable behavior, helpful error messages
- **R**obust: works with assistive technologies (valid HTML, proper ARIA)

**Focus management checklist (modal):**
1. Save trigger element before open
2. Move focus in on open (first focusable element)
3. Trap focus inside (Tab wraps, Escape closes)
4. Restore focus to trigger on close

**ARIA priority:**
1. Semantic HTML first (button, nav, h1, label)
2. ARIA only when no HTML equivalent
3. Bad ARIA > no ARIA ← FALSE. No ARIA > bad ARIA.

**Mnemonic:** **POUR** — Perceivable, Operable, Understandable, Robust. All four required for WCAG compliance.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Microsoft, Adobe, and Salesforce have accessibility as a legal and contractual requirement — US Section 508, EU Web Accessibility Directive, ADA compliance; connecting your a11y implementation to these legal standards shows business awareness, not just technical compliance
→ Focus management for modals is the most frequently missed a11y requirement in production apps — most developers know to add `role="dialog"` but don't implement focus trap or focus restoration; demonstrating the complete 4-step focus lifecycle (save trigger, move in, trap, restore) shows you've actually shipped accessible modals
→ `jest-axe` + `eslint-plugin-jsx-a11y` in CI is the "shift left" accessibility approach — catching violations at code time is 100x cheaper than finding them in a post-launch audit or accessibility complaint; proposing this in an interview shows process thinking, not just feature thinking

**How it works (2 sentences):**
Screen readers communicate with web content through the browser's Accessibility Tree — a parallel tree derived from the DOM where each element has a computed role (from HTML tag or `role` attribute), accessible name (from its label, text content, or `aria-label`/`aria-labelledby`), and state properties (disabled, checked, expanded, etc.); ARIA attributes modify the accessibility tree without changing the visual DOM, which is why `role="dialog"` on a `<div>` makes the screen reader announce "dialog" even though the HTML element is generic.
Focus management in modals works by intercepting `Tab` and `Shift+Tab` keydown events, querying all focusable descendants (`button`, `[href]`, `input`, `[tabindex]:not([tabindex="-1"])`), and when focus would move past the last focusable element (Tab), programmatically calling `.focus()` on the first one instead — this creates the "trap" behavior where focus cycles within the modal instead of escaping to behind-modal content that is visually obscured and semantically unavailable.

---
✅ Topic 134/486 complete → Continuing to Topic 135: Micro Frontends with React
