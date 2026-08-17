# 268 – Recovering When You Don't Know the Answer

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Every engineer encounters questions they can't fully answer in interviews. The difference between a hire and a no-hire is **how you recover**. Instead of freezing or bluffing, use the **ABR technique**: **(A) Acknowledge** honestly, **(B) Bridge** to what you do know, **(R) Reason** through it from first principles. This shows intellectual honesty, problem-solving ability, and the growth mindset that companies like Microsoft explicitly evaluate.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The ABR Technique

**A — Acknowledge (2 seconds)**
```
"I haven't worked directly with CRDTs, but let me reason 
 through it based on what I know about conflict resolution."
```

**B — Bridge (connect to what you know)**
```
"I've implemented optimistic concurrency control using ETags 
 at SAP, which solves a similar problem — ensuring consistency 
 when multiple users edit the same data."
```

**R — Reason (work through it logically)**
```
"So if CRDTs handle conflict-free merging, they probably work 
 by ensuring operations are commutative and idempotent — meaning 
 the order doesn't matter and duplicates are safe. That would 
 eliminate the need for a central coordination server..."
```

### What Each Response Signals

| Response | Interviewer's Conclusion |
|----------|-------------------------|
| Freezing / silence | Can't handle pressure, not curious |
| Bluffing with wrong info | Lacks integrity, dangerous in production |
| "I don't know" (only) | Honest but not helpful — doesn't show thinking |
| ABR technique | Honest + can reason under uncertainty + growth mindset |

### Phrases That Work

✅ *"I haven't implemented this directly, but based on my experience with X, I'd approach it by..."*
✅ *"That's an area I'm actively learning. Let me think through the fundamentals..."*
✅ *"I know the general principle — [explain]. I'd need to look up the specific API, but the architecture would be..."*
✅ *"At SAP I solved a similar problem using [approach]. The concept here seems related because..."*

### Phrases to Avoid

❌ *"I don't know"* (without follow-up)
❌ *"I've never used that"* (conversation stopper)
❌ *"I think it probably works by..."* (vague bluffing)
❌ *"That's not something frontend engineers need to know"* (defensive)

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, when asked about implementing a feature I hadn't built before, I'd say: "I haven't built this exact pattern, but I've done [similar]. Let me research and prototype." This honesty + action approach earned trust and is exactly what interviews test.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"When I don't know an answer, I use the ABR technique: Acknowledge honestly ('I haven't worked directly with this'), Bridge to what I know ('At SAP, I solved a similar problem using...'), and Reason from first principles ('Based on the constraints, I'd expect the solution to work by...'). This shows intellectual honesty, transferable problem-solving, and growth mindset — which I know Microsoft specifically values."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Example: Asked about Service Workers when you've mostly used them indirectly

// BAD: "I don't know Service Workers."

// GOOD (ABR):
// A: "I haven't implemented a custom Service Worker from scratch."
// B: "But I've used Workbox at SAP for caching strategies, and I 
//     understand the lifecycle: install → activate → fetch events."
// R: "So for offline support, I'd register a SW that intercepts 
//     fetch events and implements a stale-while-revalidate strategy 
//     for API calls, and cache-first for static assets. Let me 
//     sketch the logic..."

// Then reason through code:
self.addEventListener('fetch', (event: FetchEvent) => {
  // Reason: static assets change rarely → cache-first
  if (event.request.url.match(/\.(js|css|png)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }
  
  // Reason: API data changes often → stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        const cache = caches.open('api-cache');
        cache.then(c => c.put(event.request, response.clone()));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"ABR = Acknowledge, Bridge, Reason."** Never freeze or bluff. Acknowledge honestly (2 seconds), bridge to what you DO know (SAP experience, similar patterns), then reason from first principles. This shows honesty + problem-solving + growth mindset — the trifecta interviewers love.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** How you handle uncertainty is as important as what you know. Growth mindset is explicitly evaluated at Microsoft.
**How:** ABR technique — Acknowledge honestly, Bridge to related experience, Reason from first principles.
**Companies:** **Microsoft** (Growth Mindset core value), Adobe (Genuine), Salesforce (Trust), Cisco (Integrity) — all value intellectual honesty.
