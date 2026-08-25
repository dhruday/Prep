# Incident Management and Postmortems
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Incident = any unplanned event that disrupts a service** — a P1 is total outage; P2 is partial degradation; not every alert is an incident; not every user complaint is an incident; an incident is declared when the impact meets a defined threshold (e.g., error rate > 5% for 5 minutes, or a critical feature is unavailable)
- **Incident commander (IC)** = the single person in charge during the incident; does not do all the work — delegates, coordinates, and makes decisions; everyone else reports to the IC; without an IC, everyone talks at once, duplicates work, and misses steps
- **MTTR = Mean Time To Repair/Resolve**: key SRE metric; includes detection time + response time + mitigation time + resolution time; fast detection (good alerts) + fast response (runbooks) + fast mitigation (feature flags, rolling back) are the three levers
- **Blameless postmortem**: after-the-incident analysis focused on WHY the system allowed the failure, not WHO made the mistake; Google SRE principle: people don't fail — processes, tools, and systems fail; blaming individuals prevents honest reporting and learning
- **Five Whys technique**: ask "why" five times to find the root cause, not just the proximate cause; "The checkout was down" → "Why?" → "The DB pool exhausted" → "Why?" → "A slow query held connections" → "Why?" → "An index was missing after the migration" → "Why?" → "The migration was not tested with production data volume" → root cause: no pre-production load testing on migrations
- **Action items = the only thing that matters after a postmortem**: an incident review that produces no action items is wasted time; every item needs an owner, a priority, and a deadline; track them in Jira/GitHub Issues to close the loop

---

## 1. One-Line Definition
Incident management is the structured process of detecting, responding to, and resolving service disruptions, while a postmortem is the blameless analysis that follows to understand root causes and prevent the same incident from happening again.

---

## 2. The Problem It Solves

A payment processing outage hits at 11:23 PM on a Friday. Without incident management:
- Three engineers all start investigating at once, duplicating work
- The on-call engineer tries to both write customer communications AND debug the root cause
- Nobody has a runbook — every step requires searching Slack history
- The database team is paged, then the platform team, then the payments team — no one knows who is "in charge"
- The incident is resolved 2.5 hours later because coordination overhead ate 60% of the time
- On Monday, everyone agrees "we should write a postmortem" — it never gets written; the same incident happens 10 weeks later

With incident management:
- Incident is declared at 11:24 PM (Sentry + PagerDuty alert → on-call)
- Incident commander is auto-assigned (rotation); they open the incident Slack channel, assign roles
- Runbook is in the alert annotation — the responding engineer follows it immediately
- Resolution in 38 minutes, most of which was the actual fix, not coordination
- Postmortem written Tuesday; 3 action items assigned to specific owners; root cause (missing index on migration) prevented from recurring

---

## 3. How It Works Internally

### Incident Lifecycle

```
[Alert fires] ─── [Acknowledged in PagerDuty] ─── [Incident declared]
                                                           │
                        ┌──────────────────────────────────┘
                        ▼
              [Incident Commander (IC) takes over]
                        │
              [Dedicated #incident-[date]-[service] Slack channel opened]
                        │
              [Roles assigned:
                  IC = coordinates, decides, comms
                  Technical Lead = diagnoses, fixes
                  Comms Lead = updates status page, customer comms
                  Scribe = records timeline in postmortem doc]
                        │
              [Triage: What is the user impact? What is the blast radius?]
                        │
              [Mitigation: restore service FIRST (rollback, feature flag, scale)]
                        │                         ← do NOT wait for root cause
              [Service restored → Incident resolved]
                        │
              [24–48h later: postmortem written]
                        │
              [Action items assigned → tracked to completion]
```

### Severity Levels

```
P1: Complete service unavailability for all users
    OR core flow (payment, login, order) unavailable
    → Page on-call immediately, any time, escalate in 10 min if no ack

P2: Significant degradation for a subset of users or a non-critical feature
    OR performance severely degraded (P99 > 5x SLO)
    → Page during business hours; Slack notification other times

P3: Minor degradation, cosmetic issues, single-user reports
    → Slack notification + ticket; address in next sprint

P4: Improvement opportunities, proactive cleanup
    → Backlog ticket only
```

---

## 4. The Code

### Wrong Way — Unstructured, Blame-Based Incident Response

```
// ❌ WRONG — No IC, no roles, everyone talks at once

11:23 PM: PagerDuty fires
11:23 PM: @ravi: I'm looking at it
11:24 PM: @priya: me too — what's wrong?
11:24 PM: @rahul: I think it's the payment gateway?
11:25 PM: @ravi: no it's the DB — looking at logs
11:25 PM: @priya: I rolled back the deploy just in case
11:25 PM: @rahul: WAIT I was still debugging! now metrics changed
11:27 PM: @ravi: the rollback didn't help. where are the DB logs?
11:28 PM: @priya: not sure what panel to look at
11:30 PM: @rahul: I just restarted the pods — is that ok?
[30 minutes later, three people have taken contradictory actions,
 no one knows the current state of the system, no customer 
 communication has been sent]

// ❌ WRONG — Blame-based postmortem

"The root cause was that Priya deployed a migration without 
running it on staging first. We need stricter deployment 
controls so this doesn't happen again."
// ← Names an individual, creates fear, prevents future honesty
// Priya will not report her own mistakes next time
// The real system failure: no automated migration testing in CI
// was never addressed
```

### Right Way — Structured Incident Response + Blameless Postmortem

```
// ✅ RIGHT — Structured incident response with roles

11:23 PM: PagerDuty fires
11:23 PM: @rahul (on-call): Ack'd. Opening incident.

#incident-2024-01-15-checkout-down created

11:24 PM: @rahul (IC): I'm taking IC. @ravi you are tech lead.
          @priya you are comms — update status page to "investigating".
          @sai you are scribe — track everything in the postmortem doc.
          
11:24 PM: @priya (comms): Status page updated. 
          "We are investigating issues with checkout. Orders may fail."
          
11:25 PM: @ravi (tech lead): Error is 100% failure rate on POST /api/checkout.
          Started at 11:19 PM. DB connection pool exhausted.
          
11:26 PM: @rahul (IC): @ravi — what's fastest mitigation? 
          Rollback or feature flag?
          
11:27 PM: @ravi (tech lead): Not a deploy issue. The new migration
          added a query that locks tables. Mitigation: 
          restart the migration-service pod to kill in-flight queries.
          Requesting approval to restart.
          
11:27 PM: @rahul (IC): Approved. Do it.

11:28 PM: @ravi (tech lead): Pod restarted. Connection pool clearing.
          Error rate dropping. 83% → 40% → 12% → 1% → 0.
          Monitoring for 5 minutes.
          
11:33 PM: @rahul (IC): Error rate 0% for 5 minutes. 
          Declaring incident resolved.
          @priya — update status page to resolved.
          Postmortem call scheduled Tuesday 2 PM.

[Total: 10 minutes mitigation time]
```

```markdown
# ✅ RIGHT — Blameless Postmortem Template

## Incident: Checkout Outage — 2024-01-15 23:19–23:33 IST

### Summary
Checkout was unavailable for 14 minutes. Approximately 1,200 order placement
attempts failed. Estimated €18,000 in lost GMV (based on average order value).

### Timeline
| Time (IST) | Event |
|------------|-------|
| 23:19:04 | First error logged by order-service |
| 23:19:17 | Error rate crossed 5% SLO threshold |
| 23:23:41 | PagerDuty page sent (4-minute detection lag) |
| 23:23:55 | On-call acknowledged |
| 23:27:30 | Root cause identified (migration lock query) |
| 23:28:00 | Mitigation applied (pod restart) |
| 23:33:00 | Error rate at 0%, incident resolved |

**MTTD (Mean Time To Detect):** 4 minutes 13 seconds
**MTTR (Mean Time To Resolve):** 13 minutes 56 seconds

### Root Cause
A database migration added a long-running `ALTER TABLE` statement on the
orders table. In PostgreSQL, ALTER TABLE acquires an AccessExclusiveLock —
blocking ALL other queries on the table. With 100 concurrent requests hitting
the orders table, the HikariCP connection pool of 20 connections exhausted
in under 30 seconds.

### Contributing Factors
1. The migration was tested on a staging environment with 50,000 rows.
   Production has 4.2 million rows. ALTER TABLE duration: 90ms (staging)
   vs 47 seconds (production).
2. No pre-migration validation step checked table row count or estimated
   lock duration.
3. The migration was deployed during evening peak traffic. A maintenance
   window policy was not enforced for schema-altering migrations.

### What Went Well
- Alert fired within 5 minutes of first error
- IC established within 2 minutes of alert acknowledgement
- Root cause identified in 4 minutes using structured log query
- Mitigation was fast (pod restart, no full rollback required)
- Customer communication was sent within 6 minutes

### What Could Be Improved
- 4-minute detection gap: error started at 23:19, alert at 23:23
  → Burn rate threshold should be lower for critical checkout path
- Staging data volume does not reflect production
  → False confidence in migration testing

### Action Items

| # | Action | Owner | Priority | Due |
|---|--------|-------|----------|-----|
| 1 | Add pre-migration check: if table rows > 1M and statement is DDL, require explicit approval and maintenance window | @ravi | P1 | 2024-01-22 |
| 2 | Update staging seed script to mirror production row counts (at minimum 10% of prod volume) | @sai | P1 | 2024-01-26 |
| 3 | Reduce checkout fast-burn alert window from 5m to 2m to cut detection gap | @priya | P2 | 2024-01-19 |
| 4 | Add runbook step: for DB connection pool exhaustion, check for long-running queries first before pod restart | @rahul | P2 | 2024-01-22 |
| 5 | Schedule DDL migrations only during low-traffic windows (Sunday 2–4 AM); enforce via CI deployment gate | @rahul | P2 | 2024-01-31 |

### Five Whys
1. Why did checkout go down? → DB connection pool exhausted
2. Why did the connection pool exhaust? → Long-running ALTER TABLE held locks
3. Why was ALTER TABLE long-running? → Production table has 4.2M rows; staging has 50K
4. Why was the staging row count so different? → Staging seeding script not updated
5. Why was the migration deployed in peak hours? → No maintenance window enforcement for DDL

**Root cause:** Staging environment does not reflect production data volume,
and there is no deployment gate for DDL migrations in high-traffic windows.
```

```java
// ✅ RIGHT — Automated incident context gathering via Spring Boot
// When an alert fires, gathering these values immediately cuts MTTD

@RestController
@RequestMapping("/internal/incident")
@Slf4j
public class IncidentContextController {
    
    private final HikariDataSource dataSource;
    private final MeterRegistry meterRegistry;
    
    // ✅ Runbook step 1: call this endpoint immediately on DB-related incidents
    // Returns current DB pool state, top queries by duration, and active connections
    @GetMapping("/db-state")
    @PreAuthorize("hasRole('ADMIN')")  // ✅ internal only — requires admin role
    public ResponseEntity<Map<String, Object>> getDbState() {
        Map<String, Object> state = new LinkedHashMap<>();
        
        // HikariCP pool state
        HikariPoolMXBean pool = dataSource.getHikariPoolMXBean();
        state.put("active_connections", pool.getActiveConnections());
        state.put("idle_connections", pool.getIdleConnections());
        state.put("pending_threads", pool.getThreadsAwaitingConnection());
        state.put("max_pool_size", dataSource.getMaximumPoolSize());
        
        // Recent error rate from Micrometer
        Counter errors = meterRegistry.find("http.server.requests")
            .tag("status", "500")
            .counter();
        state.put("recent_500_count", errors != null ? errors.count() : 0);
        
        log.info("Incident DB state requested");
        return ResponseEntity.ok(state);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a blameless postmortem and why does it matter?"

**Hruday's answer:**
> A blameless postmortem is an incident analysis that focuses on the system and process failures that allowed an incident to happen — not on finding which individual made a mistake.
>
> It matters because when people fear blame, they hide information. An engineer who deployed a faulty migration won't say "I deployed this without checking the migration runtime" if they think it will be held against them. They'll give vague answers, and the real root cause — "our CI pipeline has no migration runtime check" — never gets surfaced. The same incident happens again in six months.
>
> In contrast, a blameless postmortem asks: "What would have prevented a skilled, well-intentioned engineer from deploying this without noticing the problem?" The answers are systemic: a CI gate, a pre-migration validation script, a staging environment that mirrors production data volume. Those systemic fixes prevent all future engineers from making the same mistake, not just the one who made it this time.
>
> This principle comes from aviation's safety culture — accident investigations focus on system design, not pilot error. The aviation industry's safety record improved dramatically when it moved from blame to systems thinking. Google SRE formalized this for software, and it's now standard at any serious engineering organization.

---

### Q2 — Process
**Interviewer asks:** "What is the incident commander role and why do you need one?"

**Hruday's answer:**
> The incident commander is the single person who takes ownership of coordination during an incident. They don't necessarily do the technical investigation — that's the technical lead's job. The IC decides what to investigate, who investigates it, when to escalate, when to try a mitigation, and when to call the incident resolved.
>
> The reason you need this role is that incidents without a coordinator become chaotic. Without an IC, three engineers investigate the same thing simultaneously, duplicating work and confusing each other. Someone tries a mitigation without telling anyone, changing the metrics the other person was using to build their mental model. Customer communications don't go out because everyone assumes someone else is doing it.
>
> The IC provides three things: a single decision authority so there's no debate about which action to take next, a communication hub so everyone has the same picture of what's happening, and a record that someone is responsible for driving to resolution.
>
> At SAP, we formalized the IC role with a PagerDuty rotation — the on-call is automatically IC unless they explicitly hand the role to someone else. This single change reduced our average incident coordination overhead significantly. The technical people could focus on the problem because coordination was centralized.

---

### Q3 — Metrics
**Interviewer asks:** "What is MTTR and what are the main ways to reduce it?"

**Hruday's answer:**
> MTTR is Mean Time To Resolve — the average time from when an incident starts (first users affected) to when service is fully restored. It has three components: detection time, response time, and resolution time.
>
> Detection time is reduced by better alerting: burn rate alerts that fire within 2 minutes of SLO breach, not 15 minutes after. Every minute of MTTD (mean time to detect) adds to MTTR.
>
> Response time is reduced by runbooks. A runbook is a documented, tested procedure for the most common incident types — DB pool exhaustion, high error rate after deploy, Kafka consumer lag spike. When the on-call engineer has a runbook, they follow steps instead of starting from scratch. At SAP this reduced the average response time from 15 minutes (exploring the problem) to 4 minutes (following a known procedure).
>
> Resolution time is reduced by mitigation shortcuts: feature flags to disable faulty functionality without a deploy, pre-built rollback procedures in CI/CD, autoscaling policies that can resolve capacity issues without human intervention. The key principle: mitigation (restore service as fast as possible) is separate from root cause resolution (fix it properly). Restoring service should always come first, then take the time to do a proper fix.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We always find the root cause during the incident" | "During our incidents, we try to find and fix the root cause before marking it resolved" | Trying to find the root cause before mitigating is the single biggest mistake in incident management; it extends user impact for potentially hours while engineers dig through logs; the correct sequence is always: (1) mitigate fast (rollback, feature flag, restart, scale up — whatever restores service), (2) monitor to confirm recovery, (3) declare incident resolved, (4) THEN do a proper root cause investigation with no time pressure; a 15-minute outage that takes 2 hours to "properly" fix because engineers are debugging live production is much worse than a 15-minute outage resolved by a rollback, followed by a 3-day proper fix |
| "Postmortems are just a debrief meeting" | "We do a 30-minute call after each incident to discuss what happened" | A postmortem without written action items tracked to completion is theater; the value of a postmortem is the systemic changes it drives — CI gates, staging data volume improvements, alert threshold tuning, runbook additions; if those action items aren't assigned to named owners with deadlines and tracked in Jira or GitHub Issues, they will never be done; and the same incident will happen again; postmortem culture is measured by: what percentage of action items are closed within 30 days? If the answer is below 60%, the postmortems are happening but not working |
| "Blame is ok when someone clearly made a mistake" | "In this case it really was a human error — the engineer deployed without testing" | Blame is never productive in postmortems, even when the mistake seems obvious; the question to ask is: "what system, tool, or process allowed this mistake to reach production?"; a CI pipeline that doesn't run migration tests, a staging environment with insufficient data volume, a deployment policy that doesn't enforce maintenance windows for DDL — these are the factors that allowed the "obvious mistake" to happen; fix those and any future engineer (including the one who made the original mistake) is protected; name the individual and you fix nothing; ask "what system change prevents this?" and you fix the category of mistake |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a checkout outage that lasted 37 minutes — much longer than it needed to because we had no incident commander and three engineers were independently investigating with no coordination. Two of them restarted different services at different times, making it impossible to evaluate whether any particular action helped.
>
> After this incident, we formalized: the on-call is incident commander; roles are assigned in the first 3 minutes via a standard template message; the IC posts a live status update every 5 minutes in the incident Slack channel. The next P1, 6 weeks later — a Kafka consumer lag spike that blocked order processing for 800 users — was resolved in 11 minutes. The difference was entirely coordination, not technical capability.
>
> The postmortem from the first incident also produced a runbook for DB connection pool exhaustion that directly enabled the 11-minute resolution: step 3 was 'check for long-running queries via the /internal/incident/db-state endpoint'. Without the postmortem, we'd have started from scratch again."

---

## 8. Scale Evolution

**1,000 users →** Lightweight incident process: Slack channel per incident, one person owns it, informal postmortem document in Notion. Action items tracked in the same Notion doc. No formal IC rotation needed — team is small enough to coordinate.

**100,000 users →** PagerDuty IC rotation. Standard incident Slack channel template (roles assigned in first message). Postmortem template in a shared Google Doc. Action items tracked to completion in Jira. Monthly review: which action items from postmortems were closed? MTTR dashboard in Grafana.

**10 million users →** Formal incident severity matrix with on-call escalation policies. Automated incident channel creation via bot (PagerDuty + Slack integration). Status page auto-updated by PagerDuty. Postmortem review meeting with SRE team lead. Error budget consumption included in monthly reliability report. Gameday exercises (planned chaos engineering) to practice incident response before real incidents test it.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment outage = direct revenue loss + customer trust damage; formal incident response is an operational requirement, not optional; RBI may require incident reports for payment system outages; postmortem action items for compliance | Severity classification for financial impact; regulatory incident reporting; formal IC structure |
| Swiggy / Meesho | Peak load incidents (dinner rush, Flash Sales) require faster-than-average mitigation; pre-prepared runbooks for highest-probability incidents; clear escalation path from engineering to operations to leadership during high-visibility events | Runbook quality for high-traffic scenarios; business-hours vs off-hours protocol; GMV-impact quantification in postmortems |
| Adobe / Microsoft | Enterprise SLAs with legal penalties for extended outages (e.g., 99.99% contractual SLA); formal incident management required for enterprise compliance; detailed incident postmortems shared with enterprise customers; Microsoft Azure has a public postmortem culture | Enterprise SLA compliance; customer-facing postmortem writing; long-term trending analysis |
| SAP Labs | 37-minute outage reduced to 11-minute resolution via IC structure; runbook from postmortem directly enabled faster second incident; Slack coordination template; /internal/incident/db-state runbook step | Concrete MTTR improvement story; runbook creation from postmortem; direct operational impact of process improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 270 — Alert Strategy** — the quality of the incident response starts with alert quality; an alert that fires 8 minutes after the incident started has already cost users 8 minutes; alert strategy (burn rate thresholds, MTTD reduction) is the upstream driver of MTTR; postmortems frequently produce action items that improve alerting
- **Topic 263 — Structured Logging** — during incident response, the first action is almost always a Kibana log query using the traceId from the alert; structured logs with correlation IDs are the primary investigation tool; unstructured logs extend MTTR significantly because investigation requires pattern-matching instead of direct queries
- **Topic 267 — Micrometer + Prometheus** — the metrics dashboard (Grafana from Prometheus data) is the second primary incident tool after logs; the IC and technical lead both reference the Grafana dashboard throughout the incident to confirm whether mitigations are working; metric quality directly determines how quickly the team can confirm or rule out hypotheses
- **Topic 154 — SLI, SLO, SLA** — incident severity is defined by SLO impact; the formal definitions (SLI = the measured thing, SLO = the target, SLA = the contractual commitment) give precise language for describing incident impact to both engineers and stakeholders; a P1 is "we are burning the error budget at more than 14x for a 99.9% SLO" — that precision enables consistent incident declaration across teams

---

*Part 16 · Incident Management and Postmortems · Full Stack Interview Guide · Hruday D · 2026*
