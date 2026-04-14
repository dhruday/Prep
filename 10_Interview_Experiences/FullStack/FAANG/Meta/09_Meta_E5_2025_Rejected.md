# Meta — E5 FullStack Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Senior Software Engineer E5 |
| **Level** | E5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Rejection Reason** | System design: didn't address cache invalidation at scale adequately |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Coding + System Design + Behavioral)

---

## Round 1: Coding
**Duration:** 40 minutes

### Questions Asked
1. **Accounts Merge** (LeetCode 721) — Union-Find on email addresses
2. **Follow-up: Can you make Union-Find both path compression AND union by rank?**

### 💡 Accounts Merge with Union-Find

```java
List<List<String>> accountsMerge(List<List<String>> accounts) {
    // Union-Find: group emails that belong to the same person
    Map<String, String> parent = new HashMap<>();  // email → parent email
    Map<String, Integer> rank = new HashMap<>();
    Map<String, String> emailToName = new HashMap<>(); // email → account name
    
    // Initialize: each email is its own parent
    for (List<String> account : accounts) {
        String name = account.get(0);
        for (int i = 1; i < account.size(); i++) {
            parent.putIfAbsent(account.get(i), account.get(i));
            rank.putIfAbsent(account.get(i), 0);
            emailToName.put(account.get(i), name);
        }
    }
    
    // Union: connect all emails in the same account
    for (List<String> account : accounts) {
        String firstEmail = account.get(1);
        for (int i = 2; i < account.size(); i++) {
            union(parent, rank, firstEmail, account.get(i));
        }
    }
    
    // Group emails by their root parent
    Map<String, TreeSet<String>> groups = new HashMap<>();
    for (String email : parent.keySet()) {
        String root = find(parent, email);
        groups.computeIfAbsent(root, k -> new TreeSet<>()).add(email);
    }
    
    // Build result
    List<List<String>> result = new ArrayList<>();
    for (var entry : groups.entrySet()) {
        List<String> merged = new ArrayList<>();
        merged.add(emailToName.get(entry.getKey())); // Name first
        merged.addAll(entry.getValue()); // Sorted emails
        result.add(merged);
    }
    
    return result;
}

String find(Map<String, String> parent, String x) {
    if (!parent.get(x).equals(x)) {
        parent.put(x, find(parent, parent.get(x))); // Path compression
    }
    return parent.get(x);
}

void union(Map<String, String> parent, Map<String, Integer> rank, String x, String y) {
    String rootX = find(parent, x);
    String rootY = find(parent, y);
    
    if (rootX.equals(rootY)) return;
    
    // Union by rank
    if (rank.get(rootX) < rank.get(rootY)) {
        parent.put(rootX, rootY);
    } else if (rank.get(rootX) > rank.get(rootY)) {
        parent.put(rootY, rootX);
    } else {
        parent.put(rootY, rootX);
        rank.merge(rootX, 1, Integer::sum);
    }
}
// Time: O(N * α(N)) ≈ O(N) where N = total emails across all accounts
// Space: O(N)
// TreeSet for sorted output within each group
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Facebook's Social Graph** (friend relationships, recommendations, privacy)
   - Add/remove friends, friend requests
   - PYMK (People You May Know) — mutual friend based
   - Privacy: profile visibility by relationship depth
   - Scale: 3 billion users, 400 billion friend edges
   - Graph queries: mutual friends, degrees of separation

### 💡 Key Design

```
Architecture:
┌──────────────────────────────────────────────────────┐
│                   API Gateway / GraphQL               │
│    queries: friends, mutualFriends, pymk, profile     │
└──────────┬───────────────────────────────────────────┘
           │
  ┌────────┼──────────────────────────┐
  │        │                          │
┌─▼──────┐ ┌▼─────────────┐  ┌──────▼──────┐
│ Social  │ │ PYMK          │  │ Privacy     │
│ Graph   │ │ Recommendation│  │ Service     │
│ Service │ │ Service       │  │             │
└──┬──────┘ └──┬───────────┘  └─────────────┘
   │           │
┌──▼──────────▼─────────────────────────────────────┐
│                  TAO (The Associations and Objects) │
│                  Meta's Graph Cache Layer            │
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐ │
│  │ Leader Cache         │  │ Follower Cache       │ │
│  │ (writes go here)     │  │ (reads served here)  │ │
│  │ 1 per shard          │  │ N per shard          │ │
│  └──────────┬──────────┘  └──────────────────────┘ │
│             │ async replicate                        │
│  ┌──────────▼──────────────────────────────────────┐│
│  │                  MySQL Shards                    ││
│  │  Shard key: user_id % N                         ││
│  │  Tables: objects (users), associations (edges)  ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘

TAO Data Model:
// Objects: users, pages, groups, posts, photos
class TAOObject {
    long id;          // 64-bit globally unique
    String type;      // "user", "page", "group"
    Map<String, String> data; // Key-value properties
    long version;     // Monotonically increasing
}

// Associations (edges): friend, like, member_of, tagged_in
class TAOAssociation {
    long id1;         // Source object
    String atype;     // "friend", "like", "member_of"
    long id2;         // Target object
    long time;        // Creation time (used for ordering)
    Map<String, String> data; // Edge properties
}

// Queries:
// 1. Get friends of user X: assoc_get(X, "friend") → list of (user_id, time)
// 2. Friend count: assoc_count(X, "friend") → integer
// 3. Mutual friends of X,Y: assoc_get(X, "friend") ∩ assoc_get(Y, "friend")
// 4. Check friendship: assoc_get(X, "friend", Y) → exists?

TAO Cache Architecture:
class TAOCache {
    // Leader cache: handles ALL writes, ensures consistency
    // Follower caches: handle reads, async replicated from leader
    // Why not just use Memcached? 
    //   TAO understands the graph structure → smarter invalidation
    
    // Write path: Client → Leader → MySQL → async → Followers
    void addAssociation(long id1, String atype, long id2) {
        // 1. Write to MySQL shard (determined by id1)
        mysql.insert("associations", id1, atype, id2, System.currentTimeMillis());
        
        // 2. Invalidate/update leader cache
        leaderCache.invalidate(new CacheKey(id1, atype));
        leaderCache.invalidate(new CacheKey(id2, atype)); // Bidirectional
        
        // 3. Async: send invalidation to follower caches
        for (FollowerCache follower : followers) {
            invalidationQueue.send(follower, new CacheKey(id1, atype));
            invalidationQueue.send(follower, new CacheKey(id2, atype));
        }
    }
    
    // Read path: Client → Follower → (cache miss) → MySQL
    List<Long> getFriends(long userId) {
        CacheKey key = new CacheKey(userId, "friend");
        List<Long> cached = followerCache.get(key);
        
        if (cached != null) return cached; // Cache hit (~99.8% hit rate)
        
        // Cache miss: read from MySQL
        List<Long> friends = mysql.query(
            "SELECT id2 FROM associations WHERE id1=? AND atype='friend' ORDER BY time DESC",
            userId
        );
        
        followerCache.put(key, friends); // Fill cache
        return friends;
    }
}

PYMK (People You May Know):
class PYMKService {
    // Offline pipeline: precompute PYMK candidates daily
    // Online: serve from precomputed cache + real-time adjustments
    
    List<UserSuggestion> getPYMK(long userId) {
        // 1. Get from precomputed cache (Hadoop job, updated daily)
        List<UserSuggestion> cached = pymkCache.get(userId);
        
        if (cached == null) {
            // Real-time fallback: mutual friend count
            cached = computeRealtime(userId);
        }
        
        // 2. Filter: remove blocked users, already-sent requests, rejected requests
        cached = filterExcluded(userId, cached);
        
        // 3. Re-rank: boost by recent interactions, common groups, location proximity
        cached = rerank(userId, cached);
        
        return cached.subList(0, Math.min(20, cached.size()));
    }
    
    // Precomputation (MapReduce on friend graph):
    // For each user U:
    //   for each friend F of U:
    //     for each friend FF of F:
    //       if FF ≠ U and FF not friend of U:
    //         candidate[FF] += 1 (mutual friend count)
    //   Sort candidates by mutual friend count → top 100 → store in cache
    
    // Time complexity: O(average_friends²) per user
    // Facebook median: ~200 friends → 200² = 40K operations per user
    // 3B users × 40K = 120 trillion → but highly parallelizable on MapReduce
}

Privacy Model:
// Audience selector per field:
// - Public: anyone
// - Friends: direct friends only
// - Friends of Friends: 2-hop in graph
// - Only Me: owner only
// - Custom: specific friend lists

class PrivacyService {
    boolean canView(long viewerId, long profileOwnerId, String field) {
        PrivacySetting setting = getPrivacySetting(profileOwnerId, field);
        
        switch (setting.audience) {
            case PUBLIC: return true;
            case ONLY_ME: return viewerId == profileOwnerId;
            case FRIENDS: return areFriends(viewerId, profileOwnerId);
            case FRIENDS_OF_FRIENDS:
                return areFriends(viewerId, profileOwnerId) ||
                       !getMutualFriends(viewerId, profileOwnerId).isEmpty();
            case CUSTOM: return setting.allowedLists.stream()
                .anyMatch(list -> list.contains(viewerId));
            default: return false;
        }
    }
}
```

---

## 🎯 Key Takeaways
- Meta E5 = **Accounts Merge (Union-Find) + Social Graph + TAO Cache + Privacy**
- **Union-Find with path compression + union by rank**: amortized α(N) ≈ O(1) per operation
- **TAO**: Meta's graph-aware cache layer → leader/follower architecture, 99.8% hit rate
- **Leader writes**: ensures no stale reads from cache; async replication to followers
- **PYMK**: precomputed daily via MapReduce (mutual friend counting), real-time fallback
- **Privacy**: per-field audience selector, evaluated at read-time using graph queries
- **Cache invalidation**: TAO understands bidirectional edges → invalidates both sides on write
- Meta rejection: cache invalidation at scale was the weak point — need to explain TAO's design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium-Hard | Accounts Merge, Union-Find |
| Coding 2 | Medium | Arrays/Strings |
| System Design | Very Hard | Social Graph, TAO, PYMK |
| Behavioral | Medium | Meta Values |
