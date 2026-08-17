# Netflix — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior Software Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Culture)
- **Timeline:** 3 weeks
- **Notes:** Netflix pays top of market — no equity vesting, all cash

---

## Round 1: Phone Screen
**Duration:** 60 minutes

### Questions Asked
1. **Design a Streaming Bitrate Adaptation Algorithm**
   - Given buffer level, bandwidth estimates, and quality tiers — select optimal quality

### 💡 Interview-Ready Answer (ABR — Adaptive Bitrate)

```java
class AdaptiveBitrateSelector {
    // Quality tiers: [bitrate_kbps, resolution]
    static final int[][] TIERS = {
        {300, 240}, {700, 360}, {1500, 480}, {3000, 720},
        {5000, 1080}, {8000, 1440}, {15000, 2160}
    };
    
    double bufferSeconds;    // Current buffer level
    double bandwidthKbps;    // Estimated bandwidth (EWMA)
    int currentTierIndex;
    
    // EWMA bandwidth estimation
    double ewmaFast = 0, ewmaSlow = 0;
    static final double ALPHA_FAST = 0.5;
    static final double ALPHA_SLOW = 0.1;
    
    void updateBandwidthEstimate(double measuredKbps) {
        ewmaFast = ALPHA_FAST * measuredKbps + (1 - ALPHA_FAST) * ewmaFast;
        ewmaSlow = ALPHA_SLOW * measuredKbps + (1 - ALPHA_SLOW) * ewmaSlow;
        // Use minimum of fast and slow to be conservative
        bandwidthKbps = Math.min(ewmaFast, ewmaSlow);
    }
    
    int selectQuality() {
        // Rule 1: If buffer critically low (<5s), drop to minimum
        if (bufferSeconds < 5) {
            return 0; // Lowest quality to prevent rebuffer
        }
        
        // Rule 2: If buffer healthy (>30s), can try upgrading
        // Only upgrade if bandwidth supports it with safety margin (0.8x)
        int bestTier = 0;
        for (int i = 0; i < TIERS.length; i++) {
            if (TIERS[i][0] < bandwidthKbps * 0.8) {
                bestTier = i;
            }
        }
        
        // Rule 3: Don't jump more than 1 tier at a time (avoid oscillation)
        if (bestTier > currentTierIndex + 1) {
            bestTier = currentTierIndex + 1;
        }
        
        // Rule 4: Buffer-based bonus — if buffer > 30s, allow one extra tier
        if (bufferSeconds > 30 && bestTier < TIERS.length - 1) {
            bestTier = Math.min(bestTier + 1, TIERS.length - 1);
        }
        
        // Rule 5: Hysteresis — require sustained bandwidth before upgrading
        // Only upgrade if bandwidth was sufficient for last 3 segments
        
        currentTierIndex = bestTier;
        return bestTier;
    }
}
```

---

## Round 2: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Minimum Window Subsequence** (LeetCode 727) — Hard
2. **Follow-up: Multiple occurrences, return all non-overlapping windows**

### 💡 Interview-Ready Answer

```java
// Find smallest window in s1 that contains s2 as subsequence
public String minWindow(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    
    // dp[i][j] = starting index of min window in s1[0..i] that contains s2[0..j] as subsequence
    // But that's O(m*n) space. Better approach: two-pointer with forward-backward pass.
    
    String result = "";
    int minLen = Integer.MAX_VALUE;
    int j = 0; // pointer for s2
    
    for (int i = 0; i < m; i++) {
        if (s1.charAt(i) == s2.charAt(j)) {
            j++;
            if (j == n) {
                // Found all chars of s2. Now shrink from left.
                int end = i;
                j--;
                while (j >= 0) {
                    if (s1.charAt(i) == s2.charAt(j)) j--;
                    i--;
                }
                i++; // start of window
                
                if (end - i + 1 < minLen) {
                    minLen = end - i + 1;
                    result = s1.substring(i, end + 1);
                }
                
                j = 0; // Reset s2 pointer
                // Start searching from i+1
            }
        }
    }
    
    return result;
}
// Time: O(m * n) worst case, Space: O(1)
```

---

## Round 3: Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Alien Dictionary** (LeetCode 269) — Topological Sort from lexicographic ordering
2. **Follow-up: Detect invalid dictionary (cycle or contradictory ordering)**

### 💡 Interview-Ready Answer

```java
public String alienOrder(String[] words) {
    // Build graph from adjacent word pairs
    Map<Character, Set<Character>> graph = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();
    
    // Initialize all characters
    for (String word : words) {
        for (char c : word.toCharArray()) {
            graph.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }
    }
    
    // Compare adjacent words to find ordering
    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        
        // Edge case: "abc" before "ab" → INVALID
        if (w1.length() > w2.length() && w1.startsWith(w2)) return "";
        
        for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {
            char c1 = w1.charAt(j), c2 = w2.charAt(j);
            if (c1 != c2) {
                if (graph.get(c1).add(c2)) { // New edge
                    inDegree.merge(c2, 1, Integer::sum);
                }
                break; // Only first difference matters
            }
        }
    }
    
    // Topological sort (BFS)
    Queue<Character> queue = new LinkedList<>();
    for (var entry : inDegree.entrySet()) {
        if (entry.getValue() == 0) queue.offer(entry.getKey());
    }
    
    StringBuilder result = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        result.append(c);
        
        for (char next : graph.get(c)) {
            inDegree.merge(next, -1, Integer::sum);
            if (inDegree.get(next) == 0) queue.offer(next);
        }
    }
    
    // If not all characters included → cycle exists → invalid
    if (result.length() != inDegree.size()) return "";
    
    return result.toString();
}
// Time: O(C) where C = total characters in all words
// Space: O(U + E) where U = unique characters, E = edges
```

---

## Round 4: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's Content Recommendation Engine**

### 💡 Interview-Ready Answer

```
Netflix Recommendation System:
┌──────────────────────────────────────────────────────────────┐
│  Scale: 250M+ subscribers, 50K+ titles, personalized homepages│
│                                                                │
│  Signal Sources (ranked by importance):                       │
│  1. Viewing history: what, when, how long, completion rate   │
│  2. Search queries: intent signals                           │
│  3. Rating/thumbs: explicit preference                       │
│  4. Browse behavior: hover time, scroll depth                │
│  5. Context: device, time of day, day of week                │
│  6. Social: what similar users watched (collaborative filter)│
│                                                                │
│  Algorithms (Netflix uses all of these):                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Collaborative Filtering (CF):                       │  │
│  │    - Matrix Factorization (SVD++):                     │  │
│  │      User×Item matrix → U(user factors) × V(item)     │  │
│  │      predict(u,i) = U[u] · V[i] + bias                │  │
│  │    - Deep CF: neural network replaces dot product      │  │
│  │                                                        │  │
│  │ 2. Content-Based:                                      │  │
│  │    - Embed title features: genre, cast, director,      │  │
│  │      themes, visual style, country, language           │  │
│  │    - User profile = weighted avg of watched items      │  │
│  │    - Score = cosine(user_profile, item_embedding)      │  │
│  │                                                        │  │
│  │ 3. Contextual Bandits:                                 │  │
│  │    - Explore-exploit: surface new content while        │  │
│  │      optimizing for engagement                         │  │
│  │    - Thompson Sampling for row ordering on homepage    │  │
│  │                                                        │  │
│  │ 4. Ensemble: blend all models with learned weights     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Offline    │  │ Nearline     │  │ Online          │       │
│  │ (daily)    │  │ (realtime)   │  │ (per request)    │      │
│  │            │  │              │  │                  │       │
│  │ Train      │  │ Update user  │  │ Candidate gen   │       │
│  │ models     │  │ features on  │  │ → Ranking       │       │
│  │            │  │ new views    │  │ → Re-rank       │       │
│  │ Generate   │  │              │  │ (diversity,     │       │
│  │ candidates │  │ Kafka streams│  │  freshness)     │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                                                                │
│  Homepage Generation:                                         │
│  Each row = "Because you watched X" / "Trending" / "Genre"  │
│  1. Generate 200 candidate rows per user (offline)           │
│  2. Select top 40 rows (online, based on context)            │
│  3. For each row: select 30-75 titles from that category     │
│  4. Rank within each row (personalized)                      │
│  5. Artwork: select best thumbnail per title per user!       │
│     (A/B tested: users click more on personalized artwork)   │
│                                                                │
│  Storage:                                                     │
│  - User features: Cassandra (high write, eventual consistency)│
│  - Item features: S3 + Redis cache                           │
│  - Model artifacts: S3 → loaded to model serving containers  │
│  - Pre-computed recommendations: EVCache (Netflix's Redis)   │
│                                                                │
│  Metrics:                                                     │
│  - Primary: member retention (months subscribed)             │
│  - Secondary: hours viewed, completion rate                  │
│  - A/B testing: every model change tested on 1% of users    │
│  - Interleaving: mix recommendations from model A and B     │
│    in same page, see which gets more clicks                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Netflix Senior = **streaming algorithms + ML systems + topological sort**
- **ABR (Adaptive Bitrate)** = core streaming knowledge — EWMA bandwidth + buffer rules
- **Minimum Window Subsequence** = forward-backward two-pointer — NOT Minimum Window Substring
- **Alien Dictionary** (topological sort from word ordering) = Netflix's go-to graph question
- **Recommendation system** = collaborative filtering + content-based + contextual bandits
- Netflix's **unique design concepts**: personalized artwork, interleaving A/B tests, EVCache
- **Netflix culture fit** is critical — "Freedom & Responsibility", "Context not Control"
- Top-of-market pay: $450K-$700K total comp for L5 (all cash, no equity cliff)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | ABR Algorithm, Streaming |
| Coding 1 | Hard | Subsequence Window, Two-Pointer |
| Coding 2 | Medium-Hard | Topological Sort, Graph |
| System Design | Very Hard | Recommendation, ML Systems |
| Culture | Hard | Netflix Values, Judgment |
