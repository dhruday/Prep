# Walmart — SDE-3 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Staff Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Walmart Grocery |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 DSA + System Design + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Design a Distributed Counter with Eventual Consistency

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * CRDT-based G-Counter (Grow-only Counter) for distributed counting.
 * 
 * Each node maintains its own counter. Global count = sum of all nodes.
 * Merge: take max of each node's counter.
 * This is a CRDT (Conflict-free Replicated Data Type) — always converges.
 * 
 * For increment+decrement, use PN-Counter (positive + negative G-Counters).
 * 
 * Time: O(1) increment, O(n) merge/value (n = number of nodes)
 * Used in: Walmart view counters, Cassandra counters, Redis CRDTs
 */
public class PNCounter implements Serializable {
    
    private final String nodeId;
    private final Map<String, Long> positiveMap; // G-Counter for increments
    private final Map<String, Long> negativeMap; // G-Counter for decrements
    
    public PNCounter(String nodeId) {
        this.nodeId = nodeId;
        this.positiveMap = new ConcurrentHashMap<>();
        this.negativeMap = new ConcurrentHashMap<>();
    }
    
    public void increment(long amount) {
        if (amount < 0) throw new IllegalArgumentException("Use decrement for negative");
        positiveMap.merge(nodeId, amount, Long::sum);
    }
    
    public void decrement(long amount) {
        if (amount < 0) throw new IllegalArgumentException("Amount must be positive");
        negativeMap.merge(nodeId, amount, Long::sum);
    }
    
    public long value() {
        long pos = positiveMap.values().stream().mapToLong(Long::longValue).sum();
        long neg = negativeMap.values().stream().mapToLong(Long::longValue).sum();
        return pos - neg;
    }
    
    /**
     * Merge another counter's state into this one.
     * Take the maximum for each node — this is idempotent, commutative, associative.
     */
    public void merge(PNCounter other) {
        for (Map.Entry<String, Long> entry : other.positiveMap.entrySet()) {
            positiveMap.merge(entry.getKey(), entry.getValue(), Math::max);
        }
        for (Map.Entry<String, Long> entry : other.negativeMap.entrySet()) {
            negativeMap.merge(entry.getKey(), entry.getValue(), Math::max);
        }
    }
    
    /**
     * Serialize for network transfer (gossip protocol).
     */
    public Map<String, Object> toState() {
        Map<String, Object> state = new HashMap<>();
        state.put("positive", new HashMap<>(positiveMap));
        state.put("negative", new HashMap<>(negativeMap));
        return state;
    }
}

/**
 * Cluster of PN-Counters with gossip-based synchronization.
 */
class CounterCluster {
    private final Map<String, PNCounter> counters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService gossipScheduler;
    
    CounterCluster(String nodeId) {
        this.counters.put("default", new PNCounter(nodeId));
        
        this.gossipScheduler = Executors.newSingleThreadScheduledExecutor();
        this.gossipScheduler.scheduleAtFixedRate(this::gossipRound, 1, 1, TimeUnit.SECONDS);
    }
    
    public void increment(String counterName, long amount) {
        counters.computeIfAbsent(counterName, k -> new PNCounter("local"))
                .increment(amount);
    }
    
    public long getValue(String counterName) {
        PNCounter counter = counters.get(counterName);
        return counter != null ? counter.value() : 0;
    }
    
    // Simulate gossip round: in reality, sends state to random peer
    private void gossipRound() {
        // Pick random peer → send our state → they merge + respond with theirs → we merge
    }
}
```

### Question 2: Word Break with Dictionary — Return All Valid Sentences

```java
/**
 * Word Break II (LeetCode 140): Return all possible sentences.
 * 
 * Approach: DFS with memoization.
 * For each position, try all dictionary words that match the prefix.
 * Memo: index → list of valid sentences from that index to end.
 * 
 * Time: O(n * 2^n) worst case (exponential with overlapping words)
 * Space: O(n * 2^n) for memoization
 */
public List<String> wordBreak(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    Map<Integer, List<String>> memo = new HashMap<>();
    return dfs(s, 0, dict, memo);
}

private List<String> dfs(String s, int start, Set<String> dict, Map<Integer, List<String>> memo) {
    if (memo.containsKey(start)) return memo.get(start);
    
    List<String> result = new ArrayList<>();
    
    if (start == s.length()) {
        result.add("");
        return result;
    }
    
    for (int end = start + 1; end <= s.length(); end++) {
        String word = s.substring(start, end);
        
        if (dict.contains(word)) {
            List<String> rest = dfs(s, end, dict, memo);
            
            for (String sentence : rest) {
                result.add(sentence.isEmpty() ? word : word + " " + sentence);
            }
        }
    }
    
    memo.put(start, result);
    return result;
}
```

---

## Round 2: System Design — Walmart Grocery Substitution Engine

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│          Walmart Grocery Substitution Engine                    │
│                                                                 │
│  Problem: Customer orders item X, but X is out of stock.       │
│  Solution: Suggest substitute Y that customer will accept.      │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Substitution Engine                               │           │
│  │                                                   │           │
│  │ 1. ELIGIBLE: Determine if item can be substituted │           │
│  │    - Customer preference: allow subs? (default yes)│          │
│  │    - Item category: some items (baby formula) = no │           │
│  │    - Order type: pickup = yes, delivery = yes      │           │
│  │                                                   │           │
│  │ 2. CANDIDATES: Find potential substitutes         │           │
│  │    a. Same category + same brand → highest match  │           │
│  │    b. Same category + different brand + same size  │           │
│  │    c. Same category + different size (up-size OK)  │           │
│  │    d. ML model: trained on historical acceptances  │           │
│  │                                                   │           │
│  │ 3. RANK: Score each candidate                     │           │
│  │    - Brand affinity (40%): same brand preferred    │           │
│  │    - Size match (20%): same or larger              │           │
│  │    - Price match (20%): equal or cheaper           │           │
│  │    - Historical acceptance rate (15%)              │           │
│  │    - Customer past behavior (5%)                   │           │
│  │                                                   │           │
│  │ 4. PRESENT: Show to picker app                    │           │
│  │    - Top 3 suggestions                            │           │
│  │    - Picker can override with manual pick          │           │
│  │    - Customer gets notification: approve/reject    │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Product Graph Database                            │           │
│  │                                                   │           │
│  │ Nodes: Products                                   │           │
│  │ Edges: substitutability (weight = score)          │           │
│  │                                                   │           │
│  │ Pre-computed: nightly batch + real-time updates    │           │
│  │ - Product embedding: Word2Vec on purchase baskets  │           │
│  │ - Cosine similarity between embeddings            │           │
│  │ - Filtered by: allergens, dietary (vegan, gluten) │           │
│  │                                                   │           │
│  │ Graph DB: Neo4j for relationship traversal        │           │
│  │ Cache: Redis for top-K substitutes per item       │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Feedback Loop                                     │           │
│  │                                                   │           │
│  │ Customer accepts sub → positive signal             │           │
│  │ Customer rejects sub → negative signal             │           │
│  │ Customer refunds → very negative signal            │           │
│  │                                                   │           │
│  │ ML model retrained weekly on acceptance data      │           │
│  │ Product graph weights updated daily                │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Scale: 150K+ grocery items per store,                         │
│         5M substitution decisions/day,                          │
│         67% customer acceptance rate (target: 75%)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Walmart SDE-3 = **CRDTs for distributed counting + grocery substitution engine**
- **PN-Counter**: separate positive/negative G-Counters — merge = max per node, value = sum(pos) - sum(neg)
- **CRDT properties**: commutative, associative, idempotent — always converges regardless of merge order
- **Gossip protocol**: periodic random peer exchange — eventually all nodes converge
- **Word Break II**: DFS + memoization — cache `index → list of sentences` to avoid recomputation
- **Substitution scoring**: multi-factor rank (brand + size + price + history) — domain-specific ML ranking
- **Product graph**: Word2Vec embeddings on purchase baskets → cosine similarity — "frequently bought together"
- Walmart = **retail domain**: inventory, substitution, fulfillment, pricing are common interview themes

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA 1 | Hard | CRDT PN-Counter, Distributed Systems |
| DSA 2 | Medium-Hard | Word Break II, DFS+Memo |
| System Design | Very Hard | Substitution Engine, ML Ranking |
| HM | Medium | Culture Fit |
