# PhonePe — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 2 years |
| **Date** | January 2024 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience-for-sde-2/) |
| **Author** | Anonymous (SDE1 at FAANGM) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 3 (Machine Coding + DSA + Hiring Manager)
- **Timeline:** 2 weeks (applied via referral)
- **Format:** Virtual
- **Rejection Reason:** Low confidence in HM round + weak DSA performance on topological sort variant

---

## Round 1: Machine Coding
**Duration:** 2 hours coding + 1 hour discussion | **Interviewer:** SDE-3

### Questions Asked
1. **Low-Level Design Problem** — Given a problem statement, design and implement a system in 2 hours, then discuss design decisions for 1 hour

### 💡 Interview-Ready Answer — General Machine Coding Template

**The 2-hour Machine Coding Strategy:**
```
Minutes 0-15:   Read problem carefully. List all entities, operations, constraints.
Minutes 15-30:  Design class hierarchy. Identify patterns. Write interfaces.
Minutes 30-90:  Implement core logic. Focus on correctness over elegance.
Minutes 90-110: Add basic error handling. Test with sample inputs.
Minutes 110-120: Cleanup — rename variables, add brief comments on non-obvious logic.
```

**What PhonePe evaluates in Machine Coding:**
1. **Code organization** — Separate models, services, and driver code
2. **Design patterns** — Strategy, Observer, Factory where appropriate
3. **SOLID principles** — Single Responsibility, Open-Closed, Dependency Inversion
4. **Extensibility** — "What if we add a new feature?" should be easy
5. **Testability** — Methods should be unit-testable (no static dependencies)

**Discussion Questions to Expect:**
- "Why did you choose this data structure?"
- "How would this scale to 1M users?"
- "What if requirements change to add X?"
- "What are the trade-offs of your approach?"

---

## Round 2: DSA / Problem Solving
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Candy Distribution** (LeetCode 135 variant) — Minimize candies with constraints
2. **Course Prerequisites** — Topological sort variant (interviewer wanted better than BFS)
3. **Puzzle: rand6() → rand12()** — Generate uniform random 1-12 from rand(1-6)

### 💡 Interview-Ready Answer — Candy Distribution

```java
public int candy(int[] ratings) {
    int n = ratings.length;
    int[] candies = new int[n];
    Arrays.fill(candies, 1);
    
    // Left to right: if rating higher than left neighbor, give more
    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) {
            candies[i] = candies[i - 1] + 1;
        }
    }
    
    // Right to left: if rating higher than right neighbor, ensure more
    for (int i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) {
            candies[i] = Math.max(candies[i], candies[i + 1] + 1);
        }
    }
    
    return Arrays.stream(candies).sum();
}
```
**Time:** O(n), **Space:** O(n)

**Key Insight:** Two passes needed because a single pass can't handle V-shaped valleys correctly. First pass handles increasing sequences left-to-right, second handles it right-to-left.

### 💡 Interview-Ready Answer — Course Prerequisites (DFS Topological Sort)

The interviewer wanted DFS-based topological sort instead of Kahn's BFS:

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    
    for (int[] pre : prerequisites) {
        graph.get(pre[1]).add(pre[0]);
    }
    
    int[] visited = new int[numCourses]; // 0=unvisited, 1=in-progress, 2=done
    Deque<Integer> stack = new ArrayDeque<>();
    
    for (int i = 0; i < numCourses; i++) {
        if (visited[i] == 0) {
            if (!dfs(graph, i, visited, stack)) return new int[0]; // cycle
        }
    }
    
    int[] order = new int[numCourses];
    for (int i = 0; i < numCourses; i++) {
        order[i] = stack.pop();
    }
    return order;
}

private boolean dfs(List<List<Integer>> graph, int node, int[] visited, Deque<Integer> stack) {
    visited[node] = 1; // in-progress
    
    for (int neighbor : graph.get(node)) {
        if (visited[neighbor] == 1) return false; // cycle!
        if (visited[neighbor] == 0 && !dfs(graph, neighbor, visited, stack)) return false;
    }
    
    visited[node] = 2; // done
    stack.push(node);
    return true;
}
```

**Why DFS might be preferred over BFS:**
- **Cycle detection** is more natural with DFS (in-progress state)
- **DFS** produces reverse post-order directly → valid topological sort
- **Memory:** DFS uses O(V) stack, BFS needs in-degree array + queue
- **Interviewers at PhonePe** explicitly test whether you know both approaches and can articulate trade-offs

### 💡 Interview-Ready Answer — rand6() → rand12()

**One-liner approach:**
```java
// rand6() returns 1-6 uniformly
int rand12() {
    int val = (rand6() - 1) * 6 + rand6(); // generates 1-36 uniformly
    while (val > 36) val = (rand6() - 1) * 6 + rand6(); // rejection (not needed since max=36)
    
    // Map 1-36 to 1-12: each number maps to 3 values (36/12 = 3)
    return (val - 1) % 12 + 1;
}

// Simpler approach (the "one-liner" interviewer wanted):
int rand12_simple() {
    return (rand6() - 1) * 2 + (rand6() % 2 == 0 ? 1 : 2);
    // Wait, this doesn't work uniformly.
    
    // Actually: use rand6() to decide low/high half, then rand6() for position
    int half = (rand6() <= 3) ? 0 : 6; // 0 or 6 with equal probability
    int pos = rand6();                   // 1-6 with equal probability
    return half + pos;                   // 1-12 with equal probability!
}
```

**Proof of uniformity:**
- `half` is 0 with P=1/2, 6 with P=1/2
- `pos` is 1-6 each with P=1/6
- `result = half + pos`: each of 1-12 has P = 1/2 × 1/6 = 1/12 ✓

> **Pro Tip:** The key insight is decomposition: map rand6() to a binary choice (two halves), then use another rand6() for the position within the half.

---

## Round 3: Hiring Manager
**Duration:** 45 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **"Why do you want to leave your current FAANGM company?"**
2. **"Tell me about a recent project"**
3. **"SQL vs NoSQL — when would you use each?"**
4. **"How do you stay updated on new technologies?"**

### 💡 Interview-Ready Answer — SQL vs NoSQL

| Criteria | SQL (PostgreSQL/MySQL) | NoSQL (MongoDB/DynamoDB/Cassandra) |
|----------|----------------------|-----------------------------------|
| **Schema** | Fixed schema, migrations required | Flexible, schema-less |
| **Consistency** | Strong (ACID) | Eventual (BASE), tunable |
| **Scale** | Vertical mainly; horizontal with sharding (complex) | Horizontal natively (auto-sharding) |
| **Joins** | Efficient multi-table joins | No joins; denormalize or app-level |
| **Use When** | Complex queries, transactions, relationships matter | High write throughput, flexible schema, massive scale |
| **Examples** | Banking, e-commerce orders, user accounts | Social feeds, IoT data, product catalogs, session stores |

**The "real" answer PhonePe wants (being a fintech):**
> "For PhonePe's transaction data — SQL (PostgreSQL with Citus for horizontal scaling). ACID compliance is non-negotiable for financial data. For user activity feeds, session data, and analytics — NoSQL (Cassandra for write-heavy, DynamoDB for managed). The key is: **use the right tool for the data access pattern**, not a one-size-fits-all approach."

> **Why I was rejected:** I lacked confidence in the HM round when asked about SQL vs NoSQL in the context of payment systems. I gave generic answers instead of fintech-specific ones. Also, my topological sort solution was BFS-only; the interviewer wanted DFS and I couldn't pivot quickly enough.

---

## 🎯 Key Takeaways
- PhonePe's **Machine Coding round is 2+ hours** — much longer than most companies. Practice endurance.
- **Fintech domain knowledge matters** — relate answers to payment systems, ACID, transactions
- Know **BOTH BFS and DFS** for topological sort — PhonePe interviewers test depth of understanding
- **Probability puzzles** are common at fintech companies — practice rand() transformations
- **HM round is not a formality** — it can veto a hire. Show domain interest and genuine motivation.
- Candy Distribution = **two-pass greedy** — a must-know pattern for Indian company interviews

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium-Hard | Machine Coding, OOP, SOLID |
| Round 2 | Hard | Greedy, Topological Sort, Probability |
| Round 3 | Medium | Behavioral, Domain Knowledge, SQL/NoSQL |
