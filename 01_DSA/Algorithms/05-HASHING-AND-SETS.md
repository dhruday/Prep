# Hashing & Sets — Google Interview Patterns

> **5 algorithms covered:** Frequency Count · Two Sum / Complement Lookup · Grouping by Key (Anagrams) · Subarray Sum with HashMap (Prefix Sum + Hash) · HashSet for Existence / Deduplication

> Read fast. Understand deeply. Go practice on LeetCode immediately.

---

## Table of Contents

1. [Frequency Count](#frequency-count)
2. [Two Sum / Complement Lookup](#two-sum--complement-lookup)
3. [Grouping by Key (Anagrams)](#grouping-by-key-anagrams)
4. [Subarray Sum with HashMap (Prefix Sum + Hash)](#subarray-sum-with-hashmap-prefix-sum--hash)
5. [HashSet for Existence / Deduplication](#hashset-for-existence--deduplication)

---

## Frequency Count

### What is it?
You want to know how many times each element appears in a collection. A **hash map** (a data structure that stores key→value pairs and lets you look up any value in O(1) time) stores each element as the key and its count as the value. You walk the array once and tally counts as you go.

### Visual
```
Array:  [a, b, a, c, b, a]

After one pass:
  key → value (count)
  "a" → 3
  "b" → 2
  "c" → 1

HashMap as a table:
  ┌─────┬───────┐
  │ Key │ Count │
  ├─────┼───────┤
  │  a  │   3   │
  │  b  │   2   │
  │  c  │   1   │
  └─────┴───────┘
```

### How does it work?
1. Create an empty hash map: `freq = {}`.
2. Walk through each element `x` in the array.
3. If `x` is already a key in the map, increment its count by 1.
4. If `x` is NOT in the map, add it with count 1.
5. After the loop, `freq[x]` tells you exactly how many times `x` appeared.
6. Use the completed map to answer questions: "is count of x == count of y?", "which element has the highest count?", etc.

### Why does it work?
A hash map gives O(1) insert and O(1) lookup, so counting every element costs only O(n) total — one operation per element. Without it, counting a single element would require scanning the whole array each time: O(n²) total.

### When to use?
- The problem mentions "frequency", "count", "how many times", or "most common".
- You need to check if two arrays/strings have the same elements in the same quantities (anagram check, permutation check).
- You need to find the Top K most or least frequent elements.
- You need "frequency of frequencies" — e.g., how many elements appear exactly K times.

### When NOT to use?
- You only need to know whether an element *exists*, not how many times — use a HashSet (simpler, less memory).
- The key range is tiny and fixed (e.g., only lowercase English letters) — use an `int[26]` array; it is faster and cleaner than a HashMap.

### How to recognize in a new problem?
Ask: "Do I need to know HOW MANY TIMES something appears?" If yes, reach for a frequency map.

Concrete signals:
- "Check if two strings are anagrams" → compare frequency maps of both strings.
- "Find the element that appears more than n/2 times" → build freq map, scan for count > n/2.
- "Return the k most frequent words" → build freq map, then sort or use a heap on the counts.

### Simple Example
Input: `s = "anagram"`, `t = "nagaram"` — are these anagrams?

Expected output: `true`

Trace:
```
freq for "anagram": {a:3, n:1, g:1, r:1, m:1}
freq for "nagaram": {n:1, a:3, g:1, r:1, m:1}
Maps are equal → true
```

### Code
```java
// Java — Valid Anagram
public boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    Map<Character, Integer> freq = new HashMap<>();
    for (char c : s.toCharArray()) {
        freq.put(c, freq.getOrDefault(c, 0) + 1);
    }
    for (char c : t.toCharArray()) {
        if (!freq.containsKey(c) || freq.get(c) == 0) return false;
        freq.put(c, freq.get(c) - 1);
    }
    return true;
}
```
```javascript
// JavaScript — Valid Anagram
function isAnagram(s, t) {
    if (s.length !== t.length) return false;
    const freq = {};
    for (const c of s) freq[c] = (freq[c] || 0) + 1;
    for (const c of t) {
        if (!freq[c]) return false;
        freq[c]--;
    }
    return true;
}
```

### Dry Run
Input: `s = "rat"`, `t = "car"`

| Step | Action | freq map |
|------|--------|----------|
| Build from s | see 'r' | {r:1} |
| Build from s | see 'a' | {r:1, a:1} |
| Build from s | see 't' | {r:1, a:1, t:1} |
| Check t | see 'c' | freq['c'] is 0 → return false |

Result: `false` — not anagrams.

### Complexity
```
Time:  O(n) — one pass to build, one pass to verify; each map op is O(1)
Space: O(D) — where D = number of distinct characters/elements (at most 26 for lowercase letters)
```

### Common Trap
- **Using HashMap when int[26] is enough.** If keys are only lowercase English letters, `int[26] freq = new int[26]; freq[c - 'a']++` is simpler, faster, and uses constant space.
- **Comparing map sizes before comparing values.** If `s = "ab"` and `t = "aab"`, the length check at the start catches this — always do it first.

### Experience Tip
**Experience Tip:** In interviews, the anagram check is the warm-up. The real test is whether you can extend it: "group all anagrams together" or "find all permutations of s in a long string p". Both are direct extensions of the frequency map idea — learn the base pattern cold first.

### Do Not Confuse With
- **HashSet**: Only tracks *existence*, not counts. Use frequency map when you need the number.
- **Sorting**: Sorting `s` and `t` and comparing is also O(n log n) and works for anagram checks, but frequency map is O(n) and is the expected optimal approach.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 242 | Valid Anagram | Easy | Build freq map for one string, decrement for the other | https://leetcode.com/problems/valid-anagram/ |
| 383 | Ransom Note | Easy | Same as anagram — can magazine's letters cover the note? | https://leetcode.com/problems/ransom-note/ |
| 347 | Top K Frequent Elements | Medium | Build freq map first, then use a heap or bucket sort on counts | https://leetcode.com/problems/top-k-frequent-elements/ |
| 290 | Word Pattern | Easy | Build freq map for both pattern chars and words, check structural match | https://leetcode.com/problems/word-pattern/ |
| 202 | Happy Number | Easy | Frequency set to detect cycles in the digit-square-sum sequence | https://leetcode.com/problems/happy-number/ |

### One-Minute Revision
```
ALGORITHM:     Frequency Count
IN SIMPLE WORDS: Walk the array once, count how many times each element appears using a hash map.
USE WHEN:      Need element counts, anagram check, top-K frequent, frequency comparison.
DON'T USE WHEN: Only need existence → HashSet. Fixed small range → int[] array.
CORE IDEA:     Hash map turns repeated counting into O(1) per element.
TRACK:         HashMap<element, count>
TIME:          O(n)
SPACE:         O(D) — D = distinct elements
COMMON TRAP:   Using HashMap for lowercase letters instead of int[26].
EXPERIENCE TIP: Master this cold. Every harder hashing problem builds on it.
```

---

## Two Sum / Complement Lookup

### What is it?
You need to find two numbers in an array that add up to a target. Instead of checking every pair (O(n²)), you walk the array once. For each number, you calculate what its "partner" must be (`target - current`), and look it up instantly in a hash map that stores everything you have already seen.

### Visual
```
Array: [2, 7, 11, 15]   Target: 9

Walk left to right. For each number, ask: "Is (9 - this number) already in my map?"

  Index 0: num=2, need 9-2=7.  Map is empty.  Not found. Store: {2→0}
  Index 1: num=7, need 9-7=2.  Map has 2!     Found at index 0. Return [0, 1].

  seen map (value → index):
  ┌───────┬───────┐
  │ Value │ Index │
  ├───────┼───────┤
  │   2   │   0   │  ← stored after index 0
  └───────┴───────┘
```

### How does it work?
1. Create an empty hash map `seen` that maps value → index.
2. Walk through the array with index `i`.
3. Calculate `complement = target - nums[i]`.
4. Check if `complement` is already a key in `seen`.
5. If YES: you found the pair. Return `[seen[complement], i]`.
6. If NO: store `nums[i] → i` in the map, then move to the next element.
7. The map only ever holds elements to the LEFT of the current position.

### Why does it work?
Once you fix one number, the other number is completely determined (`target - first`). You do not need to search — you just need to check if that specific number has appeared before. A hash map makes that check O(1) instead of O(n).

### When to use?
- Find two elements satisfying a condition (sum, difference, product) in an unsorted array.
- You need the indices of the two elements (not just their values).
- The array may contain duplicates and negative numbers.
- Any "find pair with property X" where you can express "what my partner must be" as a formula.

### When NOT to use?
- The array is sorted — use Two Pointers instead (same O(n) time, O(1) space, no extra memory).
- You need all pairs (not just the first) — be careful; the map stores one index per value, so duplicates need special handling.

### How to recognize in a new problem?
Ask: "Am I looking for two elements where one determines the other?" If yes, this is Two Sum.

Concrete signals:
- "Find two numbers that sum to target" → classic Two Sum.
- "Find if any pair has difference equal to k" → for each `x`, check if `x + k` or `x - k` is in the map.
- "Find two numbers whose product is k" → for each `x`, check if `k / x` is in the map (handle division carefully).

### Simple Example
Input: `nums = [3, 2, 4]`, `target = 6`

Expected output: `[1, 2]` (nums[1]=2, nums[2]=4, and 2+4=6)

Trace:
```
i=0: num=3, need=3. Map={}. 3 not found. Store {3→0}.
i=1: num=2, need=4. Map={3→0}. 4 not found. Store {3→0, 2→1}.
i=2: num=4, need=2. Map has 2 at index 1! Return [1, 2].
```

### Code
```java
// Java
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();  // value → index
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i};
        }
        seen.put(nums[i], i);  // store AFTER checking, not before
    }
    return new int[]{};
}
```
```javascript
// JavaScript
function twoSum(nums, target) {
    const seen = new Map();  // value → index
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);  // store AFTER checking, not before
    }
    return [];
}
```

### Dry Run
Input: `nums = [2, 7, 11, 15]`, `target = 9`

| i | nums[i] | complement | seen (before this step) | result |
|---|---------|------------|-------------------------|--------|
| 0 | 2 | 7 | {} | 7 not found; store {2→0} |
| 1 | 7 | 2 | {2→0} | 2 FOUND at index 0; return [0,1] |

### Complexity
```
Time:  O(n) — one pass; each HashMap lookup and insert is O(1) average
Space: O(n) — at most n entries stored in the map
```

### Common Trap
- **Storing BEFORE checking.** If you call `seen.put(nums[i], i)` first and THEN check for the complement, an element can pair with itself. For example, `nums = [3, 5]`, `target = 6`: at index 0, you'd store 3, then find that complement 3 is already there — wrongly pairing index 0 with itself. Always check THEN store.
- **Overwriting duplicate values.** If the array has `[3, 3]` and target is 6, the first 3 must be stored first. Checking before storing handles this correctly — you find the first 3 in the map when you reach the second 3.

### Experience Tip
**Experience Tip:** Two Sum is the gateway problem for all hashing interviews. Interviewers use it to see if you know the "check before store" discipline and can articulate *why*. Practice explaining the O(n²) → O(n) reduction out loud before your interview — it signals strong algorithmic thinking.

### Do Not Confuse With
- **Two Pointers (sorted array):** Achieves O(n) time with O(1) space. If the array is sorted and you don't need indices, prefer Two Pointers. If unsorted or you need indices, use the HashMap approach.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1 | Two Sum | Easy | Classic — check complement before storing | https://leetcode.com/problems/two-sum/ |
| 242 | Valid Anagram | Easy | Warm-up: freq map as a complement check | https://leetcode.com/problems/valid-anagram/ |
| 290 | Word Pattern | Easy | Map chars to words AND words to chars (bijection) | https://leetcode.com/problems/word-pattern/ |
| 202 | Happy Number | Easy | Use a set to detect if the digit-sum cycle repeats | https://leetcode.com/problems/happy-number/ |
| 217 | Contains Duplicate | Easy | HashSet membership check — simplified Two Sum | https://leetcode.com/problems/contains-duplicate/ |

### One-Minute Revision
```
ALGORITHM:     Two Sum / Complement Lookup
IN SIMPLE WORDS: For each element, ask "have I already seen its required partner?" using a hash map.
USE WHEN:      Unsorted array, need indices, find pair summing to target.
DON'T USE WHEN: Array is sorted → use Two Pointers (O(1) space).
CORE IDEA:     Once you fix one element, its partner is fully determined. Store past elements; query instantly.
TRACK:         HashMap<value, index> — only elements to the LEFT of current position
TIME:          O(n)
SPACE:         O(n)
COMMON TRAP:   Store AFTER checking — never before. Prevents self-pairing.
EXPERIENCE TIP: Practice explaining the O(n²)→O(n) jump out loud. Interviewers listen for it.
```

---

## Grouping by Key (Anagrams)

### What is it?
You have a collection of elements where some elements are "equivalent" to each other (e.g., anagrams of the same word). You want to bucket them together. The trick is to compute a **canonical key** — a label that is identical for all equivalent elements — and use a hash map to collect each element into its bucket.

### Visual
```
Input words: ["eat", "tea", "tan", "ate", "nat", "bat"]

Canonical key = sorted characters of each word:

  "eat" → sort → "aet"
  "tea" → sort → "aet"   ← same key as "eat"
  "tan" → sort → "ant"
  "ate" → sort → "aet"   ← same key as "eat"
  "nat" → sort → "ant"   ← same key as "tan"
  "bat" → sort → "abt"

HashMap groups:
  ┌───────┬─────────────────────┐
  │  Key  │       Values        │
  ├───────┼─────────────────────┤
  │ "aet" │ ["eat","tea","ate"] │
  │ "ant" │ ["tan","nat"]       │
  │ "abt" │ ["bat"]             │
  └───────┴─────────────────────┘
```

### How does it work?
1. Create an empty hash map `groups` that maps a key → list of elements.
2. Walk through each element `x`.
3. Compute the canonical key `k = keyFunction(x)`. (For anagrams: sort the characters of `x`.)
4. If `k` is not yet in the map, create a new empty list for it.
5. Append `x` to `groups[k]`.
6. After the loop, return all the value-lists in the map.

### Why does it work?
Any two elements that are "equivalent" (anagrams, same frequency signature, etc.) will produce the *same* canonical key. The hash map automatically clusters them together without you needing to compare elements pairwise. The creative insight is choosing the right key function.

### When to use?
- "Group all anagrams together" or "find all groups of equivalent strings."
- Any problem where elements can be transformed into a common form that collapses equivalent ones.
- When you need to partition a collection without explicit pairwise comparison.
- Keywords: "group", "bucket", "cluster", "equivalent", "same letters".

### When NOT to use?
- Equivalence is defined by pairwise relationships between elements, not a property of each element alone — use Union-Find instead.
- Only two elements to compare — simpler direct check (e.g., sort both strings, compare).

### How to recognize in a new problem?
Ask: "Can I write a function `f(x)` such that `f(x) == f(y)` if and only if `x` and `y` belong in the same group?" If yes, you have a key function — build the map.

Concrete signals:
- "Group anagrams" → key = sorted string.
- "Group strings that are shifts of each other" → key = tuple of character differences between adjacent chars.
- "Find all isomorphic strings" → key = the pattern of first-occurrence indices (e.g., "egg" → "0,1,1").

### Simple Example
Input: `["eat", "tea", "tan", "ate", "nat", "bat"]`

Expected output: `[["eat","tea","ate"], ["tan","nat"], ["bat"]]`

Trace:
```
"eat" → key "aet" → groups = {"aet": ["eat"]}
"tea" → key "aet" → groups = {"aet": ["eat","tea"]}
"tan" → key "ant" → groups = {"aet": ["eat","tea"], "ant": ["tan"]}
"ate" → key "aet" → groups = {"aet": ["eat","tea","ate"], "ant": ["tan"]}
"nat" → key "ant" → groups = {"aet": ["eat","tea","ate"], "ant": ["tan","nat"]}
"bat" → key "abt" → groups = {"aet": [...], "ant": [...], "abt": ["bat"]}
```

### Code
```java
// Java
public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String word : strs) {
        char[] chars = word.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);  // canonical key = sorted word
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
    }
    return new ArrayList<>(groups.values());
}
```
```javascript
// JavaScript
function groupAnagrams(strs) {
    const groups = {};
    for (const word of strs) {
        const key = word.split('').sort().join('');  // canonical key = sorted word
        if (!groups[key]) groups[key] = [];
        groups[key].push(word);
    }
    return Object.values(groups);
}
```

### Dry Run
Input: `["bat", "tab", "cat"]`

| Word | key (sorted) | groups map |
|------|-------------|------------|
| "bat" | "abt" | {"abt": ["bat"]} |
| "tab" | "abt" | {"abt": ["bat","tab"]} |
| "cat" | "act" | {"abt": ["bat","tab"], "act": ["cat"]} |

Result: `[["bat","tab"], ["cat"]]`

### Complexity
```
Time:  O(n * L log L) — n words, each sorted in O(L log L) where L = average word length
       O(n * L) is possible using a frequency-count array as key (avoids sorting)
Space: O(n * L) — storing all words in the map
```

### Common Trap
- **Sorting vs. frequency-array key.** Sorted-string key is easier to code but O(L log L) per word. A character-frequency array key (e.g., `"#3#0#0..."` for counts of a, b, c...) is O(L) but harder to implement correctly under pressure. In an interview, say both, then code whichever feels cleaner.
- **Forgetting to initialize the list.** Always use `computeIfAbsent` (Java) or a null check (JS) before appending — a missing list causes a NullPointerException or silent bug.

### Experience Tip
**Experience Tip:** Group Anagrams is the canonical "Group by Key" problem. Once you see the key = sorted string trick, apply it broadly. The creative part of every new "grouping" problem is finding the right key function — that's what interviewers are testing.

### Do Not Confuse With
- **Frequency Count:** Counts how many times each element appears. Grouping collects elements that share the same identity into lists. Different output shapes.
- **Union-Find:** Groups elements based on pairwise connections (edges). Use it when equivalence is relational, not derivable from a single element.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 49 | Group Anagrams | Medium | Key = sorted string; all anagrams share the same key | https://leetcode.com/problems/group-anagrams/ |
| 242 | Valid Anagram | Easy | Build freq map for one string, decrement for the other | https://leetcode.com/problems/valid-anagram/ |
| 290 | Word Pattern | Easy | Key function maps chars to words bijectively | https://leetcode.com/problems/word-pattern/ |
| 347 | Top K Frequent Elements | Medium | Group numbers by their frequency, then pick top K | https://leetcode.com/problems/top-k-frequent-elements/ |
| 383 | Ransom Note | Easy | Can one freq map fully cover another? | https://leetcode.com/problems/ransom-note/ |

### One-Minute Revision
```
ALGORITHM:     Grouping by Key
IN SIMPLE WORDS: Compute a canonical key per element. Elements with the same key land in the same bucket.
USE WHEN:      Group equivalent elements (anagrams, isomorphs, shifted strings).
DON'T USE WHEN: Equivalence is relational (pairwise) → Union-Find.
CORE IDEA:     A good key function makes equivalent elements indistinguishable. The map does the grouping automatically.
TRACK:         HashMap<canonicalKey, List<element>>
TIME:          O(n * cost_of_key_function)
SPACE:         O(n)
COMMON TRAP:   Forget to initialize the list before appending.
EXPERIENCE TIP: The creative work is the key function. Nail that, and the rest is boilerplate.
```

---

## Subarray Sum with HashMap (Prefix Sum + Hash)

### What is it?
You need to count (or find) subarrays whose elements sum to exactly K. A **prefix sum** is a running total: `prefix[i]` = sum of all elements from index 0 through index i. The insight is that the sum of any subarray from index `j+1` to `i` equals `prefix[i] - prefix[j]`. This turns the problem into "how many past prefix sums equal `prefix[i] - K`?" — a Two Sum lookup in a hash map.

### Visual
```
Array:  [1,  2,  3]    K = 3

prefix sums (including virtual 0 at start):
  idx:  -1   0   1   2
  pfx:   0   1   3   6

Question at each step: "Is (current_prefix - K) already in the map?"

  After index 0: prefix=1, need 1-3=-2. Map={0:1}. -2 absent. Store {0:1, 1:1}.
  After index 1: prefix=3, need 3-3=0.  Map={0:1,1:1}. 0 IS there (count=1)! count+=1.
  After index 2: prefix=6, need 6-3=3.  Map={0:1,1:1,3:1}. 3 IS there (count=1)! count+=1.

Total count = 2 (subarrays [1,2] and [3]).
```

### How does it work?
1. Create a hash map `prefixCount` initialized to `{0: 1}`. (The 1 represents the "empty prefix" before index 0.)
2. Set `currentPrefix = 0` and `count = 0`.
3. Walk through each element `x`.
4. Add `x` to `currentPrefix` (running total).
5. Calculate `needed = currentPrefix - K`.
6. Add `prefixCount.getOrDefault(needed, 0)` to `count`. (Each time `needed` appeared as a past prefix, there is one subarray ending here with sum K.)
7. Increment `prefixCount[currentPrefix]` by 1 (record this prefix sum).
8. Return `count`.

### Why does it work?
`sum(j+1 .. i) = prefix[i] - prefix[j]`. Setting this equal to K gives `prefix[j] = prefix[i] - K`. So for every past prefix sum that equals `prefix[i] - K`, there is one valid subarray ending at `i`. The hash map counts how many such past prefix sums exist in O(1) per query.

### When to use?
- Count subarrays with sum exactly K, **especially when the array contains negative numbers** (sliding window breaks with negatives).
- Count subarrays with sum divisible by K (use `prefix % K` as the map key).
- Find the longest subarray with sum exactly K (store *first occurrence* of each prefix sum, not count).
- Convert a 0/1 array to count subarrays with equal 0s and 1s (replace 0 → -1, then find subarray sum = 0).

### When NOT to use?
- All elements are non-negative and you want the longest/shortest subarray with sum ≤ K — use Sliding Window (O(1) space, simpler).
- You need to find max/min subarray sum (not a fixed target K) — use Kadane's algorithm.

### How to recognize in a new problem?
Ask: "Am I looking for subarrays with a specific sum, and the array has negative numbers?" If yes, this is the pattern.

Concrete signals:
- "Count subarrays with sum = K" → classic prefix sum + HashMap.
- "Longest subarray with equal number of 0s and 1s" → replace 0 with -1, find subarray with sum = 0.
- "Subarray sum divisible by K" → use prefix % K as the map key.

### Simple Example
Input: `nums = [1, 2, 3]`, `k = 3`

Expected output: `2` (subarrays `[1,2]` and `[3]`)

Trace:
```
Start: prefixCount = {0:1}, currentPrefix = 0, count = 0

Step 1: x=1. currentPrefix=1. needed=1-3=-2. prefixCount has no -2. count=0. Store: {0:1, 1:1}.
Step 2: x=2. currentPrefix=3. needed=3-3=0.  prefixCount has 0 (count=1). count=1. Store: {0:1,1:1,3:1}.
Step 3: x=3. currentPrefix=6. needed=6-3=3.  prefixCount has 3 (count=1). count=2. Store: {0:1,1:1,3:1,6:1}.

Answer: 2
```

### Code
```java
// Java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> prefixCount = new HashMap<>();
    prefixCount.put(0, 1);  // CRITICAL: seed before the loop
    int currentPrefix = 0;
    int count = 0;
    for (int num : nums) {
        currentPrefix += num;
        int needed = currentPrefix - k;
        count += prefixCount.getOrDefault(needed, 0);  // query BEFORE storing
        prefixCount.put(currentPrefix, prefixCount.getOrDefault(currentPrefix, 0) + 1);
    }
    return count;
}
```
```javascript
// JavaScript
function subarraySum(nums, k) {
    const prefixCount = new Map([[0, 1]]);  // CRITICAL: seed before the loop
    let currentPrefix = 0;
    let count = 0;
    for (const num of nums) {
        currentPrefix += num;
        const needed = currentPrefix - k;
        count += prefixCount.get(needed) || 0;  // query BEFORE storing
        prefixCount.set(currentPrefix, (prefixCount.get(currentPrefix) || 0) + 1);
    }
    return count;
}
```

### Dry Run
Input: `nums = [1, 2, 3]`, `k = 3`

| Step | num | currentPrefix | needed | prefixCount (before query) | count |
|------|-----|---------------|--------|----------------------------|-------|
| init | — | 0 | — | {0:1} | 0 |
| 1 | 1 | 1 | -2 | {0:1} (-2 absent) | 0 |
| 2 | 2 | 3 | 0 | {0:1, 1:1} (0 → count 1) | 1 |
| 3 | 3 | 6 | 3 | {0:1, 1:1, 3:1} (3 → count 1) | 2 |

### Complexity
```
Time:  O(n) — one pass; each map operation is O(1) average
Space: O(n) — at most n distinct prefix sums stored in the map
```

### Common Trap
- **Forgetting `{0: 1}` seed.** Without it, subarrays that start at index 0 are never counted. For example, if `nums = [3]` and `k = 3`, `currentPrefix` becomes 3, `needed` = 0, but if 0 is not in the map, `count` stays 0 — wrong answer. Always seed before the loop.
- **Updating the map before querying.** If you store `currentPrefix` BEFORE checking for `needed`, a subarray could count itself (an element equal to K would "find" itself). Always query, then store.

### Experience Tip
**Experience Tip:** This pattern trips up even experienced candidates because the `{0:1}` seed feels arbitrary until you understand why. Once you do, it clicks permanently. In interviews, state it explicitly: "I seed the map with {0:1} to handle subarrays that start at index 0." That one sentence shows deep understanding.

### Do Not Confuse With
- **Sliding Window:** Works only for non-negative arrays. Cannot handle negatives because shrinking the window doesn't always decrease the sum. Use prefix sum + HashMap when negatives are present.
- **Kadane's Algorithm:** Finds the maximum subarray sum (no fixed target K). Different goal.

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 560 | Subarray Sum Equals K | Medium | Classic — seed {0:1}, query before storing | https://leetcode.com/problems/subarray-sum-equals-k/ |
| 128 | Longest Consecutive Sequence | Medium | HashSet + start-of-streak detection, O(n) | https://leetcode.com/problems/longest-consecutive-sequence/ |
| 1 | Two Sum | Easy | The complement lookup idea is the same as here | https://leetcode.com/problems/two-sum/ |
| 347 | Top K Frequent Elements | Medium | Build freq map, then bucket sort by frequency | https://leetcode.com/problems/top-k-frequent-elements/ |
| 217 | Contains Duplicate | Easy | Simplest existence check — warm up before harder ones | https://leetcode.com/problems/contains-duplicate/ |

### One-Minute Revision
```
ALGORITHM:     Subarray Sum with HashMap (Prefix Sum + Hash)
IN SIMPLE WORDS: Track running sum. For each position, ask: has the running sum been (current - K) before?
USE WHEN:      Count/find subarrays with sum = K, especially with negative numbers.
DON'T USE WHEN: All non-negative and need longest/shortest subarray → Sliding Window.
CORE IDEA:     sum(j..i) = prefix[i] - prefix[j]. This is Two Sum applied to prefix sums.
TRACK:         HashMap<prefixSum, count>. Seed with {0:1} BEFORE the loop.
TIME:          O(n)
SPACE:         O(n)
COMMON TRAP:   Forget {0:1} seed → miss subarrays starting at index 0. Update map AFTER querying.
EXPERIENCE TIP: Say "{0:1} handles subarrays starting at index 0" in the interview. It signals mastery.
```

---

## HashSet for Existence / Deduplication

### What is it?
A **HashSet** is a hash map without values — it only stores keys. It answers one question in O(1): "Have I seen this element before?" Use it when you only need to know *whether* something exists, not how many times or where. Common uses: remove duplicates, detect cycles, check membership, find elements not in another collection.

### Visual
```
Array: [4, 1, 2, 1, 3, 2]

Walk and add to set. If already in set → duplicate detected.

  4 → set={4}
  1 → set={4,1}
  2 → set={4,1,2}
  1 → 1 is already in set! DUPLICATE FOUND.

HashSet (unordered, just keys):
  ┌───┐
  │ 4 │
  │ 1 │
  │ 2 │
  │ 3 │
  └───┘
  (no counts, no indices — just membership)
```

### How does it work?
1. Create an empty HashSet `seen`.
2. Walk through each element `x`.
3. Check: is `x` already in `seen`?
4. If YES: a duplicate exists (or whatever condition you're checking for).
5. If NO: add `x` to `seen` and continue.
6. After the loop, `seen` contains exactly one copy of every unique element.

### Why does it work?
A HashSet uses the same hash function internals as a HashMap, giving O(1) average insert and O(1) average lookup. It is essentially a HashMap where you ignore the value. Because it stores each element at most once, it naturally deduplicates.

### When to use?
- "Does the array contain any duplicates?" — add to set; if already present, yes.
- "Find elements in array A that are NOT in array B" — add B to a set, scan A checking membership.
- "Detect a cycle in a sequence" — track visited states; if you revisit one, there's a cycle.
- Any time you only need a yes/no answer about membership, not a count or index.

### When NOT to use?
- You need counts — use a HashMap instead.
- You need sorted order — use a TreeSet (O(log n) per operation instead of O(1)).
- You need to find the actual index of an element — use a HashMap<value, index>.

### How to recognize in a new problem?
Ask: "Do I only care whether something EXISTS, not how many times?" If yes, a HashSet is your tool.

Concrete signals:
- "Contains duplicate" → classic HashSet membership check.
- "Longest consecutive sequence" → add all to a set; only start counting from elements with no predecessor in the set.
- "Detect cycle in a happy number sequence" → track seen sums in a set.

### Simple Example
Input: `nums = [1, 2, 3, 1]`

Expected output: `true` (1 appears twice)

Trace:
```
seen = {}
x=1: not in seen. Add. seen={1}
x=2: not in seen. Add. seen={1,2}
x=3: not in seen. Add. seen={1,2,3}
x=1: 1 IS in seen. Return true.
```

### Code
```java
// Java — Contains Duplicate
public boolean containsDuplicate(int[] nums) {
    Set<Integer> seen = new HashSet<>();
    for (int num : nums) {
        if (seen.contains(num)) return true;
        seen.add(num);
    }
    return false;
}

// Java — Longest Consecutive Sequence
public int longestConsecutive(int[] nums) {
    Set<Integer> numSet = new HashSet<>();
    for (int num : nums) numSet.add(num);
    int longest = 0;
    for (int num : numSet) {
        if (!numSet.contains(num - 1)) {  // only start counting from streak beginnings
            int currentNum = num;
            int length = 1;
            while (numSet.contains(currentNum + 1)) {
                currentNum++;
                length++;
            }
            longest = Math.max(longest, length);
        }
    }
    return longest;
}
```
```javascript
// JavaScript — Contains Duplicate
function containsDuplicate(nums) {
    const seen = new Set();
    for (const num of nums) {
        if (seen.has(num)) return true;
        seen.add(num);
    }
    return false;
}

// JavaScript — Longest Consecutive Sequence
function longestConsecutive(nums) {
    const numSet = new Set(nums);
    let longest = 0;
    for (const num of numSet) {
        if (!numSet.has(num - 1)) {  // only start counting from streak beginnings
            let length = 1;
            while (numSet.has(num + length)) length++;
            longest = Math.max(longest, length);
        }
    }
    return longest;
}
```

### Dry Run
Input (Longest Consecutive): `nums = [100, 4, 200, 1, 3, 2]`

| num | num-1 in set? | Streak starting here | length |
|-----|---------------|----------------------|--------|
| 100 | 99? No | 100 → (101 absent) | 1 |
| 4 | 3? Yes | skip (not a streak start) | — |
| 200 | 199? No | 200 → (201 absent) | 1 |
| 1 | 0? No | 1→2→3→4→(5 absent) | 4 |
| 3 | 2? Yes | skip | — |
| 2 | 1? Yes | skip | — |

Result: `4` (streak 1,2,3,4)

Why is this O(n) despite the inner `while`? Each number is visited as a "streak start" at most once (only when `num-1` is absent). The inner while loop walks a number at most once total across all outer iterations.

### Complexity
```
Time:  O(n) — each element added once and visited in the inner loop at most once
Space: O(n) — the set stores at most n elements
```

### Common Trap
- **Using a HashSet when you need counts.** A set only tracks existence. If the problem asks "how many times does X appear?", you need a HashMap.
- **Missing the "streak start" check in Longest Consecutive.** Without `if (!set.contains(num - 1))`, the inner while loop runs from EVERY element, making it O(n²). The guard is what makes it O(n).

### Experience Tip
**Experience Tip:** The Longest Consecutive Sequence O(n) solution is a classic interview trick question. The inner loop LOOKS like it makes it O(n²), but the "only start from streak beginnings" guard ensures each number is touched by the inner loop at most once. Practice explaining this clearly — interviewers specifically test whether you can prove the O(n) bound.

### Do Not Confuse With
- **HashMap:** Stores key-value pairs. Use when you need counts, indices, or groupings alongside the element. A HashSet is just a HashMap where the value is ignored.
- **Frequency Count pattern:** Counts occurrences. HashSet only tracks presence — "has this appeared at least once?"

### LeetCode Practice
| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 217 | Contains Duplicate | Easy | Add to set; if already present, return true | https://leetcode.com/problems/contains-duplicate/ |
| 128 | Longest Consecutive Sequence | Medium | Only start counting where num-1 is absent — that's the O(n) key | https://leetcode.com/problems/longest-consecutive-sequence/ |
| 202 | Happy Number | Easy | Detect cycle: if digit-sum reappears, it's not a happy number | https://leetcode.com/problems/happy-number/ |
| 349 | Intersection of Two Arrays | Easy | Add one array to a set, check the other for membership | https://leetcode.com/problems/intersection-of-two-arrays/ |
| 560 | Subarray Sum Equals K | Medium | Upgrade from set to map when you need counts of prefix sums | https://leetcode.com/problems/subarray-sum-equals-k/ |

### One-Minute Revision
```
ALGORITHM:     HashSet for Existence / Deduplication
IN SIMPLE WORDS: Store elements as you walk. Check if you've seen something before in O(1).
USE WHEN:      Duplicate detection, cycle detection, membership check, deduplication.
DON'T USE WHEN: Need counts → HashMap. Need sorted order → TreeSet. Need indices → HashMap.
CORE IDEA:     O(1) membership check. Each element stored at most once.
TRACK:         HashSet<element> — membership only, no values
TIME:          O(n)
SPACE:         O(n)
COMMON TRAP:   Longest Consecutive — missing the "streak start" guard makes it O(n²) not O(n).
EXPERIENCE TIP: Prove the O(n) bound for Longest Consecutive out loud. Interviewers test this specifically.
```

---

## Quick Reference — Which Pattern?

```
"count occurrences / frequency"              →  Frequency Count
"find two elements summing to target"        →  Two Sum / Complement Lookup
"group equivalent elements (anagrams)"       →  Grouping by Key
"count subarrays with sum = K (negatives)"   →  Subarray Sum + HashMap (prefix)
"does X exist / contains duplicate"          →  HashSet

SORTED array + find pair       →  Two Pointers (O(1) space, not HashMap)
NON-NEGATIVE + sliding window  →  Sliding Window (O(1) space, not prefix sum)
PAIRWISE connections           →  Union-Find (not HashMap grouping)
TINY key range (a-z)           →  int[26] array (not HashMap)
```

---

*Next: [06-LINKED-LISTS.md](06-LINKED-LISTS.md) — Pointer manipulation and the art of node surgery.*
