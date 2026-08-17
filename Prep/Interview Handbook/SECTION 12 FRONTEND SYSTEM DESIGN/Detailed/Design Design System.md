# Design Design System

*Component Library, Tokens, Accessibility, Versioning, Theming & Adoption*

**Frontend System Design Handbook — Staff/Principal-Level Interview Preparation**

---

# PART 1 — Problem Statement

## Business Requirements

- A design system's "customers" are **internal product teams**, not end users — its value is measured in reduced duplicated design/engineering effort, faster delivery, and consistent brand and UX quality across every product surface a company ships.
- It's the primary practical lever for **organization-wide accessibility compliance**: if accessibility is built into shared primitives once, every consuming team gets it largely for free, rather than each team re-solving it (or failing to).
- Must support the business's actual brand reality: a single brand, multiple sub-brands, or even white-labeled products for external customers, without forking the underlying component code per brand.

## Functional Requirements

- A **component library** covering common UI patterns (buttons, inputs, modals, navigation, data tables, form controls) usable across the company's product surfaces.
- **Design tokens** as the single source of truth for color, spacing, typography, and motion — consumed by code, and ideally also by design tooling (Figma) so design and implementation never drift.
- **Theming**: light/dark mode and, where relevant, multi-brand theming, without requiring consuming teams to fork or override component internals.
- A **documentation/example site** (commonly a Storybook-style tool) showing live, interactive examples and usage guidance for every component.
- **Versioned releases** with changelogs, a defined **deprecation policy**, and **codemod tooling** to automate migration through breaking changes.
- A **contribution process** allowing product teams to propose, build, and graduate new components into the shared system, rather than every component being built solely by a central team.

## Non-Functional Requirements

- **Bundle size discipline**: components must be tree-shakeable so a consuming app pays only for what it actually uses, not the entire library.
- **Cross-browser and cross-platform support** matching the company's actual product support matrix.
- **Backward compatibility and migration tooling**: breaking changes are inevitable over a multi-year system lifetime, and the system must make them survivable at scale (dozens to hundreds of consuming apps).
- **Accessibility**: WCAG 2.1 AA as the non-negotiable floor for every shared primitive, since this is the most leveraged place in the entire organization to enforce it.
- **Scalability of contribution and governance**, not just runtime performance — the system must keep working as the number of consuming teams grows from a handful to hundreds.

## User Scale Assumptions

- "Users" here are internal: potentially dozens to hundreds of product teams and hundreds to thousands of engineers, across web and possibly native mobile platforms, all depending on a shared foundation that a much smaller core team maintains.

## Performance Expectations

- Including a design system component should add minimal, predictable bundle and runtime cost; theming should not require expensive runtime computation or unnecessary re-renders when a theme is applied or switched.
- The documentation site itself should be fast and pleasant to use, since it's the primary discovery and adoption tool for the whole system.

## Accessibility Requirements

- Every primitive meets WCAG 2.1 AA by default: correct semantics, full keyboard operability, proper focus management, and sufficient contrast — **built into the component, not left to the consuming team to add**.
- Standardized interaction patterns (e.g., how a combobox or a modal is expected to behave with a keyboard) are documented and consistent across every component that implements them.

## Security Requirements

- Supply-chain integrity for the published package(s) — provenance, dependency vetting, and a clear process for security patches to propagate to consumers.
- Components that render user- or customer-supplied content (rich text, markdown, theme values in white-labeled contexts) must sanitize that input — a design system bug here can become a vulnerability replicated across every consuming app simultaneously.

---

# PART 2 — Interviewer's Expectations

## What Interviewers Evaluate

- Does the candidate recognize this as **a platform/product problem** — with internal "customers," adoption dynamics, and governance — rather than purely a component-architecture exercise?
- Can they design a **layered token system** (raw/global values → semantic/alias tokens → component-specific tokens) that actually supports theming, rather than hardcoding values into components?
- Do they have a credible answer for **versioning and breaking changes at the scale of dozens-to-hundreds of consumers** — semver discipline, codemods, deprecation windows — rather than assuming everyone just upgrades promptly?
- Do they treat **accessibility as a default property of the primitives**, not an opt-in feature each consuming team must remember to add?

## Common Mistakes

- Treating the question as "design a component library" and never mentioning tokens, theming, or governance at all.
- Hardcoding colors/spacing directly in component styles instead of referencing a token layer — this is the single most common shortcut that quietly defeats the entire point of a design system.
- Assuming 100% of consuming teams will promptly adopt every new version, with no plan for the realistic case where adoption lags significantly.
- Designing the contribution model as "one central team builds everything," which inevitably becomes an organizational bottleneck once the company has more than a handful of product teams.

## Red Flags

- No distinction between **raw/global tokens** (e.g., a specific hex value) and **semantic tokens** (e.g., "primary action color," which might map to different raw values per theme) — without this layering, theming is essentially impossible to do cleanly.
- No migration story for breaking changes — "teams will just update their code" is not a plan at real scale.
- "Use semantic HTML" as the entire accessibility strategy, with no discussion of keyboard interaction patterns, focus management, or automated testing.
- No mention of how design (Figma) and code stay in sync — a recurring, very real source of drift and confusion in real organizations.

## Strong Signals

- Describes a **three-tier token model** and a transform pipeline (conceptually similar to Style Dictionary) that generates platform-specific outputs (CSS custom properties for web, native token files for iOS/Android, a Figma sync) from one source of truth.
- Discusses **CSS custom properties for runtime theming** as a way to switch themes without a JavaScript re-render, vs. JS-based theme objects/CSS-in-JS, as a genuine trade-off rather than an assumed default.
- Proposes **semver discipline plus codemod tooling** for breaking changes, with a defined deprecation window and parallel version support during migration.
- Designs accessibility testing (e.g., automated `axe`-style checks) as a **CI gate** that blocks merges/releases, not a manual, easily-skipped step.

## Staff-Level Signals

- Frames the design system explicitly as **an internal product** with a roadmap, adoption metrics, and a defined relationship to its "customers" (the consuming teams) — including how the team prioritizes what to build next.
- Discusses a **federated contribution model**: a core platform team owns governance, primitives, and the token pipeline, while embedded designers/engineers on product teams contribute and graduate components through a defined review process — and explains why this scales better than pure centralization.
- Proposes concrete **adoption-driving mechanisms** beyond "publish it and hope" — migration support, codemods, dashboards tracking the percentage of UI surface on current vs. legacy components, and aligning incentives so teams actually want to upgrade.
- Ties the accessibility strategy explicitly to **organization-wide compliance risk**, framing the design system as the most leveraged single investment a company can make in that area.

---

# PART 3 — Requirement Gathering

- How many consuming teams/products are we designing for today, and what's the realistic growth trajectory — does the contribution model need to support hundreds of teams eventually?
- Is multi-brand or white-label theming a real requirement, or is this a single-brand system with just light/dark mode?
- Do we need to support multiple platforms (web, iOS, Android) from a shared token source, or is this scoped to web only?
- What's the existing design tooling situation — is there a Figma library we need to keep in sync with code, or are we designing both from scratch together?
- What's our accessibility compliance bar — WCAG 2.1 AA, or a stricter contractual requirement given the industries the company's products serve?
- Should the contribution model be fully centralized (one team builds everything) or federated (other teams contribute components through a governed process)?
- What's the expected cadence and tolerance for breaking changes — is this a slow-moving foundational system, or does it need to support rapid iteration?
- Do we need automated visual regression testing and accessibility testing as CI gates, or is manual review acceptable at this stage?
- Is there a legacy component library or set of ad hoc shared components we're migrating from, and if so, what does that migration path need to look like?
- What's our bundle-size budget per component, and do we need to support fully tree-shakeable, à la carte imports?
- Do consuming teams need the ability to override or extend component styling, and if so, how do we prevent that from undermining consistency entirely?
- What telemetry, if any, can we collect on component usage across consuming apps to inform roadmap and deprecation decisions?
- Is there a requirement for runtime theme switching (e.g., a user-facing dark mode toggle), or is theming decided at build time per app?
- How should we handle components that render user-generated or customer-supplied content (rich text, custom theme values) from a security standpoint?

---

# PART 4 — High-Level Architecture

## Architecture Diagram (ASCII)

```
                          ┌─────────────────────────────────┐
                          │ Design Tokens (source)          │
                          │ color · spacing · type · motion │
                          │ global → semantic → component   │
                          └─────────────────────────────────┘
                                            ▼
                 ┌───────────────────────────────────────────────────┐
                 │ Token Transform Pipeline (Style-Dictionary-style) │
                 └───────────────────────────────────────────────────┘
                                            ▼
              ┌──────────────────┐   ┌───────────────┐   ┌──────────────┐
              │ CSS Custom       │   │ iOS / Android │   │ Figma Tokens │
              │ Properties (Web) │   │ Token Files   │   │ Plugin Sync  │
              └──────────────────┘   └───────────────┘   └──────────────┘
                                            ▼
                 ┌────────────────────────────────────────────────────┐
                 │ Component Library                                  │
                 │ primitives → composite components, built on tokens │
                 │ headless logic layer + themeable styling layer     │
                 └────────────────────────────────────────────────────┘
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ CI Gate: visual regression · a11y (axe) · bundle-size budget · RFC/governance review │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                            ▼
         ┌────────────────────────────────┐    ┌─────────────────────────────┐
         │ Versioned Monorepo Publish     │    │ Docs / Storybook Site       │
         │ (semver, changelogs, codemods) │    │ (live examples, a11y notes) │
         └────────────────────────────────┘    └─────────────────────────────┘
                                            ▼
                                 ┌────────────────────┐
                                 │ npm Registry / CDN │
                                 └────────────────────┘
                                            ▼
                    ┌────────────┐   ┌────────────┐   ┌────────────┐
                    │ Team A app │   │ Team B app │   │ Team N app │
                    └────────────┘   └────────────┘   └────────────┘
```

## Component Breakdown

- **Design tokens**: the single source of truth, organized in tiers — raw/global values (a specific hex code, a base spacing unit), semantic/alias tokens (what that raw value *means*, e.g., "surface-primary," which can map to a different raw value per theme), and component-specific tokens (e.g., "button-primary-background," which references a semantic token).
- **Token transform pipeline**: converts the single token source into every platform's native format — CSS custom properties for web, platform-native token files for iOS/Android, and a sync mechanism keeping Figma's design tooling aligned with the same values.
- **Component library**: built strictly on top of tokens (never hardcoded values), often split into a **headless logic layer** (behavior, state, accessibility semantics) and a **themeable styling layer**, so the same interaction logic can support different visual treatments.
- **CI gate**: automated visual regression testing, accessibility testing, and bundle-size budget checks that every change must pass before merging or publishing — this is what makes "accessible and consistent by default" an enforced property rather than an aspiration.
- **Versioned publish + docs site**: the distribution mechanism (semver-versioned packages with changelogs and codemods) and the discovery/adoption mechanism (a documentation site showing live examples), built from the same component source so they never drift from each other.

## Frontend Layers

1. **Token layer** — the source of truth for all design decisions expressed as data.
2. **Primitive/headless layer** — unstyled behavior and accessibility logic (focus management, keyboard handling, ARIA wiring).
3. **Styled component layer** — visual presentation built on tokens, consuming the primitive layer's behavior.
4. **Distribution layer** — versioned packages, documentation, and migration tooling.

## Backend Dependencies

- This system has comparatively few traditional backend dependencies; its "backend" is largely the **package registry/CDN**, the **CI/build infrastructure**, and (for design-tooling sync) the **Figma API**.
- Usage telemetry, if collected, requires a lightweight ingestion endpoint and a dashboard, but this is a small, internal-facing system relative to the consumer-product backends discussed elsewhere in this handbook.

## Data Flow

- **A design decision changes** (e.g., the brand's primary color updates): the change is made once in the token source → the transform pipeline regenerates every platform output → component library styling updates automatically since it references the semantic token, not the raw value → a new version is published → consuming apps pick it up on their own upgrade cadence.
- **A new component is proposed**: a contributing team builds it against the existing primitive/token layers, following documented patterns → it goes through the RFC/governance review (design review, accessibility review, API review) → once approved, it's added to the shared library and documented on the site.
- **A breaking change ships**: it's released under a new major version, accompanied by a codemod that automates the mechanical parts of the migration, with the previous major version still supported for a defined deprecation window.

---

# PART 5 — Frontend Architecture

## Folder Structure

```
packages/
  tokens/                // raw token source + transform pipeline config
  primitives/             // headless, unstyled behavior (focus, keyboard, ARIA)
  components/               // styled, composite components built on primitives + tokens
  icons/
  codemods/                  // automated migration scripts for breaking changes
apps/
  docs/                       // Storybook-style documentation/example site
```

## Component Architecture

- **Headless/primitive + styled-layer split**: behavior and accessibility logic (e.g., "how does a combobox handle arrow keys and announce selection changes") lives in a primitive layer separate from visual styling, so the same correct behavior underlies every themed variant.
- **Composable, slot-based APIs** are generally preferred over deeply configurable prop-based APIs for complex components — letting consumers compose sub-parts (e.g., a `Dialog.Trigger`, `Dialog.Content`, `Dialog.Close`) tends to age better than an ever-growing list of boolean props trying to anticipate every layout variation.

## State Management

- The design system itself generally has no "global state" in the consumer-app sense; the closest equivalent is a **theme context/provider** that components read from to resolve the correct token values for the active theme.

## Data Fetching

- Not applicable to the component library itself; the documentation site may fetch component metadata/usage examples, but this is a minor concern relative to the rest of this handbook's topics.

## Caching Strategy

- Consuming apps cache the published package via their normal dependency-management tooling; the design system's role is to publish predictable, well-versioned releases that play well with that, including clear changelogs so teams can assess upgrade risk before pulling a new version.

## Error Handling

- Components should fail gracefully and visibly if a required token is missing (e.g., falling back to a sensible default and surfacing a development-time warning) rather than silently rendering incorrectly or throwing in a way that breaks an entire consuming app.

## Retry Strategy

- Not generally applicable to a component library; the closer analog is the **codemod tooling's** ability to be re-run safely (idempotently) if a migration is interrupted partway through a large consuming codebase.

## Loading States

- The system provides shared **skeleton/placeholder primitives** so consuming apps render loading states consistently, rather than every team inventing its own.

## Feature Flags

- New or experimental components/APIs are often released under an explicit "unstable"/"experimental" designation (sometimes literally flagged in the package, e.g., an `unstable_` prefix) so consumers can opt in with the explicit understanding that the API may still change before stabilizing.

## Analytics Integration

- **Usage telemetry** (which components and which versions are in use, across which consuming apps, opt-in and aggregated) is one of the most valuable signals the core team has — it directly informs roadmap prioritization and safe deprecation decisions.

---

# PART 6 — Performance Engineering

## Initial Load Optimization

- Not directly applicable in the way it is for an end-user product, but the **documentation site** itself should be fast, since slow, frustrating documentation actively discourages adoption.

## Bundle Splitting

- Every component is individually, à la carte importable; the package is built and published with `sideEffects: false` and proper ESM output so consuming apps' bundlers can tree-shake unused components and unused component code paths entirely.

## Lazy Loading

- Large, infrequently-used components (e.g., a complex data table or rich text editor) are structured so they don't get pulled into a consuming app's bundle unless that app actually imports and uses them.

## Prefetching

- Not generally applicable to the library itself; consuming apps make their own prefetching decisions about when to load design-system-provided components.

## Virtualization

- The system provides **virtualization-aware primitives** for components that commonly need them (long lists, large data tables) so individual consuming teams don't each need to solve list virtualization from scratch with potentially inconsistent accessibility behavior.

## Memoization

- Complex composite components memoize expensive internal computations (e.g., a date picker's calendar grid generation) so they don't become a performance liability themselves when embedded in a consuming app's broader render tree.

## Rendering Optimization

- Favor **CSS custom properties for theming** specifically because switching a theme (e.g., toggling dark mode) becomes a CSS-level change (updating the values custom properties resolve to) rather than a cascading React re-render of every themed component.

## API Optimization

- Not directly applicable; the closest analog is keeping the **token transform pipeline** fast enough that local development iteration (changing a token and seeing the effect) stays fast for engineers working in the system itself.

## Browser Optimization

- Components are built and tested against the company's actual supported browser matrix; polyfill or fallback strategies for CSS custom properties (or other modern features) are handled once, centrally, rather than by every consuming team independently.

---

# PART 7 — Scalability

| Scale | Architecture Characteristics | Primary Bottlenecks | Mitigations |
|---|---|---|---|
| ~5–10 consuming teams | Small core team builds and maintains everything directly; simple versioning, manual review | Minimal; focus on getting the token/component foundations right | Invest early in the three-tier token model and accessibility-by-default, since retrofitting later is far more expensive |
| ~10–50 teams | Documentation site and Storybook-style examples become essential for discoverability; basic CI gates (a11y, visual regression) introduced | Central team starting to become a bottleneck for new component requests | Introduce a lightweight contribution process so teams can propose components, even if the core team still does final review |
| ~50–200 teams | Federated contribution model formalized with RFC process; codemod tooling becomes necessary for breaking changes; usage telemetry introduced | Breaking changes ripple expensively across many consumers; documentation/discoverability strain as the component catalog grows | Strict semver discipline plus automated codemods; deprecation windows with parallel version support; telemetry-informed governance of what to deprecate |
| 200+ teams / multi-platform | Multi-platform token pipeline (web, iOS, Android) and possibly multi-brand theming formalized; dedicated platform team with embedded contributors across product teams | Organizational coordination overhead; governance becoming either too slow (bottleneck) or too loose (fragmentation/duplicate components) | Clear, documented governance tiers (what needs full RFC review vs. lightweight approval); adoption dashboards and incentive alignment to drive migration off legacy versions |

## Bottlenecks and Solutions, Explained

- The dominant scaling axis for a design system is **organizational, not computational** — the system doesn't get slower as more teams use it (if anything, more usage validates and hardens it), but the **governance and contribution model** absolutely can become a bottleneck if it doesn't evolve from "one team does everything" toward a federated model as the company grows.
- **Breaking changes** become disproportionately expensive as the consumer count grows, which is exactly why investment in semver discipline, codemods, and deprecation tooling pays off increasingly over time — it's cheap to skip early on and increasingly painful to add later, after many breaking releases have already happened without it.

---

# PART 8 — Accessibility

## WCAG Compliance

- WCAG 2.1 AA is the floor for every shared primitive — this is the design system's single most important responsibility to the organization, since it's the most leveraged point at which to ensure compliance across every consuming product.

## Keyboard Navigation

- Every interactive primitive (menus, comboboxes, dialogs, tabs) implements the standard, well-documented keyboard interaction pattern for that widget type consistently — so a user who learns the keyboard behavior of one app's dropdown can rely on the same behavior everywhere the design system is used.

## Screen Readers

- ARIA roles, states, and properties are wired correctly inside the primitive layer **by default**, so a consuming team gets correct screen reader behavior without needing to understand ARIA deeply themselves.

## ARIA Strategy

- The system's documentation explicitly states the expected accessible behavior of each component (keyboard shortcuts, announced states) so both contributors and consumers have a clear, testable specification to build and verify against — accessibility behavior is treated as part of the component's public contract, not an implementation detail.

## Focus Management

- Shared focus-management utilities (focus traps for modals, roving tabindex helpers for composite widgets, focus restoration on close) are provided centrally, since getting this right is subtle and error-prone, and centralizing it means it only needs to be solved once.

## Enterprise Accessibility Requirements

- For companies selling into regulated industries, the design system's accessibility guarantees are often the concrete artifact that makes Section 508/EN 301 549 compliance achievable across dozens of products without each product team becoming an accessibility expert independently.

---

# PART 9 — Security

## Authentication

- Not directly applicable to the component library itself; any authentication-adjacent components (e.g., a login form pattern) handle credentials according to the consuming app's own auth flow, not the design system's.

## Authorization

- Not generally applicable; this system has no "permissions" model of its own beyond standard package-registry publish access control (who can publish a new version).

## Session Management

- Not applicable to the library itself.

## XSS Protection

- Components that render rich text, markdown, or other potentially-unsafe content **must sanitize it** before rendering — a vulnerability here is especially serious because it's replicated, simultaneously, across every consuming app that uses the affected component.

## CSRF Protection

- Not applicable to the component library; this is a consuming-application concern.

## Clickjacking Protection

- Not applicable to the component library itself.

## Sensitive Data Handling

- For **white-labeled theming** where an external customer can supply their own theme values (colors, possibly custom CSS), those values must be validated/sanitized before being injected as CSS, since unsanitized customer-supplied "theme" input is a realistic CSS-injection vector.
- Supply-chain integrity (signed releases, dependency auditing, a clear security-patch process) matters disproportionately here because a compromised design-system package would affect every consuming application simultaneously.

---

# PART 10 — Offline Support

## Service Workers

- Not generally applicable to the component library itself; the **documentation site** may use a service worker for faster repeat visits during development, but this is a minor convenience, not a core requirement.

## Local Storage Usage

- Not applicable to the library; any local storage usage (e.g., a documented theme-preference pattern) is the consuming app's own implementation choice, with the design system at most providing the underlying primitive.

## IndexedDB

- Not applicable.

## Synchronization Strategy

- Not applicable in the traditional sense; the closest analog is **keeping the Figma library and the code library in sync**, which is handled via the token-sync pipeline rather than any runtime synchronization concern.

## Conflict Resolution

- The practical "conflict" in this domain is **design-token drift**: if designers update colors directly in Figma without updating the token source (or vice versa), the two diverge. The mitigation is making the token source the single enforced source of truth that both Figma and code pull from, rather than allowing either side to be edited independently.

---

# PART 11 — Monitoring

## Logging

- Not a major concern for the library itself; relevant logging is mostly within the CI/build pipeline (build failures, test failures) rather than runtime logging.

## Metrics

- **Adoption metrics**: percentage of UI surface (ideally measured, not just self-reported) using current vs. legacy component versions, broken down by consuming team.
- **Bundle-size metrics**: tracked per component, per release, with regressions flagged automatically.

## Error Tracking

- Bug reports from consuming teams are triaged with particular attention to **accessibility regressions**, given the outsized, multiplied impact a single primitive's a11y bug has across every consumer.

## User Monitoring

- "User monitoring" here means **consumer-team monitoring**: tracking which teams have adopted which versions, and which components are most/least used, to inform both roadmap and deprecation decisions — this is the design system's equivalent of product analytics.

## Performance Monitoring

- Automated bundle-size and rendering-performance benchmarks run in CI for every change, since a regression introduced once propagates to every consuming app that upgrades.

---

# PART 12 — Trade-Off Analysis

## CSS Custom Properties vs. CSS-in-JS vs. Utility-CSS for Theming

- **Why choose CSS custom properties**: theme switching becomes a cheap CSS-level operation (updating variable values) rather than a JavaScript re-render cascade; works well with server-rendered content since theming doesn't depend on JS execution.
- **Alternative**: CSS-in-JS with JS theme objects, or a utility-CSS approach (e.g., generating classes from tokens at build time).
- **Pros of custom properties**: best runtime theme-switching performance, framework-agnostic.
- **Cons**: slightly less type-safety/tooling support compared to JS-based theme objects, and older browser support needs consideration (though this is largely a solved problem today).
- **When CSS-in-JS might still be chosen**: a team already deeply invested in a CSS-in-JS ecosystem with strong existing tooling/type-safety benefits might reasonably prioritize that consistency over the marginal theming-performance gain of custom properties.

## Headless (Unstyled Logic) + Separate Styling Layer vs. Fully Pre-Styled Components

- **Why choose headless + styling split**: cleanly separates "is this accessible and behaviorally correct" from "does this match the current brand," letting the same correct behavior support multiple visual treatments (including future brand refreshes) without re-deriving accessibility logic.
- **Alternative**: fully pre-styled, opinionated components with limited customization.
- **Pros of the split**: maximum flexibility for theming/rebranding, behavior logic only needs to be correct once.
- **Cons**: more upfront architectural complexity, and consuming teams have more decisions to make (which can slow initial adoption if not well-documented).
- **When fully pre-styled is the better choice**: a company with a single, stable brand and no near-term need for dramatic visual flexibility may reasonably prefer the simplicity of fully pre-styled components over the added flexibility most companies don't end up needing.

## Centralized vs. Federated Contribution Model

- **Why choose centralized** (a single core team builds everything): strong consistency guarantees, simpler governance, no risk of conflicting component implementations.
- **Alternative**: federated, where product teams contribute components through a defined review process.
- **Pros of centralized**: easiest to keep coherent at small scale.
- **Cons**: becomes an organizational bottleneck as the number of consuming teams and component requests grows.
- **When centralized remains appropriate**: a smaller organization (the "~5–10 teams" stage in Part 7) where the core team can realistically keep up with demand — federating prematurely adds governance overhead without yet solving a real bottleneck problem.

## Strict Semver + Codemods vs. Continuous/Trunk-Based Releases

- **Why choose strict semver with codemods**: gives consuming teams a clear, predictable signal about upgrade risk, and automated codemods make even major-version migrations tractable across many consumers.
- **Alternative**: continuous releases with minimal versioning ceremony, common in smaller, fast-moving organizations.
- **Pros of strict semver**: scales to many independent consumers who can't all coordinate upgrade timing.
- **Cons**: more process overhead, and codemod tooling itself is a real, ongoing engineering investment.
- **When continuous/looser versioning is reasonable**: a small number of consuming teams in close communication (e.g., a single product org) can often coordinate upgrades informally without the full ceremony — the strict versioning investment pays off specifically at the scale where direct coordination breaks down.

---

# PART 13 — Follow-Up Questions

1. **Why is a three-tier token model (global/semantic/component) better than just using raw values directly in components?** It decouples "what value is this" from "what does this value mean," which is what makes theming (the same semantic token resolving to different raw values per theme) possible at all.
2. **How would you keep a Figma library in sync with the code component library?** Both pull from the same token source via a sync pipeline (e.g., a Figma tokens plugin), so a token change propagates to both design and code rather than being manually kept in parallel.
3. **How do you handle a breaking change to a widely-used component?** Release it under a new major version with an accompanying codemod, support the previous major version in parallel for a defined deprecation window, and communicate the migration path clearly in the changelog.
4. **What's your strategy for preventing accessibility regressions as the component library grows?** Automated accessibility testing (e.g., `axe`-based checks) as a CI gate that blocks merges, supplemented by periodic manual screen-reader testing for complex interaction patterns automated tools can't fully verify.
5. **How would you decide whether a new component should be built centrally or contributed by a product team?** Based on how broadly applicable it is and the organization's current scale — broadly useful primitives generally warrant central ownership and rigor, while more niche, product-specific components are better suited to a federated contribution path.
6. **Why use CSS custom properties for theming instead of a JavaScript theme object?** Custom properties let theme switching happen at the CSS level without triggering a full component re-render cascade, which matters for runtime theme-switching performance.
7. **How do you measure whether the design system is actually succeeding?** Adoption metrics (percentage of UI surface on current vs. legacy components, across teams), reduced duplicate/ad hoc component creation, and accessibility compliance coverage are the core signals — not just "the library exists and has documentation."
8. **What happens if two different teams build conflicting versions of essentially the same component?** This is a governance failure signal — it suggests either the contribution process isn't visible/accessible enough, or there's a real gap in the shared library that should be addressed by building the missing component centrally.
9. **How would you support a white-labeled product where an external customer supplies their own brand colors?** Accept theme values through the same token-driven theming mechanism used internally, but validate/sanitize customer-supplied values before they're used to generate CSS, since unsanitized external input into styling is a real injection risk.
10. **How do you keep bundle size under control as the component catalog grows?** Enforce per-component bundle-size budgets in CI, ensure proper tree-shaking configuration (`sideEffects: false`, ESM output), and structure heavy/rare components so they're never pulled in unless explicitly imported.
11. **What's the right way to document a component's accessibility behavior?** Explicitly, as part of its public contract — documented keyboard interactions, ARIA roles/states used, and any required consumer responsibilities (e.g., providing accessible labels) — not left implicit in the source code.
12. **How would you handle a component that needs slightly different behavior for one specific consuming team?** Favor composable APIs (slots, render props, or similar) that let that team customize within supported extension points, rather than adding an ever-growing list of one-off configuration props to the shared component.
13. **Why might a design system provide virtualization-aware list/table primitives rather than leaving that to each consuming team?** List virtualization has subtle correctness and accessibility pitfalls; solving it once, correctly, in the shared primitive avoids dozens of teams independently re-solving (and likely under-solving) the same problem.
14. **How do you handle a security vulnerability discovered in a widely-used shared component?** Treat it with the urgency of an organization-wide incident, not a single-team bug, since the same vulnerable code is live in every consuming app that uses that component — patch and publish quickly, with clear, direct communication to consuming teams about the urgency of upgrading.
15. **What's your approach to deprecating an old component nobody should use anymore?** Usage telemetry identifies remaining consumers; deprecation warnings (build-time or lint-rule-based) flag continued usage; a defined timeline and migration guide (ideally with a codemod) gives teams a clear path off it before final removal.
16. **How would you support both web and native mobile platforms from one design system?** Share the token layer (the same semantic decisions) across platforms via the transform pipeline, while platform-specific component implementations consume those shared tokens natively — the source of truth is shared even though the rendering code isn't.
17. **What governance model would you use to decide what gets added to the system?** A lightweight RFC-style process scaled to the change's impact: broadly-applicable primitives get full design/accessibility/API review, while smaller additions or fixes can go through an expedited path — avoiding both unchecked fragmentation and unnecessary bureaucracy.
18. **How do you avoid the documentation site drifting out of sync with the actual component behavior?** Build the documentation site directly from the same component source (e.g., live, interactive examples rendering the real components, not static screenshots or hand-written descriptions), so they can't silently diverge.
19. **What's the risk of a fully centralized contribution model at large scale?** It becomes a throughput bottleneck — the central team can't keep pace with demand from a large number of product teams, leading to either long wait times or teams bypassing the system and building ad hoc components anyway.
20. **How would you handle a component that needs to render arbitrary, potentially unsafe HTML (e.g., a rich text display component)?** Sanitize the input centrally within the component itself, so every consumer gets safe-by-default behavior rather than each consuming team needing to remember to sanitize before passing content in.

---

# PART 14 — Staff Engineer Deep Dive

## Architectural Evolution

- Most organizations' design systems evolve from **ad hoc shared components** (a handful of components copy-pasted or loosely shared between a few early teams) to a **formal, token-driven system** once duplicated effort and inconsistency become visible organizational costs, and eventually to a **multi-platform, possibly multi-brand system** as the company's product surface grows — each stage justified by genuine, demonstrated pain from the previous one.

## Long-Term Maintainability

- The **token layer and the primitive/accessibility layer** are the highest-leverage, highest-blast-radius code in the system; changes here are reviewed with proportionally more rigor than changes to an individual styled component's visual treatment.

## Team Scalability

- A core platform team owns governance, the token pipeline, and foundational primitives; a federated set of contributors across product teams build and propose components through a defined review process — this is what lets the system scale past what any single team could realistically build and maintain alone.

## Platform Strategy

- Treating the design system explicitly as **an internal product** — with a roadmap, adoption metrics, and a defined relationship to its internal "customers" — is what distinguishes a design system that's actually adopted and maintained from one that's built once and slowly abandoned as it falls out of sync with real product needs.

## Technical Debt Management

- Deprecating old components is treated with the same seriousness as deprecating a public API: usage telemetry informs timing, a clear migration path (ideally with tooling) is provided, and removal only happens after a defined window — abrupt removal at this scale breaks many consuming teams simultaneously and erodes trust in the system.

## Migration Strategy

- Breaking changes ship with **codemods that automate the mechanical parts of migration**, parallel support for the previous major version during a deprecation window, and clear, proactive communication — treating migration support as a core deliverable of any breaking change, not an afterthought left to each consuming team to solve independently.

---

# PART 15 — Production Reality

## What Most Companies Actually Do

- Very few companies achieve full multi-platform token parity (web, iOS, Android, Figma, all from one source) from day one — it's almost always an **evolutionary build-out**, starting with web and code-Figma sync, and extending to other platforms only once the organizational need and investment case are clear.
- Most real design systems rely on **existing component-primitive libraries** (headless accessibility-focused libraries) for the hardest behavioral/accessibility logic, rather than building every interaction pattern's accessibility behavior entirely from scratch — reserving custom engineering effort for the visual/branding layer and the organization-specific governance and token pipeline.

## Common Anti-Patterns

- A component library with **no real token layer underneath it** — colors and spacing hardcoded directly into component styles — which technically provides shared components but defeats the actual purpose (consistent, themeable, centrally-updatable design decisions).
- **Top-down mandated adoption** with no incentive alignment or migration support, which reliably produces either slow, resentful compliance or teams quietly working around the system entirely.
- **No governance process**, leading to duplicate, slightly-inconsistent components being built independently by different teams because there was no visible, accessible path to contribute to or request additions from the shared system.

## Lessons Learned

- **Adoption is as much a people and incentive problem as a technical one** — a technically excellent design system with no migration support, no clear communication, and no incentive for teams to upgrade will still see slow, partial adoption.
- **Accessibility regressions creep in quietly without automated enforcement** — a design system that relies on manual review alone will, over a long enough timeline, accumulate accessibility bugs that automated CI gates would have caught immediately.

## Real-World Failure Patterns

- A **breaking change shipped without a codemod or adequate deprecation window** is one of the most common, organizationally painful failure patterns in this domain — it can simultaneously break dozens of consuming applications and severely damage trust in the design system team for a long time afterward.
- **Design-development drift** (Figma showing one thing, the live component looking subtly different) is a recurring, ongoing maintenance burden whenever the token-sync pipeline isn't treated as a first-class, continuously-maintained piece of infrastructure rather than a one-time integration.

---

# PART 16 — Interview Summary

## 5-Minute Answer

"The foundation is a three-tier token system — raw/global values, semantic/alias tokens that give those values meaning, and component-specific tokens that reference the semantic layer — generated through a transform pipeline into platform-specific outputs (CSS custom properties for web, native formats for mobile, and a Figma sync so design and code never drift). Components are built strictly on top of that token layer, often split into a headless behavior/accessibility layer and a separate themeable styling layer, so the same correct, WCAG-AA-compliant behavior underlies every visual variant. Because this system has potentially hundreds of internal consumers, versioning discipline matters enormously: strict semver, automated codemods for breaking changes, and defined deprecation windows. And critically, this isn't just a components problem — it's a platform/product problem, which means governance (how new components get proposed and reviewed) and adoption strategy (migration support, usage telemetry, incentive alignment) are as important as the technical architecture."

## 15-Minute Answer

Extend with: the full architecture (token source, transform pipeline, platform outputs, the headless-plus-styled component library, the CI gate enforcing accessibility/visual-regression/bundle-size, versioned publishing, and the documentation site built from the same source); the data-flow walkthroughs for a token change, a new component contribution, and a breaking-change release; the accessibility approach (behavior documented as part of each component's public contract, automated `axe`-based CI enforcement); and at least two explicit trade-offs — CSS custom properties vs. CSS-in-JS for theming, and centralized vs. federated contribution models — stated with the specific organizational scale at which each becomes the right choice.

## 30-Minute Deep Dive

Cover everything above, plus: the full scalability progression and why this system's dominant bottleneck is organizational/governance rather than computational; the security considerations specific to this domain (supply-chain integrity, sanitizing customer-supplied theme values in white-label contexts, and the outsized blast radius of any vulnerability in a shared component); the monitoring approach centered on adoption metrics and bundle-size regression tracking rather than traditional runtime telemetry; and a staff-level closing on framing the design system explicitly as an internal product with its own roadmap and customers, the federated contribution model with tiered governance, how deprecation and migration tooling are treated as core deliverables rather than afterthoughts, and how production reality (most systems building incrementally rather than achieving full multi-platform parity on day one, and the recurring real-world failure modes around unsupported breaking changes and design-code drift) shapes this from a textbook architecture into something an organization can actually sustain and keep adopted over many years.
