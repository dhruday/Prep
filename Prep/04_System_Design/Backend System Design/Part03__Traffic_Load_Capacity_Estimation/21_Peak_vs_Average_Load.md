# 21. Peak vs Average Load

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Peak vs Average Load** refers to the difference between your system's typical traffic and its maximum traffic spikes.

### What It Is
- **Average Load**: The typical, steady-state traffic your system handles
- **Peak Load**: The maximum traffic during high-demand periods
- **Peak-to-Average Ratio**: How much higher peak is compared to average (e.g., 5x)

### Why It Exists
Systems don't receive constant traffic. Traffic varies by:
- **Time of day** (evening rush vs midnight)
- **Day of week** (weekdays vs weekends)
- **Season** (holiday shopping, back-to-school)
- **Events** (product launches, viral content, breaking news)

### The Problem It Solves
Understanding peak vs average helps you:
- **Size infrastructure correctly** (not over/under provision)
- **Plan auto-scaling policies** (when to scale up/down)
- **Set realistic SLOs** (different expectations for peak vs normal)
- **Optimize costs** (pay for average, burst for peak)

### Where and When It's Used
- **Capacity planning**: Determine baseline server count
- **Auto-scaling configuration**: Set scale-up thresholds
- **Load testing**: Test at peak, not average
- **Budget forecasting**: Account for burst capacity costs

### Its Role in Large-Scale Distributed Systems
At FAANG scale, peak traffic can be:
- **Amazon**: 100x average on Black Friday
- **Twitter**: 20x during major events (World Cup, elections)
- **Netflix**: 3x at evening prime time
- **YouTube**: 10x for viral video launches

Designing only for average means **guaranteed failure during peaks**.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Traffic Pattern Analysis

```
┌─────────────────────────────────────────────────────────────────────┐
│              DAILY TRAFFIC PATTERN (Social Media)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  QPS                                                                 │
│  ▲                                                                   │
│  │         PEAK (Evening)                                            │
│  │              ↓                                                    │
│100K│            ╱──╲                                                 │
│  │           ╱    ╲                                                  │
│80K │         ╱      ╲    ← PEAK: 100K QPS                           │
│  │        ╱        ╲                                                │
│60K │      ╱          ╲                                              │
│  │     ╱            ╲                                               │
│40K │   ╱    ╱╲        ╲   ← AVERAGE: 50K QPS                        │
│  │──────────────────────── Average line                            │
│  │  ╱    ╱  ╲          ╲                                            │
│20K │╱   ╱    Lunch      ╲   ← TROUGH: 15K QPS                       │
│  │    ╱       spike      ╲                                          │
│10K │__╱                    ╲__                                      │
│  │  ↑                        ↑                                      │
│  │  Night low                Late night low                         │
│  └──────────────────────────────────────────────────────▶ Hour     │
│    0  2  4  6  8  10 12 14 16 18 20 22 24                          │
│                                                                      │
│  METRICS:                                                            │
│  • Peak: 100K QPS                                                   │
│  • Average: 50K QPS                                                 │
│  • Trough: 15K QPS                                                  │
│  • Peak-to-Average Ratio: 2:1                                       │
│  • Peak-to-Trough Ratio: 6.7:1                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Peak-to-Average Ratios by Industry

```
┌─────────────────────────────────────────────────────────────────────┐
│              INDUSTRY PEAK-TO-AVERAGE RATIOS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INDUSTRY          │ TYPICAL RATIO │ EXTREME EVENTS                 │
│  ──────────────────│───────────────│────────────────────────────────│
│  E-commerce        │ 3-5x          │ 50-100x (Black Friday)         │
│  Social media      │ 2-3x          │ 10-20x (viral events)          │
│  Streaming         │ 2-3x          │ 5x (premiere events)           │
│  Gaming            │ 3-5x          │ 10-20x (launch day)            │
│  News              │ 2-4x          │ 50-100x (breaking news)        │
│  B2B SaaS          │ 1.5-2x        │ 3x (month-end processing)      │
│  Financial         │ 2-3x          │ 10-20x (market volatility)     │
│  Sports/Events     │ 5-10x         │ 50x+ (championship finals)     │
│                                                                      │
│  PLANNING GUIDELINE:                                                 │
│  ─────────────────                                                  │
│  • Provision for: Average + 50% headroom for normal operation      │
│  • Auto-scale to: 3-5x average for expected peaks                  │
│  • Emergency capacity: Plan for 10x+ with degradation strategies   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Types of Traffic Peaks

```
┌─────────────────────────────────────────────────────────────────────┐
│              PEAK TRAFFIC CATEGORIES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. PREDICTABLE PEAKS (Plan ahead)                                  │
│  ─────────────────────────────────                                  │
│                                                                      │
│  ┌──────────────────────────────────────┐                          │
│  │ Time-based:                          │                          │
│  │ • Daily: Evening prime time          │                          │
│  │ • Weekly: Sunday evenings            │                          │
│  │ • Monthly: Payday, month-end         │                          │
│  │ • Annual: Holidays, seasons          │                          │
│  │                                       │                          │
│  │ Event-based (scheduled):             │                          │
│  │ • Product launches                   │                          │
│  │ • Marketing campaigns                │                          │
│  │ • Sports events                      │                          │
│  │ • TV show premieres                  │                          │
│  └──────────────────────────────────────┘                          │
│                                                                      │
│  2. UNPREDICTABLE PEAKS (React quickly)                             │
│  ───────────────────────────────────────                            │
│                                                                      │
│  ┌──────────────────────────────────────┐                          │
│  │ Viral events:                        │                          │
│  │ • Unexpected celebrity mention       │                          │
│  │ • Reddit/HackerNews front page       │                          │
│  │ • Social media trend                 │                          │
│  │                                       │                          │
│  │ External events:                     │                          │
│  │ • Breaking news                      │                          │
│  │ • Natural disasters                  │                          │
│  │ • Political events                   │                          │
│  │ • Market crashes                     │                          │
│  └──────────────────────────────────────┘                          │
│                                                                      │
│  3. FLASH CROWDS (Seconds to minutes)                               │
│  ─────────────────────────────────────                              │
│                                                                      │
│  ┌──────────────────────────────────────┐                          │
│  │ • Concert ticket sales (on sale NOW) │                          │
│  │ • Limited product drops              │                          │
│  │ • Flash sales                        │                          │
│  │ • Simultaneous TV ad + mobile QR     │                          │
│  │ • 0 to 100x in 10 seconds           │                          │
│  └──────────────────────────────────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Scaling Strategies

```
┌─────────────────────────────────────────────────────────────────────┐
│              SCALING STRATEGY BY PEAK TYPE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PREDICTABLE PEAKS:                                                  │
│  ─────────────────                                                  │
│  Strategy: Scheduled Scaling                                        │
│                                                                      │
│  # Example: Pre-scale before known peak                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Schedule: Every day at 5 PM                                 │   │
│  │ Action: Scale to 150% of baseline                           │   │
│  │                                                              │   │
│  │ Schedule: Every day at 11 PM                                │   │
│  │ Action: Scale to 50% of baseline                            │   │
│  │                                                              │   │
│  │ Schedule: Black Friday -1 day                               │   │
│  │ Action: Scale to 500% of baseline                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  UNPREDICTABLE PEAKS:                                                │
│  ────────────────────                                               │
│  Strategy: Reactive Auto-Scaling                                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Trigger: CPU > 70% for 1 minute                             │   │
│  │ Action: Add 20% more instances                              │   │
│  │ Cooldown: 3 minutes                                         │   │
│  │                                                              │   │
│  │ Trigger: Response latency p99 > 500ms                       │   │
│  │ Action: Add 10% more instances                              │   │
│  │ Cooldown: 2 minutes                                         │   │
│  │                                                              │   │
│  │ Trigger: Queue depth > 10,000                               │   │
│  │ Action: Add 5 worker instances                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  FLASH CROWDS:                                                       │
│  ─────────────                                                      │
│  Strategy: Over-provision + Load Shedding                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pre-event:                                                   │   │
│  │ • Scale to expected peak BEFORE event                       │   │
│  │ • Pre-warm caches                                           │   │
│  │ • Test with load similar to expected                        │   │
│  │                                                              │   │
│  │ During event:                                                │   │
│  │ • Virtual waiting room (queue users)                        │   │
│  │ • Rate limit non-critical endpoints                        │   │
│  │ • Serve degraded but functional responses                  │   │
│  │                                                              │   │
│  │ Auto-scaling too slow for flash crowds!                     │   │
│  │ (VMs take 3-5 min, containers 30-60 sec)                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cost Optimization for Peak Handling

```
┌─────────────────────────────────────────────────────────────────────┐
│              COST STRATEGIES                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE DILEMMA:                                                        │
│  ────────────                                                       │
│  • Provision for peak = paying for idle resources 90% of time      │
│  • Provision for average = failures during peaks                   │
│                                                                      │
│  SOLUTION: HYBRID CAPACITY MODEL                                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │   Capacity                                                   │   │
│  │   ▲                                                          │   │
│  │   │                                                          │   │
│  │   │  ════════════════════════════ ← Peak Capacity (10x)     │   │
│  │   │        ╱╲                         On-demand/Spot        │   │
│  │   │       ╱  ╲                                               │   │
│  │   │  ────╱────╲────────────────── ← Auto-scale Capacity     │   │
│  │   │     ╱      ╲                      (Reserved + On-demand)│   │
│  │   │    ╱        ╲                                            │   │
│  │   │  ══════════════════════════── ← Baseline Capacity       │   │
│  │   │                                   (Reserved Instances)  │   │
│  │   │                                                          │   │
│  │   └──────────────────────────────────────▶ Time             │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  COST BREAKDOWN:                                                     │
│  ───────────────                                                    │
│  Baseline (30% of peak): Reserved Instances (50-70% cheaper)       │
│  Normal peaks (60% of peak): On-demand (full price)                │
│  Extreme peaks (100%): Spot Instances (70-90% cheaper, preemptible)│
│                                                                      │
│  EXAMPLE (100-server peak capacity):                                │
│  ─────────────────────────────────                                  │
│  • 30 Reserved (3-year term): $1,000/month each = $30,000          │
│  • 30 On-demand (average usage): $2,000/month each = $60,000       │
│  • 40 Spot (peak only, 10% of time): $400/month avg = $16,000      │
│  • Total: $106,000/month                                            │
│  • vs. All on-demand: $200,000/month                               │
│  • Savings: 47%                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### Calculating Peak Capacity Requirements

```
METHODOLOGY:
────────────

1. ESTABLISH BASELINE
   • Measure average QPS over typical week
   • Example: 50,000 QPS average

2. IDENTIFY PEAK MULTIPLIER
   • Analyze historical peaks
   • Account for growth
   • Example: 3x daily peak, 10x annual peak

3. CALCULATE REQUIRED CAPACITY

   Daily operation:
   ─────────────────
   Average: 50,000 QPS
   Daily peak (3x): 150,000 QPS
   
   Server capacity: 5,000 QPS per server
   
   For average: 50,000 / 5,000 = 10 servers
   For daily peak: 150,000 / 5,000 = 30 servers
   
   Headroom (20%): 30 × 1.2 = 36 servers needed for daily peaks

   Annual peak (Black Friday):
   ─────────────────────────────
   Annual peak (10x): 500,000 QPS
   Servers needed: 500,000 / 5,000 = 100 servers
   
   Headroom (20%): 100 × 1.2 = 120 servers for annual peak

4. DESIGN SCALING STRATEGY
   
   Baseline (reserved): 15 servers (covers average + 50%)
   Auto-scale to: 36 servers (covers daily peaks)
   Pre-scale for events: 120 servers (annual peak)
```

### Infrastructure Sizing Table

```
┌─────────────────────────────────────────────────────────────────────┐
│              SIZING BY LOAD SCENARIO                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SCENARIO          │ QPS      │ SERVERS │ INSTANCES TYPE            │
│  ──────────────────│──────────│─────────│────────────────────────────│
│  Minimum (2 AM)    │ 15,000   │ 5       │ Reserved (always on)       │
│  Average           │ 50,000   │ 15      │ Reserved (10) + On-demand  │
│  Daily Peak        │ 150,000  │ 36      │ Reserved + Auto-scaled     │
│  Weekly Peak       │ 200,000  │ 48      │ + Additional auto-scaled   │
│  Monthly Peak      │ 250,000  │ 60      │ + Pre-scheduled            │
│  Annual Peak       │ 500,000  │ 120     │ + Spot instances           │
│  Black Swan Event  │ 1,000,000│ 240     │ + Cloud burst + shedding   │
│                                                                      │
│  SCALING CONFIGURATION:                                              │
│  ──────────────────────                                             │
│  Min instances: 5 (never scale below)                               │
│  Desired instances: 15 (target for average load)                    │
│  Max instances: 200 (hard limit, includes spot)                     │
│                                                                      │
│  Scale-up trigger: CPU > 70% for 2 min                              │
│  Scale-down trigger: CPU < 30% for 10 min                          │
│  Scale-up cooldown: 3 min                                           │
│  Scale-down cooldown: 10 min                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Database Handling of Peak Load

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATABASE PEAK STRATEGIES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CHALLENGE:                                                          │
│  ──────────                                                         │
│  • Databases can't scale as quickly as stateless services          │
│  • Connection limits are fixed                                      │
│  • Writes go to single primary                                      │
│                                                                      │
│  STRATEGY 1: CONNECTION POOLING                                     │
│  ────────────────────────────                                       │
│  • Use PgBouncer/ProxySQL                                          │
│  • Application: 1000 connections                                    │
│  • Pooler: 100 actual DB connections                               │
│  • Multiplexing handles bursts                                      │
│                                                                      │
│  STRATEGY 2: READ REPLICA ROUTING                                   │
│  ────────────────────────────────                                   │
│  • Normal: 2 read replicas                                         │
│  • Peak: Auto-add 4 more read replicas                             │
│  • Route reads to replicas, writes to primary                      │
│                                                                      │
│  STRATEGY 3: CACHE ABSORPTION                                       │
│  ─────────────────────────────                                      │
│  • Normal: 90% cache hit rate                                       │
│  • Peak: Extend cache TTLs temporarily                             │
│  • Accept slightly stale data during peaks                         │
│                                                                      │
│  STRATEGY 4: WRITE QUEUING                                          │
│  ─────────────────────────                                          │
│  • Non-critical writes go to Kafka                                 │
│  • Process async during off-peak                                   │
│  • Critical writes still synchronous                               │
│                                                                      │
│  STRATEGY 5: QUERY SIMPLIFICATION                                   │
│  ────────────────────────────────                                   │
│  • Peak mode: Disable complex aggregations                         │
│  • Return cached summaries instead                                 │
│  • Feature flag controlled                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Graceful Degradation During Peaks

```
┌─────────────────────────────────────────────────────────────────────┐
│              DEGRADATION LEVELS                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LEVEL 0: NORMAL OPERATION (< 70% capacity)                        │
│  ─────────────────────────────────────────                          │
│  • All features available                                           │
│  • Full quality responses                                           │
│  • All analytics/logging enabled                                   │
│                                                                      │
│  LEVEL 1: ELEVATED LOAD (70-85% capacity)                          │
│  ─────────────────────────────────────────                          │
│  • Reduce logging verbosity                                        │
│  • Increase cache TTLs by 2x                                       │
│  • Disable non-critical background jobs                            │
│  • Alert on-call team                                              │
│                                                                      │
│  LEVEL 2: HIGH LOAD (85-95% capacity)                              │
│  ─────────────────────────────────────                              │
│  • Disable recommendation engines                                  │
│  • Return cached search results                                    │
│  • Skip personalization                                            │
│  • Rate limit by user tier (free users first)                     │
│                                                                      │
│  LEVEL 3: CRITICAL LOAD (95-100% capacity)                         │
│  ───────────────────────────────────────────                        │
│  • Static error pages for non-essential pages                      │
│  • Queue all writes (except critical)                              │
│  • Aggressive rate limiting                                        │
│  • Virtual waiting room for new users                              │
│                                                                      │
│  LEVEL 4: OVERLOAD (>100% capacity)                                │
│  ───────────────────────────────────                                │
│  • Reject percentage of new requests (load shedding)              │
│  • Prioritize existing sessions over new                          │
│  • Core functionality only                                         │
│  • All hands on deck                                               │
│                                                                      │
│  IMPLEMENTATION:                                                     │
│  ───────────────                                                    │
│  if current_load > 0.95 * max_capacity:                            │
│      enable_feature_flag("degraded_mode_level_3")                  │
│      notify_oncall("Critical load reached")                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Load Shedding Strategies

```
┌─────────────────────────────────────────────────────────────────────┐
│              LOAD SHEDDING TECHNIQUES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. PERCENTAGE-BASED REJECTION                                      │
│  ─────────────────────────────                                      │
│  if load > 100%:                                                    │
│      reject_probability = (load - 100) / 100                       │
│      if random() < reject_probability:                              │
│          return 503 Service Unavailable                            │
│                                                                      │
│  2. PRIORITY-BASED REJECTION                                        │
│  ───────────────────────────                                        │
│  Priority 1: Paying customers → Never reject                       │
│  Priority 2: Logged-in users → Reject after P1 saturated          │
│  Priority 3: Anonymous users → Reject first                        │
│                                                                      │
│  3. AGE-BASED REJECTION                                             │
│  ──────────────────────                                             │
│  Older requests (>500ms waiting) → Reject                          │
│  Rationale: User probably already retried                          │
│                                                                      │
│  4. ENDPOINT-BASED REJECTION                                        │
│  ───────────────────────────                                        │
│  Critical: /checkout, /login → Always serve                        │
│  Important: /feed, /search → Serve if capacity                     │
│  Optional: /recommendations → Reject first                         │
│                                                                      │
│  5. CIRCUIT BREAKER                                                 │
│  ────────────────────                                               │
│  If downstream service overloaded:                                  │
│      Return cached/default response                                 │
│      Don't add to downstream load                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### Rate Limiting During Peaks

```
┌─────────────────────────────────────────────────────────────────────┐
│              ADAPTIVE RATE LIMITING                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STATIC RATE LIMITS (Always enforced):                              │
│  ─────────────────────────────────────                              │
│  • Per-user: 100 requests/minute                                   │
│  • Per-IP: 1000 requests/minute                                    │
│  • Per-API key: Based on plan                                      │
│                                                                      │
│  DYNAMIC RATE LIMITS (Adjusted by load):                            │
│  ───────────────────────────────────────                            │
│                                                                      │
│  def get_rate_limit(user, current_load_percent):                   │
│      base_limit = user.plan.rate_limit  # e.g., 100/min           │
│                                                                      │
│      if current_load_percent < 70:                                 │
│          return base_limit * 1.5  # Generous during low load       │
│      elif current_load_percent < 85:                               │
│          return base_limit  # Normal limits                        │
│      elif current_load_percent < 95:                               │
│          return base_limit * 0.5  # Reduced limits                 │
│      else:                                                          │
│          return base_limit * 0.2  # Emergency limits               │
│                                                                      │
│  IMPLEMENTATION:                                                     │
│  ───────────────                                                    │
│  • Broadcast load level to all rate limiters                       │
│  • Update every 10 seconds                                         │
│  • Return Retry-After header with estimated wait                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Case Study: Amazon Prime Day

```
┌─────────────────────────────────────────────────────────────────────┐
│              AMAZON PRIME DAY SCALING                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE CHALLENGE:                                                      │
│  ───────────────                                                    │
│  • Normal day: X QPS (baseline)                                     │
│  • Prime Day: 50-100x QPS                                           │
│  • Duration: 48 hours of sustained peak                            │
│  • Zero tolerance for failure (revenue = $billions)                │
│                                                                      │
│  PREPARATION (Months before):                                        │
│  ─────────────────────────────                                      │
│  1. Load testing at 2x expected peak                               │
│  2. Identify and fix bottlenecks                                   │
│  3. Pre-provision capacity across all regions                      │
│  4. Cache warming for expected hot products                        │
│  5. Feature freeze 2 weeks before                                  │
│                                                                      │
│  ARCHITECTURE:                                                       │
│  ─────────────                                                      │
│  • Stateless services: Scale to 10x normal                        │
│  • Databases: Read replicas + aggressive caching                  │
│  • Checkout: Dedicated high-priority cluster                      │
│  • Inventory: Eventually consistent (allow oversell, fix later)   │
│  • Search: Pre-computed results for popular queries               │
│                                                                      │
│  REAL-TIME:                                                          │
│  ──────────                                                         │
│  • War room with all service owners                                │
│  • Real-time dashboards for every service                         │
│  • Pre-authorized to scale instantly                               │
│  • Degradation playbooks ready to execute                          │
│                                                                      │
│  KEY INSIGHT:                                                        │
│  ────────────                                                       │
│  "You can't scale your way out of a problem in real-time.          │
│   All scaling must be done before the event."                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Study: Ticketmaster Flash Crowd

```
┌─────────────────────────────────────────────────────────────────────┐
│              TAYLOR SWIFT ERAS TOUR TICKETS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE EVENT:                                                          │
│  ───────────                                                        │
│  • 14 million users attempting to buy tickets                      │
│  • Normal capacity: ~100K concurrent                               │
│  • Peak: 3.5 million concurrent users                              │
│  • Traffic spike: 35x normal capacity                              │
│  • Time to peak: < 1 minute                                         │
│                                                                      │
│  WHAT WENT WRONG:                                                    │
│  ─────────────────                                                  │
│  1. Underestimated demand (expected 1.5M, got 14M)                │
│  2. Bot traffic amplified real user load                          │
│  3. Waiting room couldn't scale fast enough                        │
│  4. Database connection exhaustion                                  │
│  5. Cascading failures across services                             │
│                                                                      │
│  LESSONS LEARNED:                                                    │
│  ─────────────────                                                  │
│  1. Virtual waiting room BEFORE load hits servers                  │
│  2. Bot detection BEFORE queue                                     │
│  3. No auto-scaling can handle 35x in 1 minute                    │
│  4. Pre-provision for worst-case, not expected-case               │
│  5. Test with 2-3x expected peak                                  │
│                                                                      │
│  PROPER ARCHITECTURE:                                                │
│  ────────────────────                                               │
│                                                                      │
│  Users ──▶ CDN ──▶ Waiting Room ──▶ Bot Detection ──▶ App         │
│             │           │                                           │
│             │     (Queue users      (Rate limit                    │
│             │      at CDN edge)      entrance)                     │
│             │                                                       │
│         Static page                                                 │
│         if overloaded                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Study: Netflix Evening Peak

```
┌─────────────────────────────────────────────────────────────────────┐
│              NETFLIX: PREDICTABLE DAILY PEAKS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TRAFFIC PATTERN:                                                    │
│  ────────────────                                                   │
│  ┌──────────────────────────────────────────┐                      │
│  │                                          │                      │
│  │       ▲                                  │                      │
│  │       │                    ╱──╲          │                      │
│  │       │                   ╱    ╲         │                      │
│  │ 100M+ │                  ╱      ╲        │ Evening peak         │
│  │       │                 ╱        ╲       │ 3x daytime           │
│  │       │    ╱────────────          ╲──    │                      │
│  │       │   ╱                           ╲  │                      │
│  │       │__╱                             ╲_│                      │
│  │       │                                  │                      │
│  │       └───────────────────────────────▶  │                      │
│  │         6AM        NOON       6PM   12AM │                      │
│  │                                          │                      │
│  └──────────────────────────────────────────┘                      │
│                                                                      │
│  STRATEGY:                                                           │
│  ─────────                                                          │
│  1. Scheduled scaling (scale up at 5 PM, down at midnight)        │
│  2. Open Connect (CDN at ISP locations, pre-cached content)        │
│  3. Adaptive bitrate (degrade quality if bandwidth constrained)   │
│  4. Regional failover (redirect to less busy region)              │
│                                                                      │
│  KEY INSIGHT:                                                        │
│  ────────────                                                       │
│  • Predictable peaks allow pre-scaling                             │
│  • 90% of content served from CDN, not origin                      │
│  • Graceful degradation (720p instead of 4K)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

**Q: "How would you design a system to handle peak traffic that's 10x the average?"**

> "I'd approach this with a multi-layered strategy:
>
> **First, understand the peak characteristics:**
> - Is it predictable (daily evening, holidays) or unpredictable (viral)?
> - How fast does traffic ramp up (minutes or seconds)?
> - What's the duration (hours or sustained)?
>
> **Second, design for elastic capacity:**
> - Baseline: Reserved instances for average load + 30% headroom
> - Auto-scaling: Trigger at 70% CPU, scale to handle 5x average
> - Pre-scaling: For known events, scale up BEFORE the event
>
> **Third, implement graceful degradation:**
> - Level 1 (normal): All features enabled
> - Level 2 (high load): Disable non-essential features, extend cache TTLs
> - Level 3 (critical): Rate limiting, virtual waiting room
> - Level 4 (overload): Load shedding, static fallback pages
>
> **Fourth, protect critical paths:**
> - Checkout/payment on dedicated cluster
> - Queue writes, prioritize reads
> - Circuit breakers to prevent cascade failures
>
> The key insight is that auto-scaling alone can't handle flash crowds—you need both pre-provisioning and degradation strategies."

### Common Follow-Up Questions

1. **"What if the peak is 100x instead of 10x?"**
   - Virtual waiting room at CDN edge
   - Queue-based admission control
   - Accept that not all users will be served immediately
   - Prioritize by user value (paying customers first)

2. **"How do you test for peak conditions?"**
   - Load testing at 2x expected peak
   - Chaos engineering (kill services during load)
   - Game days (simulate real events)
   - Canary deployments during actual peaks

3. **"What's the cost implication of handling peaks?"**
   - Reserved instances for baseline (70% cheaper)
   - On-demand for normal peaks
   - Spot instances for extreme peaks (90% cheaper but interruptible)
   - CDN caching to reduce origin load

4. **"How do you measure peak-to-average ratio?"**
   - Monitor QPS continuously
   - Calculate daily/weekly/monthly max vs average
   - Track growth trends
   - Use percentiles (p99) not just max

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Auto-Scaling Logic

```python
from dataclasses import dataclass
from enum import Enum
import time

class ScalingDecision(Enum):
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    NO_CHANGE = "no_change"

@dataclass
class ScalingPolicy:
    min_instances: int = 5
    max_instances: int = 200
    target_utilization: float = 0.70
    scale_up_threshold: float = 0.80
    scale_down_threshold: float = 0.30
    scale_up_cooldown_seconds: int = 180
    scale_down_cooldown_seconds: int = 600
    scale_up_percent: float = 0.25
    scale_down_percent: float = 0.10

class AutoScaler:
    def __init__(self, policy: ScalingPolicy):
        self.policy = policy
        self.current_instances = policy.min_instances
        self.last_scale_up = 0
        self.last_scale_down = 0
        self.high_load_start = None
        self.low_load_start = None
    
    def evaluate(self, current_load: float, current_time: float) -> tuple:
        """
        Evaluate scaling decision based on current load.
        Returns (decision, new_instance_count)
        """
        # Check if we need to scale up
        if current_load > self.policy.scale_up_threshold:
            if self.high_load_start is None:
                self.high_load_start = current_time
            
            # Sustained high load for 1 minute
            if current_time - self.high_load_start > 60:
                if current_time - self.last_scale_up > self.policy.scale_up_cooldown_seconds:
                    new_count = min(
                        self.policy.max_instances,
                        int(self.current_instances * (1 + self.policy.scale_up_percent))
                    )
                    if new_count > self.current_instances:
                        self.current_instances = new_count
                        self.last_scale_up = current_time
                        self.high_load_start = None
                        return (ScalingDecision.SCALE_UP, new_count)
        else:
            self.high_load_start = None
        
        # Check if we can scale down
        if current_load < self.policy.scale_down_threshold:
            if self.low_load_start is None:
                self.low_load_start = current_time
            
            # Sustained low load for 5 minutes
            if current_time - self.low_load_start > 300:
                if current_time - self.last_scale_down > self.policy.scale_down_cooldown_seconds:
                    new_count = max(
                        self.policy.min_instances,
                        int(self.current_instances * (1 - self.policy.scale_down_percent))
                    )
                    if new_count < self.current_instances:
                        self.current_instances = new_count
                        self.last_scale_down = current_time
                        self.low_load_start = None
                        return (ScalingDecision.SCALE_DOWN, new_count)
        else:
            self.low_load_start = None
        
        return (ScalingDecision.NO_CHANGE, self.current_instances)


class GracefulDegradation:
    """Manage feature degradation based on load."""
    
    LEVELS = {
        0: {"name": "Normal", "threshold": 0.70},
        1: {"name": "Elevated", "threshold": 0.85},
        2: {"name": "High", "threshold": 0.95},
        3: {"name": "Critical", "threshold": 1.00},
        4: {"name": "Overload", "threshold": float('inf')}
    }
    
    DEGRADATION_ACTIONS = {
        1: [
            "Reduce logging verbosity",
            "Extend cache TTLs by 2x",
            "Disable non-critical background jobs"
        ],
        2: [
            "Disable recommendation engines",
            "Return cached search results",
            "Skip personalization"
        ],
        3: [
            "Enable virtual waiting room",
            "Queue non-critical writes",
            "Aggressive rate limiting"
        ],
        4: [
            "Load shedding (reject % of requests)",
            "Static fallback pages",
            "Core functionality only"
        ]
    }
    
    def __init__(self):
        self.current_level = 0
    
    def evaluate(self, utilization: float) -> dict:
        """Determine degradation level and actions."""
        new_level = 0
        for level, config in self.LEVELS.items():
            if utilization >= config["threshold"]:
                new_level = level
        
        actions_to_enable = []
        actions_to_disable = []
        
        if new_level > self.current_level:
            # Escalating - enable degradation
            for level in range(self.current_level + 1, new_level + 1):
                if level in self.DEGRADATION_ACTIONS:
                    actions_to_enable.extend(self.DEGRADATION_ACTIONS[level])
        elif new_level < self.current_level:
            # De-escalating - disable degradation
            for level in range(new_level + 1, self.current_level + 1):
                if level in self.DEGRADATION_ACTIONS:
                    actions_to_disable.extend(self.DEGRADATION_ACTIONS[level])
        
        self.current_level = new_level
        
        return {
            "level": new_level,
            "level_name": self.LEVELS[new_level]["name"],
            "enable_actions": actions_to_enable,
            "disable_actions": actions_to_disable
        }


# Example usage
scaler = AutoScaler(ScalingPolicy())
degradation = GracefulDegradation()

# Simulate traffic spike
loads = [0.3, 0.5, 0.7, 0.85, 0.92, 0.98, 0.95, 0.80, 0.60, 0.40, 0.25]

for i, load in enumerate(loads):
    time_now = i * 120  # 2 minutes between samples
    
    scale_decision, instances = scaler.evaluate(load, time_now)
    degrade_result = degradation.evaluate(load)
    
    print(f"Load: {load:.0%} | Instances: {instances} | "
          f"Scale: {scale_decision.value} | "
          f"Degradation: Level {degrade_result['level']} ({degrade_result['level_name']})")
```

### Peak vs Average Visualization

```
                 ┌─────────────────────────────────────────────┐
                 │         CAPACITY PLANNING ZONES             │
                 └─────────────────────────────────────────────┘

   Capacity      ║
     ▲           ║
     │           ║
     │═══════════╬═══════════════════════════════════════════════ Max Capacity (Emergency)
     │           ║                                                 (Pre-scaled for events)
     │           ║
     │           ║         ╱╲
     │           ║        ╱  ╲      Peak Traffic
     │───────────╬───────╱────╲──────────────────────────────────  Auto-scale Ceiling
     │           ║      ╱      ╲
     │           ║     ╱        ╲
     │           ║    ╱          ╲
     │───────────╬───╱────────────╲───────────────────────────── Auto-scale triggers here
     │           ║  ╱              ╲
     │           ║ ╱                ╲
     │═══════════╬════════════════════════════════════════════  Baseline (Reserved)
     │           ║
     │───────────╬────────────────────────────────────────────── Minimum (always running)
     │           ║
     └───────────╬─────────────────────────────────────────────▶ Time
                 ║
        ZONES:   ║
     ════════════╬════════  Emergency Zone (10x+): Pre-provision only
     ────────────╬────────  Burst Zone (3-10x): Auto-scale
     ════════════╬════════  Normal Zone (1-3x): Reserved + some scaling
     ────────────╬────────  Minimum: Always running
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### Why Peak vs Average Matters

| Scenario | If You Ignore Peak | If You Over-Provision |
|----------|-------------------|----------------------|
| Cost | Pay only for average | Pay for max 24/7 (wasteful) |
| Reliability | Failures during peaks | Reliable but expensive |
| User Experience | Bad during peaks | Good always |
| Engineering Effort | Minimal | Complex auto-scaling |

**The goal**: Reliable during peaks while cost-effective during normal times.

### How to Handle Peak Traffic

```
┌─────────────────────────────────────────────────────────────────────┐
│              PEAK HANDLING CHECKLIST                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BEFORE (Planning):                                                  │
│  □ Measure peak-to-average ratio historically                       │
│  □ Identify predictable vs unpredictable peaks                     │
│  □ Set up auto-scaling policies                                    │
│  □ Define graceful degradation levels                              │
│  □ Load test at 2x expected peak                                   │
│  □ Pre-provision for known events                                  │
│                                                                      │
│  DURING (Execution):                                                 │
│  □ Monitor real-time load vs capacity                              │
│  □ Auto-scaling responding appropriately                           │
│  □ Degradation kicking in at thresholds                           │
│  □ War room staffed for major events                              │
│                                                                      │
│  AFTER (Review):                                                     │
│  □ Compare actual vs expected peak                                 │
│  □ Review any failures or degradation                              │
│  □ Update capacity models                                          │
│  □ Improve for next time                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Formulas

```
Peak-to-Average Ratio = Peak QPS / Average QPS

Required Capacity = Peak QPS × (1 + Headroom) / QPS per Server

Auto-Scale Trigger = Current Load / Target Utilization × Current Servers

Cost Optimization = (Reserved × Low Price) + (On-demand × Full Price) + (Spot × Low Price)
```

### Golden Rules

1. **Can't scale your way out in real-time** — Pre-provision for known peaks
2. **Test at 2x expected peak** — Your estimates are usually low
3. **Graceful degradation > Total failure** — Partial service beats no service
4. **Monitor leading indicators** — Scale before you hit limits
5. **Auto-scaling has lag** — 3-5 minutes for VMs, 30-60 seconds for containers

---

**Next**: `22_Storage_Estimation.md` - Calculating storage requirements for your system