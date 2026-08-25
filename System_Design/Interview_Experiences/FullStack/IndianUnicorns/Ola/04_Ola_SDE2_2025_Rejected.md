# Ola — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Software Engineer SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (System Design) |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-cabs-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + System Design)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Implement a Priority Queue Supporting Update and Delete

```java
import java.util.*;

/**
 * IndexedPriorityQueue: min-heap with O(log n) update/delete by key.
 * 
 * Standard PriorityQueue doesn't support:
 * - O(1) lookup by key
 * - O(log n) priority update
 * - O(log n) delete by key
 * 
 * Solution: HashMap<K, Integer> maps key → index in heap array.
 * Every swim/sink updates the position map.
 * 
 * Time: insert O(log n), extractMin O(log n), update O(log n), delete O(log n)
 * Space: O(n)
 */
public class IndexedPriorityQueue<K, V extends Comparable<V>> {
    
    private final List<Entry<K, V>> heap = new ArrayList<>();
    private final Map<K, Integer> keyToIndex = new HashMap<>(); // key → heap index
    
    static class Entry<K, V> {
        K key;
        V priority;
        
        Entry(K key, V priority) {
            this.key = key;
            this.priority = priority;
        }
    }
    
    public void insert(K key, V priority) {
        if (keyToIndex.containsKey(key)) {
            update(key, priority);
            return;
        }
        
        Entry<K, V> entry = new Entry<>(key, priority);
        heap.add(entry);
        int idx = heap.size() - 1;
        keyToIndex.put(key, idx);
        swimUp(idx);
    }
    
    public Entry<K, V> extractMin() {
        if (heap.isEmpty()) return null;
        
        Entry<K, V> min = heap.get(0);
        keyToIndex.remove(min.key);
        
        int last = heap.size() - 1;
        if (last > 0) {
            swap(0, last);
            heap.remove(last);
            sinkDown(0);
        } else {
            heap.remove(0);
        }
        
        return min;
    }
    
    public V peekMinPriority() {
        return heap.isEmpty() ? null : heap.get(0).priority;
    }
    
    public void update(K key, V newPriority) {
        Integer idx = keyToIndex.get(key);
        if (idx == null) {
            insert(key, newPriority);
            return;
        }
        
        V oldPriority = heap.get(idx).priority;
        heap.get(idx).priority = newPriority;
        
        if (newPriority.compareTo(oldPriority) < 0) {
            swimUp(idx);
        } else {
            sinkDown(idx);
        }
    }
    
    public boolean delete(K key) {
        Integer idx = keyToIndex.get(key);
        if (idx == null) return false;
        
        int last = heap.size() - 1;
        
        if (idx == last) {
            heap.remove(last);
            keyToIndex.remove(key);
        } else {
            swap(idx, last);
            heap.remove(last);
            keyToIndex.remove(key);
            
            // The swapped element may need to go up or down
            if (idx < heap.size()) {
                swimUp(idx);
                sinkDown(idx);
            }
        }
        
        return true;
    }
    
    public boolean containsKey(K key) {
        return keyToIndex.containsKey(key);
    }
    
    public int size() { return heap.size(); }
    public boolean isEmpty() { return heap.isEmpty(); }
    
    private void swimUp(int idx) {
        while (idx > 0) {
            int parent = (idx - 1) / 2;
            if (heap.get(idx).priority.compareTo(heap.get(parent).priority) < 0) {
                swap(idx, parent);
                idx = parent;
            } else {
                break;
            }
        }
    }
    
    private void sinkDown(int idx) {
        int size = heap.size();
        while (true) {
            int left = 2 * idx + 1;
            int right = 2 * idx + 2;
            int smallest = idx;
            
            if (left < size && heap.get(left).priority.compareTo(heap.get(smallest).priority) < 0) {
                smallest = left;
            }
            if (right < size && heap.get(right).priority.compareTo(heap.get(smallest).priority) < 0) {
                smallest = right;
            }
            
            if (smallest != idx) {
                swap(idx, smallest);
                idx = smallest;
            } else {
                break;
            }
        }
    }
    
    private void swap(int i, int j) {
        Entry<K, V> ei = heap.get(i);
        Entry<K, V> ej = heap.get(j);
        
        heap.set(i, ej);
        heap.set(j, ei);
        
        keyToIndex.put(ei.key, j);
        keyToIndex.put(ej.key, i);
    }
}
```

---

## Round 2: System Design — Ola Electric Vehicle Charging Network

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│           Ola Electric Charging Network                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ User App (Ola Electric / Ola Maps)                │           │
│  │                                                   │           │
│  │ 1. Find nearby charging stations                  │           │
│  │ 2. See real-time availability (charger status)    │           │
│  │ 3. Reserve a slot (15-min window)                 │           │
│  │ 4. Navigate to station                            │           │
│  │ 5. Start charging (scan QR / auto-detect)         │           │
│  │ 6. Monitor charge level + estimated time          │           │
│  │ 7. Payment (auto-debit on completion)             │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Station Management Service                        │           │
│  │                                                   │           │
│  │ Station: { id, location, chargers[], amenities }  │           │
│  │ Charger: { id, type (AC/DC), power_kW, status }   │           │
│  │ Status: AVAILABLE | IN_USE | RESERVED |            │           │
│  │         MAINTENANCE | OFFLINE                      │           │
│  │                                                   │           │
│  │ Real-time status:                                 │           │
│  │ - Charger → MQTT → Station Service → Redis        │           │
│  │ - App polls every 10s (or WebSocket for active)   │           │
│  │                                                   │           │
│  │ Nearby search:                                    │           │
│  │ - PostGIS GEOSEARCH within radius                 │           │
│  │ - Filter by: charger type, availability, power    │           │
│  │ - Sort by: distance, wait time, price/kWh         │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Charging Session Service                          │           │
│  │                                                   │           │
│  │ Session lifecycle:                                │           │
│  │ RESERVED → CONNECTED → CHARGING → COMPLETED       │           │
│  │                                                   │           │
│  │ During charging:                                  │           │
│  │ - OCPP protocol: charger ↔ backend                │           │
│  │ - Metered energy: kWh consumed (every 30s update) │           │
│  │ - Dynamic pricing: ₹/kWh × kWh consumed          │           │
│  │ - Estimated completion: based on charge curve     │           │
│  │                                                   │           │
│  │ Charge curve (non-linear):                        │           │
│  │ 0-80%: fast (DC: ~30 min for 50kWh battery)      │           │
│  │ 80-100%: tapers to protect battery                │           │
│  │ ETA = predict from current SoC + charge rate      │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Smart Scheduling (Queue Management)               │           │
│  │                                                   │           │
│  │ When station is full:                             │           │
│  │ - Priority queue: SoC < 10% gets priority         │           │
│  │ - ETA for queue position: sum of remaining times  │           │
│  │ - Auto-assign when charger frees up               │           │
│  │ - Penalty for no-show (₹50 after 10-min grace)   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Tech Stack:                                                    │
│  - OCPP 2.0.1 (Open Charge Point Protocol)                    │
│  - MQTT for charger telemetry                                  │
│  - PostGIS for geo queries                                     │
│  - Redis for real-time charger status                          │
│  - Kafka for session events + billing                          │
│  - TimescaleDB for energy consumption time series              │
│                                                                 │
│  Scale: 4,000+ stations, 100K+ chargers,                      │
│         500K charging sessions/day                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Ola SDE-2 = **Indexed priority queue + EV charging network design**
- **Indexed PQ**: HashMap key→index + heap array + update position on every swap — enables O(log n) update/delete
- **swimUp + sinkDown**: standard heap operations but with index map maintenance — easy to miss
- **Delete optimization**: swap with last, then swim/sink — don't shift the entire array
- **OCPP protocol**: standard for EV charger communication — understand charge point operations
- **Non-linear charge curve**: 0-80% is fast, 80-100% tapers — ETA prediction must account for this
- **Priority queue for station queue**: SoC-based priority — emergency vehicles and low-battery get priority
- Ola rejected in **System Design** — need deeper EV domain knowledge (OCPP, charge curves, grid management)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Hard | Indexed Priority Queue |
| Technical 2 | Medium-Hard | Java, APIs |
| System Design | Very Hard | EV Charging Network, OCPP |
