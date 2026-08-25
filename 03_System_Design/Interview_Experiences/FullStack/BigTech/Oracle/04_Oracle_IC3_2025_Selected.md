# Oracle — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | Senior Member Technical Staff |
| **Level** | IC3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Oracle Cloud Infrastructure (OCI) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Implement a B-Tree with Disk-Page-Sized Nodes

```java
/**
 * B-Tree: self-balancing tree optimized for disk I/O.
 * Each node holds up to (2*t - 1) keys and (2*t) children.
 * All leaves at same depth.
 * 
 * Key properties:
 * - Minimum degree t (e.g., t=256 for 4KB page → ~500 keys per node)
 * - Node: [k1|p1|k2|p2|...|kn|pn+1] where ki = keys, pi = child pointers
 * - Search: O(t * log_t(n)) = O(log n) with low constant
 * - Insert: split nodes proactively on way down (no backtracking)
 * 
 * This is the foundation of Oracle's B+ tree indexes.
 */
public class BTree {
    
    static class Node {
        int[] keys;
        Node[] children;
        int n;          // Current number of keys
        boolean leaf;
        
        Node(int t, boolean leaf) {
            this.keys = new int[2 * t - 1];
            this.children = new Node[2 * t];
            this.n = 0;
            this.leaf = leaf;
        }
    }
    
    private final int t; // Minimum degree
    private Node root;
    
    public BTree(int t) {
        this.t = t;
        this.root = new Node(t, true);
    }
    
    public Node search(Node node, int key) {
        int i = 0;
        while (i < node.n && key > node.keys[i]) {
            i++;
        }
        
        if (i < node.n && node.keys[i] == key) {
            return node; // Found
        }
        
        if (node.leaf) return null; // Not found
        
        return search(node.children[i], key);
    }
    
    public void insert(int key) {
        Node r = root;
        
        // If root is full, split it first
        if (r.n == 2 * t - 1) {
            Node newRoot = new Node(t, false);
            newRoot.children[0] = r;
            splitChild(newRoot, 0, r);
            
            // Determine which child gets the new key
            int i = 0;
            if (newRoot.keys[0] < key) i++;
            insertNonFull(newRoot.children[i], key);
            
            root = newRoot;
        } else {
            insertNonFull(r, key);
        }
    }
    
    private void insertNonFull(Node node, int key) {
        int i = node.n - 1;
        
        if (node.leaf) {
            // Shift keys right and insert
            while (i >= 0 && node.keys[i] > key) {
                node.keys[i + 1] = node.keys[i];
                i--;
            }
            node.keys[i + 1] = key;
            node.n++;
        } else {
            // Find child to descend into
            while (i >= 0 && node.keys[i] > key) {
                i--;
            }
            i++;
            
            // Split child if full (proactive split)
            if (node.children[i].n == 2 * t - 1) {
                splitChild(node, i, node.children[i]);
                if (key > node.keys[i]) i++;
            }
            
            insertNonFull(node.children[i], key);
        }
    }
    
    /**
     * Split child y of node x at index i.
     * y has 2t-1 keys → split into y (t-1 keys) + z (t-1 keys).
     * Middle key promoted to parent x.
     */
    private void splitChild(Node x, int i, Node y) {
        Node z = new Node(t, y.leaf);
        z.n = t - 1;
        
        // Copy last (t-1) keys of y to z
        for (int j = 0; j < t - 1; j++) {
            z.keys[j] = y.keys[j + t];
        }
        
        // Copy last t children of y to z (if not leaf)
        if (!y.leaf) {
            for (int j = 0; j < t; j++) {
                z.children[j] = y.children[j + t];
            }
        }
        
        y.n = t - 1;
        
        // Shift x's children right to make room for z
        for (int j = x.n; j >= i + 1; j--) {
            x.children[j + 1] = x.children[j];
        }
        x.children[i + 1] = z;
        
        // Shift x's keys right and promote middle key
        for (int j = x.n - 1; j >= i; j--) {
            x.keys[j + 1] = x.keys[j];
        }
        x.keys[i] = y.keys[t - 1]; // Promote middle key
        x.n++;
    }
    
    // In-order traversal
    public void traverse(Node node, java.util.List<Integer> result) {
        int i;
        for (i = 0; i < node.n; i++) {
            if (!node.leaf) traverse(node.children[i], result);
            result.add(node.keys[i]);
        }
        if (!node.leaf) traverse(node.children[i], result);
    }
    
    public Node getRoot() { return root; }
}
```

---

## Round 2: System Design — Oracle Cloud Infrastructure Object Storage

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│          OCI Object Storage (S3-compatible)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ API Gateway                                       │           │
│  │ - REST API (S3-compatible + Oracle extensions)    │           │
│  │ - PUT/GET/DELETE/LIST objects                      │           │
│  │ - Pre-signed URLs                                 │           │
│  │ - Multipart upload (5GB+ files)                   │           │
│  └────────────────────┬─────────────────────────────┘           │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────┐           │
│  │ Metadata Service                                  │           │
│  │ - Object metadata: name, size, ETag, timestamps   │           │
│  │ - Bucket metadata: policies, lifecycle rules      │           │
│  │ - Stored in: distributed B+ tree index (Oracle DB)│           │
│  │ - Sharded by bucket hash                          │           │
│  │                                                   │           │
│  │ Consistency: strong for single-object ops         │           │
│  │ Listing: eventually consistent (async index)      │           │
│  └────────────────────┬─────────────────────────────┘           │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────┐           │
│  │ Data Plane                                        │           │
│  │                                                   │           │
│  │ Write path:                                       │           │
│  │ 1. Client → API → choose storage tier             │           │
│  │ 2. Split into 64MB chunks                         │           │
│  │ 3. Erasure code (8+4 Reed-Solomon)                │           │
│  │    → 12 fragments, any 8 can reconstruct          │           │
│  │ 4. Place fragments across 3 fault domains         │           │
│  │ 5. Ack after 8/12 fragments written               │           │
│  │                                                   │           │
│  │ Read path:                                        │           │
│  │ 1. Metadata lookup → fragment locations           │           │
│  │ 2. Read 8 fragments in parallel                   │           │
│  │ 3. Reconstruct original chunk                     │           │
│  │ 4. Stream to client                               │           │
│  │                                                   │           │
│  │ Storage tiers:                                    │           │
│  │ - Standard: hot, multi-AZ, instant access         │           │
│  │ - Infrequent: 30-day min, reduced cost            │           │
│  │ - Archive: hours to retrieve, cheapest            │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Durability: 99.999999999% (11 nines) via erasure coding       │
│  Availability: 99.99% (Standard tier)                          │
│  Scale: exabytes of data, billions of objects                  │
│  Throughput: 10 GB/s per bucket (parallelized)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Oracle IC3 = **B-Tree implementation + cloud object storage design**
- **B-Tree proactive split**: split full nodes on the way down — single pass, no backtracking
- **B-Tree minimum degree t**: determines max keys (2t-1) and children (2t) per node — tuned to disk page size
- **Promote middle key**: split pushes median key to parent — keeps tree balanced
- **Erasure coding (8+4 RS)**: 1.5x storage overhead vs 3x for replication — same durability, less storage
- **Fault domains**: distribute fragments across different failure zones — survive rack/AZ failures
- **Read quorum**: read 8 of 12 fragments — can tolerate 4 concurrent failures
- Oracle = **database internals + cloud infrastructure** — B-trees, erasure coding, distributed storage

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Very Hard | B-Tree Implementation |
| System Design | Very Hard | Object Storage, Erasure Coding |
| Technical 3 | Hard | JVM, Concurrency |
| HM | Medium | Culture Fit |
