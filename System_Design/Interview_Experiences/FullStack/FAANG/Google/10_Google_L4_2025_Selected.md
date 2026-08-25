# Google — SDE-2 FullStack Interview Experience (2025) — #10

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | L4 Software Engineer |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + Team Match)
- **Timeline:** 3 weeks (including HC)

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design a File System Watcher** (detect added/modified/deleted files)
2. **Follow-up: Handle 1M+ files efficiently**

### 💡 File System Diff

```java
class FileSystemWatcher {
    enum ChangeType { ADDED, MODIFIED, DELETED }
    record FileChange(String path, ChangeType type, long oldTimestamp, long newTimestamp) {}
    
    // Compare two snapshots to find changes
    List<FileChange> diff(Map<String, Long> oldSnapshot, Map<String, Long> newSnapshot) {
        List<FileChange> changes = new ArrayList<>();
        
        // Check for MODIFIED and DELETED
        for (var entry : oldSnapshot.entrySet()) {
            String path = entry.getKey();
            long oldTimestamp = entry.getValue();
            
            if (!newSnapshot.containsKey(path)) {
                changes.add(new FileChange(path, ChangeType.DELETED, oldTimestamp, 0));
            } else if (newSnapshot.get(path) != oldTimestamp) {
                changes.add(new FileChange(path, ChangeType.MODIFIED, oldTimestamp, newSnapshot.get(path)));
            }
        }
        
        // Check for ADDED
        for (var entry : newSnapshot.entrySet()) {
            if (!oldSnapshot.containsKey(entry.getKey())) {
                changes.add(new FileChange(entry.getKey(), ChangeType.ADDED, 0, entry.getValue()));
            }
        }
        
        return changes;
    }
    // Time: O(n + m), Space: O(min(n, m)) for changes list
    
    // Follow-up: Handle 1M+ files efficiently
    // Don't store full snapshot in memory → use merkle tree
    
    // Merkle Tree: hash of hashes
    // Root hash = hash(hash(left_subtree) + hash(right_subtree))
    // If root hashes match → no changes (O(1) check)
    // If different → drill down to find changed subtree
    // Structure mirrors directory hierarchy:
    //
    //              root_hash
    //             /          \
    //     dir_A_hash      dir_B_hash
    //     /      \            |
    //  file1   file2       file3
    //
    // Only need to recurse into subtrees where hashes differ
    // Best case: O(1) if no changes
    // Worst case: O(k log n) where k = changed files
    
    record MerkleNode(String name, String hash, boolean isFile,
                       Map<String, MerkleNode> children) {}
    
    String computeHash(MerkleNode node) {
        if (node.isFile) {
            return sha256(node.name + ":" + Files.getLastModifiedTime(Path.of(node.name)));
        }
        
        StringBuilder childHashes = new StringBuilder();
        for (var child : new TreeMap<>(node.children).entrySet()) {
            childHashes.append(computeHash(child.getValue()));
        }
        return sha256(childHashes.toString());
    }
    
    List<FileChange> merkleTreeDiff(MerkleNode oldTree, MerkleNode newTree) {
        List<FileChange> changes = new ArrayList<>();
        diffRecursive(oldTree, newTree, changes);
        return changes;
    }
    
    void diffRecursive(MerkleNode oldNode, MerkleNode newNode, List<FileChange> changes) {
        // Same hash → no changes in this subtree
        if (oldNode != null && newNode != null && oldNode.hash.equals(newNode.hash)) return;
        
        // Collect all keys
        Set<String> allKeys = new HashSet<>();
        if (oldNode != null) allKeys.addAll(oldNode.children.keySet());
        if (newNode != null) allKeys.addAll(newNode.children.keySet());
        
        for (String key : allKeys) {
            MerkleNode oldChild = oldNode == null ? null : oldNode.children.get(key);
            MerkleNode newChild = newNode == null ? null : newNode.children.get(key);
            
            if (oldChild == null && newChild != null) {
                collectAll(newChild, ChangeType.ADDED, changes);
            } else if (oldChild != null && newChild == null) {
                collectAll(oldChild, ChangeType.DELETED, changes);
            } else if (oldChild.isFile && newChild.isFile) {
                if (!oldChild.hash.equals(newChild.hash)) {
                    changes.add(new FileChange(oldChild.name, ChangeType.MODIFIED, 0, 0));
                }
            } else {
                diffRecursive(oldChild, newChild, changes);
            }
        }
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Cloud Storage (Object Storage like S3)**

### 💡 Key Architecture Points

```
Google Cloud Storage:
┌──────────────────────────────────────────────────────────────┐
│  Object Storage: flat namespace (no directory hierarchy)      │
│  Object = blob (bytes) + metadata (key-value pairs)          │
│  Path is just a prefix convention: gs://bucket/dir/file.txt  │
│                                                                │
│  Storage Classes:                                             │
│  - Standard: frequent access (<1ms TTFB)                     │
│  - Nearline: once/month (5ms TTFB, lower storage cost)      │
│  - Coldline: once/quarter (50ms TTFB, much lower cost)      │
│  - Archive: once/year (seconds TTFB, cheapest storage)       │
│  Auto-transition: lifecycle rules move objects between classes│
│                                                                │
│  Write Path:                                                  │
│  1. Client: PUT object → API server                          │
│  2. API server: authenticate, authorize (IAM)                │
│  3. Split into chunks if > 64MB                              │
│  4. Replicate: 3 replicas across zones (within region)       │
│     or dual-region/multi-region for geo-redundancy           │
│  5. Return success after quorum write (2/3 acks)             │
│  6. Metadata → Bigtable-like index:                          │
│     {bucket, object_key} → {size, md5, content_type,        │
│      storage_class, acl, custom_metadata, chunk_locations}   │
│                                                                │
│  Read Path:                                                   │
│  1. Lookup metadata: bucket + key → chunk locations          │
│  2. Stream chunks from nearest healthy replica               │
│  3. Verify checksum per chunk on read                        │
│  4. CDN integration: signed URLs for public content          │
│                                                                │
│  Consistency:                                                 │
│  - Strong consistency for all operations (Google's guarantee)│
│  - After write completes → immediate read returns new data   │
│  - List operations: also strongly consistent                 │
│  - Implementation: Paxos/Raft for metadata, chain replication│
│    for data                                                   │
│                                                                │
│  Durability: 99.999999999% (11 nines)                        │
│  - Erasure coding for long-term storage (instead of 3x repl) │
│  - Reed-Solomon: store n+k chunks, any n sufficient to read │
│  - 6+3 scheme: 50% overhead vs 200% for 3x replication      │
│  - Background integrity check: read + verify checksums daily │
│                                                                │
│  Scale:                                                       │
│  - Exabytes of data                                          │
│  - Millions of requests/sec                                  │
│  - Multi-region: automatic replication across continents     │
│  - Max object size: 5TB                                      │
│  - Max bucket objects: unlimited                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Google L4 = **systems fundamentals** + clean code + Googleyness
- **File System Watcher** with Merkle Tree — O(k log n) for detecting k changes
- **Merkle Trees** used in: git, blockchain, GCS, rsync — fundamental data structure
- **Object Storage**: flat namespace, storage classes (hot/warm/cold/archive)
- **Strong consistency** (Google's differentiator from S3's eventual → now also strong)
- **Erasure coding** (6+3 Reed-Solomon) vs 3x replication — better storage efficiency
- **Quorum writes** (2/3) for availability while maintaining durability
- Google values **algorithmic thinking** even in system design (Merkle tree for diff)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Merkle Tree, File Diff, Hashing |
| System Design | Very Hard | Object Storage, Erasure Coding, Consistency |
| Behavioral | Medium | Googleyness, Collaboration |
