# 261 – How to Start a System Design Interview

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

The first 3-5 minutes of a system design interview set the tone for the entire round. Top candidates follow a structured opening: **(1) Restate the problem** to show understanding, **(2) Ask 3-5 clarifying questions** to scope requirements, **(3) Identify functional vs non-functional requirements**, **(4) State explicit assumptions**, and **(5) Propose a high-level approach** before diving in. This structured start signals confidence, experience, and the ability to lead technical discussions — exactly what interviewers evaluate for senior roles.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The 5-Step Opening (3-5 minutes)

**Step 1: Restate (30 sec)**
*"So we're designing a real-time collaborative document editor, similar to Google Docs. Let me make sure I understand the scope."*

**Step 2: Clarify (2 min) — Ask in Categories**
```
USERS:     "How many concurrent users per document? Thousands or tens?"
FEATURES:  "Should I focus on rich text, or also support images/tables?"
SCOPE:     "Frontend-only, or full-stack including sync backend?"
PLATFORM:  "Web + mobile, or web-only?"
SCALE:     "What's the expected latency requirement for collaboration?"
```

**Step 3: Requirements (1 min)**
```
FUNCTIONAL:
- Real-time text editing with character-level sync
- Cursor presence (see who's editing where)
- Version history with undo/redo
- Rich text formatting (bold, italic, headings)

NON-FUNCTIONAL:
- Latency < 100ms for local edits
- Conflict resolution for simultaneous edits
- Offline support with reconciliation
- Accessible (WCAG AA)
```

**Step 4: Assumptions (30 sec)**
*"I'll assume: modern browsers only, WebSocket support available, no IE11, maximum 50 concurrent editors per document, and a backend real-time service is available."*

**Step 5: Approach (30 sec)**
*"I'll start with the component architecture, then data model, then state management, then the real-time sync strategy. Let me draw the high-level diagram."*

### What Interviewers Evaluate in the Opening

| Signal | What It Shows |
|--------|--------------|
| Restating the problem | **Listening skills**, avoids solving the wrong problem |
| Asking good questions | **Requirements analysis**, business understanding |
| FR vs NFR separation | **Structured thinking**, production awareness |
| Explicit assumptions | **Risk awareness**, clear communication |
| Proposing approach | **Leadership**, ability to lead technical discussions |

### Common Mistakes

- ❌ Jumping straight to coding without clarifying
- ❌ Asking too many questions (10+) — wastes time
- ❌ Not stating assumptions — leaves ambiguity
- ❌ Trying to solve everything — not scoping

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, every new feature discussion started with a requirements review. I always asked about data volume, user roles, offline support, and accessibility before architecture. This structured approach directly maps to the interview opening.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I start every system design interview with a structured opening: I restate the problem to confirm understanding, ask 3-5 clarifying questions (users, scale, scope, platform), separate functional from non-functional requirements, state my assumptions explicitly, and propose my approach before diving in. This takes 3-5 minutes and ensures I'm solving the right problem. At SAP, this was our standard for every architecture discussion."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Framework for interview opening (mental model, not code)
interface SystemDesignOpening {
  restate: string;      // "We're designing X, similar to Y"
  clarify: Question[];  // 3-5 targeted questions
  requirements: {
    functional: string[];    // Core features
    nonFunctional: string[]; // Performance, accessibility, scale
  };
  assumptions: string[];     // Explicit assumptions
  approach: string;          // "I'll start with X, then Y, then Z"
}

// Example for "Design a Notification System"
const opening: SystemDesignOpening = {
  restate: "Design an in-app notification system like Slack/LinkedIn notifications",
  clarify: [
    "Real-time push or periodic polling?",
    "What notification types — text, actions, grouped?",
    "What's the expected volume — 10 or 10,000 per user per day?",
    "Is read/unread tracking required?",
  ],
  requirements: {
    functional: ["Display notifications", "Mark read/unread", "Group by type", "Action buttons"],
    nonFunctional: ["< 200ms render", "Accessible — screen reader live region", "< 50KB bundle"],
  },
  assumptions: ["WebSocket available", "< 1000 unread per user", "Modern browsers only"],
  approach: "Component tree → Data model → State management → Real-time updates → Edge cases",
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"R-C-R-A-A = Restate, Clarify, Requirements (FR+NFR), Assumptions, Approach."** 3-5 minutes total. 3-5 questions max. Always separate functional from non-functional. State assumptions explicitly. End with your approach roadmap. This opening is the same for every system design interview.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** The opening determines interview trajectory. A structured start signals senior-level thinking.
**How:** R-C-R-A-A framework: Restate → Clarify (3-5 Qs) → Requirements (FR+NFR) → Assumptions → Approach.
**Companies:** All four companies evaluate structured communication. Microsoft's Design round especially rewards this.
