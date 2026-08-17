# Google — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer |
| **Level** | L4 |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 5 weeks (includes HC review)
- **Format:** Virtual

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Number of Connected Components in Undirected Graph** (LeetCode 323)
2. **Follow-up:** What if edges are added dynamically? → Union-Find

### 💡 Interview-Ready Answer — Union-Find

```java
class UnionFind {
    int[] parent;
    int[] rank;
    int components;
    
    UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]); // path compression
        return parent[x];
    }
    
    boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        
        // Union by rank
        if (rank[px] < rank[py]) { parent[px] = py; }
        else if (rank[px] > rank[py]) { parent[py] = px; }
        else { parent[py] = px; rank[px]++; }
        
        components--;
        return true;
    }
    
    int getComponents() { return components; }
}

// O(α(n)) per operation ≈ O(1) amortized
```

---

## Round 2: Onsite — Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design a File System** (LeetCode 1166 variant)
   - createPath(path, value), get(path) — with watching for changes

### 💡 Interview-Ready Answer

```java
class FileSystem {
    TrieNode root;
    Map<String, List<Consumer<Integer>>> watchers;
    
    FileSystem() {
        root = new TrieNode();
        watchers = new HashMap<>();
    }
    
    boolean createPath(String path, int value) {
        String[] parts = path.split("/");
        TrieNode node = root;
        
        for (int i = 1; i < parts.length - 1; i++) {
            if (!node.children.containsKey(parts[i])) return false; // parent doesn't exist
            node = node.children.get(parts[i]);
        }
        
        String lastPart = parts[parts.length - 1];
        if (node.children.containsKey(lastPart)) return false; // path already exists
        
        TrieNode newNode = new TrieNode();
        newNode.value = value;
        node.children.put(lastPart, newNode);
        return true;
    }
    
    int get(String path) {
        TrieNode node = traverse(path);
        return node != null ? node.value : -1;
    }
    
    boolean set(String path, int newValue) {
        TrieNode node = traverse(path);
        if (node == null) return false;
        
        int oldValue = node.value;
        node.value = newValue;
        
        // Notify watchers on this path and all parent paths
        notifyWatchers(path, newValue);
        
        return true;
    }
    
    void watch(String path, Consumer<Integer> callback) {
        watchers.computeIfAbsent(path, k -> new ArrayList<>()).add(callback);
    }
    
    private void notifyWatchers(String path, int value) {
        // Notify watchers on exact path
        List<Consumer<Integer>> callbacks = watchers.get(path);
        if (callbacks != null) {
            for (Consumer<Integer> cb : callbacks) cb.accept(value);
        }
        
        // Notify parent path watchers (bubble up)
        int lastSlash = path.lastIndexOf('/');
        if (lastSlash > 0) {
            notifyWatchers(path.substring(0, lastSlash), value);
        }
    }
    
    private TrieNode traverse(String path) {
        String[] parts = path.split("/");
        TrieNode node = root;
        for (int i = 1; i < parts.length; i++) {
            if (!node.children.containsKey(parts[i])) return null;
            node = node.children.get(parts[i]);
        }
        return node;
    }
}

class TrieNode {
    int value = -1;
    Map<String, TrieNode> children = new HashMap<>();
}
```

---

## Round 3: Onsite — Coding 2
**Duration:** 45 minutes

### Questions Asked
1. **Smallest Window Containing All Characters** (LeetCode 76 variant)
   - Follow-up: Stream input — characters arrive one at a time, maintain answer dynamically

### 💡 Interview-Ready Answer

```java
public String minWindow(String s, String t) {
    if (s.length() < t.length()) return "";
    
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
    
    int required = need.size(); // unique chars needed
    int formed = 0;
    Map<Character, Integer> window = new HashMap<>();
    
    int[] result = {-1, 0, 0}; // length, left, right
    int left = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        window.merge(c, 1, Integer::sum);
        
        if (need.containsKey(c) && window.get(c).intValue() == need.get(c).intValue()) {
            formed++;
        }
        
        // Contract window from left
        while (formed == required) {
            int windowLen = right - left + 1;
            if (result[0] == -1 || windowLen < result[0]) {
                result[0] = windowLen;
                result[1] = left;
                result[2] = right;
            }
            
            char leftChar = s.charAt(left);
            window.merge(leftChar, -1, Integer::sum);
            if (need.containsKey(leftChar) && window.get(leftChar) < need.get(leftChar)) {
                formed--;
            }
            left++;
        }
    }
    
    return result[0] == -1 ? "" : s.substring(result[1], result[2] + 1);
}
```

---

## Round 4: Onsite — System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design Google Drive — file storage, sharing, sync, versioning**

### 💡 Interview-Ready Answer

```
Google Drive Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Client (Desktop / Web / Mobile)                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  File Watcher: inotify (Linux) / FSEvents (Mac)       │    │
│  │  - Detects local changes                              │    │
│  │  - Computes delta (rsync algorithm: rolling checksum) │    │
│  │  - Uploads only changed blocks (chunked upload)       │    │
│  │  - Conflict detection: compare server version          │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS + WebSocket (for push notifications)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  API Layer                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Upload       │  │ Metadata     │  │ Sharing      │       │
│  │ Service      │  │ Service      │  │ Service      │       │
│  │ (chunked,   │  │ (file tree,  │  │ (ACL, link   │       │
│  │  resumable)  │  │  versions)   │  │  sharing)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ Sync         │  │ Notification │                          │
│  │ Service      │  │ Service      │                          │
│  │ (delta sync, │  │ (WebSocket   │                          │
│  │  conflict    │  │  push for    │                          │
│  │  resolution) │  │  real-time)  │                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Storage Layer                                                │
│                                                                │
│  File Content → Blob Store (GCS — Google Cloud Storage)      │
│  - Files chunked into 4MB blocks                              │
│  - Each block content-addressed (SHA-256 hash)               │
│  - Deduplication: same content = same hash = stored once     │
│  - Encryption: AES-256 per chunk, key per file               │
│                                                                │
│  Metadata → Bigtable / Spanner                                │
│  - File tree: {fileId, parentId, name, size, mimeType,       │
│                 ownerId, createdAt, modifiedAt, version}      │
│  - Versions: {fileId, version, chunkHashes[], timestamp}     │
│  - ACL: {fileId, userId/groupId, permission}                 │
│                                                                │
│  Search Index → Elasticsearch (full-text search in docs)     │
└──────────────────────────────────────────────────────────────┘
```

#### Chunked Upload with Resumability
```java
class ChunkedUploader {
    static final int CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
    
    String initiateUpload(String fileName, long fileSize, String mimeType) {
        // Returns upload session ID
        // Client can resume from last successful chunk if interrupted
        String sessionId = UUID.randomUUID().toString();
        uploadSessions.put(sessionId, new UploadSession(fileName, fileSize, mimeType, 0));
        return sessionId;
    }
    
    void uploadChunk(String sessionId, int chunkIndex, byte[] data) {
        UploadSession session = uploadSessions.get(sessionId);
        
        // Content-addressable storage: hash the chunk
        String chunkHash = sha256(data);
        
        // Dedup check: if chunk with this hash already exists, skip upload
        if (!blobStore.exists(chunkHash)) {
            // Encrypt chunk before storing
            byte[] encrypted = encrypt(data, session.encryptionKey);
            blobStore.put(chunkHash, encrypted);
        }
        
        session.chunkHashes.add(chunkHash);
        session.uploadedChunks++;
        
        if (session.isComplete()) {
            finalizeUpload(session);
        }
    }
    
    void finalizeUpload(UploadSession session) {
        // Create file metadata
        FileMetadata metadata = new FileMetadata();
        metadata.fileId = generateFileId();
        metadata.name = session.fileName;
        metadata.size = session.fileSize;
        metadata.version = 1;
        metadata.chunkHashes = session.chunkHashes;
        metadata.createdAt = Instant.now();
        
        metadataStore.save(metadata);
        
        // Notify sync service → push to other devices
        notificationService.notifyDevices(session.userId, "FILE_CREATED", metadata);
    }
}
```

#### Conflict Resolution
```
Scenario: User A edits file on laptop, User B edits same file on phone.
Both offline → both upload when online → CONFLICT.

Resolution Strategies:
1. Last-Writer-Wins (LWW): Simpler, but loses one edit
2. Keep Both Copies: "file (conflict copy of UserA).docx"
   - Drive's approach for binary files
3. Operational Transform / CRDT: For collaborative docs (Google Docs)
   - Not used for file-level sync

Drive's approach:
- Each file has a version number
- Upload includes: "my base version was 5, here's my changes"
- If server is at version 5 → accept (becomes version 6)
- If server is at version 6 → CONFLICT
  → Binary files: create conflict copy
  → Google Docs: merge via OT (separate system)
```

---

## Round 5: Behavioral (Googleyness + Leadership)
**Duration:** 45 minutes

---

## 🎯 Key Takeaways
- Google L4 = solid DSA + system design + good behavioral
- **Union-Find** for dynamic connectivity problems — must-know following BFS/DFS
- **Trie-based file system** is a classic Google question — add watchers for bonus
- **Sliding window** for minimum window — the template applies to many problems
- **Google Drive design** covers: chunked upload, content-addressed storage, delta sync, conflict resolution
- **Deduplication** via content hashing is key — saves massive storage
- Google HC (Hiring Committee) can take 2+ weeks — prepare for the wait

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Union-Find, Graph |
| Coding 1 | Medium-Hard | Trie, File System, Observer |
| Coding 2 | Hard | Sliding Window, Streaming |
| System Design | Hard | File Storage, Sync, Chunked Upload |
| Behavioral | Medium | Googleyness, Leadership |
