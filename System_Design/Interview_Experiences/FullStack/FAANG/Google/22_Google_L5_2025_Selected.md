# Google — L5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Phone Screen + 5 On-site: 3 Coding + System Design + Googliness)
- **Timeline:** 6 weeks (including HC)
- **Format:** On-site

## Round 4: Coding — Consistent Hashing Ring

### Problem
Implement a consistent hashing ring for distributed cache/load balancing:
1. Nodes can be added/removed dynamically
2. Virtual nodes to improve distribution uniformity
3. Key lookup finds the next clockwise node on the ring
4. Support weighted nodes (more virtual replicas for higher-capacity nodes)
5. Show redistribution stats: how many keys move when a node joins/leaves

### 💡 Interview-Ready Answer

```java
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentSkipListMap;

public class ConsistentHashingRing<T> {

    private final ConcurrentSkipListMap<Long, T> ring = new ConcurrentSkipListMap<>();
    private final Map<T, Integer> nodeReplicaCounts = new LinkedHashMap<>();
    private final int defaultReplicas;
    private final MessageDigest md;

    public ConsistentHashingRing(int defaultReplicas) {
        this.defaultReplicas = defaultReplicas;
        try {
            this.md = MessageDigest.getInstance("MD5");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Hash a string key to a long position on the ring [0, 2^32).
     * Uses MD5 for uniform distribution.
     */
    private long hash(String key) {
        byte[] digest = md.digest(key.getBytes());
        // Use first 4 bytes for a 32-bit hash
        return ((long) (digest[0] & 0xFF) << 24)
             | ((long) (digest[1] & 0xFF) << 16)
             | ((long) (digest[2] & 0xFF) << 8)
             | ((long) (digest[3] & 0xFF));
    }

    /**
     * Add a node with default replica count.
     */
    public void addNode(T node) {
        addNode(node, defaultReplicas);
    }

    /**
     * Add a node with weighted replica count (for capacity-based distribution).
     */
    public void addNode(T node, int replicas) {
        nodeReplicaCounts.put(node, replicas);
        for (int i = 0; i < replicas; i++) {
            long h = hash(node.toString() + "#" + i);
            ring.put(h, node);
        }
    }

    /**
     * Remove a node and all its virtual replicas.
     */
    public void removeNode(T node) {
        Integer replicas = nodeReplicaCounts.remove(node);
        if (replicas == null) return;
        for (int i = 0; i < replicas; i++) {
            long h = hash(node.toString() + "#" + i);
            ring.remove(h);
        }
    }

    /**
     * Find the node responsible for a key.
     * Walks clockwise (ceiling) from the key's hash position.
     */
    public T getNode(String key) {
        if (ring.isEmpty()) return null;
        long h = hash(key);
        Map.Entry<Long, T> entry = ring.ceilingEntry(h);
        if (entry == null) {
            // Wrap around to the first node
            entry = ring.firstEntry();
        }
        return entry.getValue();
    }

    /**
     * Get N distinct nodes for replication (walk clockwise, skip duplicates).
     */
    public List<T> getNodes(String key, int count) {
        if (ring.isEmpty()) return List.of();
        count = Math.min(count, nodeReplicaCounts.size());

        List<T> result = new ArrayList<>();
        Set<T> seen = new HashSet<>();
        long h = hash(key);

        // Start from ceiling of key hash
        NavigableMap<Long, T> tailMap = ring.tailMap(h, true);
        for (T node : tailMap.values()) {
            if (seen.add(node)) {
                result.add(node);
                if (result.size() >= count) return result;
            }
        }
        // Wrap around from beginning
        for (T node : ring.values()) {
            if (seen.add(node)) {
                result.add(node);
                if (result.size() >= count) return result;
            }
        }
        return result;
    }

    /**
     * Get distribution statistics: how many keys map to each node.
     */
    public Map<T, Integer> getDistribution(List<String> keys) {
        Map<T, Integer> dist = new LinkedHashMap<>();
        for (T node : nodeReplicaCounts.keySet()) {
            dist.put(node, 0);
        }
        for (String key : keys) {
            T node = getNode(key);
            if (node != null) dist.merge(node, 1, Integer::sum);
        }
        return dist;
    }

    /**
     * Simulate redistribution when a node is added.
     * Returns the number of keys that would move.
     */
    public Map<String, Object> simulateAddNode(T newNode, int replicas, List<String> keys) {
        // Current assignments
        Map<String, T> before = new LinkedHashMap<>();
        for (String key : keys) before.put(key, getNode(key));

        // Add node
        addNode(newNode, replicas);

        // New assignments
        Map<String, T> after = new LinkedHashMap<>();
        for (String key : keys) after.put(key, getNode(key));

        // Count moves
        int moved = 0;
        Map<T, Integer> movedFrom = new LinkedHashMap<>();
        for (String key : keys) {
            T oldNode = before.get(key);
            T newNodeAssigned = after.get(key);
            if (!Objects.equals(oldNode, newNodeAssigned)) {
                moved++;
                movedFrom.merge(oldNode, 1, Integer::sum);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalKeys", keys.size());
        result.put("keysMoved", moved);
        result.put("movePercent", String.format("%.1f%%", 100.0 * moved / keys.size()));
        result.put("movedFrom", movedFrom);
        result.put("newDistribution", getDistribution(keys));
        return result;
    }

    public int getNodeCount() {
        return nodeReplicaCounts.size();
    }

    public int getVirtualNodeCount() {
        return ring.size();
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        ConsistentHashingRing<String> ring = new ConsistentHashingRing<>(150);

        // Initial nodes
        ring.addNode("server-A");
        ring.addNode("server-B");
        ring.addNode("server-C");

        System.out.printf("Nodes: %d physical, %d virtual%n%n",
            ring.getNodeCount(), ring.getVirtualNodeCount());

        // Generate test keys
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 10000; i++) {
            keys.add("key-" + i);
        }

        // Distribution
        System.out.println("=== Distribution (3 nodes, 150 replicas each) ===");
        Map<String, Integer> dist = ring.getDistribution(keys);
        int total = keys.size();
        dist.forEach((node, count) ->
            System.out.printf("  %-12s: %5d keys (%.1f%%)%n", node, count, 100.0 * count / total));

        // Standard deviation of distribution
        double mean = total / (double) dist.size();
        double variance = dist.values().stream()
            .mapToDouble(c -> Math.pow(c - mean, 2)).sum() / dist.size();
        System.out.printf("  Std Dev: %.1f (ideal: 0)%n", Math.sqrt(variance));

        // Lookup examples
        System.out.println("\n=== Key Lookups ===");
        for (String key : List.of("user:alice", "session:xyz", "cache:product:42")) {
            System.out.printf("  %-25s → %s%n", key, ring.getNode(key));
        }

        // Replication (3 copies)
        System.out.println("\n=== Replication (3 copies) ===");
        String replicaKey = "important-data";
        List<String> replicas = ring.getNodes(replicaKey, 3);
        System.out.printf("  '%s' → %s%n", replicaKey, replicas);

        // Add a node — show redistribution
        System.out.println("\n=== Adding server-D ===");
        Map<String, Object> addResult = ring.simulateAddNode("server-D", 150, keys);
        addResult.forEach((k, v) -> {
            if (v instanceof Map) {
                System.out.printf("  %s:%n", k);
                ((Map<?, ?>) v).forEach((k2, v2) ->
                    System.out.printf("    %-12s: %s%n", k2, v2));
            } else {
                System.out.printf("  %-18s: %s%n", k, v);
            }
        });

        // Weighted nodes: server-E gets 2x capacity
        System.out.println("\n=== Adding server-E (2x weight = 300 replicas) ===");
        ring.addNode("server-E", 300);
        System.out.println("  Distribution with weighted node:");
        Map<String, Integer> newDist = ring.getDistribution(keys);
        newDist.forEach((node, count) ->
            System.out.printf("    %-12s: %5d keys (%.1f%%)%n", node, count, 100.0 * count / total));

        // Remove a node
        System.out.println("\n=== Removing server-B ===");
        ring.removeNode("server-B");
        Map<String, Integer> afterRemove = ring.getDistribution(keys);
        afterRemove.forEach((node, count) ->
            System.out.printf("    %-12s: %5d keys (%.1f%%)%n", node, count, 100.0 * count / total));
    }
}
```

## 🎯 Key Takeaways
- Google L5 expects **distributed systems primitives** implemented from scratch
- **ConcurrentSkipListMap** provides O(log N) ceiling/floor lookup — ideal for ring
- Virtual nodes (150+ per physical) dramatically improve distribution uniformity
- When adding 1 node to N-node ring, ~1/N of keys should move (minimal disruption)
- **MD5 hashing** gives good uniform distribution; consistent across JVM versions
- Replication: walk clockwise collecting distinct physical nodes
- Weighted nodes = more virtual replicas → proportionally more traffic
- `tailMap` + wrap-around handles the ring topology cleanly

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Trees, BST |
| Coding 1 | Medium | String, DP |
| Coding 2 | Hard | Graphs, Dijkstra |
| Coding 3 | Hard | Consistent Hashing, Distributed Systems |
| System Design | Hard | Global Content Delivery Network |
| Googliness | Medium | Collaboration, Ambiguity Handling |
