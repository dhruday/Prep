# Google — L4 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer |
| **Level** | L4 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 4 Onsite)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Find All Anagram Substrings in a String**
   - Given a string `s` and a pattern `p`, find all start indices of `p`'s anagrams in `s`.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class FindAnagrams {

    /**
     * Sliding window with frequency count.
     * Time: O(N), Space: O(1) — fixed 26-char array
     */
    public static List<Integer> findAnagrams(String s, String p) {
        List<Integer> result = new ArrayList<>();
        if (s.length() < p.length()) return result;

        int[] pCount = new int[26];
        int[] windowCount = new int[26];

        for (char c : p.toCharArray()) pCount[c - 'a']++;

        int windowSize = p.length();

        for (int i = 0; i < s.length(); i++) {
            // Add right char
            windowCount[s.charAt(i) - 'a']++;

            // Remove left char when window exceeds size
            if (i >= windowSize) {
                windowCount[s.charAt(i - windowSize) - 'a']--;
            }

            // Check if window matches pattern
            if (i >= windowSize - 1 && Arrays.equals(pCount, windowCount)) {
                result.add(i - windowSize + 1);
            }
        }

        return result;
    }

    /**
     * Follow-up: Optimized with match count to avoid per-step array comparison.
     * Instead of comparing 26-element arrays each time, track how many chars match.
     */
    public static List<Integer> findAnagramsOptimized(String s, String p) {
        List<Integer> result = new ArrayList<>();
        if (s.length() < p.length()) return result;

        int[] count = new int[26]; // combined count
        for (char c : p.toCharArray()) count[c - 'a']++;

        int matchesNeeded = 0;
        for (int c : count) if (c > 0) matchesNeeded++;

        int matches = 0;
        int windowSize = p.length();

        for (int i = 0; i < s.length(); i++) {
            int right = s.charAt(i) - 'a';
            count[right]--;
            if (count[right] == 0) matches++;
            if (count[right] == -1) matches--; // was zero, now negative

            if (i >= windowSize) {
                int left = s.charAt(i - windowSize) - 'a';
                count[left]++;
                if (count[left] == 0) matches++;
                if (count[left] == 1) matches--; // was zero, now positive
            }

            if (matches == matchesNeeded) {
                result.add(i - windowSize + 1);
            }
        }

        return result;
    }

    public static void main(String[] args) {
        System.out.println(findAnagrams("cbaebabacd", "abc")); // [0, 6]
        System.out.println(findAnagramsOptimized("abab", "ab")); // [0, 1, 2]
    }
}
```

## Rounds 2-5: Onsite
- **Coding 1:** Merge K Sorted Lists (min-heap, O(N log K))
- **Coding 2:** Word Break II with memoization
- **System Design:** Design Google Calendar backend
- **Googleyness:** Behavioral — rejected for insufficient L4 impact stories

## 🎯 Key Takeaways
- Sliding window anagram is a Google classic — know both array-comparison and match-count versions
- Google L4 still expects clear communication of approach before coding
- Rejection was behavioral, not technical — even L4 needs clear impact stories

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Sliding Window, HashMap |
| Coding 1 | Medium-Hard | Heap, Merge |
| Coding 2 | Hard | DP, Backtracking |
| System Design | Medium-Hard | Calendar, Recurring Events |
| Googleyness | Medium | Behavioral |
