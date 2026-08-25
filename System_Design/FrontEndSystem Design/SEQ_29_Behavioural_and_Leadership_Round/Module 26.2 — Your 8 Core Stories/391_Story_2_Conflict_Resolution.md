# 391 – Story 2: Conflict Resolution — Disagreement on Architecture

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At SAP, our team was architecting a new micro-frontend system. A senior backend engineer strongly pushed for an iframe-based approach, while I advocated for Module Federation (Webpack 5). The disagreement stalled the project for a week.

**TASK:** As the frontend lead, I needed to resolve the architectural disagreement constructively and get the team aligned without damaging the working relationship.

**ACTION:**
1. **Listened first** — scheduled a 1:1 with the backend engineer to understand his concerns: security isolation, deployment independence, and iframe simplicity
2. **Acknowledged valid points** — iframe isolation IS simpler for security boundaries (his concern was legitimate)
3. **Proposed a proof-of-concept battle** — both approaches implemented for the same feature over 3 days, evaluated against agreed criteria: performance, DX, bundle size, shared state capability
4. **Presented data, not opinions** — the PoC showed Module Federation had 60% smaller overhead, seamless shared state, and better DX, while iframes had superior security isolation
5. **Found a compromise** — used Module Federation for internal micro-frontends with shared auth, kept iframe sandboxing only for third-party widget embedding
6. **Documented the decision** with an ADR (Architecture Decision Record) so future team members understood the "why"

**RESULT:**
- Architecture finalized in 3 days (vs. weeks of debate)
- Both engineers felt heard — relationship strengthened
- Hybrid approach became the SAP frontend architecture standard
- ADR practice adopted across the engineering org

---

### Maps To Questions
- "Tell me about a conflict with a colleague"
- "How do you handle disagreements about technical decisions?"
- "Describe a time you had to influence without authority"
- "Tell me about a compromise you made"

### Follow-Up Prep
- **"What if the PoC showed iframes were better?"** → I'd have adopted iframes — data > ego
- **"How did the engineer react?"** → Appreciated the PoC approach — fair and objective
