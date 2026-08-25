# 508. Focus Management

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
Focus management is the practice of programmatically controlling which element receives keyboard focus in a web application, and ensuring that focus moves logically and predictably as the UI changes. It covers focus trapping (keeping focus within a modal/dialog), focus restoration (returning focus after a modal closes), focus indicators (visible outlines), roving tabindex (tab within composite widgets), and skip navigation links. It is a core requirement of WCAG 2.2 Success Criteria 2.4.3 (Focus Order), 2.4.7 (Focus Visible), and 2.4.11 (Focus Not Obscured).

**Why it exists:**
Without explicit focus management, keyboard users and screen reader users lose their place in the DOM when SPAs dynamically update content, open/close overlays, or perform client-side navigation. A sighted mouse user can click anywhere, but a keyboard user can only interact with the currently focused element. When a modal opens without trapping focus, Tab can move behind the overlay to invisible elements. When a route changes in a SPA, focus stays on the old navigation link rather than moving to the new content. These failures make applications unusable for ~15% of users who rely on keyboard navigation.

**When and where it's used:**
- Modal dialogs and drawers (focus trap + focus restore on close)
- Client-side routing (focus to main content heading on navigation)
- Dropdown menus and combo boxes (roving tabindex through items)
- Toast/snackbar notifications (aria-live, not focus steal)
- Tab panels (arrow key navigation, roving tabindex)
- Autocomplete suggestions (aria-activedescendant or roving tabindex)
- Skip navigation links (jump to main content)
- Error handling (focus to first invalid field after form validation)

**Role in large-scale applications:**
At FAANG companies, focus management is a non-negotiable accessibility requirement. Google's Material Design, Microsoft's Fluent UI, Adobe's Spectrum, and SAP's Fiori all enforce focus management patterns in their design system components. Failure to manage focus results in WCAG AA non-compliance, which exposes enterprises to legal risk (ADA Title III, European Accessibility Act 2025), excludes 1.3 billion people with disabilities, and degrades keyboard-first power user experience.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. The Browser Focus Model**

```
┌──────────────────────────────────────────────────────┐
│                   DOCUMENT                            │
│                                                      │
│   Tab Order (sequential navigation)                  │
│   ─────────────────────────────────                  │
│   Determined by DOM order + tabindex values:         │
│                                                      │
│   tabindex="1"  → First (positive tabindex, sorted)  │
│   tabindex="2"  → Second                             │
│   tabindex="0"  → Natural DOM order (after positive) │
│   tabindex="-1" → Not in tab order, focusable via JS │
│   No tabindex   → Natively focusable elements only   │
│                   (a, button, input, select, textarea)│
│                                                      │
│   Natively focusable elements:                       │
│   <a href>, <button>, <input>, <select>, <textarea>, │
│   <details>, <summary>, elements with contenteditable│
│                                                      │
│   NOT focusable by default:                          │
│   <div>, <span>, <p>, <section>, <h1>-<h6>          │
│   → Need tabindex="-1" or tabindex="0" to focus     │
└──────────────────────────────────────────────────────┘
```

**The tabindex matrix:**

| tabindex Value | In Tab Order? | Focusable via JS? | Use Case |
|---------------|--------------|-------------------|----------|
| Not set (native focusable) | ✅ Yes | ✅ Yes | Default buttons, links, inputs |
| Not set (non-focusable) | ❌ No | ❌ No | Divs, spans, headings |
| `tabindex="0"` | ✅ Yes (DOM order) | ✅ Yes | Custom interactive widgets |
| `tabindex="-1"` | ❌ No | ✅ Yes (element.focus()) | Focus targets, headings for SPA routing |
| `tabindex="1+"` | ✅ Yes (sorted first) | ✅ Yes | ⚠️ ANTI-PATTERN — avoid positive tabindex |

### **B. Focus Trap (Modal/Dialog Pattern)**

When a modal dialog opens, focus MUST be trapped inside it. Tab and Shift+Tab cycle through focusable elements within the modal only. This prevents keyboard users from accidentally interacting with content behind the overlay.

```
┌────────────────────────────────────────────┐
│               MODAL DIALOG                  │
│                                            │
│   ┌─ Focus Sentinel (hidden, tabindex=0) ─┐│
│   │                                       ││
│   │  [Close Button] ◀─── Initial focus    ││
│   │                                       ││
│   │  Form Field 1                         ││
│   │  Form Field 2                         ││
│   │  [Cancel]  [Submit]                   ││
│   │                                       ││
│   └─ Focus Sentinel (hidden, tabindex=0) ─┘│
│                                            │
│   Tab from last element → wraps to first   │
│   Shift+Tab from first → wraps to last     │
│   Escape → close modal → restore focus     │
└────────────────────────────────────────────┘
│
│ Focus returns to trigger element on close
▼
[Open Modal Button] ◀─── Focus restored here
```

**Implementation — Focus Trap Hook (React):**

```typescript
import { useRef, useEffect, useCallback } from 'react';

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const selector = [
      'a[href]:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
    ].join(', ');
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Store current focus for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Move focus into trap
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on cleanup
      previousFocusRef.current?.focus();
    };
  }, [isActive, getFocusableElements]);

  return containerRef;
}
```

### **C. Focus Restoration**

When a temporary UI element (modal, popover, toast action) closes, focus must return to the element that triggered it. Without restoration, focus falls to `<body>`, forcing keyboard users to Tab through the entire page to find their place.

**Focus restoration patterns:**

| Scenario | Restore Focus To | Notes |
|----------|-----------------|-------|
| Modal closes | Button that opened it | Store ref before opening |
| Popover closes | Trigger element | Same as modal |
| Toast dismisses | Do NOT move focus | Toasts are aria-live, not focus targets |
| Delete action (item removed) | Next item in list, or previous if last | The trigger no longer exists |
| Route change (SPA) | Main content heading (`<h1 tabindex="-1">`) | Call `.focus()` on the heading |
| Error handling | First invalid field | After form validation |
| Confirm dialog → action | Contextually appropriate | If deleting a row → focus next row |

### **D. Roving Tabindex (Composite Widget Navigation)**

For composite widgets (tab bars, toolbars, radio groups, menu bars, tree views), the WAI-ARIA pattern uses **roving tabindex**: only one item in the group has `tabindex="0"` (the active/focused item), all others have `tabindex="-1"`. Arrow keys move focus between items.

```
┌────────────────────────────────────────────────┐
│  Tab Bar (role="tablist")                       │
│                                                │
│  [Tab 1]        [Tab 2]        [Tab 3]         │
│  tabindex="0"   tabindex="-1"  tabindex="-1"   │
│  aria-selected  ←── Arrow keys move focus ──▶  │
│  ="true"                                       │
│                                                │
│  Only ONE tab has tabindex="0" at a time       │
│  Tab key enters the group                      │
│  Tab key leaves the group (to next widget)     │
│  Arrow keys navigate within the group          │
└────────────────────────────────────────────────┘
```

**Implementation — Roving Tabindex Hook (React):**

```typescript
import { useState, useCallback, useRef, KeyboardEvent } from 'react';

interface RovingTabindexOptions {
  orientation: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;      // Wrap from last to first and vice versa
  rtl?: boolean;       // Right-to-left support
}

function useRovingTabindex<T extends HTMLElement>(
  itemCount: number,
  options: RovingTabindexOptions = { orientation: 'horizontal', wrap: true }
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(T | null)[]>([]);

  const setItemRef = useCallback((index: number) => (el: T | null) => {
    itemRefs.current[index] = el;
  }, []);

  const moveFocus = useCallback((newIndex: number) => {
    const { wrap } = options;
    let targetIndex = newIndex;

    if (wrap) {
      if (targetIndex < 0) targetIndex = itemCount - 1;
      if (targetIndex >= itemCount) targetIndex = 0;
    } else {
      targetIndex = Math.max(0, Math.min(itemCount - 1, targetIndex));
    }

    setActiveIndex(targetIndex);
    itemRefs.current[targetIndex]?.focus();
  }, [itemCount, options]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { orientation, rtl } = options;
    let handled = false;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          moveFocus(activeIndex + (rtl ? -1 : 1));
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          moveFocus(activeIndex + (rtl ? 1 : -1));
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          moveFocus(activeIndex + 1);
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          moveFocus(activeIndex - 1);
          handled = true;
        }
        break;
      case 'Home':
        moveFocus(0);
        handled = true;
        break;
      case 'End':
        moveFocus(itemCount - 1);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [activeIndex, itemCount, moveFocus, options]);

  const getItemProps = useCallback((index: number) => ({
    ref: setItemRef(index),
    tabIndex: index === activeIndex ? 0 : -1,
    onKeyDown: handleKeyDown,
  }), [activeIndex, handleKeyDown, setItemRef]);

  return { activeIndex, setActiveIndex: moveFocus, getItemProps };
}
```

### **E. Focus Management in SPA Routing**

Single-page applications break the browser's native focus behavior. When a traditional page loads, focus starts at the top. When a SPA route changes, the URL updates but focus stays on the link that was clicked — the new content is invisible to keyboard/screen reader users.

```
Traditional Navigation:                SPA Without Focus Management:
──────────────────────                ────────────────────────────
Click link → Full page load           Click link → URL changes
Focus → Top of new page               Focus → STAYS on clicked link
Screen reader announces page           Screen reader announces nothing
✅ Works automatically                ❌ User doesn't know content changed
```

**SPA focus management pattern:**

```typescript
// React Router focus management
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function useSPAFocusManagement(): void {
  const location = useLocation();
  const mainHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Don't focus on initial page load — let browser handle it
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Strategy 1: Focus the main content heading
    const heading = document.querySelector('main h1') as HTMLHeadingElement;
    if (heading) {
      // Ensure it's focusable (headings aren't by default)
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus({ preventScroll: false });

      // Remove tabindex after blur to keep clean tab order
      const handleBlur = () => {
        heading.removeAttribute('tabindex');
        heading.removeEventListener('blur', handleBlur);
      };
      heading.addEventListener('blur', handleBlur);
    }

    // Strategy 2: Announce route change to screen readers
    announceRouteChange(location.pathname);
  }, [location.pathname]);
}

function announceRouteChange(path: string): void {
  // Create or reuse an aria-live region
  let announcer = document.getElementById('route-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'route-announcer';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');
    // Visually hidden but accessible to screen readers
    Object.assign(announcer.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(announcer);
  }
  // Clear then set — ensures screen reader re-announces
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer!.textContent = `Navigated to ${path.replace(/\//g, ' ').trim() || 'home'} page`;
  });
}
```

### **F. aria-activedescendant vs. Roving Tabindex**

Two approaches exist for managing focus in composite widgets:

| Aspect | Roving Tabindex | aria-activedescendant |
|--------|----------------|----------------------|
| **How it works** | Moves actual DOM focus between items | Focus stays on container, `aria-activedescendant` points to active item |
| **tabindex changes** | Active item: `tabindex="0"`, others: `tabindex="-1"` | Container: `tabindex="0"`, items: no tabindex needed |
| **:focus-visible** | Applies to the focused item directly | Applies to the container — must style active item separately |
| **Screen reader** | Announces focused item naturally | Announces via `aria-activedescendant` reference |
| **Browser support** | Excellent (no special support needed) | Good but quirky in some screen readers |
| **Performance** | DOM attribute updates on every arrow key | Single attribute update on container |
| **Scroll into view** | Browser auto-scrolls to focused element | Must manually `.scrollIntoView()` |
| **Use cases** | Tabs, toolbars, radio groups, tree views | Listboxes, comboboxes (autocomplete) |
| **WAI-ARIA recommendation** | Preferred for most widgets | Recommended for combobox pattern |

### **G. Focus Visible & Focus Indicators**

```css
/* ❌ ANTI-PATTERN: Removing all focus outlines */
*:focus {
  outline: none; /* WCAG 2.4.7 violation! */
}

/* ✅ CORRECT: Use :focus-visible for keyboard-only indicators */
/* :focus-visible fires on keyboard focus, not mouse click */
button:focus-visible {
  outline: 3px solid #1a73e8; /* Google blue */
  outline-offset: 2px;
  border-radius: 4px;
}

/* ✅ For older browser support, progressive enhancement */
button:focus {
  outline: 3px solid #1a73e8; /* Fallback */
}
button:focus:not(:focus-visible) {
  outline: none; /* Remove for mouse clicks in supporting browsers */
}

/* ✅ WCAG 2.4.11 (New in 2.2): Focus Not Obscured (Minimum) */
/* Ensure sticky headers/footers don't cover the focused element */
:focus-visible {
  scroll-margin: 80px; /* Account for sticky header height */
}

/* ✅ High contrast mode support */
@media (forced-colors: active) {
  :focus-visible {
    outline: 3px solid Highlight; /* System highlight color */
  }
}
```

**WCAG 2.2 focus requirements:**

| Success Criterion | Level | Requirement |
|-------------------|-------|-------------|
| 2.4.3 Focus Order | A | Focus order preserves meaning and operability |
| 2.4.7 Focus Visible | AA | Keyboard focus indicator is visible |
| 2.4.11 Focus Not Obscured (Min) | AA | Focused element not hidden by sticky/fixed content |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Focused element fully visible |
| 2.4.13 Focus Appearance | AAA | Focus indicator has minimum area and contrast |

### **H. Anti-Patterns & Pitfalls**

1. **`outline: none` without replacement** — The single most common accessibility failure. If you remove the outline, provide an alternative indicator (box-shadow, border change, background change) with 3:1 contrast ratio against adjacent colors.

2. **Positive tabindex values** — `tabindex="1"`, `tabindex="5"` etc. create a separate tab order that overrides DOM order, causing unpredictable navigation. Only use `tabindex="0"` (in order) or `tabindex="-1"` (programmatic only).

3. **Auto-focus on every render** — Calling `.focus()` on mount without checking if the user initiated the action. This steals focus from keyboard users who are navigating elsewhere.

4. **Not restoring focus after dialog close** — Focus falls to `<body>`, forcing keyboard users to Tab through the entire page.

5. **Focus trap without Escape support** — Modal traps focus but Escape doesn't close it. Keyboard users are stuck.

6. **Moving focus to aria-live regions** — Live regions (toasts, status updates) should use `aria-live="polite"` or `aria-live="assertive"`, NOT receive focus. Focus steal interrupts the user's current task.

7. **SPA route changes without focus management** — URL changes but focus stays on the old link. Screen readers don't announce the new content.

8. **Using `event.preventDefault()` on Tab without providing alternative navigation** — Prevents the user from leaving the component entirely.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Google Material Design (MUI)
- All dialogs use `FocusTrap` component with sentinel elements
- Focus restores to trigger on close
- Roving tabindex for tabs, menus, chip sets
- `useIsFocusVisible` hook for `:focus-visible` polyfill

### Microsoft Fluent UI
- `FocusZone` component: configurable axis (horizontal/vertical/bidirectional)
- `FocusTrapZone` component: modal focus trapping with first-focus-element prop
- `Announced` component: aria-live announcements for focus context
- Supports both roving tabindex and aria-activedescendant

### Hruday's Experience Mapping
- **SAP WCAG AA Certification:** Focus management was a critical part of the WCAG AA certification at SAP. Fiori elements (ui5-dialog, ui5-tabcontainer) all implement focus trapping and roving tabindex per WAI-ARIA patterns. Hruday would have tested these with NVDA/JAWS, validating focus trap behavior and focus restoration.
- **SAP Micro-Frontends:** Focus management across micro-frontend boundaries is particularly complex — when a dialog in MFE-A closes, focus must restore to the trigger in MFE-A even though MFE-B's content may have changed.

### Scale Evolution

| Scale | Focus Challenge | Solution |
|-------|----------------|----------|
| Simple page | Native focus order works | No custom management needed |
| SPA (React/Angular) | Route changes don't move focus | Focus management hook + aria-live |
| Design system | Consistent focus across 50+ components | Focus trap + roving tabindex utilities |
| Micro-frontends | Focus across MFE boundaries | Shared focus manager service, custom events |
| Enterprise (WCAG audit) | Automated + manual testing at scale | axe-core + Pa11y CI + manual screen reader testing |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "Focus management is how we ensure keyboard and screen reader users always know where they are in the UI. There are four core patterns I implement:
>
> First, **focus trapping** for modals — when a dialog opens, I store a reference to the trigger element, move focus to the first focusable element inside the dialog, and intercept Tab/Shift+Tab to cycle within the dialog only. On close, focus restores to the stored trigger.
>
> Second, **roving tabindex** for composite widgets like tab bars and menus. Only the active item has tabindex=0; all others have tabindex=-1. Arrow keys move focus between items; Tab leaves the entire group. This keeps the tab order clean.
>
> Third, **SPA route management** — on route change, I focus the main content heading (with tabindex=-1) and announce the navigation via an aria-live region.
>
> Fourth, **focus indicators** — I use :focus-visible to show outline only on keyboard interaction, with 3:1 contrast ratio and scroll-margin to avoid obscured focus per WCAG 2.4.11.
>
> At SAP, this was central to our WCAG AA certification. Every Fiori dialog component uses focus trapping, and we added automated axe-core checks in CI to catch focus order regressions."

**Likely Follow-up Questions:**

1. **"How do you trap focus in a modal without a library?"** → Two sentinel elements (hidden, tabindex=0) at start and end of modal. onFocus on sentinels wraps to last/first focusable element. Or intercept Tab keydown and cycle manually.
2. **"What's the difference between roving tabindex and aria-activedescendant?"** → Roving moves actual DOM focus (better screen reader support). aria-activedescendant keeps focus on container and points to active item (better for combobox/autocomplete). Choose based on WAI-ARIA pattern.
3. **"How do you handle focus when an element is deleted?"** → Store the next sibling's reference before delete. After removing the element, focus the next sibling (or previous if last item). If list is empty, focus the list container.
4. **"What about focus and animations?"** → Don't move focus mid-animation. Use `prefers-reduced-motion` to disable transitions. Call `.focus()` after animation completes (transitionend/animationend).
5. **"How do you test focus management?"** → Manual: Tab through every flow with keyboard. Automated: axe-core checks focus order, custom Cypress/Playwright tests assert `document.activeElement` after each interaction.

**Comparison: Focus Approaches**

| Approach | Use Case | Pros | Cons |
|----------|----------|------|------|
| Native tab order | Simple forms | Zero effort, reliable | Breaks with dynamic content |
| `tabindex` management | Custom widgets | Full control | Must maintain manually |
| Focus trap (modal) | Overlays, dialogs | Prevents escape | Must handle edge cases (iframes, shadow DOM) |
| Roving tabindex | Tabs, menus, toolbars | Clean tab order, screen reader friendly | Complexity in implementation |
| `aria-activedescendant` | Combobox, listbox | No DOM focus changes, better perf | Less screen reader compatibility |
| Focus manager service | Micro-frontends | Cross-boundary focus | Architecture overhead |

────────────────────────────────────
## 5. Code Example (TypeScript)
────────────────────────────────────

### Production Focus Trap Component (React)

```typescript
import React, { useRef, useEffect, ReactNode, useCallback } from 'react';

interface FocusTrapProps {
  active: boolean;
  children: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  restoreFocusOnDeactivate?: boolean;
  onEscapeKey?: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([aria-hidden="true"])',
  'button:not([disabled]):not([aria-hidden="true"])',
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
  '[contenteditable="true"]:not([aria-hidden="true"])',
].join(', ');

export function FocusTrap({
  active,
  children,
  initialFocusRef,
  restoreFocusOnDeactivate = true,
  onEscapeKey,
}: FocusTrapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null); // Filter hidden elements
  }, []);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set initial focus
    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusable();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          // Fallback: focus the container itself
          containerRef.current?.focus();
        }
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscapeKey) {
        event.stopPropagation();
        onEscapeKey();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Also trap focus if user clicks outside
    const handleFocusIn = (event: FocusEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        event.preventDefault();
        event.stopPropagation();
        const focusable = getFocusable();
        if (focusable.length > 0) focusable[0].focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      if (restoreFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, getFocusable, initialFocusRef, onEscapeKey, restoreFocusOnDeactivate]);

  return (
    <div ref={containerRef} tabIndex={-1} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}
```

### Angular Focus Trap Directive

```typescript
import { Directive, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';

@Directive({ selector: '[appFocusTrap]' })
export class FocusTrapDirective implements OnChanges, OnDestroy {
  @Input('appFocusTrap') active = false;

  private previousFocus: HTMLElement | null = null;
  private keyHandler = this.handleKeyDown.bind(this);

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    if (this.active) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  private activate(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    document.addEventListener('keydown', this.keyHandler);
    requestAnimationFrame(() => {
      const focusable = this.getFocusable();
      if (focusable.length > 0) focusable[0].focus();
    });
  }

  private deactivate(): void {
    document.removeEventListener('keydown', this.keyHandler);
    this.previousFocus?.focus();
  }

  private getFocusable(): HTMLElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    );
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const focusable = this.getFocusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }
}
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**The focus management checklist — "TRRS":**
- **T**rap: Focus trapped in modals/dialogs (Tab cycles within)
- **R**estore: Focus returns to trigger when overlay closes
- **R**ove: Arrow keys navigate composite widgets (roving tabindex)
- **S**PA: Route changes focus the main heading + aria-live announce

**If you go blank:** "Store the trigger reference, move focus into the dialog, trap Tab to cycle within, restore focus on close, and announce SPA route changes via aria-live."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ 15% of users rely on keyboard navigation. Without focus management, modals trap users in incorrect elements, SPAs lose keyboard context on navigation, and composite widgets are impossible to navigate. It's WCAG 2.4.3/2.4.7 (Level A/AA) — non-compliance means legal risk.

**How it works:**
→ Focus trap captures Tab/Shift+Tab within a container and cycles through focusable elements. Roving tabindex keeps one item at tabindex="0" and moves it with arrow keys. SPA routing focuses the new page heading with tabindex="-1" and announces via aria-live. Focus restoration stores a ref to the trigger and calls `.focus()` on unmount.

**Company relevance:**
→ **Google:** Material Design's accessibility guidelines mandate focus management in every interactive component. Google's internal a11y testing infra runs automated focus order checks.
→ **Microsoft:** Fluent UI's FocusZone and FocusTrapZone are foundational utilities — interview questions test understanding of these patterns.
→ **SAP (Hruday's current):** WCAG AA certification at SAP required focus management across all Fiori elements. Hruday's direct experience here (dialog focus trapping, keyboard navigation testing with screen readers) is a strong differentiator.
