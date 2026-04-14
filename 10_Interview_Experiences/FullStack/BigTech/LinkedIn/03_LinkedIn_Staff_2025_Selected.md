# LinkedIn — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Software Engineer |
| **Level** | Senior+ |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Design Review + HM)
- **Timeline:** 3 weeks

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design Underground System** (LeetCode 1396)
2. **Follow-up: P50, P90, P99 latency for each route**

### 💡 Underground System

```java
class UndergroundSystem {
    // Customer check-in: id → (station, time)
    private final Map<Integer, String[]> checkIns;
    // Route stats: "stationA→stationB" → totalTime, count
    private final Map<String, double[]> routeStats;
    // Follow-up: keep all individual trip times for percentiles
    private final Map<String, List<Double>> routeTimes;
    
    UndergroundSystem() {
        checkIns = new HashMap<>();
        routeStats = new HashMap<>();
        routeTimes = new HashMap<>();
    }
    
    void checkIn(int id, String stationName, int t) {
        checkIns.put(id, new String[]{stationName, String.valueOf(t)});
    }
    
    void checkOut(int id, String stationName, int t) {
        String[] checkIn = checkIns.remove(id);
        String route = checkIn[0] + "→" + stationName;
        double tripTime = t - Integer.parseInt(checkIn[1]);
        
        routeStats.computeIfAbsent(route, k -> new double[]{0, 0});
        double[] stats = routeStats.get(route);
        stats[0] += tripTime; // total time
        stats[1] += 1;        // count
        
        // Follow-up: store individual times
        routeTimes.computeIfAbsent(route, k -> new ArrayList<>()).add(tripTime);
    }
    
    double getAverageTime(String startStation, String endStation) {
        String route = startStation + "→" + endStation;
        double[] stats = routeStats.get(route);
        return stats[0] / stats[1];
    }
    
    // Follow-up: Percentile latency
    double getPercentile(String startStation, String endStation, double percentile) {
        String route = startStation + "→" + endStation;
        List<Double> times = routeTimes.get(route);
        if (times == null || times.isEmpty()) return 0;
        
        List<Double> sorted = new ArrayList<>(times);
        Collections.sort(sorted);
        
        double index = (percentile / 100.0) * (sorted.size() - 1);
        int lower = (int) Math.floor(index);
        int upper = (int) Math.ceil(index);
        
        if (lower == upper) return sorted.get(lower);
        
        // Linear interpolation
        double fraction = index - lower;
        return sorted.get(lower) * (1 - fraction) + sorted.get(upper) * fraction;
    }
    
    // Usage: getPercentile("A", "B", 50)  → P50 (median)
    //        getPercentile("A", "B", 90)  → P90
    //        getPercentile("A", "B", 99)  → P99
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn's Job Recommendation Engine**
   - Personalized job suggestions, skill matching, company preferences, location

### 💡 Interview-Ready Answer

```
LinkedIn Job Recommendations:
┌──────────────────────────────────────────────────────────────┐
│  Signal Collection:                                           │
│  - Explicit: skills, title, experience, location preferences │
│  - Implicit: jobs viewed, applied, saved, dismissed          │
│  - Time-based: recency decay (view 3 days ago < today)       │
│  - Social: connections' companies, industry graph             │
│                                                                │
│  Feature Engineering:                                         │
│  1. Profile-Job Similarity:                                  │
│     - Skill overlap: Jaccard(user_skills, job_skills)        │
│     - Title similarity: word2vec(user_title, job_title)      │
│     - Experience match: |user_yoe - job_min_yoe| normalized  │
│     - Location match: geo_distance or "Remote" flag          │
│     - Seniority alignment: entry/mid/senior/exec match       │
│                                                                │
│  2. Engagement Score:                                         │
│     - Similar users who applied to this job (collaborative)  │
│     - Apply rate for this job posting                        │
│     - Company response rate to similar profiles              │
│                                                                │
│  3. Quality Signals:                                          │
│     - Job freshness (posted today > posted 2 weeks ago)      │
│     - Company reputation score                               │
│     - Complete job description (longer description = better) │
│     - Salary competitiveness for role/location               │
│                                                                │
│  Ranking Pipeline:                                            │
│  ┌──────────────────────────────────────────────┐            │
│  │ Stage 1: Candidate Retrieval (100K → 1K)     │            │
│  │ - Elasticsearch query with skill/title/location│           │
│  │ - ANN (Approximate Nearest Neighbor) on        │           │
│  │   embedding space: user_vec ≈ job_vec           │           │
│  │ - FAISS index for fast similarity search        │           │
│  └──────────────┬──────────────────────────────┘            │
│                  │                                            │
│  ┌──────────────▼──────────────────────────────┐            │
│  │ Stage 2: Scoring (1K → 100)                  │            │
│  │ - Gradient Boosted Trees (XGBoost/LightGBM)   │           │
│  │ - Features: profile-job similarity, engagement, │          │
│  │   quality signals, social features               │          │
│  │ - Training: click-through + apply as positive   │           │
│  │ - Loss: cross-entropy with position bias         │          │
│  └──────────────┬──────────────────────────────┘            │
│                  │                                            │
│  ┌──────────────▼──────────────────────────────┐            │
│  │ Stage 3: Re-Ranking (100 → 25)               │            │
│  │ - Diversity: don't show 10 jobs from same company│         │
│  │ - Freshness boost: recently posted jobs up      │           │
│  │ - Business rules: sponsored jobs interleaved    │           │
│  │ - Already applied/dismissed: filter out          │          │
│  └──────────────────────────────────────────────┘            │
│                                                                │
│  Offline vs Online:                                           │
│  Offline (daily):                                             │
│  - Retrain ranking model on new click/apply data             │
│  - Rebuild FAISS index with new job embeddings               │
│  - Pre-compute user embeddings                               │
│                                                                │
│  Online (per request):                                        │
│  - Real-time feature computation (user's recent activity)    │
│  - Candidate retrieval + scoring + re-ranking                │
│  - Latency budget: <200ms total                              │
│                                                                │
│  A/B Testing:                                                 │
│  - Key metrics: apply rate, session time, email click-through│
│  - Guardrail metrics: user satisfaction, recommendation      │
│    diversity, fair representation (no discrimination)         │
│                                                                │
│  Fairness:                                                    │
│  - No age, gender, race in features (legally required)       │
│  - Audit: equal opportunity across demographics              │
│  - Salary transparency: show range when available            │
│                                                                │
│  Scale:                                                       │
│  - 30M+ active job postings                                  │
│  - 900M+ members                                             │
│  - 200K+ recommendation requests/sec at peak                 │
│  - <200ms P99 latency                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: Design Review
**Duration:** 60 minutes

### Questions Asked
1. **Review an existing Content Distribution System's architecture**
   - Identify bottlenecks, suggest improvements, discuss trade-offs

### Key Points Discussed:
- **Fan-out problem**: LinkedIn Feed = fan-out on write for users with <5K connections, fan-out on read for influencers (hybrid approach like Twitter)
- **Cache invalidation**: when user updates post, invalidate all followers' feed caches → too expensive → use TTL-based cache with fresh content mixed in
- **Hot partition**: celebrity posts → consistent hashing with virtual nodes, but still hot → replicate hot keys across N read replicas

---

## 🎯 Key Takeaways
- LinkedIn Staff = **recommendation systems + data pipelines + design review**
- **Underground System** — HashMap-based tracking, percentile calculation with sorted array
- **Job Recommendations**: 3-stage funnel (retrieval → scoring → re-ranking)
- **FAISS** for approximate nearest neighbor search on embeddings — know this
- **Fairness in ML**: legally can't use protected attributes, must audit for bias
- **Design Review** round = unique to LinkedIn — review existing system, find bottlenecks
- **Fan-out**: hybrid approach for different user types (normal users vs influencers)
- LinkedIn values **data-driven decisions** and **measuring recommendation quality**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium | HashMap Design, Percentiles |
| System Design | Very Hard | Recommendation Engine, ML Pipeline |
| Design Review | Very Hard | Fan-Out, Cache Invalidation, Hot Keys |
| HM | Medium | Behavioral, Leadership |
