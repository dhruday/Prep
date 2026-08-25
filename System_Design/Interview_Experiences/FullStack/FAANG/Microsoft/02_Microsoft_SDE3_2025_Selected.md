# Microsoft — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer |
| **Level** | L63 (SDE-3 equivalent) |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Microsoft-Senior-Software-Engineer-Interview-Questions-EI_IE1651.0,9_KO10,34.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + AA/Hiring Manager)
- **Timeline:** 3 weeks
- **Format:** Virtual (Teams)
- **Note:** Microsoft L63 expects strong design thinking + mentorship evidence

---

## Round 1: Phone Screen
**Duration:** 45 minutes | **Interviewer:** SDE-2

### Questions Asked
1. **LRU Cache** (LeetCode 146) — full implementation from scratch
2. **Follow-up: How would you make it distributed?**

### 💡 Interview-Ready Answer — Distributed LRU Cache

After implementing the standard LRU (HashMap + DLL), the follow-up:

```
Single-node LRU → Distributed LRU:

Option 1: Consistent Hashing (Memcached approach)
┌──────────────┐
│  Client       │
│  hash(key) →  │───▶ Node that owns this hash range
│  route to node│
└──────────────┘

- Each node maintains its own LRU
- Hash ring distributes keys across N nodes
- If node fails, successor takes over (virtual nodes for balance)
- Problem: no replication → cache miss on failure

Option 2: Replicated (Redis Cluster approach)
- Each key on primary + replica
- Read from primary or replica
- Write-through to primary → async replicate
- Problem: staleness during replication lag

Cache Invalidation Strategies:
1. TTL-based: each entry expires after T seconds
2. Event-driven: database change → publish invalidation event → all cache nodes evict
3. Versioned: each entry has version number, stale versions are lazy-evicted on read
```

---

## Round 2: Onsite — Coding + LLD
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Word Break II** (LeetCode 140)
2. **Design a File System with Permissions** (LLD)

### 💡 Interview-Ready Answer — Word Break II

```java
public List<String> wordBreak(String s, List<String> wordDict) {
    Set<String> wordSet = new HashSet<>(wordDict);
    Map<Integer, List<String>> memo = new HashMap<>();
    return dfs(s, 0, wordSet, memo);
}

private List<String> dfs(String s, int start, Set<String> wordSet, Map<Integer, List<String>> memo) {
    if (memo.containsKey(start)) return memo.get(start);
    
    List<String> result = new ArrayList<>();
    
    if (start == s.length()) {
        result.add(""); // base case: reached end
        return result;
    }
    
    for (int end = start + 1; end <= s.length(); end++) {
        String word = s.substring(start, end);
        if (wordSet.contains(word)) {
            List<String> subSentences = dfs(s, end, wordSet, memo);
            for (String sub : subSentences) {
                result.add(word + (sub.isEmpty() ? "" : " " + sub));
            }
        }
    }
    
    memo.put(start, result);
    return result;
}
```
**Time:** O(2^n × n) worst case (exponential sentences possible), **Space:** O(n × 2^n) for memoization

### 💡 Interview-Ready Answer — File System with Permissions

```java
enum Permission { READ, WRITE, EXECUTE }
enum NodeType { FILE, DIRECTORY }

class FSNode {
    String name;
    NodeType type;
    FSNode parent;
    Map<String, FSNode> children; // only for directories
    byte[] content;                // only for files
    String ownerId;
    Map<String, EnumSet<Permission>> acl; // userId → permissions
    EnumSet<Permission> defaultPermissions;
    long createdAt, modifiedAt;
    
    FSNode(String name, NodeType type, String ownerId) {
        this.name = name;
        this.type = type;
        this.ownerId = ownerId;
        this.acl = new HashMap<>();
        this.defaultPermissions = EnumSet.of(Permission.READ); // default: read-only for others
        this.createdAt = this.modifiedAt = System.currentTimeMillis();
        if (type == NodeType.DIRECTORY) this.children = new LinkedHashMap<>();
    }
}

class FileSystem {
    FSNode root;
    Map<String, FSNode> pathCache = new HashMap<>(); // path → node (for quick lookup)
    
    FileSystem() {
        root = new FSNode("/", NodeType.DIRECTORY, "root");
        pathCache.put("/", root);
    }
    
    // Resolve path to node
    FSNode resolve(String path) {
        if (pathCache.containsKey(path)) return pathCache.get(path);
        
        String[] parts = path.split("/");
        FSNode current = root;
        
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (current.type != NodeType.DIRECTORY || !current.children.containsKey(part)) {
                throw new IllegalArgumentException("Path not found: " + path);
            }
            current = current.children.get(part);
        }
        
        pathCache.put(path, current);
        return current;
    }
    
    // Check permission (with ACL inheritance from parent)
    boolean hasPermission(String userId, String path, Permission perm) {
        FSNode node = resolve(path);
        
        // Owner has all permissions
        if (node.ownerId.equals(userId)) return true;
        
        // Check explicit ACL
        if (node.acl.containsKey(userId)) {
            return node.acl.get(userId).contains(perm);
        }
        
        // Check parent (inheritance)
        if (node.parent != null) {
            return hasPermission(userId, getPath(node.parent), perm);
        }
        
        // Default permissions
        return node.defaultPermissions.contains(perm);
    }
    
    // Create file
    FSNode createFile(String parentPath, String fileName, String userId, byte[] content) {
        if (!hasPermission(userId, parentPath, Permission.WRITE)) {
            throw new SecurityException("Permission denied: WRITE on " + parentPath);
        }
        
        FSNode parent = resolve(parentPath);
        if (parent.type != NodeType.DIRECTORY) throw new IllegalStateException("Not a directory");
        if (parent.children.containsKey(fileName)) throw new IllegalStateException("File exists");
        
        FSNode file = new FSNode(fileName, NodeType.FILE, userId);
        file.content = content;
        file.parent = parent;
        parent.children.put(fileName, file);
        parent.modifiedAt = System.currentTimeMillis();
        
        String fullPath = parentPath.equals("/") ? "/" + fileName : parentPath + "/" + fileName;
        pathCache.put(fullPath, file);
        
        return file;
    }
    
    // Create directory
    FSNode mkdir(String parentPath, String dirName, String userId) {
        if (!hasPermission(userId, parentPath, Permission.WRITE)) {
            throw new SecurityException("Permission denied");
        }
        
        FSNode parent = resolve(parentPath);
        FSNode dir = new FSNode(dirName, NodeType.DIRECTORY, userId);
        dir.parent = parent;
        parent.children.put(dirName, dir);
        
        String fullPath = parentPath.equals("/") ? "/" + dirName : parentPath + "/" + dirName;
        pathCache.put(fullPath, dir);
        
        return dir;
    }
    
    // List directory
    List<String> ls(String path, String userId) {
        if (!hasPermission(userId, path, Permission.READ)) {
            throw new SecurityException("Permission denied: READ on " + path);
        }
        
        FSNode node = resolve(path);
        if (node.type == NodeType.FILE) return List.of(node.name);
        return new ArrayList<>(node.children.keySet());
    }
    
    // Grant permission
    void grantPermission(String path, String grantorId, String granteeId, Permission perm) {
        FSNode node = resolve(path);
        if (!node.ownerId.equals(grantorId)) {
            throw new SecurityException("Only owner can grant permissions");
        }
        node.acl.computeIfAbsent(granteeId, k -> EnumSet.noneOf(Permission.class)).add(perm);
    }
    
    private String getPath(FSNode node) {
        if (node.parent == null) return "/";
        return getPath(node.parent) + "/" + node.name;
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design Microsoft Teams — Real-time Messaging and Video Calls**

### 💡 Interview-Ready Answer

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Desktop  │  │ Web      │  │ Mobile   │  │ Rooms    │   │
│  │ (Electron│  │ (React)  │  │ (Native) │  │ Device   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼────────────┼──────────┘
        │              │              │            │
        ▼              ▼              ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│  Signaling & Connection Layer                                 │
│  ┌────────────────┐  ┌────────────────┐                      │
│  │ WebSocket       │  │ WebRTC         │                      │
│  │ (Chat, Presence │  │ Signaling      │                      │
│  │  Notifications) │  │ (ICE, SDP)     │                      │
│  └────────┬───────┘  └────────┬───────┘                      │
└───────────┼───────────────────┼──────────────────────────────┘
            │                   │
    ┌───────▼───────┐  ┌───────▼────────────────┐
    │  Chat Service  │  │  Media Service          │
    │                │  │                          │
    │  - Channels    │  │  - SFU (Selective       │
    │  - DMs         │  │    Forwarding Unit)     │
    │  - Threads     │  │  - Transcoding          │
    │  - @mentions   │  │  - Recording            │
    │  - Reactions   │  │  - Screen sharing       │
    └───────┬───────┘  └───────┬────────────────┘
            │                   │
            ▼                   ▼
    ┌──────────────┐  ┌──────────────┐
    │  Cosmos DB   │  │  Azure Blob  │
    │  (Messages,  │  │  (Media,     │
    │   Channels)  │  │   Recordings)│
    └──────────────┘  └──────────────┘
```

#### Chat Message Flow
```
1. User types message → WebSocket → Chat Service
2. Chat Service:
   a. Persist to Cosmos DB (partition key = channelId)
   b. Publish to Kafka topic: channel-{channelId}
3. Kafka consumer → Push to all connected WebSocket sessions in that channel
4. Mobile users offline → Push notification via APNS/FCM
5. Read receipts: client sends "read" event → update last_read_at per user per channel
```

#### Video Call: SFU Architecture
```
Why SFU over Mesh or MCU?

Mesh (P2P):  Each participant sends to every other. N users = N(N-1) connections. Breaks at N>4.
MCU (Server): Server mixes all streams into one. CPU-expensive. Single point of failure.
SFU (Used):  Each participant sends 1 stream to server. Server forwards to others. Scalable.

┌────────┐     ┌─────────────┐     ┌────────┐
│ Alice  │────▶│             │────▶│ Bob    │
│(webcam)│     │    SFU      │     │(viewer)│
│        │◀────│  (Selective │◀────│(webcam)│
└────────┘     │  Forwarding │     └────────┘
               │  Unit)      │
┌────────┐     │             │     ┌────────┐
│ Carol  │────▶│ Receives    │────▶│ Dave   │
│(webcam)│     │ each stream │     │(viewer)│
│        │◀────│ once,       │     │        │
└────────┘     │ forwards to │◀────└────────┘
               │ all others  │
               └─────────────┘

Bandwidth: Each user uploads 1 stream, downloads N-1 streams
Client-side quality adaptation: viewer can request lower quality from SFU
```

#### Presence System
```java
class PresenceService {
    // User status: AVAILABLE, BUSY, DND, AWAY, OFFLINE
    // Challenge: 250M daily active users, must update in near-real-time
    
    // Heartbeat-based presence
    // Client sends heartbeat every 30 seconds via WebSocket
    // If no heartbeat for 90 seconds → mark OFFLINE
    
    // Redis for active presence (key: userId, value: status + lastSeen)
    // TTL: 90 seconds (auto-expire if no heartbeat)
    
    void heartbeat(String userId, String status) {
        redis.setex("presence:" + userId, 90, status + ":" + System.currentTimeMillis());
        
        // Fan-out presence changes to contacts
        List<String> contacts = contactService.getContacts(userId);
        for (String contactId : contacts) {
            // Only notify if this contact has an active WebSocket connection
            if (webSocketManager.isConnected(contactId)) {
                webSocketManager.send(contactId, new PresenceUpdate(userId, status));
            }
        }
    }
}
```

---

## Round 4: AA (As Appropriate) / Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **"How do you mentor junior engineers?"**
2. **"Tell me about a system you designed that you're most proud of"**
3. **"What's your approach to technical disagreements with staff+ engineers?"**

### 💡 Interview-Ready Answer — Mentoring

> "I structure mentoring around four pillars:
> 1. **Code Reviews as Teaching:** I don't just approve/reject. I explain the 'why' — why this pattern is better, what could go wrong, what the tradeoffs are.
> 2. **Pairing on Hard Problems:** When a junior is stuck, I don't give the answer. I pair with them and ask guiding questions. This builds problem-solving skills, not just knowledge.
> 3. **Design Doc Reviews:** I have juniors write design docs for features they own. I review and help them think through edge cases they'd miss.
> 4. **Growth trajectories:** I help each junior identify their growth area (say, system design or communication) and assign work that stretches them in that dimension."

---

## 🎯 Key Takeaways
- Microsoft L63 expects **design depth + mentorship evidence**
- **File System with Permissions** is a Microsoft classic LLD — know ACL inheritance
- **Word Break II** is a backtracking + memoization must-know
- **Microsoft Teams design** = WebSocket + SFU + Presence — know the video call architecture
- **SFU vs MCU vs Mesh** — critical distinction for any video calling system design
- **Distributed LRU Cache** follow-up is common — know consistent hashing + invalidation strategies
- Microsoft values **Growth Mindset** — show you learn from failures and help others grow

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | LRU Cache, Distributed Systems |
| Round 2 | Hard | Backtracking + Memo, File System LLD |
| Round 3 | Very Hard | WebSocket, SFU, Presence, Real-time |
| Round 4 | Medium | Behavioral, Mentoring, Leadership |
