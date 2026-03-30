# 278 – Influencing Without Authority

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Influencing without authority means driving technical decisions and organizational change **without being anyone's manager**. Staff ICs do this daily: proposing architectural standards, getting buy-in from skeptical teams, and driving adoption of best practices. The key techniques: **(1) Data-driven proposals** (show metrics, not opinions), **(2) Pilot programs** (prove it works small before scaling), **(3) Written artifacts** (RFCs/ADRs that others can async review), and **(4) Building coalitions** (align key stakeholders before the big meeting).

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The Influence Playbook

```
STEP 1: BUILD THE CASE (data, not opinions)
├── Measure current pain: "Builds take 18 min, 15 merge conflicts/week"
├── Prototype the solution: "In a 2-day spike, I reduced build to 3 min"
└── Calculate ROI: "6 engineers × 15 min saved × 220 days = 330 hours/year"

STEP 2: WRITE IT DOWN (RFC/ADR)
├── Problem statement with data
├── Options evaluated (at least 3)
├── Recommended solution with rationale
└── Migration plan with timeline

STEP 3: BUILD COALITION (before the meeting)
├── Share draft RFC with 2-3 key stakeholders
├── Incorporate their feedback
├── Get informal "I support this" before formal review
└── Address objections 1-on-1 before group discussion

STEP 4: PILOT (prove small, then scale)
├── Run pilot with 1-2 willing teams
├── Collect metrics: before vs after
├── Document lessons learned
└── Adjust approach based on pilot feedback

STEP 5: SCALE (with proof)
├── Present pilot results to broader org
├── Provide migration guide + tooling
├── Offer office hours / pairing for adoption
└── Track adoption metrics
```

### Phrases That Influence

```
✅ "I ran a spike and found that X reduces Y by 40%"
✅ "I've talked with Teams A and B — they're interested in piloting"
✅ "Here's the data from our 4-week pilot..."
✅ "What concerns do you have? I'd like to address them"

❌ "I think we should use X because it's better"
❌ "Everyone should switch to X"
❌ "If you don't adopt X, your code will be slow"
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I influenced TypeScript strict mode adoption across 6 teams without being anyone's manager: (1) measured — strict mode caught 23 bugs in our team's pilot month, (2) wrote an RFC with data and migration guide, (3) got buy-in from 2 tech leads, (4) presented pilot results at the frontend guild, (5) 6 teams adopted within a quarter.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I influence through data and proof, not authority. At SAP, I drove TypeScript strict mode adoption across 6 teams: measured (23 bugs caught in pilot month), wrote an RFC with migration guide, got informal buy-in from 2 tech leads, presented pilot results at the frontend guild. Six teams adopted within a quarter. The key: data-driven proposals, pilot first, build coalition before the meeting."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// The RFC as influence tool
/*
# RFC-017: Adopt TypeScript Strict Mode Org-Wide

## Problem
- 12 production bugs in Q3 would have been caught by strict null checks
- 3 runtime crashes from unsafe `any` usage
- No type safety on API response types

## Data from Pilot (Team Hruday, 4 weeks)
- 23 potential bugs caught by strict mode
- 15% reduction in code review comments about null handling
- Build time unchanged (0% impact)
- Developer satisfaction: 8/10 (survey)

## Recommendation
Enable strict mode in tsconfig for all repositories.

## Migration Guide
1. Enable `strictNullChecks` first (highest value, easiest)
2. Fix errors incrementally (allow `// @ts-expect-error` temporarily)
3. Enable `noImplicitAny` second
4. Enable full `strict` mode after cleanup

## Effort Estimate
- Small repos (< 50 files): 1-2 days
- Medium repos (50-200 files): 1 week
- Large repos (200+ files): 2-3 weeks (incremental)

## Support Offered
- I'll pair with each team for their first day of migration
- Office hours: Thursdays 2-3pm for strict mode questions
*/
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Influence = Data + RFC + Coalition + Pilot + Scale."** Never use authority or opinions. Prove with metrics, write it down (RFC), get buy-in 1-on-1 before the meeting, pilot small, then scale with proof. Your SAP story: 23 bugs caught → 6 teams adopted → no authority needed.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Staff ICs don't manage people — they influence without authority. This is the defining staff-level skill.
**How:** 5-step playbook: Data → RFC → Coalition → Pilot → Scale. Always lead with metrics, never opinions.
**Companies:** **Microsoft** (Clarity + Energy), **Adobe** (Innovation), **Salesforce** (Trust), **Cisco** (Collaboration) — all value influence at senior IC levels.
