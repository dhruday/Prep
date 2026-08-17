# HashMaps — Frequency Maps and Two-Sum Variants
> Part 17 — DSA for Full Stack Interviews
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **HashMap = O(1) lookup, insert, delete** on average (amortized); backed by an array with a hash function mapping keys to bucket indices; worst case O(n) if all keys hash to the same bucket (nearly impossible with Java's implementation)
- **Frequency map pattern**: count occurrences of each element in one pass; use `map.getOrDefault(key, 0) + 1`; reduces "find most frequent", "check if anagram", "group anagrams" to O(n)
- **Two Sum with HashMap**: one pass — store each number's index in the map as you scan; for each number, check if `target - num` already exists in the map; O(n) time, O(n) space vs O(n log n) for sort + two-pointer
- **Sliding window + frequency map**: the "at most k distinct characters" / "minimum window substring" variants use a char frequency map to track window validity; shrink window when constraint is violated
- **Java HashMap vs LinkedHashMap vs TreeMap**: HashMap = O(1) no order; LinkedHashMap = O(1) insertion order maintained (used in LRU cache); TreeMap = O(log n) sorted by key (used when you need range queries or floor/ceiling)
- **Common interview mistake**: using `==` to compare Integer keys from a HashMap; Java caches Integer objects only for values -128 to 127; use `.equals()` always, or unbox with `int`

---

## 1. One-Line Definition
HashMap problems are solved by trading O(n) space for O(n) time — storing what you've already seen, what you need to find, or how many times something appeared, so each element is processed in O(1) instead of searching through everything already seen.

---

## 2. The Problem It Solves

An online store needs to find the first product ID that appears more than once in a list of millions of cart events. Naive: for each ID, scan the entire array from the start — O(n²). With a HashSet: one scan, record every ID seen; if the current ID is already in the set, return it — O(n).

This is the core HashMap trade-off: you spend memory to gain speed. In a product context:
- "Find the top 3 most frequently added products today" → frequency map in one pass
- "Check if two product descriptions are anagrams of each other" → frequency map compare
- "Find two products whose prices sum to a promotion target" → two-sum with HashMap
- "Track active user sessions by session ID" → HashMap for O(1) lookup/deletion

---

## 3. How It Works Internally

### Java HashMap — Bucket + Linked List / Tree

```
map.put("orderId", 99)

1. hash("orderId") = hashCode % bucket_array_size → bucket index, say 7
2. If bucket[7] is empty: create entry node [key="orderId", value=99, next=null]
3. If bucket[7] has a collision: append to linked list (or red-black tree if list > 8 nodes)
4. If load factor (size/capacity) > 0.75: resize array to 2x, rehash all entries

map.get("orderId")
1. hash("orderId") → bucket index 7
2. Walk linked list in bucket 7, compare keys with .equals()
3. Return value when key matches → O(1) average, O(n) worst case (all in same bucket)
```

### Two Sum — Visual

```
nums = [2, 7, 11, 15], target = 9
map = {}

i=0: num=2, complement=9-2=7, 7 not in map → put {2: 0}
i=1: num=7, complement=9-7=2, 2 IS in map at index 0 → return [0, 1] ✓
```

---

## 4. The Code

### Wrong Way — O(n²) Nested or Wrong Equality Check

```java
// ❌ WRONG 1: O(n²) brute force — naive Two Sum

public int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {           // O(n)
        for (int j = i + 1; j < nums.length; j++) {   // O(n) inner loop = O(n²) total
            if (nums[i] + nums[j] == target) {
                return new int[]{i, j};
            }
        }
    }
    return new int[]{};
}
// Fine for 100 elements; TLEs on 10,000+ elements
```

```java
// ❌ WRONG 2: Integer comparison with == (the classic Java trap)

Map<Integer, Integer> map = new HashMap<>();
map.put(200, 5);

Integer key = 200;
if (map.get(key) == 5) {              // ❌ Compares references for Integer > 127
    System.out.println("Found it");   // FAILS for values outside -128..127 cache range
}
// Java caches Integer objects only for -128 to 127
// Integer.valueOf(127) == Integer.valueOf(127)  → TRUE (cached)
// Integer.valueOf(200) == Integer.valueOf(200)  → FALSE (different objects)
// Always use .equals() or unbox to int:
// map.get(key).equals(5)   ← correct
// map.get(key) == 5        ← WRONG for Integer values outside cache range
```

```java
// ❌ WRONG 3: NullPointerException on frequency map

Map<String, Integer> freq = new HashMap<>();
String[] words = {"apple", "banana", "apple"};

for (String w : words) {
    // ❌ freq.get(w) returns null on first encounter
    // null + 1 throws NullPointerException
    freq.put(w, freq.get(w) + 1);
}
```

### Right Way — Clean HashMap Templates

```java
// ✅ TWO SUM — One-pass HashMap, O(n) time O(n) space

public int[] twoSum(int[] nums, int target) {
    // ✅ Map: value → index (we want the index when we find the complement)
    Map<Integer, Integer> seen = new HashMap<>();
    
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        
        if (seen.containsKey(complement)) {
            // ✅ Found! complement was seen at a previous index
            return new int[]{seen.get(complement), i};
        }
        
        // ✅ Store current number's index for future complement lookups
        seen.put(nums[i], i);
    }
    
    return new int[]{};  // problem guarantees a solution; this line unreachable
}
// Time: O(n), Space: O(n)
```

```java
// ✅ FREQUENCY MAP — Count occurrences safely

public Map<String, Integer> frequencyMap(String[] words) {
    Map<String, Integer> freq = new HashMap<>();
    
    for (String word : words) {
        // ✅ getOrDefault returns 0 when key not found — no NPE, no null check
        freq.put(word, freq.getOrDefault(word, 0) + 1);
        
        // Alternative in Java 8+:
        // freq.merge(word, 1, Integer::sum);
        // ↑ If key absent, puts 1. If present, applies (oldValue, 1) → oldValue + 1
    }
    return freq;
}

// ✅ Top K Frequent Elements using frequency map + sort
public List<String> topK(String[] words, int k) {
    Map<String, Integer> freq = frequencyMap(words);
    
    return freq.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder())
            .thenComparing(Map.Entry.comparingByKey()))  // lexicographic tiebreak
        .limit(k)
        .map(Map.Entry::getKey)
        .collect(Collectors.toList());
}
```

```java
// ✅ GROUP ANAGRAMS — Sort key as HashMap key

public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    
    for (String s : strs) {
        // ✅ Sort the characters of s → canonical form
        // All anagrams produce the same sorted key
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);   // e.g. "ate", "eat", "tea" → all become "aet"
        
        // ✅ computeIfAbsent: creates empty list if key absent — then adds s
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    
    return new ArrayList<>(groups.values());
}
// Time: O(n · k log k) where k = max word length, Space: O(n)
```

```java
// ✅ SLIDING WINDOW + FREQUENCY MAP — Minimum window substring

public String minWindow(String s, String t) {
    if (s.isEmpty() || t.isEmpty()) return "";
    
    // ✅ Target frequency: how many of each char we need
    Map<Character, Integer> need = new HashMap<>();
    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
    
    int left = 0;
    int formed = 0;                // how many unique chars of t are satisfied in window
    int required = need.size();    // how many unique chars we need
    
    Map<Character, Integer> window = new HashMap<>();
    int minLen = Integer.MAX_VALUE;
    int minLeft = 0;
    
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        window.merge(c, 1, Integer::sum);
        
        // ✅ Check if this char is now fully satisfied in the window
        if (need.containsKey(c) && window.get(c).equals(need.get(c))) {
            formed++;  // ← .equals() for Integer — avoids == trap
        }
        
        // ✅ Shrink window from left while all chars are satisfied
        while (left <= right && formed == required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minLeft = left;
            }
            
            char leftChar = s.charAt(left);
            window.merge(leftChar, -1, Integer::sum);
            if (need.containsKey(leftChar) && window.get(leftChar) < need.get(leftChar)) {
                formed--;  // ← window no longer satisfies this char
            }
            left++;
        }
    }
    
    return minLen == Integer.MAX_VALUE ? "" : s.substring(minLeft, minLeft + minLen);
}
// Time: O(n + m), Space: O(m) where m = unique chars in t
```

```typescript
// ✅ TypeScript — Two Sum (frontend interview / coding challenge)

function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();  // value → index
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        
        seen.set(nums[i], i);
    }
    
    return [];
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a frequency map and when do you use it?"

**Hruday's answer:**
> A frequency map is a HashMap from element values to their count of occurrences. I build it in one pass — for each element, increment its count by 1. If the key isn't in the map yet, initialize to 0 first using `getOrDefault(key, 0)` to avoid a NullPointerException.
>
> I use it whenever a problem involves "find duplicates", "find the majority element", "check if two arrays are equal ignoring order", or "group elements by some common property". The classic example is checking if two strings are anagrams: build a frequency map for each string in O(n), then compare the two maps in O(unique chars). Much simpler than sorting both strings.
>
> The time complexity always becomes O(n) for the build phase and O(k) for lookups where k is the number of unique elements. The space is O(k) — at most O(n) in the worst case where all elements are unique.

---

### Q2 — Variant
**Interviewer asks:** "What's the difference between Two Sum on an unsorted array versus a sorted array?"

**Hruday's answer:**
> On an unsorted array, the correct approach is a HashMap in one pass. Store each number's index as I scan. At each position, check if the complement (target minus current number) is already in the map. If yes, I found the pair. O(n) time, O(n) space.
>
> On a sorted array, I can use two pointers instead — O(n) time, O(1) space. The sorted order lets me make definite decisions: if the sum is too small, move the left pointer right; if too large, move the right pointer left. I save the O(n) space of the HashMap.
>
> The trade-off: two pointers is more space-efficient but requires sorted input. If the input isn't sorted, sorting first takes O(n log n), and I also lose the original indices (the sorted indices are different). The HashMap approach works on any array and preserves original indices, which is why it's the answer for the classic Two Sum problem on LeetCode (unsorted, return indices).

---

### Q3 — Design
**Interviewer asks:** "Design a function to find all pairs of products in a catalogue whose prices sum to a target discount threshold."

**Hruday's answer:**
> I'd use a HashSet for this variant, since the problem asks for pairs of products (not indices), and I want O(n) time.
>
> One pass: for each product, compute `complement = target - price`. If the complement is already in the set, `(currentProduct, complementProduct)` is a valid pair — add to the result list. If not, add the current product to the set.
>
> Edge case: if target is 2x a product's price and only one product has that price, it shouldn't pair with itself. I handle this by keeping a `seen` set for already-processed products, and checking the complement was seen in a previous iteration, not the current one.
>
> For a product catalogue with additional constraints — like "only pair products from different categories" — I'd extend the map to store category along with the price, and add a category check when returning the pair.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Integer comparison with == | "I can compare map values with ==" | Java's Integer auto-boxing uses a cache only for values -128 to 127; `Integer.valueOf(200) == Integer.valueOf(200)` is FALSE (two different objects); for all HashMap value comparisons, use `.equals()` or unbox to primitive `int`; the bug is silent — it works for small values in tests but fails in production with real IDs or prices; most interviews test this trap explicitly with values > 127 |
| Two pass for Two Sum | "I'll first build the map, then scan again to find the pair" | Two passes work, but one pass is more concise and still correct; in the one-pass approach, when I check if `target - nums[i]` is in the map, I'm checking elements I've already processed, which is sufficient; each pair is found exactly once because one element is already in the map when the second is processed; two-pass introduces a subtle bug: if nums=[3,3] and target=6, I might incorrectly find nums[0] pairing with itself unless I carefully exclude i==j; one pass avoids this — the complement check happens BEFORE adding the current element |
| Using HashMap when order matters | "I'll use HashMap to keep track of insertion order" | Standard HashMap does not preserve insertion order; if the problem requires seeing elements in original order, use LinkedHashMap; if sorted order is required, use TreeMap (O(log n) operations vs O(1) for HashMap); choosing the wrong Map type is a common mistake — always ask "does order matter here?" before writing the data structure |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I was building a product recommendation deduplication feature — after collecting recommendations from 4 different sources, we needed to find products that appeared in at least 2 sources (considered a 'strong' recommendation) and remove single-source noise. My first cut was O(n²) nested comparison, which was taking 800ms for catalogues with 5,000 products.
>
> Replacing it with a frequency map reduced the time to under 5ms. One pass over all recommendations to build the frequency map, one pass to filter by count >= 2. The pattern I knew from DSA practice had a direct, measurable impact on the feature's response time."

---

## 8. Scale Evolution

**1,000 users →** HashMap frequency maps and two-sum patterns work fine. In-memory operations with standard Java HashMap are more than sufficient.

**100,000 users →** Large product catalogues or user sets require awareness of HashMap memory usage; a HashMap with 1 million entries uses roughly 50-100MB; consider using primitive-specialized maps (Eclipse Collections, Trove) if memory is a constraint.

**10 million users →** Distributed frequency counting moves to stream processing (Kafka Streams, Flink); the conceptual pattern is the same (frequency map), but the state is distributed across partitions; consistent hashing routes same-key events to the same partition so counts can be aggregated correctly.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Fraud detection: frequency map on payment pairs (same account, multiple transactions in a window); deduplication of payment callbacks (idempotency key → HashMap lookup); Two Sum variant for "find transactions that together form a suspicious round number" | HashMap for idempotency; frequency analysis for fraud patterns |
| Swiggy / Meesho | "Most ordered items today" = frequency map on order events; "find categories with no items in stock" = HashMap set difference; restaurant menu deduplication = group-anagrams pattern | Frequency analysis on operational data; fast deduplication |
| Adobe / Microsoft | Senior engineers interviewed on medium LeetCode; HashMap variants (group anagrams, top K frequent, minimum window substring) are the most common HashMap interview questions at these companies | Interview preparation; clean O(n) one-pass solutions; edge case handling |
| SAP Labs | Product recommendation deduplication; user-action frequency tracking for onboarding analytics; direct experience with HashMap patterns in production TypeScript/Java code | Production application; direct before/after performance story |

---

## 10. Related Topics — What to Study Next

- **Topic 272 — Arrays** — two pointers on sorted arrays complement HashMap-based two-sum on unsorted arrays; knowing both variants shows depth; the prefix sum + HashMap combination (subarrays summing to k) is a direct union of both topics
- **Topic 274 — Stacks and Queues** — the sliding window maximum problem uses a monotonic deque; many frequency map patterns combine with a deque for the "at most k distinct elements" sliding window variant
- **Topic 281 — Implement LRU Cache** — LRU cache uses a LinkedHashMap (or HashMap + doubly linked list); this is the most common "implement a data structure" question that tests both HashMap knowledge and linked list pointer manipulation together

---

*Part 17 · HashMaps — Frequency Maps and Two-Sum Variants · Full Stack Interview Guide · Hruday D · 2026*
