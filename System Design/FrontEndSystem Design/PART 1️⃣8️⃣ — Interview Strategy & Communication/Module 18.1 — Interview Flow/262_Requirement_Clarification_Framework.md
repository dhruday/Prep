# 262 – Requirement Clarification Framework

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A requirement clarification framework is a structured approach to scoping the problem correctly in the first 2-3 minutes. Instead of asking random questions, use the **SCOPE** framework: **S**cale (how many users/data), **C**ore Features (what must work), **O**mit (what's out of scope), **P**latform (web/mobile/desktop), **E**xpectations (performance, accessibility). This prevents you from solving the wrong problem and shows the interviewer you think before building — a key senior engineer trait.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The SCOPE Framework

```
S — Scale
  "How many concurrent users? Thousands or millions?"
  "What's the data volume — 100 items or 100,000?"
  This determines: virtualization, pagination, caching strategy

C — Core Features
  "If I could only build 3 things, what are the must-haves?"
  "Should I focus on creation, consumption, or both?"
  This determines: priority, time allocation, MVP scope

O — Omit (Out of scope)
  "Should I handle authentication/authorization, or assume it's done?"
  "Is offline support needed, or online-only?"
  This determines: what NOT to design (saves time)

P — Platform
  "Web-only, or also mobile/desktop?"
  "Modern browsers only, or legacy support?"
  This determines: rendering strategy, API choices

E — Expectations (NFRs)
  "What's the acceptable latency for the main interaction?"
  "Is accessibility (WCAG) a requirement?"
  "Is SEO important?"
  This determines: SSR vs CSR, ARIA implementation, caching
```

### Question Quality Hierarchy

Great questions reveal constraints that change the architecture:

```
Level 1 (Basic):     "What features do you want?"
Level 2 (Good):      "Should search be client-side or server-side?"
Level 3 (Senior):    "Given 100K items, should I optimize for first-load 
                      speed (SSR) or interaction speed (CSR with virtualization)?"
Level 4 (Staff):     "What's the read/write ratio? That determines whether 
                      I optimize the data model for writes (normalized) 
                      or reads (denormalized)."
```

### Anti-Patterns

- ❌ Asking 10+ questions — analysis paralysis
- ❌ Asking yes/no questions that don't reveal architecture impact
- ❌ Not listening to the answer — asking follow-ups on things already clarified
- ❌ Asking implementation questions ("Should I use Redux?") — that's your decision

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, before every new Fiori app, I'd run through: user count, OData entity volume, offline requirement, device targets, and accessibility level (AA vs AAA). This is exactly the SCOPE framework applied to real product development.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use the SCOPE framework: Scale (users, data volume), Core features (top 3 must-haves), Omit (what's out of scope — auth, offline?), Platform (web/mobile/legacy), Expectations (latency, accessibility, SEO). I ask 3-5 targeted questions that reveal architecture-impacting constraints. For example, asking about data volume determines whether I use client-side filtering or server-side search with pagination."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// SCOPE applied to "Design a File Upload System"
const requirements = {
  scale: {
    maxFileSize: '5GB',          // Changes: chunked upload needed
    concurrentUploads: 5,         // Changes: queue management needed
    totalUsers: '10,000/day',     // Changes: CDN, not direct server
  },
  coreFeatures: [
    'Drag & drop upload',
    'Progress indicator',
    'Pause/resume capability',
  ],
  omitted: [
    'File preview/editing',       // Out of scope
    'User authentication',        // Assume handled
    'Backend storage design',     // Frontend focus
  ],
  platform: {
    target: 'Modern web browsers',
    legacy: false,                // No IE11 → can use File API, streams
  },
  expectations: {
    uploadLatency: '< 500ms to start',
    resumability: 'Required — large files may take minutes',
    accessibility: 'WCAG AA — keyboard, screen reader',
    errorRecovery: 'Retry on network failure',
  },
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"SCOPE = Scale, Core, Omit, Platform, Expectations."** 3-5 questions, 2-3 minutes max. Every question should reveal an architecture-impacting constraint. Don't ask "Should I use Redux?" — ask "What's the data volume?" because that determines whether you need Redux at all.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Solving the right problem is more important than solving a problem right. Requirement clarification prevents wasted time.
**How:** SCOPE framework applied in 2-3 minutes with 3-5 targeted questions.
**Companies:** All four test requirement gathering. Adobe and Microsoft especially value structured clarification.
