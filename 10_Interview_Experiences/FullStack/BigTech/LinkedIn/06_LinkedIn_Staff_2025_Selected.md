# LinkedIn — Senior FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Staff Software Engineer |
| **Level** | Senior Staff |
| **YOE** | 11 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Sunnyvale, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Feed Infrastructure |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Design a Time-Based Key-Value Store with Compaction
**Duration:** 45 minutes

### Question: Implement a TimeMap that stores multiple values for the same key with timestamps, and can retrieve the value at a given point in time. Support compaction (remove values older than a threshold).

```java
import java.util.*;

/**
 * Time-Based Key-Value Store:
 * - set(key, value, timestamp): store value at timestamp
 * - get(key, timestamp): return value at or before timestamp
 * - compact(key, beforeTimestamp): remove entries older than threshold
 * 
 * Implementation: TreeMap per key for O(log N) lookups via floorKey.
 * 
 * Time: set O(log N), get O(log N), compact O(K) where K = entries removed
 * Space: O(N) total entries
 */
class TimeBasedKV {
    
    // Key → TreeMap<timestamp, value>
    private Map<String, TreeMap<Integer, String>> store;
    
    // Statistics for monitoring
    private long totalEntries = 0;
    private long compactedEntries = 0;
    
    public TimeBasedKV() {
        store = new HashMap<>();
    }
    
    /**
     * Store value at timestamp.
     * If same key+timestamp exists, overwrite.
     */
    public void set(String key, String value, int timestamp) {
        TreeMap<Integer, String> timeline = store.computeIfAbsent(key, k -> new TreeMap<>());
        
        if (!timeline.containsKey(timestamp)) {
            totalEntries++;
        }
        
        timeline.put(timestamp, value);
    }
    
    /**
     * Get value at or before timestamp.
     * Uses TreeMap.floorEntry() for O(log N) lookup.
     * 
     * Returns null if no entry exists at or before the given timestamp.
     */
    public String get(String key, int timestamp) {
        TreeMap<Integer, String> timeline = store.get(key);
        if (timeline == null) return null;
        
        Map.Entry<Integer, String> entry = timeline.floorEntry(timestamp);
        return entry != null ? entry.getValue() : null;
    }
    
    /**
     * Get all values for a key within a time range [from, to].
     * Useful for displaying version history.
     */
    public List<Map.Entry<Integer, String>> getRange(String key, int from, int to) {
        TreeMap<Integer, String> timeline = store.get(key);
        if (timeline == null) return Collections.emptyList();
        
        return new ArrayList<>(timeline.subMap(from, true, to, true).entrySet());
    }
    
    /**
     * Compact: remove entries older than beforeTimestamp.
     * But keep the LATEST entry before the threshold (it may still be the 
     * "current" value for queries between that entry and the threshold).
     * 
     * This is the tricky part: naive deletion breaks get() queries.
     * 
     * Strategy: keep the entry at floorKey(beforeTimestamp),
     * remove everything strictly before it.
     */
    public int compact(String key, int beforeTimestamp) {
        TreeMap<Integer, String> timeline = store.get(key);
        if (timeline == null) return 0;
        
        // Find the latest entry at or before the threshold — keep it
        Integer keepTimestamp = timeline.floorKey(beforeTimestamp);
        
        if (keepTimestamp == null) return 0; // Nothing to compact
        
        // Get the submap of entries strictly before the kept entry
        SortedMap<Integer, String> toRemove = timeline.headMap(keepTimestamp, false); // exclusive
        
        int removed = toRemove.size();
        toRemove.clear(); // Removes from the backing TreeMap
        
        compactedEntries += removed;
        totalEntries -= removed;
        
        // If timeline is empty (only had entries before threshold), remove key
        if (timeline.isEmpty()) {
            store.remove(key);
        }
        
        return removed;
    }
    
    /**
     * Compact all keys older than beforeTimestamp.
     * In production: run as background job every N minutes.
     */
    public int compactAll(int beforeTimestamp) {
        int totalRemoved = 0;
        
        // Iterate over copy of keys to avoid ConcurrentModification
        for (String key : new ArrayList<>(store.keySet())) {
            totalRemoved += compact(key, beforeTimestamp);
        }
        
        return totalRemoved;
    }
    
    /**
     * Statistics for monitoring/alerting.
     */
    public Map<String, Object> stats() {
        return Map.of(
            "totalKeys", store.size(),
            "totalEntries", totalEntries,
            "compactedEntries", compactedEntries,
            "avgEntriesPerKey", store.isEmpty() ? 0 : (double) totalEntries / store.size()
        );
    }
}

/**
 * Application: LinkedIn Feed — store feed rankings over time.
 * 
 * Each user's feed is re-ranked periodically.
 * TimeBasedKV stores rankings at each recalculation timestamp.
 * 
 * get(userId, currentTime) → latest ranking before now
 * compact(userId, 1hourAgo) → remove old rankings, keep latest
 * 
 * This enables:
 * - Time-travel debugging: "what did user's feed look like at 3pm?"
 * - A/B test analysis: compare rankings at same timestamp
 * - Efficient storage: compact old rankings that are no longer needed
 */
```

---

## 🎯 Key Takeaways
- LinkedIn Staff = **Time-based KV store with compaction + Feed infrastructure system design**
- **TreeMap.floorEntry()**: O(log N) lookup for "value at or before timestamp" — key data structure choice
- **Compaction trap**: naive deletion breaks `get()` — must KEEP the latest entry before threshold
- **headMap(key, exclusive)**: TreeMap's subMap operations — `clear()` removes from backing map
- **Time-travel queries**: store version history per key — enables debugging, A/B analysis
- **Background compaction**: run periodically to control memory — similar to LSM-Tree compaction in databases
- LinkedIn = **feed infrastructure** at scale — ranking, personalization, real-time updates
- Hiring bar for Staff = **system design depth + production experience with distributed data stores**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA |
| Coding | Hard | TreeMap, Time-Based Store, Compaction |
| System Design | Very Hard | Feed Infrastructure |
| Behavioral | Hard | Leadership, Influence |
| Architecture | Hard | Distributed Systems |
