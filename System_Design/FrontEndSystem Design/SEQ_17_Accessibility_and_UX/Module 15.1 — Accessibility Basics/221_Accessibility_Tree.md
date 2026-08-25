# 221 – Accessibility Tree — How Browsers Expose to Assistive Tech

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

The Accessibility Tree is a **parallel data structure to the DOM** that browsers construct to expose web content to assistive technologies like screen readers, braille displays, and voice control software. While the DOM represents the full document structure (including purely presentational elements), the accessibility tree is a **simplified, semantic-only tree** where each node has a **role** (button, heading, link), **name** (accessible label), **state** (expanded, disabled, checked), and **value** (text content, slider position). Understanding the accessibility tree is critical because it determines what assistive technology users actually experience — a visually perfect button that's missing from the accessibility tree is **invisible to 15% of users**.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### How the Accessibility Tree is Built

```
HTML Source
    ↓ (Parsed by browser)
DOM Tree (every element, every attribute)
    ↓ (Browser's accessibility engine filters)
Accessibility Tree (semantic elements only)
    ↓ (Exposed via platform API)
OS Accessibility API (UIA/MSAA on Windows, NSAccessibility on macOS, AT-SPI on Linux)
    ↓ (Screen reader queries)
NVDA / JAWS / VoiceOver
```

**What gets included:**
- All native semantic elements: `<button>`, `<a>`, `<input>`, `<h1-h6>`, `<table>`, `<nav>`, `<main>`
- Elements with explicit ARIA roles: `<div role="dialog">`
- Text nodes (innerText/textContent)

**What gets excluded:**
- Elements with `display: none` or `visibility: hidden`
- Elements with `aria-hidden="true"`
- Purely presentational elements: `<div>` and `<span>` with no semantic role or text
- Elements with `role="presentation"` or `role="none"`

### Accessibility Tree Node Properties

| Property | Source | Example |
|----------|--------|---------|
| **Role** | Element type or `role` attribute | `<button>` → role: button |
| **Name** | `aria-label`, `aria-labelledby`, `<label>`, visible text, `alt`, `title` | "Submit Order" |
| **Description** | `aria-describedby`, `title` | "Click to submit your order" |
| **State** | HTML attributes + ARIA states | `disabled`, `aria-expanded="true"` |
| **Value** | Input value, `aria-valuenow` | "75" (for a slider) |
| **Relationships** | `aria-owns`, `aria-controls`, `aria-activedescendant` | Parent-child overrides |

### Name Computation Algorithm (AccName)

The accessible name is computed in this priority order (simplified):
1. `aria-labelledby` (references another element's text)
2. `aria-label` (direct string label)
3. `<label>` element (for form controls)
4. Visible text content (for links, buttons)
5. `alt` attribute (for images)
6. `title` attribute (last resort fallback)
7. `placeholder` (NOT a reliable name — assistive tech support varies)

### Performance Implications

- The accessibility tree is built **lazily** — the browser only constructs nodes when queried by assistive tech
- Frequent DOM mutations trigger accessibility tree updates → can cause screen reader "stuttering"
- Using `aria-live="polite"` on a container with 1000 updates/second → screen reader queue overflow
- `aria-hidden="true"` on a subtree prevents the browser from building that portion of the tree

### Anti-Patterns

- ❌ **`<div onclick>` without role or tabindex** — exists in DOM but invisible in accessibility tree as interactive element
- ❌ **`aria-label` on non-interactive `<div>`** — NVDA in browse mode may ignore it entirely
- ❌ **Conflicting names** — `<button aria-label="Close" title="Cancel">X</button>` → aria-label wins, title is confusing
- ❌ **Using `placeholder` as the accessible name** — disappears when user types, unreliable across SR
- ❌ **Hiding live regions with `aria-hidden`** — screen reader never receives updates
- ❌ **Over-using `role="application"`** — removes browse mode, disabling keyboard shortcuts users depend on

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs — Debugging the Accessibility Tree

During WCAG AA certification, we used Chrome DevTools' Accessibility panel to inspect the accessibility tree for our Fiori components. We discovered that our custom `<sap-dropdown>` component rendered a `<div>` with click handlers but no ARIA roles — it appeared in the DOM but was completely absent from the accessibility tree. Adding `role="combobox"` and `aria-expanded` made it appear correctly. This single fix resolved 12 accessibility violations.

### FAANG: Microsoft Accessibility Insights

Microsoft's Accessibility Insights tool provides a visual overlay showing the accessibility tree structure directly on the page. It highlights elements that are in the DOM but missing from the accessibility tree — these are the elements invisible to screen reader users.

### Chrome DevTools — Accessibility Tree View

Chrome DevTools (Elements panel → Accessibility tab) shows the computed accessibility tree node for any selected element: its role, name, description, state, and source of each property. The "Full-page accessibility tree" experiment renders the entire page's accessibility tree in the Elements panel.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"The accessibility tree is a parallel structure to the DOM that browsers build specifically for assistive technologies. While the DOM contains every element (including decorative divs and spans), the accessibility tree only contains semantically meaningful nodes — each with a role, name, state, and value.*

*The key insight is that what's in the accessibility tree is what screen reader users experience. A beautifully styled div with a click handler but no role attribute is invisible in the accessibility tree — it's like that element doesn't exist for 15% of users.*

*The accessible name computation follows a strict priority: aria-labelledby first, then aria-label, then the label element, then visible text, then alt, then title. Understanding this priority is essential for debugging screen reader announcements. At SAP, we used Chrome DevTools' Accessibility panel to inspect the tree and found that 30% of our custom components were missing from it entirely."*

### Likely Follow-up Questions

1. **"How is the accessibility tree different from the DOM?"** — DOM includes all elements; accessibility tree includes only semantic elements. DOM has styles; accessibility tree has roles and states.
2. **"What determines the accessible name?"** — AccName algorithm: `aria-labelledby` > `aria-label` > `<label>` > text content > `alt` > `title`
3. **"When is a DOM element excluded from the accessibility tree?"** — `display:none`, `visibility:hidden`, `aria-hidden="true"`, `role="presentation"`, or purely decorative elements with no text/role.
4. **"How do you debug accessibility tree issues?"** — Chrome DevTools Accessibility panel, Firefox Accessibility Inspector, Microsoft Accessibility Insights. Inspect each element's computed role and name.

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Accessibility tree debugging utilities

// Check if an element is in the accessibility tree
function isInAccessibilityTree(element: HTMLElement): boolean {
  // Elements removed from a11y tree:
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.getAttribute('role') === 'presentation' || 
      element.getAttribute('role') === 'none') return false;
  
  // Check if any ancestor has aria-hidden="true"
  let parent = element.parentElement;
  while (parent) {
    if (parent.getAttribute('aria-hidden') === 'true') return false;
    parent = parent.parentElement;
  }
  
  return true;
}

// Get the computed accessible name (simplified AccName algorithm)
function getAccessibleName(element: HTMLElement): string {
  // 1. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy.split(' ')
      .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
      .join(' ');
  }
  
  // 2. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // 3. <label> for form controls
  if (element.id) {
    const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (label) return label.textContent?.trim() ?? '';
  }
  
  // 4. Visible text content (for buttons, links)
  if (['BUTTON', 'A'].includes(element.tagName)) {
    return element.textContent?.trim() ?? '';
  }
  
  // 5. alt (for images)
  if (element.tagName === 'IMG') {
    return element.getAttribute('alt') ?? '';
  }
  
  // 6. title (fallback)
  return element.getAttribute('title') ?? '';
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"The accessibility tree is the screen reader's version of your page."** If an element isn't in the accessibility tree, it doesn't exist for assistive tech users. Three rules: **(1)** Use semantic HTML — it automatically creates correct tree nodes. **(2)** When you can't use semantic HTML, use ARIA roles and labels. **(3)** Inspect with Chrome DevTools Accessibility panel — what you see there is what screen readers see. Name priority: `aria-labelledby > aria-label > <label> > text > alt > title`.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ The accessibility tree is the interface between your web application and the 15% of users who depend on assistive technology. Misunderstanding it means shipping inaccessible products — which is both a UX failure and a legal liability under ADA/EAA.

**How it works:**
→ The browser parses the DOM and constructs a parallel accessibility tree containing only semantically meaningful nodes. Each node has role (from element type or `role` attribute), name (computed via AccName algorithm), state (`aria-*` attributes), and value. This tree is exposed via OS-level accessibility APIs to screen readers and other assistive technologies.

**Company relevance:**
→ **Microsoft**: Built Accessibility Insights which visualizes the accessibility tree. Expects candidates to understand tree structure deeply.
→ **Adobe**: Spectrum design system is built with accessibility tree correctness as a first-class requirement — every component has documented expected tree output.
→ **Salesforce**: LWC Shadow DOM complicates accessibility tree construction — understanding how shadow boundaries affect the tree is critical.
→ **Cisco**: Webex components must produce correct accessibility tree output for screen reader users in video conferencing.
