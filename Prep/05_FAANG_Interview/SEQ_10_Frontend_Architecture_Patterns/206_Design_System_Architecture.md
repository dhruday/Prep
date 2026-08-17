# 206. Design System Architecture
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"A design system is a shared language between design and engineering — a library of reusable components, design tokens, and guidelines that ensure visual and behavioral consistency across an entire product. At SAP, we used the Fiori design system: a set of components and patterns published by the platform team that product teams consumed via npm. The result was consistent UI across 12+ modules without each team reinventing buttons, forms, and data tables. For FAANG roles, design systems are not optional knowledge — Microsoft has Fluent UI, Adobe has Spectrum, Salesforce has SLDS."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
A design system is the combination of:
1. **Design tokens:** The primitive values (colors, spacing, typography, shadows) that define the brand
2. **Component library:** Reusable UI components built from tokens
3. **Documentation & guidelines:** When and how to use each component
4. **Contribution model:** How teams add to or request from the system

**Why it exists:**
Without a design system, 10 teams build 10 different Buttons. They have different spacing, different hover states, different accessibility behavior. Users experience inconsistency. Design changes require updates in 10 codebases.

### How It Works Internally

**Design Token → Component → Product flow:**
```
Design Token (primitive values)
  --color-primary: #0078D4
  --spacing-md: 16px
  --font-size-body: 14px

     ↓ components consume tokens

Component
  Button:
    background: var(--color-primary)
    padding: var(--spacing-md)
    font-size: var(--font-size-body)
    
     ↓ products consume components

Product Team
  <Button variant="primary">Submit</Button>
  → Correct color, spacing, font — automatically
```

**Token hierarchy:**
```
Tier 1 — Global tokens (brand primitives)
  --blue-500: #0078D4
  --blue-600: #106EBE
  
Tier 2 — Semantic tokens (context-aware)
  --color-action-primary: var(--blue-500)
  --color-action-hover: var(--blue-600)
  
Tier 3 — Component tokens (specific to one component)
  --button-background: var(--color-action-primary)
  --button-hover-background: var(--color-action-hover)
```

This hierarchy means: to change the brand color, update `--blue-500`. All components automatically update everywhere.

### Architecture & Component Boundaries

```
Design System Architecture:

design-system/
├── tokens/
│   ├── colors.json         ← Brand primitives
│   ├── spacing.json
│   ├── typography.json
│   └── index.css           ← All as CSS custom properties
│
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx  ← Storybook docs
│   │   ├── Button.test.tsx     ← Unit tests
│   │   └── index.ts            ← Public exports
│   ├── Input/
│   ├── Modal/
│   └── ... (atomic → organism hierarchy)
│
├── utils/
│   └── accessibility.ts    ← ARIA helpers, focus management
│
└── package.json
    → Published to npm as @mycompany/design-system

Product Teams:
  import { Button, Input } from '@mycompany/design-system';
```

### Data Flow & State Flow
- **Tokens → CSS:** A build step (Style Dictionary, Theo) converts token JSON to CSS custom properties, SCSS variables, or JS constants
- **CSS → Component:** Components use CSS custom properties — changing tokens propagates automatically
- **Theming:** Dark mode / white-label is just a different token set applied to the same CSS custom properties

**Theming flow:**
```
html[data-theme='dark'] {
  --color-action-primary: #60CDFF; /* different value, same variable */
}
→ All components automatically switch to dark colors
```

### Performance Implications
- **Tree-shaking:** Published with ESM (`"type": "module"`) so unused components don't enter the bundle
- **CSS custom properties:** Zero JS cost — browser handles theming via CSS cascade
- **Storybook build size:** Separate from the design system package — no impact on product bundles
- **Component versioning:** Products pin to a version → no unexpected breaking changes

### Scalability Considerations
- **1 team:** Simple shared components folder in the monorepo
- **3–5 teams:** Published npm package with semantic versioning (`@mycompany/ds@1.2.3`)
- **10+ teams:** Dedicated platform team (3–8 engineers), Storybook site, Figma integration, automated visual regression testing (Chromatic), RFC process for new components

### Trade-offs
| Design System | No Design System | When to Invest in Design System |
|---|---|---|
| Consistent UI | Inconsistent UI | 2+ teams sharing UI |
| Initial setup cost | Fast to start | Long-term product vision |
| Teams depend on it | Each team owns their UI | Design needs to be a brand asset |
| Platform team needed | No overhead | Budget exists for platform investment |
| Slower feature cadence | Each team moves independently | Quality > speed |

### ⚠️ Anti-Patterns & Pitfalls
- **Too prescriptive:** A design system that doesn't allow customization gets forked by teams → you end up with 5 design systems instead of one
- **No accessibility baked in:** If ARIA roles, keyboard navigation, and focus management aren't in the component itself, every team replicates accessibility bugs
- **Component with business logic:** A `CustomerNameInput` in the design system couples it to a specific domain — design systems should have only generic components
- **No versioning discipline:** Publishing breaking changes without major version bumps silently breaks consuming products
- **No contribution process:** Teams that can't get components into the design system build their own → fragmentation

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the Fiori design system was our foundation. Every component we used had accessibility, RTL, and theming built in. My team focused on product features — we never wrote a Button from scratch. When I fixed 30+ WCAG violations for the WCAG AA certification, 80% of the fixes were in the design system layer — fixing them once fixed them everywhere across all 12 modules. That's the multiplier effect of a well-governed design system.

**At FAANG scale:**
- **Microsoft Fluent UI:** Components built with accessibility, theming, and RTL from day one. Teams file GitHub issues for new components. Fluent 2 is the current version.
- **Adobe Spectrum:** Framework-agnostic (React Aria + Spectrum Web Components). Every Adobe product (Photoshop, XD, Express) uses the same atoms.
- **Salesforce SLDS:** Lightning Design System — CSS framework + LWC base components. Internal and external developer ecosystem.
- **Cisco Momentum Design:** Component library shared across Webex, Meraki, DNA Center.

**How it evolves with scale:**
- 2 teams: Internal NPM package, Storybook for docs
- 10 teams: Dedicated platform team, visual regression testing, Figma tokens integration
- FAANG scale: Public open-source (Fluent, Spectrum, SLDS) — external developer ecosystem, community contributions, versioning with LTS policy

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "A design system is the most important multiplier investment in a multi-team frontend org. At SAP, the Fiori design system meant every component I built inherited the correct tokens — colors, spacing, typography — without any effort. When we needed to support dark mode, we changed one token file and every component updated. And for my WCAG AA work, fixing accessibility in the design system layer fixed it across all 12 product modules at once, not 12 separate fixes. The architecture I'd recommend: three tiers of tokens (primitives, semantic, component), an Atomic Design component structure, published as versioned npm package with Storybook, and a contribution RFC process so teams can propose new components rather than forking."

### Likely Follow-up Questions
1. "What are design tokens?" → Named variables for brand primitives (colors, spacing, type scales) — the single source of truth shared between Figma and code
2. "How do you handle breaking changes in a design system?" → Semantic versioning — breaking changes only in major versions. Deprecation warnings in minor versions. Migration guides.
3. "How do you test a design system?" → Unit tests per component + visual regression with Chromatic/Percy (catches unexpected style changes) + accessibility audit (axe) per story
4. "How do you prevent teams from forking?" → Make it easy to contribute — clear RFC process, fast turnaround, escape hatches via CSS custom properties for local overrides

### vs Alternatives
| Central Design System | Per-team Components | CSS Framework (Bootstrap) |
|---|---|---|
| Consistent + shared | Flexible + independent | Fast to start |
| Requires platform team | Low overhead | Limited customization |
| Best ROI at scale | Good for startups | Good for prototypes |
| Brand-grade quality | Variable quality | Generic visual identity |

### How to Signal Senior Thinking
> "A design system is not just a component library — it's an organizational contract. It only works if product teams trust it and the platform team maintains it. The technology (Storybook, tokens, npm) is secondary. The process — how teams contribute, how breaking changes are managed, how feedback is incorporated — is what determines adoption."

---

## 💻 5. Code Example

```typescript
// Design System: Token → Component → Theming
// Shows the full architecture from primitive token to themed component

// ─── 1. TOKENS (tokens/colors.json — processed by Style Dictionary) ─
// Input: Design tokens in JSON
const tokens = {
  "color": {
    "brand": { "blue": { "500": { "value": "#0078D4" } } },
    "action": { "primary": { "value": "{color.brand.blue.500}" } }
  }
};

// Output: Generated CSS custom properties
// :root {
//   --color-brand-blue-500: #0078D4;
//   --color-action-primary: var(--color-brand-blue-500);
// }

// ─── 2. COMPONENT (uses tokens, zero hardcoded values) ──────────
// components/Button/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  disabled = false,
  onClick
}) => (
  <button
    className={`ds-button ds-button--${variant}`}
    disabled={disabled}
    onClick={onClick}
    // Accessibility baked in
    aria-disabled={disabled}
    type="button"
  >
    {children}
  </button>
);

// components/Button/Button.module.css
// .ds-button {
//   background: var(--button-background);    /* tokens, not raw values */
//   padding: var(--spacing-md) var(--spacing-lg);
//   border-radius: var(--border-radius-md);
//   font-size: var(--font-size-body);
//   color: var(--color-on-primary);
// }
// .ds-button:hover { background: var(--button-background-hover); }
// .ds-button--secondary { background: transparent; ... }

// ─── 3. THEMING (just swap token values) ───────────────────────
// :root[data-theme='dark'] {
//   --color-brand-blue-500: #60CDFF;   /* different value, same variable */
//   --color-on-primary: #000;
// }
// All components automatically adapt — no JS needed

// ─── 4. PRODUCT USAGE ──────────────────────────────────────────
import { Button } from '@mycompany/design-system';

function CheckoutForm() {
  return (
    <form>
      <Button variant="primary" onClick={handleSubmit}>
        Place Order
      </Button>
      <Button variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
    </form>
  );
}
```

**Interview vs Production difference:**
In an interview, explain the token tier hierarchy and show the CSS custom property approach. In production, add a Style Dictionary build step to generate multi-platform tokens (CSS, SCSS, iOS, Android), Storybook stories for every component variant, and Chromatic visual snapshots in CI.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "Design tokens are like a Constitution — they're the supreme law. Components are like laws — they implement the constitution. Products are citizens — they live by the laws."
**If you go blank:** "Token → component → product. Fix the token, fix everything. That's the multiplier."
**Mnemonic:** **TCP** — **T**okens define values, **C**omponents consume tokens, **P**roducts compose components

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Consistent interface — users learn one interaction model, not 10 different team variations
→ Performance: Tree-shakeable component library — products only bundle what they use
→ Business: 10x faster feature development — teams build products, not UI primitives

**How it works (3 sentences):**
Design tokens are named variables for visual primitives (colors, spacing, typography) that serve as the single source of truth shared between Figma and code. Components are built using only tokens — no hardcoded values — so a single token change updates every component instantly. The system is published as a versioned npm package, consumed by product teams who build features, not UI infrastructure.

**Company relevance:**
- Microsoft: Fluent UI is open-source — expects senior engineers to have contributed to or at least deeply consumed a mature design system
- Adobe: Spectrum — Adobe's entire product portfolio depends on this. Deep design system knowledge is a key differentiator for Adobe frontend roles.
- Salesforce: SLDS is the foundation of all Salesforce developer work — understanding its architecture is mandatory
- Cisco: Momentum Design System — expected to know how to consume and contribute to a shared component library

---
**✅ Topic 206/486 complete → continuing to Topic 207: Feature-Based vs Layer-Based Structuring**
