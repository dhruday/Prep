# Walmart — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 DSA + System Design + HM)
- **Rejection Reason:** System Design — couldn't scale grocery delivery fleet management

---

## Round 1: Online Assessment
**Duration:** 75 minutes

### Questions Asked
1. **Maximum Length of Pair Chain** (LeetCode 646)
2. **Encode and Decode Strings** (LeetCode 271)

### 💡 Maximum Length Pair Chain

```java
// Greedy (like Activity Selection): sort by end, greedily pick non-overlapping
public int findLongestChain(int[][] pairs) {
    // Sort by second element (end time)
    Arrays.sort(pairs, (a, b) -> a[1] - b[1]);
    
    int count = 1;
    int currentEnd = pairs[0][1];
    
    for (int i = 1; i < pairs.length; i++) {
        if (pairs[i][0] > currentEnd) { // Strictly greater
            count++;
            currentEnd = pairs[i][1];
        }
    }
    
    return count;
}
// Time: O(n log n), Space: O(1)
// Key insight: sort by END (not start) — greedy choice: pick pair that ends earliest

// Encode/Decode Strings
class Codec {
    // Format: length + "#" + string
    // "Hello" + "World" → "5#Hello5#World"
    public String encode(List<String> strs) {
        StringBuilder sb = new StringBuilder();
        for (String s : strs) {
            sb.append(s.length()).append('#').append(s);
        }
        return sb.toString();
    }
    
    public List<String> decode(String s) {
        List<String> result = new ArrayList<>();
        int i = 0;
        
        while (i < s.length()) {
            int hashIdx = s.indexOf('#', i);
            int len = Integer.parseInt(s.substring(i, hashIdx));
            String str = s.substring(hashIdx + 1, hashIdx + 1 + len);
            result.add(str);
            i = hashIdx + 1 + len;
        }
        
        return result;
    }
}
```

---

## Round 2: DSA Round 1
**Duration:** 60 minutes

### Questions Asked
1. **Time Based Key-Value Store** (LeetCode 981)
2. **Follow-up: Evict entries older than T seconds**

### 💡 Time-Based KV Store

```java
class TimeMap {
    private final Map<String, TreeMap<Integer, String>> store;
    
    TimeMap() {
        store = new HashMap<>();
    }
    
    void set(String key, String value, int timestamp) {
        store.computeIfAbsent(key, k -> new TreeMap<>()).put(timestamp, value);
    }
    
    String get(String key, int timestamp) {
        TreeMap<Integer, String> timeMap = store.get(key);
        if (timeMap == null) return "";
        
        // floorEntry: largest key <= timestamp
        Map.Entry<Integer, String> entry = timeMap.floorEntry(timestamp);
        return entry != null ? entry.getValue() : "";
    }
    
    // Follow-up: Evict entries older than T seconds from a given reference time
    void evict(String key, int referenceTime, int ttlSeconds) {
        TreeMap<Integer, String> timeMap = store.get(key);
        if (timeMap == null) return;
        
        int threshold = referenceTime - ttlSeconds;
        // Remove all entries with timestamp < threshold
        timeMap.headMap(threshold).clear();
        
        if (timeMap.isEmpty()) store.remove(key);
    }
    
    // Alternative: If timestamps are always increasing (guaranteed by problem):
    // Use ArrayList<int[], String> + binary search (more cache-friendly)
}
// set: O(log n), get: O(log n) — TreeMap operations
// With ArrayList: get uses Arrays.binarySearch → O(log n) but better cache performance
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Walmart's Grocery Delivery & Fleet Management System**
   - Order scheduling, driver assignment, route optimization, real-time tracking

### 💡 Interview-Ready Answer

```
Walmart Grocery Delivery:
┌──────────────────────────────────────────────────────────────┐
│  Order Flow:                                                  │
│  1. Customer selects delivery slot (2-hour windows)          │
│  2. Order placed → Picker in store picks items               │
│  3. Picked order staged in cold storage                      │
│  4. Driver assigned → picks up from store → delivers         │
│                                                                │
│  Slot Management:                                             │
│  - Per store: capacity = number of pickers × pick rate       │
│  - Each 2-hour slot: max N orders (based on picker capacity) │
│  - Dynamic pricing: peak slots (5-8 PM) cost more           │
│  - Same-day: limited slots based on current picker load      │
│                                                                │
│  Fleet Management:                                            │
│  ┌──────────────────────────────────────────────┐            │
│  │ Fleet Optimizer (runs every 5 min)            │            │
│  │                                                │            │
│  │ Input:                                         │            │
│  │ - Pending deliveries (staged orders)           │            │
│  │ - Available drivers + current location         │            │
│  │ - Delivery time windows (promised ETA)         │            │
│  │ - Traffic conditions (Google Maps API)         │            │
│  │ - Vehicle capacity (weight, volume, cold chain)│            │
│  │                                                │            │
│  │ Algorithm: Vehicle Routing Problem (VRP)       │            │
│  │ - NP-hard → use heuristics:                    │            │
│  │   1. Nearest Neighbor + 2-opt improvement      │            │
│  │   2. OR-Tools (Google's solver) for clusters   │            │
│  │   3. Cluster-first, route-second:              │            │
│  │      - K-means cluster deliveries by geo       │            │
│  │      - Assign driver to nearest cluster        │            │
│  │      - TSP within cluster (nearest neighbor)   │            │
│  │                                                │            │
│  │ Output:                                         │            │
│  │ - Driver → ordered list of deliveries          │            │
│  │ - Estimated time per stop                      │            │
│  │ - Total route distance and time                │            │
│  └──────────────────────────────────────────────┘            │
│                                                                │
│  Driver Assignment:                                           │
│  Priority scoring:                                            │
│  - Distance to store (40%)                                   │
│  - Shift hours remaining (20%)                               │
│  - Vehicle capacity fit (20%)                                │
│  - Customer rating (10%)                                     │
│  - Cold chain capability (10% — for frozen/dairy)            │
│                                                                │
│  Real-Time Tracking:                                          │
│  - Driver app: GPS ping every 10s → Kafka → Location Service │
│  - Customer view: WebSocket for live map                     │
│  - ETA update: recalculate on each GPS ping                  │
│    ETA = remaining_stops × avg_delivery_time + driving_time  │
│                                                                │
│  Picking Optimization:                                        │
│  - Store layout map: aisles, sections, shelf positions       │
│  - Pick path: TSP through item locations (minimize walking)  │
│  - Substitution: if item out of stock:                       │
│    1. Check inventory for brand alternatives                 │
│    2. Use ML model: "customers who bought X also accept Y"  │
│    3. If no sub: refund item, recalculate order total        │
│                                                                │
│  Cold Chain:                                                  │
│  - Temperature monitoring: IoT sensors in delivery bags      │
│  - Alert if frozen goods >-15°C or dairy >4°C               │
│  - Delivery priority: cold items delivered first in route    │
│                                                                │
│  Scale:                                                       │
│  - 4700+ stores in US with delivery                          │
│  - 100K+ delivery drivers (gig + employed)                   │
│  - Peak: 10K concurrent deliveries                           │
│  - ETA accuracy target: <15 min deviation in 90% of cases   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Walmart = **grocery delivery + logistics optimization** — unique among tech companies
- **Pair Chain** = Activity Selection (sort by end, greedy pick) — similar to meeting rooms
- **Time-Based KV** = TreeMap with floorEntry — common Walmart OA pattern
- **VRP (Vehicle Routing Problem)** = NP-hard → cluster-first, route-second heuristic
- **Pick path optimization** = TSP within store aisle layout
- **Cold chain** = temperature monitoring + priority routing for frozen/dairy
- **Slot management**: capacity = picker count × pick rate, not just driver availability
- Walmart GDT values **logistics domain knowledge** in system design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Greedy, String Encode/Decode |
| DSA | Medium-Hard | TreeMap, Binary Search, TTL |
| System Design | Very Hard | Fleet Management, VRP, Cold Chain |
| HM | Medium | Behavioral, Leadership |
