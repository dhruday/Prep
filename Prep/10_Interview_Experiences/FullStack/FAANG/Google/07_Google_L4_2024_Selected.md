# Google — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer L4 |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | November 2024 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 6 weeks (HC took 3 weeks)
- **Format:** Virtual

---

## Round 1: Phone Screen — Coding
**Duration:** 45 minutes

### Questions Asked
1. **Design a data structure for LFU Cache** (LeetCode 460)

### 💡 Interview-Ready Answer — LFU Cache

```java
class LFUCache {
    int capacity, minFreq;
    Map<Integer, int[]> cache;           // key → [value, freq]
    Map<Integer, LinkedHashSet<Integer>> freqMap; // freq → keys (insertion order)
    
    public LFUCache(int capacity) {
        this.capacity = capacity;
        this.minFreq = 0;
        this.cache = new HashMap<>();
        this.freqMap = new HashMap<>();
    }
    
    public int get(int key) {
        if (!cache.containsKey(key)) return -1;
        
        int[] entry = cache.get(key);
        updateFreq(key, entry);
        return entry[0];
    }
    
    public void put(int key, int value) {
        if (capacity <= 0) return;
        
        if (cache.containsKey(key)) {
            int[] entry = cache.get(key);
            entry[0] = value;
            updateFreq(key, entry);
            return;
        }
        
        // Evict if at capacity
        if (cache.size() >= capacity) {
            LinkedHashSet<Integer> minFreqKeys = freqMap.get(minFreq);
            int evictKey = minFreqKeys.iterator().next(); // least recently used among least frequent
            minFreqKeys.remove(evictKey);
            if (minFreqKeys.isEmpty()) freqMap.remove(minFreq);
            cache.remove(evictKey);
        }
        
        // Insert new
        cache.put(key, new int[]{value, 1});
        freqMap.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }
    
    private void updateFreq(int key, int[] entry) {
        int oldFreq = entry[1];
        entry[1]++;
        
        // Remove from old frequency bucket
        LinkedHashSet<Integer> oldSet = freqMap.get(oldFreq);
        oldSet.remove(key);
        if (oldSet.isEmpty()) {
            freqMap.remove(oldFreq);
            if (minFreq == oldFreq) minFreq++;
        }
        
        // Add to new frequency bucket
        freqMap.computeIfAbsent(oldFreq + 1, k -> new LinkedHashSet<>()).add(key);
    }
}
```
**Time:** O(1) for get and put. **Space:** O(capacity)

---

## Round 2: Onsite — Coding (Algorithms)
**Duration:** 45 minutes

### Questions Asked
1. **Random Pick with Weight** (LeetCode 528)
2. Follow-up: **What if weights change frequently?**

### 💡 Interview-Ready Answer

```java
class Solution {
    int[] prefixSum;
    Random rand = new Random();
    
    public Solution(int[] w) {
        prefixSum = new int[w.length];
        prefixSum[0] = w[0];
        for (int i = 1; i < w.length; i++) {
            prefixSum[i] = prefixSum[i - 1] + w[i];
        }
    }
    
    public int pickIndex() {
        int target = rand.nextInt(prefixSum[prefixSum.length - 1]) + 1;
        
        // Binary search for leftmost index where prefixSum[i] >= target
        int lo = 0, hi = prefixSum.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (prefixSum[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
```

**Follow-up: Dynamic weights (Fenwick Tree)**
```java
class DynamicWeightedPick {
    int[] tree; // BIT (Binary Indexed Tree)
    int n;
    Random rand = new Random();
    
    DynamicWeightedPick(int[] weights) {
        n = weights.length;
        tree = new int[n + 1];
        for (int i = 0; i < n; i++) update(i, weights[i]);
    }
    
    // Update weight at index
    void update(int idx, int delta) {
        idx++;
        while (idx <= n) {
            tree[idx] += delta;
            idx += idx & (-idx);
        }
    }
    
    // Prefix sum query
    int query(int idx) {
        idx++;
        int sum = 0;
        while (idx > 0) {
            sum += tree[idx];
            idx -= idx & (-idx);
        }
        return sum;
    }
    
    int pick() {
        int totalWeight = query(n - 1);
        int target = rand.nextInt(totalWeight) + 1;
        
        // Binary search on BIT
        int lo = 0, hi = n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (query(mid) < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
```

---

## Round 3: Onsite — System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Docs — Collaborative Text Editor**

### 💡 Interview-Ready Answer

```
Collaborative Editing — Two Main Approaches:

1. OT (Operational Transformation) — Google Docs uses this
   - Transform operations against concurrent operations
   - Central server resolves conflicts
   - Operations: insert(pos, char), delete(pos)
   
2. CRDT (Conflict-free Replicated Data Types) — newer approach
   - Each character has unique ID, no central server needed
   - No conflict resolution needed — mathematical guarantee
   - Used by: Figma, Apple Notes

Architecture (OT-based — Google's approach):
┌──────────────────────────────────────────────────────────────┐
│  Client A                           Client B                  │
│  ┌──────────┐                       ┌──────────┐             │
│  │ Local    │                       │ Local    │             │
│  │ Document │                       │ Document │             │
│  │ State    │                       │ State    │             │
│  └────┬─────┘                       └────┬─────┘             │
│       │ op: insert(5, 'X')              │ op: delete(3)      │
│       │                                  │                    │
│       └──────────────┬───────────────────┘                   │
│                      ▼                                        │
│              ┌──────────────┐                                │
│              │ OT Server    │                                │
│              │              │                                │
│              │ Transform:   │                                │
│              │ A's insert(5,'X') vs B's delete(3)           │
│              │ → A gets: delete(3)        (no change)       │
│              │ → B gets: insert(4,'X')    (shifted by -1)   │
│              │                                               │
│              │ Both converge to same document state!         │
│              └──────────────┘                                │
└──────────────────────────────────────────────────────────────┘
```

#### OT Transform Function
```javascript
// Core OT transform: given two concurrent operations, transform each
// so when applied in either order, they produce the same result

function transform(opA, opB) {
  // Both insert
  if (opA.type === 'insert' && opB.type === 'insert') {
    if (opA.position < opB.position || 
        (opA.position === opB.position && opA.clientId < opB.clientId)) {
      // A goes first: B needs to shift right
      return [opA, { ...opB, position: opB.position + opA.text.length }];
    } else {
      // B goes first: A shifts right
      return [{ ...opA, position: opA.position + opB.text.length }, opB];
    }
  }
  
  // A inserts, B deletes
  if (opA.type === 'insert' && opB.type === 'delete') {
    if (opA.position <= opB.position) {
      return [opA, { ...opB, position: opB.position + opA.text.length }];
    } else if (opA.position > opB.position + opB.count) {
      return [{ ...opA, position: opA.position - opB.count }, opB];
    } else {
      // Insert inside deleted range — place at delete position
      return [{ ...opA, position: opB.position }, opB];
    }
  }
  
  // Both delete
  if (opA.type === 'delete' && opB.type === 'delete') {
    if (opA.position >= opB.position + opB.count) {
      return [{ ...opA, position: opA.position - opB.count }, opB];
    } else if (opB.position >= opA.position + opA.count) {
      return [opA, { ...opB, position: opB.position - opA.count }];
    } else {
      // Overlapping deletes — handle carefully
      // Only delete the non-overlapping parts
      const overlapStart = Math.max(opA.position, opB.position);
      const overlapEnd = Math.min(opA.position + opA.count, opB.position + opB.count);
      const overlap = overlapEnd - overlapStart;
      
      return [
        { ...opA, count: opA.count - overlap, position: Math.min(opA.position, opB.position) },
        { ...opB, count: opB.count - overlap, position: Math.min(opA.position, opB.position) }
      ];
    }
  }
  
  // B inserts, A deletes (symmetric)
  const [transformedB, transformedA] = transform(opB, opA);
  return [transformedA, transformedB];
}
```

#### Client-Side Architecture
```
Document Model:
- Document = array of paragraphs
- Each paragraph = rich text with formatting spans
- Formatting: { bold: true, italic: false, fontSize: 14, color: "#000" }

Client Components:
1. Editor: ContentEditable div (or custom text engine like ProseMirror)
2. Operation Buffer: Queue local operations, send in order
3. Transform Engine: Apply OT when receiving remote operations
4. Presence Manager: Show remote cursors (colored, named)
5. Save Manager: Periodic snapshot to prevent unbounded operation log

Cursor Presence:
- Each client sends cursor position via WebSocket
- Server broadcasts to all other clients
- Remote cursors rendered as colored vertical bars with name tooltip
- Update position on every keystroke (debounced to 100ms)
```

---

## Round 4: Onsite — Behavioral (Googleyness)
**Duration:** 45 minutes

### Questions Asked
1. **"Tell me about a time you had to convince your team to adopt a new technology"**
2. **"How do you handle ambiguity in project requirements?"**

---

## 🎯 Key Takeaways
- **LFU Cache** (O(1) all operations) = HashMap + FreqMap + LinkedHashSet — harder than LRU
- **Weighted Random Pick** with binary search on prefix sum is elegant
- **Follow-up to Fenwick Tree** for dynamic weights — Google loves follow-ups
- **Google Docs / Collaborative Editing** is the ultimate system design question
- **Operational Transformation** — understand the transform function conceptually
- **OT vs CRDT** — know trade-offs: OT needs server, CRDT is P2P-friendly but uses more memory
- HC (Hiring Committee) is the real bottleneck at Google — strong performance ≠ guaranteed offer

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | LFU Cache, Data Structures |
| Coding | Medium-Hard | Probability, Binary Search, BIT |
| System Design | Very Hard | Collaborative Editing, OT, Real-Time |
| Behavioral | Medium | Googleyness, Leadership |
