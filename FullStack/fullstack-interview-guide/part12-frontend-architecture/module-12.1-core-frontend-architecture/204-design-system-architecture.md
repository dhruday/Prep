# Design System Architecture
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Design system**: a shared collection of reusable UI components, design tokens (colours, spacing, typography), interaction patterns, and documentation that allows multiple teams to build consistent, accessible interfaces — it's the "single source of truth" for how the product looks and behaves
- **Design tokens**: the atomic values in a design system — colour primitives (`#1A73E8`), semantic aliases (`color-primary-action`), component-level tokens (`button-background-primary`); tokens are technology-agnostic (defined as JSON, compiled into CSS variables, JavaScript constants, and iOS/Android formats) so one change propagates everywhere
- **Component library vs design system**: a component library is a set of code components; a design system is BROADER — it includes design principles, token taxonomy, usage guidelines, accessibility requirements, motion specs, and content writing guidelines; the component library is part of the design system, not equal to it
- **Versioning and breaking changes**: design systems require semantic versioning; a colour token rename is a breaking change (major version); a new component is a minor version; teams must be able to opt into upgrades without being forced onto breaking changes mid-sprint; this is where most companies struggle
- **Monorepo token pipeline**: design tokens defined in a shared JSON/YAML source → Style Dictionary transforms them → outputs CSS variables, Tailwind config, SCSS variables, and iOS/Android theme files — one source of truth, many consumers
- ✅ **Hruday's anchor**: built and maintained the shared component library at SAP Labs (used across 6 micro-frontends); WCAG AA certification; Storybook-first component development; Lighthouse 60→95 performance work touched design system impact

---

## 1. One-Line Definition
Design system architecture is the structured approach to building, documenting, versioning, and distributing a shared library of UI components and design tokens so that multiple teams produce consistent, accessible, and brand-aligned interfaces without duplicating work.

---

## 2. The Problem It Solves

Imagine a company with 8 product teams, each building their own version of a Button component. Team A's button has 16px font size. Team B's button has 14px. Team C's uses a slightly different shade of the brand colour. The checkout team built a dropdown. The search team built a different dropdown. The pricing page has a third dropdown. The product has eight different interpretations of "our button," six different dropdowns, and users notice — the interface feels inconsistent, distrustworthy, somehow "cheap" even if each individual page is well-built.

The accessibility problem is multiplied: eight teams each building their own ARIA patterns, keyboard navigation, and focus management means accessibility issues in seven of eight implementations. Getting to WCAG AA means fixing eight places instead of one.

The performance problem: each team has their own CSS for their own button. Users download redundant CSS when navigating between pages owned by different teams.

The speed problem: a new product feature requires building a settings page. Without a design system, the engineer starts from scratch — figuring out the colour, spacing, what button variant to use, how much padding a card should have. With a design system, the engineer opens Storybook, finds the components, assembles the page, done. The design and engineering decisions are pre-made.

At SAP, having the shared component library meant new micro-frontend teams had a full, accessible, brand-consistent UI toolkit on day one. The WCAG AA certification I led was possible because accessibility lived in ONE component library, not eight.

---

## 3. How It Works Internally

### Token Hierarchy

```
3-tier token taxonomy:

Tier 1 — Primitives (raw values, never used directly in components):
  color-blue-500: "#1A73E8"
  color-blue-600: "#1557B0"
  color-gray-100: "#F8F9FA"
  space-4: "4px"
  space-8: "8px"
  font-size-md: "16px"
  
  These are palette values. Never reference in components.

Tier 2 — Semantic tokens (purpose-based aliases to primitives):
  color-action-primary: {value: "{color-blue-500}"}
  color-action-primary-hover: {value: "{color-blue-600}"}
  color-surface-default: {value: "{color-gray-100}"}
  space-component-padding-md: {value: "{space-8}"}
  
  These communicate PURPOSE — "this is the primary action colour"
  Swapping from blue to green theme = change color-action-primary → one change
  
Tier 3 — Component tokens (tie semantic tokens to specific components):
  button-background-primary: {value: "{color-action-primary}"}
  button-background-primary-hover: {value: "{color-action-primary-hover}"}
  button-padding-horizontal-md: {value: "{space-component-padding-md}"}
  
  These allow per-component theming without touching semantic tokens.
  Makes multi-brand theming possible (SAP brand vs Customer brand)
```

### Token Pipeline (Style Dictionary)

```
Source: tokens/
  ├── global.json        (primitives)
  ├── semantic.json      (semantic aliases)
  └── components/
      ├── button.json    (component tokens)
      └── card.json

Style Dictionary transforms:
  ┌─────────────────────┐
  │   tokens/*.json     │ ← Single source
  └──────────┬──────────┘
             │ style-dictionary build
             │
    ┌─────────┼──────────────┬─────────────┐
    ▼         ▼              ▼             ▼
 CSS Vars   SCSS Vars   JS/TS consts   iOS/Android
  :root {    $button-bg: #...            swift/kotlin
   --button  ...            export const
   -bg-pri:             buttonBgPrimary
   #1A73E8              = "#1A73E8"
  }

Consumer (React component):
  .button-primary {
    background: var(--button-background-primary);  ← uses CSS var token
  }
  /* When theme changes → CSS vars change → all components update, no code change */
```

### Component Library Package Structure

```
@mycompany/design-system/
├── dist/
│   ├── esm/             (ES modules for tree shaking)
│   ├── cjs/             (CommonJS for older toolchains)
│   └── css/             (tokens compiled to CSS variables)
├── src/
│   ├── tokens/          (JSON token source)
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx           (component implementation)
│   │   │   ├── Button.test.tsx      (unit tests)
│   │   │   ├── Button.stories.tsx   (Storybook stories — all states)
│   │   │   ├── Button.module.css    (CSS modules using token vars)
│   │   │   └── index.ts             (public export)
│   │   └── ...
│   └── index.ts         (barrel export of all public components)
└── package.json         (version, peerDependencies: react)
```

---

## 4. The Code

### Wrong Way — Hardcoded Values, No Token System
```tsx
// ❌ WRONG — Button component with hardcoded values throughout

// components/Button.tsx
export function Button({ children, variant = 'primary' }) {
  return (
    <button
      style={{
        backgroundColor: variant === 'primary' ? '#1A73E8' : '#FFFFFF',
        color: variant === 'primary' ? '#FFFFFF' : '#1A73E8',
        padding: '8px 16px',       // ❌ magic numbers, not from token system
        fontSize: '14px',          // ❌ hardcoded — out of sync with typography scale
        borderRadius: '4px',       // ❌ different teams use 4px, 6px, 8px
        border: variant === 'primary' ? 'none' : '1px solid #1A73E8',
        cursor: 'pointer',
        // ❌ No focus style — not keyboard accessible
        // ❌ No disabled state
        // ❌ No aria attributes
      }}
    >
      {children}
    </button>
  );
}

// Later, in a different file by a different engineer:
// <button style={{ backgroundColor: '#1A73EB', padding: '8px 14px' }}>
// Slightly different colour (typo), different padding — inconsistency accumulates
```

> **Why this fails:** When the brand colour changes from `#1A73E8` to `#0D47A1`, every hardcoded instance must be found and updated manually — grep across the codebase, update every file, risk missing some. More critically: no focus style means keyboard users have no visual indicator of where they are — WCAG 2.4.7 violation. No `disabled` attribute handling means disabled buttons still respond to clicks in some implementations.

### Right Way — Token-Based, Accessible, Documented Component
```json
// tokens/semantic.json — single source of truth
{
  "color": {
    "action": {
      "primary": { "value": "{color.blue.500}", "description": "Primary CTAs and interactive elements" },
      "primary-hover": { "value": "{color.blue.600}" },
      "primary-text": { "value": "{color.neutral.0}", "description": "Text on primary action backgrounds" },
      "secondary-border": { "value": "{color.blue.500}" },
      "disabled-bg": { "value": "{color.neutral.200}" },
      "disabled-text": { "value": "{color.neutral.500}" }
    }
  },
  "space": {
    "component": {
      "padding-sm": { "value": "{space.2}" },
      "padding-md": { "value": "{space.3}" },
      "padding-lg": { "value": "{space.4}" }
    }
  },
  "radius": {
    "button": { "value": "{radius.md}", "description": "Consistent button corner radius" }
  }
}
```

```tsx
// components/Button/Button.tsx — production-quality, accessible, token-driven

import React from 'react';
import styles from './Button.module.css';
import { clsx } from 'clsx';  // (or 'classnames')

// Strong TypeScript interface — documents the API contract
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  // Note: Does NOT accept 'style' prop directly — enforces token usage
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      className,
      'aria-label': ariaLabel,
      ...rest  // passes through type, form, onClick, etc.
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    
    return (
      <button
        ref={ref}
        className={clsx(
          styles.button,
          styles[`button--${variant}`],
          styles[`button--${size}`],
          { [styles['button--loading']]: isLoading },
          className  // allows consumer to add one-off overrides (spacing, margin)
        )}
        disabled={isDisabled}  // native disabled — keyboard and click blocked
        aria-disabled={isDisabled}  // for screen readers on non-button elements
        aria-busy={isLoading}  // tells screen reader "still processing"
        aria-label={ariaLabel}  // required when button has no text (icon-only buttons)
        {...rest}
      >
        {isLoading && (
          <span className={styles['button__spinner']} aria-hidden="true" />
        )}
        {leftIcon && (
          <span className={styles['button__icon--left']} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span>{children}</span>
        {rightIcon && (
          <span className={styles['button__icon--right']} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';  // Required for forwardRef components in React DevTools
```

```css
/* Button.module.css — uses CSS variables compiled from tokens */
.button {
  /* Box model */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border-radius: var(--radius-button);
  
  /* Typography — from token scale */
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  
  /* Interaction */
  cursor: pointer;
  user-select: none;
  transition: background-color 150ms ease, box-shadow 150ms ease;
  
  /* CRITICAL: visible focus ring for keyboard users — WCAG 2.4.7 */
  /* outline: none is the most common WCAG violation in component libraries */
  &:focus-visible {
    outline: 3px solid var(--color-focus-ring);
    outline-offset: 2px;
  }
}

/* Size variants using token scale */
.button--sm {
  padding: var(--space-component-padding-sm) var(--space-3);
  font-size: var(--font-size-sm);
}

.button--md {
  padding: var(--space-component-padding-md) var(--space-4);
  font-size: var(--font-size-md);
}

/* Variant: primary */
.button--primary {
  background: var(--color-action-primary);
  color: var(--color-action-primary-text);
  border: none;
}

.button--primary:hover:not(:disabled) {
  background: var(--color-action-primary-hover);
  box-shadow: var(--shadow-sm);
}

/* Disabled state — covers both disabled and aria-disabled */
.button:disabled,
.button[aria-disabled="true"] {
  background: var(--color-action-disabled-bg);
  color: var(--color-action-disabled-text);
  cursor: not-allowed;
  box-shadow: none;
}
```

```tsx
// components/Button/Button.stories.tsx — Storybook documentation
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
    // Runs automated axe accessibility checks on every story
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// EVERY state must have a story — this is what the design system review gates
export const Primary: Story = { args: { children: 'Primary Button' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Loading: Story = { args: { children: 'Saving...', isLoading: true } };
export const Disabled: Story = { args: { children: 'Not Available', disabled: true } };
export const WithIcon: Story = {
  args: { children: 'Add to Cart', leftIcon: <CartIcon /> }
};
export const IconOnly: Story = {
  args: { children: undefined, 'aria-label': 'Search', leftIcon: <SearchIcon /> }
};
```

> **Key decisions here:**
> - `React.forwardRef` — allows parent components to pass a `ref` to the underlying `<button>`, required for forms, focus management, and animation libraries
> - `aria-hidden="true"` on icon spans — icons are decorative when the button has text; screen readers read the text only; icon-only buttons REQUIRE an `aria-label`
> - `:focus-visible` not `:focus` — modern accessibility: shows focus ring only for keyboard users (browser hides it for mouse clicks using `focus-visible` heuristic); this resolves the "ugly focus ring on click" vs "no focus ring for keyboard" dilemma
> - `{...rest}` spread before explicit props override — allows passing through `onClick`, `type`, `form` etc. without enumerating them; explicit props listed first so they can't be overridden by the spread

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a component library and a design system?"

**Hruday's answer:**
> A component library is the code artefact — a set of React (or Angular) components that teams can import and use. It's the implementation layer.
>
> A design system is broader. It includes the component library, but also the design tokens (the visual language — colours, spacing, typography, motion), usage guidelines (when to use a Primary button vs a Ghost button), content and writing style guidelines (how to phrase error messages), accessibility standards (every interactive component must meet WCAG AA), design files (Figma components that mirror the code components one-to-one), and documentation (Storybook showing every component state with interactive controls).
>
> The key attribute of a design system vs a component library is the Figma-to-code parity. When a designer drags a component from the Figma library, they are working with the exact same component that the engineer implements. When a design token changes in Figma, it updates in the code via an automated token pipeline. Without that, you have a component library that gradually drifts from the design intent — designers and engineers working on separate truths.
>
> At SAP, what we had was primarily a component library — well-structured, version-controlled, Storybook-documented, accessible. A full design system would have added the token pipeline with Figma sync and the written usage guidance. The distinction matters in interviews at companies with mature design practices (Adobe, Microsoft, Swiggy) because they want to know if you understand the full scope, not just "here are some React components."

---

### Q2 — Deep Dive
**Interviewer asks:** "How do design tokens enable theming and why is the three-tier hierarchy important?"

**Hruday's answer:**
> Without the three-tier hierarchy, changing a theme means finding every hardcoded colour value and changing it — error-prone and non-scalable. With the hierarchy, changing the theme means changing one pointer.
>
> Tier 1 is the palette — the raw values. `blue-500: #1A73E8`. This tier never changes between themes within a product, but it defines the universe of available values.
>
> Tier 2 is semantic — meaning attached to raw values. `color-action-primary: blue-500`. This is where theming happens. If you have a "SAP theme" and a "Customer brand theme," you swap the semantic tier: in the SAP theme, `color-action-primary` → `blue-500`; in a Customer's white-label theme, `color-action-primary` → `customer-brand-600`. The component code never changes. The semantic token is swapped.
>
> Tier 3 is component-level — it maps semantic tokens to specific component slots. `button-background-primary: color-action-primary`. This level enables per-component customisation without breaking semantic consistency. If a customer wants to tweak ONLY their button background (not all primary actions), they can override `button-background-primary` specifically.
>
> In CSS, this is implemented as three layers of CSS custom property declarations. At `:root` level, primitive values are set. In a `[data-theme="customer"]` scope, semantic values are overridden. Component styles reference the tier-3 tokens, which cascade from the appropriate scope. Theme switching is a single `data-theme` attribute change on `<html>` — no JavaScript, no re-render, just CSS cascade.

---

### Q3 — Trade-Off
**Interviewer asks:** "How do you manage breaking changes in a design system without forcing all teams to update at once?"

**Hruday's answer:**
> Semantic versioning is the foundation — but the process around it is what actually protects teams.
>
> I follow a deprecation-before-removal workflow. A breaking change goes through three phases: deprecation, grace period, removal. In phase one, the old API still works but emits a runtime console warning: "Button 'color' prop is deprecated. Use 'variant' instead. Will be removed in v4.0." Teams can see this in development and plan the migration. In phase two (one or two minor versions), the deprecated prop still functions. In phase three (the major version bump), it's removed.
>
> Codemods automate migration for simple cases. An AST transform script that rewrites `<Button color="blue">` to `<Button variant="primary">` across an entire codebase — teams run one command and their migration is done. We built codemods for our major version upgrades at SAP and they covered 80-90% of cases automatically.
>
> Change logs must be human-readable, not just commit message dumps. "BREAKING: Button 'size' prop now accepts 'sm' | 'md' | 'lg' instead of numbers. Migration: replace `size={16}` with `size='md'`." Every breaking change has an explicit before/after example.
>
> The governance rule: no breaking change ship without 30 days of deprecation warning AND a codemod for automated migration. Non-negotiable — it protects team autonomy and keeps the design system the helpful centre, not the blocker.

---

### Q4 — Scenario
**Interviewer asks:** "Describe how you would set up a design system for a new product that will eventually have 5 frontend teams."

**Hruday's answer:**
> Phase 1 — Foundations (before building product UI).
> Start with design tokens: define the colour palette, spacing scale, typography scale, border radii, and shadow values. Publish them in a `tokens.json` in a dedicated repo. Set up Style Dictionary to compile to CSS custom properties and TypeScript constants. This is the non-negotiable first step — without tokens, any component you build will have hardcoded values.
>
> Phase 2 — Core atoms (first 4-6 weeks).
> Build the 5-10 components that everything else is made of: Button, Input, Select, Checkbox, Badge, Card, Modal. For each: Storybook stories for all states, accessibility review with automated axe checks, unit tests, documented TypeScript props. Publish as `@company/design-system` at version `0.1.0`.
>
> Phase 3 — Governance setup (alongside Phase 2).
> Establish the contribution process: any engineer can propose a new component via a design review, any designer-engineer pairing can contribute it with mandatory Storybook stories and accessibility checklist. Set up Chromatic for visual regression testing — every PR runs the visual diff against the Storybook baseline, blocking merge if pixels change unexpectedly.
>
> Phase 4 — Scale.
> As teams grow, introduce a design system working group (one rep from each product team + the design platform team). Monthly reviews for deprecation decisions, major version planning, and contribution reviews. Track adoption metrics: what component is most used? What's still being built locally (signals a gap in the library)?
>
> The failure mode to avoid: building the design system in isolation for 3 months before any product team uses it. Build with a real product consumer from day one — it prevents over-engineering components for hypothetical needs.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just remove outline: none for clean UI" | "We set `outline: none` on all focus states for a cleaner look" | This removes keyboard focus visibility — WCAG 2.4.7 violation; the fix is `:focus-visible` which shows focus ring ONLY for keyboard navigation, not mouse clicks; this is not a trade-off, it's a must-fix; at SAP we caught this in the accessibility audit and it was in every single button and input across 6 micro-frontends |
| "Design tokens are just CSS variables" | "We use CSS variables for our tokens — same thing" | CSS variables are the OUTPUT of the token system, not the token system itself; tokens are technology-agnostic named values with semantic meaning — the JSON source compiles to CSS variables, Tailwind config, SCSS variables, iOS Swift, Android Kotlin; CSS variables alone are single-platform; a proper token system is multi-platform |
| "We can add accessibility later" | "We'll handle accessibility after the initial launch" | Accessibility retrofitted into a component library is 10× the cost of accessibility built in from the start; once 6 product teams are using the library, every accessibility fix requires coordinating 6 teams to update AND testing all 6 implementations; build it in with `aria-*` attributes, focus management, and colour contrast from component v1 |
| "Anyone can contribute to the design system freely" | "We have an open contribution model — any engineer can add components" | Ungoverned contributions lead to a component library with 8 kinds of tooltip, each slightly different; establish a contribution gate: design review + accessibility review + Storybook with all states + unit tests + usage documentation; be willing to say "this is too specific to your team to belong in the shared library" |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I led the front-end accessibility initiative that achieved WCAG AA certification across our micro-frontend products. The design system was central to this — once we fixed the focus management, colour contrast, and ARIA patterns in the shared component library, all six micro-frontends inherited the fixes in their next `npm update`. If we hadn't had a shared library, that would have been six separate remediation efforts across six codebases.
>
> The specific component that taught me the most was our custom `Select` dropdown. The native `<select>` is accessible by default, but our design required a custom-styled dropdown. Building that to be keyboard-navigable (Arrow keys to navigate, Enter to select, Escape to close, Home/End for first/last), screen-reader-compatible (ARIA roles: `combobox`, `listbox`, `option`), and touch-friendly — that was a 3-day component build. But it was 3 days once, not 3 days × 6 teams.
>
> That's the ROI of a design system: non-trivial problems solved once in one place."

---

## 8. Scale Evolution

**1 team, new product →** Token JSON file + 8-10 atomic components + Storybook. Ship to a private npm package early. Don't over-engineer the contribution process yet. Fast iteration is the priority.

**3-5 teams →** Add Chromatic visual regression. Add automated axe accessibility testing in Storybook. Add a contribution checklist. Move to monorepo (Nx or Turborepo) with the design system as a shared library. Start versioning with changelogs.

**10+ teams, enterprise →** Design system team (2-4 engineers, 1 designer) working on it full-time. Figma token sync via Figma Tokens plugin or Supernova. Multi-brand theming. Component usage analytics (which teams use which components). Full codemod pipeline for major versions. Figma-to-code handoff automated via design token parity audit tool.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Consistent payment UI is a trust signal — design inconsistency in checkout reduces conversion; the design system ensures the payment flow looks the same across SDK forms, web checkout, and mobile web; brand consistency is directly tied to revenue | Know token-based theming for brand consistency across surfaces; accessibility in form components (payment forms used under high stress) |
| Swiggy / Meesho | Consumer apps with massive user bases — WCAG compliance driven by user types (elderly users, diverse devices); component library consistency across restaurant listing, cart, checkout, order tracking; high-velocity product shipping requires ready-made components | Storybook-driven development; Design system as enabler of team velocity at scale; token-based dark mode |
| Adobe / Microsoft | Adobe Spectrum and Microsoft Fluent are among the most mature public design systems in the industry; interviews at these companies probe design system architecture deeply; RTL support, theming, accessibility at the deepest level | Know ARIA composition patterns for complex components (data tables, date pickers, drag-and-drop); internationalisation and RTL layout considerations; compound component patterns |
| SAP Labs | Direct experience: built and maintained shared component library for SAP BTP micro-frontends; WCAG AA certification; Storybook-first development culture at SAP | Anchor the real SAP story — 6 micro-frontend consumers, WCAG AA outcome, custom Select accessibility work, Storybook as development contract |

---

## 10. Related Topics — What to Study Next

- **Topic 200 — Component-Driven Architecture** — a design system IS component-driven architecture formalised; atomic design is the same mental model applied at the company level; the design principles (single responsibility, composability, testable in isolation) that make individual components good are the same that make design system components good
- **Topic 201 — Micro-Frontend Architecture** — the design system as a federated module is the advanced integration pattern; sharing the design system as a Webpack Module Federation federated module ensures all micro-frontends use the same CSS variables and components at runtime without bundling them separately
- **Topic 234 — Core Web Vitals** — design system CSS affects LCP (are Token CSS files download-blocking?), CLS (do component skeleton states prevent layout shift?), and INP (are large CSS class calculations slowing interaction response?); a well-built design system with CSS variables and scoped CSS modules has minimal Web Vitals impact
- **Topic 253 — Jest + React Testing Library** — testing strategy for design system components requires both unit tests (component contract: given these props, renders this output) and visual regression tests (Chromatic: comparing rendered screenshot to baseline); accessibility testing with `@testing-library/jest-dom` matchers and axe-core integration

---

*Part 12 · Design System Architecture · Full Stack Interview Guide · Hruday D · 2026*
