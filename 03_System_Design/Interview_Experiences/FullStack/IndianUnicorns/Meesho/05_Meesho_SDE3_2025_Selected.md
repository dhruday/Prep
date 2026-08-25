# Meesho — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meesho |
| **Role** | Senior Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/meesho-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Implement a Consistent Hash Ring with Virtual Nodes + Bounded Load

```java
import java.security.MessageDigest;
import java.util.*;

/**
 * Consistent Hashing with:
 * - Virtual nodes for even distribution
 * - Bounded load: no server handles more than ceil(avg_load * (1 + epsilon)) keys
 * - Dynamic add/remove nodes with minimal key redistribution
 * 
 * This combined approach is used in systems like Vimeo's consistent hashing.
 * 
 * Time: O(log N) lookup, O(V * log N) add/remove node (V = virtual nodes)
 * Space: O(N * V) where N = nodes, V = virtual nodes per node
 */
public class ConsistentHashRing {
    
    private final TreeMap<Long, String> ring = new TreeMap<>();
    private final Map<String, Set<Long>> nodeHashes = new HashMap<>();
    private final Map<String, Integer> nodeLoad = new HashMap<>(); // current key count
    private final int virtualNodes;
    private final double epsilon; // load factor tolerance (e.g., 0.25)
    
    public ConsistentHashRing(int virtualNodes, double epsilon) {
        this.virtualNodes = virtualNodes;
        this.epsilon = epsilon;
    }
    
    public void addNode(String node) {
        Set<Long> hashes = new HashSet<>();
        
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node + "#" + i);
            ring.put(hash, node);
            hashes.add(hash);
        }
        
        nodeHashes.put(node, hashes);
        nodeLoad.put(node, 0);
    }
    
    public void removeNode(String node) {
        Set<Long> hashes = nodeHashes.remove(node);
        if (hashes != null) {
            for (long hash : hashes) {
                ring.remove(hash);
            }
        }
        nodeLoad.remove(node);
    }
    
    /**
     * Get the node responsible for a key.
     * With bounded load: if target node is overloaded, check next nodes clockwise.
     */
    public String getNode(String key) {
        if (ring.isEmpty()) return null;
        
        long hash = hash(key);
        int maxLoad = getMaxLoad();
        
        // Walk clockwise from hash position
        Map.Entry<Long, String> entry = ring.ceilingEntry(hash);
        if (entry == null) entry = ring.firstEntry(); // Wrap around
        
        Long startHash = entry.getKey();
        String startNode = entry.getValue();
        
        // Check if this node can accept the key (bounded load)
        String node = startNode;
        Long currentHash = startHash;
        
        while (true) {
            int load = nodeLoad.getOrDefault(node, 0);
            if (load < maxLoad) {
                return node;
            }
            
            // Try next node clockwise
            Map.Entry<Long, String> next = ring.higherEntry(currentHash);
            if (next == null) next = ring.firstEntry();
            
            currentHash = next.getKey();
            node = next.getValue();
            
            // Safety: if we've gone full circle, just use the original
            if (currentHash.equals(startHash)) return startNode;
        }
    }
    
    /**
     * Assign a key to a node (tracks load for bounded load balancing).
     */
    public String assignKey(String key) {
        String node = getNode(key);
        if (node != null) {
            nodeLoad.merge(node, 1, Integer::sum);
        }
        return node;
    }
    
    public void releaseKey(String key, String node) {
        nodeLoad.computeIfPresent(node, (k, v) -> Math.max(0, v - 1));
    }
    
    private int getMaxLoad() {
        int totalKeys = nodeLoad.values().stream().mapToInt(Integer::intValue).sum();
        int nodeCount = nodeLoad.size();
        if (nodeCount == 0) return Integer.MAX_VALUE;
        
        double avgLoad = (double) totalKeys / nodeCount;
        return (int) Math.ceil(avgLoad * (1 + epsilon));
    }
    
    private long hash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(key.getBytes());
            
            // Use first 8 bytes as a long
            long h = 0;
            for (int i = 0; i < 8; i++) {
                h = (h << 8) | (digest[i] & 0xFF);
            }
            return h;
        } catch (Exception e) {
            return key.hashCode();
        }
    }
    
    public Map<String, Integer> getLoadDistribution() {
        return Collections.unmodifiableMap(nodeLoad);
    }
}
```

---

## Round 2: System Design — Meesho Social Commerce Platform

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│             Meesho Social Commerce Platform                     │
│                                                                 │
│  Reseller Journey:                                              │
│  1. Browse catalog → 2. Share to WhatsApp → 3. Customer orders  │
│  → 4. Meesho ships → 5. Reseller earns commission              │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Reseller App                                      │           │
│  │ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │           │
│  │ │ Catalog  │ │ Share    │ │ Orders │ │Earnings│ │           │
│  │ │ Browse   │ │ to Social│ │ Manage │ │ Track  │ │           │
│  │ └──────────┘ └──────────┘ └────────┘ └────────┘ │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Product Catalog Service                           │           │
│  │                                                   │           │
│  │ - 150M+ products from 700K+ suppliers             │           │
│  │ - Elasticsearch for search + faceted filters      │           │
│  │ - Redis cache: hot products (80/20 rule)          │           │
│  │ - Image CDN: auto-resize + compress + watermark   │           │
│  │                                                   │           │
│  │ Personalization:                                  │           │
│  │ - ML ranking by reseller's past share patterns    │           │
│  │ - Regional trending: different for each state     │           │
│  │ - Supplier quality score (return rate, ratings)   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Share & Commission Engine                         │           │
│  │                                                   │           │
│  │ Share flow:                                       │           │
│  │ 1. Reseller picks product                         │           │
│  │ 2. Sets margin (min ₹20, suggested by ML)         │           │
│  │ 3. Generates shareable link/image                  │           │
│  │ 4. Shares via WhatsApp/Facebook/Instagram         │           │
│  │                                                   │           │
│  │ Commission calculation:                           │           │
│  │ customer_price = base_price + reseller_margin     │           │
│  │ commission = reseller_margin - platform_fee (5%)  │           │
│  │                                                   │           │
│  │ Attribution: unique link per reseller per product │           │
│  │ Link: meesho.com/p/PROD_ID?ref=RESELLER_ID       │           │
│  │ Cookie window: 7 days                             │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Order & Logistics Engine                          │           │
│  │                                                   │           │
│  │ Order States:                                     │           │
│  │ placed → supplier_confirmed → packed →             │           │
│  │ shipped → in_transit → out_for_delivery →          │           │
│  │ delivered / returned                               │           │
│  │                                                   │           │
│  │ Key challenges:                                   │           │
│  │ - 100K+ suppliers → aggregation before ship       │           │
│  │ - Multi-item orders from different suppliers      │           │
│  │ - Cash on Delivery (70% of orders in India)       │           │
│  │ - Return rate management (COD = higher returns)   │           │
│  │ - Last-mile: 3P logistics (Delhivery, Ekart)     │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Tech Stack:                                                    │
│  - Microservices: Go + Java + Python (ML)                      │
│  - Kafka for event-driven order pipeline                       │
│  - PostgreSQL + Citus for sharded order data                   │
│  - ClickHouse for analytics                                    │
│  - Redis Cluster for caching                                   │
│  - S3 + CloudFront for product images                          │
│                                                                 │
│  Scale: 15M+ resellers, 2M+ orders/day, 150M+ SKUs           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meesho SDE-3 = **Consistent hashing with bounded load + social commerce platform design**
- **Virtual nodes**: each physical node gets `V` positions on ring — smooths distribution
- **Bounded load**: `ceil(avg_load * (1 + ε))` cap per node — prevents hotspots, walks clockwise to find underloaded node
- **MD5 for hash**: better distribution than `hashCode()` — use first 8 bytes as long
- **Meesho model**: reseller-centric — reseller sets margin, shares product link, earns commission on sale
- **Attribution**: unique `ref=RESELLER_ID` parameter — cookie window for delayed purchases
- **COD challenge**: 70% of Indian e-commerce is COD — higher return rates, payment reconciliation complexity
- Meesho = **social commerce domain** — understand reseller economics, sharing flows, multi-supplier logistics

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Hard | Consistent Hashing, Virtual Nodes, Bounded Load |
| System Design | Very Hard | Social Commerce Platform |
| Technical 2 | Hard | Java, Distributed Systems |
| HM | Medium | Culture Fit |
