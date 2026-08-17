# Meta — E6 FullStack Interview Experience (2025) — #13

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer (E6) |
| **Level** | Staff |
| **YOE** | 10 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Product Sense + Behavioral)

---

## Round 1: DSA — Minimum Number of Operations to Make All Intervals Non-Overlapping
**Duration:** 40 minutes

### Q1: Given a list of intervals, find the minimum number of intervals to remove to make the rest non-overlapping. Then extend: after removal, merge remaining intervals.

```java
import java.util.*;

/**
 * Minimum Intervals to Remove (Non-Overlapping):
 * 
 * Greedy approach:
 * 1. Sort by end time (ascending)
 * 2. Iterate: if current start < last kept end → remove current (overlap)
 * 3. Else: keep current, update last_end
 * 
 * Why sort by end? Keeping intervals that end earliest leaves maximum room.
 * 
 * Time: O(N log N)
 * Space: O(1) (in-place sort)
 */
class IntervalScheduling {
    
    int eraseOverlapIntervals(int[][] intervals) {
        if (intervals.length <= 1) return 0;
        
        // Sort by end time
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        
        int removals = 0;
        int lastEnd = intervals[0][1];
        
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < lastEnd) {
                // Overlap → remove current (it ends later or same)
                removals++;
            } else {
                // No overlap → keep, update end
                lastEnd = intervals[i][1];
            }
        }
        
        return removals;
    }
    
    /**
     * Follow-up: Return the actual non-overlapping set AND merged result.
     */
    List<int[]> getNonOverlappingAndMerge(int[][] intervals) {
        if (intervals.length == 0) return Collections.emptyList();
        
        // Step 1: Get non-overlapping intervals (greedy by end time)
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        
        List<int[]> kept = new ArrayList<>();
        kept.add(intervals[0]);
        
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] >= kept.get(kept.size() - 1)[1]) {
                kept.add(intervals[i]);
            }
        }
        
        // Step 2: Merge (now sorted by end, re-sort by start for merge)
        kept.sort((a, b) -> Integer.compare(a[0], b[0]));
        
        List<int[]> merged = new ArrayList<>();
        merged.add(kept.get(0));
        
        for (int i = 1; i < kept.size(); i++) {
            int[] last = merged.get(merged.size() - 1);
            if (kept.get(i)[0] <= last[1]) {
                last[1] = Math.max(last[1], kept.get(i)[1]);
            } else {
                merged.add(kept.get(i));
            }
        }
        
        return merged;
    }
}
```

### Q2: Follow-up — Weighted Interval Scheduling (max weight of non-overlapping intervals)

```java
/**
 * Weighted Interval Scheduling (Maximum Weight):
 * 
 * DP approach:
 * 1. Sort by end time
 * 2. For each interval i, binary search for the latest non-overlapping predecessor p(i)
 * 3. dp[i] = max(dp[i-1],  weight[i] + dp[p(i)])
 *    - Either skip interval i (dp[i-1])
 *    - Or include interval i (weight[i] + best up to p(i))
 * 
 * Time: O(N log N)
 * Space: O(N)
 */
class WeightedIntervalScheduling {
    
    int maxWeight(int[][] intervals, int[] weights) {
        int n = intervals.length;
        if (n == 0) return 0;
        
        // Sort by end time (carry original index for weights)
        Integer[] indices = new Integer[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        Arrays.sort(indices, (a, b) -> Integer.compare(intervals[a][1], intervals[b][1]));
        
        int[][] sorted = new int[n][2];
        int[] sortedWeights = new int[n];
        for (int i = 0; i < n; i++) {
            sorted[i] = intervals[indices[i]];
            sortedWeights[i] = weights[indices[i]];
        }
        
        // dp[i] = max weight using first i intervals (1-indexed for convenience)
        int[] dp = new int[n + 1];
        
        for (int i = 1; i <= n; i++) {
            int include = sortedWeights[i - 1] + dp[findLatestNonOverlapping(sorted, i - 1) + 1];
            int exclude = dp[i - 1];
            dp[i] = Math.max(include, exclude);
        }
        
        return dp[n];
    }
    
    /**
     * Binary search for latest interval j (0-indexed) where end[j] <= start[i].
     * Returns -1 if none found (maps to dp[0] = 0).
     */
    int findLatestNonOverlapping(int[][] sorted, int i) {
        int target = sorted[i][0]; // start of interval i
        int lo = 0, hi = i - 1;
        int result = -1;
        
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (sorted[mid][1] <= target) {
                result = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        
        return result;
    }
    
    /**
     * Follow-up: Reconstruct the actual selected intervals.
     */
    List<int[]> getSelectedIntervals(int[][] intervals, int[] weights) {
        int n = intervals.length;
        if (n == 0) return Collections.emptyList();
        
        Integer[] indices = new Integer[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        Arrays.sort(indices, (a, b) -> Integer.compare(intervals[a][1], intervals[b][1]));
        
        int[][] sorted = new int[n][2];
        int[] sortedWeights = new int[n];
        for (int i = 0; i < n; i++) {
            sorted[i] = intervals[indices[i]];
            sortedWeights[i] = weights[indices[i]];
        }
        
        int[] dp = new int[n + 1];
        boolean[] included = new boolean[n + 1];
        
        for (int i = 1; i <= n; i++) {
            int p = findLatestNonOverlapping(sorted, i - 1);
            int include = sortedWeights[i - 1] + dp[p + 1];
            int exclude = dp[i - 1];
            
            if (include >= exclude) {
                dp[i] = include;
                included[i] = true;
            } else {
                dp[i] = exclude;
            }
        }
        
        // Backtrack
        List<int[]> result = new ArrayList<>();
        int i = n;
        while (i > 0) {
            if (included[i]) {
                result.add(sorted[i - 1]);
                int p = findLatestNonOverlapping(sorted, i - 1);
                i = p + 1;
            } else {
                i--;
            }
        }
        
        Collections.reverse(result);
        return result;
    }
}
```

---

## 🎯 Key Takeaways
- Meta E6 = **Interval scheduling (greedy + DP) — from basic to weighted with reconstruction**
- **Greedy (unweighted)**: sort by end time → keep intervals that don't overlap last kept end — O(N log N)
- **Why sort by end**: ending earliest = maximum room for future intervals — activity selection theorem
- **Weighted DP**: `dp[i] = max(dp[i-1], weight[i] + dp[p(i)])` where p(i) = latest non-overlapping predecessor
- **Binary search for p(i)**: `end[j] <= start[i]` — O(log N) per interval
- **Reconstruction**: track `included[i]` boolean → backtrack from dp[n]
- **Real-world**: Meta ad scheduling (maximize revenue from non-overlapping ad slots)
- **Rejection reason**: product sense round didn't demonstrate sufficient E6-level cross-team influence

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 (this) | Hard | Intervals, Greedy, DP, Binary Search |
| Coding 2 | Hard | Graph + String |
| System Design | Very Hard | News Feed Ranking |
| Product Sense | Hard | E6 scope |
| Behavioral | Medium | Culture |
