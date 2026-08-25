# LinkedIn — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Software Engineer |
| **Level** | SDE-2 (Senior) |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/linkedin-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 2 Technical + 1 Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** LinkedIn heavily tests graph algorithms and system design around social networks

---

## Round 1: Phone Screen — DSA
**Duration:** 45 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Can Attend All Meetings** (LeetCode 252) + **Minimum Meeting Rooms** (LeetCode 253)
2. **Number of Connected Components in Undirected Graph** (LeetCode 323)

### 💡 Interview-Ready Answer — Meeting Rooms II

```java
public int minMeetingRooms(int[][] intervals) {
    int n = intervals.length;
    int[] starts = new int[n];
    int[] ends = new int[n];
    
    for (int i = 0; i < n; i++) {
        starts[i] = intervals[i][0];
        ends[i] = intervals[i][1];
    }
    
    Arrays.sort(starts);
    Arrays.sort(ends);
    
    int rooms = 0, maxRooms = 0;
    int s = 0, e = 0;
    
    while (s < n) {
        if (starts[s] < ends[e]) {
            rooms++;
            maxRooms = Math.max(maxRooms, rooms);
            s++;
        } else {
            rooms--;
            e++;
        }
    }
    return maxRooms;
}
```

**Alternative: Priority Queue approach**
```java
public int minMeetingRooms_PQ(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // sort by start
    PriorityQueue<Integer> pq = new PriorityQueue<>(); // min-heap of end times
    
    for (int[] interval : intervals) {
        if (!pq.isEmpty() && pq.peek() <= interval[0]) {
            pq.poll(); // reuse room — previous meeting ended
        }
        pq.offer(interval[1]);
    }
    return pq.size();
}
```

### 💡 Interview-Ready Answer — Connected Components

```java
// Union-Find approach (optimal for dynamic connectivity)
class UnionFind {
    int[] parent, rank;
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
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        components--;
        return true;
    }
}

public int countComponents(int n, int[][] edges) {
    UnionFind uf = new UnionFind(n);
    for (int[] edge : edges) uf.union(edge[0], edge[1]);
    return uf.components;
}
```

---

## Round 2: Technical — DSA + Design Discussion
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design a "People You May Know" recommendation algorithm**
2. **Shortest Path in Social Network** (BFS on graph)
3. **All Paths From Source to Target** (LeetCode 797)

### 💡 Interview-Ready Answer — People You May Know

```java
class PeopleYouMayKnow {
    Map<Integer, Set<Integer>> adjacencyList; // userId → friends
    
    // Core algorithm: 2nd-degree connections ranked by mutual friend count
    List<Integer> recommend(int userId, int limit) {
        Set<Integer> friends = adjacencyList.getOrDefault(userId, Collections.emptySet());
        
        // Count mutual friends for 2nd-degree connections
        Map<Integer, Integer> mutualFriendCount = new HashMap<>();
        
        for (int friend : friends) {
            for (int friendOfFriend : adjacencyList.getOrDefault(friend, Collections.emptySet())) {
                // Skip if already a friend or self
                if (friendOfFriend == userId || friends.contains(friendOfFriend)) continue;
                mutualFriendCount.merge(friendOfFriend, 1, Integer::sum);
            }
        }
        
        // Rank by mutual friend count (descending), then by ID for tiebreaking
        return mutualFriendCount.entrySet().stream()
            .sorted((a, b) -> b.getValue() - a.getValue())
            .limit(limit)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
    
    // Enhanced scoring with multiple signals
    double score(int userId, int candidateId, Set<Integer> userFriends) {
        Set<Integer> candidateFriends = adjacencyList.getOrDefault(candidateId, Collections.emptySet());
        
        // 1. Mutual friends (strongest signal)
        long mutualCount = userFriends.stream()
            .filter(candidateFriends::contains).count();
        
        // 2. Same company/school (from profile data)
        double companyBoost = sameCompany(userId, candidateId) ? 2.0 : 0;
        double schoolBoost = sameSchool(userId, candidateId) ? 1.5 : 0;
        
        // 3. Location proximity
        double locationBoost = sameCity(userId, candidateId) ? 1.0 : 0;
        
        // 4. Industry overlap
        double industryBoost = sameIndustry(userId, candidateId) ? 0.5 : 0;
        
        return mutualCount * 3.0 + companyBoost + schoolBoost + locationBoost + industryBoost;
    }
}
```

### 💡 Interview-Ready Answer — All Paths Source to Target

```java
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
    
    for (int neighbor : graph[node]) {
        path.add(neighbor);
        dfs(graph, neighbor, target, path, result);
        path.remove(path.size() - 1); // backtrack
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design LinkedIn's Notification System**
   - Push, email, in-app notifications. Real-time delivery. User preferences. High fanout.

### 💡 Interview-Ready Answer

#### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                   Event Producers                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Feed     │  │ Message  │  │ Job      │  │ Connection│   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼────────────┼──────────┘
        │              │              │            │
        ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              Apache Kafka (Event Bus)                         │
│  Topics: post-events, message-events, job-events,            │
│          connection-events, endorsement-events                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│            Notification Processing Pipeline                    │
│                                                                │
│  ┌──────────────────┐                                         │
│  │  Event Router    │─── Determine notification type          │
│  │  (Kafka Consumer)│    and recipients                       │
│  └─────────┬────────┘                                         │
│            │                                                   │
│            ▼                                                   │
│  ┌──────────────────┐                                         │
│  │  Preference      │─── Check user's notification settings   │
│  │  Filter          │    (email? push? in-app? frequency?)    │
│  └─────────┬────────┘                                         │
│            │                                                   │
│            ▼                                                   │
│  ┌──────────────────┐                                         │
│  │  Aggregation     │─── Group: "7 people viewed your profile"│
│  │  Engine          │    instead of 7 separate notifications  │
│  └─────────┬────────┘                                         │
│            │                                                   │
│            ▼                                                   │
│  ┌──────────────────┐                                         │
│  │  Priority +      │─── Important: messages > reactions      │
│  │  Rate Limiter    │    Max 5 push per hour per user         │
│  └─────────┬────────┘                                         │
│            │                                                   │
│  ┌─────────┼──────────────────────┐                           │
│  ▼         ▼                      ▼                           │
│ ┌────┐  ┌──────────┐  ┌───────────────┐                     │
│ │Push│  │  Email    │  │  In-App       │                     │
│ │APNS│  │  Queue    │  │  (WebSocket)  │                     │
│ │FCM │  │  (SES)    │  │              │                     │
│ └────┘  └──────────┘  └───────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

#### Notification Aggregation
```java
class NotificationAggregator {
    // Key: (userId, eventType, targetEntityId)
    // Example: (user123, "profile_view", user123) → aggregate last 1 hour
    
    private final Map<String, AggregationBucket> buckets = new ConcurrentHashMap<>();
    
    static class AggregationBucket {
        String userId;
        String eventType;
        List<String> actorIds = new ArrayList<>();
        long firstEventTime;
        long lastEventTime;
        
        String compose() {
            if (actorIds.size() == 1) return actorIds.get(0) + " viewed your profile";
            if (actorIds.size() == 2) return actorIds.get(0) + " and " + actorIds.get(1) + " viewed your profile";
            return actorIds.get(0) + " and " + (actorIds.size() - 1) + " others viewed your profile";
        }
    }
    
    void addEvent(NotificationEvent event) {
        String key = event.recipientId + ":" + event.type + ":" + event.targetId;
        
        buckets.compute(key, (k, bucket) -> {
            if (bucket == null || isExpired(bucket)) {
                bucket = new AggregationBucket();
                bucket.userId = event.recipientId;
                bucket.eventType = event.type;
                bucket.firstEventTime = System.currentTimeMillis();
            }
            bucket.actorIds.add(event.actorId);
            bucket.lastEventTime = System.currentTimeMillis();
            return bucket;
        });
    }
    
    // Flush buckets periodically (every 5 minutes) → send aggregated notifications
}
```

#### High Fanout — "Elon Musk posts on LinkedIn"
```
Problem: Elon Musk has 35M followers. One post → 35M notifications?

Solution: Hybrid push/pull model
- Users with < 10K followers: fan-out on write (push notification to each follower)
- Users with > 10K followers: fan-out on read (write to "celebrity posts" store, 
  followers pull when they open the app)

For push notifications specifically:
- Tier 1 (immediate): Close connections, people who engage with poster → push
- Tier 2 (batched): Moderate connections → batch in hourly digest
- Tier 3 (no push): Weak connections → only show in feed, no notification
```

---

## Round 4: Hiring Manager
**Duration:** 45 minutes | **Interviewer:** Engineering Director

### Questions Asked
1. **"Describe your biggest technical failure and what you learned"**
2. **"How do you handle disagreements with product managers?"**
3. **"What's your approach to technical debt?"**

### 💡 Interview-Ready Answer — Handling Technical Debt

**Framework: The 20/80 Debt Budget**

**Situation:** Inherited a codebase with 40% test coverage, no CI/CD, and 3 critical services running on deprecated frameworks. Product team wanted 100% feature velocity.

**Task:** Convince leadership to invest in tech debt while maintaining feature delivery.

**Action:**
1. **Quantified the cost:** "Last quarter, 30% of our sprint capacity was spent on hotfixes caused by untested code paths. That's 6 engineer-weeks wasted."
2. **Proposed the 20/80 model:** 20% of each sprint dedicated to tech debt, 80% to features. Made it non-negotiable.
3. **Prioritized ruthlessly:** Not all debt is equal. Used a 2×2 matrix: Impact (high/low) vs Effort (high/low). Attacked high-impact/low-effort first.
4. **Made it visible:** Created a "Tech Health Dashboard" showing test coverage, build times, incident frequency, deployment frequency.
5. **Quick wins first:** Added CI/CD in week 1 (4 hours of work, massive impact). Added pre-commit hooks. Set up Dependabot.

**Result:** Over 6 months: test coverage 40% → 82%, incidents dropped 60%, deployment frequency went from weekly to 4x/day. Feature velocity actually increased because fewer interruptions from production issues.

---

## 🎯 Key Takeaways
- LinkedIn loves **graph algorithms** — BFS, connected components, shortest path in social network
- **"People You May Know"** is LinkedIn's signature product — know the algorithm cold
- **Notification system** design must handle aggregation, user preferences, and high-fanout celebrities
- **Union-Find** is essential for social network problems — practice with path compression
- LinkedIn values **"Members First"** (like Amazon's Customer Obsession) — frame everything around member value
- **Meeting Rooms** problem is a classic sweep-line — LinkedIn's most frequently asked DSA question

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Sweep Line, Union-Find |
| Round 2 | Medium-Hard | Graph Algorithms, Social Network Algo |
| Round 3 | Hard | Event-Driven, Aggregation, Fanout |
| Round 4 | Medium | Behavioral, Tech Debt, Leadership |
