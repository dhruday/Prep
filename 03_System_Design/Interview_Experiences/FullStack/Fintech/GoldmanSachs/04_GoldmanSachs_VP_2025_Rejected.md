# Goldman Sachs — VP FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President — Platform Engineering |
| **Level** | VP |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected (Final Round) |
| **Location** | New York, NY |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 3 Technical + Superday)

---

## Round 1: DSA (HackerRank)
**Duration:** 90 minutes

### Question 1: Find Maximum Profit from Trading with At Most K Transactions

```java
/**
 * Best Time to Buy and Sell Stock IV (LeetCode 188).
 * At most k transactions. Each transaction = buy then sell.
 * Can only hold one stock at a time.
 * 
 * DP approach:
 * dp[t][d] = max profit using at most t transactions up to day d
 * 
 * Transition:
 * dp[t][d] = max(
 *   dp[t][d-1],                              // don't trade on day d
 *   max over j in [0..d-1] of (prices[d] - prices[j] + dp[t-1][j-1])
 * )
 * 
 * Optimization: track running max of (dp[t-1][j-1] - prices[j])
 * This brings complexity from O(k*n²) to O(k*n)
 * 
 * Edge case: if k >= n/2, reduce to unlimited transactions (greedy)
 * 
 * Time: O(k*n), Space: O(k*n) → can optimize to O(n) with rolling array
 */
public int maxProfit(int k, int[] prices) {
    int n = prices.length;
    if (n <= 1 || k == 0) return 0;
    
    // If k >= n/2, unlimited transactions (greedy)
    if (k >= n / 2) {
        int profit = 0;
        for (int i = 1; i < n; i++) {
            if (prices[i] > prices[i - 1]) {
                profit += prices[i] - prices[i - 1];
            }
        }
        return profit;
    }
    
    // dp[t][d] = max profit with at most t transactions through day d
    int[][] dp = new int[k + 1][n];
    
    for (int t = 1; t <= k; t++) {
        // maxDiff = max(dp[t-1][j] - prices[j]) for j < d
        // This is the "best buy point" considering prior transaction profits
        int maxDiff = -prices[0]; // dp[0][0] - prices[0] = 0 - prices[0]
        
        for (int d = 1; d < n; d++) {
            dp[t][d] = Math.max(
                dp[t][d - 1],              // skip day d
                prices[d] + maxDiff         // sell on day d
            );
            
            // Update maxDiff for next iteration
            maxDiff = Math.max(maxDiff, dp[t - 1][d] - prices[d]);
        }
    }
    
    return dp[k][n - 1];
}
```

### Question 2: Implement a Lock-Free Concurrent Skip List

```java
import java.util.concurrent.atomic.AtomicMarkableReference;

/**
 * Lock-free concurrent Skip List using CAS operations.
 * Supports concurrent insert, search, delete without locks.
 * 
 * Key insight: Use AtomicMarkableReference for logical deletion.
 * Delete = mark node → physically remove during traversal.
 * 
 * Expected Time: O(log n) search/insert/delete
 * Space: O(n log n) expected
 */
public class ConcurrentSkipList<K extends Comparable<K>, V> {
    
    private static final int MAX_LEVEL = 32;
    
    static class Node<K extends Comparable<K>, V> {
        final K key;
        volatile V value;
        final AtomicMarkableReference<Node<K, V>>[] next;
        final int topLevel;
        
        @SuppressWarnings("unchecked")
        Node(K key, V value, int height) {
            this.key = key;
            this.value = value;
            this.topLevel = height;
            this.next = new AtomicMarkableReference[height + 1];
            for (int i = 0; i <= height; i++) {
                next[i] = new AtomicMarkableReference<>(null, false);
            }
        }
    }
    
    private final Node<K, V> head;
    private final Node<K, V> tail;
    
    @SuppressWarnings("unchecked")
    public ConcurrentSkipList() {
        // Sentinel nodes with min/max keys
        tail = new Node<>(null, null, MAX_LEVEL);
        head = new Node<>(null, null, MAX_LEVEL);
        for (int i = 0; i <= MAX_LEVEL; i++) {
            head.next[i].set(tail, false);
        }
    }
    
    private int randomLevel() {
        int level = 0;
        while (level < MAX_LEVEL && Math.random() < 0.5) {
            level++;
        }
        return level;
    }
    
    /**
     * Find predecessors and successors at each level.
     * Also physically removes marked (logically deleted) nodes.
     */
    @SuppressWarnings("unchecked")
    private boolean find(K key, Node<K, V>[] preds, Node<K, V>[] succs) {
        boolean[] marked = { false };
        Node<K, V> pred, curr, succ;
        
        retry:
        while (true) {
            pred = head;
            
            for (int level = MAX_LEVEL; level >= 0; level--) {
                curr = pred.next[level].getReference();
                
                while (true) {
                    succ = curr.next[level].get(marked);
                    
                    // Physically remove marked nodes
                    while (marked[0]) {
                        boolean snipped = pred.next[level].compareAndSet(curr, succ, false, false);
                        if (!snipped) continue retry;
                        curr = succ;
                        succ = curr.next[level].get(marked);
                    }
                    
                    if (curr == tail || (curr.key != null && curr.key.compareTo(key) >= 0)) {
                        break;
                    }
                    
                    pred = curr;
                    curr = succ;
                }
                
                preds[level] = pred;
                succs[level] = curr;
            }
            
            return curr != tail && curr.key != null && curr.key.compareTo(key) == 0;
        }
    }
    
    public V get(K key) {
        boolean[] marked = { false };
        Node<K, V> pred = head, curr = null, succ;
        
        for (int level = MAX_LEVEL; level >= 0; level--) {
            curr = pred.next[level].getReference();
            
            while (true) {
                succ = curr.next[level].get(marked);
                while (marked[0]) {
                    curr = succ;
                    succ = curr.next[level].get(marked);
                }
                if (curr == tail || (curr.key != null && curr.key.compareTo(key) >= 0)) break;
                pred = curr;
                curr = succ;
            }
        }
        
        if (curr != tail && curr.key != null && curr.key.compareTo(key) == 0) {
            return curr.value;
        }
        return null;
    }
    
    @SuppressWarnings("unchecked")
    public boolean insert(K key, V value) {
        int topLevel = randomLevel();
        Node<K, V>[] preds = new Node[MAX_LEVEL + 1];
        Node<K, V>[] succs = new Node[MAX_LEVEL + 1];
        
        while (true) {
            boolean found = find(key, preds, succs);
            
            if (found) {
                // Key exists — update value
                succs[0].value = value;
                return false;
            }
            
            Node<K, V> newNode = new Node<>(key, value, topLevel);
            
            // Link bottom-up
            for (int level = 0; level <= topLevel; level++) {
                newNode.next[level].set(succs[level], false);
            }
            
            // CAS at level 0 (linearization point)
            if (!preds[0].next[0].compareAndSet(succs[0], newNode, false, false)) {
                continue; // Retry
            }
            
            // Link higher levels
            for (int level = 1; level <= topLevel; level++) {
                while (true) {
                    if (preds[level].next[level].compareAndSet(succs[level], newNode, false, false)) {
                        break;
                    }
                    find(key, preds, succs); // Refresh preds/succs
                }
            }
            
            return true;
        }
    }
}
```

---

## 🎯 Key Takeaways
- GS VP = **Hard DSA (Stock trading DP + Lock-free data structures) + system design**
- **Stock K transactions**: DP with `maxDiff` optimization — O(k*n) time, key insight is tracking running max
- **k >= n/2 optimization**: unlimited transactions → greedy (add all positive differences)
- **Lock-free Skip List**: `AtomicMarkableReference` for logical deletion → physical removal during traversal
- **CAS retry loop**: core pattern — `compareAndSet` failure means contention, retry with fresh state
- **Linearization point**: level-0 CAS insert is the atomic operation that makes the node visible
- **Physical cleanup during find**: traversal removes marked nodes — amortized cleanup without stop-the-world
- GS = **concurrency + financial algorithms** — VP level expects lock-free data structures + complex DP

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Very Hard | Stock Trading DP, Skip List |
| Technical 1 | Hard | System Design, Trading Platform |
| Technical 2 | Hard | Java Concurrency, JVM |
| Superday | Hard | Behavioral + Technical Deep Dive |
| Final | Hard | Senior Leadership alignment |
