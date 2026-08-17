# Meta — E5 (Senior SWE) Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Software Engineer (E5) |
| **Level** | E5 (Senior) |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)
- **Timeline:** 3 weeks
- **Format:** Virtual Onsite

## Round 1: Phone Screen — Alien Dictionary
**Duration:** 45 minutes

### Problem
Given a sorted dictionary of words in an alien language, find the order of characters.

**Example:**
```
Input:  ["wrt", "wrf", "er", "ett", "rftt"]
Output: "wertf"
```

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class AlienDictionary {

    /**
     * Topological sort based on character ordering inferred from sorted words.
     * 
     * Approach:
     * 1. Build adjacency list by comparing adjacent words
     * 2. Track in-degree for each character
     * 3. BFS (Kahn's algorithm) to produce topological order
     * 
     * Time: O(C) where C = total length of all words
     * Space: O(1) since at most 26 characters
     */
    public String alienOrder(String[] words) {
        // Adjacency list and in-degree map
        Map<Character, Set<Character>> graph = new HashMap<>();
        Map<Character, Integer> inDegree = new HashMap<>();

        // Initialize all characters
        for (String word : words) {
            for (char c : word.toCharArray()) {
                graph.putIfAbsent(c, new HashSet<>());
                inDegree.putIfAbsent(c, 0);
            }
        }

        // Build graph by comparing adjacent words
        for (int i = 0; i < words.length - 1; i++) {
            String w1 = words[i];
            String w2 = words[i + 1];

            // Edge case: "abc" before "ab" is invalid
            if (w1.length() > w2.length() && w1.startsWith(w2)) {
                return "";
            }

            // Find first differing character
            int minLen = Math.min(w1.length(), w2.length());
            for (int j = 0; j < minLen; j++) {
                char c1 = w1.charAt(j);
                char c2 = w2.charAt(j);
                if (c1 != c2) {
                    if (!graph.get(c1).contains(c2)) {
                        graph.get(c1).add(c2);
                        inDegree.merge(c2, 1, Integer::sum);
                    }
                    break; // Only first diff matters
                }
            }
        }

        // Kahn's algorithm — BFS topological sort
        Queue<Character> queue = new LinkedList<>();
        for (Map.Entry<Character, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }

        StringBuilder result = new StringBuilder();
        while (!queue.isEmpty()) {
            char c = queue.poll();
            result.append(c);

            for (char neighbor : graph.get(c)) {
                inDegree.merge(neighbor, -1, Integer::sum);
                if (inDegree.get(neighbor) == 0) {
                    queue.offer(neighbor);
                }
            }
        }

        // If not all characters included, there's a cycle
        if (result.length() != inDegree.size()) {
            return "";
        }

        return result.toString();
    }

    public static void main(String[] args) {
        AlienDictionary ad = new AlienDictionary();

        // Test 1
        String[] words1 = {"wrt", "wrf", "er", "ett", "rftt"};
        System.out.println(ad.alienOrder(words1)); // "wertf"

        // Test 2: Simple
        String[] words2 = {"z", "x"};
        System.out.println(ad.alienOrder(words2)); // "zx"

        // Test 3: Invalid (prefix violation)
        String[] words3 = {"abc", "ab"};
        System.out.println(ad.alienOrder(words3)); // ""

        // Test 4: Single word
        String[] words4 = {"z"};
        System.out.println(ad.alienOrder(words4)); // "z"
    }
}
```

## Round 2: Coding — Continuous Subarray Sum
**Duration:** 45 minutes

### Problem
Given an integer array `nums` and an integer `k`, return true if `nums` has a continuous subarray of size at least 2 that sums to a multiple of `k`.

```java
public class ContinuousSubarraySum {

    /**
     * Key insight: If prefixSum[j] % k == prefixSum[i] % k, then
     * sum(nums[i+1..j]) is a multiple of k.
     * 
     * Use a HashMap to store remainder → earliest index.
     * Need subarray size >= 2, so check j - i >= 2.
     * 
     * Time: O(n), Space: O(min(n, k))
     */
    public boolean checkSubarraySum(int[] nums, int k) {
        // remainder -> earliest index where this remainder was seen
        Map<Integer, Integer> remainderIndex = new HashMap<>();
        remainderIndex.put(0, -1); // prefix sum 0 at index -1

        int prefixSum = 0;
        for (int i = 0; i < nums.length; i++) {
            prefixSum += nums[i];
            int remainder = prefixSum % k;

            // Handle negative remainders
            if (remainder < 0) remainder += k;

            if (remainderIndex.containsKey(remainder)) {
                if (i - remainderIndex.get(remainder) >= 2) {
                    return true;
                }
                // Don't update — keep earliest index
            } else {
                remainderIndex.put(remainder, i);
            }
        }

        return false;
    }

    public static void main(String[] args) {
        ContinuousSubarraySum cs = new ContinuousSubarraySum();

        System.out.println(cs.checkSubarraySum(new int[]{23, 2, 4, 6, 7}, 6));  // true [2,4]
        System.out.println(cs.checkSubarraySum(new int[]{23, 2, 6, 4, 7}, 6));  // true [23,2,6,4,7]
        System.out.println(cs.checkSubarraySum(new int[]{23, 2, 6, 4, 7}, 13)); // false
        System.out.println(cs.checkSubarraySum(new int[]{1, 0}, 2));             // false
        System.out.println(cs.checkSubarraySum(new int[]{5, 0, 0}, 3));          // true [0,0]
    }
}
```

## 🎯 Key Takeaways
- **Alien Dictionary** is a Meta classic — topological sort from ordering constraints
- Prefix-sum modular arithmetic is a powerful pattern for divisibility checks
- Always handle edge cases: prefix violation in alien dict, negative remainders
- Keep earliest index in the HashMap (greedy for longest subarray)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Topological Sort, BFS |
| Coding | Medium | Prefix Sum, HashMap, Modular Arithmetic |
