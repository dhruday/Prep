# 264 – Time Boxing Each Section

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Time boxing means allocating fixed time to each phase of a system design interview and moving on even if you haven't covered everything. A 45-minute round typically splits into: **Clarify (3-5 min)**, **High-Level Design (10-12 min)**, **Deep Dive (15-18 min)**, **Edge Cases & NFRs (8-10 min)**, **Q&A (3-5 min)**. The biggest mistake is spending 20 minutes on requirements and running out of time for the actual design. Propose your time allocation upfront — it shows leadership and interview experience.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Standard 45-Minute Breakdown

```
┌────────┬──────────────────────────────────────────────┐
│ Phase  │ Time     │ Activity                          │
├────────┼──────────┼───────────────────────────────────┤
│   1    │  0-5 min │ Clarify requirements, assumptions │
│   2    │ 5-17 min │ High-Level Design (diagram)       │
│   3    │ 17-35min │ Deep Dive (1-2 areas)             │
│   4    │ 35-42min │ Edge cases, NFRs, trade-offs      │
│   5    │ 42-45min │ Summary, questions                │
└────────┴──────────┴───────────────────────────────────┘
```

### How to Verbalize It

At the start: *"I'll spend about 5 minutes on requirements, 10-12 on the high-level architecture, then deep-dive into 1-2 critical areas, and save the last 10 minutes for edge cases, trade-offs, and questions. Does that sound good?"*

This does three things:
1. **Shows leadership** — you're driving the discussion
2. **Creates checkpoints** — interviewer can redirect early
3. **Ensures coverage** — you won't miss any phase

### Adjustment Strategies

| Situation | Adjustment |
|-----------|------------|
| Interviewer asks many follow-ups in Phase 1 | Compress Phase 2 to diagram-only, expand Phase 3 |
| Deep dive is going well | Let it run, compress Phase 4 to verbal trade-offs |
| You're stuck on one area | Say "Let me pause here and cover X, then come back" |
| Running ahead of time | Add more depth on trade-offs and alternatives |

### Anti-Patterns

- ❌ Spending 20+ minutes on clarification → no time for design
- ❌ Only doing high-level design → no depth signal
- ❌ Only doing deep dive → no breadth signal
- ❌ No time for trade-offs → missed opportunity to show seniority

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, sprint planning was time-boxed: 2 hours for a 2-week sprint. I applied the same discipline to architecture discussions — 5 min context, 15 min design, 10 min implementation details. Time boxing is a professional skill.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I propose my time allocation at the start: 5 min requirements, 12 min high-level design, 18 min deep dive into 1-2 critical areas, and 10 min for edge cases and trade-offs. I verbalize this to the interviewer so they can redirect if needed. If I'm going deep on one topic, I'll checkpoint: 'I want to make sure I also cover the data model — shall I continue here or move on?' This keeps the interview productive."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Mental time-tracking approach
const INTERVIEW_PHASES = {
  clarify:   { duration: 5,  start: 0,  must: ['requirements', 'assumptions'] },
  hld:       { duration: 12, start: 5,  must: ['diagram', 'component tree', 'data model'] },
  deepDive:  { duration: 18, start: 17, must: ['state management OR real-time sync'] },
  edgeCases: { duration: 8,  start: 35, must: ['error handling', 'accessibility', 'perf'] },
  closing:   { duration: 2,  start: 43, must: ['summary', 'questions'] },
};

// Checkpoint phrases to use during the interview:
const CHECKPOINTS = [
  "I've covered the high-level design. Let me deep-dive into [X]. Or would you prefer I go into [Y]?",
  "I want to make sure I cover edge cases. Let me wrap up the deep dive and move on.",
  "We have about 10 minutes left — let me cover trade-offs and error handling.",
  "Before I close, let me summarize the key decisions and their trade-offs.",
];
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"5-12-18-8-2 = Clarify, HLD, Deep Dive, Edge Cases, Close."** Propose your allocation upfront. Checkpoint with the interviewer: "Shall I continue here or move to X?" Never spend 20 min on requirements. Always leave time for trade-offs — that's where senior signals live.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Running out of time is the #1 system design interview failure mode. Time boxing prevents it.
**How:** 5-12-18-8-2 allocation. Verbalize upfront. Checkpoint with interviewer. Adjust based on follow-ups.
**Companies:** All companies value time management. Microsoft 45-min design rounds are especially tight.
