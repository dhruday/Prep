# 394 – Story 5: Tight Deadline — Delivering Under Pressure

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At Oracle, our Angular-based enterprise platform had a critical client demo scheduled in 2 weeks. The requirement: integrate a new real-time reporting module with Spring Boot backend APIs that hadn't been built yet.

**TASK:** I was responsible for the complete frontend implementation — UI, API integration, error handling — coordinating with the backend team who was still 1 week away from API readiness.

**ACTION:**
1. **Didn't wait** — worked with the backend lead to agree on API contracts (OpenAPI spec) on day 1, so I could build against mock data immediately
2. **Parallel workstreams** — built the UI and service layer with mock interceptors while backend built real APIs. Used Angular's HttpInterceptor to swap mock/real responses via environment flag
3. **Prioritized ruthlessly** — identified 5 critical features for the demo vs. 8 nice-to-haves. Got PM alignment to defer non-critical features
4. **Daily syncs** — 15-minute daily check-in with backend developer to catch contract mismatches early (caught 2 breaking changes on day 4)
5. **Integration buffer** — reserved final 3 days exclusively for integration, bug fixes, and demo rehearsal
6. **Contingency plan** — prepared a fallback with mock data in case backend APIs weren't stable

**RESULT:**
- Demo delivered on time, zero issues during client presentation
- Client signed a 2-year contract renewal worth ₹2Cr+
- Mock interceptor pattern became the team standard for decoupled frontend/backend development
- API-first approach adopted as team practice going forward

---

### Maps To Questions
- "Tell me about working under a tight deadline"
- "How do you handle pressure?"
- "Describe a time you delivered results with incomplete information"
- "How do you prioritize when everything is urgent?"

### Follow-Up Prep
- **"What if backend was delayed further?"** → Mock data demo was my contingency, already prepared
- **"How did you decide what to cut?"** → Mapped features to demo talking points with PM — if it wasn't in the demo script, it was deferred
