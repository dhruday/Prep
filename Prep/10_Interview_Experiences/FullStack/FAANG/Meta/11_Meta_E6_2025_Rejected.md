# Meta — Staff Engineer FullStack Interview Experience (2025) — #11

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Staff Software Engineer |
| **Level** | E6 |
| **YOE** | 10 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (HC stage) |
| **Location** | Menlo Park, CA |
| **Source** | [Blind](https://www.teamblind.com/post/Meta-E6-Interview) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Phone Screen + 5 Onsite: 2 Coding + 2 System Design + Behavioral)

---

## Round 1: Coding — Alien Dictionary with Cycle Detection
**Duration:** 45 minutes

### Question: Given a sorted list of words in an alien language, derive the order of characters. Return empty string if invalid ordering exists.

```java
import java.util.*;

/**
 * Alien Dictionary — Topological Sort via Kahn's Algorithm (BFS).
 * 
 * 1. Compare adjacent words to build directed graph of char ordering.
 * 2. Topological sort (BFS with in-degree tracking).
 * 3. Detect cycles: if result doesn't contain all characters, cycle exists.
 * 
 * Time: O(C) where C = total characters across all words
 * Space: O(1) — at most 26 characters in graph
 */
class AlienDictionary {
    
    public String alienOrder(String[] words) {
        // Build adjacency list + in-degree map
        Map<Character, Set<Character>> adj = new HashMap<>();
        Map<Character, Integer> inDegree = new HashMap<>();
        
        // Initialize all characters
        for (String word : words) {
            for (char c : word.toCharArray()) {
                adj.putIfAbsent(c, new HashSet<>());
                inDegree.putIfAbsent(c, 0);
            }
        }
        
        // Compare adjacent words to extract ordering rules
        for (int i = 0; i < words.length - 1; i++) {
            String w1 = words[i];
            String w2 = words[i + 1];
            
            // Edge case: if w1 is prefix of w2, that's fine
            // But if w2 is prefix of w1, that's INVALID
            if (w1.length() > w2.length() && w1.startsWith(w2)) {
                return "";  // Invalid ordering
            }
            
            // Find first differing character
            int minLen = Math.min(w1.length(), w2.length());
            for (int j = 0; j < minLen; j++) {
                char c1 = w1.charAt(j);
                char c2 = w2.charAt(j);
                
                if (c1 != c2) {
                    // c1 comes before c2 in alien alphabet
                    if (!adj.get(c1).contains(c2)) {
                        adj.get(c1).add(c2);
                        inDegree.merge(c2, 1, Integer::sum);
                    }
                    break;  // Only first difference matters
                }
            }
        }
        
        // Kahn's algorithm: BFS topological sort
        Queue<Character> queue = new LinkedList<>();
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }
        
        StringBuilder result = new StringBuilder();
        while (!queue.isEmpty()) {
            char c = queue.poll();
            result.append(c);
            
            for (char neighbor : adj.get(c)) {
                int newDegree = inDegree.get(neighbor) - 1;
                inDegree.put(neighbor, newDegree);
                if (newDegree == 0) {
                    queue.offer(neighbor);
                }
            }
        }
        
        // Cycle check: if not all characters are in result, cycle exists
        if (result.length() != inDegree.size()) {
            return "";  // Cycle detected
        }
        
        return result.toString();
    }
}
```

---

## Round 2: System Design — Meta Threads (Twitter-like Social Platform)

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│                   Meta Threads Architecture                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Write Path (Post Creation)                                │   │
│  │                                                           │   │
│  │ Client → API Gateway → Post Service                       │   │
│  │   → Validate (text length, media, spam check)             │   │
│  │   → Store in Posts DB (graph DB or MySQL + sharding)      │   │
│  │   → Publish to Kafka topic: "post.created"                │   │
│  │                                                           │   │
│  │ Async Fanout (Kafka Consumer):                            │   │
│  │   → Fan-out Service:                                      │   │
│  │       Celebrities (>10K followers): pull model            │   │
│  │       Regular users: push to follower timelines           │   │
│  │   → Timeline Cache (Redis sorted set per user)            │   │
│  │       ZADD user:{uid}:timeline {timestamp} {post_id}      │   │
│  │       ZREMRANGEBYRANK (keep top 1000 posts)               │   │
│  │   → Notification Service                                  │   │
│  │   → Search Indexer (Elasticsearch)                        │   │
│  │   → Media Processing (transcode, thumbnails)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Read Path (Timeline)                                      │   │
│  │                                                           │   │
│  │ Client → API Gateway → Timeline Service                   │   │
│  │   1. Fetch from timeline cache (Redis ZREVRANGE)          │   │
│  │   2. For celebrity follows: merge their recent posts      │   │
│  │      (pull at read time from celebrity post cache)        │   │
│  │   3. Ranking Model:                                       │   │
│  │      - Engagement prediction (likes, replies, shares)     │   │
│  │      - User interest signal (past interactions)           │   │
│  │      - Recency decay factor                               │   │
│  │      - Diversity: avoid same-author clustering            │   │
│  │   4. Return ranked list with cursor for pagination        │   │
│  │                                                           │   │
│  │ Cursor-based pagination:                                  │   │
│  │   { "posts": [...], "next_cursor": "ts:1234567890" }      │   │
│  │   Client sends cursor to get next page                    │   │
│  │   Better than offset: consistent with new posts arriving  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Social Graph Service                                      │   │
│  │                                                           │   │
│  │ Graph DB (TAO-like):                                      │   │
│  │   Nodes: User, Post, Media                                │   │
│  │   Edges: follows, liked, replied_to, mentioned            │   │
│  │                                                           │   │
│  │ Cache: assoc_get(user_id, "follows") → [user_ids]         │   │
│  │   Invalidation: write-through on follow/unfollow          │   │
│  │                                                           │   │
│  │ Mutual follows optimization:                              │   │
│  │   Bidirectional edge for mutual follows                   │   │
│  │   Enables DM, close friends features                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Content Moderation Pipeline                               │   │
│  │                                                           │   │
│  │ Pre-publish:                                              │   │
│  │   - ML classifier: hate speech, spam, nudity              │   │
│  │   - Regex blocklist for known harmful patterns            │   │
│  │   - Image: PhotoDNA hash match for CSAM                   │   │
│  │   - If confidence > threshold → auto-reject               │   │
│  │   - If borderline → enqueue for human review              │   │
│  │                                                           │   │
│  │ Post-publish:                                             │   │
│  │   - User reports → priority review queue                  │   │
│  │   - Viral content (engagement spike) → re-check           │   │
│  │   - Appeals process with human reviewer                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Scale numbers:                                                 │
│  - 200M+ DAU, 1B+ posts/day, 50K+ posts/second peak           │
│  - Timeline read: 500K+ QPS, p99 < 200ms                      │
│  - Fan-out: hybrid push/pull threshold at 10K followers        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Meta E6 = **Alien Dictionary (topological sort) + Threads system design**
- **Alien Dictionary**: compare adjacent words → first differing char = edge → topological sort (Kahn's BFS)
- **Cycle detection**: if topological sort result length < total unique characters → cycle exists → return ""
- **Prefix check**: if w1 is longer and starts with w2, the ordering is INVALID — edge case many miss
- **Hybrid fanout**: push for regular users (< 10K followers), pull for celebrities — critical tradeoff
- **Cursor pagination**: `next_cursor: "ts:1234567890"` — consistent even when new posts arrive, unlike offset
- **TAO-like graph**: assoc_get for relationship queries — write-through cache invalidation on mutations
- **Rejection reason**: HC rejected despite strong interviews — Meta E6 requires "demonstrated cross-org impact" in packet
- Meta E6 = **highest coding bar + cross-team system design** — must show impact beyond your team

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA |
| Coding 1 | Hard | Topological Sort, Graph |
| System Design 1 | Very Hard | Social Platform, Feed Ranking |
| System Design 2 | Very Hard | (Content Moderation at scale) |
| Behavioral | Hard | Cross-org impact stories |
