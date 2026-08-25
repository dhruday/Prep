# Microsoft — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Software Engineer II |
| **Level** | L62 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (3 Technical + AA)
- **Timeline:** 1 day (all rounds same day)
- **Team:** Azure DevOps

---

## Round 1: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Clone Graph** (LeetCode 133)
2. **Find All Paths From Source to Target** (LeetCode 797) — with cycle detection follow-up for general graphs

### 💡 Interview-Ready Answer — Clone Graph

```java
public Node cloneGraph(Node node) {
    if (node == null) return null;
    
    Map<Node, Node> visited = new HashMap<>();
    return dfs(node, visited);
}

private Node dfs(Node node, Map<Node, Node> visited) {
    if (visited.containsKey(node)) return visited.get(node);
    
    Node clone = new Node(node.val);
    visited.put(node, clone);
    
    for (Node neighbor : node.neighbors) {
        clone.neighbors.add(dfs(neighbor, visited));
    }
    return clone;
}
// Time: O(V + E), Space: O(V)
```

### 💡 All Paths Source to Target (with Cycle Detection)

```java
// For DAG (no cycles) — LeetCode 797
public List<List<Integer>> allPathsSourceTarget(int[][] graph) {
    List<List<Integer>> result = new ArrayList<>();
    List<Integer> path = new ArrayList<>();
    path.add(0);
    dfs(graph, 0, graph.length - 1, path, result);
    return result;
}

private void dfs(int[][] graph, int node, int target, List<Integer> path, List<List<Integer>> result) {
    if (node == target) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int next : graph[node]) {
        path.add(next);
        dfs(graph, next, target, path, result);
        path.remove(path.size() - 1);
    }
}

// Follow-up: General graph with cycles — need visited set in current path
private void dfsCyclic(Map<Integer, List<Integer>> graph, int node, int target,
                       Set<Integer> inPath, List<Integer> path, List<List<Integer>> result) {
    if (node == target) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int next : graph.getOrDefault(node, List.of())) {
        if (inPath.contains(next)) continue; // Skip cycles
        
        inPath.add(next);
        path.add(next);
        dfsCyclic(graph, next, target, inPath, path, result);
        path.remove(path.size() - 1);
        inPath.remove(next);
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a CI/CD Pipeline System (like Azure DevOps Pipelines)**
   - Pipeline configuration, triggering, execution, artifact management

### 💡 Interview-Ready Answer

```
CI/CD Pipeline Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Pipeline Configuration (YAML-defined):                      │
│  trigger:                                                     │
│    branches: [main, release/*]                               │
│  stages:                                                      │
│    - stage: Build                                            │
│      jobs:                                                    │
│        - job: BuildApp                                       │
│          pool: ubuntu-latest                                 │
│          steps:                                              │
│            - script: npm install && npm build                │
│            - publishArtifact: dist/                           │
│    - stage: Test                                             │
│      dependsOn: Build                                        │
│      jobs:                                                    │
│        - job: UnitTests (parallel matrix)                    │
│        - job: IntegrationTests                               │
│    - stage: Deploy                                           │
│      dependsOn: Test                                         │
│      condition: eq(variables['Build.SourceBranch'], 'main')  │
└──────────────────────────────────────────────────────────────┘

Execution Engine:
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ Webhook  │───▶│ Pipeline     │───▶│ Orchestrator     │    │
│  │ (Git)    │    │ Trigger Svc  │    │ (Stage/Job DAG)  │    │
│  └─────────┘    └──────────────┘    └────────┬─────────┘    │
│                                              │               │
│                    ┌─────────────────────────▼──┐            │
│                    │    Job Queue (per pool)     │            │
│                    │    Priority: PR > scheduled │            │
│                    └─────────┬───────────────────┘            │
│                              │                               │
│              ┌───────────────▼───────────────────┐            │
│              │      Agent Pool                    │            │
│              │  ┌────────┐ ┌────────┐ ┌────────┐│            │
│              │  │Agent 1 │ │Agent 2 │ │Agent 3 ││            │
│              │  │(Linux) │ │(Win)   │ │(macOS) ││            │
│              │  └────────┘ └────────┘ └────────┘│            │
│              └──────────────────────────────────┘            │
│                                                                │
│  Each Agent:                                                  │
│  1. Polls for available jobs from its pool                   │
│  2. Downloads source code + artifacts from previous stages   │
│  3. Executes steps in isolated container/VM                  │
│  4. Streams logs via WebSocket to Pipeline Service           │
│  5. Uploads artifacts to Blob Storage                        │
│  6. Reports status (success/failure) to Orchestrator         │
└──────────────────────────────────────────────────────────────┘

Artifact Management:
- Artifacts stored in Azure Blob Storage (S3 equivalent)
- Versioned by build number + pipeline ID
- Retention policy: keep last N builds
- Artifact feeds for package management (npm, Maven, NuGet)

Scale Numbers:
- Azure DevOps: ~50K pipeline runs/hour at peak
- Log streaming: ~100MB/agent/hour
- Artifact storage: petabytes
- Agent scaling: Kubernetes-based auto-scaling for hosted agents

Database Design:
┌──────────────────────────────────────────────────────────────┐
│  pipelines       pipeline_runs       jobs                    │
│  ├─ id           ├─ id               ├─ id                  │
│  ├─ org_id       ├─ pipeline_id (FK) ├─ run_id (FK)         │
│  ├─ yaml_path    ├─ commit_sha       ├─ stage_name          │
│  ├─ repo_url     ├─ trigger_type     ├─ status              │
│  └─ created_at   ├─ status           ├─ agent_id            │
│                   ├─ started_at       ├─ started_at          │
│                   └─ finished_at      ├─ finished_at         │
│                                       └─ exit_code           │
│                                                               │
│  artifacts        job_logs                                    │
│  ├─ id            ├─ job_id (FK)                             │
│  ├─ run_id (FK)   ├─ line_number                            │
│  ├─ name          ├─ timestamp                               │
│  ├─ blob_url      ├─ message                                │
│  └─ size_bytes    └─ level (info/warn/error)                │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 3: Design + Coding (Mixed)
**Duration:** 60 minutes

### Questions Asked
1. **Design a Rate Limiter with multiple strategies** (Token Bucket, Sliding Window)
2. **Implement Token Bucket in Java**

### 💡 Token Bucket Rate Limiter

```java
class TokenBucket {
    private final int capacity;
    private final double refillRate; // tokens per second
    private double tokens;
    private long lastRefillTimestamp;
    
    public TokenBucket(int capacity, double refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.tokens = capacity; // Start full
        this.lastRefillTimestamp = System.nanoTime();
    }
    
    public synchronized boolean tryConsume(int numTokens) {
        refill();
        
        if (tokens >= numTokens) {
            tokens -= numTokens;
            return true;
        }
        return false;
    }
    
    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillTimestamp) / 1e9; // seconds
        double tokensToAdd = elapsed * refillRate;
        
        tokens = Math.min(capacity, tokens + tokensToAdd);
        lastRefillTimestamp = now;
    }
}

// Sliding Window Log (more precise, more memory)
class SlidingWindowLog {
    private final int maxRequests;
    private final long windowMs;
    private final Deque<Long> timestamps;
    
    public SlidingWindowLog(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.timestamps = new ArrayDeque<>();
    }
    
    public synchronized boolean tryConsume() {
        long now = System.currentTimeMillis();
        long windowStart = now - windowMs;
        
        // Remove expired timestamps
        while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
            timestamps.pollFirst();
        }
        
        if (timestamps.size() < maxRequests) {
            timestamps.addLast(now);
            return true;
        }
        return false;
    }
}

// Distributed Rate Limiter using Redis
// Redis Lua script for atomic sliding window:
/*
local key = KEYS[1]
local window = tonumber(ARGV[1])  -- window in ms
local maxReqs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)

if count < maxReqs then
    redis.call('ZADD', key, now, now .. math.random())
    redis.call('PEXPIRE', key, window)
    return 1
else
    return 0
end
*/
```

---

## Round 4: AA (As-Appropriate) — Hiring Manager
**Duration:** 45 minutes

### Questions Asked
1. **Walk me through a project you're most proud of**
2. **How do you handle tech debt?**
3. **Tell me about a time you had to push back on product requirements**

---

## 🎯 Key Takeaways
- Microsoft does **all rounds in one day** — be prepared for stamina
- **Clone Graph** uses HashMap for visited mapping — classic BFS/DFS + cloning
- **CI/CD Pipeline design** is team-specific to Azure DevOps — know DAG execution, agent pools, artifact management
- **Token Bucket vs Sliding Window** — know trade-offs: burst handling vs precision vs memory
- Microsoft L62 = IC with some mentorship expectations
- **AA round** is the final decision-maker — be genuine, show growth mindset

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Graph Clone, DFS, Backtracking |
| System Design | Hard | CI/CD, Pipeline Orchestration, Agents |
| Design + Coding | Medium-Hard | Rate Limiter, Concurrency |
| AA | Medium | Behavioral |
