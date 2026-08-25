# Microsoft — SDE-3 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | SDE-3 |
| **Level** | L64 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Redmond, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Azure Storage |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 2 Coding + System Design + As-Appropriate)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Serialize and Deserialize N-ary Tree** (LeetCode 428)
2. **Follow-up: Handle very deep trees without stack overflow (iterative BFS)**

### 💡 Serialize/Deserialize N-ary Tree

```java
class NaryTreeCodec {
    // Encode: preorder with children count marker
    // e.g., [1,3,3,2,5,0,6,0,2,0,4,1,5,0]
    // Format: [value, numChildren, child1..., child2..., ...]
    
    String serialize(Node root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        serializeDFS(root, sb);
        return sb.toString();
    }
    
    private void serializeDFS(Node node, StringBuilder sb) {
        sb.append(node.val).append(",").append(node.children.size()).append(",");
        for (Node child : node.children) {
            serializeDFS(child, sb);
        }
    }
    
    Node deserialize(String data) {
        if (data.isEmpty()) return null;
        String[] tokens = data.split(",");
        int[] index = {0}; // Mutable index wrapper
        return deserializeDFS(tokens, index);
    }
    
    private Node deserializeDFS(String[] tokens, int[] index) {
        int val = Integer.parseInt(tokens[index[0]++]);
        int numChildren = Integer.parseInt(tokens[index[0]++]);
        
        Node node = new Node(val, new ArrayList<>());
        for (int i = 0; i < numChildren; i++) {
            node.children.add(deserializeDFS(tokens, index));
        }
        return node;
    }
    
    // Iterative BFS version (no stack overflow for deep trees)
    String serializeBFS(Node root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        Queue<Node> queue = new LinkedList<>();
        queue.offer(root);
        
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            sb.append(node.val).append(",").append(node.children.size()).append(",");
            for (Node child : node.children) {
                queue.offer(child);
            }
        }
        return sb.toString();
    }
    
    Node deserializeBFS(String data) {
        if (data.isEmpty()) return null;
        String[] tokens = data.split(",");
        int idx = 0;
        
        int rootVal = Integer.parseInt(tokens[idx++]);
        int rootChildren = Integer.parseInt(tokens[idx++]);
        Node root = new Node(rootVal, new ArrayList<>());
        
        Queue<int[]> queue = new LinkedList<>(); // [parentIndex, numChildrenRemaining]
        Queue<Node> nodeQueue = new LinkedList<>();
        nodeQueue.offer(root);
        queue.offer(new int[]{rootChildren});
        
        while (!queue.isEmpty()) {
            Node parent = nodeQueue.peek();
            int[] info = queue.peek();
            
            if (info[0] == 0) {
                queue.poll();
                nodeQueue.poll();
                continue;
            }
            
            int childVal = Integer.parseInt(tokens[idx++]);
            int childChildrenCount = Integer.parseInt(tokens[idx++]);
            Node child = new Node(childVal, new ArrayList<>());
            parent.children.add(child);
            info[0]--;
            
            if (childChildrenCount > 0) {
                nodeQueue.offer(child);
                queue.offer(new int[]{childChildrenCount});
            }
        }
        
        return root;
    }
}
// Time: O(n) for both serialize and deserialize
// Space: O(n) for the serialized string + O(h) recursion or O(w) BFS queue
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Azure Blob Storage** (like S3)
   - PUT/GET/DELETE objects (up to 5TB)
   - Multi-part upload for large files
   - Storage tiers: Hot, Cool, Archive
   - Cross-region replication (GRS)
   - CDN integration for read-heavy workloads
   - SAS tokens for fine-grained access control

### 💡 Key Design

```
Architecture:
┌────────────────────────────────────────────────────────┐
│                    Azure Front Door / CDN               │
│         Cache popular blobs at POP locations             │
└──────────┬─────────────────────────────────────────────┘
           │
  ┌────────▼──────────┐
  │  Storage Gateway   │  SAS token validation, rate limit
  │  (per region)      │  Routing to correct storage cluster
  └────────┬──────────┘
           │
  ┌────────▼──────────┐
  │  Partition Layer   │  Maps blob path → extent location
  │  (Table Server)    │  Account/Container/Blob metadata
  │  Range partitioned │  Partition key = AccountName
  └────────┬──────────┘
           │
  ┌────────▼──────────┐
  │  Stream Layer      │  Append-only distributed file system
  │  (Extent Nodes)    │  Writes to "extents" (sealed chunks)
  │  3 replicas per    │  Each extent ~1GB
  │  extent within AZ  │  Erasure coding for cool/archive
  └──────────────────┘

Storage Architecture (Azure's actual 3-layer WAS design):

1. FRONT-END LAYER (FE):
   - HTTP endpoint → authenticate (SAS token / Shared Key / Azure AD)
   - Route to correct partition server
   - Connection pooling + keep-alive

2. PARTITION LAYER:
class PartitionServer {
    // Maps logical blob address → physical extent + offset
    BlobMetadata locateBlob(String account, String container, String blobName) {
        // Partition key = AccountName (range-partitioned across partition servers)
        PartitionRange range = partitionMap.getRange(account);
        PartitionServer server = range.getServer();
        
        // Look up blob metadata in partition server's in-memory table
        return server.getBlobIndex().get(
            new BlobKey(account, container, blobName)
        );
        // Returns: { extentId, offset, length, tier, contentMD5, lastModified }
    }
    
    // Put blob: small (<256MB) → single extent append
    //           large (>256MB) → block blob with multi-part
    PutResult putBlob(PutRequest request) {
        if (request.size <= SINGLE_EXTENT_LIMIT) {
            // Append directly to current active extent
            ExtentLocation loc = streamLayer.append(request.data);
            
            // Update metadata in partition table
            blobIndex.put(request.blobKey, new BlobMetadata(
                loc.extentId, loc.offset, request.size,
                StorageTier.HOT, md5(request.data), Instant.now()
            ));
            
            return PutResult.success(loc);
        } else {
            // Block blob: upload blocks individually, then commit block list
            return handleBlockBlobUpload(request);
        }
    }
}

3. STREAM LAYER (Distributed File System):
class ExtentNode {
    // Append-only storage node
    // Each extent = sealed ~1GB file (immutable once full)
    // 3 synchronous replicas within failure domain (rack-aware)
    
    AppendResult append(byte[] data) {
        // Write to primary extent
        long offset = currentExtent.append(data);
        
        // Replicate to 2 secondary extent nodes (synchronous)
        CompletableFuture<Void> replica1 = secondary1.replicateAsync(currentExtent.id, offset, data);
        CompletableFuture<Void> replica2 = secondary2.replicateAsync(currentExtent.id, offset, data);
        
        // Wait for both replicas (quorum = all 3 for strong consistency)
        CompletableFuture.allOf(replica1, replica2).get(Duration.ofSeconds(5));
        
        // If extent is full, seal it (immutable) and open new extent
        if (currentExtent.size() >= EXTENT_SIZE_LIMIT) {
            currentExtent.seal();
            currentExtent = createNewExtent();
        }
        
        return new AppendResult(currentExtent.id, offset);
    }
}

Multi-Part Upload (Block Blob):
1. PUT Block: upload individual blocks (up to 4000 blocks × 4GB each)
   - Each block gets a blockId (server stores uncommitted blocks for 7 days)
   - Blocks can be uploaded in parallel from different threads/machines
2. PUT Block List: commit the final blob by specifying ordered list of blockIds
   - Atomic: either all blocks commit or none
   - Previous version remains readable until commit completes
3. Resumable: if upload fails, re-upload only the failed blocks

Storage Tiers & Lifecycle:
Hot:   3 replicas, synchronous, immediate access, highest cost
Cool:  3 replicas, lower cost, 180-day minimum, slight access penalty
Archive: Erasure coding (6+2), offline, hours to rehydrate, lowest cost

Lifecycle policy (JSON):
{
  "rules": [{
    "filters": { "blobTypes": ["blockBlob"], "prefix": "logs/" },
    "actions": {
      "baseBlob": {
        "tierToCool": { "daysAfterModification": 30 },
        "tierToArchive": { "daysAfterModification": 90 },
        "delete": { "daysAfterModification": 365 }
      }
    }
  }]
}

SAS Token (Shared Access Signature):
- Fine-grained access: specific blob, container, or account
- Time-limited: start + expiry timestamps
- Permission scoped: read, write, delete, list
- IP restricted: optional IP allowlist
- HMAC-SHA256 signed: cannot be tampered with
- Example: https://myaccount.blob.core.windows.net/container/blob.txt
           ?sv=2024-01-01&st=2025-01-01&se=2025-01-02
           &sr=b&sp=r&sig=<HMAC>
```

---

## 🎯 Key Takeaways
- Microsoft Azure = **distributed storage internals + 3-layer WAS architecture + strong consistency**
- **N-ary tree serialization**: preorder with `numChildren` marker → unambiguous without delimiters
- **BFS version**: avoids stack overflow for deep trees — use queue instead of recursion
- **Azure Storage (WAS)**: Front-End → Partition Layer → Stream Layer (3-layer architecture)
- **Stream Layer**: append-only extents (~1GB), sealed once full, 3 synchronous replicas
- **Block blob multi-part**: upload blocks in parallel → atomic commit with block list
- **Storage tiers**: Hot (3 replicas) → Cool (3 replicas, cheaper) → Archive (erasure coding, offline)
- **SAS tokens**: HMAC-SHA256 signed, time-limited, permission-scoped, IP-restricted

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium | DSA |
| Coding | Medium-Hard | N-ary Tree Serialization |
| Coding 2 | Hard | Distributed Systems |
| System Design | Hard | Azure Blob Storage, WAS Architecture |
| As-Appropriate | Medium-Hard | Leadership, Culture |
