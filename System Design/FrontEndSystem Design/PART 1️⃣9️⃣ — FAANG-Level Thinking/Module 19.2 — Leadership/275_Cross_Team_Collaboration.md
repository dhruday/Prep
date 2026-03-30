# 275 – Cross-Team Collaboration

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Cross-team collaboration means working effectively with teams outside your immediate scope — backend, platform, design, QA, and other frontend teams. For senior/staff engineers, this involves: **(1) Aligning on API contracts** before implementation, **(2) Shared tooling** (design systems, CI pipelines), **(3) RFC/ADR processes** for decisions that affect multiple teams, and **(4) Regular sync mechanisms** (architecture guilds, tech talks). The skill being tested: can you drive technical outcomes that require coordination across organizational boundaries?

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Collaboration Patterns

**1. API Contract First:** Define frontend-backend contract before either team starts coding.
**2. Design System Governance:** Shared component library with contribution guidelines.
**3. RFC Process:** Written proposals reviewed by all affected teams before adoption.
**4. Architecture Guild:** Monthly cross-team forum for decisions that affect the platform.
**5. Shared CI/CD:** Common pipeline templates and quality gates.

### Hruday's Cross-Team Collaboration Framework

```
BEFORE (alignment):
├── RFC with stakeholder sign-off
├── API contract review (OpenAPI spec)
└── Design system review with UX team

DURING (execution):
├── Weekly sync with backend on API changes
├── Shared Slack channel for cross-team decisions
└── PR reviews across team boundaries for shared code

AFTER (follow-up):
├── Retro on cross-team process
├── Update shared documentation
└── Share learnings in architecture guild
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I coordinated across frontend, backend (Java/Spring Boot), and UX teams for the BI Launchpad redesign. I defined the OData API contract, aligned component architecture with the design system team, and established a weekly cross-team sync. The result: zero missed API mismatches at integration time.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Cross-team collaboration starts with alignment: API contracts before coding, RFCs for architectural decisions, and design system reviews with UX. At SAP, I coordinated across frontend, Java backend, and UX teams — defining OData contracts upfront eliminated integration mismatches. I established architecture guilds for cross-team decisions and used shared Slack channels for real-time coordination."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// API contract-first collaboration
// shared/api-contracts/user-api.ts — shared between frontend & backend teams

interface UserEndpoints {
  'GET /api/users': { query: { page: number; limit: number; search?: string }; response: PaginatedResponse<User> };
  'GET /api/users/:id': { params: { id: string }; response: User };
  'PATCH /api/users/:id': { params: { id: string }; body: Partial<User>; response: User };
}

interface User { id: string; name: string; email: string; role: 'admin' | 'user'; }
interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; }
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Cross-team = Contract first + RFC process + Architecture guild + Shared tooling."** Align before building (API contracts, RFCs). Sync during execution (weekly cross-team meetings). Follow up with retros and documentation. Your SAP story: coordinated frontend/backend/UX for BI Launchpad.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Staff-level impact requires cross-team coordination. Individual team execution isn't enough.
**How:** Contract-first API design, RFC process, architecture guilds, shared tooling and design systems.
**Companies:** All four evaluate collaboration. Microsoft (Success of Others), Salesforce (Trust, Customer Success).
