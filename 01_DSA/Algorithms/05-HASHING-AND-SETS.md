# Hashing & Sets — Complete Pattern Guide

> *"A HashMap is the Swiss Army knife of DSA. When you need to go from O(n²) to O(n), your first instinct should be: can I trade space for time with a hash?"*

---

## Table of Contents

1. [Frequency Counting](#frequency-counting)
2. [Two-Sum Pattern Family](#two-sum-pattern-family)
3. [Group By Key Pattern](#group-by-key-pattern)
4. [Subarray Sum + HashMap](#subarray-sum--hashmap)
5. [Sliding Window + HashMap](#sliding-window--hashmap)
6. [Hash Set for Existence/Uniqueness](#hash-set-for-existenceuniqueness)
7. [Rolling Hash](#rolling-hash)
8. [Consistent Hashing (Design Context)](#consistent-hashing-design-context)

---

## Frequency Counting

### What is this approach?

**Intuition:** You are counting votes. For each ballot, mark a tally next to that candidate's name. At the end, you know exactly how many votes each candidate has. That tally sheet is a frequency map.

**Formal:** Use a HashMap (or array if values are bounded) to count the occurrence of each element. This is the most basic and versatile hashing pattern.

### When should I use this?

- Count occurrences of elements
- Find the most/least frequent element
- Check if two collections are "equivalent" (e.g., anagrams)
- Keywords: "frequency," "count," "how many times," "most common," "anagram"

### When should I NOT use this?

- You don't need counts — just existence checks (use a HashSet instead)
- The values are in a tiny range (0-25 for lowercase letters) — use an array, it's faster
- You need ordered frequency information — combine with sorting or a heap

### Core Idea

1. Initialize an empty map
2. Iterate through the collection, incrementing map[element] for each element
3. Query the map for counts, max, presence, etc.

### Complexity

- **Time:** O(n) to build, O(1) per lookup
- **Space:** O(K) where K = number of distinct elements

### Variants

- **Single Frequency Count:** Count occurrences of each element
- **Two Frequency Maps Comparison:** Build maps for two collections, compare (anagram check, permutation check)
- **Frequency of Frequencies:** "How many elements appear exactly K times?" Build freq map, then count map values.
- **Top K Frequent Elements:** Build freq map, then use heap or bucket sort on frequencies. See [Heaps](12-HEAPS-AND-PRIORITY-QUEUES.md) and [Bucket Sort](04-SORTING-AND-ORDER.md#bucket-sort).

### Related Patterns

- [Two-Sum Pattern Family](#two-sum-pattern-family) (uses hash for complement lookup)
- [Sliding Window + HashMap](#sliding-window--hashmap) (frequency counting within a window)
- [Boyer-Moore Voting](02-ARRAYS-AND-STRINGS.md#boyer-moore-voting-algorithm) (O(1) space alternative for majority)

### Interview Insights

- **Trap:** Using a HashMap when an array suffices. For lowercase letters, a 26-element array is cleaner and faster.
- **Twist:** "Sort by frequency, then alphabetically" — Build freq map, then custom sort using frequency as primary key.
- **Follow-up:** "What if the data is streaming?" — Approximate frequency counting (Count-Min Sketch) for large streams.

---

## Two-Sum Pattern Family

### What is this approach?

**Intuition:** You are looking for a dance partner. Instead of checking everyone against everyone (O(n²)), you announce your "need" (target - your_height) and check if anyone with that height has already registered. Each person registers as they arrive. One pass, every match found.

**Formal:** For each element, calculate what complementary element is needed. Look up if that complement exists in a HashMap. Store each element as you go. This reduces pairwise search from O(n²) to O(n).

### When should I use this?

- Find a **pair** (or triplet, quadruplet) with a given sum or difference
- The array is **unsorted** and you want O(n) time
- You need to return **indices** (not just values — can't sort without losing indices)
- Keywords: "two sum," "pair with sum," "complement," "target sum"

### When should I NOT use this?

- The array is **sorted** — Two Pointers is simpler and uses O(1) space
- You need **all pairs** — HashMap finds matches in one pass, but you must handle duplicates carefully
- The target involves more than two elements and n is small enough for O(n²) — sometimes simpler to nest loops

### Core Idea

**Two Sum:**
1. Initialize empty HashMap (value → index)
2. For each element arr[i]:
   - complement = target - arr[i]
   - If complement exists in map, return [map[complement], i]
   - Else, store map[arr[i]] = i
3. One pass, O(n) time, O(n) space

### Complexity

- **Time:** O(n) for Two Sum
- **Space:** O(n) for the HashMap

### Variants

- **Two Sum (return indices):** HashMap, as described. The classic.
- **Two Sum (sorted array):** Two Pointers — O(1) space, no HashMap needed.
- **Two Sum (multiple pairs):** Store all indices for each value, or count pairs with frequency map.
- **Three Sum (sum to 0):** Sort, then for each element fix it and run Two Sum on the remainder using Two Pointers. O(n²).
- **Three Sum Closest:** Similar to Three Sum but track the closest sum instead of exact match.
- **Four Sum:** Sort, then nest two loops (fix two elements) + Two Pointers inner. O(n³). Or HashMap of pair sums for O(n²) but with more complex duplicate handling.
- **Two Sum — Data Structure Design:** Implement a class with `add(number)` and `find(target)`. Store elements in a HashMap (value → count). `find` checks for complement.
- **Two Difference (Two Sum variant):** "Find pair with difference = K." Use HashMap: for each element, check if element + K or element - K exists.
- **Subarray Sum = K:** Not a direct two-sum variant, but uses the same "complement lookup" idea on prefix sums. See [Subarray Sum + HashMap](#subarray-sum--hashmap).

### Related Patterns

- [Two Pointers — Opposite Direction](02-ARRAYS-AND-STRINGS.md#two-pointers--opposite-direction) (O(1) space alternative for sorted data)
- [Prefix Sum + HashMap](#subarray-sum--hashmap) (extends the complement idea to subarrays)
- [Frequency Counting](#frequency-counting) (the underlying data structure)

### Interview Insights

- **Trap:** Two Sum is "easy" but a common warm-up question. The interviewer assesses if you can articulate the HashMap approach clearly, handle edge cases (duplicate values, element used twice), and analyze complexity.
- **Trap:** For Three Sum, forgetting to skip duplicate elements after sorting leads to duplicate triplets.
- **Twist:** "What if you need to handle very large arrays?" — Discuss memory constraints. Two Pointers on sorted data uses O(1) space.
- **Follow-up:** "Design a data structure for Two Sum queries" — Class with HashMap, O(1) add, O(n) find.

---

## Group By Key Pattern

### What is this approach?

**Intuition:** Sorting mail into mailboxes. Each letter gets a label (the key), and letters with the same label go in the same box. The key design is the creative part — how do you define "same group?"

**Formal:** Use a HashMap where the key represents a group identity and the value is a list of elements belonging to that group. The art is choosing the right key function.

### When should I use this?

- Group elements by some **equivalence relation** (anagram groups, isomorphic strings, same remainder, etc.)
- Keywords: "group anagrams," "group by," "categorize," "isomorphic"

### When should I NOT use this?

- Elements don't have a natural grouping
- Grouping depends on pairwise relationships (not a simple key) — consider Union-Find instead

### Core Idea

1. Define a **key function** that maps each element to its group identity
2. Iterate elements, for each: compute key, add element to map[key]
3. Return the groups

**Key design examples:**
- **Group Anagrams:** Key = sorted string (e.g., "eat" → "aet") or frequency tuple
- **Isomorphic Strings:** Key = pattern of first-occurrence indices (e.g., "egg" → "0.1.1")
- **Group Shifted Strings:** Key = tuple of differences between consecutive characters

### Complexity

- **Time:** O(n × K) where K = cost of computing the key per element (e.g., sorting a string of length L = O(L log L))
- **Space:** O(n) for the HashMap

### Variants

- **Group Anagrams:** Key = sorted string or character frequency tuple
- **Isomorphic Strings / Word Pattern:** Key = normalized pattern
- **Group Shifted Strings:** Key = difference sequence
- **Encode and Group:** When the key derivation is itself the interesting part

### Related Patterns

- [Frequency Counting](#frequency-counting) (often used inside the key function)
- [Union-Find](11-GRAPHS.md) (for grouping based on pairwise connections instead of shared keys)

### Interview Insights

- **Trap:** For "Group Anagrams," sorting each string is O(L log L). Using a frequency count as key is O(L) but requires a hashable representation (tuple, string).
- **Twist:** "What if the alphabet is large (Unicode)?" — Sorting-based key is more robust than fixed-size frequency array.
- **Follow-up:** "What if you need to stream elements and query groups on the fly?" — Use the HashMap as a live data structure.

---

## Subarray Sum + HashMap

### What is this approach?

**Intuition:** You are walking along a number line, tracking your cumulative position (prefix sum). Someone asks: "Was there a point in your walk where you were exactly K steps behind where you are now?" If yes, then the segment between that point and your current position sums to exactly K. You check your journal (HashMap) of all past positions.

**Formal:** Combine prefix sums with a HashMap to count subarrays with a given sum. At each index, prefix[i] - prefix[j] = sum of subarray [j+1, i]. So "subarray sum = K" is equivalent to "exists j < i such that prefix[i] - prefix[j] = K", which is "prefix[j] = prefix[i] - K". Store prefix sums in a HashMap.

### When should I use this?

- **"Count subarrays with sum = K"** — especially when the array has **negative numbers** (sliding window fails)
- **"Subarray sum divisible by K"** — use prefix_sum % K as the key
- **"Longest subarray with sum = K"** — store the first occurrence of each prefix sum
- **"Subarray with equal 0s and 1s"** — convert 0 → -1, then find subarray sum = 0
- Keywords: "subarray sum," "count subarrays," "sum equals K," "divisible by K"

### When should I NOT use this?

- All elements are non-negative and you want "sum ≤ K" — sliding window works and is simpler
- You want the actual subarray contents (not just count/length) — prefix sum + HashMap gives positions, then extract
- The problem is about subsequences (non-contiguous) — prefix sum only works for contiguous

### Core Idea

1. Initialize: HashMap = {0: 1} (prefix sum 0 occurs once at the "virtual" start), current_prefix = 0, count = 0
2. For each element:
   - current_prefix += arr[i]
   - If (current_prefix - K) exists in HashMap, count += HashMap[current_prefix - K]
   - Add current_prefix to HashMap: HashMap[current_prefix]++
3. Return count

**Why HashMap = {0: 1}?** If current_prefix == K at some point, then subarray [0, i] itself has sum K. The base case prefix sum of 0 ensures this subarray is counted.

### Complexity

- **Time:** O(n) — single pass, HashMap lookups are O(1)
- **Space:** O(n) — for the HashMap

### Variants

- **Count Subarrays with Sum = K:** Standard version above
- **Count Subarrays Divisible by K:** Key = prefix_sum % K (handle negative mod correctly!)
- **Longest Subarray with Sum = K:** Store first occurrence of each prefix sum. Length = i - map[prefix - K].
- **Binary Subarrays with Sum = K (0/1 array):** Same technique, or sliding window since elements are non-negative.
- **Contiguous Array (0s and 1s):** Replace 0 with -1, find longest subarray with sum = 0.
- **Subarray XOR = K:** Use prefix XOR + HashMap (same idea, XOR instead of sum).
- **Count Subarrays Where sum % K = target:** Use modular arithmetic on prefix sums.

### Related Patterns

- [Prefix Sum](02-ARRAYS-AND-STRINGS.md#prefix-sum) (the underlying precomputation)
- [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window--variable-size) (simpler alternative when all elements ≥ 0)
- [Two-Sum Pattern](#two-sum-pattern-family) (same "complement lookup" logic applied to prefix sums)

### Interview Insights

- **Trap:** Forgetting the base case {0: 1}. Without it, subarrays starting at index 0 are missed.
- **Trap:** Negative modulo. In many languages, (-3) % 5 = -3, not 2. You need ((prefix % K) + K) % K to handle negatively correctly.
- **Twist:** "0s and 1s equal count" → Replace 0 with -1, find longest subarray with sum = 0. This transformation is the hard insight.
- **Follow-up:** "What if K changes per query?" — Precompute all prefix sums, then different K values require different HashMap passes (or offline processing).
- **Key insight:** This pattern is the #1 technique for subarray problems with negative numbers. Sliding window fails; prefix sum + HashMap is the rescue.

---

## Sliding Window + HashMap

### What is this approach?

This section is a brief recap — the detailed treatment is in [02-ARRAYS-AND-STRINGS.md — Sliding Window with HashMap](02-ARRAYS-AND-STRINGS.md#sliding-window-with-hashmap).

**Summary:** Use a HashMap as the window state for sliding window problems where the validity condition depends on character/element frequencies.

**Key applications:**
- Minimum Window Substring
- Longest Substring Without Repeating Characters
- Find All Anagrams
- Longest Substring with At Most K Distinct Characters
- Permutation in String

**When to use:** The window's validity is about frequencies, counts, or membership.

---

## Hash Set for Existence/Uniqueness

### What is this approach?

**Intuition:** A guest list at a party. You don't care how many times someone's name appears — you only care whether they are on the list or not. That is a set.

**Formal:** A HashSet provides O(1) average-time insert, delete, and contains operations. It stores only unique elements.

### When should I use this?

- "Does element X exist in the collection?"
- "How many distinct elements?"
- "Find the intersection / union / difference of two collections"
- Remove duplicates
- Keywords: "contains," "exists," "unique," "distinct," "duplicate"

### When should I NOT use this?

- You need counts (use HashMap)
- You need ordered access (use TreeSet / sorted structure)
- Space is severely limited (consider bit vector or bloom filter)

### Core Idea

- Insert, lookup, and delete in O(1) amortized
- Built on hashing: element → hash → bucket → stored

### Complexity

- **Time:** O(1) average per operation
- **Space:** O(n) for n elements

### Variants

- **Contains Duplicate:** Add to set; if already present, duplicate found.
- **Intersection of Two Arrays:** Add one to set, scan other and check membership.
- **Longest Consecutive Sequence:** Add all to set. For each element, if element-1 NOT in set (start of streak), count consecutive elements forward. O(n).
- **Happy Number:** Detect cycles using a set of seen sums.

### Related Patterns

- [Frequency Counting](#frequency-counting) (when you also need counts)
- [Bit Manipulation](14-BIT-MANIPULATION.md) (bit vector as a compact set)

### Interview Insights

- **Trap:** "Longest Consecutive Sequence" — Many try sorting (O(n log n)). The HashSet approach is O(n). The key insight: only start counting from the beginning of each streak.
- **Twist:** "Contains Duplicate with distance constraint (nums[i] == nums[j] and |i - j| ≤ K)" — Use a HashMap mapping value → most recent index.
- **Follow-up:** "Contains Duplicate within value range (|nums[i] - nums[j]| ≤ t)" — Bucket of size t+1. Each element goes in bucket = value / (t+1). Check current and adjacent buckets only.

---

## Rolling Hash

### What is this approach?

**Intuition:** Instead of comparing two strings character by character (which takes O(L) time), compute a numeric "fingerprint" for each string. If fingerprints match, the strings probably match. The trick: when you slide the window one character, you can update the fingerprint in O(1) instead of recomputing from scratch.

**Formal:** A hash function for strings that can be incrementally updated when the window shifts by one character. Used in Rabin-Karp algorithm and other substring matching problems.

### When should I use this?

- Pattern matching in strings (Rabin-Karp)
- Detecting duplicate substrings of a given length
- Comparing substrings quickly
- Keywords: "pattern matching," "repeated substring," "longest duplicate substring"

### When should I NOT use this?

- Exact matching is needed with 100% correctness — rolling hash has collision risk (verify with actual comparison on match)
- The pattern length is very small — brute force or KMP may be simpler
- You need the actual matching positions efficiently — KMP is more direct

### Core Idea

**Hash function:** hash = (c₁ × base^(L-1) + c₂ × base^(L-2) + ... + c_L × base^0) mod prime

**Rolling update:** When the window shifts from position i to i+1:
- Remove the contribution of the outgoing character: hash -= c_i × base^(L-1)
- Shift remaining characters: hash *= base
- Add incoming character: hash += c_{i+L}
- All operations mod prime

### Complexity

- **Time:** O(n) average for searching (O(nm) worst case with many collisions)
- **Space:** O(1) for the hash value

### Variants

- **Rabin-Karp Single Pattern:** Rolling hash for one pattern over a text
- **Rabin-Karp Multiple Patterns:** Hash multiple patterns, check all at once (or use Aho-Corasick)
- **Longest Duplicate Substring:** Binary search on length + rolling hash check for duplicate hashes
- **Double Hashing:** Use two different hash functions to minimize collision probability

### Related Patterns

- [Rabin-Karp Algorithm](17-STRING-ALGORITHMS.md) (full treatment)
- [KMP Algorithm](17-STRING-ALGORITHMS.md) (deterministic alternative)
- [Sliding Window](02-ARRAYS-AND-STRINGS.md#sliding-window--fixed-size) (rolling hash IS a sliding window on hash values)

### Interview Insights

- **Trap:** Hash collisions. Always verify matches with actual string comparison. Rolling hash gives false positives but never false negatives.
- **Twist:** "Longest Duplicate Substring" — Binary search on length K, use rolling hash to find any duplicate of that length. O(n log n) average.
- **Follow-up:** "How to handle hash collisions?" — Double hashing (two different primes/bases) makes collision probability negligible.

---

## Consistent Hashing (Design Context)

### What is this approach?

**Intuition:** You have N servers arranged in a circle. Each key is hashed to a point on the circle. It gets assigned to the first server clockwise from that point. Adding/removing a server only affects keys near that server, NOT all keys.

**Formal:** A hashing scheme where keys and servers are mapped to a ring (hash space). Keys are assigned to the nearest server clockwise. This minimizes key redistribution when servers are added/removed. Used in distributed system design interviews.

### When should I use this?

- **System design interviews** involving distributed caching, load balancing, or sharding
- When asked about **scaling** a key-value store across multiple nodes
- Keywords: "distribute data across servers," "add/remove servers," "load balancing," "CDN," "distributed cache"

### When should I NOT use this?

- Coding interviews (this is a design concept, not a coding pattern)
- Simple single-machine problems

### Core Idea

1. Hash both servers and keys to a circular hash space (ring)
2. Each key is assigned to the next server clockwise on the ring
3. **Virtual nodes:** Each physical server gets multiple positions on the ring to improve load distribution
4. When a server is added, only keys between this server and the previous server (on the ring) need to move
5. When a server is removed, its keys move to the next server clockwise

### Complexity

- **Lookup:** O(log N) with sorted server positions and binary search
- **Key redistribution on server change:** Only K/N keys move on average (K = total keys, N = servers)

### Interview Insights

- **Trap:** Without virtual nodes, load is uneven (some servers get many more keys). Always mention virtual nodes.
- **Twist:** "How do you handle hotspots?" — More virtual nodes for servers with more capacity. Combine with caching layer.
- **Note:** This is strictly for system design rounds, not coding rounds.

---

*Next: [06-LINKED-LISTS.md](06-LINKED-LISTS.md) — Pointer manipulation and the art of node surgery.*
