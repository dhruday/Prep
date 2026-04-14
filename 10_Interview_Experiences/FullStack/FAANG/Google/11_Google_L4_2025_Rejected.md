# Google — SDE-2 FullStack Interview Experience (2025) — #11

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | L4 Software Engineer |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Search |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + System Design + Behavioral + Googleyness)
- **Rejection Reason:** HC rejected — insufficient Googleyness signal (collaboration/humility)

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Design an Autocomplete System** (Trie + Top K)
2. **Follow-up: How to handle real-time updates (trending queries)?**

### 💡 Autocomplete with Trie

```java
class AutocompleteSystem {
    private final TrieNode root;
    private TrieNode currNode;
    private StringBuilder currInput;
    
    AutocompleteSystem(String[] sentences, int[] times) {
        root = new TrieNode();
        currNode = root;
        currInput = new StringBuilder();
        
        for (int i = 0; i < sentences.length; i++) {
            insert(sentences[i], times[i]);
        }
    }
    
    private void insert(String sentence, int count) {
        TrieNode node = root;
        for (char c : sentence.toCharArray()) {
            node.children.putIfAbsent(c, new TrieNode());
            node = node.children.get(c);
            // Update top 3 at each prefix node
            updateTopK(node, sentence, count);
        }
        node.isEnd = true;
    }
    
    private void updateTopK(TrieNode node, String sentence, int count) {
        // Merge into node's top 3
        boolean found = false;
        for (var entry : node.topK) {
            if (entry.sentence.equals(sentence)) {
                entry.count += count;
                found = true;
                break;
            }
        }
        if (!found) {
            node.topK.add(new HotSentence(sentence, count));
        }
        
        // Sort: by count desc, then lexicographic asc
        node.topK.sort((a, b) -> a.count != b.count ? b.count - a.count : a.sentence.compareTo(b.sentence));
        
        // Keep only top 3
        if (node.topK.size() > 3) node.topK.remove(node.topK.size() - 1);
    }
    
    // Called for each character typed
    public List<String> input(char c) {
        if (c == '#') {
            // End of sentence — insert the completed query
            insert(currInput.toString(), 1);
            currInput = new StringBuilder();
            currNode = root;
            return List.of();
        }
        
        currInput.append(c);
        
        if (currNode == null || !currNode.children.containsKey(c)) {
            currNode = null; // No more suggestions
            return List.of();
        }
        
        currNode = currNode.children.get(c);
        return currNode.topK.stream().map(h -> h.sentence).toList();
    }
    
    static class TrieNode {
        Map<Character, TrieNode> children = new HashMap<>();
        List<HotSentence> topK = new ArrayList<>();
        boolean isEnd;
    }
    
    static class HotSentence {
        String sentence;
        int count;
        HotSentence(String s, int c) { sentence = s; count = c; }
    }
}
// Time per input: O(1) for suggestions (pre-computed), O(L * K log K) for insert
// Space: O(n * L) where n = sentences, L = avg length

// Follow-up: Real-time trending queries
// 1. Use time-decayed frequency: score = count * decay^(now - lastAccessed)
//    Queries from 1 hour ago weighted more than 1 day ago
// 2. Separate trending trie: populated from Kafka stream of search queries
//    Updated every minute (batch merge)
// 3. Final ranking = alpha * allTimePopularity + beta * trendingScore
// 4. Anti-abuse: rate limit per user, filter profanity, require min unique users
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Autocomplete (Search Suggestions)**

### 💡 Key Architecture Points

```
Google Search Autocomplete:
┌──────────────────────────────────────────────────────────────┐
│  Requirements:                                                │
│  - <50ms latency (user types fast, suggestions must keep up) │
│  - 8.5B searches/day → ~100K QPS for prefix queries          │
│  - Personalized: user's search history weighted higher        │
│  - Multi-language support                                    │
│  - Filtering: no offensive, no PII, no dangerous queries      │
│                                                                │
│  Architecture:                                                │
│  1. Offline Pipeline (Hadoop/Spark):                          │
│     - Input: search query logs (aggregate last 30 days)       │
│     - Process: count frequencies, apply time decay             │
│     - Output: prefix → top 10 completions (sorted)            │
│     - Store in Trie: serialized to SSTable format              │
│     - Size: ~millions of unique popular prefixes               │
│     - Update frequency: daily rebuild + hourly delta           │
│                                                                │
│  2. Serving:                                                   │
│     - Trie sharded by prefix range (a-f, g-m, n-s, t-z)      │
│     - Each shard: in-memory Trie on multiple servers           │
│     - Load balancer routes by first character of prefix        │
│     - Cache: browser cache (5 min TTL, ~80% hit rate)         │
│       + CDN cache (edge region, 1 min TTL)                    │
│       + Application cache (Memcached, 5 min TTL)              │
│                                                                │
│  3. Personalization:                                           │
│     - User's recent searches: stored in session cookie/Redis  │
│     - Merge: global_suggestions ∪ personal_suggestions         │
│     - Ranking: score = 0.7 * global_pop + 0.3 * personal_rel │
│                                                                │
│  4. Real-time Trending:                                        │
│     - Twitter-like trending detection:                        │
│       Moving average of query frequency per window (5 min)    │
│       If current_count > 2x * moving_avg → trending           │
│     - Inject trending queries into suggestions                │
│     - Example: "earthquake" spikes → add to autocomplete      │
│       within minutes (not wait for daily rebuild)              │
│                                                                │
│  5. Filtering:                                                 │
│     - Blocklist: pre-filtered offensive terms                 │
│     - Legal: removed per court orders (DMCA, right to forget) │
│     - Dangerous: self-harm queries → show helpline instead    │
│                                                                │
│  Optimization:                                                 │
│  - Client-side debounce: only send after 200ms of no typing  │
│  - Request dedup: cancel previous in-flight request           │
│  - Trie compression: merge nodes with single child            │
│  - Prefix cache at browser: "how" response includes "how to", │
│    "how are", "how old" → client filters locally for          │
│    "how t" without new request                                │
│                                                                │
│  Scale: ~100K QPS prefix queries, <50ms P99                   │
│  Caching reduces server load by 90%+ (most prefixes repeat)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Google L4 = **pure algorithm + system design + Googleyness** — all must be strong
- **Autocomplete Trie**: pre-compute top-K at each node — O(1) lookup per character
- **Time-decayed frequency**: recent queries weighted more — `score = count * decay^age`
- **Prefix cache trick**: "how" response includes all "how *" completions → client filters locally
- **Trie sharding**: by prefix range → each shard fits in memory
- Google **HC rejection** for Googleyness = collaboration, humility, thought process
  - Tip: think out loud, discuss alternatives, don't be defensive about your approach
- **Trending detection**: moving average comparison — if current > 2x average → trending

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Hard | Trie, Auto-Complete, Top K |
| System Design | Very Hard | Autocomplete at Scale, Sharding, Trending |
| Behavioral | Medium | Googleyness, Collaboration |
| Coding 2 | Medium | Graph, BFS |
