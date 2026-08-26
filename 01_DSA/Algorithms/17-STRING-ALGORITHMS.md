# String Algorithms — 1-Hour Learning Module

> *"String problems are where arrays meet combinatorics. The key insight: strings have structure (repeated patterns, prefixes, suffixes) that clever algorithms exploit."*

**Estimated Time:** 60 minutes
**Goal:** Build strong intuition for string algorithm patterns, know when to apply each, and be ready to code them in a Google interview.

---

## Table of Contents

- [[0–10 min] Big Picture](#010-min-big-picture)
- [[10–20 min] Mental Model](#1020-min-mental-model)
- [[20–35 min] Core Patterns](#2035-min-core-patterns)
- [[35–45 min] Concrete Code + Dry Runs](#3545-min-concrete-code--dry-runs)
- [[45–55 min] Pattern Recognition](#4555-min-pattern-recognition)
- [[55–60 min] Final Mental Checklist](#5560-min-final-mental-checklist)
- [Active Recall Questions](#active-recall-questions)
- [Recommended Practice Direction](#recommended-practice-direction)
- [2-Minute Cheat Sheet](#2-minute-cheat-sheet)

---

## [0–10 min] Big Picture

### What Problems Do String Algorithms Solve?

Strings are everywhere in computing — search engines, compilers, bioinformatics, network filters. String algorithms answer questions like:

- **Does pattern P appear in text T?** (search)
- **Where exactly does P appear?** (all-occurrences)
- **What is the longest repeated part of a string?** (repetition)
- **What is the longest palindromic part?** (symmetry)
- **How many distinct substrings exist?** (counting)

### Simple Analogies

| Problem | Real-World Analogy |
|---|---|
| Pattern matching (KMP) | Ctrl+F in a document, but smart enough to skip ahead when a mismatch happens |
| Rolling Hash (Rabin-Karp) | DNA fingerprinting — hash a region, slide the window, check for matches |
| Z-Algorithm | "How much of what I'm reading right now looks like the opening sentence?" |
| Manacher's | Finding the center of a perfectly symmetric design |
| Suffix Array | Phone book of every possible suffix of a string, sorted alphabetically |
| Aho-Corasick | A spam filter that simultaneously checks for thousands of banned words |

### Why Are Strings Special?

Strings are **not** just character arrays. They have unique properties:

1. **Immutability (in most languages):** Java `String`, Python `str`, JavaScript `string` are all immutable. Concatenation creates a new object — this matters for complexity analysis. Use `StringBuilder` / array buffer for building strings.

2. **Character sets matter:** ASCII (128), Extended ASCII (256), Unicode. Problems often constrain to lowercase `a-z` (26 chars) — this enables O(26) = O(1) frequency maps.

3. **Structure:** Strings have inherent structure that arrays don't — prefixes, suffixes, palindromes, rotations. This structure is what advanced string algorithms exploit.

4. **Pattern matching:** Searching for a pattern inside a longer text is a core operation with a rich algorithmic history. Naive O(n×m) search is almost always improvable.

### The Algorithm Landscape

```
STRING ALGORITHMS
│
├── Pattern Matching (single pattern)
│   ├── Naive                O(n × m)
│   ├── KMP                  O(n + m)   ← failure function
│   ├── Z-Algorithm          O(n + m)   ← Z-array
│   └── Rabin-Karp           O(n + m) avg ← rolling hash
│
├── Multi-Pattern Matching
│   └── Aho-Corasick         O(total_pattern_len + text_len + matches)
│
├── Palindromes
│   ├── Expand Around Center O(n²)      ← good enough for interviews
│   └── Manacher's           O(n)       ← advanced
│
└── Suffix Structures
    ├── Suffix Array + LCP   O(n log n) build
    └── Suffix Tree          O(n) build (complex)
```

**Key meta-insight:** Most FAANG interview string problems do NOT require KMP/Manacher/Suffix Arrays. They use sliding window, HashMap, or DP. The advanced algorithms appear when O(n²) is explicitly too slow.

---

## [10–20 min] Mental Model

### The Most Important Distinction: Substring vs Subsequence

This distinction appears in dozens of interview problems. Get it locked in now.

```
String: "ABCDE"

SUBSTRING (contiguous):
  "ABC"   ✓  positions 0,1,2 — contiguous block
  "BCD"   ✓  positions 1,2,3 — contiguous block
  "ACE"   ✗  NOT a substring — positions 0,2,4 — gaps exist
  "BD"    ✗  NOT a substring — has a gap

SUBSEQUENCE (non-contiguous, order preserved):
  "ACE"   ✓  pick positions 0,2,4 — order preserved, gaps OK
  "BD"    ✓  pick positions 1,3    — order preserved, gaps OK
  "ABC"   ✓  also a subsequence (substrings are a subset of subsequences)
  "CAB"   ✗  NOT a subsequence — order reversed
```

**Mental hook:**
- Substring = slice of a contiguous block. Think: a physical cut of a string.
- Subsequence = scatter-picking characters in order. Think: highlighting some letters but preserving left-to-right order.

**Why this matters:**
- "Longest Common **Substring**" → DP with `dp[i][j] = 0 if mismatch, else dp[i-1][j-1]+1`
- "Longest Common **Subsequence**" → different DP recurrence
- "Longest Palindromic **Substring**" → expand around center or Manacher's
- "Longest Palindromic **Subsequence**" → DP on reversed string

Mixing these up = wrong algorithm = interview failure.

### Key String Properties

| Property | Definition | Example |
|---|---|---|
| Prefix | Starting portion | "AB" is a prefix of "ABCDE" |
| Suffix | Ending portion | "CDE" is a suffix of "ABCDE" |
| Proper prefix/suffix | Prefix/suffix that is not the full string | "AB" is a proper prefix of "ABCDE" |
| Palindrome | Reads the same forwards and backwards (substring) | "ABA", "ABBA" |
| Rotation | Circular shift | "BCDA" is a rotation of "ABCD" |
| Period | Shortest repeating unit | "ABAB" has period "AB" |

### How Sliding Window Applies to Strings

Strings map perfectly to the sliding window pattern because:
- Characters are indexed like arrays
- Window problems often ask about "all characters of X in some window of Y"
- Character frequency maps (fixed 26-size array) make window validation cheap

**Classic sliding window string problems:**
- Minimum window substring (contains all chars of pattern)
- Longest substring without repeating characters
- Longest substring with at most K distinct characters
- All anagrams of a pattern in text (fixed-size window + frequency map)

**Sliding window works when:** the problem asks for a contiguous portion (substring) with a property that can be maintained as the window expands/shrinks.

### Pattern Matching Intuition

**Naive approach — why it's slow:**
```
Text:    "AAAAAB"
Pattern: "AAAAB"

Try at i=0: A=A, A=A, A=A, A=A, B≠A → restart at i=1
Try at i=1: A=A, A=A, A=A, B≠A     → restart at i=2
...

Each restart throws away all the matching work we've done.
```

**KMP insight:** After a mismatch, we know what prefix of the pattern we've already matched. Instead of restarting to i+1, we jump back in the PATTERN (not the text). The text pointer never goes back — we scan each text character exactly once.

**Rolling Hash insight:** Don't compare characters — compare hashes. Sliding a window one step is an O(1) hash update. Compare hashes first; only verify with character comparison on a hash match.

---

## [20–35 min] Core Patterns

### Pattern 1: KMP (Knuth-Morris-Pratt)

**Problem:** Find all occurrences of pattern P in text T in O(n + m) time.

**The LPS (Longest Proper Prefix which is also Suffix) Array:**

This is the heart of KMP. `lps[i]` = length of the longest proper prefix of `pattern[0..i]` that is also a suffix of `pattern[0..i]`.

```
Pattern: "AABAAB"
Index:    0 1 2 3 4 5

lps[0] = 0  ("A" — no proper prefix that is also suffix)
lps[1] = 1  ("AA" — "A" is both a prefix and suffix)
lps[2] = 0  ("AAB" — no proper prefix = suffix)
lps[3] = 1  ("AABA" — "A" is a proper prefix+suffix)
lps[4] = 2  ("AABAA" — "AA" is a proper prefix+suffix)
lps[5] = 3  ("AABAAB" — "AAB" is a proper prefix+suffix)

lps = [0, 1, 0, 1, 2, 3]
```

**LPS construction — key idea:**
- Use two pointers `len` (length of previous LPS) and `i`
- If `pattern[i] == pattern[len]`: `lps[i] = len + 1`, advance both
- Else if `len > 0`: set `len = lps[len-1]` (jump back using previously computed LPS — this is the same reuse trick as the search step)
- Else: `lps[i] = 0`, advance `i`

**KMP Search — key idea:**
- `i` scans text (never goes backward)
- `j` tracks position in pattern
- If `text[i] == pattern[j]`: advance both
- On match (`j == pattern.length`): record match at `i - j`, set `j = lps[j-1]`
- On mismatch: if `j > 0`, set `j = lps[j-1]`; else advance `i`

**Complexity:** O(m) preprocessing + O(n) search = O(n + m)

**KMP Variants:**
- **Repeated substring pattern:** String s has a repeating unit iff `n % (n - lps[n-1]) == 0`
- **Rotation check:** s2 is a rotation of s1 iff s1 is a substring of s2+s2 (use KMP on the concatenated string)

---

### Pattern 2: Rabin-Karp (Rolling Hash)

**Problem:** Find pattern in text using hashing to avoid character-by-character comparison.

**Core idea:**
```
Text:    "ABCABC"
Pattern: "CAB"  (length 3)

Hash window:
  hash("ABC") = ?
  hash("BCA") = ?  ← shift right by 1
  hash("CAB") = ?  ← match!

Rolling update (O(1)):
  new_hash = (old_hash - outgoing_char × base^(len-1)) × base + incoming_char
```

**Choose base and modulus carefully:**
- base = 31 (for lowercase letters), 131 (for broader charset)
- mod = 10^9 + 7 (large prime to reduce collisions)
- Use double hashing (two base/mod pairs) for near-zero collision probability

**Complexity:**
- Average: O(n + m)
- Worst case (many hash collisions): O(n × m) — rare with a good hash

**Rabin-Karp Variants:**
- **Multiple pattern search:** Hash all patterns into a set. Search text once, check each window hash against the set. O(n + total pattern length) average.
- **Longest duplicate substring:** Binary search on length L. For each L, use rolling hash to detect if any length-L substring appears twice. O(n log n) overall.
- **Longest common substring:** Binary search on length + rolling hash, or suffix array approach.

---

### Pattern 3: Z-Algorithm

**Problem:** Same as KMP — pattern matching in O(n + m). Different formulation that some find more intuitive.

**Z-array definition:** For string S, `Z[i]` = length of the longest substring starting at S[i] that matches a prefix of S.

```
S = "AABXAA"
Z = [_, 1, 0, 0, 2, 1]
      ^ Z[0] is undefined (or set to n by convention)

Z[4] = 2 because S[4..5] = "AA" = S[0..1]
Z[1] = 1 because S[1] = "A" = S[0], but S[2]='B' ≠ S[1]='A'
```

**Z-array construction** maintains a "Z-box" [l, r] — the rightmost interval [l, r] where S[l..r] = S[0..r-l]:
- If i > r: compute Z[i] naively, update [l, r]
- If i ≤ r: use Z[i - l] as a starting value (mirror property), then extend if needed

**Pattern matching with Z:** Concatenate `pattern + "$" + text`. Compute Z-array on the concatenated string. Any position i in the text portion where `Z[i] == len(pattern)` is a match location.

**Z vs KMP:** Both O(n). The Z-algorithm is arguably more intuitive to construct. Choose whichever you internalize better — they solve the same problems.

---

### Pattern 4: Manacher's Algorithm

**Problem:** Longest palindromic substring in O(n).

**The transform trick:** Insert '#' between every character (and at boundaries) so that all palindromes become odd-length.

```
Original: "abba"
Transformed: "#a#b#b#a#"

This makes even-length palindromes (like "abba") odd-length in the transformed string.
All palindromes are now handled uniformly.
```

**P[i] = radius of the palindrome centered at i** in the transformed string.

**Core reuse:** Maintain the rightmost palindrome [center, right]. For each i:
- If i < right: `P[i] = min(P[2×center - i], right - i)` — mirror gives us a head start
- Expand outward from the starting value
- Update [center, right] if the new palindrome extends further right

**Complexity:** O(n) — each character is visited at most twice (once to set initial P, once during an expansion that extends the rightmost boundary).

**Simpler O(n²) alternative** (usually sufficient in interviews):
- For each center (2n-1 centers: n characters + n-1 gaps between them), expand outward while characters match.

**When to use Manacher's vs expand-around-center:**
- Expand-around-center: Use unless interviewer explicitly asks for O(n) or n > 10^5 and TLE is a concern
- Manacher's: Mention if asked "can you do this in O(n)?" — demonstrates algorithmic depth

---

### Pattern 5: When to Use Each Algorithm

| Scenario | Algorithm | Why |
|---|---|---|
| Single pattern, one search | Built-in (`indexOf`, `contains`) | Simplest; O(n×m) is fine for typical inputs |
| Single pattern, guaranteed O(n+m) | KMP or Z-Algorithm | Clever prefix reuse |
| Multiple patterns in one text | Aho-Corasick | Single pass, all patterns |
| Duplicate/repeated substring detection | Rabin-Karp (rolling hash) | Hash windows efficiently |
| Longest palindromic substring, O(n²) OK | Expand around center | Simple to code under pressure |
| Longest palindromic substring, O(n) needed | Manacher's | Exploits palindrome symmetry |
| All suffix-based queries on static string | Suffix Array + LCP | Comprehensive but complex |
| Prefix-based dictionary / autocomplete | Trie | Not a string matching algo per se |

---

## [35–45 min] Concrete Code + Dry Runs

### KMP in Java and JavaScript

**Java:**
```java
// Build LPS (failure function) array
int[] buildLPS(String pattern) {
    int m = pattern.length();
    int[] lps = new int[m];
    int len = 0; // length of previous longest prefix suffix
    int i = 1;
    lps[0] = 0; // lps[0] is always 0

    while (i < m) {
        if (pattern.charAt(i) == pattern.charAt(len)) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len != 0) {
                len = lps[len - 1]; // key jump — don't increment i
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}

// KMP search: returns list of all match start indices
List<Integer> kmpSearch(String text, String pattern) {
    List<Integer> matches = new ArrayList<>();
    int n = text.length(), m = pattern.length();
    int[] lps = buildLPS(pattern);
    int i = 0, j = 0; // i = text index, j = pattern index

    while (i < n) {
        if (text.charAt(i) == pattern.charAt(j)) {
            i++;
            j++;
        }
        if (j == m) {
            matches.add(i - j); // found match at this position
            j = lps[j - 1];    // continue searching
        } else if (i < n && text.charAt(i) != pattern.charAt(j)) {
            if (j != 0) {
                j = lps[j - 1]; // jump back in pattern, NOT in text
            } else {
                i++;
            }
        }
    }
    return matches;
}
```

**JavaScript/TypeScript:**
```typescript
function buildLPS(pattern: string): number[] {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0;
    let i = 1;

    while (i < m) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len !== 0) {
                len = lps[len - 1]; // jump — don't increment i
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}

function kmpSearch(text: string, pattern: string): number[] {
    const n = text.length, m = pattern.length;
    const lps = buildLPS(pattern);
    const matches: number[] = [];
    let i = 0, j = 0;

    while (i < n) {
        if (text[i] === pattern[j]) { i++; j++; }
        if (j === m) {
            matches.push(i - j);
            j = lps[j - 1];
        } else if (i < n && text[i] !== pattern[j]) {
            if (j !== 0) j = lps[j - 1];
            else i++;
        }
    }
    return matches;
}
```

**KMP Dry Run:**
```
Text:    "AABAACAADAABAAB"
Pattern: "AABAAB"
LPS:     [0, 1, 0, 1, 2, 3]

i=0,j=0: A=A match → i=1,j=1
i=1,j=1: A=A match → i=2,j=2
i=2,j=2: B=B match → i=3,j=3
i=3,j=3: A=A match → i=4,j=4
i=4,j=4: A=A match → i=5,j=5
i=5,j=5: C≠B mismatch, j=lps[4]=2
i=5,j=2: C≠B mismatch, j=lps[1]=1
i=5,j=1: C≠A mismatch, j=lps[0]=0
i=5,j=0: C≠A mismatch, i=6
...
i=9,j=0: A=A match → i=10,j=1
...eventually j reaches 6 → match at i-j = 9
```

---

### Rabin-Karp in Java and JavaScript

**Java:**
```java
List<Integer> rabinKarp(String text, String pattern) {
    List<Integer> matches = new ArrayList<>();
    int n = text.length(), m = pattern.length();
    long BASE = 31, MOD = 1_000_000_007L;
    long power = 1;

    // Precompute base^(m-1) mod MOD
    for (int i = 0; i < m - 1; i++) power = (power * BASE) % MOD;

    // Compute hash of pattern and first window
    long patHash = 0, winHash = 0;
    for (int i = 0; i < m; i++) {
        patHash = (patHash * BASE + (pattern.charAt(i) - 'a' + 1)) % MOD;
        winHash = (winHash * BASE + (text.charAt(i) - 'a' + 1)) % MOD;
    }

    for (int i = 0; i <= n - m; i++) {
        if (winHash == patHash) {
            // Verify to avoid false positives (hash collision)
            if (text.substring(i, i + m).equals(pattern))
                matches.add(i);
        }
        // Roll the hash
        if (i < n - m) {
            winHash = (winHash - (text.charAt(i) - 'a' + 1) * power % MOD + MOD) % MOD;
            winHash = (winHash * BASE + (text.charAt(i + m) - 'a' + 1)) % MOD;
        }
    }
    return matches;
}
```

**JavaScript/TypeScript:**
```typescript
function rabinKarp(text: string, pattern: string): number[] {
    const n = text.length, m = pattern.length;
    const BASE = 31n, MOD = 1_000_000_007n;
    let power = 1n;

    for (let i = 0; i < m - 1; i++) power = (power * BASE) % MOD;

    const charVal = (s: string, i: number) => BigInt(s.charCodeAt(i) - 96);

    let patHash = 0n, winHash = 0n;
    for (let i = 0; i < m; i++) {
        patHash = (patHash * BASE + charVal(pattern, i)) % MOD;
        winHash = (winHash * BASE + charVal(text, i)) % MOD;
    }

    const matches: number[] = [];
    for (let i = 0; i <= n - m; i++) {
        if (winHash === patHash && text.slice(i, i + m) === pattern)
            matches.push(i);
        if (i < n - m) {
            winHash = (winHash - charVal(text, i) * power % MOD + MOD) % MOD;
            winHash = (winHash * BASE + charVal(text, i + m)) % MOD;
        }
    }
    return matches;
}
```

**Rolling Hash Dry Run:**
```
Text:    "ABCABC"
Pattern: "CAB"   (m=3)
BASE=26, MOD=large prime (simplified)

Hash("ABC") = 1*26^2 + 2*26 + 3 = 676+52+3 = 731
Hash("CAB") = 3*26^2 + 1*26 + 2 = 2028+26+2 = 2056

Window 0: "ABC" → hash=731 ≠ 2056
Roll: remove 'A'(1), shift, add 'A'(1) → Window 1: "BCA" → hash = ?
Roll: remove 'B'(2), shift, add 'B'(2) → Window 2: "CAB" → hash=2056 ✓ → verify: "CAB"="CAB" → match at index 3
```

---

### Expand-Around-Center (Palindromes) — Java and JavaScript

**Java:**
```java
// Returns [start, end] of longest palindromic substring
int[] longestPalindrome(String s) {
    int start = 0, maxLen = 1;

    for (int center = 0; center < 2 * s.length() - 1; center++) {
        // center even → between characters (even-length palindrome)
        // center odd  → at character (odd-length palindrome)
        int left = center / 2;
        int right = left + center % 2;

        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            if (right - left + 1 > maxLen) {
                start = left;
                maxLen = right - left + 1;
            }
            left--;
            right++;
        }
    }
    return new int[]{start, start + maxLen - 1};
}
```

**JavaScript/TypeScript:**
```typescript
function longestPalindrome(s: string): string {
    let start = 0, maxLen = 1;

    function expand(l: number, r: number): void {
        while (l >= 0 && r < s.length && s[l] === s[r]) {
            if (r - l + 1 > maxLen) {
                start = l;
                maxLen = r - l + 1;
            }
            l--;
            r++;
        }
    }

    for (let i = 0; i < s.length; i++) {
        expand(i, i);     // odd-length: center at character i
        expand(i, i + 1); // even-length: center between i and i+1
    }
    return s.slice(start, start + maxLen);
}
```

**Dry Run:**
```
s = "babad"

Center at index 0 ('b'): expand → just "b" (len=1)
Center at index 1 ('a'): expand → "bab" (len=3) ← new max
Center between 1-2 (a,b): 'a'≠'b' → no palindrome
Center at index 2 ('b'): expand → "aba" (len=3) — same length
Center between 2-3 (b,a): 'b'≠'a' → no palindrome
Center at index 3 ('a'): expand → "aba" (len=3)
Center between 3-4 (a,d): 'a'≠'d' → no palindrome
Center at index 4 ('d'): just "d" (len=1)

Result: "bab" (or "aba", both length 3)
```

---

## [45–55 min] Pattern Recognition

### How to Identify Which Algorithm to Use

**Read the problem statement carefully for these keywords:**

| Clue in Problem | Likely Approach |
|---|---|
| "substring" (contiguous) | Sliding window, DP, or KMP |
| "subsequence" (non-contiguous) | DP (LCS, LIS variants) |
| "pattern in text" | KMP or Z-Algorithm |
| "all occurrences of pattern" | KMP |
| "many patterns in text" | Aho-Corasick |
| "duplicate/repeated substring" | Rolling hash + binary search |
| "anagram in text" (fixed window) | Sliding window + frequency map |
| "minimum window containing all chars" | Variable sliding window |
| "palindromic substring" | Expand around center (or Manacher for O(n)) |
| "palindromic subsequence" | DP |
| "longest common substring" | DP or suffix array |
| "longest common subsequence" | DP (different recurrence!) |
| "rotation" | KMP on s2+s2 |
| "edit distance" | DP |
| "O(n) time required" for palindrome | Manacher's |

### When Does Sliding Window Apply to Strings?

Sliding window works when:
1. You need a **contiguous** portion of the string (substring, not subsequence)
2. A property of the window can be maintained incrementally (add right char, remove left char)
3. The window validity check is O(1) or O(alphabet_size) — not O(window_size)

**Works well:**
- Character frequency constraints (use int[26] as frequency map)
- At-most K distinct characters (use HashMap + count)
- All anagrams (fixed window size, compare frequency maps)

**Does NOT work:**
- Subsequence problems (no contiguity → no valid window)
- Problems where adding one character requires global re-evaluation

### HashMap for Strings

Many string problems that look hard become easy with a character frequency map:

- **Anagram check:** Are two strings anagrams? → Frequency maps equal
- **Anagram in text:** Use sliding window + frequency map. At each step, check if window's frequency map matches pattern's. Trick: maintain a "match count" variable to avoid O(26) comparison each step.
- **First non-repeating character:** Frequency map + one pass
- **Minimum window substring:** Two maps (window and target), track how many characters are "satisfied"

### Distinguishing String-Specific from General Array Patterns

| Pattern | String-Specific Twist |
|---|---|
| Sliding window | Character frequency maps (int[26] instead of general HashMap) |
| Two pointers | Often applied to sorted chars or palindrome checking |
| Binary search | On length (e.g., "find longest substring with property X" → binary search on length, use hashing or sliding window to verify) |
| Hashing | Rolling hash is string-specific; enables O(1) window comparison |
| Trie (prefix tree) | String-specific data structure for prefix queries |
| DP | Many string DP problems (edit distance, LCS, palindrome) have unique recurrences |

### The Most Common Interview String Mistakes

1. **Treating substring and subsequence as the same** — they require completely different approaches
2. **Forgetting to handle even-length palindromes** — always expand from both single characters and gaps
3. **Mutating Java strings** — use `StringBuilder` or `char[]` for O(1) character access and modification
4. **Hash collisions** — always verify with character comparison after hash match
5. **Off-by-one in KMP** — the LPS jump is `lps[j-1]`, not `lps[j]`
6. **StringBuilder for concatenation in loops** — `"s" + char` in a loop is O(n²) in Java

---

## [55–60 min] Final Mental Checklist

When you see a string problem in an interview, run through this checklist:

```
STEP 1 — CLASSIFY
  □ Is it about a SUBSTRING (contiguous) or SUBSEQUENCE (non-contiguous)?
      → Substring: sliding window, KMP, rolling hash, expand-center, DP
      → Subsequence: DP (LCS, LIS, palindrome subsequence)

STEP 2 — IDENTIFY THE CORE OPERATION
  □ Pattern search in text?
      → Single pattern: KMP or Z-algorithm
      → Multiple patterns: Aho-Corasick
  □ Window with character constraints?
      → Sliding window + frequency map (int[26] for lowercase)
  □ Palindrome?
      → Expand around center (O(n²), usually sufficient)
      → Manacher's only if O(n) explicitly needed
  □ Duplicate/repeated portions?
      → Rolling hash + binary search on length
  □ Edit distance, alignment, LCS?
      → DP

STEP 3 — CHECK CONSTRAINTS
  □ n ≤ 10^3: O(n²) is fine → expand around center, naive matching
  □ n ≤ 10^5: O(n log n) needed → rolling hash + binary search
  □ n ≤ 10^6: O(n) required → KMP, Z-algorithm, Manacher's
  □ Lowercase only? → int[26] array is O(1) space, O(1) comparison

STEP 4 — CHOOSE DATA STRUCTURE
  □ Need prefix lookups? → Trie
  □ Need frequency counts? → int[26] or HashMap
  □ Building a string? → StringBuilder (Java), array join (JS)
  □ Need all suffix info? → Suffix Array (rarely needed in interviews)

STEP 5 — AVOID COMMON TRAPS
  □ String concatenation in loop → use StringBuilder
  □ substring() in Java is O(n) → account for it
  □ Verify after hash match → avoid false positives
  □ Even-length palindromes → don't forget gap centers
```

---

## Advanced Awareness

*These algorithms are rarely required in standard interviews. Know the concept; implementation only if asked explicitly.*

**Aho-Corasick:** KMP extended to multiple patterns. Build a Trie from all patterns, add BFS-computed failure links (like KMP's LPS but across Trie nodes), then scan text once following edges and failure links.
- **Use case:** Simultaneously search for k patterns in a text. O(sum_of_pattern_lengths + text_length + number_of_matches)
- **Real-world:** Content filtering, spam detection, antivirus pattern matching

**Suffix Array + LCP Array:**
- Suffix Array: sorted array of all suffix starting indices. O(n log n) to build via doubling.
- LCP Array: lcp[i] = length of common prefix between the i-th and (i-1)-th suffix in sorted order. Built in O(n) via Kasai's algorithm.
- Applications: longest repeated substring = max(lcp[i]); count distinct substrings = n(n+1)/2 - sum(lcp[i])
- **Interview alternative:** Rolling hash + binary search is simpler to code under pressure for "longest duplicate substring."

---

## Active Recall Questions

Test yourself after completing this module. Close the notes and try to answer:

1. What is the difference between a substring and a subsequence? Give an example where confusing them would lead to a wrong algorithm.

2. Given pattern "AABAAB", what is the LPS array? Walk through the construction step by step.

3. In KMP, when a mismatch occurs at `text[i]` vs `pattern[j]` and `j > 0`, where do you jump? Why do you NOT move `i` backward?

4. Explain rolling hash in one sentence. What is the O(1) update formula?

5. Why do you verify character-by-character after a hash match in Rabin-Karp?

6. In expand-around-center for palindromes, why do you need 2n-1 centers (not n)?

7. What is the Z-array of "AABXAAB"? What does Z[4] mean?

8. "Find all anagrams of pattern P in text T" — which approach and what is the complexity?

9. When is sliding window NOT applicable to a string problem?

10. You need the longest duplicate substring of a 10^5-character string. You can't use a suffix array. What's your approach?

---

## Recommended Practice Direction

Work in this order — each level builds on the previous:

**Level 1 — Sliding Window + HashMap (solve these first):**
- Longest Substring Without Repeating Characters (LC 3)
- Minimum Window Substring (LC 76)
- Find All Anagrams in a String (LC 438)
- Longest Substring with At Most K Distinct Characters (LC 340)

**Level 2 — Palindromes:**
- Longest Palindromic Substring (LC 5)
- Palindromic Substrings — count all (LC 647)

**Level 3 — KMP / Pattern Matching:**
- Implement strStr() / Find the Index of First Occurrence (LC 28)
- Repeated Substring Pattern (LC 459)
- Shortest Palindrome (LC 214) — builds KMP on reversed string

**Level 4 — Rolling Hash:**
- Longest Duplicate Substring (LC 1044) — binary search + rolling hash
- Longest Common Substring (classic, not directly on LC)

**Level 5 — Advanced (if time permits):**
- Word Break II (LC 140) — DP / Trie
- Stream of Characters (LC 1032) — Aho-Corasick
- Suffix array construction from scratch (competitive programming)

---

## 2-Minute Cheat Sheet

```
SUBSTRING vs SUBSEQUENCE
  Substring = contiguous block (physical cut)
  Subsequence = order-preserved scatter-pick

PATTERN MATCHING
  Single, O(n+m)  → KMP or Z-Algorithm
  Multiple        → Aho-Corasick
  Hash-based      → Rabin-Karp (rolling hash)

KMP KEY FACTS
  LPS[0] = 0 always
  On mismatch: j = lps[j-1], i stays
  On match: j == m → found at i-j, j = lps[j-1]

ROLLING HASH
  new_hash = (old_hash - out * pow) * base + in   (all mod MOD)
  Always verify on hash match (collision protection)

PALINDROMES
  Expand around 2n-1 centers: O(n²) — usually sufficient
  Manacher's: O(n) — only if O(n) explicitly needed

SLIDING WINDOW FOR STRINGS
  Works for: substring properties, character constraints
  Use int[26] for lowercase-only problems
  Does NOT work for: subsequences

COMPLEXITY REFERENCE
  Naive search:   O(n × m)
  KMP / Z:        O(n + m)
  Rabin-Karp:     O(n + m) avg, O(n × m) worst
  Manacher's:     O(n)
  Suffix Array:   O(n log n) build

MOST FAANG PROBLEMS USE:
  → Sliding window + frequency map
  → HashMap for character counting
  → DP (edit distance, LCS, palindrome subsequence)
  Advanced algorithms (KMP, Manacher, etc.) appear
  only when O(n²) is explicitly too slow.
```

---

*Next: [18-INTERVAL-AND-SWEEP-LINE.md](18-INTERVAL-AND-SWEEP-LINE.md) — Managing overlapping ranges and events on a timeline.*
