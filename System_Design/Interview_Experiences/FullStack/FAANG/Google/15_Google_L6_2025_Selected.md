# Google — Staff SWE FullStack Interview Experience (2025) — #15

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Staff Software Engineer |
| **Level** | L6 |
| **YOE** | 12 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Platform — Dataflow |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Googliness + Tech Leadership)

---

## Round 1: Coding — Range Module
**Duration:** 45 minutes

### Question: Implement a Range Module that tracks half-open intervals and supports addRange, queryRange, removeRange

```
addRange(10, 20)       → {[10,20)}
addRange(14, 16)       → {[10,20)}  (already covered)
queryRange(10, 14)     → true
queryRange(13, 15)     → true
removeRange(14, 16)    → {[10,14), [16,20)}
queryRange(10, 14)     → true
queryRange(14, 16)     → false
```

### 💡 Solution: TreeMap-based Interval Management

```java
import java.util.TreeMap;

/**
 * Range Module using TreeMap (balanced BST) for O(log N) operations.
 * 
 * Key insight: store intervals as TreeMap<start, end>.
 * - floorKey(left) finds the interval that could overlap from the left
 * - For add/remove, merge/split affected intervals
 * 
 * Time: O(K log N) per operation where K = number of overlapping intervals removed
 * Space: O(N) where N = number of disjoint intervals
 */
class RangeModule {
    // TreeMap: key = interval start, value = interval end
    private TreeMap<Integer, Integer> intervals;
    
    public RangeModule() {
        intervals = new TreeMap<>();
    }
    
    /**
     * Add half-open interval [left, right). Merge with any overlapping intervals.
     */
    public void addRange(int left, int right) {
        // Find the first interval that could overlap (start <= left)
        Integer start = intervals.floorKey(left);
        Integer end;
        
        // If that interval covers left, extend from there
        if (start != null && intervals.get(start) >= left) {
            left = start;
        }
        
        // Find the last interval that starts before right
        end = intervals.floorKey(right);
        if (end != null && intervals.get(end) >= right) {
            right = intervals.get(end);
        }
        
        // Remove all intervals that are now fully covered
        intervals.subMap(left, true, right, true).clear();
        
        // Insert the merged interval
        intervals.put(left, right);
    }
    
    /**
     * Query: does the module cover every point in [left, right)?
     */
    public boolean queryRange(int left, int right) {
        Integer start = intervals.floorKey(left);
        return start != null && intervals.get(start) >= right;
    }
    
    /**
     * Remove half-open interval [left, right). Split intervals if necessary.
     */
    public void removeRange(int left, int right) {
        // Find intervals that need to be trimmed or removed
        // Left side: interval that might extend past left boundary
        Integer start = intervals.floorKey(left);
        if (start != null && intervals.get(start) > left) {
            int originalEnd = intervals.get(start);
            intervals.put(start, left);  // Trim: [start, left)
            
            // If the original interval extends past right, add the remainder
            if (originalEnd > right) {
                intervals.put(right, originalEnd);  // [right, originalEnd)
            }
        }
        
        // Right side: interval that might extend past right boundary
        Integer end = intervals.floorKey(right);
        if (end != null && end > left && intervals.get(end) > right) {
            intervals.put(right, intervals.get(end));  // [right, originalEnd)
        }
        
        // Remove all intervals completely within [left, right)
        // Start from the next key after left (we already handled the partial at left)
        Integer nextKey = intervals.higherKey(left);
        while (nextKey != null && nextKey < right) {
            intervals.remove(nextKey);
            nextKey = intervals.higherKey(left);
        }
    }
}
```

---

## Round 2: System Design — Google Cloud Dataflow (Apache Beam)
**Duration:** 45 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│               Google Cloud Dataflow Architecture                │
│                                                                 │
│  User Code (Apache Beam SDK)                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Pipeline p = Pipeline.create(options);                    │   │
│  │ p.apply(KafkaIO.read())                                   │   │
│  │  .apply(Window.into(FixedWindows.of(Duration.minutes(5))))│   │
│  │  .apply(GroupByKey.create())                               │   │
│  │  .apply(ParDo.of(new ProcessFn()))                        │   │
│  │  .apply(BigQueryIO.write());                              │   │
│  │ p.run();                                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                      DAG Construction                           │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dataflow Service (Control Plane)                          │   │
│  │                                                           │   │
│  │ 1. Graph Optimizer                                        │   │
│  │    - Fuse stages: combine multiple ParDo into one         │   │
│  │    - Optimize shuffle: minimize data movement             │   │
│  │    - Dead code elimination                                │   │
│  │                                                           │   │
│  │ 2. Job Manager                                            │   │
│  │    - Assign work bundles to workers                       │   │
│  │    - Monitor progress (watermark tracking)                │   │
│  │    - Autoscale: based on backlog + throughput              │   │
│  │                                                           │   │
│  │ 3. Watermark Tracker                                      │   │
│  │    - Per-source watermark: min(unprocessed timestamps)    │   │
│  │    - Propagate through DAG stages                         │   │
│  │    - Trigger windows when watermark passes window end     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Data Plane (Worker Pool)                                  │   │
│  │                                                           │   │
│  │ Worker 1   Worker 2   Worker 3   ...   Worker N           │   │
│  │ ┌────────┐ ┌────────┐ ┌────────┐       ┌────────┐        │   │
│  │ │Bundle 1│ │Bundle 4│ │Bundle 7│       │Bundle M│        │   │
│  │ │Bundle 2│ │Bundle 5│ │Bundle 8│       │Bundle..│        │   │
│  │ │Bundle 3│ │Bundle 6│ │Bundle 9│       │        │        │   │
│  │ └────────┘ └────────┘ └────────┘       └────────┘        │   │
│  │                                                           │   │
│  │ Per-Worker State:                                         │   │
│  │ - Windowed state (per key, per window)                    │   │
│  │ - Timers (event-time and processing-time)                 │   │
│  │ - Side inputs (broadcast to all workers)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Shuffle Service (Persistent)                              │   │
│  │                                                           │   │
│  │ - GroupByKey / CoGroupByKey implemented as shuffle         │   │
│  │ - Data written to Colossus (persistent storage)           │   │
│  │ - Enables: exactly-once, dynamic work rebalancing         │   │
│  │ - Workers can fail and resume from checkpoint             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Key Concepts:                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Windowing:                                                │   │
│  │   Fixed (5 min) | Sliding (5 min / 1 min) | Session      │   │
│  │                                                           │   │
│  │ Watermark = min(unprocessed event timestamps)             │   │
│  │   When watermark > window.end → fire window trigger       │   │
│  │   Late data: allowed_lateness + accumulation mode         │   │
│  │                                                           │   │
│  │ Exactly-Once Semantics:                                   │   │
│  │   Source checkpoint + shuffle idempotency + sink dedup    │   │
│  │   Deterministic: same input bundle → same output          │   │
│  │                                                           │   │
│  │ Dynamic Work Rebalancing (Liquid Sharding):               │   │
│  │   Worker A has 80% of key space, almost done              │   │
│  │   Worker B has 20%, very slow                             │   │
│  │   → Steal remaining work from B, give to A               │   │
│  │   Enabled by persistent shuffle (Colossus)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Scale:
- Petabytes/day throughput
- Auto-scale: 1 to 10,000+ workers dynamically
- Latency: < 1 second for streaming, minutes for batch

---

## 🎯 Key Takeaways
- Google L6 = **Range Module (TreeMap interval management) + Dataflow system design**
- **TreeMap for intervals**: `floorKey(left)` finds the first relevant interval — O(log N) lookups
- **Merge intervals**: find all overlapping intervals with `subMap()`, clear them, insert merged
- **Split intervals**: removeRange may need to trim left part + create right remnant
- **Watermark**: min(unprocessed event timestamps) — when watermark passes window end, window fires
- **Liquid Sharding**: dynamically steal work from slow workers — enabled by persistent shuffle
- **Stage fusion**: combine multiple ParDo operations into one to reduce serialization overhead
- **Exactly-once**: source checkpoint + shuffle idempotency + sink deduplication — 3 layers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | TreeMap, Interval Management |
| Coding 2 | Hard | DSA (not covered here) |
| System Design | Very Hard | Streaming Processing, Watermarks |
| Googliness | Medium | Behavioral |
| Tech Leadership | Hard | Architecture, Tradeoffs |
