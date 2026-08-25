# Microsoft — Senior SWE FullStack Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Redmond, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Azure Functions |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Serialize and Deserialize Binary Tree + Follow-up
**Duration:** 45 minutes

### Question: Serialize/deserialize a binary tree. Follow-up: make it support streaming (process node by node without having the full string).

```java
import java.util.*;

/**
 * Standard BFS level-order serialization with streaming deserialize.
 * 
 * Serialize: BFS level-order, "null" for missing nodes
 * Streaming Deserialize: process tokens one at a time using an iterator
 * 
 * Time: O(N) both directions
 * Space: O(N) for the queue
 */
class BinaryTreeCodec {
    
    public String serialize(TreeNode root) {
        if (root == null) return "null";
        
        StringBuilder sb = new StringBuilder();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            
            if (sb.length() > 0) sb.append(',');
            
            if (node == null) {
                sb.append("null");
            } else {
                sb.append(node.val);
                queue.offer(node.left);
                queue.offer(node.right);
            }
        }
        
        return sb.toString();
    }
    
    public TreeNode deserialize(String data) {
        if (data == null || data.equals("null")) return null;
        
        String[] tokens = data.split(",");
        TreeNode root = new TreeNode(Integer.parseInt(tokens[0]));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        int i = 1;
        while (!queue.isEmpty() && i < tokens.length) {
            TreeNode parent = queue.poll();
            
            // Left child
            if (!tokens[i].equals("null")) {
                parent.left = new TreeNode(Integer.parseInt(tokens[i]));
                queue.offer(parent.left);
            }
            i++;
            
            // Right child
            if (i < tokens.length && !tokens[i].equals("null")) {
                parent.right = new TreeNode(Integer.parseInt(tokens[i]));
                queue.offer(parent.right);
            }
            i++;
        }
        
        return root;
    }
}

/**
 * Follow-up: Streaming deserialization using Iterator pattern.
 * Process one token at a time — doesn't need full string in memory.
 * Useful for network streams or very large trees.
 */
class StreamingDeserializer {
    
    public TreeNode deserializeFromStream(Iterator<String> tokenStream) {
        if (!tokenStream.hasNext()) return null;
        
        String first = tokenStream.next();
        if (first.equals("null")) return null;
        
        TreeNode root = new TreeNode(Integer.parseInt(first));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        
        while (!queue.isEmpty() && tokenStream.hasNext()) {
            TreeNode parent = queue.poll();
            
            // Left child
            String leftToken = tokenStream.next();
            if (!leftToken.equals("null")) {
                parent.left = new TreeNode(Integer.parseInt(leftToken));
                queue.offer(parent.left);
            }
            
            // Right child
            if (tokenStream.hasNext()) {
                String rightToken = tokenStream.next();
                if (!rightToken.equals("null")) {
                    parent.right = new TreeNode(Integer.parseInt(rightToken));
                    queue.offer(parent.right);
                }
            }
        }
        
        return root;
    }
    
    /**
     * Usage: deserialize from a streaming reader
     * 
     * BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
     * Iterator<String> stream = new TokenIterator(reader, ',');
     * TreeNode root = deserializeFromStream(stream);
     */
}
```

---

## Round 2: System Design — Azure Functions (Serverless Compute)
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│              Azure Functions Architecture                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Trigger Sources                                           │   │
│  │                                                           │   │
│  │ HTTP    Timer    Queue   Blob    Event   Cosmos           │   │
│  │ Trigger  Cron   Trigger Storage  Grid   DB Change         │   │
│  │   │       │       │       │       │       │ Feed          │   │
│  └───┼───────┼───────┼───────┼───────┼───────┼──────────────┘   │
│      │       │       │       │       │       │                  │
│  ┌───▼───────▼───────▼───────▼───────▼───────▼──────────────┐   │
│  │ Scale Controller                                          │   │
│  │                                                           │   │
│  │ Monitors trigger sources, decides scaling:                │   │
│  │                                                           │   │
│  │ HTTP: concurrent requests → target 1000 req/instance      │   │
│  │ Queue: message count → 1 instance per 16 messages         │   │
│  │ Cosmos: lease partition count → 1 instance per partition   │   │
│  │ Timer: always exactly 1 instance                          │   │
│  │                                                           │   │
│  │ Scale decisions:                                          │   │
│  │ - Scale out: rate of new messages > processing rate       │   │
│  │ - Scale in: idle instances for > 10 minutes               │   │
│  │ - Max instances: configurable (default 200)               │   │
│  │ - Scale to zero: Consumption plan only                    │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │ Worker Management                                         │   │
│  │                                                           │   │
│  │ Cold Start Optimization:                                  │   │
│  │ ┌──────────────────────────────────────────────────────┐  │   │
│  │ │ Pre-warmed pool: N instances always ready             │  │   │
│  │ │ Snapshot: V8/CLR snapshot for instant restore         │  │   │
│  │ │ Language worker cache: reuse initialized runtimes     │  │   │
│  │ │ Dependency caching: shared NuGet/npm cache across     │  │   │
│  │ │   instances in same function app                      │  │   │
│  │ └──────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │ Execution Model:                                          │   │
│  │ ┌──────────────────────────────────────────────────────┐  │   │
│  │ │ In-process: .NET runs in host process                 │  │   │
│  │ │ Out-of-process (isolated): Node/Python/Java/custom    │  │   │
│  │ │   Host ←→ Worker via gRPC (function invocations)      │  │   │
│  │ │   Serialization: protobuf for args/return values      │  │   │
│  │ └──────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │ Instance Layout:                                          │   │
│  │ ┌──────────────────────────────────────────────────────┐  │   │
│  │ │ Host Process                                          │  │   │
│  │ │   ├── Trigger Listener (poll/push)                    │  │   │
│  │ │   ├── Binding Pipeline (input/output bindings)        │  │   │
│  │ │   ├── Middleware (logging, auth, retry)                │  │   │
│  │ │   └── gRPC channel to Language Worker                 │  │   │
│  │ │                                                       │  │   │
│  │ │ Language Worker Process                                │  │   │
│  │ │   ├── Function Loader (user code)                     │  │   │
│  │ │   ├── Dependency Injection container                   │  │   │
│  │ │   └── Execution context (cancellation, retry state)   │  │   │
│  │ └──────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Durable Functions (Orchestration)                         │   │
│  │                                                           │   │
│  │ Implements: Event Sourcing + Task Hub pattern             │   │
│  │                                                           │   │
│  │ Orchestrator function:                                    │   │
│  │   - Replayed from history on each wake-up                 │   │
│  │   - Must be DETERMINISTIC (no I/O, no random, no clock)  │   │
│  │   - Yields at each await → checkpoint to storage          │   │
│  │                                                           │   │
│  │ Task Hub (Azure Storage):                                 │   │
│  │   - History Table: all events for an orchestration        │   │
│  │   - Instances Table: status of each orchestration         │   │
│  │   - Work-item Queues: pending activities                  │   │
│  │   - Control Queues: orchestrator messages (partitioned)   │   │
│  │                                                           │   │
│  │ Patterns:                                                 │   │
│  │   - Fan-out/fan-in: parallel activities, await all        │   │
│  │   - Chaining: sequential steps                            │   │
│  │   - Human interaction: wait for external event + timer    │   │
│  │   - Sub-orchestrations: nested workflows                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Scale: 10B+ function executions/day across Azure, < 100ms     │
│  cold start (pre-warmed), 200 max instances per function app   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Microsoft L63 = **Tree serialization with streaming + Azure Functions system design**
- **Streaming deserialization**: Iterator pattern — process tokens one at a time, no full string in memory
- **BFS serialization**: level-order with "null" markers — natural for streaming over network
- **Cold start optimization**: pre-warmed pool + V8/CLR snapshots + dependency caching — critical for serverless
- **Out-of-process model**: host ↔ worker via gRPC — supports Node/Python/Java without coupling to .NET host
- **Durable Functions**: event sourcing with deterministic replay — orchestrator replayed from history on each wake
- **Scale Controller**: different heuristics per trigger type — HTTP=concurrent reqs, Queue=message count, Timer=singleton
- Microsoft = **Azure knowledge is a plus** — understand serverless, Functions, Durable Functions patterns

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | DSA |
| Coding | Medium-Hard | Tree Serialization, Streaming |
| System Design | Very Hard | Serverless, Event Sourcing |
| Behavioral | Medium | Growth Mindset stories |
