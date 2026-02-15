# 25. Cost Awareness & Optimization

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Cost Awareness & Optimization** is the practice of designing and operating systems with explicit consideration of infrastructure costs, ensuring efficient resource utilization without compromising performance or reliability.

### What It Is
Cost-aware system design involves:
- **Understanding cost drivers**: What makes cloud bills expensive
- **Right-sizing resources**: Not over-provisioning
- **Choosing appropriate tiers**: Matching service levels to requirements
- **Optimizing architecture**: Design patterns that reduce costs

### Why It Exists
Cloud costs can spiral quickly:
- **Startups** have been killed by unexpected cloud bills
- **Enterprises** spend millions on unused resources
- **Engineers** often don't see the cost impact of their decisions

### The Problem It Solves
Without cost awareness:
- **Over-provisioning**: 50-70% of cloud resources are underutilized
- **Wrong service selection**: Using expensive services for simple tasks
- **Hidden costs**: Egress, API calls, premium features add up
- **No accountability**: Teams don't know their cost impact

### Where and When It's Used
- **System design interviews**: Trade-off discussions
- **Architecture reviews**: Cost impact analysis
- **FinOps practices**: Continuous cost optimization
- **Capacity planning**: Budget forecasting

### Its Role in Large-Scale Distributed Systems
At FAANG scale:
- **Netflix**: Open Connect CDN saves $1B+/year vs. commercial CDN
- **Dropbox**: Moving from AWS to own infrastructure saved $75M over 2 years
- **Pinterest**: Optimized ML infrastructure reduced costs by 40%

Cost optimization is a **competitive advantage**.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Cloud Cost Components

```
┌─────────────────────────────────────────────────────────────────────┐
│              CLOUD COST BREAKDOWN                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TYPICAL CLOUD BILL COMPOSITION:                                    │
│  ─────────────────────────────────                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   Compute (40-50%)                                          │   │
│  │   ████████████████████████████████████████                  │   │
│  │   • EC2/VMs                                                 │   │
│  │   • Containers (EKS, ECS)                                   │   │
│  │   • Serverless (Lambda)                                     │   │
│  │                                                              │   │
│  │   Storage (15-25%)                                          │   │
│  │   ████████████████████                                      │   │
│  │   • Block storage (EBS)                                     │   │
│  │   • Object storage (S3)                                     │   │
│  │   • Databases (RDS, DynamoDB)                               │   │
│  │                                                              │   │
│  │   Data Transfer (10-20%)                                    │   │
│  │   ████████████████                                          │   │
│  │   • Egress (OUT of cloud)                                   │   │
│  │   • Cross-region transfer                                   │   │
│  │   • CDN egress                                              │   │
│  │                                                              │   │
│  │   Managed Services (10-20%)                                 │   │
│  │   ████████████████                                          │   │
│  │   • Managed databases                                       │   │
│  │   • Search (Elasticsearch)                                  │   │
│  │   • Message queues                                          │   │
│  │                                                              │   │
│  │   Other (5-10%)                                             │   │
│  │   ████████                                                  │   │
│  │   • Load balancers                                          │   │
│  │   • DNS, monitoring                                         │   │
│  │   • Support plans                                           │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  HIDDEN COSTS (Often Surprising):                                   │
│  ─────────────────────────────────                                  │
│  • NAT Gateway: $0.045/GB + $0.045/hour                           │
│  • Cross-AZ traffic: $0.01/GB (each way!)                         │
│  • API Gateway: $3.50/million requests                            │
│  • CloudWatch Logs: $0.50/GB ingestion                            │
│  • Elastic IPs (unused): $3.60/month                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cost by Service Tier

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMPUTE PRICING TIERS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  EC2 PRICING MODELS (Example: m5.xlarge - 4 vCPU, 16GB):           │
│  ────────────────────────────────────────────────────────           │
│                                                                      │
│  │ Model           │ Price/hour │ Monthly  │ Savings │ Commitment│ │
│  │─────────────────│────────────│──────────│─────────│───────────│ │
│  │ On-Demand       │ $0.192     │ $140     │ 0%      │ None      │ │
│  │ 1-yr Reserved   │ $0.121     │ $88      │ 37%     │ 1 year    │ │
│  │ 3-yr Reserved   │ $0.081     │ $59      │ 58%     │ 3 years   │ │
│  │ Spot            │ $0.058     │ $42      │ 70%     │ None*     │ │
│  │ Savings Plan    │ $0.115     │ $84      │ 40%     │ 1-3 years │ │
│  │                 │            │          │         │           │ │
│  │ *Spot: Can be interrupted with 2-min notice                   │ │
│                                                                      │
│  WHEN TO USE EACH:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  ON-DEMAND:                                                          │
│  • Development/testing                                              │
│  • Unpredictable workloads                                         │
│  • Short-term projects                                             │
│  • Burst capacity                                                   │
│                                                                      │
│  RESERVED/SAVINGS PLANS:                                             │
│  • Stable baseline workloads                                       │
│  • Production databases                                            │
│  • Core application servers                                        │
│  • 24/7 services                                                   │
│                                                                      │
│  SPOT:                                                               │
│  • Batch processing                                                 │
│  • CI/CD pipelines                                                 │
│  • Stateless workers                                               │
│  • Development environments                                        │
│  • Big data processing                                             │
│                                                                      │
│  EXAMPLE SAVINGS:                                                    │
│  ─────────────────                                                  │
│  100 servers × $140/month = $14,000/month (On-Demand)              │
│                                                                      │
│  Optimized mix:                                                     │
│  • 30 Reserved (3yr): 30 × $59 = $1,770                           │
│  • 40 Savings Plan: 40 × $84 = $3,360                             │
│  • 20 On-Demand: 20 × $140 = $2,800                               │
│  • 10 Spot: 10 × $42 = $420                                        │
│  Total: $8,350/month (40% savings)                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Cost Optimization

```
┌─────────────────────────────────────────────────────────────────────┐
│              STORAGE COST TIERS                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  S3 STORAGE CLASSES:                                                 │
│  ────────────────────                                               │
│                                                                      │
│  │ Class               │ $/GB/Mo │ Retrieval │ Use Case           │ │
│  │─────────────────────│─────────│───────────│────────────────────│ │
│  │ Standard            │ $0.023  │ Instant   │ Frequently accessed│ │
│  │ Intelligent-Tier    │ $0.023  │ Instant   │ Unknown patterns   │ │
│  │ Standard-IA         │ $0.0125 │ Instant   │ Infrequent access  │ │
│  │ One Zone-IA         │ $0.01   │ Instant   │ Reproducible data  │ │
│  │ Glacier Instant     │ $0.004  │ Instant   │ Archive, fast need │ │
│  │ Glacier Flexible    │ $0.0036 │ Min-Hours │ Archive            │ │
│  │ Glacier Deep        │ $0.00099│ Hours     │ Long-term archive  │ │
│                                                                      │
│  COST EXAMPLE (100 TB):                                              │
│  ──────────────────────                                             │
│                                                                      │
│  All Standard: 100 TB × $0.023 = $2,300/month                      │
│                                                                      │
│  Tiered strategy:                                                   │
│  • 20 TB Standard (hot): 20 × $0.023 = $460                        │
│  • 30 TB Standard-IA: 30 × $0.0125 = $375                          │
│  • 30 TB Glacier Instant: 30 × $0.004 = $120                       │
│  • 20 TB Glacier Deep: 20 × $0.00099 = $20                         │
│  Total: $975/month (58% savings)                                   │
│                                                                      │
│  LIFECYCLE POLICIES:                                                 │
│  ────────────────────                                               │
│                                                                      │
│  {                                                                   │
│    "Rules": [{                                                       │
│      "ID": "ArchiveOldData",                                        │
│      "Status": "Enabled",                                            │
│      "Transitions": [                                                │
│        {"Days": 30, "StorageClass": "STANDARD_IA"},                │
│        {"Days": 90, "StorageClass": "GLACIER_IR"},                 │
│        {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}               │
│      ],                                                              │
│      "Expiration": {"Days": 2555}                                   │
│    }]                                                                │
│  }                                                                   │
│                                                                      │
│  DATABASE STORAGE:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  │ Service         │ Storage/GB │ IOPS Cost     │ Notes           │ │
│  │─────────────────│────────────│───────────────│─────────────────│ │
│  │ RDS (gp3)       │ $0.115     │ Free (3K IOPS)│ Standard        │ │
│  │ RDS (io1)       │ $0.125     │ $0.065/IOPS   │ High performance│ │
│  │ Aurora          │ $0.10      │ Included      │ Serverless opts │ │
│  │ DynamoDB        │ $0.25      │ Pay per R/W   │ Serverless      │ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Transfer Costs

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATA TRANSFER (THE HIDDEN KILLER)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AWS DATA TRANSFER PRICING:                                          │
│  ────────────────────────────                                       │
│                                                                      │
│  │ Transfer Type                │ Cost/GB  │ Notes               │ │
│  │──────────────────────────────│──────────│─────────────────────│ │
│  │ IN to AWS                    │ $0.00    │ Free ingress        │ │
│  │ OUT to Internet (first 10TB) │ $0.09    │ Expensive!          │ │
│  │ OUT to Internet (10-50TB)    │ $0.085   │ Volume discount     │ │
│  │ OUT via CloudFront           │ $0.02    │ CDN is cheaper      │ │
│  │ Same AZ (private IP)         │ $0.00    │ Free                │ │
│  │ Cross-AZ (same region)       │ $0.01    │ Each direction!     │ │
│  │ Cross-region                 │ $0.02    │ Replication cost    │ │
│  │ VPC Peering (same region)    │ $0.01    │ Each direction      │ │
│  │ NAT Gateway                  │ $0.045   │ Plus $0.045/hr      │ │
│  │ VPC Endpoints (interface)    │ $0.01    │ Per AZ, per hour    │ │
│                                                                      │
│  COST TRAP EXAMPLES:                                                 │
│  ────────────────────                                               │
│                                                                      │
│  1. Cross-AZ Database Traffic:                                     │
│     App in AZ-A, DB in AZ-B                                        │
│     100K QPS × 5 KB response × 86400 sec = 43 TB/day               │
│     Cost: 43 TB × $0.02 = $860/day = $25,800/month!               │
│                                                                      │
│     Solution: Read replica in same AZ                              │
│                                                                      │
│  2. NAT Gateway Overuse:                                           │
│     All traffic through NAT to reach AWS services                  │
│     10 TB/month × $0.045 = $450 + $32 hourly = $482/month         │
│                                                                      │
│     Solution: VPC Endpoints for S3, DynamoDB (free)               │
│                                                                      │
│  3. Direct Egress Instead of CDN:                                  │
│     100 TB/month direct egress: 100 × $0.085 = $8,500             │
│     Via CloudFront: 100 × $0.02 = $2,000                          │
│     Savings: $6,500/month                                          │
│                                                                      │
│  OPTIMIZATION STRATEGIES:                                            │
│  ─────────────────────────                                          │
│                                                                      │
│  1. Keep traffic in same AZ when possible                          │
│  2. Use VPC Endpoints for AWS services                             │
│  3. Use CDN for egress (60-80% cheaper)                           │
│  4. Compress data before transfer                                  │
│  5. Cache to reduce repeated transfers                             │
│  6. Use private connectivity (Direct Connect) for high volume     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Cost-Aware Architecture Patterns
## ────────────────────────────────────

### Right-Sizing Resources

```
┌─────────────────────────────────────────────────────────────────────┐
│              RIGHT-SIZING METHODOLOGY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: MEASURE ACTUAL UTILIZATION                                 │
│  ───────────────────────────────────                                │
│                                                                      │
│  Collect metrics for 2-4 weeks:                                    │
│  • CPU utilization (avg, max, P95)                                 │
│  • Memory utilization                                              │
│  • Network I/O                                                      │
│  • Disk I/O                                                         │
│                                                                      │
│  STEP 2: IDENTIFY OVER-PROVISIONED RESOURCES                       │
│  ────────────────────────────────────────────                       │
│                                                                      │
│  │ Current      │ CPU Avg │ CPU Max │ Recommendation         │    │
│  │──────────────│─────────│─────────│────────────────────────│    │
│  │ m5.2xlarge   │ 15%     │ 40%     │ Downsize to m5.large   │    │
│  │ r5.4xlarge   │ 25%     │ 55%     │ Downsize to r5.2xlarge │    │
│  │ c5.xlarge    │ 75%     │ 95%     │ Keep or upgrade        │    │
│                                                                      │
│  STEP 3: CONSIDER INSTANCE FAMILY                                   │
│  ─────────────────────────────────                                  │
│                                                                      │
│  │ Family │ Optimized For     │ Use Case                  │       │
│  │────────│───────────────────│───────────────────────────│       │
│  │ M      │ General purpose   │ Web servers, apps         │       │
│  │ C      │ Compute           │ CPU-heavy processing      │       │
│  │ R      │ Memory            │ In-memory databases       │       │
│  │ I      │ Storage           │ Data warehouses           │       │
│  │ T      │ Burstable         │ Dev, low-traffic sites    │       │
│  │ G      │ GPU               │ ML training               │       │
│                                                                      │
│  Common mistake: Using M instances when C or T would be cheaper    │
│                                                                      │
│  STEP 4: RIGHT-SIZE REGULARLY                                       │
│  ─────────────────────────────                                      │
│                                                                      │
│  • Monthly: Review top 20% of spend                                │
│  • Quarterly: Full infrastructure review                           │
│  • After launches: Traffic patterns change                         │
│                                                                      │
│  TOOLS:                                                              │
│  ──────                                                             │
│  • AWS Compute Optimizer                                           │
│  • Cost Explorer (right-sizing recommendations)                   │
│  • Spot.io, CloudHealth, Datadog Cloud Cost                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Serverless vs. Containers vs. VMs

```
┌─────────────────────────────────────────────────────────────────────┐
│              COMPUTE MODEL COST COMPARISON                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  COST STRUCTURE:                                                     │
│  ────────────────                                                   │
│                                                                      │
│  VMs (EC2):                                                         │
│  • Pay per hour (regardless of utilization)                        │
│  • Cheapest at high, consistent utilization                        │
│  • Requires capacity planning                                      │
│                                                                      │
│  Containers (EKS/ECS):                                              │
│  • Pay for underlying VMs + management overhead                    │
│  • Better bin-packing = higher utilization                        │
│  • Fargate: Pay per vCPU-second, memory-GB-second                 │
│                                                                      │
│  Serverless (Lambda):                                               │
│  • Pay per invocation + duration                                   │
│  • No cost when idle                                               │
│  • Expensive at high sustained load                                │
│                                                                      │
│  BREAK-EVEN ANALYSIS:                                                │
│  ─────────────────────                                              │
│                                                                      │
│  Cost                                                               │
│  ▲                                                                  │
│  │           EC2                                                    │
│  │    ──────────────────────────────                               │
│  │   ╱                                                              │
│  │  ╱     Lambda                                                   │
│  │ ╱                                                                │
│  │╱                                                                 │
│  └──────────────────────────────────────────────▶ Requests/sec     │
│    │      │                                                         │
│  Low     Break-even                                                │
│  traffic (~10K req/sec)                                            │
│                                                                      │
│  DECISION MATRIX:                                                    │
│  ─────────────────                                                  │
│                                                                      │
│  │ Scenario                  │ Best Option   │ Why                │ │
│  │───────────────────────────│───────────────│────────────────────│ │
│  │ < 1M requests/month       │ Lambda        │ Pay only when used │ │
│  │ Spiky traffic (10x peaks) │ Lambda/Fargate│ Auto-scale, no idle│ │
│  │ Consistent high load      │ EC2 Reserved  │ Lowest unit cost   │ │
│  │ Batch processing          │ Spot + EC2    │ Cheapest compute   │ │
│  │ Complex orchestration     │ EKS/ECS       │ Kubernetes benefits│ │
│                                                                      │
│  LAMBDA COST EXAMPLE:                                                │
│  ─────────────────────                                              │
│                                                                      │
│  100M requests/month                                               │
│  128 MB memory, 100ms duration                                     │
│                                                                      │
│  Requests: 100M × $0.20/million = $20                             │
│  Duration: 100M × 0.1s × 0.125GB × $0.0000166667/GB-s             │
│          = $20.83                                                   │
│  Total: ~$41/month                                                  │
│                                                                      │
│  Equivalent EC2 (t3.micro always on):                              │
│  $0.0104/hr × 720 hours = $7.49/month                              │
│                                                                      │
│  But! EC2 can only handle ~1000 req/sec = 2.6B/month              │
│  For 100M requests with variable traffic, Lambda wins             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Region Cost Considerations

```
┌─────────────────────────────────────────────────────────────────────┐
│              MULTI-REGION COST IMPACT                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ADDED COSTS OF MULTI-REGION:                                       │
│  ─────────────────────────────                                      │
│                                                                      │
│  1. Duplicate Infrastructure                                        │
│     • 2x-3x compute costs                                          │
│     • 2x-3x managed service costs                                  │
│                                                                      │
│  2. Data Replication                                                │
│     • Cross-region transfer: $0.02/GB                              │
│     • 1 TB/day × $0.02 × 30 = $600/month per region pair          │
│                                                                      │
│  3. Database Sync                                                   │
│     • Cross-region read replicas                                   │
│     • Multi-region writes (expensive!)                             │
│                                                                      │
│  WHEN MULTI-REGION IS WORTH IT:                                     │
│  ───────────────────────────────                                    │
│                                                                      │
│  ✓ Latency-sensitive global users (reduce 100-200ms)              │
│  ✓ Compliance requirements (data residency)                       │
│  ✓ Disaster recovery requirements                                 │
│  ✓ High availability SLA (99.99%+)                                │
│                                                                      │
│  COST-EFFECTIVE APPROACHES:                                          │
│  ───────────────────────────                                        │
│                                                                      │
│  1. Active-Passive (DR only)                                       │
│     • Passive region at 20% capacity                               │
│     • Only scaled up during failover                               │
│     • 1.2x baseline cost, not 2x                                   │
│                                                                      │
│  2. CDN + Single Origin                                            │
│     • CDN handles global latency                                   │
│     • Single origin region                                         │
│     • 1.1x cost (just CDN fees)                                    │
│                                                                      │
│  3. Read Replicas Only                                             │
│     • Writes to primary region                                     │
│     • Read replicas in other regions                               │
│     • ~1.5x cost                                                    │
│                                                                      │
│  4. Global Database (DynamoDB Global Tables, Spanner)              │
│     • Managed multi-region                                         │
│     • Higher per-unit cost but simpler                             │
│     • Good for global write requirements                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ FinOps Practices
## ────────────────────────────────────

### Cost Allocation & Tagging

```
┌─────────────────────────────────────────────────────────────────────┐
│              COST ALLOCATION STRATEGY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TAGGING STRATEGY:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  Required tags on ALL resources:                                   │
│                                                                      │
│  │ Tag Key        │ Example Values  │ Purpose                    │ │
│  │────────────────│─────────────────│────────────────────────────│ │
│  │ Environment    │ prod, staging   │ Identify non-prod costs    │ │
│  │ Team           │ platform, ml    │ Team accountability        │ │
│  │ Service        │ api, payments   │ Service-level costs        │ │
│  │ CostCenter     │ ENG-001         │ Finance allocation         │ │
│  │ Owner          │ john@company    │ Contact for questions      │ │
│                                                                      │
│  ENFORCEMENT:                                                        │
│  ────────────                                                       │
│                                                                      │
│  # AWS Config Rule to require tags                                 │
│  {                                                                   │
│    "Source": "AWS",                                                  │
│    "SourceIdentifier": "REQUIRED_TAGS",                            │
│    "InputParameters": {                                              │
│      "tag1Key": "Environment",                                      │
│      "tag2Key": "Team",                                              │
│      "tag3Key": "Service"                                           │
│    }                                                                 │
│  }                                                                   │
│                                                                      │
│  # Block untagged resource creation in CI/CD                       │
│  if not resource.tags.get("Team"):                                 │
│      raise Error("Team tag required")                              │
│                                                                      │
│  COST VISIBILITY:                                                    │
│  ─────────────────                                                  │
│                                                                      │
│  │ Team      │ Service    │ Environment │ Monthly Cost │ Trend   │ │
│  │───────────│────────────│─────────────│──────────────│─────────│ │
│  │ Platform  │ API        │ prod        │ $45,000      │ +5%     │ │
│  │ Platform  │ API        │ staging     │ $8,000       │ +15%    │ │
│  │ ML        │ Training   │ prod        │ $120,000     │ -10%    │ │
│  │ ML        │ Inference  │ prod        │ $30,000      │ +25%    │ │
│  │ Data      │ Pipeline   │ prod        │ $22,000      │ +2%     │ │
│                                                                      │
│  RED FLAGS:                                                          │
│  ──────────                                                         │
│  • Staging growing faster than prod (dev waste)                    │
│  • Service with unexpected 25% growth                              │
│  • Untagged resources (create "untagged" report)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cost Anomaly Detection

```
┌─────────────────────────────────────────────────────────────────────┐
│              ANOMALY DETECTION & ALERTS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  COMMON COST ANOMALIES:                                              │
│  ───────────────────────                                            │
│                                                                      │
│  1. Runaway Resources                                              │
│     • Infinite loop creating resources                             │
│     • Auto-scaling without limits                                  │
│     • Zombie resources (forgotten deployments)                     │
│                                                                      │
│  2. Traffic Spikes                                                  │
│     • Viral event → huge egress                                    │
│     • DDoS → API Gateway charges                                   │
│     • Bot traffic                                                   │
│                                                                      │
│  3. Configuration Mistakes                                          │
│     • Logging at debug level → CloudWatch costs                    │
│     • Wrong storage class selected                                 │
│     • Expensive instance type in terraform                         │
│                                                                      │
│  4. Price Changes / New Services                                   │
│     • New feature uses expensive service                           │
│     • Dependency update pulls in costly SDK                        │
│                                                                      │
│  ALERTING THRESHOLDS:                                                │
│  ─────────────────────                                              │
│                                                                      │
│  │ Condition                    │ Action              │ Urgency   │ │
│  │──────────────────────────────│─────────────────────│───────────│ │
│  │ Daily > 110% of avg         │ Slack alert         │ Low       │ │
│  │ Daily > 150% of avg         │ Page on-call        │ Medium    │ │
│  │ Daily > 200% of avg         │ Page + manager      │ High      │ │
│  │ Any single resource > $1000 │ Investigate         │ Medium    │ │
│  │ Monthly forecast > budget   │ Budget review       │ High      │ │
│                                                                      │
│  AWS COST ANOMALY DETECTION:                                         │
│  ────────────────────────────                                       │
│                                                                      │
│  {                                                                   │
│    "AnomalyMonitor": {                                               │
│      "Type": "DIMENSIONAL",                                          │
│      "DimensionalValueCount": 2,                                     │
│      "MonitorSpecification": {                                       │
│        "Dimensions": {                                               │
│          "Key": "SERVICE",                                           │
│          "Values": ["Amazon EC2", "Amazon S3"]                      │
│        }                                                             │
│      }                                                               │
│    },                                                                │
│    "AnomalySubscription": {                                          │
│      "Threshold": 100,  // $100 anomaly threshold                   │
│      "Frequency": "DAILY",                                           │
│      "Subscribers": [                                                │
│        {"Type": "SNS", "Address": "arn:aws:sns:..."}               │
│      ]                                                               │
│    }                                                                 │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Budgets and Forecasting

```
┌─────────────────────────────────────────────────────────────────────┐
│              BUDGET MANAGEMENT                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BUDGET STRUCTURE:                                                   │
│  ─────────────────                                                  │
│                                                                      │
│  Company Infrastructure Budget: $500,000/month                     │
│  │                                                                  │
│  ├── Engineering: $300,000                                         │
│  │   ├── Platform Team: $120,000                                   │
│  │   │   ├── Production: $100,000                                  │
│  │   │   └── Staging/Dev: $20,000                                  │
│  │   ├── ML Team: $150,000                                         │
│  │   │   ├── Training: $120,000                                    │
│  │   │   └── Inference: $30,000                                    │
│  │   └── Data Team: $30,000                                        │
│  │                                                                  │
│  ├── Operations: $100,000                                          │
│  │   ├── Monitoring: $30,000                                       │
│  │   ├── Security: $40,000                                         │
│  │   └── Networking: $30,000                                       │
│  │                                                                  │
│  └── Reserve/Buffer: $100,000 (20%)                               │
│                                                                      │
│  FORECASTING:                                                        │
│  ────────────                                                       │
│                                                                      │
│  Forecast = Current Spend × (Days Remaining / Days Elapsed)        │
│           + Known Future Changes                                    │
│                                                                      │
│  Example (Day 15 of month):                                        │
│  Current spend: $250,000                                           │
│  Linear forecast: $250,000 × (30/15) = $500,000                   │
│  But: Black Friday on Day 28 = +$50,000                           │
│  Adjusted forecast: $550,000                                       │
│                                                                      │
│  BUDGET ALERTS:                                                      │
│  ──────────────                                                     │
│                                                                      │
│  │ Threshold │ Type      │ Action                                │ │
│  │───────────│───────────│───────────────────────────────────────│ │
│  │ 50%       │ Actual    │ Info: On track                        │ │
│  │ 75%       │ Actual    │ Warning: Review spending              │ │
│  │ 90%       │ Actual    │ Alert: Immediate review needed        │ │
│  │ 100%      │ Forecasted│ Warning: Projected to exceed          │ │
│  │ 100%      │ Actual    │ Critical: Budget exceeded             │ │
│                                                                      │
│  TERRAFORM FOR AWS BUDGET:                                           │
│  ──────────────────────────                                         │
│                                                                      │
│  resource "aws_budgets_budget" "team_budget" {                     │
│    name         = "Platform-Team-Monthly"                          │
│    budget_type  = "COST"                                            │
│    limit_amount = "120000"                                          │
│    limit_unit   = "USD"                                             │
│    time_unit    = "MONTHLY"                                         │
│                                                                      │
│    cost_filter {                                                     │
│      name   = "TagKeyValue"                                         │
│      values = ["Team$Platform"]                                    │
│    }                                                                 │
│                                                                      │
│    notification {                                                    │
│      comparison_operator = "GREATER_THAN"                          │
│      threshold           = 80                                       │
│      threshold_type      = "PERCENTAGE"                            │
│      notification_type   = "FORECASTED"                            │
│      subscriber_email_addresses = ["team@company.com"]             │
│    }                                                                 │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Cost Optimization Checklist
## ────────────────────────────────────

### Quick Wins

```
┌─────────────────────────────────────────────────────────────────────┐
│              COST OPTIMIZATION CHECKLIST                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  IMMEDIATE WINS (This week):                                        │
│  ────────────────────────────                                       │
│  □ Delete unused resources (EBS, EIPs, old snapshots)              │
│  □ Stop/schedule non-prod environments (nights/weekends)          │
│  □ Right-size obvious over-provisioned instances                   │
│  □ Enable S3 Intelligent-Tiering                                   │
│  □ Review and clean up old AMIs/snapshots                          │
│                                                                      │
│  SHORT-TERM (This month):                                            │
│  ─────────────────────────                                          │
│  □ Purchase Reserved Instances for stable workloads               │
│  □ Set up auto-scaling with appropriate policies                  │
│  □ Implement S3 lifecycle policies                                 │
│  □ Enable compression for API responses                            │
│  □ Set up cost tagging enforcement                                 │
│  □ Configure budget alerts                                         │
│                                                                      │
│  MEDIUM-TERM (This quarter):                                         │
│  ───────────────────────────                                        │
│  □ Move to Graviton/ARM instances (20% cheaper)                   │
│  □ Implement caching layer (reduce DB/compute)                    │
│  □ Evaluate spot instances for appropriate workloads              │
│  □ Consolidate underutilized databases                            │
│  □ Review and optimize data transfer patterns                     │
│  □ Evaluate serverless for variable workloads                     │
│                                                                      │
│  LONG-TERM (This year):                                              │
│  ──────────────────────                                             │
│  □ Multi-cloud cost arbitrage evaluation                          │
│  □ Own infrastructure vs. cloud analysis (at scale)               │
│  □ Custom silicon (Inferentia, Trainium) for ML                   │
│  □ Private connectivity (Direct Connect)                          │
│  □ Build vs. buy managed services                                 │
│                                                                      │
│  SAVINGS ESTIMATES:                                                  │
│  ──────────────────                                                 │
│  • Delete unused: 5-10% immediate savings                          │
│  • Schedule non-prod: 10-20% of non-prod costs                    │
│  • Right-sizing: 20-40% of compute costs                          │
│  • Reserved/Savings Plans: 30-60% of eligible compute             │
│  • Storage tiering: 50-70% of storage costs                       │
│  • Caching: Varies (reduces compute + data transfer)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Real-World Case Studies
## ────────────────────────────────────

### Case Study: Reducing Egress Costs

```
┌─────────────────────────────────────────────────────────────────────┐
│              VIDEO STREAMING EGRESS OPTIMIZATION                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BEFORE:                                                             │
│  ────────                                                           │
│  • 500 TB/month egress from S3                                     │
│  • Direct to users from origin                                     │
│  • Cost: 500 TB × $0.085/GB = $42,500/month                        │
│                                                                      │
│  OPTIMIZATION STEPS:                                                 │
│  ────────────────────                                               │
│                                                                      │
│  1. Add CloudFront CDN                                             │
│     • 90% cache hit rate                                           │
│     • Origin egress: 50 TB                                         │
│     • CDN egress: 450 TB × $0.02 = $9,000                         │
│     • Origin to CDN: ~$0 (same region)                            │
│     • New cost: $9,000/month                                       │
│     • Savings: $33,500/month (79%)                                 │
│                                                                      │
│  2. Optimize video encoding                                        │
│     • H.265 instead of H.264 (50% smaller files)                  │
│     • Same quality, half the bandwidth                             │
│     • New egress: 225 TB                                           │
│     • New cost: 225 TB × $0.02 = $4,500/month                     │
│     • Additional savings: $4,500/month                             │
│                                                                      │
│  3. Implement adaptive bitrate                                     │
│     • Serve quality based on connection                           │
│     • Average bitrate dropped 30%                                  │
│     • New egress: 157 TB                                           │
│     • New cost: $3,150/month                                       │
│                                                                      │
│  TOTAL:                                                              │
│  ──────                                                             │
│  Before: $42,500/month                                             │
│  After: $3,150/month                                               │
│  Savings: $39,350/month = $472,200/year                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Study: Right-Sizing ML Infrastructure

```
┌─────────────────────────────────────────────────────────────────────┐
│              ML TRAINING COST OPTIMIZATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BEFORE:                                                             │
│  ────────                                                           │
│  • 20 p3.8xlarge instances (4x V100 GPUs each)                    │
│  • Running 24/7 for "anytime training"                             │
│  • Cost: 20 × $12.24/hr × 720 = $176,256/month                    │
│                                                                      │
│  ANALYSIS:                                                           │
│  ─────────                                                          │
│  • Actual GPU utilization: 15% average                             │
│  • Training jobs: 40 hours/week (24% of time)                     │
│  • Most jobs don't need 4 GPUs                                     │
│                                                                      │
│  OPTIMIZATION:                                                       │
│  ─────────────                                                      │
│                                                                      │
│  1. Use Spot Instances for training (70% savings)                 │
│     • Spot p3.8xlarge: $3.67/hr                                   │
│     • Implement checkpointing for interruptions                   │
│                                                                      │
│  2. Auto-scaling cluster                                           │
│     • Scale down to 0 when idle                                   │
│     • Scale up on-demand for training jobs                        │
│                                                                      │
│  3. Right-size instance types                                      │
│     • Use p3.2xlarge (1 GPU) for small jobs                       │
│     • Reserve p3.8xlarge for large distributed training           │
│                                                                      │
│  4. Use AWS Inferentia for inference                              │
│     • inf1.xlarge: $0.228/hr vs p3.2xlarge: $3.06/hr             │
│     • 13x cheaper for inference                                    │
│                                                                      │
│  AFTER:                                                              │
│  ───────                                                            │
│  • Training (Spot, auto-scaled): ~$8,000/month                    │
│  • Inference (Inferentia): ~$4,000/month                          │
│  • Total: $12,000/month                                            │
│                                                                      │
│  SAVINGS: $164,256/month = $1.97M/year                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Interview Answer Framework
## ────────────────────────────────────

### Sample Interview Answer

**Q: "How would you design a cost-efficient architecture for a startup with 1M users?"**

> "I'd focus on optimizing for growth while keeping costs low:
>
> **Compute:**
> - Start with managed services (no ops overhead)
> - Use serverless (Lambda, Fargate) for variable traffic
> - Set aggressive auto-scaling to avoid over-provisioning
> - Use spot instances for any batch processing
>
> **Storage:**
> - S3 for all static assets with Intelligent-Tiering
> - Managed database (Aurora Serverless for variable load)
> - Implement caching early (Redis) to reduce DB load
>
> **Data Transfer:**
> - CloudFront CDN from day one (cheaper than direct egress)
> - Compress all responses (gzip/brotli)
> - Keep services in same AZ when possible
>
> **Cost Control:**
> - Mandatory tagging from day one
> - Budget alerts at 80% and 100%
> - Weekly cost review for top 10 items
> - Separate accounts for prod/dev
>
> **Estimated Monthly Cost Breakdown:**
> - Compute (Lambda/Fargate): $2,000
> - Database (Aurora Serverless): $1,500
> - Storage (S3): $500
> - CDN (CloudFront): $1,000
> - Monitoring/Other: $500
> - **Total: ~$5,500/month**
>
> As we grow, I'd evaluate:
> - Reserved capacity for stable baseline
> - Self-managed infrastructure at higher scale
> - CDN optimization (multi-CDN, origin shield)"

---

## ────────────────────────────────────
## 8️⃣ Key Formulas
## ────────────────────────────────────

```
Cost per Request = (Monthly Infra Cost) / (Monthly Requests)

Break-even: Serverless vs EC2
───────────────────────────────
Lambda cost = Requests × $0.0000002 + GB-seconds × $0.0000166667
EC2 cost = Hours × Hourly Price

When Lambda > EC2: Consider EC2
When Lambda < EC2: Stay serverless

Spot Savings
────────────
Savings = (On-demand price - Spot price) / On-demand price
Typical: 60-90% savings

Reserved Instance ROI
─────────────────────
Monthly RI cost = Upfront / 12 + Hourly × 720
Savings vs On-demand = On-demand monthly - RI monthly
Break-even months = Upfront / Monthly Savings

Data Transfer Cost
──────────────────
Total = Egress GB × Egress Price + Cross-AZ GB × $0.02
CDN savings = Direct Egress Cost - CDN Egress Cost
```

---

## ────────────────────────────────────
## 9️⃣ Summary
## ────────────────────────────────────

### Top Cost Optimization Principles

1. **Pay only for what you use** - Auto-scale, serverless, spot
2. **Use the cheapest option that meets requirements** - Right-size, right-tier
3. **Avoid hidden costs** - Egress, cross-AZ, NAT Gateway
4. **Commit for predictable workloads** - Reserved, Savings Plans
5. **Measure and alert** - Tags, budgets, anomaly detection
6. **Cache aggressively** - Reduce compute and transfer
7. **Compress everything** - Smaller = cheaper to store and transfer

---

**Next**: `26_Back_of_the_Envelope_Calculations.md` - Quick estimation techniques for interviews
