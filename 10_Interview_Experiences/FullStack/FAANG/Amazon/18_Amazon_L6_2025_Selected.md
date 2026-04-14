# Amazon — L6 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 |
| **Level** | L6 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 On-site: 2 DSA + System Design + Bar Raiser)
- **Timeline:** 4 weeks
- **Format:** On-site

## Round 2: Coding — Design a Real-Time Leaderboard System

### Problem
Implement a leaderboard that:
- Tracks scores for millions of users
- getTopK(k) — return top K users sorted by score
- getRank(userId) — return rank of a specific user
- Update score (increment/set)
- All operations should be efficient (better than O(N))

Use a balanced BST (TreeMap) or Segment Tree approach.

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class RealtimeLeaderboard {

    /**
     * Approach: TreeMap<Score, Set<UserId>> + HashMap<UserId, Score>
     * - TreeMap keeps scores sorted (O(log N) insert/delete)
     * - HashMap gives O(1) lookup of current score per user
     * - getRank uses a separate Fenwick tree (BIT) for O(log M) rank queries
     *   where M = max possible score
     */

    private final ConcurrentHashMap<String, Long> userScores = new ConcurrentHashMap<>();
    private final TreeMap<Long, Set<String>> scoreBoard = new TreeMap<>(Comparator.reverseOrder());

    // Fenwick tree for rank queries — index = score, value = count of users at that score
    private final int MAX_SCORE = 1_000_001;
    private final int[] bit = new int[MAX_SCORE + 1];

    // Fenwick tree operations
    private void bitUpdate(int idx, int delta) {
        for (; idx <= MAX_SCORE; idx += idx & (-idx))
            bit[idx] += delta;
    }

    private int bitQuery(int idx) {
        int sum = 0;
        for (; idx > 0; idx -= idx & (-idx))
            sum += bit[idx];
        return sum;
    }

    /**
     * Set or update a user's score.
     */
    public void updateScore(String userId, long newScore) {
        newScore = Math.max(0, Math.min(newScore, MAX_SCORE - 1));

        Long oldScore = userScores.put(userId, newScore);

        if (oldScore != null) {
            // Remove from old score bucket
            Set<String> oldBucket = scoreBoard.get(oldScore);
            if (oldBucket != null) {
                oldBucket.remove(userId);
                if (oldBucket.isEmpty()) scoreBoard.remove(oldScore);
            }
            bitUpdate((int) (long) oldScore + 1, -1);
        }

        // Add to new score bucket
        scoreBoard.computeIfAbsent(newScore, k -> ConcurrentHashMap.newKeySet()).add(userId);
        bitUpdate((int) newScore + 1, 1);
    }

    /**
     * Increment a user's score by delta.
     */
    public long incrementScore(String userId, long delta) {
        long current = userScores.getOrDefault(userId, 0L);
        long newScore = current + delta;
        updateScore(userId, newScore);
        return newScore;
    }

    /**
     * Get top K users sorted by score (descending).
     * O(K * log N) using TreeMap iteration.
     */
    public List<Map.Entry<String, Long>> getTopK(int k) {
        List<Map.Entry<String, Long>> result = new ArrayList<>();

        for (Map.Entry<Long, Set<String>> entry : scoreBoard.entrySet()) {
            for (String userId : entry.getValue()) {
                result.add(Map.entry(userId, entry.getKey()));
                if (result.size() >= k) return result;
            }
        }

        return result;
    }

    /**
     * Get rank of a specific user.
     * Rank = number of users with strictly higher score + 1.
     * Uses Fenwick tree: rank = total_users - prefix_sum(score) + 1.
     * But we want count of users with score > current, so:
     * rank = total - bitQuery(score + 1) + 1... simplified:
     * rank = (total users) - (users with score <= current score) + 1
     * Actually: users with score > s = totalUsers - bitQuery(s+1)
     * rank = users_with_higher_score + 1
     */
    public int getRank(String userId) {
        Long score = userScores.get(userId);
        if (score == null) return -1;

        int totalUsers = bitQuery(MAX_SCORE);
        int usersWithScoreLessOrEqual = bitQuery((int) (long) score + 1);
        // Users with strictly higher score = total - usersAtOrBelow
        // But we need: users with score >= current (for tied users, same rank)
        int usersWithHigherScore = totalUsers - usersWithScoreLessOrEqual;

        return usersWithHigherScore + 1;
    }

    /**
     * Get score for a user.
     */
    public long getScore(String userId) {
        return userScores.getOrDefault(userId, 0L);
    }

    /**
     * Get users around a specific user (context leaderboard).
     */
    public List<Map.Entry<String, Long>> getAroundUser(String userId, int count) {
        Long score = userScores.get(userId);
        if (score == null) return List.of();

        // Get users above
        NavigableMap<Long, Set<String>> above = scoreBoard.headMap(score, false);
        List<Map.Entry<String, Long>> result = new ArrayList<>();

        // Collect `count` users above
        int needed = count / 2;
        List<Map.Entry<String, Long>> aboveList = new ArrayList<>();
        for (Map.Entry<Long, Set<String>> entry : above.entrySet()) {
            for (String uid : entry.getValue()) {
                aboveList.add(Map.entry(uid, entry.getKey()));
                if (aboveList.size() >= needed) break;
            }
            if (aboveList.size() >= needed) break;
        }
        Collections.reverse(aboveList);
        result.addAll(aboveList);

        // The user themselves
        result.add(Map.entry(userId, score));

        // Collect `count` users below
        NavigableMap<Long, Set<String>> below = scoreBoard.tailMap(score, false);
        int belowNeeded = count / 2;
        for (Map.Entry<Long, Set<String>> entry : below.entrySet()) {
            for (String uid : entry.getValue()) {
                result.add(Map.entry(uid, entry.getKey()));
                belowNeeded--;
                if (belowNeeded <= 0) break;
            }
            if (belowNeeded <= 0) break;
        }

        return result;
    }

    public int getTotalUsers() {
        return userScores.size();
    }

    public static void main(String[] args) {
        RealtimeLeaderboard lb = new RealtimeLeaderboard();

        // Simulate users
        lb.updateScore("alice", 1500);
        lb.updateScore("bob", 2300);
        lb.updateScore("charlie", 1800);
        lb.updateScore("diana", 2300);
        lb.updateScore("eve", 950);
        lb.updateScore("frank", 3100);

        System.out.println("=== Top 3 ===");
        lb.getTopK(3).forEach(e ->
            System.out.printf("  %s: %d%n", e.getKey(), e.getValue()));

        System.out.println("\n=== Ranks ===");
        for (String user : List.of("frank", "bob", "diana", "charlie", "alice", "eve")) {
            System.out.printf("  %s: score=%d, rank=#%d%n",
                user, lb.getScore(user), lb.getRank(user));
        }

        // Score update
        System.out.println("\n--- Alice gains 2000 points ---");
        lb.incrementScore("alice", 2000);
        System.out.printf("  Alice: score=%d, rank=#%d%n", lb.getScore("alice"), lb.getRank("alice"));

        System.out.println("\n=== Around Charlie ===");
        lb.getAroundUser("charlie", 4).forEach(e ->
            System.out.printf("  %s: %d%n", e.getKey(), e.getValue()));

        System.out.printf("\nTotal users: %d%n", lb.getTotalUsers());
    }
}
```

## 🎯 Key Takeaways
- Amazon L6 expect **data structure design** with efficiency analysis
- **Fenwick tree** (BIT) gives O(log M) rank queries where M = score range
- TreeMap<Score, Set<UserId>> with reverse order gives O(K log N) for topK
- HashMap<UserId, Score> gives O(1) score lookup
- Tied users share the same rank — standard leaderboard convention
- "Around user" context window uses `headMap`/`tailMap` for efficient neighborhood queries
- ConcurrentHashMap for thread safety in multi-player scenarios

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, DP |
| DSA 1 | Medium-Hard | Graphs, BFS |
| DSA 2 | Hard | Fenwick Tree, TreeMap, Design |
| System Design | Hard | Real-time Leaderboard at Scale |
| Bar Raiser | Hard | Leadership Principles, System Thinking |
