# Oracle — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Member of Technical Staff |
| **Level** | SDE-3 (IC4) |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | OCI (Oracle Cloud Infrastructure) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Phone Screen + 2 Technical + HM)

---

## Round 3: Technical — Implement a Lock-Free Skip List
**Duration:** 60 minutes

### Question: Implement a concurrent skip list with lock-free search and fine-grained locking for insert/delete. Support range queries.

```java
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Concurrent Skip List:
 * 
 * Skip List = sorted linked list with express lanes at multiple levels.
 * Search: O(log N) expected — start from top level, go right or down.
 * Insert: O(log N) — find position at each level, insert with random height.
 * Delete: O(log N) — logical delete (mark), then physical unlink.
 * 
 * Concurrency: 
 * - Search is lock-free (just follows next pointers)
 * - Insert/Delete use fine-grained per-node locking + validation
 * - Based on Herlihy & Shavit "The Art of Multiprocessor Programming"
 */
class ConcurrentSkipList<K extends Comparable<K>, V> {
    
    static final int MAX_LEVEL = 32;
    
    static class Node<K, V> {
        final K key;
        volatile V value;
        final Node<K, V>[] next; // Array of forward pointers (one per level)
        volatile boolean marked; // Logically deleted
        final ReentrantLock lock;
        final int topLevel;
        
        @SuppressWarnings("unchecked")
        Node(K key, V value, int height) {
            this.key = key;
            this.value = value;
            this.next = new Node[height + 1];
            this.marked = false;
            this.lock = new ReentrantLock();
            this.topLevel = height;
        }
        
        // Sentinel node (head or tail)
        @SuppressWarnings("unchecked")
        Node(int height) {
            this.key = null;
            this.value = null;
            this.next = new Node[height + 1];
            this.marked = false;
            this.lock = new ReentrantLock();
            this.topLevel = height;
        }
    }
    
    private final Node<K, V> head;
    private final Node<K, V> tail;
    
    public ConcurrentSkipList() {
        head = new Node<>(MAX_LEVEL);
        tail = new Node<>(MAX_LEVEL);
        
        for (int i = 0; i <= MAX_LEVEL; i++) {
            head.next[i] = tail;
        }
    }
    
    /**
     * Random level generation: geometric distribution.
     * P(level >= k) = (1/2)^k
     * Expected height = O(log N)
     */
    private int randomLevel() {
        int level = 0;
        while (level < MAX_LEVEL && ThreadLocalRandom.current().nextBoolean()) {
            level++;
        }
        return level;
    }
    
    /**
     * Find predecessors and successors at each level.
     * Lock-free traversal — just follow next pointers.
     * 
     * preds[i] = rightmost node at level i with key < target
     * succs[i] = preds[i].next[i] = leftmost node at level i with key >= target
     * 
     * Returns layer where key was found, or -1 if not found.
     */
    @SuppressWarnings("unchecked")
    private int find(K key, Node<K, V>[] preds, Node<K, V>[] succs) {
        int foundLevel = -1;
        Node<K, V> pred = head;
        
        for (int level = MAX_LEVEL; level >= 0; level--) {
            Node<K, V> curr = pred.next[level];
            
            while (curr != tail && curr.key.compareTo(key) < 0) {
                pred = curr;
                curr = pred.next[level];
            }
            
            if (foundLevel == -1 && curr != tail && curr.key.compareTo(key) == 0) {
                foundLevel = level;
            }
            
            preds[level] = pred;
            succs[level] = curr;
        }
        
        return foundLevel;
    }
    
    /**
     * Search: lock-free, O(log N) expected.
     */
    public V get(K key) {
        @SuppressWarnings("unchecked")
        Node<K, V>[] preds = new Node[MAX_LEVEL + 1];
        @SuppressWarnings("unchecked")
        Node<K, V>[] succs = new Node[MAX_LEVEL + 1];
        
        int found = find(key, preds, succs);
        
        if (found != -1) {
            Node<K, V> node = succs[found];
            if (!node.marked) return node.value;
        }
        
        return null;
    }
    
    /**
     * Insert: fine-grained locking at each level.
     * 
     * 1. Find preds/succs
     * 2. Lock preds at each level
     * 3. Validate (preds still point to succs, neither marked)
     * 4. Link new node
     */
    @SuppressWarnings("unchecked")
    public boolean put(K key, V value) {
        int topLevel = randomLevel();
        Node<K, V>[] preds = new Node[MAX_LEVEL + 1];
        Node<K, V>[] succs = new Node[MAX_LEVEL + 1];
        
        while (true) {
            int found = find(key, preds, succs);
            
            // Key exists and not deleted — update value
            if (found != -1) {
                Node<K, V> nodeFound = succs[found];
                if (!nodeFound.marked) {
                    nodeFound.value = value;
                    return false; // Updated, not inserted
                }
                continue; // Retry — node is being deleted
            }
            
            // Lock and validate
            int highestLocked = -1;
            boolean valid = true;
            
            try {
                for (int level = 0; valid && level <= topLevel; level++) {
                    Node<K, V> pred = preds[level];
                    Node<K, V> succ = succs[level];
                    
                    pred.lock.lock();
                    highestLocked = level;
                    
                    // Validate: pred still points to succ, neither marked
                    valid = !pred.marked && !succ.marked && pred.next[level] == succ;
                }
                
                if (!valid) continue; // Retry
                
                Node<K, V> newNode = new Node<>(key, value, topLevel);
                
                // Link bottom-up
                for (int level = 0; level <= topLevel; level++) {
                    newNode.next[level] = succs[level];
                    preds[level].next[level] = newNode;
                }
                
                return true;
                
            } finally {
                for (int level = highestLocked; level >= 0; level--) {
                    preds[level].lock.unlock();
                }
            }
        }
    }
    
    /**
     * Delete: logical delete (mark) + physical unlink.
     */
    @SuppressWarnings("unchecked")
    public boolean remove(K key) {
        Node<K, V>[] preds = new Node[MAX_LEVEL + 1];
        Node<K, V>[] succs = new Node[MAX_LEVEL + 1];
        
        while (true) {
            int found = find(key, preds, succs);
            
            if (found == -1) return false; // Key not found
            
            Node<K, V> victim = succs[found];
            if (victim.marked) return false; // Already being deleted
            
            // Lock victim first, then lock preds bottom-up
            victim.lock.lock();
            try {
                if (victim.marked) return false;
                
                victim.marked = true; // Logical delete
                
                // Physical unlink at each level
                int highestLocked = -1;
                boolean valid = true;
                
                try {
                    for (int level = victim.topLevel; valid && level >= 0; level--) {
                        Node<K, V> pred = preds[level];
                        pred.lock.lock();
                        highestLocked = level;
                        valid = !pred.marked && pred.next[level] == victim;
                    }
                    
                    if (!valid) {
                        victim.marked = false; // Undo
                        continue; // Retry
                    }
                    
                    for (int level = victim.topLevel; level >= 0; level--) {
                        preds[level].next[level] = victim.next[level];
                    }
                    
                    return true;
                    
                } finally {
                    for (int level = highestLocked; level >= 0; level--) {
                        preds[level].lock.unlock();
                    }
                }
                
            } finally {
                victim.lock.unlock();
            }
        }
    }
    
    /**
     * Range query: return all entries where fromKey <= key <= toKey.
     * Lock-free — consistent snapshot not guaranteed (eventual).
     */
    public List<Map.Entry<K, V>> range(K fromKey, K toKey) {
        List<Map.Entry<K, V>> result = new ArrayList<>();
        
        // Find starting position
        Node<K, V> node = head;
        for (int level = MAX_LEVEL; level >= 0; level--) {
            while (node.next[level] != tail && node.next[level].key.compareTo(fromKey) < 0) {
                node = node.next[level];
            }
        }
        
        // Traverse level 0
        node = node.next[0];
        while (node != tail && node.key.compareTo(toKey) <= 0) {
            if (!node.marked) {
                result.add(Map.entry(node.key, node.value));
            }
            node = node.next[0];
        }
        
        return result;
    }
}
```

---

## 🎯 Key Takeaways
- Oracle IC4 = **Concurrent skip list — lock-free search, fine-grained locking for mutation**
- **Skip list levels**: geometric P=0.5 — expected height O(log N), expected search O(log N)
- **Lock-free search**: just follow next pointers through levels — no locks, no CAS
- **Optimistic insert**: find → lock predecessors → validate → link — if validation fails, retry
- **Logical deletion**: mark node first (lazy) → then physically unlink — prevents lost updates
- **Validation**: `!pred.marked && !succ.marked && pred.next[level] == succ` — ensures structure hasn't changed
- **Bottom-up linking**: crucial — ensures a partially-linked node is still findable from level 0
- **Range query**: skip to `fromKey` using express lanes, then scan level 0 — O(log N + K) where K = result size
- Oracle = **database internals, JVM, concurrency** — skip lists power ConcurrentSkipListMap in Java

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Phone Screen | Medium-Hard | Java Internals |
| Technical 1 | Very Hard | Concurrency |
| Technical 2 (this) | Extremely Hard | Lock-Free Skip List |
| HM | Medium | Culture |
