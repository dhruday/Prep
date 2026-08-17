# Algo + Frontend Interview Exercises

**Target: Senior Frontend Engineer**  
**Companies: Google · Microsoft · Meta · Amazon · Salesforce · Uber · Adobe · Stripe**

This folder follows the repository convention:

```
12.Algo_Frontend/
├── 01.Algorithms/
│   ├── 01.Easy/
│   ├── 02.Medium/
│   └── 03.Hard/
├── 02.JavaScript/
├── 03.Browser_React/
├── 04.Frontend_System_Design/
└── 05.Performance_Security_Accessibility/
```

Every JavaScript exercise contains:

1. A short problem statement and constraints.
2. A complete, interview-ready solution.
3. Time and space complexity.
4. Runnable test cases. Run an individual file with `node <path-to-file>`.

The Markdown design exercises use the same short-prompt format, followed by a complete senior-level solution outline, trade-offs, and validation checklist.

## Study Order

1. **Algorithms:** solve the core patterns in JavaScript without helpers that hide the data structure.
2. **JavaScript:** implement browser-independent utilities and explain event-loop behavior.
3. **Browser + React:** build UI state and interaction primitives with accessibility and cancellation in mind.
4. **Frontend System Design:** explain requirements, contracts, state, caching, reliability, performance, and rollout.
5. **Performance + Security + Accessibility:** treat these as first-class product constraints, not final polish.

## Completion Rule

Mark a problem complete only after you can explain the approach, complexity, edge cases, and relevant user-experience trade-offs before reading the solution.

## Complete Exercise Index

### 01. Algorithms

- [Two Sum](01.Algorithms/01.Easy/01.TwoSum/TwoSum.js) — hash map.
- [Longest Substring Without Repeats](01.Algorithms/02.Medium/01.LongestSubstringWithoutRepeats/LongestSubstringWithoutRepeats.js) — sliding window.
- [Merge Intervals](01.Algorithms/02.Medium/02.MergeIntervals/MergeIntervals.js) — sorting and interval scan.
- [Min Stack](01.Algorithms/02.Medium/03.MinStack/MinStack.js) — augmented stack.
- [Course Schedule](01.Algorithms/02.Medium/04.CourseSchedule/CourseSchedule.js) — topological sort.
- [Number of Islands](01.Algorithms/02.Medium/05.NumberOfIslands/NumberOfIslands.js) — iterative graph traversal.
- [Coin Change](01.Algorithms/02.Medium/06.CoinChange/CoinChange.js) — dynamic programming.
- [LRU Cache](01.Algorithms/03.Hard/01.LRUCache/LRUCache.js) — hash map plus doubly linked list.

### 02. JavaScript

- [Debounce](02.JavaScript/02.Medium/01.Debounce/Debounce.js) and [Throttle](02.JavaScript/02.Medium/02.Throttle/Throttle.js) — event-rate control.
- [Event Emitter](02.JavaScript/02.Medium/03.EventEmitter/EventEmitter.js) — Pub/Sub and unsubscribe behavior.
- [Promise.all](02.JavaScript/02.Medium/04.PromiseAll/PromiseAll.js) — ordering and fail-fast promise coordination.
- [Retry With Backoff](02.JavaScript/02.Medium/05.RetryWithBackoff/RetryWithBackoff.js) — retry policy.
- [Concurrency-Limited Task Pool](02.JavaScript/03.Hard/01.ConcurrencyLimitedTaskPool/ConcurrencyLimitedTaskPool.js) — async concurrency.
- [Deep Clone With Circular References](02.JavaScript/03.Hard/02.DeepCloneCircular/DeepCloneCircular.js) — object graph cloning.

### 03. Browser + React Logic

- [Latest Request Wins](03.Browser_React/02.Medium/01.LatestRequestWins/LatestRequestWins.js) — stale response protection.
- [Autocomplete Model](03.Browser_React/02.Medium/02.AutocompleteModel/AutocompleteModel.js) — keyboard-ready suggestion state.
- [Virtual List Range](03.Browser_React/02.Medium/03.VirtualListRange/VirtualListRange.js) — fixed-height virtualization math.
- [Client-Side Router](03.Browser_React/02.Medium/04.ClientSideRouter/ClientSideRouter.js) — URL path matching.
- [Form State Machine](03.Browser_React/02.Medium/05.FormStateMachine/FormStateMachine.js) — valid async form transitions.
- [Redux-Like Store](03.Browser_React/02.Medium/06.ReduxLikeStore/ReduxLikeStore.js) — predictable state updates.

### 04. Frontend System Design

- [Search Experience](04.Frontend_System_Design/02.Medium/01.SearchExperience/SearchExperience.md)
- [Analytics Dashboard](04.Frontend_System_Design/02.Medium/02.AnalyticsDashboard/AnalyticsDashboard.md)
- [E-Commerce Product Experience](04.Frontend_System_Design/02.Medium/03.EcommerceExperience/EcommerceExperience.md)
- [Messaging and Notifications](04.Frontend_System_Design/02.Medium/04.MessagingNotifications/MessagingNotifications.md)
- [Shared Component Library](04.Frontend_System_Design/03.Hard/01.ComponentLibrary/ComponentLibrary.md)
- [Collaborative Document Editor](04.Frontend_System_Design/03.Hard/02.CollaborativeEditor/CollaborativeEditor.md)

### 05. Performance, Security + Accessibility

- [Core Web Vitals Investigation](05.Performance_Security_Accessibility/01.Easy/01.CoreWebVitals/CoreWebVitals.md)
- [Performance Budget](05.Performance_Security_Accessibility/02.Medium/01.PerformanceBudget/PerformanceBudget.md)
- [XSS and Content Security Policy](05.Performance_Security_Accessibility/02.Medium/02.XssAndCsp/XssAndCsp.md)
- [Authentication and CSRF](05.Performance_Security_Accessibility/02.Medium/03.AuthAndCsrf/AuthAndCsrf.md)
- [Accessibility Regression Strategy](05.Performance_Security_Accessibility/02.Medium/04.AccessibilityRegression/AccessibilityRegression.md)
- [Frontend Incident Response](05.Performance_Security_Accessibility/03.Hard/01.FrontendIncidentResponse/FrontendIncidentResponse.md)
