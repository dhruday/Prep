# Meta — E5 FullStack Interview Experience (2025) — #10

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer E5 |
| **Level** | E5 (Senior) |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Facebook Marketplace |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + Product Sense)

---

## Round 1: Coding
**Duration:** 40 minutes

### Questions Asked
1. **Minimum Number of Swaps to Sort** (Medium)
2. **Follow-up: Count minimum swaps for cyclic permutation**

### 💡 Minimum Swaps to Sort (Cycle Decomposition)

```java
/**
 * Key insight: Every permutation can be decomposed into cycles.
 * A cycle of length k requires (k - 1) swaps to sort.
 * Total swaps = sum of (cycle_length - 1) for all cycles = n - number_of_cycles.
 * 
 * Example: [4, 3, 1, 2]
 * Index:    0  1  2  3
 * Mapping: 0→2→1→3→0 (one cycle of length 4 → 3 swaps)
 * 
 * Example: [2, 0, 1, 4, 3]
 * Cycle 1: 0→2→1→0 (length 3 → 2 swaps)
 * Cycle 2: 3→4→3   (length 2 → 1 swap)
 * Total: 3 swaps
 */
int minSwaps(int[] arr) {
    int n = arr.length;
    
    // Create pairs of (value, originalIndex) and sort by value
    int[][] indexed = new int[n][2];
    for (int i = 0; i < n; i++) {
        indexed[i] = new int[]{arr[i], i};
    }
    Arrays.sort(indexed, (a, b) -> a[0] - b[0]);
    
    boolean[] visited = new boolean[n];
    int swaps = 0;
    
    for (int i = 0; i < n; i++) {
        // Already in correct position or already processed
        if (visited[i] || indexed[i][1] == i) continue;
        
        // Trace the cycle
        int cycleLength = 0;
        int j = i;
        while (!visited[j]) {
            visited[j] = true;
            j = indexed[j][1]; // Follow the permutation
            cycleLength++;
        }
        
        swaps += (cycleLength - 1);
    }
    
    return swaps;
}
// Time: O(n log n) for sorting | Space: O(n)
```

---

## Round 2: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Facebook Marketplace** (Buy/Sell Platform)
   - Listing creation with images
   - Location-based search: show items near user
   - Category browsing and filters
   - Messaging between buyer and seller (already exists)
   - Trust & Safety: scam detection, prohibited items
   - Scale: 1B monthly active users, 200M listings

### 💡 Facebook Marketplace System Design

```
Architecture:
┌─────────────────────────────────────────────────────────┐
│                        CDN                               │
│    (Listing images, static assets, pre-rendered pages)   │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│               API Gateway                                │
│    (Auth, rate limiting, request routing)                 │
└──────┬───────────┬──────────────┬───────────────────────┘
       │           │              │
┌──────▼───┐ ┌────▼──────┐ ┌────▼──────────┐
│ Listing  │ │ Search    │ │ Trust &       │
│ Service  │ │ Service   │ │ Safety        │
└──────┬───┘ └────┬──────┘ └────┬──────────┘
       │          │              │
       │          │              │
┌──────▼──────────▼──────────────▼────────────────────────┐
│                   Data Layer                              │
│  ┌─────────────┐ ┌────────────┐ ┌────────────────────┐  │
│  │ MySQL/TAO   │ │ Elasticsearch│ │ Redis (geo cache) │  │
│  │ (listings)  │ │ (search index)│ │                   │  │
│  └─────────────┘ └────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Listing Creation Flow:
1. User uploads photos (max 10, max 4MB each)
   → Images uploaded to blob storage (via pre-signed URL)
   → Image Processing Service:
     - Resize: thumbnail (200px), medium (600px), large (1200px)
     - Format: WebP + JPEG fallback
     - Content moderation: ML model scans for prohibited items
       (weapons, drugs, counterfeit goods, adult content)
     - EXIF stripping (privacy: remove GPS data)
   
2. User submits listing metadata
   → POST /api/marketplace/listings
   {
     "title": "iPhone 15 Pro Max 256GB",
     "description": "Like new, 3 months old...",
     "price": 899.00,
     "currency": "USD",
     "category": "electronics/phones",
     "condition": "like_new",
     "location": { "lat": 37.4, "lng": -122.1 },
     "imageIds": ["img-001", "img-002", "img-003"],
     "deliveryOptions": ["local_pickup", "shipping"]
   }
   
3. Trust & Safety check (async, < 30 seconds)
   → Text classifier: scam patterns ("wire transfer", "send code")
   → Price anomaly: iPhone listed for $10 → suspicious
   → Seller reputation: new account + luxury item → higher scrutiny
   → Category-specific rules: vehicles need VIN, housing needs fair-housing compliance
   
4. If approved → listing goes live
   → Index in Elasticsearch
   → Notify followers of seller
   → Category counters updated (Kafka → aggregation consumer)

Location-Based Search:
┌─────────────────────────────────────────────────┐
│ Elasticsearch with geo_distance query:           │
│                                                  │
│ GET /marketplace/_search                         │
│ {                                                │
│   "query": {                                     │
│     "bool": {                                    │
│       "must": [                                  │
│         { "match": { "title": "iphone" } },      │
│         { "term": { "status": "active" } }       │
│       ],                                         │
│       "filter": [                                │
│         {                                        │
│           "geo_distance": {                      │
│             "distance": "50km",                  │
│             "location": { "lat": 37.4, "lon": -122.1 }│
│           }                                      │
│         },                                       │
│         { "range": { "price": { "gte": 500, "lte": 1200 }}}│
│         { "term": { "condition": "like_new" } }  │
│       ]                                          │
│     }                                            │
│   },                                             │
│   "sort": [                                      │
│     { "_geo_distance": { "location": "37.4,-122.1", "order": "asc" } },│
│     { "_score": "desc" }                         │
│   ]                                              │
│ }                                                │
│                                                  │
│ Ranking factors:                                 │
│ 1. Distance (nearest first, decayed)             │
│ 2. Relevance score (BM25 on title/description)   │
│ 3. Listing freshness (newer = higher)            │
│ 4. Seller reputation score                       │
│ 5. Photo quality (has photos > no photos)        │
│ 6. Price competitiveness (vs similar listings)    │
│                                                  │
│ Pre-computed geo cells (H3 hex):                 │
│ • Resolution 4 (~173km): country-level cache     │
│ • Resolution 7 (~1.2km): city-level cache        │
│ • Cache popular searches per H3 cell in Redis    │
└─────────────────────────────────────────────────┘

Trust & Safety Pipeline:
Listing Created → Kafka → 
  ├── Image Moderation (ML: ResNet classifier)
  │   → prohibited_item: 0.95 → AUTO_REJECT
  │   → borderline: 0.5-0.8 → HUMAN_REVIEW queue
  │
  ├── Text Moderation (NLP: BERT classifier)
  │   → scam_patterns: "send gift card", "western union"
  │   → prohibited: "prescription drugs", weapons keywords
  │
  ├── Price Anomaly Detection
  │   → Compare to median price for category + condition
  │   → If price < 20% of median → flag for review
  │
  └── Seller Risk Score
      → Account age, verification status, past violations
      → High-risk sellers: stricter moderation thresholds
```

---

## 🎯 Key Takeaways
- Meta E5 = **Cycle decomposition for swaps + Marketplace system design**
- **Minimum swaps = n - number_of_cycles**: decompose permutation into cycles, each cycle of length k needs k-1 swaps
- **Marketplace search**: Elasticsearch `geo_distance` filter + BM25 relevance + custom ranking factors
- **Trust & Safety**: multi-signal (image ML + text NLP + price anomaly + seller risk) — async pipeline, < 30s
- **Image pipeline**: upload to blob → resize (3 sizes) → content moderation → EXIF strip → CDN
- **H3 hex grid**: pre-computed geo cells for caching popular searches per region — reduces ES load
- **Scam detection patterns**: "wire transfer", unrealistically low prices, new accounts listing luxury items
- Meta E5: expect **2 coding rounds** (40 min each) — must solve quickly to get follow-ups

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Cycle Decomposition, Permutations |
| Coding 2 | Hard | Graph / DP |
| System Design | Hard | Marketplace, Geo Search, Trust & Safety |
| Behavioral | Medium | Signal, Impact, Collaboration |
| Product Sense | Medium | Marketplace product decisions |
