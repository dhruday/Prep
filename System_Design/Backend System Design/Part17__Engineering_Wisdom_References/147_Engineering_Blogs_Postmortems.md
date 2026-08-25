# 147. Engineering Blogs & Postmortems (Learning from Production Failures)

## 📌 Purpose

**Production outages teach more than success stories.** This document covers famous postmortems and engineering blog deep-dives from top tech companies.

---

## 🔥 Famous Outages & Postmortems

---

## 1️⃣ AWS S3 Outage (February 28, 2017)

### **Impact**

- **4 hours downtime** (US-EAST-1 region)
- **54% of top 100,000 websites** affected
- Services down: Slack, Trello, GitHub, Imgur, Quora

### **Root Cause**

**Human Error:**
```bash
# Engineer intended to remove small number of S3 servers
$ aws s3 remove-servers --subsystem=s3 --count=5

# Typo: Removed ALL servers in subsystem
$ aws s3 remove-servers --subsystem=s3-billing --count=ALL  # ❌
```

**What broke:**
1. Billing subsystem servers removed
2. S3 unable to process requests (no billing = no service)
3. Index subsystem also removed (metadata gone)
4. Restart took 4 hours (index rebuild)

### **Lessons Learned**

✅ **Tooling improvement:** Add safeguards to prevent accidental mass removal  
✅ **Faster recovery:** Pre-warm subsystems (reduce restart time from 4h → 30min)  
✅ **Better testing:** Test large-scale restarts regularly  
✅ **Communication:** S3 dashboard itself was down (hosted on S3) → Use external status page

### **Interview Insight**

> "AWS S3 outage was caused by a **typo in a command** that removed critical billing servers. The key lesson: **Tooling must prevent catastrophic mistakes**. They added confirmation prompts for mass operations and improved restart procedures. This shows why **production tooling is as important as the service itself**."

---

## 2️⃣ GitHub Outage (October 21, 2018)

### **Impact**

- **24 hours partial outage**
- **Repository data inconsistency**
- Affected millions of developers

### **Root Cause**

**Network partition between US East and US West datacenters**

**Timeline:**
```
10:52 AM: Network partition occurs (43 seconds)
10:52 AM: MySQL Orchestrator promotes US-West as primary (split-brain)
10:53 AM: Network restored, but now TWO primaries (US-East + US-West)
11:14 AM: GitHub disables writes (prevent further divergence)
Next 24h: Manual reconciliation of conflicting data
```

### **The Problem: Split-Brain**

```
Before partition:
  US-East (Primary) ←→ US-West (Replica)

During partition (43 seconds):
  US-East (Primary, isolated) ❌ US-West (Promoted to Primary)

After partition:
  US-East (Primary) ↔ US-West (Primary)  ← TWO PRIMARIES!
```

**Data divergence:**
- US-East received writes from East Coast users
- US-West received writes from West Coast users
- When network restored, conflicting data

### **Lessons Learned**

✅ **Fencing tokens:** Prevent split-brain (only one primary at a time)  
✅ **Automated failover too aggressive:** 43-second partition shouldn't trigger failover  
✅ **Consistency over availability:** Better to go read-only than have inconsistent data  
✅ **Testing network partitions:** Simulate network failures regularly (chaos engineering)

### **Interview Insight**

> "GitHub's 2018 outage was a **split-brain scenario** caused by aggressive automated failover during a 43-second network partition. This highlights the **CAP theorem trade-off**: they prioritized availability (auto-failover) but lost consistency (two primaries writing conflicting data). The fix: increase failover threshold and implement **fencing tokens** to prevent multiple primaries."

---

## 3️⃣ Facebook Outage (October 4, 2021)

### **Impact**

- **6 hours complete outage** (all Facebook, Instagram, WhatsApp down)
- **3.5 billion users** affected
- $100+ million revenue loss

### **Root Cause**

**BGP (Border Gateway Protocol) misconfiguration**

**What happened:**
```
1. Engineer runs maintenance command to check backbone capacity
2. Bug in audit tool sends invalid BGP command
3. Facebook's routers withdraw ALL BGP routes
4. DNS servers (ns1.facebook.com) become unreachable
5. Unable to log into internal systems (auth depends on DNS)
6. Physical access to data centers required (no remote access)
```

**DNS resolution failure:**
```bash
$ dig facebook.com
;; SERVFAIL  # DNS servers unreachable

$ ping ns1.facebook.com
ping: cannot resolve ns1.facebook.com: Unknown host
```

### **The Cascade**

```
BGP routes withdrawn
  ↓
DNS servers unreachable
  ↓
Internal auth systems down (depend on DNS)
  ↓
Can't log into servers remotely
  ↓
Must physically access data centers
  ↓
Physical access systems also depend on auth (circular dependency)
  ↓
6 hours to manually restore
```

### **Lessons Learned**

✅ **Test audit tools in staging:** Bug in audit tool caused outage  
✅ **Out-of-band management:** Need separate network for emergencies  
✅ **Graceful degradation:** DNS failure shouldn't block physical access  
✅ **Circuit breakers:** Prevent cascading failures  
✅ **Communication:** Ironic: couldn't use Facebook to announce Facebook was down

### **Interview Insight**

> "Facebook's 6-hour outage was caused by a **BGP misconfiguration** that withdrew all routes, making DNS servers unreachable. The key insight: **Circular dependencies are dangerous** (auth depends on DNS, DNS depends on network). They lacked **out-of-band management** (separate network for emergencies). This shows why **dependency mapping** and **redundancy** are critical."

---

## 4️⃣ Cloudflare Outage (July 2, 2019)

### **Impact**

- **27 minutes global outage**
- **50% of requests** returned 502 Bad Gateway
- Affected millions of websites

### **Root Cause**

**Regex in WAF (Web Application Firewall) caused CPU exhaustion**

**The problematic regex:**
```regex
.*(?:.*=.*){2,}  # Catastrophic backtracking
```

**Example of backtracking:**
```
Input: "x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x"
Regex engine tries billions of combinations
→ CPU usage spikes to 100%
→ All cores saturated
→ No capacity to serve requests
```

### **Timeline**

```
13:42 UTC: Deploy WAF rule with bad regex
13:42 UTC: CPU usage spikes to 100% globally
13:52 UTC: 502 errors spike to 50% of requests
14:00 UTC: Engineering team identifies regex issue
14:07 UTC: Global kill switch to disable WAF rule
14:09 UTC: Traffic recovering
14:09 UTC: Incident resolved
```

### **Lessons Learned**

✅ **Test regex complexity:** Use tools to detect catastrophic backtracking  
✅ **Canary deployments:** Roll out to 1% of servers first  
✅ **Circuit breakers:** Automatically disable rules causing CPU spikes  
✅ **Faster rollback:** Had to manually disable globally (took 27 min)

### **Interview Insight**

> "Cloudflare's outage was caused by a **regex with catastrophic backtracking** in their WAF. A single malicious request could max out CPU. The lesson: **Test regex complexity** (use tools like regex101 with debugger) and implement **canary deployments** (test on 1% of traffic first). They now have **automatic circuit breakers** that disable rules causing CPU spikes."

---

## 5️⃣ Knight Capital Trading Glitch (August 1, 2012)

### **Impact**

- **$440 million loss** in 45 minutes
- Company nearly bankrupt
- One of the most expensive software bugs in history

### **Root Cause**

**Deployed code reused an old flag, causing infinite loop**

**The bug:**
```python
# Old code (disabled):
if flag == "POWER_PEEL":  # Legacy feature (should be removed)
    # Buy/sell aggressively (testing mode)
    for stock in stocks:
        buy(stock, quantity=1000000)

# New code deployment:
# Engineer reused "POWER_PEEL" flag for new feature
# Forgot to remove old code
# On 1 server (out of 8), old code still active

# Result:
# 1 server executed old code → Bought millions of shares
# 7 servers executed new code (correct)
# In 45 minutes: 4 million trades, $7 billion notional value
```

### **What Happened**

```
8:01 AM: Knight Capital deploys new code to 8 servers
8:01 AM: Deployment fails on Server 5 (old code still running)
8:01 AM: Orders flood market (Server 5 executing old "POWER_PEEL" logic)
8:45 AM: Knight Capital realizes issue, shuts down Server 5
Result: $440 million loss, company nearly bankrupt
```

### **Lessons Learned**

✅ **Remove dead code:** Don't leave unused code paths  
✅ **Feature flags with expiry:** Auto-disable old flags  
✅ **Canary deployments:** Test on 1 server before deploying to all  
✅ **Kill switches:** Ability to instantly disable features  
✅ **Monitoring:** Alert on anomalous trading volume

### **Interview Insight**

> "Knight Capital lost **$440 million in 45 minutes** because they **reused a feature flag name** without removing old code. One server executed legacy code that bought millions of shares. The lesson: **Remove dead code**, use **feature flags with expiry**, and implement **kill switches** for instant rollback. This is why **code hygiene** matters in production."

---

## 📚 Engineering Blog Deep-Dives

---

## 🎯 Netflix: Chaos Engineering

**Blog:** [Netflix Tech Blog - Chaos Engineering](https://netflixtechblog.com/)

### **Key Insights**

**1. Chaos Monkey**

**Purpose:** Randomly terminate instances to test resilience

**Philosophy:**
```
"The best way to avoid failure is to fail constantly."
```

**Example:**
```python
# Chaos Monkey randomly kills 10% of instances daily
import random

def chaos_monkey():
    instances = get_all_instances()
    targets = random.sample(instances, len(instances) // 10)
    
    for instance in targets:
        terminate_instance(instance)
        log(f"Chaos Monkey killed {instance}")
```

**Benefits:**
- Forces teams to design for failure
- Finds weaknesses before customers do
- Builds confidence in system resilience

---

**2. Simian Army (Extended Chaos Tools)**

- **Chaos Monkey:** Kill instances
- **Chaos Gorilla:** Kill entire availability zone
- **Chaos Kong:** Kill entire region
- **Latency Monkey:** Inject latency
- **Conformity Monkey:** Shut down non-compliant instances

---

### **Interview Insight**

> "Netflix's **Chaos Engineering** involves intentionally breaking production to test resilience. **Chaos Monkey** randomly kills instances, forcing teams to design stateless services and auto-recovery. They've evolved to **Chaos Gorilla** (kill entire AZ) and **Chaos Kong** (kill entire region). The key: **Failing constantly in small ways prevents catastrophic failures**."

---

## 🎯 Uber: Schemaless (MySQL at Scale)

**Blog:** [Uber Engineering - Schemaless](https://eng.uber.com/schemaless-rewrite/)

### **Key Insights**

**Problem:** MySQL couldn't handle Uber's write throughput

**Solution:** Schemaless = MySQL sharding + blob storage

**Architecture:**
```sql
CREATE TABLE trips (
    trip_id BIGINT PRIMARY KEY,
    created_at BIGINT,
    data BLOB  -- JSON blob (all trip data)
);

-- Shard by trip_id
shard = hash(trip_id) % 4096  -- 4096 shards
```

**Benefits:**
- **10x faster writes** (no complex schema validation)
- **Schema evolution** (add fields without migrations)
- **Horizontal scaling** (add more shards)

**Trade-offs:**
- **No secondary indexes** (can't query by nested fields)
- **Application-level validation** (no DB constraints)

---

### **Interview Insight**

> "Uber built **Schemaless** because MySQL couldn't handle their write throughput (100k+ writes/sec). They store data as **JSON blobs in MySQL** (no schema validation). Benefits: 10x faster writes, easy schema evolution. Trade-off: No secondary indexes (must query by primary key). This shows **when to denormalize** and **when to build custom solutions**."

---

## 🎯 Dropbox: Migration from AWS to In-House (Magic Pocket)

**Blog:** [Dropbox Tech Blog - Magic Pocket](https://dropbox.tech/infrastructure/inside-the-magic-pocket)

### **Key Insights**

**Why migrate?**
- **Cost:** Saving $75+ million per year
- **Performance:** Optimize for Dropbox workload (block storage)
- **Control:** Fine-tune hardware and software

**Magic Pocket Architecture:**
```
Custom storage system:
  - SMR drives (Shingled Magnetic Recording) → 10TB+ per drive
  - Reed-Solomon erasure coding (90% storage efficiency)
  - Custom file system optimized for blocks
```

**Migration:**
- **500+ petabytes** moved from AWS S3 to Magic Pocket
- Zero downtime (dual-write to S3 + Magic Pocket, then cutover)
- 2+ years of engineering effort

---

### **Interview Insight**

> "Dropbox migrated **500+ PB from AWS S3 to in-house storage (Magic Pocket)**, saving $75M/year. They use **SMR drives + Reed-Solomon erasure coding** for 90% storage efficiency. The lesson: At massive scale, **custom solutions can be cheaper and faster** than public cloud. But migration took 2+ years—only worth it at scale."

---

## 🎯 Instagram: Handling 1 Billion Users

**Blog:** [Instagram Engineering - Scaling to a Billion Users](https://instagram-engineering.com/)

### **Key Insights**

**1. Database Sharding**

**Problem:** PostgreSQL couldn't handle 1B users in single database

**Solution:** Shard by user_id
```python
def get_shard(user_id):
    return user_id % 4096  # 4096 shards

# User 123 → Shard 123
# User 456 → Shard 456
```

**Benefits:**
- Linear scaling (add more shards)
- Isolated failures (one shard down ≠ all users down)

---

**2. Cassandra for Timeline**

**Why Cassandra?**
- Write-heavy (95M posts/day)
- High availability (no SPOF)
- Tunable consistency (eventual consistency OK)

**Schema:**
```cql
CREATE TABLE user_timeline (
    user_id bigint,
    post_id bigint,
    created_at timestamp,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

---

**3. Redis for Caching**

**Cache layers:**
- **User profiles:** 1-hour TTL
- **Post metadata:** 5-minute TTL
- **Timeline (top 100 posts):** 1-minute TTL

**Result:** 90%+ cache hit rate

---

### **Interview Insight**

> "Instagram shards PostgreSQL by **user_id % 4096** for linear scaling. They use **Cassandra for timelines** (write-heavy, eventual consistency OK) and **Redis for caching** (90%+ hit rate). The key: **Choose the right database for each use case** (Postgres for users, Cassandra for feeds, Redis for cache)."

---

## 📚 Essential Engineering Blogs

| Company      | Blog URL                                  | Key Topics                              |
|--------------|-------------------------------------------|-----------------------------------------|
| Netflix      | netflixtechblog.com                       | Chaos Engineering, Microservices, CDN   |
| Uber         | eng.uber.com                              | Schemaless, Real-time, Geospatial       |
| Airbnb       | airbnb.io                                 | Data Infrastructure, ML, Payments       |
| Dropbox      | dropbox.tech                              | Storage, Sync, Infrastructure           |
| Instagram    | instagram-engineering.com                 | Scaling, Databases, Feed Ranking        |
| Twitter      | blog.twitter.com/engineering              | Timeline, Search, Real-time             |
| LinkedIn     | engineering.linkedin.com                  | Kafka, Graph, Data Pipelines            |
| Stripe       | stripe.com/blog/engineering               | Payments, API Design, Reliability       |
| GitHub       | github.blog/category/engineering          | Git, Databases, Scaling                 |
| Discord      | discord.com/category/engineering          | Real-time, Voice, Low-latency           |

---

## 🎓 Interview Strategy: Using Postmortems

**When to mention postmortems:**

1. **Discussing failure scenarios:**
   > "This reminds me of Facebook's 2021 outage where a BGP misconfiguration..."

2. **Explaining trade-offs:**
   > "GitHub learned from their 2018 split-brain incident that consistency > availability..."

3. **Justifying design choices:**
   > "Like Cloudflare's regex outage, we need to test complex regex in staging..."

4. **Showing production experience:**
   > "I've read Netflix's Chaos Engineering blog—they intentionally break production to..."

**Sample Answer:**

> "I'd design this with **circuit breakers** to prevent cascading failures—similar to how Cloudflare handles WAF rules after their 2019 regex outage. If a component starts failing, we automatically disable it rather than bringing down the entire system. I'd also implement **canary deployments** (test on 1% of traffic first) to catch issues before full rollout, which could have prevented Knight Capital's $440M loss."

---

## 📝 Summary

**Key Outages:**
- **AWS S3 (2017):** Human error (typo), lesson: improve tooling
- **GitHub (2018):** Split-brain, lesson: fencing tokens, consistency over availability
- **Facebook (2021):** BGP misconfiguration, lesson: out-of-band management
- **Cloudflare (2019):** Catastrophic regex backtracking, lesson: test complexity, canary deploys
- **Knight Capital (2012):** Reused feature flag, lesson: remove dead code, kill switches

**Key Engineering Blogs:**
- **Netflix:** Chaos Engineering (Chaos Monkey, Simian Army)
- **Uber:** Schemaless (MySQL sharding + blob storage)
- **Dropbox:** Magic Pocket (500+ PB migration, $75M savings)
- **Instagram:** Scaling to 1B users (sharding, Cassandra, Redis)

**Interview Takeaway:** Reference real-world failures and lessons to show **production experience** and **mature judgment** 🚀

