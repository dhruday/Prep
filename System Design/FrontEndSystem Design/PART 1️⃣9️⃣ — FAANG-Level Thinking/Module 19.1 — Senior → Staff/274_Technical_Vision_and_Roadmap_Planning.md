# 274 – Technical Vision & Roadmap Planning

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Technical vision is the **north star** for how the frontend platform should evolve over 6-18 months. Roadmap planning translates that vision into **quarterly milestones** with clear deliverables. Senior/staff engineers create both: (1) a **vision document** explaining where the architecture is heading and why, (2) a **roadmap** with phased execution — quick wins first, platform investments next, and strategic bets last. This is what separates feature builders from platform thinkers.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Vision Document Structure

```markdown
# Frontend Platform Vision — 2024-2025

## Current State
- Monolithic React app, 2.1MB bundle
- 4 teams contributing, growing to 8
- Build time: 12min, deploy coupling between teams
- No design system, UI inconsistency across products

## North Star (18 months)
- Independent micro-frontends per product domain
- Shared design system with 95% adoption
- Sub-3s LCP, Lighthouse 90+ for all apps
- Zero deploy coupling between teams

## Phased Roadmap
Q1: Foundation — Vite migration, design system v1, performance budgets
Q2: Extraction — First 2 micro-frontends, shared shell MVP
Q3: Scale — All teams on micro-frontends, design system v2
Q4: Polish — Analytics, A/B testing platform, developer experience
```

### Roadmap Prioritization (ICE Framework)

```
Impact × Confidence × Effort = Priority Score

High Impact + High Confidence + Low Effort = DO FIRST
├── Performance budgets in CI (impact: prevents regressions)
├── Shared ESLint config (impact: consistency, low effort)
└── Bundle analyzer in build (impact: awareness)

High Impact + Medium Confidence + High Effort = PLAN CAREFULLY  
├── Micro-frontend migration (needs pilot first)
├── Design system creation (needs designer partnership)
└── SSR adoption (needs infrastructure team)

Low Impact + Low Confidence + High Effort = DON'T DO
├── Custom bundler (Vite/Webpack are fine)
├── Build from-scratch component library (use Radix/Headless UI)
└── Rewrite in a different framework
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I created a 6-month frontend roadmap: Q1 — Lighthouse optimization (60→95), Q2 — WCAG AA compliance, Q3 — micro-frontend pilot, Q4 — security vulnerability reduction. Each quarter had measurable outcomes and clear dependencies.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I create technical vision by assessing current state, defining a north star, and building a phased roadmap. At SAP, my roadmap delivered: Q1 performance (Lighthouse 60→95), Q2 accessibility (WCAG AA), Q3 micro-frontends (modular deployment), Q4 security (80% vulnerability reduction). I prioritize using ICE: Impact × Confidence × Effort. Quick wins first to build momentum, platform investments next."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Technical roadmap as structured data
interface RoadmapItem {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  initiative: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  milestone: string;
  dependencies: string[];
}

const roadmap: RoadmapItem[] = [
  { quarter: 'Q1', initiative: 'Performance Budgets', impact: 'high', effort: 'low',
    milestone: 'Lighthouse 90+ enforced in CI', dependencies: [] },
  { quarter: 'Q1', initiative: 'Vite Migration', impact: 'high', effort: 'medium',
    milestone: 'Build time < 30s', dependencies: [] },
  { quarter: 'Q2', initiative: 'Design System v1', impact: 'high', effort: 'high',
    milestone: '20 core components, Storybook docs', dependencies: [] },
  { quarter: 'Q3', initiative: 'Micro-Frontend Pilot', impact: 'high', effort: 'high',
    milestone: '2 teams independently deployable', dependencies: ['Design System v1'] },
  { quarter: 'Q4', initiative: 'Full MFE Migration', impact: 'high', effort: 'high',
    milestone: 'All 8 teams on micro-frontends', dependencies: ['Micro-Frontend Pilot'] },
];
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Vision = Current State → North Star → Phased Roadmap."** Prioritize with ICE (Impact × Confidence × Effort). Quick wins → platform investments → strategic bets. Always have measurable milestones. Your SAP story: 60→95 Lighthouse, WCAG AA, micro-frontends, 80% security reduction.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Technical vision and roadmapping are core staff-level responsibilities. Shows you can lead technical direction.
**How:** Vision document (current state, north star, phased roadmap), ICE prioritization, quarterly milestones.
**Companies:** Critical for staff roles at all four. Microsoft's Principal and Adobe's Staff roles require demonstrated roadmap creation.
