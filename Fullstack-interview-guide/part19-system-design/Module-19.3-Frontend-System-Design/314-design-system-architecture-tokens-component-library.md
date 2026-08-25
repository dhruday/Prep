# Design System Architecture — Tokens, Component Library
> Part 19 — System Design Case Studies · High Frequency (Frontend)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What a design system is**: a shared foundation of design decisions (tokens) and UI components used across all products in an organisation; single source of truth for button styles, color palettes, typography, spacing — no more "which shade of blue is our primary color?" debate
- **Design token**: named values for visual properties; instead of `color: #0070f3` in 50 places, use `color: var(--color-primary-500)`; token changes propagate everywhere; tokens are implementation-agnostic — they can export to CSS variables, Tailwind config, iOS/Android native apps
- **Three layers**: Primitive tokens (literal values: `blue-500: #0070f3`), Semantic tokens (`color-primary: blue-500`, `color-error: red-600`), Component tokens (`button-primary-bg: color-primary`); semantic layer allows theme switching without touching component code
- **Published as an NPM package**: `@your-org/design-system` versioned using semantic versioning (breaking changes = major version); consuming apps pin to a version; upgrade is a deliberate choice
- **Component library**: React components built on top of design tokens; export from a single index; tree-shakeable (consumers only bundle what they use); full TypeScript types; documented with Storybook
- **Versioning discipline**: patch = bug fix, minor = new component, major = breaking change (prop rename, behavior change); use `peerDependencies` for React version; publish to private npm registry (Verdaccio, GitHub Packages, npm Scopes)
- **Storybook as living documentation**: each component has stories per variant (primary, secondary, disabled, loading, error); Storybook is the contract between design and engineering; visual regression testing via Chromatic or Percy compares screenshots before/after changes
- **Accessibility built-in**: components ship with ARIA attributes, keyboard navigation, focus management; consuming teams don't need to re-implement accessibility for each use case
- **Theming**: multiple brands from one component library; JSON tokens define brand-specific values; CSS variables apply the theme at the `:root` or a scoped container; switching between themes is a class change

---

## 1. One-Line Definition
A design system is a versioned NPM package containing design tokens (named CSS variables for colors, spacing, typography) and a component library (React components) that enforces visual and interaction consistency across all products, documented via Storybook, and updated through semantic versioning with automated visual regression tests.

---

## 2. The Problem It Solves

A company has three product teams building separate React apps. Each team independently implements a "Button" component — three different hover states, two different blue shades, inconsistent disabled styles. When the brand updates the primary color, design notifies all three teams. Team A and B update their buttons in week 1. Team C is in sprint and updates in week 3. For three weeks, users see inconsistent buttons across products.

More critically: Team B has 47 different usages of `color: #0070f3` scattered in CSS files. Finding and updating all of them is bug-prone.

A design system solves this: one `Button` component, one `--color-primary-500` token. Brand change → update one token → all products updated in the next release. Consistency guaranteed, not enforced by manual audits.

---

## 3. How It Works Internally

### Token Hierarchy

```
Primitive Tokens (the raw palette — never used directly in components):
  color-blue-50:   #eff6ff
  color-blue-100:  #dbeafe
  ...
  color-blue-500:  #0070f3   ← Our primary blue
  color-blue-600:  #0057d9   ← Darkened for hover
  ...
  color-red-500:   #ef4444
  
  spacing-1:  4px
  spacing-2:  8px
  spacing-3:  12px
  spacing-4:  16px
  ...
  
  font-size-sm:   14px
  font-size-md:   16px
  font-size-lg:   18px

Semantic Tokens (meaning-based — use these in components):
  color-primary:           color-blue-500   ← primary action color
  color-primary-hover:     color-blue-600
  color-primary-contrast:  #ffffff           ← text on primary bg
  color-error:             color-red-500
  color-surface:           #ffffff / #1a1a1a  ← light/dark mode
  color-text-primary:      #111827 / #f9fafb
  
  spacing-component-sm:    spacing-2  (8px)
  spacing-component-md:    spacing-4  (16px)

Component Tokens (per-component overrides):
  button-primary-bg:           color-primary
  button-primary-bg-hover:     color-primary-hover
  button-primary-text:         color-primary-contrast
  button-border-radius:        6px
  button-padding-horizontal:   spacing-component-md
```

### Package Structure

```
packages/
  tokens/
    src/
      tokens.json         ← source of truth (JSON)
    dist/
      tokens.css          ← :root { --color-primary: ...; }
      tokens.js           ← JS exports for React-in-JS usage
      tokens-dark.css     ← dark mode overrides
    package.json          ← @your-org/tokens
    
  components/
    src/
      Button/
        Button.tsx
        Button.stories.tsx
        Button.test.tsx
        index.ts          ← export { Button } from './Button'
      TextInput/
        ...
      Modal/
        ...
      index.ts            ← re-exports all components
    dist/
      esm/                ← ES modules (tree-shakeable)
      cjs/                ← CommonJS
      types/              ← .d.ts TypeScript declarations
    package.json          ← @your-org/components

  storybook/
    .storybook/
    stories/              ← may import stories from component packages
    
Consuming app:
  import { Button } from '@your-org/components';
  import '@your-org/tokens/dist/tokens.css';   ← one CSS import, all tokens
```

---

## 4. The Code

### Wrong Way — Inline Styles and Magic Values

```typescript
// ❌ Hardcoded colors, no shared tokens, 3 teams → 3 "primary blue" values

// Team A
const button = { backgroundColor: '#0070f3', padding: '8px 16px', borderRadius: '4px' };

// Team B (different shade of blue, different padding)  
const button = { backgroundColor: '#0069d9', padding: '10px 20px', borderRadius: '6px' };

// Team C (yet another blue)
const button = { backgroundColor: '#007bff', padding: '8px 16px', borderRadius: '4px' };

// ❌ When brand updates color: grep-and-replace across 3 repos
// ❌ No documentation: what does "primary button" look like? Ask design
// ❌ No accessibility: focus ring, ARIA, keyboard handled differently or not at all
// ❌ No theming: dark mode is a separate project per team
```

```typescript
// ✅ Design token foundation

// tokens.json (in @your-org/tokens package)
```

```json
{
  "color": {
    "primitive": {
      "blue": {
        "500": { "value": "#0070f3", "type": "color" },
        "600": { "value": "#0057d9", "type": "color" }
      },
      "red": {
        "500": { "value": "#ef4444", "type": "color" }
      }
    },
    "semantic": {
      "primary":          { "value": "{color.primitive.blue.500}", "type": "color" },
      "primary-hover":    { "value": "{color.primitive.blue.600}", "type": "color" },
      "error":            { "value": "{color.primitive.red.500}",  "type": "color" }
    }
  },
  "spacing": {
    "1": { "value": "4px",  "type": "spacing" },
    "2": { "value": "8px",  "type": "spacing" },
    "4": { "value": "16px", "type": "spacing" }
  }
}
```

```typescript
// Generated tokens.css (by Style Dictionary build script):
// :root {
//   --color-primitive-blue-500: #0070f3;
//   --color-semantic-primary: var(--color-primitive-blue-500);
//   --spacing-4: 16px;
// }
```

```typescript
// ✅ Button component built on tokens

// Button.tsx
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:   ButtonVariant;
    size?:      ButtonSize;
    loading?:   boolean;
    leftIcon?:  React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    variant   = 'primary',
    size      = 'md',
    loading   = false,
    disabled,
    leftIcon,
    rightIcon,
    children,
    className,
    ...props
}, ref) => {
    
    const isDisabled = disabled || loading;
    
    return (
        <button
            ref={ref}
            // ✅ Merge design system classes with consumer overrides via className
            className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')}
            disabled={isDisabled}
            // ✅ ARIA: announce loading state to screen readers
            aria-busy={loading}
            aria-disabled={isDisabled}
            // ✅ Never allow button to receive focus when disabled
            tabIndex={isDisabled ? -1 : undefined}
            {...props}
        >
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            {leftIcon  && <span className={styles.iconLeft}  aria-hidden="true">{leftIcon}</span>}
            <span className={styles.label}>{children}</span>
            {rightIcon && <span className={styles.iconRight} aria-hidden="true">{rightIcon}</span>}
        </button>
    );
});

Button.displayName = 'Button';
```

```css
/* Button.module.css — uses design tokens via CSS variables */
.button {
    display:        inline-flex;
    align-items:    center;
    gap:            var(--spacing-2);
    border:         none;
    border-radius:  var(--button-border-radius, 6px);
    cursor:         pointer;
    font-family:    var(--font-family-body);
    font-weight:    500;
    transition:     background-color 150ms ease, transform 100ms ease;
    
    /* ✅ Focus-visible: visible keyboard focus ring, no ring on mouse click */
    outline:        none;
}
.button:focus-visible {
    box-shadow: 0 0 0 3px var(--color-semantic-primary), 0 0 0 5px white;
}

.button:active:not(:disabled) {
    transform: translateY(1px);
}

/* Variants */
.primary {
    background: var(--color-semantic-primary);
    color:      var(--color-primary-contrast, #fff);
}
.primary:hover:not(:disabled) {
    background: var(--color-semantic-primary-hover);
}

.secondary {
    background: transparent;
    color:      var(--color-semantic-primary);
    border:     1.5px solid var(--color-semantic-primary);
}

/* Sizes */
.sm { padding: var(--spacing-1) var(--spacing-2); font-size: var(--font-size-sm); }
.md { padding: var(--spacing-2) var(--spacing-4); font-size: var(--font-size-md); }
.lg { padding: var(--spacing-3) var(--spacing-6); font-size: var(--font-size-lg); }

/* Disabled state */
.button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Spinner */
.spinner {
    width: 1em; height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

```typescript
// ✅ Storybook story — living documentation

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { IconSend } from '../icons';

const meta: Meta<typeof Button> = {
    title:     'Components/Button',
    component: Button,
    argTypes: {
        variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'destructive'] },
        size:    { control: 'select', options: ['sm', 'md', 'lg'] },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary:     Story = { args: { children: 'Place Order', variant: 'primary' } };
export const Secondary:   Story = { args: { children: 'Cancel', variant: 'secondary' } };
export const Loading:     Story = { args: { children: 'Saving…', loading: true } };
export const Disabled:    Story = { args: { children: 'Not Available', disabled: true } };
export const WithIcon:    Story = { args: { children: 'Send', leftIcon: <IconSend />, variant: 'primary' } };
export const Destructive: Story = { args: { children: 'Delete Account', variant: 'destructive' } };

// ✅ Accessibility test: all interactive states have sufficient color contrast
export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['primary', 'secondary', 'ghost', 'destructive'] as const).map(v => (
                <Button key={v} variant={v}>{v}</Button>
            ))}
        </div>
    )
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are design tokens and why do you need them?"

**Hruday's answer:**
> Design tokens are named constants for visual design values — things like colors, spacing, typography, border radius, shadows. Instead of writing `background-color: #0070f3` in fifty different components, you define the value once as `--color-primary: #0070f3` and reference it everywhere.
>
> The "why" is in what happens when the design changes. Without tokens, when the brand updates its primary blue from #0070f3 to #005CE6, someone needs to grep every CSS file and component across every repo, find all usages, change them manually, and hope they got everything. With tokens: change `--color-primary: #005CE6` in one file. Every component referencing `var(--color-primary)` automatically picks up the new color in the next release.
>
> The deeper value is a shared vocabulary between designers and engineers. When a designer says "use the semantic primary color," that means `--color-semantic-primary`. When they specify "medium spacing," that maps to `--spacing-4` (16px). Everyone is talking about the same things rather than guessing which hex value "our primary blue" means today.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle breaking changes in a design system without breaking all consuming apps?"

**Hruday's answer:**
> Semantic versioning is the mechanism. Patch versions (1.0.1) = bug fixes; no consuming app breaks. Minor versions (1.1.0) = new components or new optional props; no consuming app breaks. Major versions (2.0.0) = breaking changes (prop renamed, component removed, behavior change). Consuming apps must opt in by upgrading the pinned version.
>
> What makes a change breaking: renaming a prop (even if you add the new one), changing a component's default behavior, removing a component, changing the CSS class structure in a way that breaks consumer overrides, or changing the token name.
>
> The process: create a migration guide for major version changes. Keep the old prop name working for one major version (show a deprecation warning in development: `console.warn('ButtonProps.color is deprecated — use ButtonProps.variant')`). This gives teams a full major version cycle to migrate before forced breaking.
>
> Automated codemods: for large renames, write a jscodeshift codemod that the consuming teams can run — `npx @your-org/ds-codemod v2-migration ./src`. This mechanically renames props across their codebase. Example: Radix UI and Chakra UI ship codemods with every breaking version.
>
> Communication: a CHANGELOG.md that documents every breaking change, what it was, and how to migrate. Consuming teams should subscribe to design system release notifications. Shared design system office hours to help teams with migration questions.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "CSS-in-JS or CSS Modules or CSS custom properties (variables)? Which do you use and why?"

**Hruday's answer:**
> For a design system component library in 2025, I'd use CSS Modules for component styles with CSS custom properties for tokens.
>
> CSS-in-JS (styled-components, Emotion): the dynamic styling is powerful — pass a prop, get different styles. But in a design system, most components have a fixed set of variants (not dynamic runtime computations), so the dynamic benefit is overkill. Bigger problems: server-side rendering requires special handling; CSS-in-JS has runtime cost (JavaScript generates CSS at render time); bundle size from the CSS-in-JS library itself; component library consumers must use the same CSS-in-JS version or face conflicts.
>
> CSS Modules: styles are extracted at build time to static CSS; zero runtime overhead; class name collisions are prevented by the module hash; works with any meta-framework (Next.js, Remix, Vite) without configuration. Downside: no access to JavaScript theme values at render time — but that's solved by tokens.
>
> CSS custom properties for tokens: the design token values live in CSS variables (`:root { --color-primary: #0070f3; }`). Components reference `var(--color-primary)` in their CSS Modules. Theme switching (dark mode, white-label themes) is done by swapping which CSS variable values are applied — one CSS class change, no JavaScript re-render.
>
> This combination (CSS Modules + CSS custom properties) is what Radix UI and many modern design systems use. It's elegant: zero runtime overhead, full theming capability, no tooling constraints for consumers.

---

### Q4 — System Design Angle
**Interviewer asks:** "How would you build a design system that supports three different brands (SAP Fiori, SAP Analytics, and a new product line) from one component library?"

**Hruday's answer:**
> Multi-brand theming from one component library is the natural extension of a well-layered token system.
>
> The components reference only semantic tokens: `background: var(--color-surface-primary)`, `color: var(--color-text-primary)`, `border-radius: var(--border-radius-default)`. The components never reference primitive values directly.
>
> For each brand, a separate token file maps semantic tokens to the brand's specific values:
>
> `fiori-theme.css`: `--color-surface-primary: #fafafa; --color-text-primary: #223548;`
> `analytics-theme.css`: `--color-surface-primary: #000; --color-text-primary: #f0f0f0;`
> `new-product-theme.css`: custom values
>
> Applying a theme: wrap the app root with a `<ThemeProvider brand="fiori">` component that sets a `data-brand="fiori"` attribute. CSS selectors: `[data-brand="fiori"] { --color-surface-primary: #fafafa; }`. Switch brand → one attribute change → all components reflect the brand's token values instantly.
>
> What stays the same across brands: component structure, accessibility behaviour, keyboard navigation, ARIA attributes, animation timing, component props API. Only visual tokens differ per brand. One codebase, three brands, all accessible, all maintained together.
>
> SAP Fiori does exactly this — their Fiori design system supports multiple themes (Horizon, Evening Horizon, High Contrast Black, High Contrast White) from one component set. The same approach scales from 2 to 20 brands with minimal additional work.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| One big "atoms to pages" library | "I'll build atoms, molecules, organisms, and pages all in one package" | Shipping page-level components in a design system couples the system to specific business layouts; page templates belong in the consuming app; the design system should be layout-agnostic; if you ship a LoginPage component, it becomes very opinionated about which fields, which copy, which layout — and impossible to update without breaking every app that uses it; ship atoms (Button, Input, Badge) and molecules (Form field with label + input + error) but stop at organism level at most; the boundary is: does this component contain business logic? if yes, it doesn't belong in the design system |
| No visual regression tests | "I'll write unit tests for the components to make sure they work" | Unit tests verify behaviour (click fires event, disabled prevents click) but don't catch visual regressions (a CSS change turns all secondary buttons purple); visual regression testing takes a screenshot of each Storybook story and compares it to the last approved screenshot; any pixel change shows as a diff for review; tools: Chromatic (Storybook's official tool), Percy, Playwright visual snapshots; without visual regression, a CSS typo can silently break the entire component library's appearance across all products without any test failing |
| No peer dependencies | "I'll include React in the design system's dependencies" | If the design system bundles React as a `dependency` (not `peerDependency`), consumers end up with two copies of React — the one they installed and the one bundled in the design system; React doesn't support two instances simultaneously (hooks break); always declare React as a `peerDependency` (`"peerDependencies": {"react": ">=17"}`); this tells npm/yarn that the consumer must provide React themselves; the design system expects it but doesn't bundle it |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I contributed to the component library used by multiple internal product teams. Before the library existed, each team had its own `Button.tsx` — we had five variants across four teams. When SAP updated the Fiori design guidelines, four teams independently updated their buttons over three different sprints. For six weeks, users saw inconsistent UI across products.
>
> After the shared design system was in place, a Fiori guideline update became a single PR to the design system repo. The PR updated the semantic token values and the Button styles. Teams received the updated version via a minor npm release. After upgrading (a one-line `package.json` change), all buttons were consistent. A change that previously took 6 weeks and 4 teams now took 2 days in one team."

---

## 8. Scale Evolution

**1,000 users / single team →** Simple shared component folder with well-named CSS custom properties. No separate npm package — just a `shared/` directory within the monorepo. Storybook for documentation. Get the token naming convention right from the start.

**100,000 users / 3-5 product teams →** Published npm package `@your-org/components`. Semantic versioning. Style Dictionary for token generation. Storybook hosted publicly. Chromatic for visual regression on each PR. CHANGELOG.md. Deprecation warnings for breaking changes.

**10 million users / 10+ products / multi-brand →** Multi-theme token layer (brand-specific CSS variable sets). Automated accessibility auditing (axe-core in Storybook, Deque CI checks). Multi-framework support (React + Angular outputs from same tokens). Automated codemods for major version migrations. Design-to-code pipeline: Figma tokens plugin keeps Figma variables and code tokens in sync automatically.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout UI consistency across merchant integrations; multi-product design system (RazorpayX, Razorpay Dashboard, Checkout widget) | Brand token consistency; embeddable component isolation |
| Swiggy / Meesho | Meesho seller app + buyer app consistency; Swiggy consumer app + restaurant partner app; multi-brand theming | Multi-brand from one library; mobile-first responsive tokens |
| Adobe / Microsoft | Microsoft Fluent Design System — one of the most mature design systems publicly; Adobe Spectrum; these are their flagship products | Deep knowledge of large-scale design system architecture |
| SAP Labs | SAP Fiori Design System — directly relevant; the internal shared library story above; multi-theme support (Horizon, High Contrast); multi-framework (React + Angular) | Real contribution to a design system; SAP Fiori knowledge |

---

## 10. Related Topics — What to Study Next

- **Topic 315 — Micro-frontend Shell** — design system components are shared across micro-frontends; the shell manages which version of the design system each micro-frontend uses; singleton import concerns (two React instances) connect directly to this topic
- **Topic 311 — Autocomplete Search** — the search input in the design system is one of the most complex components to build accessibly; keyboard navigation, ARIA combobox pattern, internal state management all connect to this topic
- **Topic 313 — Infinite Scroll Feed** — FeedCard is a common design system component; token-based spacing, typography, and colors all apply; the design system ensures FeedCard looks identical whether used in the social feed or the notification panel
- **Topic 05 — CSS Architecture (BEM, CSS Variables, Tailwind)** — understanding CSS custom properties deeply, cascade, specificity, and CSS layer rules is the technical foundation for implementing design tokens correctly

---

*Part 19 · Design System Architecture — Tokens, Component Library · Full Stack Interview Guide · Hruday D · 2026*
