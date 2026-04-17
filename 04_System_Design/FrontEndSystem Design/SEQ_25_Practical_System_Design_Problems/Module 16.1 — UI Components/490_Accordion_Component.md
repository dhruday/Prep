# 490. Accordion Component

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
An **Accordion** is a vertically stacked set of interactive headings that each reveal or hide an associated section of content. It allows users to toggle the visibility of related content panels, reducing visual clutter and letting users focus on one section at a time. It's governed by the WAI-ARIA Accordion Pattern, which defines specific roles, states, and keyboard interactions.

**Why it exists:**
Accordions solve information overload — FAQs, settings panels, multi-step forms, and navigation menus use them to present large amounts of content in a scannable, progressively-disclosed format. They reduce cognitive load and page scroll length.

**When and where it's used:**
- FAQ pages, help centers, documentation sidebars
- Settings/preferences panels (VS Code, Salesforce admin)
- Mobile navigation menus, filter panels
- Multi-step checkout, address forms
- Enterprise dashboards (Cisco, SAP) for collapsible sections in data-dense UIs

**Role in large-scale applications:**
At enterprise scale, accordions appear in design systems (Microsoft Fluent UI, Adobe Spectrum, Lightning Design System). They must be fully keyboard accessible (WCAG 2.2 AA), support screen readers (ARIA expanded/collapsed state announcements), and perform well with dozens of panels (lazy-load heavy content).

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. WAI-ARIA Accordion Pattern**

```
Role Structure:
──────────────
<div>                                ← wrapper (no special role needed)
  <h3>                               ← heading (proper heading level)
    <button                          ← aria-expanded="true/false"
            aria-controls="panel-1"  ← points to panel id
            id="trigger-1">          ← panel's aria-labelledby points here
      Section Title
    </button>
  </h3>
  <div role="region"                 ← panel
       id="panel-1"
       aria-labelledby="trigger-1"
       hidden>                       ← hidden when collapsed
    Panel content...
  </div>
</div>
```

**Required ARIA attributes:**

| Element | Attribute | Purpose |
|---------|-----------|---------|
| Trigger `<button>` | `aria-expanded="true/false"` | Announces open/closed state |
| Trigger `<button>` | `aria-controls="panel-id"` | Links trigger to panel |
| Panel `<div>` | `role="region"` | Landmarks the content (optional if few panels) |
| Panel `<div>` | `aria-labelledby="trigger-id"` | Labels region with trigger text |

### **B. Keyboard Navigation**

| Key | Action |
|-----|--------|
| `Enter` or `Space` | Toggle panel open/closed |
| `ArrowDown` | Move focus to next trigger |
| `ArrowUp` | Move focus to previous trigger |
| `Home` | Move focus to first trigger |
| `End` | Move focus to last trigger |

### **C. Design Decisions**

**Single vs Multi-expand:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| Single | Opening one panel closes others | FAQ pages, settings categories |
| Multi | Multiple panels can be open | Filter panels, comparison views |

**Controlled vs Uncontrolled:**

```typescript
// Uncontrolled — internal state
<Accordion defaultExpandedKeys={['panel-1']} />

// Controlled — parent manages state
const [expanded, setExpanded] = useState<Set<string>>(new Set(['panel-1']));
<Accordion expandedKeys={expanded} onExpandedChange={setExpanded} />
```

### **D. Animation Approaches**

**Approach 1: max-height transition (classic):**

```css
.panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}
.panel[data-state="open"] {
  max-height: 500px; /* Must be larger than content */
  /* Problem: hard-coded max, or jank at arbitrary max */
}
```

**Approach 2: CSS Grid (modern, superior):**

```css
.panel-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}
.panel-wrapper[data-state="open"] {
  grid-template-rows: 1fr;
}
.panel-content {
  overflow: hidden;
}
/* ✅ Animates to actual content height — no hard-coded max */
```

**Approach 3: Native `<details>`/`<summary>` (simplest):**

```html
<details>
  <summary>Section Title</summary>
  <div>Panel content...</div>
</details>
```

Pros: Zero JS, progressive enhancement, accessible by default.
Cons: Limited animation control, inconsistent styles across browsers, no multi-expand control.

### **E. Complete Implementation**

```typescript
// ──── Types ────
interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultExpandedKeys?: string[];
  expandedKeys?: string[];            // controlled
  onExpandedChange?: (keys: string[]) => void;
  children: React.ReactNode;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

// ──── Context ────
interface AccordionContextType {
  expandedKeys: Set<string>;
  toggle: (key: string) => void;
  registerTrigger: (key: string, ref: HTMLButtonElement) => void;
  getTriggerRefs: () => HTMLButtonElement[];
}

const AccordionContext = createContext<AccordionContextType | null>(null);

// ──── Root Component ────
function Accordion({ type = 'single', defaultExpandedKeys = [], expandedKeys: controlledKeys, onExpandedChange, children }: AccordionProps) {
  const [internalKeys, setInternalKeys] = useState<Set<string>>(
    new Set(defaultExpandedKeys)
  );
  
  const isControlled = controlledKeys !== undefined;
  const expandedKeys = isControlled ? new Set(controlledKeys) : internalKeys;
  
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggle = useCallback((key: string) => {
    const next = new Set(expandedKeys);
    
    if (next.has(key)) {
      next.delete(key);
    } else {
      if (type === 'single') next.clear();
      next.add(key);
    }

    if (!isControlled) setInternalKeys(next);
    onExpandedChange?.(Array.from(next));
  }, [expandedKeys, type, isControlled, onExpandedChange]);

  const registerTrigger = useCallback((key: string, ref: HTMLButtonElement) => {
    triggerRefs.current.set(key, ref);
  }, []);

  const getTriggerRefs = useCallback(() => {
    return Array.from(triggerRefs.current.values());
  }, []);

  return (
    <AccordionContext.Provider value={{ expandedKeys, toggle, registerTrigger, getTriggerRefs }}>
      <div data-accordion="">{children}</div>
    </AccordionContext.Provider>
  );
}

// ──── Item Component ────
function AccordionItem({ value, disabled = false, children }: AccordionItemProps) {
  const ctx = useContext(AccordionContext)!;
  const isExpanded = ctx.expandedKeys.has(value);

  return (
    <div data-accordion-item="" data-state={isExpanded ? 'open' : 'closed'} data-disabled={disabled || undefined}>
      <AccordionItemContext.Provider value={{ value, isExpanded, disabled }}>
        {children}
      </AccordionItemContext.Provider>
    </div>
  );
}

// ──── Trigger Component ────
function AccordionTrigger({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AccordionContext)!;
  const { value, isExpanded, disabled } = useContext(AccordionItemContext)!;
  const ref = useRef<HTMLButtonElement>(null);
  const panelId = `panel-${value}`;
  const triggerId = `trigger-${value}`;

  useEffect(() => {
    if (ref.current) ctx.registerTrigger(value, ref.current);
  }, [value, ctx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const triggers = ctx.getTriggerRefs();
    const index = triggers.indexOf(ref.current!);

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (index + 1) % triggers.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (index - 1 + triggers.length) % triggers.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = triggers.length - 1;
        break;
    }

    if (nextIndex !== null) triggers[nextIndex].focus();
  };

  return (
    <h3>
      <button
        ref={ref}
        id={triggerId}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => ctx.toggle(value)}
        onKeyDown={handleKeyDown}
        data-accordion-trigger=""
      >
        {children}
        <ChevronIcon data-state={isExpanded ? 'open' : 'closed'} />
      </button>
    </h3>
  );
}

// ──── Panel Component (with CSS Grid animation) ────
function AccordionPanel({ children }: { children: React.ReactNode }) {
  const { value, isExpanded } = useContext(AccordionItemContext)!;
  const panelId = `panel-${value}`;
  const triggerId = `trigger-${value}`;

  return (
    <div
      data-accordion-panel-wrapper=""
      data-state={isExpanded ? 'open' : 'closed'}
      style={{
        display: 'grid',
        gridTemplateRows: isExpanded ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.3s ease-out',
      }}
    >
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        data-accordion-panel=""
        style={{ overflow: 'hidden' }}
        hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}
```

### **F. CSS**

```css
[data-accordion-trigger] {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  font: inherit;
  background: none;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  text-align: left;
}

[data-accordion-trigger]:hover {
  background: #f9fafb;
}

[data-accordion-trigger]:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}

[data-accordion-trigger][disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-accordion-trigger] svg {
  transition: transform 0.3s ease;
}
[data-accordion-trigger] svg[data-state="open"] {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  [data-accordion-panel-wrapper],
  [data-accordion-trigger] svg {
    transition: none;
  }
}
```

### **G. Anti-Patterns**

1. **Using `<div>` triggers instead of `<button>`** → Not keyboard accessible. Screen readers don't announce it as interactive.
2. **Missing `aria-expanded`** → Screen readers can't tell if section is open or closed.
3. **No keyboard navigation** → ArrowUp/Down, Home/End required by WAI-ARIA spec.
4. **Hard-coded `max-height` for animation** → Content taller than max-height gets clipped. Use CSS Grid `0fr → 1fr` instead.
5. **Using accordion for sequential content** → If users need to see ALL sections, use a different pattern (tabs, or just show everything).
6. **Not respecting `prefers-reduced-motion`** → Disable transitions for users who've requested it.

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

- **Microsoft Fluent UI**: `<Accordion>` component with single/multi mode, compound children pattern
- **Adobe Spectrum**: Disclosure group with strict ARIA compliance and animation
- **Salesforce SLDS**: Expandable sections in record detail pages — default in CRM views
- **SAP Fiori**: `sap.m.Panel` expandable sections in Object Page — Hruday's WCAG AA work included auditing these for keyboard accessibility and `aria-expanded` state announcements

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer:**

> *"For an accordion, I'd start with the WAI-ARIA Accordion pattern. Each trigger is a `<button>` inside a heading element, with `aria-expanded` and `aria-controls` pointing to its panel. The panel gets `role="region"` and `aria-labelledby` pointing back to the trigger. Keyboard navigation: Arrow keys move between triggers, Enter/Space toggles.*
>
> *For animation, I use the CSS Grid trick — `grid-template-rows: 0fr → 1fr` with a transition. This animates to actual content height without a hard-coded max-height. The panel content has `overflow: hidden`.*
>
> *Architecture: compound component pattern with Context. The root `<Accordion>` manages expanded state (single or multi-expand mode, controlled or uncontrolled). `<AccordionItem>` provides item context. `<AccordionTrigger>` handles click + keyboard. `<AccordionPanel>` animates and manages ARIA.*
>
> *At SAP, our WCAG AA audit flagged accordions missing `aria-expanded` and keyboard navigation — fixing these was part of our accessibility certification."*

### **Follow-up Questions:**
- **"How do you handle lazy-loading heavy panel content?"** → Render panel content only when `isExpanded` is true for the first time (mount on first expand, keep mounted after).
- **"Single vs multi-expand?"** → Single: `toggle` clears all keys first. Multi: `toggle` only adds/removes the clicked key.
- **"How do you animate height from 0 to auto?"** → CSS Grid `0fr → 1fr` on `grid-template-rows`. The only CSS-only solution that works without JS measurement.

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Section 2 for comprehensive implementation.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

**Why:** Accordions appear in every design system and every enterprise UI. Machine coding rounds test ARIA compliance, keyboard handling, and animation — senior engineers must get all three right.
**How:** Compound component pattern (Context-based). WAI-ARIA roles + keyboard handler. CSS Grid `0fr/1fr` animation. Controlled + uncontrolled modes.
**Companies:** Microsoft (Fluent UI Accordion), Adobe (Spectrum Disclosure), Salesforce (SLDS Expandable Section), Cisco (dashboard collapsible panels).
