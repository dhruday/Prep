# String Algorithms — Complete Pattern Guide

> *"String problems are where arrays meet combinatorics. The key insight: strings have structure (repeated patterns, prefixes, suffixes) that clever algorithms exploit."*

---

## Table of Contents

1. [KMP (Knuth-Morris-Pratt)](#kmp-knuth-morris-pratt)
2. [Rabin-Karp (Rolling Hash)](#rabin-karp-rolling-hash)
3. [Z-Algorithm](#z-algorithm)
4. [Manacher's Algorithm](#manachers-algorithm)
5. [Suffix Array and Suffix Tree Concepts](#suffix-array-and-suffix-tree-concepts)
6. [Aho-Corasick](#aho-corasick)
7. [String Matching Decision Guide](#string-matching-decision-guide)

---

## KMP (Knuth-Morris-Pratt)

### What is this approach?

**Intuition:** When a mismatch occurs during pattern matching, naive search restarts from the next character. But we've already seen some characters that we know match a PREFIX of the pattern. KMP pre-computes a "failure function" (also called pi/lps array) that tells us: "on a mismatch, how far back in the pattern can we jump without missing a potential match?"

### When should I use this?

- "Find if pattern P exists in text T"
- "Find ALL occurrences of P in T"
- "Shortest repeating unit of a string"
- "Check if one string is a rotation of another"
- Keywords: "pattern matching," "substring search," "repeating pattern"

### When should I NOT use this?

- Single occurrence in average case → built-in string search is usually fine
- Multiple patterns → Aho-Corasick is better
- Need approximate matching → different techniques (edit distance)

### Core Idea

**Step 1 — Build Failure Function (LPS/Pi array):**
- lps[i] = length of the longest PROPER prefix of pattern[0..i] that is also a suffix
- lps[0] = 0 always. Compute iteratively: use previous lps values to avoid recomputation.

**Step 2 — Search:**
- Two pointers: i on text, j on pattern
- Match: advance both
- Mismatch: if j > 0, set j = lps[j-1] (jump back in pattern, NOT in text). If j = 0, advance i.
- If j reaches pattern length: match found at position i - j

### Complexity

- **Preprocessing:** O(m) where m = pattern length
- **Search:** O(n) where n = text length
- **Total:** O(n + m)

### Variants

- **Repeated Substring Pattern:** String s has a repeating unit if and only if n % (n - lps[n-1]) == 0 where lps is the failure function.
- **String Rotation Check:** s2 is a rotation of s1 if and only if s1 is a substring of s2+s2. Use KMP on s2+s2 with pattern s1.

### Interview Insights

- **Key insight:** The LPS array is the algorithm's power. Understanding it deeply matters more than memorizing the search code.
- **Trap:** LPS construction itself uses the same "jump back" logic as the search. It's pattern matching the pattern against ITSELF.
- **When asked "Can you do better than O(n×m)?":** This is the cue for KMP.

---

## Rabin-Karp (Rolling Hash)

### What is this approach?

**Intuition:** Instead of comparing characters one by one, compute a HASH of the window. Slide the window: update the hash in O(1) by removing the outgoing character and adding the incoming one. If hashes match, verify with actual comparison.

### When should I use this?

- "Find pattern in text" (especially with multiple patterns)
- "Longest duplicate substring"
- "Longest common substring of two strings"
- "Check if any rotation of string A equals string B"
- Keywords: "rolling hash," "substring matching," "duplicate substring"

### Core Idea

1. Choose a base (e.g., 31) and a modulus (e.g., 10⁹+7)
2. Compute hash of pattern: hash = Σ(char × base^i) mod m
3. Compute hash of first window in text
4. Slide window: new_hash = (old_hash - outgoing_char × base^(len-1)) × base + incoming_char
5. On hash match: verify character-by-character (to handle collisions)

### Complexity

- **Average:** O(n + m)
- **Worst (many collisions):** O(n × m) — but rare with good hash

### Variants

- **Multiple Pattern Search:** Hash all patterns. Search text once, checking against the pattern hash set.
- **Longest Duplicate Substring:** Binary search on length L. For each L, use rolling hash to check if any substring of length L appears twice. O(n log n).
- **Longest Common Substring:** Binary search on length + rolling hash. Or suffix array approach.

### Interview Insights

- **Double hashing:** Use two different (base, mod) pairs to reduce collision probability.
- **When to prefer over KMP:** Multiple patterns, or problems involving "duplicate/repeated substrings" where hashing enables comparison.

---

## Z-Algorithm

### What is this approach?

**Intuition:** For a string S, Z[i] = length of the longest substring starting at i that matches a PREFIX of S. In other words, Z[i] tells you: "how much of the string starting at position i looks like the beginning of the string?"

### When should I use this?

- Same applications as KMP (pattern matching)
- "Count occurrences of pattern in text"
- "Longest prefix which is also a suffix"

### Core Idea

**Build Z-array:**
1. Maintain a "Z-box" [l, r] — the rightmost interval matching a prefix
2. For each i: if i > r, compute Z[i] naively, update [l, r]. If i ≤ r: use previously computed Z values as a starting point, extend if needed.

**Pattern Matching:** Concatenate pattern + "$" + text. Compute Z-array. Any position where Z[i] = len(pattern) is a match.

### Complexity

- **Time:** O(n)
- **Space:** O(n)

### Interview Insights

- **Z vs KMP:** Both solve the same problems in O(n). Z-algorithm is arguably more intuitive. Choose whichever you're more comfortable with.
- **The Z-array** is also useful for string compression and repeated pattern detection.

---

## Manacher's Algorithm

### What is this approach?

**Intuition:** Find the longest palindromic SUBSTRING in O(n) time. The key insight: palindromes are symmetric, so if you've found a palindrome, you can use its mirror properties to speed up finding palindromes within it.

### When should I use this?

- "Longest Palindromic Substring" in O(n)
- "Count of palindromic substrings"

### Core Idea

1. **Transform string:** Insert '#' between every character and at boundaries. "abc" → "#a#b#c#". Now all palindromes (even and odd length) become odd-length centered at some character.
2. **P[i] = radius of palindrome centered at i** in the transformed string
3. Maintain the rightmost palindrome [center, right]. For each i:
   - If i < right: mirror = 2×center - i. P[i] = min(P[mirror], right - i). Then try to expand.
   - If i ≥ right: start expanding from scratch.
4. Update [center, right] if new palindrome extends further right.

### Complexity

- **Time:** O(n)
- **Space:** O(n)

### Variants

- **Longest Palindromic Substring:** Find max P[i], convert back to original indices.
- **Count Palindromic Substrings:** Sum up ceil(P[i]/2) for each center.

### Interview Insights

- **Rarity:** Manacher's is rarely required in FAANG interviews. The O(n²) expand-around-center approach usually suffices.
- **When to mention:** If O(n) is explicitly needed, or to demonstrate algorithmic depth.
- **Simpler O(n²) alternative:** For each center (2n-1 centers: n characters + n-1 gaps), expand outward while characters match.

---

## Suffix Array and Suffix Tree Concepts

### What is this approach?

**Suffix Array:** A sorted array of all suffixes of a string, represented by their starting indices.

**Suffix Tree:** A compressed Trie of all suffixes. Every substring is a prefix of some suffix, so suffix trees can answer substring queries.

### When should I use this?

- "Longest repeated substring"
- "Longest common substring of multiple strings"
- "Count distinct substrings"
- Bioinformatics, text processing (rarely in standard interviews)

### Core Concepts

**Suffix Array Construction:**
- Naive: sort all suffixes → O(n² log n)
- Efficient: O(n log n) using doubling technique, or O(n) using SA-IS

**LCP Array:** lcp[i] = length of common prefix between suffix[i] and suffix[i-1] in sorted order. Built in O(n) from suffix array using Kasai's algorithm.

**Applications:**
- Longest repeated substring = max(lcp[i])
- Count distinct substrings = n(n+1)/2 - sum(lcp[i])
- Longest common substring: concatenate strings with unique separators, build suffix array + LCP, find max LCP where adjacent suffixes come from different strings

### Interview Insights

- **Very rare in interviews.** Knowing the concept demonstrates expertise. Implementation is complex and almost never required.
- **Simpler alternatives:** For "longest repeated substring," rolling hash + binary search is more practical in interviews.

---

## Aho-Corasick

### What is this approach?

**Intuition:** KMP for multiple patterns simultaneously. Build a Trie of all patterns, then add "failure links" (like KMP's failure function but across the Trie). Scan the text once, following Trie edges and failure links.

### When should I use this?

- "Search for MANY patterns in one text simultaneously"
- "Word filter / content matching"
- "Count how many of the given patterns appear in text"

### Core Idea

1. Build a Trie from all patterns
2. Add failure links using BFS (like KMP's lps but across Trie nodes)
3. Scan text character by character, following Trie edges and failing links
4. At each step, check if current node (or any node reachable via failure links) marks a pattern end

### Complexity

- **Build:** O(sum of pattern lengths)
- **Search:** O(text length + number of matches)

### Interview Insights

- **Very rare in standard interviews.** Appears in competitive programming and system design (e.g., content filtering systems).
- **The concept** to carry: "multi-pattern matching = Trie + failure links."

---

## String Matching Decision Guide

| Scenario | Best Algorithm |
|---|---|
| Single pattern, single search | Built-in (Python `in`, C++ `find`) |
| Single pattern, guaranteed O(n+m) | KMP or Z-Algorithm |
| Multiple patterns, one text | Aho-Corasick |
| Duplicate/repeated substring detection | Rolling Hash (Rabin-Karp) |
| Longest palindromic substring, O(n²) ok | Expand around center |
| Longest palindromic substring, O(n) needed | Manacher's |
| All suffix-based queries on static string | Suffix Array + LCP |
| Prefix-based dictionary operations | Trie |

### Meta-Insight

Most interview string problems (FAANG level) don't require KMP/Rabin-Karp/Manacher's. They're solved with:
1. **Two pointers / sliding window** (see [02-ARRAYS-AND-STRINGS.md](02-ARRAYS-AND-STRINGS.md))
2. **HashMap for character counting**
3. **DP for edit distance, LCS, palindrome** (see [09-DYNAMIC-PROGRAMMING.md](09-DYNAMIC-PROGRAMMING.md))
4. **Trie for prefix operations**

The advanced algorithms (KMP, Z, Manacher, Aho-Corasick, Suffix Array) are for when O(n²) is explicitly too slow or the problem is specifically about pattern matching.

---

*Next: [18-INTERVAL-AND-SWEEP-LINE.md](18-INTERVAL-AND-SWEEP-LINE.md) — Managing overlapping ranges and events on a timeline.*
