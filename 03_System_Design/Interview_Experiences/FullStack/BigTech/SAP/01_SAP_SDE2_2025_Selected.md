# SAP — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 / T2 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/sap-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Online Assessment + 2 Technical + 1 Managerial)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Multi-Source Shortest Path in Weighted Graph**
   - Given a weighted directed graph and multiple source nodes, find the shortest path from any source to every other node.

### 💡 Interview-Ready Answer

```java
import java.util.*;

public class MultiSourceShortestPath {

    static final int INF = Integer.MAX_VALUE;

    // Edge representation
    static class Edge {
        int to, weight;
        Edge(int to, int weight) {
            this.to = to;
            this.weight = weight;
        }
    }

    // Node in priority queue
    static class Node implements Comparable<Node> {
        int vertex, dist;
        Node(int vertex, int dist) {
            this.vertex = vertex;
            this.dist = dist;
        }
        public int compareTo(Node other) {
            return Integer.compare(this.dist, other.dist);
        }
    }

    /**
     * Multi-source Dijkstra — initialize all source nodes with distance 0
     * and run a single Dijkstra pass.
     *
     * Time: O((V + E) log V)
     * Space: O(V + E)
     */
    public static int[] multiSourceDijkstra(List<List<Edge>> graph, int n, List<Integer> sources) {
        int[] dist = new int[n];
        Arrays.fill(dist, INF);

        PriorityQueue<Node> pq = new PriorityQueue<>();

        // Initialize all sources with distance 0
        for (int src : sources) {
            dist[src] = 0;
            pq.offer(new Node(src, 0));
        }

        while (!pq.isEmpty()) {
            Node current = pq.poll();
            int u = current.vertex;

            // Skip stale entries
            if (current.dist > dist[u]) continue;

            for (Edge edge : graph.get(u)) {
                int v = edge.to;
                int newDist = dist[u] + edge.weight;

                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    pq.offer(new Node(v, newDist));
                }
            }
        }

        return dist;
    }

    // Follow-up: Track which source each node is closest to
    public static int[] closestSource(List<List<Edge>> graph, int n, List<Integer> sources) {
        int[] dist = new int[n];
        int[] parent = new int[n]; // which source this node is closest to
        Arrays.fill(dist, INF);
        Arrays.fill(parent, -1);

        PriorityQueue<Node> pq = new PriorityQueue<>();

        for (int src : sources) {
            dist[src] = 0;
            parent[src] = src;
            pq.offer(new Node(src, 0));
        }

        while (!pq.isEmpty()) {
            Node current = pq.poll();
            int u = current.vertex;
            if (current.dist > dist[u]) continue;

            for (Edge edge : graph.get(u)) {
                int v = edge.to;
                int newDist = dist[u] + edge.weight;
                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    parent[v] = parent[u];
                    pq.offer(new Node(v, newDist));
                }
            }
        }

        return parent;
    }

    public static void main(String[] args) {
        int n = 6;
        List<List<Edge>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());

        graph.get(0).add(new Edge(1, 4));
        graph.get(0).add(new Edge(2, 2));
        graph.get(1).add(new Edge(3, 5));
        graph.get(2).add(new Edge(1, 1));
        graph.get(2).add(new Edge(3, 8));
        graph.get(3).add(new Edge(4, 2));
        graph.get(4).add(new Edge(5, 1));

        List<Integer> sources = Arrays.asList(0, 5);
        int[] dist = multiSourceDijkstra(graph, n, sources);
        System.out.println("Distances: " + Arrays.toString(dist));
        // [0, 3, 2, 8, 10, 0]

        int[] closest = closestSource(graph, n, sources);
        System.out.println("Closest source: " + Arrays.toString(closest));
    }
}
```

**Complexity:**
- **Time:** O((V + E) log V) — same as standard Dijkstra
- **Space:** O(V + E)

**Key Insight:** Multi-source shortest path reduces to standard Dijkstra by adding a virtual super-source with 0-weight edges to all real sources — or equivalently, initializing all sources with distance 0 in the priority queue.

## Round 2: Technical Interview 1 — LLD
**Duration:** 60 minutes | **Interviewer:** Senior Developer

### Questions Asked
1. **Design an In-Memory Key-Value Store with TTL Support**
   - Support `put(key, value, ttl)`, `get(key)`, `delete(key)`
   - Keys should auto-expire after TTL
   - Support batch cleanup of expired keys

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;

public class TTLKeyValueStore<K, V> {

    private static class Entry<V> {
        V value;
        long expiryTimeMs;

        Entry(V value, long expiryTimeMs) {
            this.value = value;
            this.expiryTimeMs = expiryTimeMs;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiryTimeMs;
        }
    }

    private final ConcurrentHashMap<K, Entry<V>> store = new ConcurrentHashMap<>();
    private final TreeMap<Long, Set<K>> expiryIndex = new TreeMap<>(); // expiry time -> keys
    private final ScheduledExecutorService cleaner;

    public TTLKeyValueStore(long cleanupIntervalMs) {
        this.cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "ttl-cleaner");
            t.setDaemon(true);
            return t;
        });

        cleaner.scheduleAtFixedRate(
            this::cleanupExpired,
            cleanupIntervalMs,
            cleanupIntervalMs,
            TimeUnit.MILLISECONDS
        );
    }

    public void put(K key, V value, long ttlMs) {
        long expiryTime = System.currentTimeMillis() + ttlMs;
        Entry<V> entry = new Entry<>(value, expiryTime);

        // Remove old expiry index entry if key exists
        Entry<V> old = store.put(key, entry);
        if (old != null) {
            removeFromExpiryIndex(key, old.expiryTimeMs);
        }

        // Add to expiry index
        synchronized (expiryIndex) {
            expiryIndex.computeIfAbsent(expiryTime, k -> ConcurrentHashMap.newKeySet()).add(key);
        }
    }

    public V get(K key) {
        Entry<V> entry = store.get(key);
        if (entry == null) return null;

        if (entry.isExpired()) {
            delete(key);
            return null;
        }
        return entry.value;
    }

    public boolean delete(K key) {
        Entry<V> removed = store.remove(key);
        if (removed != null) {
            removeFromExpiryIndex(key, removed.expiryTimeMs);
            return true;
        }
        return false;
    }

    private void removeFromExpiryIndex(K key, long expiryTime) {
        synchronized (expiryIndex) {
            Set<K> keys = expiryIndex.get(expiryTime);
            if (keys != null) {
                keys.remove(key);
                if (keys.isEmpty()) {
                    expiryIndex.remove(expiryTime);
                }
            }
        }
    }

    /**
     * Batch cleanup: removes all entries whose expiry time <= now.
     * Uses TreeMap.headMap for efficient range deletion.
     */
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        synchronized (expiryIndex) {
            NavigableMap<Long, Set<K>> expired = expiryIndex.headMap(now, true);
            for (Map.Entry<Long, Set<K>> e : expired.entrySet()) {
                for (K key : e.getValue()) {
                    store.remove(key);
                }
            }
            expired.clear(); // removes from original TreeMap
        }
    }

    public int size() {
        return store.size();
    }

    public void shutdown() {
        cleaner.shutdown();
    }

    public static void main(String[] args) throws InterruptedException {
        TTLKeyValueStore<String, String> store = new TTLKeyValueStore<>(1000);

        store.put("session1", "user-alice", 2000);
        store.put("session2", "user-bob", 5000);

        System.out.println(store.get("session1")); // user-alice
        Thread.sleep(3000);
        System.out.println(store.get("session1")); // null (expired)
        System.out.println(store.get("session2")); // user-bob

        store.shutdown();
    }
}
```

## Round 3: Technical Interview 2 — System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design a Multi-Tenant SaaS Configuration Service**
   - Each tenant has isolated configuration
   - Support hierarchical config (global → org → team → user)
   - Real-time config propagation

### Follow-up Questions
- How do you handle config rollback?
- How do you audit config changes?
- What's your caching strategy for hot configs?

## Round 4: Managerial Round
**Duration:** 45 minutes

### Topics Discussed
- Experience leading a team of 4 developers through a migration project
- Handling production incidents and postmortem culture
- Career growth expectations at SAP

## 🎯 Key Takeaways
- SAP focuses heavily on **enterprise patterns** — multi-tenancy, TTL, batch operations
- **LLD round** expected working code with clean concurrency handling
- System design round tested **hierarchical data models** and caching strategies
- Multi-source Dijkstra is a common variation — know how to extend standard algorithms

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Online Assessment | Medium-Hard | Graph, Dijkstra, Multi-source |
| Technical 1 (LLD) | Medium | ConcurrentHashMap, TTL, TreeMap |
| Technical 2 (SD) | Hard | Multi-tenancy, Hierarchical Config |
| Managerial | Easy | Behavioral, Leadership |
