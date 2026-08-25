# Apple — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer (ICT3) |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + System Design + Behavioral)
- **Timeline:** 6 weeks (Apple is notoriously slow)
- **Team:** iCloud Backend

---

## Round 1: Phone Screen
**Duration:** 60 minutes

### Questions Asked
1. **Find Median from Data Stream** (LeetCode 295)

### 💡 Interview-Ready Answer

```java
class MedianFinder {
    // Max-heap for lower half, Min-heap for upper half
    private final PriorityQueue<Integer> maxHeap; // stores smaller half (max at top)
    private final PriorityQueue<Integer> minHeap; // stores larger half (min at top)
    
    MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }
    
    void addNum(int num) {
        maxHeap.offer(num);
        
        // Ensure all elements in maxHeap <= all elements in minHeap
        minHeap.offer(maxHeap.poll());
        
        // Balance: maxHeap can have at most 1 more element than minHeap
        if (minHeap.size() > maxHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }
    
    double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.peek();
        }
        return (maxHeap.peek() + minHeap.peek()) / 2.0;
    }
}
// addNum: O(log n), findMedian: O(1)
// Space: O(n)
```

---

## Round 2: Coding 1 (Onsite)
**Duration:** 60 minutes

### Questions Asked
1. **Design an In-Memory File System** (LeetCode 588)
2. **Follow-up: Add file permissions and symlinks**

### 💡 In-Memory File System

```java
class FileSystem {
    private final FileNode root;
    
    FileSystem() {
        root = new FileNode("", false); // Root directory
    }
    
    List<String> ls(String path) {
        FileNode node = navigate(path);
        
        if (node.isFile) {
            // Return just the file name
            return List.of(node.name);
        }
        
        // Return sorted directory contents
        return node.children.keySet().stream().sorted().collect(Collectors.toList());
    }
    
    void mkdir(String path) {
        navigateOrCreate(path, false);
    }
    
    void addContentToFile(String filePath, String content) {
        FileNode node = navigateOrCreate(filePath, true);
        node.content.append(content);
    }
    
    String readContentFromFile(String filePath) {
        return navigate(filePath).content.toString();
    }
    
    // Follow-up: Permissions
    void chmod(String path, Permission permission, String user) {
        FileNode node = navigate(path);
        node.permissions.put(user, permission);
    }
    
    boolean canAccess(String path, String user, Permission required) {
        FileNode node = navigate(path);
        Permission userPerm = node.permissions.getOrDefault(user, Permission.NONE);
        
        // Check hierarchy: READ < WRITE < ADMIN
        return userPerm.ordinal() >= required.ordinal();
    }
    
    // Follow-up: Symlinks
    void createSymlink(String linkPath, String targetPath) {
        String[] parts = linkPath.split("/");
        FileNode parent = navigateOrCreate(getParentPath(linkPath), false);
        
        FileNode symlink = new FileNode(parts[parts.length - 1], false);
        symlink.isSymlink = true;
        symlink.symlinkTarget = targetPath;
        parent.children.put(symlink.name, symlink);
    }
    
    private FileNode resolveSymlink(FileNode node, Set<String> visited) {
        if (!node.isSymlink) return node;
        
        if (visited.contains(node.symlinkTarget)) {
            throw new IllegalStateException("Circular symlink detected");
        }
        visited.add(node.symlinkTarget);
        
        FileNode target = navigate(node.symlinkTarget);
        return resolveSymlink(target, visited);
    }
    
    private FileNode navigate(String path) {
        if (path.equals("/")) return root;
        
        String[] parts = path.split("/");
        FileNode curr = root;
        
        for (int i = 1; i < parts.length; i++) {
            if (!curr.children.containsKey(parts[i])) {
                throw new IllegalArgumentException("Path not found: " + path);
            }
            curr = curr.children.get(parts[i]);
            
            // Resolve symlinks during traversal
            if (curr.isSymlink) {
                curr = resolveSymlink(curr, new HashSet<>());
            }
        }
        
        return curr;
    }
    
    private FileNode navigateOrCreate(String path, boolean isFile) {
        String[] parts = path.split("/");
        FileNode curr = root;
        
        for (int i = 1; i < parts.length; i++) {
            boolean lastPart = (i == parts.length - 1);
            curr.children.putIfAbsent(parts[i], new FileNode(parts[i], lastPart && isFile));
            curr = curr.children.get(parts[i]);
        }
        
        return curr;
    }
    
    static class FileNode {
        String name;
        boolean isFile;
        boolean isSymlink;
        String symlinkTarget;
        Map<String, FileNode> children = new TreeMap<>();
        StringBuilder content = new StringBuilder();
        Map<String, Permission> permissions = new HashMap<>();
        
        FileNode(String name, boolean isFile) {
            this.name = name;
            this.isFile = isFile;
        }
    }
    
    enum Permission { NONE, READ, WRITE, ADMIN }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design iCloud Sync for Files and Photos**
   - Multi-device sync, conflict resolution, bandwidth optimization, offline support

### 💡 Interview-Ready Answer

```
iCloud Sync:
┌──────────────────────────────────────────────────────────────┐
│  Core Concept: CloudKit + differential sync                   │
│                                                                │
│  Change Tracking (per device):                                │
│  - Each device maintains a "change token" (like a cursor)    │
│  - On sync: "give me changes since token X"                  │
│  - Server returns: new/modified/deleted records since X      │
│  - No polling: APNS (push notification) triggers sync        │
│                                                                │
│  Conflict Resolution:                                         │
│  - Last Writer Wins (LWW) with per-field granularity:        │
│    Each field has a timestamp → field-level merge, not record │
│  - For files: content-defined chunking (CDC)                 │
│    File split into variable-size chunks (4KB-64KB)           │
│    Hash each chunk (SHA-256)                                 │
│    On edit: only changed chunks uploaded                     │
│    On conflict: 3-way merge (base + device A + device B)    │
│    If auto-merge fails → generate conflict copy              │
│                                                                │
│  File Sync Protocol:                                          │
│  1. File modified on device A                                │
│  2. CDC: split into chunks, hash each                        │
│  3. Compare hashes with server's chunk list                  │
│  4. Upload only new/changed chunks (delta sync)              │
│  5. Update server's file manifest (ordered chunk list)       │
│  6. Server sends push to device B: "file X changed"         │
│  7. Device B: fetch manifest → identify missing chunks       │
│     → download only new chunks → reassemble file             │
│                                                                │
│  Photo-Specific Optimizations:                                │
│  - Thumbnail pre-generation: 3 sizes (small, medium, full)  │
│  - Upload: full resolution to iCloud, store thumbnail locally│
│  - "Optimize Storage": delete full-res locally, keep thumb   │
│  - Re-download on demand (e.g., user opens photo)            │
│  - HEIF format: 50% smaller than JPEG (Apple default since   │
│    iPhone 7)                                                  │
│  - Facial recognition: on-device ML → face clusters synced  │
│    as metadata (not raw photos)                              │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  APNS  ┌──────────────┐  S3-like  ┌────────┐ │
│  │ Device A  │◄──────▶│ iCloud Server │◄────────▶│ Object  │ │
│  │ CoreData  │        │              │           │ Storage │ │
│  │ (SQLite)  │        │ CloudKit     │           │ (chunks)│ │
│  └──────────┘        │ + Metadata DB│           └────────┘ │
│                       └──────┬───────┘                      │
│  ┌──────────┐  APNS          │                              │
│  │ Device B  │◄──────────────┘                              │
│  │ CoreData  │                                               │
│  └──────────┘                                                │
│                                                                │
│  Offline Support:                                             │
│  - All changes written to local SQLite (CoreData)            │
│  - Queue mutations in "pending uploads" table                │
│  - When back online: replay queue in order                   │
│  - Server assigns conflict resolution if needed              │
│                                                                │
│  Bandwidth Optimization:                                      │
│  - Delta sync: only changed chunks                           │
│  - Batched uploads: aggregate small file changes             │
│  - WiFi vs Cellular: prefer WiFi for large uploads           │
│  - Throttle: respect user's data plan settings               │
│  - Dedup: identical chunks (by hash) stored once             │
│                                                                │
│  Scale:                                                       │
│  - 850M+ iCloud accounts                                    │
│  - 2+ trillion photos stored                                │
│  - P99 sync latency: <30s (with push notification)           │
│  - Storage: Exabytes-scale object storage                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Apple ICT3 = **system design is dominant** — iCloud team cares about sync depth
- **Median from Stream** = two heaps (max-heap for lower, min-heap for upper) — classic phone screen
- **In-Memory File System** with symlinks + permissions + circular detection — Apple loves filesystem questions
- **iCloud Sync**: CDC (content-defined chunking) + delta sync + 3-way merge + APNS push
- **Photo optimization**: thumbnail tiers + "Optimize Storage" + HEIF format + on-device ML
- **Conflict resolution**: field-level LWW (not record-level) → reduces conflict copies
- Apple interview is **6 weeks end-to-end** — longest among FAANG

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Two Heaps, Median Stream |
| Coding | Hard | File System, Symlinks, Permissions |
| System Design | Very Hard | Cloud Sync, CDC, Conflict Resolution |
| Behavioral | Medium | Apple Values, Collaboration |
