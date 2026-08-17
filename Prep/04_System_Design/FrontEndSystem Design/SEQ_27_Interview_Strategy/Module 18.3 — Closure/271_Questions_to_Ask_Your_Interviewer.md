# 271 – Questions to Ask Your Interviewer

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

"Do you have any questions for me?" is not a throwaway — it's your chance to demonstrate genuine interest, research, and thoughtful curiosity. The best questions are **specific** (not generic), **show you've researched the team**, and **reveal what you care about as an engineer**. Avoid: "What's a typical day like?" (generic) or "When will I hear back?" (transactional). Ask about: **architecture decisions**, **team culture**, **engineering challenges**, and **growth opportunities**.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Question Categories (ACED)

**A — Architecture & Technology**
```
"What's your frontend rendering strategy — CSR, SSR, or hybrid?"
"How does your team handle design system governance across products?"
"What's your approach to state management at scale?"
"Are you using micro-frontends, and what challenges has that created?"
"What's a technical decision your team made recently that was controversial?"
```

**C — Culture & Process**
```
"How are frontend architecture decisions made? ADRs? Team discussions?"
"What does code review look like on your team?"
"How do you balance feature delivery with technical debt reduction?"
"What's the on-call rotation like for frontend engineers?"
```

**E — Engineering Challenges**
```
"What's the biggest frontend performance challenge you're facing?"
"What's the most interesting technical problem the team solved recently?"
"How do you approach accessibility compliance at scale?"
"What are the biggest pain points in your CI/CD pipeline?"
```

**D — Development & Growth**
```
"What does career growth look like for frontend engineers here?"
"How do senior engineers influence technical direction?"
"Are there opportunities to work on open-source projects?"
"What learning resources or conference budgets are available?"
```

### Company-Specific Questions

**Microsoft:**
```
"How does the growth mindset culture manifest in engineering practices?"
"How do you balance shipping features with the 'customer obsession' principle?"
```

**Adobe:**
```
"How does your team contribute to or consume from the Adobe Design System?"
"What role does performance play in the creative tools experience?"
```

**Salesforce:**
```
"How are Lightning Web Components evolving with the broader web platform?"
"What's the relationship between the LWC team and the broader web standards community?"
```

**Cisco:**
```
"How does the frontend team handle the complexity of network monitoring dashboards?"
"What's your approach to real-time data visualization at scale?"
```

### Anti-Patterns

- ❌ "What's a typical day like?" — too generic, shows no research
- ❌ "When will I hear back?" — save for recruiter
- ❌ "What technology do you use?" — you should know this from research
- ❌ Asking zero questions — signals disinterest
- ❌ Asking about salary/benefits in technical rounds

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday's Practice
In my interviews, I always ask about architecture decisions and engineering challenges — these questions have led to my best interview conversations and showed interviewers I think about the same problems they do.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I prepare 2-3 questions per interview using the ACED framework: Architecture (rendering strategy, design system governance), Culture (code review process, tech debt management), Engineering challenges (biggest performance problem), and Development (career growth paths). I customize questions per company — asking Microsoft about growth mindset culture, or Salesforce about LWC evolution."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// My prepared question bank (organized by company)

const questionBank = {
  microsoft: [
    "How does the growth mindset culture influence engineering practices?",
    "What's your team's approach to frontend architecture for enterprise-scale apps?",
    "How do you balance accessibility compliance with shipping velocity?",
  ],
  adobe: [
    "How does your team contribute to the Adobe Design System (Spectrum)?",
    "What's the most interesting performance challenge in your creative tools?",
    "How do you handle cross-browser rendering consistency for design tools?",
  ],
  salesforce: [
    "How are LWC patterns evolving with web standards like decorators and signals?",
    "What's the relationship between platform components and custom LWC development?",
    "How does the team handle design system governance across 100+ products?",
  ],
  cisco: [
    "How does the frontend handle real-time network telemetry data at scale?",
    "What's your approach to dashboard performance with thousands of data points?",
    "How do you balance feature richness with accessibility in complex UIs?",
  ],
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"ACED = Architecture, Culture, Engineering challenges, Development."** 2-3 questions per interview. Customize per company. Never ask generic questions ("typical day?"). Best questions are about their architecture decisions and engineering challenges — they show you think like them.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Questions reveal genuine interest and research depth. "No questions" = disinterest.
**How:** ACED framework with company-specific customization. Prepare 2-3 questions. Focus on architecture and challenges.
**Companies:** All four leave time for candidate questions. Well-researched questions are noted positively in feedback.
