# 134. Incident Management

## 📌 Overview

**Incident**: Event causing service degradation or outage

**Incident Management**: Process to detect, respond, resolve, and learn from incidents

**Goal**: Minimize impact on users and prevent recurrence

---

## 🎯 Incident Lifecycle

```
1. Detection    → Alert fires, someone notices
2. Response     → On-call engineer acknowledges
3. Triage       → Assess severity, gather team
4. Investigation → Find root cause
5. Mitigation   → Stop the bleeding (rollback, failover)
6. Resolution   → Permanent fix
7. Postmortem   → Learn, prevent recurrence
```

---

## 🎯 1. Detection

**How incidents are detected**:

**Automated alerts** (preferred):

```
Alert: HighErrorRate
Error rate: 7.2% (threshold: 5%)
Service: orders-service
Duration: 5 minutes

→ PagerDuty pages on-call engineer
```

**User reports** (not ideal):

```
User tweets: "Can't checkout on your website! 🤬"
Customer support: "10 users reporting 500 errors"

→ Engineering team investigates
```

**Manual discovery** (worst case):

```
Engineer notices weird logs while debugging something else
```

---

### **Detection Best Practices**

1. **Automated alerts** (catch issues before users notice)
2. **External monitoring** (Pingdom checks from multiple regions)
3. **Synthetic tests** (run critical user flows every 1 min)
4. **Customer feedback** (monitor Twitter, support tickets)

---

## 🎯 2. Response

**On-call engineer receives alert**:

**1. Acknowledge** (stop paging):

```
PagerDuty: Alert acknowledged by John
Status: Investigating
```

**2. Assess severity**:

```
SEV-1 (Critical): Service completely down, all users affected
SEV-2 (High):     Major feature broken, many users affected
SEV-3 (Medium):   Minor feature broken, some users affected
SEV-4 (Low):      No user impact, technical issue
```

**3. Create incident** (if SEV-1 or SEV-2):

```
Incident: INC-12345
Title: Orders API returning 500 errors
Severity: SEV-1
Status: Investigating
Incident Commander: John
```

---

## 🎯 Severity Levels

### **SEV-1 (Critical)** - Page immediately

**Criteria**:
- Service completely down (all requests failing)
- Data loss or corruption
- Security breach
- Revenue impact > $100k/hour

**Examples**:
- Website down (HTTP 500 for all requests)
- Payment processing broken (can't checkout)
- Database deleted (customer data lost)
- API keys leaked (security breach)

**Response**:
- Page on-call engineer immediately (phone + SMS)
- Incident commander appointed within 5 minutes
- Status page updated ("Major outage")
- Exec team notified

**Target resolution**: 1 hour (stop the bleeding)

---

### **SEV-2 (High)** - Page during business hours

**Criteria**:
- Major feature broken
- Performance severely degraded (p95 latency 10x normal)
- Affecting > 10% of users
- Revenue impact $10k-$100k/hour

**Examples**:
- Search broken (returns no results)
- Login slow (takes 30 seconds)
- Recommendations not loading
- One region down (US-East)

**Response**:
- Page on-call engineer (business hours)
- Incident commander appointed within 15 minutes
- Status page updated ("Partial outage")

**Target resolution**: 4 hours

---

### **SEV-3 (Medium)** - No page, Slack notification

**Criteria**:
- Minor feature broken
- Affecting < 10% of users
- Workaround available
- Revenue impact < $10k/hour

**Examples**:
- Image thumbnails not loading (images load, thumbnails don't)
- One API endpoint slow (others working)
- Edge case bug (only affects Safari users)

**Response**:
- Slack notification to team
- No incident commander (individual handles)
- Status page optional

**Target resolution**: 24 hours

---

### **SEV-4 (Low)** - Track, no urgency

**Criteria**:
- No user impact
- Technical issue
- Monitoring alert (not affecting users)

**Examples**:
- High CPU (80%) but service working
- Disk space low (70%) but not full
- Cache miss rate high (performance unaffected)

**Response**:
- Create ticket, assign to team
- Fix during business hours

**Target resolution**: 1 week

---

## 🎯 3. Incident Roles

### **Incident Commander** (IC)

**Responsibilities**:
- Own the incident (single point of coordination)
- Delegate tasks (assign people to investigate, mitigate)
- Communicate updates (status page, Slack, email)
- Make decisions (rollback vs fix forward)
- Run postmortem (after resolution)

**Example**:

```
IC (John): "Sarah, check database connections. Mike, review recent deployments. 
            I'll update status page."

Sarah: "Database connections at 95% (max capacity)"
Mike: "Deployment 30 min ago, version v1.2.3"

IC: "Let's rollback to v1.2.2. Mike, execute rollback."
```

---

### **Subject Matter Expert** (SME)

**Responsibilities**:
- Provide expertise (database, infrastructure, specific service)
- Investigate root cause
- Execute mitigation (rollback, failover, config change)

**Example**:

```
IC: "We need a database expert. Paging Sarah."
Sarah (SME): "Database connections maxed out. Connection pool too small.
              Increasing pool size from 100 to 200."
```

---

### **Communications Lead**

**Responsibilities**:
- Update status page (every 15 min)
- Notify stakeholders (exec team, support team)
- Draft customer communication (if needed)

**Example**:

```
Status page update:
"10:00 AM: Investigating - Orders API returning errors
10:15 AM: Identified - Database connection pool exhausted
10:30 AM: Monitoring - Increased connection pool, monitoring recovery
10:45 AM: Resolved - All systems operational"
```

---

## 🎯 4. Investigation

**Goal**: Find root cause quickly

### **Investigation Steps**

**1. Check recent changes**:

```bash
# Recent deployments
kubectl rollout history deployment/orders-service

# Recent config changes
git log --since="1 hour ago" -- config/

# Recent infrastructure changes
terraform plan
```

**2. Check metrics** (Grafana):

```
- Error rate: Spiked 5 min ago ⚠️
- Latency: p95 = 5s (normally 200ms)
- Database connections: 100/100 (maxed out) ⚠️
```

**3. Check logs** (ELK):

```bash
# Recent errors
grep "ERROR" /var/log/app.log | tail -100

# Specific error
grep "database connection" /var/log/app.log

# Result:
"ERROR: Could not acquire database connection (pool exhausted)"
```

**4. Check dependencies**:

```
- Database: ✓ Up (but connection pool full)
- Redis: ✓ Up
- Stripe API: ✓ Up (https://status.stripe.com)
- Kafka: ✓ Up
```

**5. Correlate events**:

```
10:00 AM: Deployment v1.2.3 (new feature: recommendations)
10:05 AM: Error rate spiked (0% → 7%)
10:05 AM: Database connections maxed (50 → 100)

Root cause: New feature creates 2x database connections per request
```

---

## 🎯 5. Mitigation (Stop the Bleeding)

**Goal**: Restore service quickly (even if not permanent fix)

### **Common Mitigation Strategies**

**1. Rollback deployment**:

```bash
# Rollback to previous version
kubectl rollout undo deployment/orders-service

# Result: Error rate drops 7% → 0% within 2 min ✓
```

**2. Failover** (switch to backup):

```bash
# Database primary down → Failover to replica
mysql> STOP SLAVE;
mysql> RESET MASTER;

# Update app config to point to new primary
kubectl set env deployment/orders-service DB_HOST=db-replica
```

**3. Increase resources**:

```bash
# High CPU → Scale up
kubectl scale deployment/orders-service --replicas=10

# Database connection pool exhausted → Increase pool size
kubectl set env deployment/orders-service DB_POOL_SIZE=200
```

**4. Disable feature** (circuit breaker):

```python
# Feature causing issues → Disable via feature flag
@app.route('/api/recommendations')
def recommendations():
    if not feature_flag('recommendations_enabled'):
        return []  # Graceful degradation
    
    return get_recommendations()
```

**5. Rate limit** (DDoS attack):

```bash
# Sudden traffic spike → Rate limit
kubectl apply -f rate-limit-policy.yaml

# Allow 1000 req/sec per IP (drop excess)
```

---

## 🎯 6. Resolution (Permanent Fix)

**After mitigation** (service restored), fix root cause permanently

**Example**:

**Mitigation**: Rolled back deployment (temporary fix)

**Root cause**: New feature creates too many database connections

**Permanent fix**:
1. Optimize feature (connection pooling, caching)
2. Test thoroughly (load testing, staging)
3. Deploy gradually (canary deployment, 1% → 10% → 100%)

---

## 🎯 7. Postmortem (Blameless)

**Goal**: Learn from incident, prevent recurrence

**NOT blame** ("Who broke it?" ❌)

### **Postmortem Template**

```markdown
# Postmortem: Orders API Outage (INC-12345)

## Summary
On Jan 15, 2024 at 10:05 AM, Orders API experienced a complete outage 
affecting all users for 45 minutes. Root cause: Database connection 
pool exhausted due to new recommendations feature.

## Timeline
- 10:00 AM: Deployed v1.2.3 (recommendations feature)
- 10:05 AM: Error rate spiked 0% → 7%
- 10:10 AM: Alert fired (HighErrorRate)
- 10:12 AM: On-call engineer (John) acknowledged
- 10:15 AM: Incident declared (SEV-1)
- 10:20 AM: Root cause identified (DB connections maxed)
- 10:25 AM: Mitigation: Rolled back to v1.2.2
- 10:30 AM: Service restored (error rate 0%)
- 10:50 AM: Incident resolved

## Root Cause
New recommendations feature called database 10x per request (should be 1x).
Connection pool size = 100 (not enough for increased traffic).

## Impact
- Duration: 45 minutes
- Users affected: 100% (all regions)
- Revenue impact: $50k lost sales
- Error rate: 7% (700 errors per 10k requests)

## What Went Well
- Alert fired within 5 min ✓
- On-call responded quickly (2 min) ✓
- Root cause identified in 10 min ✓
- Rollback resolved issue ✓

## What Went Wrong
- No load testing before deployment ❌
- Connection pool size not monitored ❌
- No canary deployment (deployed to 100% immediately) ❌

## Action Items
1. [P0] Add load testing to CI/CD (Owner: Mike, Due: Jan 20)
2. [P0] Add DB connection pool monitoring + alert (Owner: Sarah, Due: Jan 18)
3. [P1] Enable canary deployments (1% → 10% → 100%) (Owner: John, Due: Jan 25)
4. [P1] Add connection pooling to recommendations feature (Owner: Mike, Due: Jan 22)
5. [P2] Update runbook with DB connection troubleshooting (Owner: Sarah, Due: Jan 30)

## Lessons Learned
- Always load test new features before production deployment
- Monitor resource limits (DB connections, memory, CPU)
- Use canary deployments to limit blast radius
```

---

### **Postmortem Best Practices**

1. **Blameless** (focus on system, not people)
   - ❌ "Mike deployed buggy code"
   - ✓ "Deployment lacked load testing"

2. **Timeline** (chronological events, with timestamps)

3. **Root cause** (technical explanation, not blame)

4. **Impact** (users affected, duration, revenue loss)

5. **What went well** (celebrate good response)

6. **What went wrong** (identify gaps)

7. **Action items** (concrete, with owners and deadlines)

8. **Share widely** (entire engineering team learns)

---

## 🎯 Real-World Examples

### **1. GitHub (2018 Outage)**

**Incident**: Database failover caused 24 hours of degraded service

**Timeline**:
- Network partition between US-East and US-West datacenters
- Database replicas out of sync (split-brain)
- Automated failover to replica (contained stale data)
- 24 hours to manually reconcile data

**Root cause**: Network partition + automated failover without data consistency check

**Lessons learned**:
- Improved network redundancy (multiple paths between DCs)
- Added data consistency checks before failover
- Manual approval required for cross-region failover

**Postmortem**: https://github.blog/2018-10-30-oct21-post-incident-analysis/

---

### **2. AWS S3 Outage (2017)**

**Incident**: S3 in US-East-1 down for 4 hours, affecting thousands of services

**Root cause**: Engineer ran command to remove small number of servers, typo removed large number

**Timeline**:
- 9:37 AM: Command executed (typo: removed 1000 servers instead of 10)
- 9:40 AM: S3 API unavailable
- 1:54 PM: S3 fully restored (4 hours)

**Impact**:
- Thousands of websites down (Slack, Trello, Quora)
- $150 million lost revenue (estimated)

**Lessons learned**:
- Added rate limiting to operational commands (can't remove >10% servers in one command)
- Improved monitoring (faster detection)
- Better testing of recovery procedures

---

### **3. Cloudflare (2020 Outage)**

**Incident**: Global outage caused by router configuration change

**Root cause**: Configuration change to improve performance → Triggered bug in router software

**Timeline**:
- 3:47 PM: Configuration deployed to routers
- 3:50 PM: Routers crashed (bad configuration)
- 4:00 PM: Traffic dropped 50% globally
- 6:58 PM: Fixed (rolled back configuration)

**Impact**:
- Duration: 3 hours
- Traffic drop: 50% globally
- Millions of websites affected

**Lessons learned**:
- Staged rollouts for infrastructure changes (deploy to 1% → 10% → 100%)
- Better testing environment (mirror production)
- Automated rollback if metrics degrade

**Postmortem**: https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/

---

## 🎯 Incident Communication

### **Internal Communication** (Slack)

**Incident channel**: #incident-12345

```
10:10 AM - John (IC): Incident declared (SEV-1). Orders API returning 500 errors.
10:15 AM - John: Root cause: Database connections maxed. Rolling back deployment.
10:30 AM - John: Rollback complete. Monitoring recovery.
10:45 AM - John: Incident resolved. Will post postmortem by EOD.
```

---

### **External Communication** (Status Page)

**Status page**: https://status.company.com

```
10:00 AM: Investigating
We are investigating reports of errors on the Orders API. 
We'll provide an update in 15 minutes.

10:15 AM: Identified
We have identified the issue as a database connection pool limit. 
We are working on a fix.

10:30 AM: Monitoring
We have rolled back a recent deployment and are monitoring recovery. 
Most users should see service restored.

10:45 AM: Resolved
All systems operational. We apologize for the inconvenience. 
A full postmortem will be published within 24 hours.
```

---

### **Customer Email** (if major impact)

```
Subject: Service Disruption - Orders API (Jan 15, 2024)

Dear Customer,

On January 15, 2024 between 10:05 AM and 10:50 AM PST, our Orders API 
experienced a complete outage affecting all users. We sincerely apologize 
for the inconvenience.

What happened:
A recent deployment caused our database connection pool to be exhausted, 
resulting in errors for all API requests.

Resolution:
We quickly identified the issue and rolled back the deployment within 
45 minutes, restoring full service.

Impact:
- Duration: 45 minutes
- Affected: Orders API (100% of traffic)
- Other services: Unaffected

Prevention:
We are implementing load testing, improved monitoring, and canary 
deployments to prevent similar incidents in the future.

A detailed postmortem will be published at https://status.company.com 
within 24 hours.

We apologize again for the disruption.

Sincerely,
Engineering Team
```

---

## 🎯 Incident Response Tools

### **1. PagerDuty** (On-call management)

**Features**:
- On-call schedules (who's on-call this week?)
- Escalation policies (if no response in 5 min, escalate to manager)
- Incident tracking (acknowledge, assign, resolve)
- Postmortem reports

**Example flow**:

```
Alert: HighErrorRate
  → PagerDuty creates incident
    → Calls on-call engineer (John)
      → John acknowledges via app
        → John assigns Sarah (database expert)
          → Sarah resolves incident
            → PagerDuty closes incident
              → Generates incident report
```

---

### **2. Slack** (Communication)

**Incident channel**: Automatically created

```
/incident declare sev-1 "Orders API down"

Result:
- Channel created: #incident-12345
- Incident commander: John (on-call)
- Relevant people added (backend team, database team)
- Pin: Incident details (severity, title, commander)
```

---

### **3. Statuspage.io** (External communication)

**Features**:
- Components (API, Website, Database)
- Incidents (create, update, resolve)
- Subscribers (email, SMS, Slack)
- Metrics (uptime, response time)

**Example**: https://status.stripe.com

---

### **4. Jira / Linear** (Action items)

**After postmortem**: Create tickets for action items

```
[P0] Add load testing to CI/CD
Owner: Mike
Due: Jan 20
Description: Implement load testing for all deployments to catch 
             performance issues before production.
```

---

## ✅ Best Practices

1. **Automate detection** (alerts, synthetic tests)
2. **Clear severity definitions** (SEV-1 = page, SEV-3 = Slack)
3. **Incident commander** (single point of coordination)
4. **Blameless postmortems** (focus on system, not people)
5. **Action items** (concrete, with owners and deadlines)
6. **Communicate often** (status page every 15 min)
7. **Learn and improve** (share postmortems, implement action items)

---

## 🎓 Interview Tips

**Q: "How do you handle a production incident?"**

A: "I follow a structured incident management process:

**1. Detection**: Automated alert fires (e.g., HighErrorRate)

**2. Response**: 
- Acknowledge alert (stop paging)
- Assess severity (SEV-1 = critical, page immediately)
- Declare incident if SEV-1 or SEV-2

**3. Triage**:
- Appoint incident commander (coordinate response)
- Gather team (subject matter experts)

**4. Investigation** (find root cause):
- Check recent changes (deployments, config)
- Check metrics (error rate, latency, CPU)
- Check logs (grep for errors)
- Check dependencies (database, APIs)

**5. Mitigation** (stop the bleeding):
- Rollback deployment (fastest recovery)
- Failover to backup (if primary down)
- Scale up resources (if capacity issue)
- Disable feature (if causing errors)

**6. Resolution** (permanent fix):
- Fix root cause (optimize code, increase limits)
- Test thoroughly (load testing, staging)
- Deploy gradually (canary deployment)

**7. Postmortem** (learn, prevent recurrence):
- Blameless (focus on system, not people)
- Timeline, root cause, impact
- What went well, what went wrong
- Action items (with owners and deadlines)

**Real-world example**: Orders API outage
- Root cause: Database connection pool exhausted
- Mitigation: Rolled back deployment (45 min)
- Permanent fix: Increased pool size, added load testing
- Prevention: Canary deployments, connection pool monitoring"

**Q: "What is a blameless postmortem?"**

A: "A blameless postmortem focuses on system failures, not individual blame.

**NOT blameless** ❌:
- 'Mike deployed buggy code'
- 'Sarah didn't test properly'
- 'John should have caught this'

**Blameless** ✓:
- 'Deployment lacked load testing' (system gap)
- 'No monitoring for database connection pool' (system gap)
- 'Canary deployment not enabled' (process gap)

**Benefits**:
1. **Encourages honesty**: People share what went wrong without fear
2. **Focuses on system**: Fix the process, not punish people
3. **Prevents recurrence**: Action items address root causes
4. **Culture**: Safe to fail, learn, improve

**Postmortem structure**:
1. **Timeline**: Chronological events (what happened when)
2. **Root cause**: Technical explanation (why it happened)
3. **Impact**: Users affected, duration, revenue loss
4. **What went well**: Celebrate good response (alert fired quickly)
5. **What went wrong**: Identify gaps (no load testing)
6. **Action items**: Concrete fixes (add load testing by Jan 20)

**Real-world**: Google SRE pioneered blameless postmortems, now industry standard"

**Q: "How do you prevent incidents from recurring?"**

A: "After every incident, implement action items from postmortem:

**1. Improve monitoring**:
- If missed: Add alert (database connection pool > 80%)
- If too late: Faster detection (external monitoring, synthetic tests)

**2. Improve testing**:
- If deployment broke prod: Add load testing, staging environment
- If config broke prod: Test config changes before applying

**3. Improve deployment process**:
- If deployed to 100% immediately: Enable canary (1% → 10% → 100%)
- If rollback too slow: Automate rollback (one-click revert)

**4. Improve architecture**:
- If single point of failure: Add redundancy (multi-region, failover)
- If capacity issue: Auto-scaling, circuit breakers

**5. Improve documentation**:
- If unclear how to fix: Update runbooks (step-by-step guides)
- If knowledge in one person's head: Document tribal knowledge

**Example action items** (from Orders API outage):
1. [P0] Add load testing to CI/CD (catch before prod)
2. [P0] Add DB connection pool monitoring (alert if >80%)
3. [P1] Enable canary deployments (limit blast radius)
4. [P1] Add connection pooling to feature (fix root cause)
5. [P2] Update runbook (help future responders)

**Track completion**: Assign owners, deadlines, follow up

Real-world: Netflix learns from every incident, error rate dropped 90% over 5 years"

---

## 📚 Summary

**Incident lifecycle**: Detection → Response → Triage → Investigation → Mitigation → Resolution → Postmortem

**Severity**: SEV-1 (critical, page), SEV-2 (high, page business hours), SEV-3 (medium, Slack), SEV-4 (low, ticket)

**Roles**: Incident Commander (coordinate), SME (expertise), Communications Lead (status page)

**Mitigation**: Rollback, failover, scale up, disable feature

**Postmortem**: Blameless, timeline, root cause, action items

**Real-world**: GitHub (failover incident), AWS S3 (typo removed 1000 servers), Cloudflare (router config) 🚀

