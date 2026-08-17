# 397 – Story 8: Ambiguity and Innovation — Micro-Frontends Architecture

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At SAP, as our Fiori platform grew to 5 product teams working on the same SPA, deployment became a bottleneck — one team's broken build blocked all others. Merge conflicts were frequent, and deployment cadence dropped to bi-weekly.

**TASK:** I was asked to "figure out how to let teams deploy independently" — an intentionally vague mandate from the engineering director with no predefined solution.

**ACTION:**
1. **Research phase** — spent 1 week evaluating 4 approaches: iframe-based, Module Federation, single-spa, and npm-package micro-frontends. Created a comparison matrix scoring each on: DX, performance, shared state, independent deployment, and team autonomy
2. **Stakeholder alignment** — presented findings to engineering director and team leads. Recommended Module Federation for its balance of performance and DX
3. **PoC first** — built a working proof-of-concept with 2 teams' features as separate micro-frontends in 2 weeks, demonstrating independent builds and shared design system
4. **Incremental migration** — designed a strangler fig pattern — new features built as micro-frontends, old features migrated gradually over 3 months
5. **Shared contracts** — established shared type definitions, event bus for cross-micro-frontend communication, and a shell app for routing
6. **Deployment automation** — each micro-frontend had its own CI/CD pipeline deploying to separate CDN paths

**RESULT:**
- 5 independent micro-frontends deployed independently
- Deployment frequency: bi-weekly → daily per team
- Zero cross-team deployment blocks
- Merge conflicts reduced ~90%
- Architecture adopted as SAP's standard for new products
- Presented the architecture at an internal tech talk (100+ attendees)

---

### Maps To Questions
- "Tell me about navigating ambiguity"
- "Describe an innovative solution you designed"
- "How do you make decisions with incomplete information?"
- "Tell me about a time you influenced the organization"

### Follow-Up Prep
- **"What risks did you consider?"** → Performance overhead (shared vendor chunks mitigated it), version skew (contract testing)
- **"Why not single-spa?"** → Module Federation had better Webpack integration and build-time optimization
- **"How did you get team buy-in?"** → Working PoC spoke louder than slides — showed daily deploys in action
