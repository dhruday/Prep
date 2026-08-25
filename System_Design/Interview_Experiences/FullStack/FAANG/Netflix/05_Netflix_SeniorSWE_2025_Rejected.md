# Netflix — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Netflix-Interview-Questions-E11891.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + System Design + Coding + Culture Fit + HM)
- **Rejection Reason:** Culture fit round — couldn't articulate "freedom and responsibility" examples

---

## Round 1: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's A/B Testing Platform**
   - Run experiments on UI features, recommendation algorithms, encoding
   - Traffic allocation: percentage-based, mutual exclusion between experiments
   - Metrics collection and statistical significance analysis
   - Feature flagging with gradual rollout

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                 Client SDKs                           │
│   iOS / Android / Web / Smart TV / Backend Services   │
│   SDK: getExperiment(userId, experimentKey) → variant │
└──────────┬───────────────────────────┬───────────────┘
           │ REST (at startup)          │ Events (streaming)
   ┌───────▼────────┐         ┌────────▼───────────┐
   │ Assignment      │         │ Metrics Collection │
   │ Service         │         │ Service            │
   │ - Deterministic │         │ - impression logs  │
   │   hashing       │         │ - engagement events│
   │ - Targeting     │         │ - conversion events│
   │ - Mutual excl.  │         │                    │
   └───────┬────────┘         └────────┬───────────┘
           │                            │
    ┌──────▼──────┐             ┌──────▼──────┐
    │ Experiment   │             │ Apache Kafka│
    │ Config (DB)  │             │ → Spark     │
    │ + Redis cache│             │ → Druid     │
    └─────────────┘             └─────────────┘

Assignment Algorithm (Deterministic + Sticky):
class ExperimentAssigner {
    Variant assign(String userId, Experiment experiment) {
        // 1. Check override (internal testing)
        if (overrides.has(userId, experiment.id)) {
            return overrides.get(userId, experiment.id);
        }
        
        // 2. Check targeting rules (e.g., country, device, plan tier)
        if (!experiment.targeting.matches(getUserAttributes(userId))) {
            return Variant.CONTROL; // Not eligible
        }
        
        // 3. Deterministic hash for stable assignment
        long hash = murmurHash3(userId + ":" + experiment.salt);
        int bucket = (int)(Math.abs(hash) % 10000); // 0-9999 (0.01% granularity)
        
        // 4. Check mutual exclusion layer
        if (experiment.exclusionGroup != null) {
            int layerBucket = (int)(Math.abs(murmurHash3(userId + ":" + experiment.exclusionGroup)) % 10000);
            if (!experiment.layerAllocation.contains(layerBucket)) {
                return Variant.CONTROL; // Not in this experiment's layer
            }
        }
        
        // 5. Assign variant based on traffic allocation
        int cumulative = 0;
        for (Variant v : experiment.variants) {
            cumulative += v.trafficPercentage * 100; // Scale to 10000
            if (bucket < cumulative) return v;
        }
        
        return Variant.CONTROL;
    }
}

Key Design Decisions:
- Deterministic hashing (MurmurHash3): same user ALWAYS gets same variant
  No need to store assignments! Computed on-the-fly.
  Salt prevents correlation between experiments.
  
- Mutual Exclusion Groups (Layers):
  Experiments in same group share a traffic pool (10000 buckets)
  Each experiment gets non-overlapping slice
  Prevents interference between conflicting experiments
  
  Example: Layer 1: Experiment A (0-4999), Experiment B (5000-9999)
  User can be in A OR B, never both.
  
- Gradual Rollout:
  Start at 1% → measure → ramp to 5% → 10% → 50% → 100%
  Ramp by increasing traffic_percentage in config
  Salt stays same → original users keep their variant
  
- Statistical Significance:
  Metrics → Spark aggregation → Druid for real-time dashboards
  T-test / Chi-square for significance
  Sequential testing: monitor p-value with alpha-spending function
  Guardrail metrics: if quality of service degrades, auto-kill experiment

Experiment Config Schema:
{
  "id": "homepage_row_order_v2",
  "salt": "abc123",
  "status": "RUNNING",
  "targeting": {
    "countries": ["US", "CA"],
    "plan_tiers": ["premium", "standard"],
    "device_types": ["smart_tv", "web"]
  },
  "exclusion_group": "homepage_layout",
  "variants": [
    { "id": "control", "traffic_pct": 50, "config": { "row_order": "default" } },
    { "id": "treatment_a", "traffic_pct": 25, "config": { "row_order": "trending_first" } },
    { "id": "treatment_b", "traffic_pct": 25, "config": { "row_order": "personalized" } }
  ],
  "guardrails": { "min_play_rate": 0.15, "max_error_rate": 0.01 },
  "start_date": "2025-03-01",
  "end_date": "2025-04-01"
}

Scale:
- 200M users, 500+ concurrent experiments
- Assignment latency: < 5ms (cached config + in-memory hash)
- Metrics: 10B events/day → Kafka → Spark → Druid
- Dashboard: near real-time (5-min aggregation windows)
```

---

## Round 2: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Task Scheduler** (LeetCode 621)

### 💡 Task Scheduler (Greedy)

```java
public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;
    
    Arrays.sort(freq);
    int maxFreq = freq[25];
    // Count how many tasks have the maximum frequency
    int maxCount = 0;
    for (int f : freq) {
        if (f == maxFreq) maxCount++;
    }
    
    // Formula: (maxFreq - 1) * (n + 1) + maxCount
    // Explanation: We need (maxFreq-1) full cycles of (n+1) slots each,
    //              plus a final partial cycle with maxCount tasks
    int result = (maxFreq - 1) * (n + 1) + maxCount;
    
    // But if we have many unique tasks, we might not need idle slots
    return Math.max(result, tasks.length);
}
// Time: O(n), Space: O(1)
// Example: tasks=[A,A,A,B,B,C], n=2
// → maxFreq=3 (A), maxCount=1
// → (3-1)*(2+1)+1 = 7 → A_B_C_A_B__A → "ABCAB_A" = 7
```

---

## 🎯 Key Takeaways
- Netflix = **A/B testing + streaming infra + culture fit is CRITICAL**
- **Deterministic hashing**: MurmurHash(userId + salt) — no storage needed for assignments
- **Mutual exclusion layers**: split traffic pool into non-overlapping slices per experiment group
- **Salt per experiment**: prevents hash correlation — users get independent random assignments
- **Gradual rollout**: increase traffic_pct, keep salt → existing users stable, new users added
- **Guardrail metrics**: auto-kill experiments if KPIs degrade (play_rate, error_rate)
- **Task Scheduler**: greedy formula `(maxFreq-1)*(n+1)+maxCount` — no simulation needed
- Netflix culture: "freedom and responsibility" — prepare concrete examples of autonomous decision-making

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| System Design | Hard | A/B Testing, Hashing, Statistical Significance |
| Coding | Medium | Greedy, Task Scheduler |
| Culture Fit | Hard | Netflix Values, F&R Examples |
| HM | Medium | Leadership, Technical Vision |
