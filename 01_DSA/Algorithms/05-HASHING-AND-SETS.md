# Hashing & Sets — 1-Hour Learning Module

> "A HashMap is the Swiss Army knife of DSA. When you need to go from O(n²) to O(n), ask yourself: can I trade space for time with a hash?"

---

## Table of Contents

- [[0–10 min] Big Picture](#010-min-big-picture)
- [[10–20 min] Mental Model](#1020-min-mental-model)
- [[20–35 min] Core Patterns](#2035-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Run](#3545-min-concrete-code--dry-run)
- [[45–55 min] Pattern Recognition](#4555-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall](#active-recall)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)
- [Advanced Awareness](#advanced-awareness)

---

## [0–10 min] Big Picture

### What is Hashing? Why does it exist?

Imagine a room with 10,000 boxes. You want box #7,842. If the boxes are scattered randomly, you have to check every one — O(n). If each box sits in a slot equal to its label, you walk straight to slot 7,842 in O(1). That direct-address idea is the core of hashing.

The real world doesn't give us neatly numbered labels. Keys can be strings, objects, anything. A **hash function** converts any key into an array index. Collision handling ensures correctness when two keys land on the same slot.

### Real-world analogy

A HashMap is a library's card catalog. Every book (value) has a call number (key). Instead of walking every shelf, you look up the call number and go straight to that shelf — O(1) lookup vs. O(n) shelf-by-shelf scan.

A HashSet is the catalog without the books. You only track which call numbers exist — "is this item present or not?"

### One tiny example

Problem: "Do any two numbers in [2, 7, 11, 15] add up to 9?"

Brute force: check every pair — (2,7), (2,11), (2,15), (7,11) ... — O(n²).

With a HashMap: walk once, asking "Is 9 minus the current number already stored?"

```
See 2:  need 7.  Not stored yet.  Store 2.
See 7:  need 2.  2 IS stored!     Found the pair.
```

One pass, O(n). The trade: a small amount of extra memory for dramatically faster lookup. This is the entire thesis of hashing.

---

## [10–20 min] Mental Model

### What is actually happening under the hood?

A HashMap is an array. A hash function converts your key to an integer index. The value lives at that index.

```
key "apple"  -->  hash("apple") = 42  -->  array[42] = <value>
key "banana" -->  hash("banana") = 17  -->  array[17] = <value>
```

When two keys hash to the same slot (a collision), Java's HashMap uses **chaining**: a short linked list lives at that bucket. With a good hash function, average chain length stays near 1, so lookup stays O(1). In the absolute worst case (all keys collide), it degrades to O(n) — but this is negligible in practice.

### ASCII diagram: HashMap internals

```
  Key         Hash Fn     Bucket Array
  --------    -------     -----------------------------------------
  "eat"   --> h = 2  -->  [0]: empty
  "tea"   --> h = 2  -->  [1]: empty
  "cat"   --> h = 5  -->  [2]: ("eat", val) --> ("tea", val)   <-- chain
                          [3]: empty
                          [4]: empty
                          [5]: ("cat", val)
```

"eat" and "tea" collide at bucket 2 and are chained. Lookup traverses the short chain. Average chain length ≈ 1.

### The key insight

The entire power of hashing is one sentence:

> "If I have seen something before, I stored it in O(1). I can check whether it exists in O(1)."

This converts repeated **search** into instant **lookup**. Any algorithm doing repeated O(n) scans through an array can often be rewritten to "store as you go, look up what you need."

### What information do we maintain, and why?

```
HashMap<K, Integer>     -- frequency counts or index tracking
HashMap<K, List<V>>     -- grouping elements that share an identity
HashSet<K>              -- membership only (no value needed)
prefix sum + HashMap    -- count subarrays whose sum equals a target
```

Each flavor answers a different question:
- Frequency map: "How many times have I seen X?"
- Index map: "Where did I last see X?"
- Grouping map: "Which other elements belong with X?"
- HashSet: "Have I seen X at all?"
- Prefix + map: "How many subarrays ending here have sum exactly K?"

---

## [20–35 min] Core Patterns

### The single mental test before writing any code

> "Do I need to look up something I have already seen, faster than O(n)?"

If yes, a HashMap or HashSet is likely your tool.

---

### Pattern 1: Frequency Counting

**Intuition:** You are counting votes. For each ballot, mark a tally next to that candidate's name. That tally sheet is your frequency map.

**When to use:**
- Count occurrences of each element
- Find the most/least frequent element
- Check if two collections are "equivalent" (anagram check, permutation check)
- Keywords: "frequency," "count," "how many times," "most common," "anagram"

**When NOT to use:**
- You only need existence, not count — use a HashSet (simpler)
- The range is tiny (e.g., only lowercase letters) — use an int[26] array, it is faster and cleaner
- You need ordered frequency information — combine with sorting or a heap

**Core algorithm:**
```
freq = {}
for each element x:
    freq[x] = freq.getOrDefault(x, 0) + 1
```

**Variants:**
- **Two frequency maps compared:** Build maps for two collections, check equality. This is the anagram check.
- **Frequency of frequencies:** "How many elements appear exactly K times?" Build freq map, then count how many values in that map equal K.
- **Top K frequent elements:** Build freq map, then use a heap or bucket sort on the frequencies.

**Complexity:**
- Time: O(n) to build, O(1) per lookup
- Space: O(D) where D = number of distinct elements

---

### Pattern 2: Two-Sum (Complement Lookup)

**Brute force:** For each element, scan the rest of the array looking for target - element. O(n²).

**Key observation:** When I am at element x, I do not need to scan. I need to answer one question: "Have I already seen target - x?" If I have stored every element I've passed into a HashMap, that answer costs O(1).

**Optimized one-pass:**
```
seen = {}                         // value -> index
for i = 0 to n-1:
    complement = target - arr[i]
    if complement in seen:
        return [seen[complement], i]
    seen[arr[i]] = i
```

**Brute to optimal progression:**
```
O(n²): for i: for j>i: if arr[i]+arr[j]==target -> return
  |
  | Observation: the partner of arr[i] is fully determined (= target - arr[i]).
  |              No need to scan - just remember past elements.
  v
O(n): store past elements in HashMap, query in O(1) per step
```

**When to use:** Unsorted array, need indices, or array has duplicates. Any "find pair with property X" where you can express "what my partner must be" as a formula.

**When NOT to use:**
- Array is sorted — Two Pointers gives O(1) space at the same O(n) time
- Need all pairs — handle duplicate values carefully; map stores one index per value
- n is small and you need all pairs — nested loops may be simpler

**Variants:**
- **Two Sum (sorted array):** Two Pointers, O(1) space
- **Three Sum (sum to 0):** Sort first, then for each element fix it and run Two Pointers on the remainder. O(n²)
- **Three Sum Closest:** Same as Three Sum but track the closest running sum
- **Four Sum:** Sort, nest two loops fixing two elements, run Two Pointers inside. O(n³). Alternatively HashMap of pair sums for O(n²) with careful duplicate handling.
- **Two Difference (Two Sum variant):** "Find pair with difference = K." For each element, check if element + K or element - K exists in the map.
- **Two Sum Data Structure:** Class with `add(number)` and `find(target)`. HashMap value → count. `find` checks for complement.

---

### Pattern 3: Group By Key

**Intuition:** Sorting mail into labeled mailboxes. Each piece of mail gets a label (the key). Mail with the same label goes in the same box. The creative work is choosing the right label function.

**Core algorithm:**
```
groups = {}
for each element x:
    k = key_function(x)
    groups[k].append(x)
return groups.values()
```

**Key function examples:**
- **Group Anagrams:** key = sorted string. "eat", "tea", "ate" all produce "aet".
- **Isomorphic Strings:** key = normalized first-occurrence pattern. "egg" → "0.1.1".
- **Group Shifted Strings:** key = tuple of differences between consecutive characters.

**When NOT to use:** Grouping depends on pairwise relationships rather than a function of a single element — use Union-Find instead.

**Complexity:**
- Time: O(n × K) where K = cost of computing the key. Sorting a string of length L = O(L log L). A frequency count key = O(L).
- Space: O(n) for the map

**Interview insight:** For "Group Anagrams," sorting each string is O(L log L) per word. Using a character frequency array (or tuple) as key costs O(L) but requires a hashable representation. Sorting is simpler to code correctly; frequency key is faster asymptotically.

---

### Pattern 4: Subarray Sum = K (Prefix Sum + HashMap)

**This is the most powerful and most missed hashing pattern. Master this one.**

**Brute force:** For every pair (i, j), compute sum(arr[i..j]). O(n²) or O(n³).

**Key observation:** Define prefix[i] = sum of arr[0] through arr[i], and prefix[-1] = 0.

Sum of subarray ending at i starting at j+1 = prefix[i] - prefix[j].

So "is there a subarray ending at i with sum exactly K?" is equivalent to:

> "Does the value prefix[i] - K appear somewhere in the list of past prefix sums?"

This is Two-Sum applied to prefix sums.

**ASCII diagram:**
```
arr:    [ 1,  2,  3,  -2,  4 ]    target K = 3

prefix: [ 0,  1,  3,   6,   4,   8 ]
          ^                          (virtual start, always included)

At prefix = 3: need 3 - 3 = 0.  Is 0 in map?  Yes -> subarray [0..1] sums to 3.
At prefix = 6: need 6 - 3 = 3.  Is 3 in map?  Yes -> subarray [2..2] sums to 3.
```

**Core algorithm:**
```
prefixCount = {0: 1}          // CRITICAL: base case
currentPrefix = 0
count = 0
for each element x:
    currentPrefix += x
    needed = currentPrefix - k
    count += prefixCount.getOrDefault(needed, 0)
    prefixCount[currentPrefix]++
return count
```

**Why {0: 1} is critical:** If currentPrefix == K at any point, then the entire subarray from index 0 to here sums to K. The entry {0: 1} represents the virtual position before the array starts, so this subarray gets counted.

**When to use:**
- Count subarrays with sum = K, especially when the array has negative numbers (sliding window fails with negatives)
- Count subarrays with sum divisible by K — use prefix % K as the key
- Longest subarray with sum = K — store the *first* occurrence of each prefix sum
- Subarray with equal 0s and 1s — convert 0 to -1, find subarray with sum = 0

**When NOT to use:**
- All elements are non-negative and you want longest/shortest subarray with sum ≤ K — sliding window is simpler and uses O(1) space
- You need the actual subarray elements, not just count/length — prefix + HashMap gives positions, then extract

**Variants:**
- **Count subarrays divisible by K:** Key = prefix % K. Handle negative mod: ((prefix % K) + K) % K
- **Longest subarray with sum = K:** Store first occurrence index for each prefix sum. Length = i - firstSeen[prefix - K]
- **Contiguous Array (0s and 1s):** Replace 0 with -1, find longest subarray with sum = 0
- **Subarray XOR = K:** Use prefix XOR + HashMap — same idea, XOR replaces addition

---

### Pattern 5: HashSet for Existence / Uniqueness

**Intuition:** A guest list at a party. You do not care how many times someone's name appears. You only care whether they are on the list. That is a set.

**Core algorithm:**
```
seen = {}
for each element x:
    if x in seen:
        // duplicate found, or trigger some condition
    seen.add(x)
```

**When to use:**
- "Does element X exist in the collection?"
- "How many distinct elements are there?"
- "Find intersection / union / difference of two collections"
- Remove duplicates
- Keywords: "contains," "exists," "unique," "distinct," "duplicate"

**When NOT to use:**
- You need counts — use HashMap
- You need ordered access — use TreeSet
- Space is severely limited — consider a bit vector or bloom filter

**Variants:**
- **Contains Duplicate:** Add to set; if already present, a duplicate exists.
- **Intersection of Two Arrays:** Add one array to a set, scan the other and check membership.
- **Longest Consecutive Sequence:** Add all to set. For each element where element-1 is NOT in the set (this is the start of a streak), count forward. O(n) total despite the inner loop — each element is visited as "start of streak" at most once.
- **Happy Number:** Detect cycles by tracking seen sums in a set.
- **Contains Duplicate within distance K:** HashMap of value → most recent index. Check if i - map[value] ≤ K.

---

## [35–45 min] Concrete Code + Dry Run

### Example 1: Two Sum

**Input:** nums = [2, 7, 11, 15], target = 9
**Expected output:** [0, 1]

**Java:**
```java
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i};
        }
        seen.put(nums[i], i);
    }
    return new int[]{};
}
```

**JavaScript:**
```javascript
function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}
```

**Dry run table:**

| i | nums[i] | complement | seen (before this step) | action            |
|---|---------|------------|-------------------------|-------------------|
| 0 | 2       | 7          | {}                      | 7 not found; store 2→0 |
| 1 | 7       | 2          | {2:0}                   | 2 found! return [0, 1] |

**Why check before storing?** An element cannot be its own partner. If we stored first and then checked, and target = 4 with arr[i] = 2, we would incorrectly find the pair (2, 2) using the same element twice.

**Complexity:**
- Time: O(n) — one pass; each HashMap operation is O(1) average
- Space: O(n) — at most n entries in the map

---

### Example 2: Subarray Sum Equals K

**Input:** nums = [1, 2, 3], k = 3
**Expected output:** 2 (subarrays are [1,2] and [3])

**Java:**
```java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);
    int currentPrefix = 0;
    int count = 0;
    for (int num : nums) {
        currentPrefix += num;
        int needed = currentPrefix - k;
        count += prefixCount.getOrDefault(needed, 0);
        prefixCount.put(currentPrefix, prefixCount.getOrDefault(currentPrefix, 0) + 1);
    }
    return count;
}
```

**JavaScript:**
```javascript
function subarraySum(nums, k) {
    const prefixCount = new Map([[0, 1]]);
    let currentPrefix = 0;
    let count = 0;
    for (const num of nums) {
        currentPrefix += num;
        const needed = currentPrefix - k;
        count += prefixCount.get(needed) || 0;
        prefixCount.set(currentPrefix, (prefixCount.get(currentPrefix) || 0) + 1);
    }
    return count;
}
```

**Dry run table:**

| Step | num | currentPrefix | needed (prefix - k) | prefixCount before check | count after step |
|------|-----|---------------|---------------------|--------------------------|-----------------|
| init | --  | 0             | --                  | {0:1}                    | 0               |
| 1    | 1   | 1             | 1 - 3 = -2          | {0:1}   (-2 absent)      | 0               |
| 2    | 2   | 3             | 3 - 3 = 0           | {0:1, 1:1} (0 present, adds 1) | 1        |
| 3    | 3   | 6             | 6 - 3 = 3           | {0:1, 1:1, 3:1} (3 present, adds 1) | 2   |

**Result:** 2. The two subarrays are [1, 2] (indices 0–1) and [3] (index 2).

**Why {0: 1} works:** At step 2, prefix = 3 and needed = 0. The entry {0: 1} represents the virtual state before index 0 — it says "the empty prefix (sum = 0) has been seen once." Without it, the subarray [1, 2] would not be counted because there would be no record of the prefix sum 0.

**Why update the map AFTER the query:** If we updated first, a single element arr[i] equal to k would count itself as a valid subarray, using the same index as both start and end.

**Complexity:**
- Time: O(n) — one pass; all map operations are O(1) average
- Space: O(n) — at most n distinct prefix sums stored

---

## [45–55 min] Pattern Recognition

### Structural clues — what to look for

```
"two elements that sum to target"           -->  Two-Sum (complement lookup)
"count subarrays with sum = K"              -->  Prefix sum + HashMap
"array contains negative numbers"           -->  Sliding window FAILS; use prefix sum
"group all anagrams together"               -->  Group By Key
"most frequent / top K elements"            -->  Frequency map + heap or bucket sort
"check if two strings are anagrams"         -->  Frequency map comparison
"longest consecutive sequence"              -->  HashSet, start-of-streak check
"contains duplicate within K positions"     -->  HashMap of value -> last seen index
"subarray with equal 0s and 1s"             -->  Replace 0 with -1, subarray sum = 0
"subarray XOR equals K"                     -->  Prefix XOR + HashMap
```

### Reasoning flow

Ask yourself in this order:

1. Do I only need to check whether something has appeared? → **HashSet**
2. Do I need to count how often something appears? → **HashMap (frequency)**
3. Do I need to find a complement or partner element? → **HashMap (Two-Sum style)**
4. Do I need to count or find subarrays by their sum? → **Prefix sum + HashMap**
5. Do I need to group elements by shared identity? → **HashMap (group by key)**
6. Does the array contain negatives and I am asked about subarray sums? → **Prefix sum + HashMap** (sliding window cannot handle negatives)

### Distinguishing from similar patterns

| Situation | Use |
|---|---|
| Sorted array, find pair with sum = target | Two Pointers — O(1) space |
| Unsorted array, find pair with sum = target | Two-Sum HashMap — O(n) space |
| All non-negative elements, longest subarray with sum ≤ K | Sliding Window |
| Has negative elements, count subarrays with sum = K | Prefix Sum + HashMap |
| Grouping by a computable key | Group By Key HashMap |
| Only need to know if element exists | HashSet |
| Need counts | HashMap |
| Grouping by pairwise connections | Union-Find |

### Common traps

**Trap 1 — Missing {0: 1} base case.**
In all prefix sum + HashMap problems, forgetting to seed the map with {0: 1} causes subarrays that start at index 0 to be missed. Always seed first, before the loop.

**Trap 2 — Negative modulo.**
In Java and JavaScript, (-3) % 5 = -3, not 2. For "count subarrays with sum divisible by K," you must normalize: ((prefix % K) + K) % K. This ensures all keys are non-negative.

**Trap 3 — HashMap when an array suffices.**
For lowercase English letters, a 26-element int array is cleaner, faster, and uses less memory than a HashMap. Reserve HashMap for large or unpredictable key ranges.

**Trap 4 — Three Sum duplicates.**
After sorting for Three Sum, if you do not skip duplicate elements at each of the three pointer positions, you will produce duplicate triplets in the output.

**Trap 5 — Same element used twice in Two-Sum.**
The reason you check before storing (not after) is to avoid pairing an element with itself. "Two Sum" specifies two distinct indices.

---

## [55–60 min] Final Mental Checklist

```
WHAT IS IT?
  HashMap / HashSet: data structures giving O(1) average insert, lookup, delete.
  Built on hash functions that convert keys to array indices.

WHEN DO I USE IT?
  - O(1) check of "have I seen X before?" -> HashSet or HashMap
  - Count element frequencies -> HashMap<K, Integer>
  - Find complement / partner satisfying a condition -> Two-Sum style HashMap
  - Count subarrays by their sum (especially with negatives) -> prefix + HashMap
  - Group elements by a shared identity -> HashMap<K, List>

WHEN DO I NOT USE IT?
  - Sorted array, need pairs -> Two Pointers (O(1) space, same time)
  - All non-negative elements, subarray sum problem -> Sliding Window (simpler)
  - Grouping based on pairwise connections -> Union-Find
  - Range is tiny (e.g., only lowercase letters) -> use int[] array
  - Need ordered iteration -> use TreeMap / TreeSet

WHAT IS THE CORE IDEA?
  Trade O(n) space for O(1) lookup.
  Store past observations as you go. Query them instantly.

WHAT DO I TRACK?
  Two-Sum:         value -> index
  Subarray Sum:    prefix sum -> count of how many times this prefix sum occurred
  Frequency:       value -> count
  Group By Key:    key -> list of elements
  HashSet:         just the elements (membership only)

WHAT IS THE INVARIANT / STATE?
  Two-Sum:    map contains all elements seen to the LEFT of current index
  Prefix Sum: prefixCount contains frequency of all prefix sums UP TO current index
              and always includes the seed {0: 1} before the loop begins
  Frequency:  map[x] = number of times x has been seen so far

HOW DO I RECOGNIZE IT?
  "find pair/complement"           -> Two-Sum
  "count subarrays with sum"       -> Prefix + HashMap
  "group by equivalence"           -> Group By Key
  "most frequent / count"          -> Frequency map
  "contains / exists / duplicate"  -> HashSet

WHAT ARE THE COMMON TRAPS?
  - Missing {0:1} seed in prefix sum problems
  - Negative modulo in divisibility problems
  - Using HashMap when int[26] is sufficient
  - Forgetting duplicate skipping in Three Sum
  - Checking AFTER storing in Two-Sum (allows self-pairing)

WHAT PATTERNS CAN I CONFUSE IT WITH?
  Two Pointers:   use when array is sorted and you need pairs (O(1) space)
  Sliding Window: use when all elements >= 0 and you need subarray sum bounds
  Union-Find:     use when grouping is based on pairwise connections, not a key function

WHAT IS THE COMPLEXITY?
  Single-pass HashMap / HashSet algorithms:  O(n) time, O(n) space
  Group By Key with sorted-string key:       O(n * L log L) time
  Prefix Sum + HashMap:                      O(n) time, O(n) space
  HashMap worst case (all collisions):       O(n) per lookup — negligible in practice
```

---

## Active Recall

Close your notes and answer these without looking:

1. In the Two-Sum HashMap approach, do you check the map before or after storing the current element? What breaks if you reverse the order?

2. What is the purpose of initializing prefixCount = {0: 1} in the subarray sum pattern? Give a concrete example of what goes wrong without it.

3. You are given an array that contains negative numbers. Someone suggests using a sliding window to count subarrays with sum = K. Why does this fail?

4. For "Group Anagrams," the standard key is "sort the string" — O(L log L) per word. What is an O(L) alternative key that avoids sorting?

5. "Longest Consecutive Sequence" has a nested loop structure but runs in O(n). Explain why the inner loop does not push the overall complexity to O(n²).

6. For "subarray sum divisible by K," the key in the map is prefix % K. Why do you need ((prefix % K) + K) % K instead of just prefix % K?

7. You have a HashMap approach (O(n) time) and a Two Pointers approach (O(n) time, O(1) space) for a pairs problem. The input is sorted. Which do you use and why?

8. Explain why the "complement lookup" insight that makes Two-Sum O(n) also applies to the subarray sum problem. What is the "complement" in each case?

---

## Recommended Practice Direction

Work through these in order — each one introduces a new layer of the hashing patterns:

1. **Two Sum** (LeetCode #1) — Foundational complement lookup; articulate the HashMap approach clearly
2. **Valid Anagram** (LeetCode #242) — Basic frequency map comparison
3. **Group Anagrams** (LeetCode #49) — Group By Key with a custom key function
4. **Subarray Sum Equals K** (LeetCode #560) — Prefix sum + HashMap; the hardest fundamental; practice the {0:1} seed without hesitation
5. **Longest Consecutive Sequence** (LeetCode #128) — HashSet with the start-of-streak insight for O(n)
6. **Top K Frequent Elements** (LeetCode #347) — Frequency map combined with bucket sort or a heap
7. **Contiguous Array** (LeetCode #525) — The "replace 0 with -1" transformation; subarray sum = 0
8. **Minimum Window Substring** (LeetCode #76) — Sliding window + frequency map; the hardest combination of both tools

For each problem: solve brute force first, then ask "what lookup am I repeating inside the loop?" That repeated lookup is what the HashMap eliminates.

---

## 2-Minute Cheat Sheet

```
PICK YOUR WEAPON:
  HashSet              --> existence / uniqueness / deduplication
  HashMap<K, count>    --> frequency counting
  HashMap<K, index>    --> two-sum / complement lookup
  HashMap<K, list>     --> group by key
  prefix + HashMap     --> subarray sum counting (negatives OK)

TWO-SUM TEMPLATE:
  seen = {}
  for i, x in enumerate(arr):
      complement = target - x
      if complement in seen:
          return [seen[complement], i]
      seen[x] = i

SUBARRAY SUM TEMPLATE:
  prefixCount = {0: 1}          // seed this BEFORE the loop
  prefix = 0
  count = 0
  for x in arr:
      prefix += x
      count += prefixCount.get(prefix - k, 0)
      prefixCount[prefix] = prefixCount.get(prefix, 0) + 1

GROUP BY KEY TEMPLATE:
  groups = {}
  for x in arr:
      k = key_function(x)
      groups.setdefault(k, []).append(x)

FREQUENCY TEMPLATE:
  freq = {}
  for x in arr:
      freq[x] = freq.get(x, 0) + 1

KEY TRAPS TO REMEMBER:
  prefix sum     --> always initialize {0: 1} before the loop
  negatives      --> sliding window fails; use prefix + HashMap
  mod K          --> use ((prefix % K) + K) % K, not just prefix % K
  tiny range     --> use int[] array, not HashMap
  sorted input   --> Two Pointers saves O(n) space at the same time
  self-pairing   --> check map BEFORE storing current element
```

---

## Advanced Awareness

These topics are at the edges of the hashing world. Know they exist; do not deep-dive here.

**Rolling Hash (Rabin-Karp):** A hash function for strings that can be updated in O(1) when you slide the window by one character, instead of recomputing from scratch. Used in substring pattern matching and detecting duplicate substrings of a given length. Collisions are possible — always verify an apparent match with actual string comparison. For "Longest Duplicate Substring," combine rolling hash with binary search on the length: O(n log n) average. Double hashing (two independent hash functions) drives collision probability to negligible levels.

**Consistent Hashing:** A distributed systems concept, not a coding pattern. Keys and servers are both mapped to a ring (circular hash space). Each key is assigned to the nearest server clockwise. Adding or removing a server affects only K/N keys on average (K = total keys, N = servers). Virtual nodes (each physical server gets multiple ring positions) ensure even load distribution. Relevant in system design interviews involving distributed caches, CDNs, and sharding.

**Count-Min Sketch:** Approximate frequency counting for massive data streams where an exact HashMap would be too large. Trades a small, bounded error for dramatically lower memory usage.

**Aho-Corasick:** For matching multiple string patterns simultaneously in a single pass over the text, as opposed to running rolling hash separately per pattern.

---

*Next: [06-LINKED-LISTS.md](06-LINKED-LISTS.md) — Pointer manipulation and the art of node surgery.*
