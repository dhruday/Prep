# 392 – Story 3: Failure and Recovery — Bosch WebSocket Memory Leak

────────────────────────────────────────────────────────────

## STAR Story

**SITUATION:** At Bosch, I was building a real-time IoT monitoring dashboard that connected to 50+ industrial sensors via WebSocket. The dashboard was critical for factory floor operations.

**TASK:** I owned the frontend architecture and data handling layer. I chose to handle WebSocket subscriptions directly in individual Angular components.

**ACTION:**
1. **The failure:** After 2 weeks of development, QA reported the app crashed after ~30 minutes of use. Chrome DevTools revealed memory climbing from 50MB to 500MB+ — classic memory leak
2. **Root cause analysis:** Subscriptions weren't being cleaned up on component destroy. Multiple components subscribed to the same WebSocket data redundantly. No centralized connection management
3. **Owned the mistake** — in the team retrospective, I transparently explained the architectural flaw and my plan to fix it
4. **Immediate fix:** Implemented the `takeUntil(destroy$)` pattern across all components, created a centralized WebSocketService with `shareReplay` for data multicasting
5. **Long-term fix:** Added Chrome DevTools Performance Monitor checks to our QA process, created a team wiki on RxJS subscription management best practices
6. **Prevention:** Added ESLint rules to flag `.subscribe()` without `takeUntil` or `async pipe`

**RESULT:**
- Memory usage: 500MB+ → stable at 60MB (88% reduction)
- Zero crashes reported post-fix
- Team wiki used by 15+ developers across Bosch frontend teams
- Personal lesson: always prototype data flow architecture before building features
- Applied this learning directly to SAP's dashboard design (started with centralized state from day 1)

---

### Maps To Questions
- "Tell me about a time you failed"
- "Describe a mistake and what you learned"
- "How do you handle pressure when things go wrong?"
- "Tell me about a time you improved a process"

### Follow-Up Prep
- **"Why didn't you catch it earlier?"** → No memory profiling in the dev workflow — I added it
- **"How did the team react?"** → Appreciated the transparency and the wiki — turned failure into team learning
