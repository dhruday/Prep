# 272 – Senior vs Staff Expectations

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Senior engineers **own features end-to-end** — they design, implement, test, and ship within their team. Staff engineers **own architecture across teams** — they set technical direction, influence multiple teams, and make decisions that affect the entire frontend platform. The key difference: **scope of impact**. Senior = team-level impact. Staff = org-level impact. In interviews, demonstrating staff-level thinking means discussing cross-team concerns, organizational patterns, and technical vision.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Comparison Matrix

| Dimension | Senior (L5/SDE2) | Staff (L6/Principal) |
|-----------|-------------------|----------------------|
| **Scope** | Feature / component | Platform / architecture |
| **Impact** | Team | Organization |
| **Design** | Component & module design | System & cross-team design |
| **Code** | Writes production code daily | Writes strategic code, reviews more |
| **Decisions** | Within team constraints | Sets team constraints |
| **Communication** | Team standups, code reviews | Architecture reviews, tech talks, RFCs |
| **Ambiguity** | Given clear requirements | Defines requirements from business goals |
| **Mentorship** | Helps juniors on tasks | Grows senior engineers into leads |

### Staff-Level Behaviors in Interviews

**1. Cross-Team Thinking:**
```
Senior: "I'd use Redux for state management in my feature."
Staff:  "We need a consistent state management strategy across 
         all product teams. I'd create an RFC proposing Zustand 
         as the standard, with migration guides for teams on Redux."
```

**2. Technical Vision:**
```
Senior: "I migrated our app from CRA to Vite for faster builds."
Staff:  "I created a 6-month frontend platform roadmap: Vite migration 
         (Q1), design system v2 (Q2), micro-frontend extraction (Q3), 
         with buy-in from 4 team leads."
```

**3. Influencing Without Authority:**
```
Senior: "I convinced my tech lead to adopt TypeScript strict mode."
Staff:  "I wrote an ADR demonstrating TypeScript strict mode reduced 
         production bugs by 40% in our team, presented to the frontend 
         guild, and 6 teams adopted it within a quarter."
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, my staff-level contributions included: driving the micro-frontend architecture adoption across teams, creating the accessibility compliance framework used by multiple products, and establishing performance budgets (Lighthouse 90+) as an org-wide standard.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Senior engineers own features within their team. Staff engineers own architecture across teams. The key shift is scope of impact — from team to organization. In my role at SAP, I demonstrated staff-level impact: I drove micro-frontend architecture adoption across multiple teams, established org-wide performance budgets, and created the accessibility compliance framework. The difference is: senior asks 'how do I build this?', staff asks 'how should we all build this?'"*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Senior-level: Implements a great component
function useInfiniteScroll(fetchPage: (page: number) => Promise<Item[]>) {
  // Well-implemented infinite scroll hook for their feature
}

// Staff-level: Creates a platform capability for all teams
// architecture-decision-record.md
/*
# ADR-042: Standard Data Fetching Pattern

## Context
6 teams use 4 different data fetching approaches (fetch, axios, custom hooks, RTK Query).
Inconsistency causes: duplicated code, different caching strategies, inconsistent error handling.

## Decision
Adopt React Query (TanStack Query) as the standard data fetching library.

## Rationale
- Consistent caching, retry, and error handling across teams
- Built-in DevTools for debugging
- SSR support for our Next.js migration
- 70% reduction in data fetching boilerplate in pilot team

## Migration Plan
- Q1: Pilot with 2 teams, gather feedback
- Q2: Create migration guide + shared query configurations
- Q3: Remaining 4 teams migrate, deprecate custom solutions

## Trade-offs
- Learning curve for teams on Redux/Saga patterns
- TanStack dependency (evaluated: stable, well-maintained, 25k GitHub stars)
*/
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Senior = team scope, feature ownership. Staff = org scope, architecture ownership."** Staff thinks cross-team, writes RFCs/ADRs, creates platform capabilities, influences without authority. In interviews, show org-level impact: standards you set, teams you influenced, platforms you built.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Understanding the level distinction helps you pitch your experience at the right level — and aim for the right IC track.
**How:** Demonstrate cross-team impact, technical vision, RFC/ADR writing, platform thinking, and influence without authority.
**Companies:** **Microsoft** (Senior vs Principal), **Adobe** (SDE vs Staff), **Salesforce** (MTS vs Principal), **Cisco** (Engineer vs Principal).
