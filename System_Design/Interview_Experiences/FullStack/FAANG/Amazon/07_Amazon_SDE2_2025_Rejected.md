# Amazon — SDE-2 FullStack Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 |
| **Level** | L5 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/amazon-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + Bar Raiser)
- **Rejection Reason:** Bar Raiser — LP stories weren't strong enough for "Disagree and Commit"
- **Timeline:** 2 weeks

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Minimum Moves to Equal Array Elements II** (LeetCode 462)
2. **Design a Package Version Resolver** (Topological sort with constraints)

### 💡 Minimum Moves (Median is optimal)

```java
public int minMoves2(int[] nums) {
    Arrays.sort(nums);
    int median = nums[nums.length / 2]; // Median minimizes sum of absolute differences
    
    int moves = 0;
    for (int num : nums) {
        moves += Math.abs(num - median);
    }
    return moves;
}
// Time: O(n log n), Space: O(1)

// Without sorting — O(n) with QuickSelect:
public int minMoves2Optimal(int[] nums) {
    int median = quickSelect(nums, 0, nums.length - 1, nums.length / 2);
    int moves = 0;
    for (int num : nums) moves += Math.abs(num - median);
    return moves;
}

private int quickSelect(int[] nums, int lo, int hi, int k) {
    while (lo < hi) {
        int pivot = partition(nums, lo, hi);
        if (pivot == k) return nums[k];
        else if (pivot < k) lo = pivot + 1;
        else hi = pivot - 1;
    }
    return nums[lo];
}
```

---

## Round 2: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Serialize and Deserialize N-ary Tree** (LeetCode 428)
2. **Follow-up: Make it compact (minimize serialized size)**

### 💡 Interview-Ready Answer

```java
class Codec {
    // Format: val(child1,child2,...) — parenthesis-based
    // e.g., "1(3(5,6),2,4)" for:
    //        1
    //      / | \
    //     3  2  4
    //    / \
    //   5   6
    
    public String serialize(Node root) {
        if (root == null) return "";
        
        StringBuilder sb = new StringBuilder();
        serializeDFS(root, sb);
        return sb.toString();
    }
    
    private void serializeDFS(Node node, StringBuilder sb) {
        sb.append(node.val);
        
        if (node.children != null && !node.children.isEmpty()) {
            sb.append('(');
            for (int i = 0; i < node.children.size(); i++) {
                if (i > 0) sb.append(',');
                serializeDFS(node.children.get(i), sb);
            }
            sb.append(')');
        }
    }
    
    public Node deserialize(String data) {
        if (data == null || data.isEmpty()) return null;
        
        int[] idx = {0}; // Mutable index
        return deserializeDFS(data, idx);
    }
    
    private Node deserializeDFS(String data, int[] idx) {
        // Parse value
        int start = idx[0];
        while (idx[0] < data.length() && data.charAt(idx[0]) != '(' && 
               data.charAt(idx[0]) != ')' && data.charAt(idx[0]) != ',') {
            idx[0]++;
        }
        
        int val = Integer.parseInt(data.substring(start, idx[0]));
        Node node = new Node(val, new ArrayList<>());
        
        // Parse children if '(' follows
        if (idx[0] < data.length() && data.charAt(idx[0]) == '(') {
            idx[0]++; // Skip '('
            
            while (data.charAt(idx[0]) != ')') {
                if (data.charAt(idx[0]) == ',') idx[0]++; // Skip ','
                node.children.add(deserializeDFS(data, idx));
            }
            
            idx[0]++; // Skip ')'
        }
        
        return node;
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Amazon's Product Search System**
   - Typeahead, faceted search, relevance ranking, spell correction

### 💡 Interview-Ready Answer

```
Amazon Product Search:
┌──────────────────────────────────────────────────────────────┐
│  Typeahead / Autocomplete:                                    │
│  - Trie-based: pre-computed top suggestions per prefix       │
│  - Storage: Redis sorted set {prefix → [suggestions]}       │
│  - Update: daily batch from search logs (popularity-weighted)│
│  - Response time: <50ms (critical for UX)                    │
│  - Personalization: boost categories user frequently buys    │
│                                                                │
│  Full-Text Search:                                            │
│  - Elasticsearch cluster (sharded by product category)       │
│  - Index fields: title, description, brand, category, specs  │
│  - Analyzers: lowercase, stemming, stop words, synonyms      │
│  - Tokenizer: edge_ngram for partial matching                │
│                                                                │
│  Faceted Search:                                              │
│  - Facets: price range, brand, rating, Prime eligible,       │
│    department, color, size                                    │
│  - Pre-aggregated counts per facet value                     │
│  - Dynamic facets: only show relevant facets for category    │
│  - ES aggregations: terms, range, filters                    │
│                                                                │
│  Relevance Ranking:                                           │
│  Score = Σ(wi * feature_i):                                  │
│  - Text relevance (BM25 from ES)                    w=0.3   │
│  - Sales velocity (orders/day)                      w=0.2   │
│  - Rating × review_count                            w=0.15  │
│  - Price competitiveness                            w=0.1   │
│  - Prime eligible                                   w=0.1   │
│  - Conversion rate                                  w=0.1   │
│  - Recency (new products boost)                     w=0.05  │
│                                                                │
│  Spell Correction:                                            │
│  - Edit distance (Levenshtein): max 2 edits                 │
│  - Phonetic: Soundex/Metaphone for similar-sounding words    │
│  - "Did you mean": show if corrected query has 10x results  │
│  - Popular misspellings: pre-computed mapping in Redis       │
│    e.g., "iphone" → "iPhone", "samsnug" → "Samsung"         │
│                                                                │
│  Architecture:                                                │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ API GW    │─▶│ Search Service│─▶│ Elasticsearch    │       │
│  │           │  │              │  │ (query + filter) │       │
│  │ Rate limit│  │ Query Parser │  │                  │       │
│  │ Auth      │  │ Spell Check  │  │ Product Index    │       │
│  │           │  │ Personalize  │  │ 500M+ products   │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                       │                                      │
│               ┌───────▼────────┐                             │
│               │ ML Re-Ranker    │                             │
│               │ (personalized   │                             │
│               │  ranking model) │                             │
│               └────────────────┘                              │
│                                                                │
│  Scale:                                                       │
│  - 500M+ products indexed                                    │
│  - 100K+ searches per second at peak                         │
│  - P99 latency: <200ms (search), <50ms (typeahead)          │
│  - ES cluster: 1000+ nodes, 50TB+ index size                │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Bar Raiser (LP-Heavy)
**Duration:** 60 minutes

### Questions Asked
1. **Tell me about a time you disagreed with your manager** (Disagree and Commit)
2. **Describe your biggest technical failure** (Learn and Be Curious)
3. **How do you prioritize when you have conflicting requests from two teams?** (Customer Obsession + Bias for Action)

### 💡 Where I Failed (Weak STAR)

**Q1 — Disagree and Commit (MY WEAK ANSWER):**
- I said "I disagreed about using MongoDB and preferred PostgreSQL"
- **Why it failed:** Too technical, no customer impact, no business metrics
- **Better answer should have:** customer pain point → data-backed argument → escalation → commit fully when overruled → measure outcome

**Q1 — IMPROVED ANSWER:**
- **Situation:** PM wanted to skip load testing for Prime Day feature because timeline was tight.
- **Task:** As tech lead, I believed skipping testing would risk customer orders failing during peak.
- **Action:** Gathered data: last Prime Day had 3x traffic spike, estimated $2M revenue at risk. Proposed compromise: automated load test suite that takes 2 days to build but runs in 1 hour. Presented ROI to PM and engineering director. PM still wanted to skip. I formally documented my concerns in an email, then committed fully — helped the team ship on time while I built the load test in parallel evenings.
- **Result:** Found critical DB connection pool exhaustion at 2x load. Fixed it 3 days before Prime Day. Zero downtime during peak. PM acknowledged the test was worth it, and load testing became mandatory for all major launches.

---

## 🎯 Key Takeaways
- Amazon SDE-2 Bar Raiser = **LP stories matter as much as technical skills**
- I **got rejected on LP, not coding** — your STAR stories must have: customer impact + metrics + data
- **N-ary tree serialization** with parenthesis format is compact and parseable
- **Product Search** = Elasticsearch + Trie typeahead + faceted search + ML re-ranker
- **Spell correction** = edit distance + phonetic matching + pre-computed popular misspellings
- Amazon LP: "Disagree and Commit" ≠ "I disagreed about tech choice" → needs business impact
- Prepare **at least 8 LP stories** covering all 16 principles, with quantifiable results

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Math (Median), Topological Sort |
| DSA | Medium-Hard | Tree Serialization, N-ary Tree |
| System Design | Hard | Product Search, ES, Ranking |
| Bar Raiser | Very Hard | Leadership Principles, STAR |
