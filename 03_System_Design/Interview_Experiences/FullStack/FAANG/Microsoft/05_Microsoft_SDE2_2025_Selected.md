# Microsoft — SDE-2 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | SDE-2 |
| **Level** | L62 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Azure DevOps |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + As Appropriate)
- **Timeline:** 2 weeks

---

## Round 1: Coding 1
**Duration:** 60 minutes

### Questions Asked
1. **Design a Text Editor Undo/Redo** with character-level operations
2. **Snapshot Array** (LeetCode 1146)

### 💡 Text Editor with Undo/Redo

```java
class TextEditor {
    private StringBuilder text;
    private final Deque<Command> undoStack;
    private final Deque<Command> redoStack;
    
    interface Command {
        void execute();
        void undo();
    }
    
    class InsertCommand implements Command {
        int position;
        String content;
        
        InsertCommand(int position, String content) {
            this.position = position;
            this.content = content;
        }
        
        public void execute() { text.insert(position, content); }
        public void undo() { text.delete(position, position + content.length()); }
    }
    
    class DeleteCommand implements Command {
        int position;
        String deletedContent;
        int length;
        
        DeleteCommand(int position, int length) {
            this.position = position;
            this.length = length;
        }
        
        public void execute() {
            deletedContent = text.substring(position, position + length);
            text.delete(position, position + length);
        }
        
        public void undo() { text.insert(position, deletedContent); }
    }
    
    TextEditor() {
        text = new StringBuilder();
        undoStack = new ArrayDeque<>();
        redoStack = new ArrayDeque<>();
    }
    
    void insert(int position, String content) {
        Command cmd = new InsertCommand(position, content);
        cmd.execute();
        undoStack.push(cmd);
        redoStack.clear(); // New action invalidates redo history
    }
    
    void delete(int position, int length) {
        Command cmd = new DeleteCommand(position, length);
        cmd.execute();
        undoStack.push(cmd);
        redoStack.clear();
    }
    
    void undo() {
        if (undoStack.isEmpty()) return;
        Command cmd = undoStack.pop();
        cmd.undo();
        redoStack.push(cmd);
    }
    
    void redo() {
        if (redoStack.isEmpty()) return;
        Command cmd = redoStack.pop();
        cmd.execute();
        undoStack.push(cmd);
    }
    
    String getText() { return text.toString(); }
}
```

### 💡 Snapshot Array

```java
class SnapshotArray {
    // Each index stores a list of (snap_id, value) pairs
    // Using TreeMap for efficient binary search by snap_id
    private final TreeMap<Integer, Integer>[] data;
    private int snapId;
    
    @SuppressWarnings("unchecked")
    SnapshotArray(int length) {
        data = new TreeMap[length];
        for (int i = 0; i < length; i++) {
            data[i] = new TreeMap<>();
            data[i].put(0, 0); // Default value at snap 0
        }
        snapId = 0;
    }
    
    void set(int index, int val) {
        data[index].put(snapId, val);
    }
    
    int snap() {
        return snapId++;
    }
    
    int get(int index, int snap_id) {
        // Find the largest snap_id <= requested snap_id
        return data[index].floorEntry(snap_id).getValue();
    }
}
// Space: O(S) where S = total set() calls (NOT length × snaps)
// Time: O(log S) per get, O(1) per set, O(1) per snap
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Azure DevOps CI/CD Pipeline Execution Engine**
   - Pipeline definition, agent management, parallel stages, artifact management

### 💡 Interview-Ready Answer

```
Azure DevOps Pipeline Engine:
┌──────────────────────────────────────────────────────────────┐
│  Pipeline Definition (YAML):                                  │
│  trigger:                                                     │
│    branches: [main, release/*]                               │
│  stages:                                                      │
│    - stage: Build                                            │
│      jobs:                                                    │
│        - job: BuildApp                                       │
│          pool: ubuntu-latest                                 │
│          steps: [checkout, npm install, npm test, npm build] │
│    - stage: Deploy                                           │
│      dependsOn: Build                                        │
│      jobs:                                                    │
│        - deployment: Production                              │
│          environment: prod                                    │
│          strategy: rolling # or canary, blue-green           │
│                                                                │
│  Execution Model (DAG):                                       │
│  - Stages: sequential or parallel (dependsOn graph)          │
│  - Jobs within stage: parallel by default                    │
│  - Steps within job: sequential                              │
│  - Condition evaluation: succeeded(), failed(), always()     │
│                                                                │
│  Agent Pool Management:                                       │
│  ┌──────────────────────────────────────────────┐            │
│  │ Pipeline Service                               │            │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐      │            │
│  │ │ Queue     │ │ Scheduler │ │ Agent Mgr│      │            │
│  │ │ Manager   │ │           │ │           │      │            │
│  │ └────┬─────┘ └─────┬────┘ └─────┬────┘      │            │
│  │      │              │            │             │            │
│  │      ▼              ▼            ▼             │            │
│  │  ┌──────┐   ┌──────────┐  ┌──────────┐      │            │
│  │  │ Job   │   │ Resource  │  │ Scale Set│      │            │
│  │  │ Queue │   │ Allocator │  │ Manager  │      │            │
│  │  └──────┘   └──────────┘  └──────────┘      │            │
│  └──────────────────────────────────────────────┘            │
│                           |                                   │
│              ┌────────────┼────────────┐                     │
│              │            │            │                      │
│         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐                 │
│         │ Agent 1 │  │ Agent 2 │  │ Agent 3 │                 │
│         │(ubuntu) │  │(windows)│  │(macOS)  │                 │
│         └────────┘  └────────┘  └────────┘                 │
│                                                                │
│  Job Execution on Agent:                                      │
│  1. Agent polls for job from queue (long-poll)               │
│  2. Download source code + pipeline artifacts                │
│  3. Set up environment (Docker container or VM)              │
│  4. Execute steps sequentially                               │
│  5. Stream logs real-time (WebSocket to server)              │
│  6. Upload artifacts + test results + code coverage          │
│  7. Report job result (succeed/fail) back to server          │
│  8. Clean up workspace                                       │
│                                                                │
│  Artifact Management:                                         │
│  - Pipeline artifacts: build output, test results            │
│  - Storage: Azure Blob Storage (dedup using content hash)    │
│  - Retention: configurable (default 30 days)                 │
│  - Feed: NuGet, npm, Maven, PyPI (package management)       │
│                                                                │
│  Scale:                                                       │
│  - 10M+ pipelines/day across Azure DevOps                    │
│  - Agent auto-scaling: VMSS (scale set) + KEDA (Kubernetes)  │
│  - Cold start: pre-warmed agent pools for popular images     │
│  - Queue prioritization: paid tiers get higher priority      │
│                                                                │
│  Reliability:                                                 │
│  - Agent heartbeat: every 30s, mark unhealthy after 3 misses│
│  - Job retry: automatic retry on infra failure (not user code)│
│  - Checkpoint: long-running jobs save state for resume       │
│  - Secrets: Azure Key Vault integration, never logged        │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: As Appropriate (Hiring Manager)
**Duration:** 45 minutes

### Questions Asked
1. **Walk me through the most complex system you've built from scratch**
2. **How do you handle technical debt? Give an example.**
3. **Coding: LRU Cache with Expiry** (combine LRU + TTL)

### 💡 LRU Cache with Expiry

```java
class LRUCacheWithExpiry<K, V> {
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail; // Sentinel nodes
    
    record Node<K, V>(K key, V value, long expiryTimeMs, Node<K, V> prev, Node<K, V> next) {
        // Mutable version for DLL
    }
    
    // Simplified with HashMap + DLL
    V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        
        // Check expiry
        if (System.currentTimeMillis() > node.expiryTimeMs) {
            removeNode(node);
            map.remove(key);
            return null; // Expired
        }
        
        // Move to front (most recently used)
        moveToFront(node);
        return node.value;
    }
    
    void put(K key, V value, long ttlMs) {
        if (map.containsKey(key)) {
            // Update existing
            Node<K, V> existing = map.get(key);
            removeNode(existing);
        }
        
        if (map.size() >= capacity) {
            // Evict: try expired first, then LRU
            evictExpiredOrLRU();
        }
        
        long expiryTime = System.currentTimeMillis() + ttlMs;
        Node<K, V> newNode = new Node<>(key, value, expiryTime, null, null);
        addToFront(newNode);
        map.put(key, newNode);
    }
    
    private void evictExpiredOrLRU() {
        // Scan from tail (least recently used) and evict first expired
        Node<K, V> curr = tail.prev;
        while (curr != head) {
            if (System.currentTimeMillis() > curr.expiryTimeMs) {
                removeNode(curr);
                map.remove(curr.key);
                return;
            }
            curr = curr.prev;
        }
        
        // No expired found, evict LRU (tail)
        Node<K, V> lru = tail.prev;
        removeNode(lru);
        map.remove(lru.key);
    }
}
```

---

## 🎯 Key Takeaways
- Microsoft SDE-2 = **LLD patterns (Command) + relevant SD (Azure DevOps)**
- **Text Editor Undo/Redo** with Command Pattern = classic Microsoft LLD question
- **Snapshot Array** with TreeMap floor entry = space-efficient versioning
- **CI/CD Pipeline** = DAG execution, agent pool management, artifact management
- **LRU + TTL** = common follow-up to standard LRU Cache
- Microsoft values **clean code, extensibility, and understanding of their products**
- Know **Azure services** (Blob Storage, Key Vault, VMSS) even if you don't use them daily

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Command Pattern, TreeMap, Versioning |
| System Design | Hard | CI/CD Pipeline, Agent Management, DAG |
| HM + Coding | Medium-Hard | LRU + TTL, Behavioral, Technical Depth |
