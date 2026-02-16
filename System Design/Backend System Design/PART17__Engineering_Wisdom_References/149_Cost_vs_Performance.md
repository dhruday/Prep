# 149. Cost vs Performance Decisions (Engineering Economics)

## 📌 Purpose

**At scale, cost matters as much as performance.** Senior engineers must balance technical excellence with financial reality. This document covers cost optimization strategies without sacrificing reliability.

---

## 💰 Cost Structure of Distributed Systems

### **Typical Cost Breakdown (Cloud-Native App)**

```
Monthly cloud bill: $1,000,000

Breakdown:
  - Compute (EC2, Kubernetes): $400,000 (40%)
  - Storage (S3, EBS): $250,000 (25%)
  - Database (RDS, DynamoDB): $200,000 (20%)
  - Network (data transfer, load balancer): $100,000 (10%)
  - Other (monitoring, backups): $50,000 (5%)
```

**Key insight:** Most cost is compute + storage (65%)

---

## 1️⃣ Compute Optimization

---

### **Strategy 1: Right-Sizing Instances**

**Problem:** Over-provisioned instances waste money

**Example:**
```
Current: 100 × m5.2xlarge (8 vCPU, 32 GB RAM) @ $0.384/hour
  - CPU utilization: 20% (underutilized)
  - Cost: $28,032/month

Optimized: 50 × m5.xlarge (4 vCPU, 16 GB RAM) @ $0.192/hour
  - CPU utilization: 40% (right-sized)
  - Cost: $7,008/month

Savings: $21,024/month (75% reduction)
```

**Trade-off:**
- **Pro:** Massive cost savings
- **Con:** Less headroom for traffic spikes (must auto-scale faster)

**Interview insight:**
> "I'd monitor **P99 CPU and memory usage** over 30 days. If consistently below 50%, I'd right-size instances. I'd enable **auto-scaling** to handle spikes. The key: **Don't over-provision for peak traffic 24/7**—scale dynamically."

---

### **Strategy 2: Spot Instances (80% Cheaper)**

**Problem:** On-demand instances expensive for non-critical workloads

**Example:**
```
Batch processing job (image thumbnails, ML training):
  - On-demand: 10 × c5.4xlarge @ $0.68/hour = $4,896/month
  - Spot instances: 10 × c5.4xlarge @ $0.14/hour = $1,008/month
  - Savings: $3,888/month (80% reduction)
```

**Trade-off:**
- **Pro:** 50-90% cost savings
- **Con:** Can be terminated anytime (handle interruptions gracefully)

**When to use:**
- Batch jobs (can retry)
- ML training (checkpoint progress)
- Dev/test environments

**When NOT to use:**
- Databases (data loss risk)
- User-facing APIs (availability impact)

**Interview insight:**
> "I'd use **spot instances for stateless, fault-tolerant workloads** like batch processing. I'd implement **checkpointing** (save progress every 5 minutes) and **retry logic** (handle spot terminations). For critical services, I'd stick with on-demand instances—reliability matters more than cost."

---

### **Strategy 3: Reserved Instances (40-60% Cheaper)**

**Problem:** Predictable baseline workload pays on-demand prices

**Example:**
```
Always need 50 instances (baseline):
  - On-demand: 50 × m5.large @ $0.096/hour = $3,456/month
  - 1-year reserved: 50 × m5.large @ $0.058/hour = $2,088/month
  - Savings: $1,368/month (40% reduction)
```

**Strategy:**
```
Baseline (50 instances): Reserved instances (40% discount)
Peak traffic (50-100 instances): On-demand/spot instances
```

**Trade-off:**
- **Pro:** Significant savings for predictable workload
- **Con:** Upfront commitment (less flexibility)

**Interview insight:**
> "I'd analyze **30-day minimum instance count**. If consistently need 50+ instances, I'd buy reserved instances for baseline and use on-demand for peaks. This balances **cost (40% savings) with flexibility** (scale up for traffic spikes)."

---

## 2️⃣ Storage Optimization

---

### **Strategy 1: Tiered Storage (S3 Lifecycle Policies)**

**Problem:** Storing all data in S3 Standard (expensive)

**Example:**
```
1 PB of images:
  - S3 Standard: $23,000/month
  
Optimized with lifecycle policies:
  - Hot data (last 30 days): 100 TB in S3 Standard = $2,300/month
  - Warm data (30-90 days): 200 TB in S3 IA = $2,500/month
  - Cold data (90+ days): 700 TB in S3 Glacier = $2,800/month
  - Total: $7,600/month

Savings: $15,400/month (67% reduction)
```

**S3 Storage Classes:**

| Class | Use Case | Cost (per GB/month) | Retrieval Time |
|-------|----------|---------------------|----------------|
| S3 Standard | Hot data (accessed frequently) | $0.023 | Instant |
| S3 IA (Infrequent Access) | Warm data (accessed monthly) | $0.0125 | Instant |
| S3 Glacier | Cold data (accessed rarely) | $0.004 | 1-5 minutes |
| S3 Glacier Deep Archive | Archive (accessed once/year) | $0.00099 | 12 hours |

**Lifecycle policy:**
```json
{
  "Rules": [
    {
      "Id": "Move to IA after 30 days",
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ]
    }
  ]
}
```

**Interview insight:**
> "I'd implement **S3 lifecycle policies** to automatically transition data to cheaper storage tiers. For example, user uploads (hot for 30 days) → S3 Standard, then auto-move to S3 IA (67% cheaper) after 30 days. This balances **cost (67% savings) with access patterns** (most users access recent data)."

---

### **Strategy 2: Compression (10x Reduction)**

**Problem:** Storing uncompressed logs/data

**Example:**
```
Logs: 1 TB/day uncompressed
  - Uncompressed: 1 TB × $0.023/GB = $700/month
  - Gzip compressed (10x): 100 GB × $0.023/GB = $70/month
  - Savings: $630/month (90% reduction)
```

**Trade-off:**
- **Pro:** 10x storage savings
- **Con:** CPU cost (compress/decompress), slower queries

**When to use:**
- Logs (compress before upload)
- Backups (compress archives)
- Infrequently accessed data

**Interview insight:**
> "I'd **compress logs before uploading to S3**. Tools like gzip or zstd achieve 10x compression. The CPU cost is negligible compared to storage savings. For frequently queried data (analytics), I'd use columnar formats like **Parquet** (built-in compression + fast queries)."

---

### **Strategy 3: Data Retention Policies**

**Problem:** Storing data indefinitely

**Example:**
```
Logs stored forever:
  - 1 TB/day × 365 days × $0.023/GB = $8,395/year

With retention policy (90 days):
  - 1 TB/day × 90 days × $0.023/GB = $2,070/year
  - Savings: $6,325/year (75% reduction)
```

**Implementation:**
```python
# S3 lifecycle policy: Delete after 90 days
{
  "Rules": [
    {
      "Id": "Delete logs after 90 days",
      "Status": "Enabled",
      "Expiration": {"Days": 90}
    }
  ]
}
```

**Trade-off:**
- **Pro:** Massive savings (75%)
- **Con:** Can't analyze old data (compliance risk)

**Best practice:**
- **Hot logs (30 days):** S3 Standard (fast queries)
- **Warm logs (30-90 days):** S3 IA (occasional queries)
- **Cold logs (90+ days):** Glacier or delete (compliance only)

**Interview insight:**
> "I'd define **data retention based on business needs**. For example, keep transaction logs for 7 years (compliance), application logs for 90 days (debugging), and metrics for 30 days (monitoring). I'd auto-delete expired data with **S3 lifecycle policies** to avoid paying for unused storage."

---

## 3️⃣ Database Optimization

---

### **Strategy 1: Read Replicas (Scale Reads Cheaply)**

**Problem:** Database can't handle read traffic

**Expensive solution:** Upgrade to larger instance ($$$)

**Cheap solution:** Add read replicas ($)

**Example:**
```
Current: 1 × db.r5.8xlarge (32 vCPU, 256 GB) @ $3.84/hour
  - Read QPS: 10,000 (maxed out)
  - Cost: $2,765/month

Optimized: 1 × db.r5.4xlarge (16 vCPU, 128 GB) @ $1.92/hour (primary)
           + 3 × db.r5.2xlarge (8 vCPU, 64 GB) @ $0.96/hour (read replicas)
  - Read QPS: 40,000 (10k per replica)
  - Cost: $1,382 + $2,074 = $3,456/month

Result: 4x read capacity, 25% higher cost (vs 2x cost for vertical scaling)
```

**Trade-off:**
- **Pro:** Horizontal scaling (linear cost increase)
- **Con:** Replication lag (eventual consistency)

**Interview insight:**
> "For read-heavy workloads (90% reads, 10% writes), I'd use **read replicas** instead of vertical scaling. I'd route reads to replicas and writes to primary. The replication lag is typically <1 second, acceptable for most use cases. This scales reads **linearly with cost** (add more replicas as needed)."

---

### **Strategy 2: DynamoDB On-Demand vs Provisioned**

**Problem:** Provisioned capacity underutilized

**Example:**
```
Provisioned capacity:
  - 1000 WCU (write capacity units) × $0.00065/hour = $468/month
  - 1000 RCU (read capacity units) × $0.00013/hour = $94/month
  - Total: $562/month
  - Actual usage: 30% (paying for unused capacity)

On-demand pricing:
  - Pay per request (no provisioning)
  - 100M writes/month × $1.25/million = $125/month
  - 500M reads/month × $0.25/million = $125/month
  - Total: $250/month

Savings: $312/month (55% reduction)
```

**When to use each:**

| Pattern | Choose | Reason |
|---------|--------|--------|
| Predictable traffic (steady load) | Provisioned | 40-60% cheaper |
| Unpredictable traffic (spiky) | On-demand | Pay only for usage |
| Dev/test environments (low usage) | On-demand | No wasted capacity |

**Interview insight:**
> "I'd use **DynamoDB on-demand** for unpredictable workloads (e.g., new feature, unknown usage). Once traffic stabilizes, I'd switch to **provisioned capacity** (40-60% cheaper). I'd monitor utilization and adjust provisioned capacity monthly to avoid over-provisioning."

---

### **Strategy 3: Cold Storage (Archival DBs)**

**Problem:** Querying years of old data in production DB

**Example:**
```
PostgreSQL storing 5 years of data:
  - db.r5.4xlarge (16 vCPU, 128 GB) @ $1.92/hour
  - 5 TB storage @ $0.115/GB/month = $575/month
  - Total: $2,265/month

Optimized (archive old data):
  - PostgreSQL (last 1 year): db.r5.2xlarge @ $0.96/hour + 1 TB = $813/month
  - S3 Glacier (years 2-5): 4 TB @ $0.004/GB/month = $16/month
  - Total: $829/month

Savings: $1,436/month (63% reduction)
```

**Strategy:**
```
1. Identify old data (accessed <1 time/month)
2. Export to S3 Glacier (Parquet format for queries)
3. Use Athena for rare queries on archived data ($5/TB scanned)
4. Delete from production DB
```

**Interview insight:**
> "I'd **archive old data to S3 Glacier** and use **AWS Athena** for occasional queries. For example, keep last 1 year in PostgreSQL (fast queries) and move older data to S3 (99% cheaper). This keeps production DB small and fast while retaining historical data for compliance."

---

## 4️⃣ Network Optimization

---

### **Strategy 1: Use CDN (Reduce Data Transfer Costs)**

**Problem:** Serving assets from origin (expensive data transfer)

**Example:**
```
Serving 10 TB/month of images from EC2:
  - Data transfer out: 10 TB × $0.09/GB = $900/month

With CloudFront CDN:
  - Data transfer out (origin → CDN): 2 TB × $0.09/GB = $180/month (80% cache hit)
  - CDN data transfer out: 10 TB × $0.085/GB = $850/month
  - Total: $1,030/month

Wait, more expensive?!

Actually:
  - CloudFront regional edge caching reduces origin load
  - Faster for users (lower latency)
  - True savings: Reduced EC2 instance count (less load) = $500/month saved
```

**Benefits:**
- Lower origin load (smaller instances)
- Faster for users (cached at edge)
- DDoS protection (AWS Shield)

**Interview insight:**
> "I'd use a **CDN like CloudFront** for static assets (images, videos, CSS/JS). While per-GB cost is similar, the **reduced origin load** means smaller/fewer instances, saving money overall. Plus, users get **faster load times** (<100ms from edge vs 200ms from origin)."

---

### **Strategy 2: VPC Peering (Avoid Data Transfer Charges)**

**Problem:** Cross-region data transfer expensive

**Example:**
```
Microservices in different regions:
  - US-East (API) → US-West (database): 1 TB/month × $0.02/GB = $20/month

With VPC peering (same region):
  - US-East (API + database): 1 TB/month × $0 = $0/month

Savings: $20/month
```

**Strategy:**
```
Co-locate services that communicate frequently
  - API + Database: Same region (free data transfer)
  - API + User: Use CDN (minimize origin calls)
```

**Interview insight:**
> "I'd **co-locate services that communicate frequently** (e.g., API + database in same region) to avoid cross-region data transfer charges ($0.02/GB). For user traffic, I'd use a CDN to serve from the nearest edge location."

---

## 5️⃣ Observability Optimization

---

### **Strategy: Reduce Log Volume (Sample Logs)**

**Problem:** Logging every request (expensive)

**Example:**
```
Logging 1 billion requests/day:
  - 1B requests × 1 KB/log = 1 TB/day
  - CloudWatch Logs: 1 TB × $0.50/GB = $500/day = $15,000/month

Optimized (sample 10% of requests):
  - 100M requests × 1 KB = 100 GB/day
  - Cost: 100 GB × $0.50/GB = $50/day = $1,500/month

Savings: $13,500/month (90% reduction)
```

**Strategy:**
```
1. Log all errors (always)
2. Sample 10% of successful requests (sufficient for debugging)
3. Log 100% of high-value transactions (payments, signups)
```

**Implementation:**
```python
import random

def log_request(request, response):
    # Always log errors
    if response.status_code >= 400:
        logger.error(f"Request failed: {request.url}")
        return
    
    # Sample 10% of successful requests
    if random.random() < 0.1:
        logger.info(f"Request succeeded: {request.url}")
```

**Interview insight:**
> "I'd implement **log sampling** (10% of successful requests, 100% of errors). This reduces log volume by 90% while retaining enough data for debugging. For critical flows (payments), I'd log 100% to ensure auditability."

---

## 6️⃣ Cost Monitoring & Alerting

---

### **Strategy: Set Budget Alerts**

**Problem:** Runaway costs (e.g., forgotten instances)

**Solution:** AWS Budgets (alert when cost exceeds threshold)

**Example:**
```
Set budget: $10,000/month
Alert at 80%: $8,000/month (email + Slack notification)
Alert at 100%: $10,000/month (page on-call engineer)
```

**Implementation:**
```bash
# AWS CLI: Create budget
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**Interview insight:**
> "I'd set up **budget alerts** (e.g., alert at 80% of monthly budget). This catches runaway costs early (e.g., forgotten EC2 instances, DDoS attack). I'd also implement **cost tagging** (tag resources by team/project) to identify high-spend areas."

---

## 📊 Cost Optimization Checklist

| Strategy | Savings | Effort | Risk |
|----------|---------|--------|------|
| Right-size instances | 50-70% | Low | Low (monitor utilization) |
| Spot instances (batch jobs) | 50-90% | Medium | Low (handle interruptions) |
| Reserved instances (baseline) | 40-60% | Low | Medium (upfront commitment) |
| S3 lifecycle policies | 60-80% | Low | Low (automate tiering) |
| Compression (logs, backups) | 90% | Low | Low (minimal CPU cost) |
| Data retention policies | 70-80% | Low | Medium (compliance check) |
| Read replicas (vs vertical scaling) | 50% | Medium | Low (handle replication lag) |
| DynamoDB on-demand (vs provisioned) | 40-60% | Low | Low (switch based on usage) |
| Archive old data (S3 Glacier) | 60-70% | Medium | Low (Athena for queries) |
| CDN (CloudFront) | 30-50% | Medium | Low (reduced origin load) |
| Log sampling | 80-90% | Low | Low (sample, don't drop) |

---

## 🎓 Interview Strategy

**When discussing cost:**

1. **Show awareness:**
   > "At scale, cost matters. A 10% reduction at $10M/month = $1M/year saved."

2. **Balance cost vs reliability:**
   > "I'd never sacrifice reliability for cost. But there's always optimization without compromise."

3. **Quantify savings:**
   > "By right-sizing instances, we'd save $20k/month (70% reduction)."

4. **Discuss trade-offs:**
   > "Spot instances save 80% but can be terminated. I'd use them only for fault-tolerant workloads."

5. **Show production experience:**
   > "In my previous role, I reduced S3 costs by 65% using lifecycle policies..."

**Sample Answer:**

**Interviewer:** "Your cloud bill is $500k/month. How do you optimize?"

**Good Answer:**
> "I'd start with the **biggest cost drivers** (compute + storage = 65% of bill):
>
> **1. Compute optimization (40% of bill = $200k):**
> - Right-size instances (monitor P99 CPU, target 60% utilization) → Save 50% = $100k
> - Use spot instances for batch jobs (ML training, image processing) → Save 80% on those workloads = $20k
> - Buy reserved instances for baseline (50 instances always needed) → Save 40% = $30k
> - **Total compute savings: $150k/month (75% reduction)**
>
> **2. Storage optimization (25% of bill = $125k):**
> - S3 lifecycle policies (hot data < 30 days, archive rest to Glacier) → Save 60% = $75k
> - Compression (gzip logs before upload) → Save 90% on logs = $10k
> - Data retention policies (delete logs after 90 days) → Save 30% = $10k
> - **Total storage savings: $95k/month (76% reduction)**
>
> **Total savings: $245k/month (49% reduction)**
>
> **Trade-offs:**
> - Spot instances: Can be terminated (add retry logic)
> - Lifecycle policies: Glacier retrieval takes 1-5 min (acceptable for cold data)
> - Right-sizing: Less headroom (enable auto-scaling)
>
> I'd implement these over 3 months, measuring impact monthly. I'd never sacrifice reliability for cost—if a service needs larger instances for SLA compliance, I'd keep them."

🚀

