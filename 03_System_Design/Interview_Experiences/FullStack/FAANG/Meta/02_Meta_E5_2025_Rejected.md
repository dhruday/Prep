# Meta — E5 (Senior SDE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta (Facebook) |
| **Role** | Software Engineer (E5) |
| **Level** | E5 (Senior) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Recruiter + 2 Coding + 1 System Design + 1 Behavioral)
- **Timeline:** Full-day onsite (5 hours)
- **Format:** Onsite, coding on laptop (CoderPad)
- **Rejection Reason:** Scored "Lean No Hire" on system design — lacked depth in data model

---

## Round 1: Coding — Ninja Round
**Duration:** 45 minutes | **Interviewer:** E5 SDE

### Questions Asked
1. **Subarray Sum Equals K** (LeetCode 560)
2. **Follow-up: What if we need all subarrays?**

### 💡 Interview-Ready Answer

```java
// Count subarrays with sum == k using prefix sum + hashmap
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1); // empty prefix sum
    
    int sum = 0, count = 0;
    for (int num : nums) {
        sum += num;
        // If (sum - k) exists as a prefix sum, those subarrays sum to k
        count += prefixCount.getOrDefault(sum - k, 0);
        prefixCount.merge(sum, 1, Integer::sum);
    }
    return count;
}
```
**Time:** O(n), **Space:** O(n)

**Follow-up: Return all subarrays**
```java
public List<int[]> allSubarraySumK(int[] nums, int k) {
    Map<Integer, List<Integer>> prefixIndices = new HashMap<>();
    prefixIndices.computeIfAbsent(0, x -> new ArrayList<>()).add(-1);
    
    List<int[]> result = new ArrayList<>();
    int sum = 0;
    for (int i = 0; i < nums.length; i++) {
        sum += nums[i];
        List<Integer> starts = prefixIndices.getOrDefault(sum - k, Collections.emptyList());
        for (int start : starts) {
            result.add(new int[]{start + 1, i}); // [inclusive start, inclusive end]
        }
        prefixIndices.computeIfAbsent(sum, x -> new ArrayList<>()).add(i);
    }
    return result;
}
```

**Edge Cases:** Negative numbers (prefix sum can revisit values), k=0 (subarrays summing to 0 exist), single element arrays.

---

## Round 2: Coding — Pirate Round
**Duration:** 45 minutes | **Interviewer:** E6 Staff SDE

### Questions Asked
1. **Binary Tree Maximum Path Sum** (LeetCode 124) — Hard
2. **Follow-up: Return the actual path**

### 💡 Interview-Ready Answer

```java
class Solution {
    int maxSum = Integer.MIN_VALUE;
    
    public int maxPathSum(TreeNode root) {
        maxGain(root);
        return maxSum;
    }
    
    // Returns max gain from this node going DOWN (single path)
    private int maxGain(TreeNode node) {
        if (node == null) return 0;
        
        // Max gain from left/right subtrees (ignore negative paths)
        int leftGain = Math.max(maxGain(node.left), 0);
        int rightGain = Math.max(maxGain(node.right), 0);
        
        // Path through this node as the "turning point" (left → node → right)
        int pathThroughNode = node.val + leftGain + rightGain;
        maxSum = Math.max(maxSum, pathThroughNode);
        
        // Return max single-direction gain (for parent's use)
        return node.val + Math.max(leftGain, rightGain);
    }
}
```
**Time:** O(n), **Space:** O(h) recursion stack

**Follow-up: Return the actual path**
```java
class PathResult {
    int maxSum = Integer.MIN_VALUE;
    List<Integer> bestPath = new ArrayList<>();
    
    public List<Integer> maxPathSum(TreeNode root) {
        helper(root);
        return bestPath;
    }
    
    private List<Integer> helper(TreeNode node) {
        if (node == null) return new ArrayList<>();
        
        List<Integer> leftPath = helper(node.left);
        List<Integer> rightPath = helper(node.right);
        
        int leftGain = leftPath.stream().mapToInt(Integer::intValue).sum();
        int rightGain = rightPath.stream().mapToInt(Integer::intValue).sum();
        
        // Path through this node
        int throughNode = node.val + Math.max(leftGain, 0) + Math.max(rightGain, 0);
        if (throughNode > maxSum) {
            maxSum = throughNode;
            bestPath = new ArrayList<>();
            if (leftGain > 0) { Collections.reverse(leftPath); bestPath.addAll(leftPath); }
            bestPath.add(node.val);
            if (rightGain > 0) bestPath.addAll(rightPath);
        }
        
        // Return single-direction path for parent
        List<Integer> singlePath = new ArrayList<>();
        singlePath.add(node.val);
        if (leftGain > rightGain && leftGain > 0) singlePath.addAll(leftPath);
        else if (rightGain > 0) singlePath.addAll(rightPath);
        return singlePath;
    }
}
```

---

## Round 3: System Design
**Duration:** 45 minutes | **Interviewer:** E7 Staff SDE

### Questions Asked
1. **Design an Online Advertising Platform (Facebook Ads)**

### 💡 Interview-Ready Answer

#### Requirements
**Functional:** Advertisers create campaigns (budget, targeting, creative), platform serves ads to users matching targeting criteria, track impressions/clicks/conversions, real-time bidding, analytics dashboard.
**Non-Functional:** Serve ads in < 100ms, 1M ad requests/sec, 10B impressions/day, 99.99% availability.

#### Architecture
```
┌─────────────┐
│  User opens  │
│  Facebook    │
└──────┬──────┘
       ▼
┌──────────────────────────────────────────────────┐
│                 Ad Request Flow                    │
│                                                    │
│  ┌──────────┐    ┌──────────────┐    ┌─────────┐ │
│  │  Ad      │───▶│  Targeting   │───▶│  Bid    │ │
│  │  Server  │    │  Service     │    │  Engine │ │
│  │  (Entry) │    │  (Match user │    │  (Rank  │ │
│  │          │    │   to ads)    │    │  by eCPM│ │
│  └──────────┘    └──────────────┘    └────┬────┘ │
│                                           │      │
│  ┌──────────────────────────────────────┘       │
│  ▼                                                │
│  ┌──────────┐    ┌──────────────┐                │
│  │  Auction  │───▶│  Ad Serving  │                │
│  │  (2nd    │    │  (Select     │                │
│  │   price) │    │   creative)  │                │
│  └──────────┘    └──────────────┘                │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              Event Tracking Pipeline              │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Click/   │──▶│  Kafka   │──▶│  Flink       │ │
│  │ Impress  │   │  Stream  │   │  (Real-time  │ │
│  │ Tracker  │   │          │   │   Aggregation│ │
│  └──────────┘   └──────────┘   └──────┬───────┘ │
│                                        ▼         │
│                              ┌──────────────┐    │
│                              │  ClickHouse  │    │
│                              │  (Analytics) │    │
│                              └──────────────┘    │
└──────────────────────────────────────────────────┘
```

#### Ad Serving Pipeline (< 100ms budget)
```
1. User Context Extraction (5ms)
   - User ID, location, device, page context
   - Fetch user profile features from cache

2. Candidate Selection (20ms)
   - Index: targeting criteria → set of ad_ids
   - Boolean matching: age ∈ [25-35] AND location = "US" AND interest = "tech"
   - Output: ~1000 candidate ads

3. Prediction (30ms)
   - P(click | user, ad, context) — ML model (logistic regression or deep learning)
   - Features: user history, ad creative features, time of day, device
   - eCPM = P(click) × bid_amount × 1000

4. Auction (10ms)
   - Second-price auction (winner pays 2nd highest bid + $0.01)
   - Pacing: spread budget evenly (don't exhaust in first hour)

5. Creative Selection & Response (10ms)
   - Choose best ad format (image, video, carousel)
   - Return ad markup to client
```

#### Budget and Pacing
```java
// Pacing algorithm: probabilistic throttling
class PacingController {
    // For each campaign, decide whether to enter auction
    boolean shouldParticipate(Campaign campaign) {
        double spentFraction = campaign.spent / campaign.dailyBudget;
        double timeFraction = hourOfDay / 24.0;
        
        // If spending ahead of time → reduce participation
        double pacingRate = timeFraction / Math.max(spentFraction, 0.001);
        pacingRate = Math.min(pacingRate, 1.0);
        
        return Math.random() < pacingRate;
    }
}
```

#### Click Fraud Detection
- **Real-time:** Score each click — high frequency from same IP, bot user-agent patterns, abnormal click-through rate
- **Batch:** Daily analysis — if campaign CTR > 5σ from mean, flag for review
- **Refund:** Invalid clicks not charged to advertisers

> **Why I was rejected:** I didn't go deep enough on the **data model for targeting indices**. The interviewer wanted to understand how targeting criteria (age, location, interests) are stored in an inverted index structure and how updates propagate. I gave a high-level "it's like Elasticsearch" but couldn't detail the specific boolean query execution plan or the segment tree structure for range queries (age ranges, budget ranges).

---

## Round 4: Behavioral
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Tell me about a project you're most proud of"**
2. **"How do you handle disagreements with your manager?"**
3. **"Describe a time you failed and what you learned"**

### 💡 Interview-Ready Answer — Handling Disagreement

**Situation:** My manager wanted to ship a new feature (payment retry logic) without automated tests because we were behind schedule by 2 weeks. The feature handled real money — incorrect retries could double-charge customers.

**Task:** Push back constructively without damaging the relationship or missing the deadline even further.

**Action:**
1. **Validated the urgency** — acknowledged the deadline pressure and why it mattered (partner commitment)
2. **Quantified the risk** — showed 3 past incidents where untested payment code caused $50K+ in chargebacks
3. **Proposed a compromise** — write tests only for the critical paths (retry logic + idempotency), skip UI tests
4. **Offered to own the testing** — "I'll write all the critical path tests myself this weekend, we ship Monday"
5. **Delivered** — wrote 23 test cases covering retry behavior, idempotency, and edge cases (timeout, partial payment)

**Result:** Shipped on Monday (1 day late instead of 2 weeks). The tests caught a double-charge bug in staging that would have affected ~300 customers. Manager publicly thanked me in sprint retro and made "critical path testing" mandatory for all payment features.

---

## 🎯 Key Takeaways
- Meta interviews use **"ninja" and "pirate"** terminology for coding rounds — don't be thrown off
- E5 requires solving 2 problems per coding round — **speed matters** (aim for 20 min per problem)
- **System design at Meta is ad-tech heavy** — understand auction mechanics, eCPM, pacing
- The **behavioral round is a real evaluation** — Meta cares about "move fast" and "be bold" culture
- Rejection with strong coding often means **system design was the differentiator**
- **Follow-up questions** are common at Meta — after solving, expect "now extend it to..."

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium | Prefix Sum, HashMap |
| Round 2 | Hard | Tree DFS, Path Reconstruction |
| Round 3 | Very Hard | Ad Tech, Auction Systems, ML Serving |
| Round 4 | Medium | Behavioral, Conflict Resolution |
