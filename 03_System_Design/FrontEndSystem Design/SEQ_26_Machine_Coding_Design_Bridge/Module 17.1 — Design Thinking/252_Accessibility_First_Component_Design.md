# 252 – Accessibility-First Component Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Accessibility-First Component Design means building accessibility into components from the start — not bolting it on afterward. This approach uses **semantic HTML as the foundation**, **ARIA only when native semantics are insufficient**, **keyboard navigation as a first-class interaction**, and **screen reader testing as part of development**. In interviews, demonstrating accessibility-first thinking unprompted is a major differentiator — it signals production experience with enterprise standards (WCAG 2.1 AA) and awareness that 15% of users have disabilities.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Accessibility-First Checklist

For EVERY component you build in a machine coding round:

1. **Use semantic HTML first**: `<button>` not `<div onClick>`, `<nav>` not `<div class="nav">`
2. **Keyboard navigation**: Can every interaction be done without a mouse?
3. **ARIA labels**: Does every interactive element have an accessible name?
4. **Focus management**: After an action (modal open, route change), where does focus go?
5. **Color independence**: Is information conveyed by more than just color?
6. **`prefers-reduced-motion`**: Are animations optional?

### Common Patterns with Accessible Implementation

```typescript
// ✅ Accessible Modal (Dialog Pattern)
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus(); // move focus into modal
      document.body.style.overflow = 'hidden'; // prevent background scroll
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
           onClick={e => e.stopPropagation()}
           onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <h2 id="modal-title">{title}</h2>
        {children}
        <button ref={closeRef} onClick={onClose} aria-label="Close dialog">✕</button>
      </div>
    </div>,
    document.body
  );
}

// ✅ Accessible Toggle / Switch
function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="toggle-container">
      <span>{label}</span>
      <button role="switch" aria-checked={checked}
              onClick={() => onChange(!checked)}
              className={checked ? 'toggle-on' : 'toggle-off'}>
        <span className="toggle-thumb" />
      </button>
    </label>
  );
}
```

### Focus Trap for Modals/Dialogs

```typescript
function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    el.addEventListener('keydown', handleTab);
    return () => el.removeEventListener('keydown', handleTab);
  }, [ref]);
}
```

### Anti-Patterns

- ❌ `<div onClick>` instead of `<button>` — no keyboard support, no role
- ❌ `outline: none` globally — removes focus indicator for keyboard users
- ❌ `aria-label` on everything — only for interactive elements missing visible text
- ❌ `tabindex="5"` (positive values) — creates unpredictable tab order
- ❌ Auto-playing carousels without pause button — WCAG 2.2.2 violation

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Microsoft Fluent UI
Microsoft's Fluent UI is one of the most accessible component libraries. They contributed to WAI-ARIA APG patterns and test every component with screen readers (NVDA, JAWS, VoiceOver). Accessibility is a ship-blocking requirement at Microsoft.

### Hruday @ SAP Labs
At SAP, I led the effort that achieved **WCAG AA certification** for our BI Launchpad application. Every component went through accessibility review: keyboard navigation, screen reader testing (JAWS + NVDA), color contrast validation. This experience gives me a natural reflex to build accessible components from the start.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I build accessibility into every component from the first line of code. My approach: start with semantic HTML (button, nav, main, fieldset), add ARIA only when native semantics fall short, ensure keyboard navigation works, manage focus after state changes, and test with VoiceOver.*

*In machine coding rounds, I naturally use: `<button>` for clickable elements, `aria-label` for icon-only buttons, `aria-live` for dynamic content updates, `role='dialog'` with `aria-modal` for modals, and focus traps. I also add `aria-expanded` for collapsible sections and `:focus-visible` for keyboard-only focus indicators.*

*At SAP, I led our application to WCAG AA certification. This involved auditing every component, fixing keyboard traps, adding ARIA landmarks, and implementing skip navigation. That experience means accessibility is second nature — I don't think about it as an add-on, it's just how I build components."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Accessible Accordion Component
function Accordion({ items }: { items: { title: string; content: React.ReactNode }[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="accordion">
      {items.map((item, i) => {
        const isExpanded = expandedIndex === i;
        const headerId = `accordion-header-${i}`;
        const panelId = `accordion-panel-${i}`;

        return (
          <div key={i}>
            <h3>
              <button id={headerId} aria-expanded={isExpanded} aria-controls={panelId}
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className="accordion-button">
                {item.title}
                <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={headerId}
                 hidden={!isExpanded} className="accordion-panel">
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"A11y-First = Semantic HTML + ARIA When Needed + Keyboard + Focus Management."** Every component: use `<button>` not `<div onClick>`, add `aria-label` for icon buttons, `aria-expanded` for toggles, `aria-live` for updates. Modals: `role="dialog"`, `aria-modal`, focus trap. Focus: move into modal on open, return to trigger on close. Never `outline: none`. Test with keyboard first, then screen reader.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Accessibility is a ship-blocking requirement at Microsoft and a legal requirement for enterprise software. Demonstrating accessibility-first thinking unprompted in interviews is a major differentiator.
**How:** Semantic HTML foundation → ARIA for custom widgets → keyboard navigation → focus management → screen reader testing. Use WAI-ARIA APG patterns for complex widgets.
**Companies:** **Microsoft** (ship-blocking), **Adobe** (Spectrum accessibility), **Salesforce** (WCAG compliance required for Lightning), **Cisco** (enterprise accessibility standards).
