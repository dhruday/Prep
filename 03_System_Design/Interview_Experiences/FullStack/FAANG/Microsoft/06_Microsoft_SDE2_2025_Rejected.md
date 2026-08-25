# Microsoft — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | SDE-2 (L62) |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Microsoft 365 |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + LLD + System Design + HM/AS)
- **Rejection Reason:** AS round — couldn't demonstrate ownership mentality for ambiguous problems

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Word Break** (LeetCode 139) — DP
2. **Follow-up: Return all possible break sentences** (LeetCode 140)

### 💡 Word Break I & II

```java
// Word Break I — Can we segment string into dictionary words?
public boolean wordBreak(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    int n = s.length();
    boolean[] dp = new boolean[n + 1];
    dp[0] = true; // Empty string is valid
    
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (dp[j] && dict.contains(s.substring(j, i))) {
                dp[i] = true;
                break;
            }
        }
    }
    
    return dp[n];
}
// Time: O(n² * k) where k = avg word length for substring
// Space: O(n)

// Word Break II — Return all possible sentences
public List<String> wordBreakII(String s, List<String> wordDict) {
    Set<String> dict = new HashSet<>(wordDict);
    Map<Integer, List<String>> memo = new HashMap<>();
    return backtrack(s, 0, dict, memo);
}

private List<String> backtrack(String s, int start, Set<String> dict, Map<Integer, List<String>> memo) {
    if (memo.containsKey(start)) return memo.get(start);
    
    List<String> sentences = new ArrayList<>();
    
    if (start == s.length()) {
        sentences.add("");
        return sentences;
    }
    
    for (int end = start + 1; end <= s.length(); end++) {
        String word = s.substring(start, end);
        if (dict.contains(word)) {
            List<String> rest = backtrack(s, end, dict, memo);
            for (String sentence : rest) {
                sentences.add(word + (sentence.isEmpty() ? "" : " " + sentence));
            }
        }
    }
    
    memo.put(start, sentences);
    return sentences;
}
// Time: O(2^n * n) worst case (all combinations), O(n²) with memoization for most cases
```

---

## Round 2: LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design an In-Memory Database** (like Redis)
   - GET, SET, DELETE operations
   - TTL (time-to-live) for keys
   - Transactions: BEGIN, COMMIT, ROLLBACK
   - Nested transactions

### 💡 In-Memory Database with Transactions

```java
class InMemoryDB {
    private final Map<String, ValueEntry> store;
    private final Deque<Map<String, ValueEntry>> transactionStack; // Stack for nested txns
    private final PriorityQueue<ExpiryEntry> expiryQueue; // For TTL cleanup
    
    record ValueEntry(String value, Instant expiresAt) {
        boolean isExpired() { return expiresAt != null && Instant.now().isAfter(expiresAt); }
    }
    
    record ExpiryEntry(String key, Instant expiresAt) implements Comparable<ExpiryEntry> {
        public int compareTo(ExpiryEntry other) { return expiresAt.compareTo(other.expiresAt); }
    }
    
    InMemoryDB() {
        store = new ConcurrentHashMap<>();
        transactionStack = new ArrayDeque<>();
        expiryQueue = new PriorityQueue<>();
        
        // Lazy cleanup: periodically remove expired keys
        // In production: use scheduled executor
    }
    
    String get(String key) {
        // Check transaction stack first (most recent first)
        for (var txnMap : transactionStack) {
            if (txnMap.containsKey(key)) {
                ValueEntry entry = txnMap.get(key);
                if (entry == null) return null; // Deleted in txn
                if (entry.isExpired()) return null;
                return entry.value;
            }
        }
        
        ValueEntry entry = store.get(key);
        if (entry == null || entry.isExpired()) {
            if (entry != null && entry.isExpired()) store.remove(key); // Lazy expire
            return null;
        }
        return entry.value;
    }
    
    void set(String key, String value) {
        set(key, value, null);
    }
    
    void set(String key, String value, Duration ttl) {
        Instant expiresAt = ttl != null ? Instant.now().plus(ttl) : null;
        ValueEntry entry = new ValueEntry(value, expiresAt);
        
        if (!transactionStack.isEmpty()) {
            transactionStack.peek().put(key, entry);
        } else {
            store.put(key, entry);
            if (expiresAt != null) {
                expiryQueue.offer(new ExpiryEntry(key, expiresAt));
            }
        }
    }
    
    boolean delete(String key) {
        if (!transactionStack.isEmpty()) {
            // Mark as deleted in transaction (null sentinel)
            transactionStack.peek().put(key, null);
            return true;
        }
        return store.remove(key) != null;
    }
    
    // Transaction support
    void begin() {
        transactionStack.push(new LinkedHashMap<>());
    }
    
    boolean commit() {
        if (transactionStack.isEmpty()) return false;
        
        Map<String, ValueEntry> txnChanges = transactionStack.pop();
        
        if (transactionStack.isEmpty()) {
            // Commit to main store
            for (var entry : txnChanges.entrySet()) {
                if (entry.getValue() == null) {
                    store.remove(entry.getKey());
                } else {
                    store.put(entry.getKey(), entry.getValue());
                }
            }
        } else {
            // Merge into parent transaction
            transactionStack.peek().putAll(txnChanges);
        }
        return true;
    }
    
    boolean rollback() {
        if (transactionStack.isEmpty()) return false;
        transactionStack.pop(); // Discard changes
        return true;
    }
    
    // Count keys with a specific value (useful for multi-index)
    int count(String value) {
        return (int) store.values().stream()
            .filter(e -> !e.isExpired() && value.equals(e.value))
            .count();
    }
}

// Usage:
// db.begin();
// db.set("a", "1");
// db.begin(); // Nested transaction
// db.set("a", "2");
// db.get("a"); // "2"
// db.rollback(); // Undo nested
// db.get("a"); // "1" (from parent txn)
// db.commit(); // Commit to main store
```

---

## 🎯 Key Takeaways
- Microsoft SDE-2 = **coding + LLD + system design** — balanced across all three
- **Word Break I**: bottom-up DP, `dp[i]` = can we segment `s[0..i-1]`
- **Word Break II**: backtracking with memoization — avoid exponential explosion
- **In-Memory DB with nested transactions**: stack of maps, merge on commit, discard on rollback
- **TTL implementation**: lazy expiry (check on access) + priority queue for periodic cleanup
- **Nested transaction merge**: on commit, merge into parent transaction (not main store)
- **null sentinel for deletes**: tracks that a key was deleted in the transaction scope
- Microsoft AS (As Appropriate) round = HM + VP — tests ownership, growth mindset, ambiguity tolerance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium-Hard | DP, Word Break, Backtracking |
| LLD | Hard | In-Memory DB, Transactions, TTL |
| System Design | Hard | Distributed Config Service |
| HM/AS | Medium | Growth Mindset, Ownership |
