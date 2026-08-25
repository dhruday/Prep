# 282 – Incident Postmortems — How to Write & Present

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A postmortem is a **blameless analysis** of a production incident that answers: What happened? Why? How do we prevent it? The format: **(1) Summary** (1 paragraph), **(2) Timeline** (detect → mitigate → resolve), **(3) Root Cause** (5 Whys analysis), **(4) Impact** (users affected, duration), **(5) Action Items** (preventive measures with owners and deadlines). Writing and presenting postmortems is a senior/staff responsibility that demonstrates ownership and learning culture.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Postmortem Template

```markdown
# Postmortem: Dashboard Blank Screen Incident
## Date: 2024-11-15  |  Severity: P1  |  Duration: 47 min

## Summary
A deployment at 14:30 UTC introduced a JavaScript error in the 
dashboard component that caused a blank screen for all users. 
The error boundary was not configured for this route. The issue 
was detected via Sentry alert at 14:35 and mitigated by rollback 
at 15:17.

## Timeline
14:30 — Deployment to production (PR #2847)
14:35 — Sentry alert: JS error spike (500% increase)
14:38 — On-call engineer begins investigation
14:45 — Root cause identified: undefined property access on new API response shape
14:50 — Rollback initiated
15:17 — Rollback verified, error rate back to baseline

## Root Cause (5 Whys)
1. Why blank screen? → Unhandled JS error crashed the React tree
2. Why unhandled? → Error boundary missing on dashboard route
3. Why undefined? → API changed response shape without frontend update
4. Why no frontend update? → API contract change not communicated
5. Why not communicated? → No contract-first process between teams

## Impact
- 1,200 users affected (all dashboard users during the 47-min window)
- 0 data loss
- Customer support received 15 tickets

## What Went Well
- Sentry alert detected within 5 minutes
- On-call responded within 3 minutes
- Rollback procedure worked smoothly

## What Didn't Go Well
- No error boundary on this route
- API contract change not communicated
- Rollback took 27 minutes (should be <10 min)

## Action Items
1. [ ] Add error boundaries to all routes — Owner: Hruday — Due: Nov 22
2. [ ] Establish API contract-first process — Owner: Tech Lead — Due: Dec 1
3. [ ] Automate rollback to <5 min — Owner: DevOps — Due: Dec 15
4. [ ] Add integration test for API response shape — Owner: QA — Due: Nov 25
```

### Blameless Culture

- Focus on **systems and processes**, not individuals
- "The deploy process allowed untested API changes" NOT "Engineer X broke production"
- Every incident is a learning opportunity for the entire org

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I wrote and presented postmortems for production incidents in our Fiori applications. A notable example: an OData service change caused a cascade failure in our master-detail view. My postmortem identified the missing API contract process and led to implementing schema validation in our CI pipeline.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I write blameless postmortems with five sections: Summary, Timeline, Root Cause (using 5 Whys), Impact, and Action Items with owners and deadlines. The key is blameless analysis — focus on systems, not individuals. At SAP, my postmortem after an OData schema change incident led to implementing API schema validation in CI, which prevented similar issues across all teams."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Action items from postmortems → code changes

// ACTION ITEM 1: Error boundaries on every route
const routes = [
  { path: '/dashboard', element: <ErrorBoundary fallback={<DashboardFallback />}><Dashboard /></ErrorBoundary> },
  { path: '/settings', element: <ErrorBoundary fallback={<SettingsFallback />}><Settings /></ErrorBoundary> },
];

// ACTION ITEM 2: API response validation
import { z } from 'zod';
const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string().email() });
type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(id)}`);
  const data = await response.json();
  return UserSchema.parse(data); // throws if API response doesn't match expected shape
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Postmortem = Summary + Timeline + Root Cause (5 Whys) + Impact + Action Items."** Always blameless — systems, not people. Every action item has an owner and deadline. The best postmortems lead to preventive tooling (CI checks, validation, monitoring).

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Postmortems demonstrate ownership, learning culture, and production maturity — all senior signals.
**How:** 5-section template, blameless analysis, 5 Whys for root cause, action items with owners and deadlines.
**Companies:** All four practice postmortems. Google's SRE culture (adopted by all) makes this essential.
