# 269 – Common Mistakes Senior Engineers Make

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Even experienced engineers make predictable mistakes in system design interviews. The top 5 are: **(1) Over-engineering** — designing for Google-scale when the problem is small, **(2) Monologuing** — talking for 10 minutes without checking in, **(3) Not scoping** — trying to cover everything, **(4) Technology-first thinking** — choosing tools before understanding requirements, **(5) Ignoring NFRs** — no mention of accessibility, performance, or error handling. Knowing these mistakes lets you actively avoid them.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The 10 Most Common Mistakes

**1. Over-Engineering**
```
❌ "I'll use micro-frontends with Module Federation, event-driven 
    architecture, and a distributed cache"
    ...for a simple todo app

✅ "For this scope, a single-page React app with local state is 
    sufficient. If we needed to scale to multiple teams, then 
    micro-frontends would make sense."
```

**2. No Requirement Clarification**
```
❌ Immediately starts drawing architecture
✅ "Before I design, let me ask about scale, core features, and constraints"
```

**3. Technology-First (vs Problem-First)**
```
❌ "I'll use Redux, React Query, and GraphQL"
✅ "The state is simple and local, so useState is enough. If shared 
    state grows, I'd consider Zustand. For data fetching, REST with 
    SWR keeps it simple."
```

**4. Monologuing (not interactive)**
```
❌ Talks for 15 minutes without pause
✅ "I've covered the component architecture. Shall I deep-dive into 
    state management, or would you like me to cover the data model?"
```

**5. Ignoring Non-Functional Requirements**
```
❌ Only covers features, never mentions performance, accessibility, security
✅ "For NFRs: WCAG AA accessibility, < 2s LCP, error boundaries for 
    graceful failure, and input sanitization for XSS prevention"
```

**6. Not Drawing Diagrams**
```
❌ Explains everything verbally
✅ Draws component tree, data flow, state ownership visually
```

**7. Perfect Code Instead of Architecture**
```
❌ Writes production-quality code for 30 minutes, covers 1 component
✅ Sketches architecture for all components, writes pseudocode for key parts
```

**8. Not Discussing Trade-offs**
```
❌ "I'll use SSR" (no justification)
✅ "I chose SSR over CSR because SEO is critical. Trade-off: server cost."
```

**9. Panic Under Follow-ups**
```
❌ "I don't know" → freezes
✅ ABR technique → acknowledge, bridge, reason from first principles
```

**10. No Time Management**
```
❌ Spends 20 min on requirements, 0 min on deep dive
✅ Proposes: "5 min requirements, 12 min HLD, 18 min deep dive, 10 min edge cases"
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday's Self-Awareness
Having done multiple rounds of interview prep, I've caught myself over-engineering (proposing micro-frontends for simple apps) and under-discussing trade-offs. Recognizing these patterns lets me course-correct in real time.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"The top mistakes I actively guard against: over-engineering (match complexity to scope), monologuing (checkpoint every 5 minutes), skipping requirements (SCOPE framework first), technology-first thinking (problem-first, then tool selection), and ignoring NFRs (always mention accessibility, performance, error handling). Being aware of these pitfalls is as important as technical knowledge."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// MISTAKE: Over-engineering a simple feature
// ❌ Global state store for a toggle that's used in one component
const store = configureStore({
  reducer: { toggle: toggleReducer }, // overkill for local UI state
});

// ✅ Right-sized solution
function SettingsPanel() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  return <Toggle checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />;
}

// MISTAKE: Technology-first
// ❌ "I'll use GraphQL" → but there's only 2 simple REST endpoints
// ✅ "REST is sufficient here. GraphQL adds value when we have 
//     complex nested queries or need to avoid over-fetching."

// MISTAKE: Not handling edge cases
// ❌ Only handles success state
// ✅ Handles all states
function DataView() {
  const { data, error, isLoading } = useQuery('items', fetchItems);
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorBanner message={error.message} onRetry={refetch} />;
  if (!data?.length) return <EmptyState />;
  return <ItemList items={data} />;
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Top 5: Over-engineer, Monologue, No scope, Tech-first, Skip NFRs."** Guard against: over-engineering (match complexity to problem), monologuing (checkpoint every 5 min), skipping requirements, choosing tools before understanding the problem, and forgetting accessibility/performance/error handling.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Knowing common mistakes is meta-awareness that prevents interview failure patterns.
**How:** Active checklist — right-size complexity, checkpoint with interviewer, scope first, problem before tools, always mention NFRs.
**Companies:** These mistakes cause rejections at all four. Microsoft's bar raiser specifically watches for these patterns.
