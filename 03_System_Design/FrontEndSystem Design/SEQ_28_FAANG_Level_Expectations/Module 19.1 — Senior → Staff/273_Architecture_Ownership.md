# 273 – Architecture Ownership

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Architecture ownership means being **responsible for the technical direction** of a system or platform. It's not about writing all the code — it's about making the key design decisions, documenting them (ADRs), ensuring consistency across teams, and evolving the architecture as requirements change. Owners create **technical vision**, define **standards and guardrails**, and **unblock other engineers**. In interviews, demonstrate this by explaining decisions you made that affected multiple teams or the entire frontend platform.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### What Architecture Owners Do

1. **Define the technical direction** — "We're moving to micro-frontends because..."
2. **Write Architecture Decision Records** — formal documentation of decisions and rationale
3. **Create guardrails** — linting rules, build checks, performance budgets
4. **Review cross-team changes** — ensure consistency and quality
5. **Mentor and unblock** — help teams implement the architecture correctly
6. **Evolve the architecture** — respond to new requirements and scale challenges

### ADR Structure

```markdown
# ADR-015: Migrate from Monolith to Micro-Frontends

## Status: Accepted
## Date: 2024-01-15

## Context
- 12 teams contribute to a single frontend codebase
- Build time: 18 minutes (was 4 minutes 2 years ago)
- Merge conflicts: 15+/week across teams
- Deploy coupling: one team's bug blocks all deployments

## Decision
Adopt Module Federation-based micro-frontends with a shared 
shell application.

## Consequences
+ Independent team deployments (reduce deploy coupling to zero)
+ Build time per app: ~3 minutes
+ Teams own their stack choices within shared constraints
- Increased infrastructure complexity (shared shell, module registry)
- Need shared design system for visual consistency
- Cross-MFE state sharing requires careful design
```

### Architecture Ownership vs Architecture Dictatorship

```
Ownership = "Here's the recommended approach, here's why, 
             and here's how to adopt it. Let me help."

Dictatorship = "You must use Redux. No exceptions."
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I owned the frontend architecture for our team's Fiori applications: I defined our micro-frontend strategy, established TypeScript strict mode as standard, created performance budgets (Lighthouse 90+), and documented all decisions as ADRs. When other teams had questions about our architecture patterns, I served as the reference point.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Architecture ownership means setting technical direction, documenting decisions through ADRs, creating guardrails (lint rules, performance budgets), and helping teams adopt the architecture. At SAP, I owned the frontend architecture: defined our micro-frontend strategy, established TypeScript strict mode, and created Lighthouse performance budgets. The key is influence through clarity and support — not mandates."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Architecture guardrails — enforced through tooling

// 1. Performance budget (enforced in CI)
// lighthouse-ci.config.js
const config = {
  assertions: {
    'categories:performance': ['error', { minScore: 0.9 }],
    'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
    'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'total-blocking-time': ['error', { maxNumericValue: 300 }],
  },
};

// 2. Bundle size check (enforced in CI)
// bundlesize.config.json
const bundleLimits = [
  { path: 'dist/main.*.js', maxSize: '250 kB' },
  { path: 'dist/vendor.*.js', maxSize: '150 kB' },
];

// 3. Architecture lint rules (custom ESLint)
// No direct API calls from components — must go through hooks
// eslint rule: no-restricted-imports for fetch/axios in component files
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Architecture Owner = Vision + ADRs + Guardrails + Mentorship + Evolution."** Not a dictator. Set direction with documentation (ADRs), enforce with tooling (CI checks), support adoption with mentorship. Own the architecture, serve the teams.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Architecture ownership is the defining responsibility of staff-level engineers when scaling frontend teams.
**How:** Write ADRs, create guardrails (CI checks, lint rules, budgets), mentor teams, evolve architecture.
**Companies:** Microsoft (Principal), Adobe (Staff), Salesforce (Principal MTS), Cisco (Principal Engineer).
