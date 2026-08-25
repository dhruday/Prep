# Meta — E5 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | E5 Software Engineer |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + Execution)
- **Rejection Reason:** Execution round — couldn't articulate how to prioritize shipping features vs tech debt for a new product

---

## Round 1: Coding 1
**Duration:** 40 minutes

### Questions Asked
1. **Find All Anagrams in a String** (LeetCode 438) — sliding window
2. **Follow-up: What if the pattern is very large (1M chars)?**

### 💡 Sliding Window

```java
public List<Integer> findAnagrams(String s, String p) {
    List<Integer> result = new ArrayList<>();
    if (s.length() < p.length()) return result;
    
    int[] pCount = new int[26];
    int[] sCount = new int[26];
    
    // Initialize window
    for (int i = 0; i < p.length(); i++) {
        pCount[p.charAt(i) - 'a']++;
        sCount[s.charAt(i) - 'a']++;
    }
    
    if (Arrays.equals(pCount, sCount)) result.add(0);
    
    // Slide window
    for (int i = p.length(); i < s.length(); i++) {
        sCount[s.charAt(i) - 'a']++;             // Add right
        sCount[s.charAt(i - p.length()) - 'a']--; // Remove left
        
        if (Arrays.equals(pCount, sCount)) {
            result.add(i - p.length() + 1);
        }
    }
    
    return result;
}
// Time: O(n * 26) = O(n), Space: O(1)

// Optimized: use "matches" counter to avoid comparing arrays
public List<Integer> findAnagramsOptimized(String s, String p) {
    List<Integer> result = new ArrayList<>();
    if (s.length() < p.length()) return result;
    
    int[] count = new int[26]; // Combined: p increments, s decrements
    for (char c : p.toCharArray()) count[c - 'a']++;
    
    int matches = 0; // How many of 26 chars match (count == 0)
    // Initialize
    for (int i = 0; i < 26; i++) if (count[i] == 0) matches++;
    
    for (int i = 0; i < p.length(); i++) {
        int idx = s.charAt(i) - 'a';
        count[idx]--;
        if (count[idx] == 0) matches++;
        else if (count[idx] == -1) matches--; // Was 0, now -1
    }
    
    if (matches == 26) result.add(0);
    
    for (int i = p.length(); i < s.length(); i++) {
        // Add right
        int rIdx = s.charAt(i) - 'a';
        count[rIdx]--;
        if (count[rIdx] == 0) matches++;
        else if (count[rIdx] == -1) matches--;
        
        // Remove left
        int lIdx = s.charAt(i - p.length()) - 'a';
        count[lIdx]++;
        if (count[lIdx] == 0) matches++;
        else if (count[lIdx] == 1) matches--;
        
        if (matches == 26) result.add(i - p.length() + 1);
    }
    
    return result;
}
// True O(n) — each step is O(1) instead of O(26)
```

---

## Round 2: Coding 2
**Duration:** 40 minutes

### Questions Asked
1. **Interval List Intersections** (LeetCode 986)
2. **Follow-up: K sorted interval lists — find all pairwise intersections**

### 💡 Interval List Intersections

```java
public int[][] intervalIntersection(int[][] firstList, int[][] secondList) {
    List<int[]> result = new ArrayList<>();
    int i = 0, j = 0;
    
    while (i < firstList.length && j < secondList.length) {
        int lo = Math.max(firstList[i][0], secondList[j][0]);
        int hi = Math.min(firstList[i][1], secondList[j][1]);
        
        if (lo <= hi) {
            result.add(new int[]{lo, hi});
        }
        
        // Advance the one that ends first
        if (firstList[i][1] < secondList[j][1]) i++;
        else j++;
    }
    
    return result.toArray(new int[0][]);
}
// Time: O(m + n), Space: O(1) excluding output

// Follow-up: K sorted interval lists
// Use merge all K lists first (like merge K sorted lists with min-heap)
// Then do line sweep on merged intervals to find all intersections
// Time: O(N log K) where N = total intervals, K = number of lists
```

---

## Round 3: System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Facebook Marketplace**
   - Product listings with images
   - Search by category, location, price
   - Buyer-seller messaging
   - Trust & safety

### 💡 Key Architecture Points

```
Facebook Marketplace:
┌──────────────────────────────────────────────────────────────┐
│  Listing Service:                                             │
│  - Create listing: title, description, price, category,      │
│    images (max 10), location, condition                      │
│  - Images: upload to CDN, generate thumbnails (150, 400, 800)│
│  - Content moderation: ML model for prohibited items         │
│    (weapons, drugs, counterfeit) + human review queue        │
│                                                                │
│  Search:                                                      │
│  - Elasticsearch for full-text + faceted search              │
│  - Geo-spatial: filter by distance (geo_distance query)      │
│  - Ranking: relevance × recency × seller_trust_score         │
│                                                                │
│  Discovery Feed:                                              │
│  - Personalized: based on browse history, similar users      │
│  - Location-first: items within 50km radius weighted higher  │
│  - Category affinity: user who bought electronics → show more│
│                                                                │
│  Messaging:                                                   │
│  - Reuse Messenger infrastructure (no separate system)       │
│  - Context-aware: message auto-includes listing link/preview │
│  - Quick reply templates: "Is this available?", "What's the  │
│    lowest price?"                                             │
│                                                                │
│  Trust & Safety:                                               │
│  - Seller trust score: based on response rate, completion    │
│    rate, reviews, account age, identity verification          │
│  - Scam detection: ML model on message patterns              │
│    (external links, urgency language, requesting off-platform │
│    payment)                                                   │
│  - Image similarity: detect reposted/stolen product images   │
│  - Price anomaly: flag items priced far below market          │
│                                                                │
│  Commerce:                                                     │
│  - Buy It Now with Facebook Pay (checkout within app)        │
│  - Shipping: integrated with carriers, label generation      │
│  - Local pickup: meet-up location suggestion (public places) │
│  - Purchase protection: refund policy for shipped items      │
│                                                                │
│  Scale:                                                        │
│  - 1B+ monthly users, 100M+ active listings                 │
│  - Images: CDN with lazy loading + progressive JPEG          │
│  - Feed: precomputed for active users, computed on-demand    │
│    for inactive (trade-off: compute vs storage)              │
│  - Search: distributed ES cluster, sharded by location       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meta E5 = **coding speed (40 min!) + system design + execution signal**
- **Find All Anagrams**: optimized sliding window with "matches" counter — true O(n)
- **Interval Intersections**: two-pointer, advance the one that ends first
- **Meta's Execution round**: unique to Meta — tests ability to prioritize, ship, and make tradeoffs
- **Marketplace SD**: leverage existing Meta infra (Messenger, Facebook Pay, CDN)
- **Trust & Safety** is critical: scam detection, content moderation, price anomaly detection
- Meta rejected on **Execution**: couldn't articulate feature shipping vs tech debt prioritization framework
  - **Should have said**: "Ship first iteration fast → measure impact → invest in tech debt only if the feature gains traction"
- At Meta, **coding is king** — prepare to solve 2 mediums in 40 minutes

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Sliding Window, Anagram |
| Coding 2 | Medium | Two Pointers, Intervals |
| System Design | Hard | Marketplace, Trust & Safety |
| Execution | Very Hard | Prioritization, Shipping |
| Behavioral | Medium | Meta Values |
