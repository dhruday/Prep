# String Algorithms

> **8 algorithms covered:** String Sliding Window · Two Pointers on Strings · KMP Pattern Matching · Palindrome (Expand Around Center) · String DP (LCS) · Rabin-Karp · Z-Algorithm · Manacher's · Suffix Arrays

> Read fast. Understand deeply. Practice immediately.

---

## THE MOST IMPORTANT DISTINCTION — READ THIS FIRST

```
String: "ABCDE"

SUBSTRING (contiguous — characters must be a connected block):
  "ABC"  ✓   positions 0,1,2  — no gaps
  "BCD"  ✓   positions 1,2,3  — no gaps
  "ACE"  ✗   positions 0,2,4  — HAS GAPS → NOT a substring
  "BD"   ✗   positions 1,3    — HAS A GAP → NOT a substring

SUBSEQUENCE (non-contiguous — gaps are fine, but order must be preserved):
  "ACE"  ✓   pick positions 0,2,4  — gaps OK, order preserved
  "BD"   ✓   pick positions 1,3    — gap OK, order preserved
  "CAB"  ✗   order reversed        — NOT a subsequence
```

**The rule:**
- Problem says "substring" → characters must be **contiguous** → think **Sliding Window**
- Problem says "subsequence" → characters can have **gaps** (order preserved) → think **DP**

Confusing these two = wrong algorithm = wrong answer. Lock this in before anything else.

---

## Table of Contents

1. [String Sliding Window](#1-string-sliding-window)
2. [Two Pointer on Strings](#2-two-pointer-on-strings)
3. [KMP Pattern Matching](#3-kmp-pattern-matching)
4. [Palindrome — Expand Around Center](#4-palindrome--expand-around-center)
5. [String DP — Longest Common Subsequence](#5-string-dp--longest-common-subsequence)
6. [Rabin-Karp Algorithm](#6-rabin-karp-algorithm)
7. [Z-Algorithm](#7-z-algorithm)
8. [Manacher's Algorithm](#8-manachers-algorithm)
9. [Suffix Arrays](#9-suffix-arrays)

---

## 1. String Sliding Window

### What is it?

A sliding window is a range `[left, right]` that moves across a string. You expand the right end to add characters, and shrink the left end to remove characters. A **substring** = contiguous characters, so windows always produce valid substrings. A **frequency map** (array of size 26 for lowercase letters) tracks which characters are inside the window right now.

### Visual

Problem: Find all anagrams of "abc" in "cbaebacd"

```
Pattern freq: a=1, b=1, c=1

s = c b a e b a c d
    ^         window starts at left=0

Step 1: right=0, add 'c' → window="c"   freq: c=1
Step 2: right=1, add 'b' → window="cb"  freq: c=1,b=1
Step 3: right=2, add 'a' → window="cba" freq: c=1,b=1,a=1 → MATCH! window size = pattern size
Step 4: right=3, add 'e' → window size would grow, so slide: remove 'c' (left=0→1)
        window="bae" → no match
Step 5: add 'b' → window="baeb", remove 'b' → window="aeb" → no match
...
Step 7: window="bac" → freq b=1,a=1,c=1 → MATCH at left=5
```

### How does it work?

1. Build a frequency map of the **pattern** (what you're looking for).
2. Use two pointers: `left = 0`, `right = 0`. Start with an empty window.
3. Expand right: add `s[right]` to the window's frequency map.
4. If the window is larger than allowed (fixed window) or violates a constraint (variable window), shrink from the left: remove `s[left]`, move `left++`.
5. After each adjustment, check if the current window satisfies the condition.
6. Record the answer (index, length, count, etc.) whenever the window satisfies the condition.
7. Repeat until `right` reaches the end of the string.

### Why does it work?

Every character is added to the window exactly once (right pointer) and removed at most once (left pointer). So the total work is O(n) instead of O(n²) for checking every possible substring. The key insight: if a window is valid, you don't need to recheck its whole content — just update incrementally as the window slides.

### When to use?

- The problem asks about a **contiguous portion** (substring) of a string.
- You need the longest/shortest/count of substrings satisfying some character-based condition.
- The condition can be checked by tracking character frequencies as the window changes.
- Keywords: "anagram", "permutation", "window", "substring without repeating", "minimum window containing".

### When NOT to use?

- The problem asks about a **subsequence** (non-contiguous) — sliding window does not apply.
- The condition requires knowing the order of characters inside the window (not just counts).

### How to recognize in a new problem?

Ask yourself: "Is the answer a contiguous block of characters?" If yes → sliding window candidate. Then ask: "Can I maintain the condition by just tracking what enters and exits the window?" If yes → sliding window.

Concrete signals:
- "Find all positions where a permutation / anagram of X appears in Y"
- "Longest substring without repeating characters"
- "Minimum window containing all characters of pattern"

### Simple Example

Input: `s = "cbaebacd"`, `pattern = "abc"`
Expected output: `[0, 6]` (anagram "cba" starts at 0, anagram "bac" starts at 6)

Trace:
```
pattern freq: a=1, b=1, c=1

left=0, right moves right:
right=0: window="c",   win_freq: c=1
right=1: window="cb",  win_freq: c=1,b=1
right=2: window="cba", win_freq: c=1,b=1,a=1 → matches pattern freq → record index 0
right=3: window="cbae" → size 4 > 3, remove s[0]='c' → left=1
         window="bae",  win_freq: b=1,a=1,e=1 → no match
right=4: window="baeb" → size 4, remove s[1]='b' → left=2
         window="aeb",  no match
right=5: window="aeba" → size 4, remove s[2]='a' → left=3
         window="eba",  no match
right=6: window="ebac" → size 4, remove s[3]='e' → left=4
         window="bac",  win_freq: b=1,a=1,c=1 → matches → record index 4
         Wait — let me recount: left=4, right=6, window = s[4..6] = "bac"... 
         Actually index 4 is 'b', 5 is 'a', 6 is 'c' → "bac" starts at index 4, not 6.
         (The problem output [0,6] uses left pointer values.)

Output: [0, 4]
```

### Code

```java
// Java — Find All Anagrams in a String (LC 438)
public List<Integer> findAnagrams(String s, String p) {
    List<Integer> result = new ArrayList<>();
    if (s.length() < p.length()) return result;

    int[] patFreq = new int[26];
    int[] winFreq = new int[26];

    // Build pattern frequency map
    for (char c : p.toCharArray()) patFreq[c - 'a']++;

    // Initialize first window
    for (int i = 0; i < p.length(); i++) winFreq[s.charAt(i) - 'a']++;

    // Slide window of fixed size p.length()
    for (int right = p.length(); right <= s.length(); right++) {
        if (Arrays.equals(winFreq, patFreq)) {
            result.add(right - p.length()); // left pointer = right - p.length()
        }
        if (right < s.length()) {
            winFreq[s.charAt(right) - 'a']++;              // add new right char
            winFreq[s.charAt(right - p.length()) - 'a']--; // remove old left char
        }
    }
    return result;
}
```

```javascript
// JavaScript — Find All Anagrams in a String (LC 438)
function findAnagrams(s, p) {
    const result = [];
    if (s.length < p.length) return result;

    const patFreq = new Array(26).fill(0);
    const winFreq = new Array(26).fill(0);
    const a = 'a'.charCodeAt(0);

    for (const c of p) patFreq[c.charCodeAt(0) - a]++;
    for (let i = 0; i < p.length; i++) winFreq[s.charCodeAt(i) - a]++;

    for (let right = p.length; right <= s.length; right++) {
        if (patFreq.every((v, i) => v === winFreq[i])) {
            result.push(right - p.length);
        }
        if (right < s.length) {
            winFreq[s.charCodeAt(right) - a]++;
            winFreq[s.charCodeAt(right - p.length) - a]--;
        }
    }
    return result;
}
```

### Dry Run

`s = "abacd"`, `p = "abc"`

| Step | right | Window | winFreq (a,b,c) | patFreq (a,b,c) | Match? | Output |
|------|-------|--------|-----------------|-----------------|--------|--------|
| Init | —     | "aba"  | 2,1,0           | 1,1,1           | No     | —      |
| 1    | 3     | "bac"  | 1,1,1           | 1,1,1           | Yes    | [1]    |
| 2    | 4     | "acd"  | 1,0,1           | 1,1,1           | No     | —      |

### Complexity

```
Time:  O(n) — each character enters and exits the window exactly once
Space: O(1) — frequency array is size 26 (fixed alphabet), regardless of input size
```

### Common Trap

- **Fixed-size vs variable-size window:** For anagram problems, window size is fixed (= pattern length). For "longest substring without repeating characters", window size varies — shrink only when a constraint is violated.
- **Arrays.equals vs ==:** In Java, comparing `int[]` with `==` compares references, not content. Use `Arrays.equals(winFreq, patFreq)`. For efficiency in hot loops, maintain a `matches` counter instead.

### Experience Tip

**Experience Tip:** For anagram/permutation problems, maintaining a `matches` counter (how many of 26 characters currently have equal counts in window vs pattern) avoids calling `Arrays.equals` on every step — this drops the constant factor from O(26) to O(1) per step and is the cleaner production-style solution.

### Do Not Confuse With

**Two Pointer:** Two pointer moves both ends inward from opposite sides. Sliding window moves both ends rightward. Use two pointer for palindrome checking or problems on a sorted array; use sliding window for substring window problems.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 242 | Valid Anagram | Easy | Build frequency maps for both strings, compare | https://leetcode.com/problems/valid-anagram/ |
| 438 | Find All Anagrams in a String | Medium | Fixed-size window + frequency map | https://leetcode.com/problems/find-all-anagrams-in-a-string/ |
| 3 | Longest Substring Without Repeating Characters | Medium | Variable window, shrink when duplicate enters | https://leetcode.com/problems/longest-substring-without-repeating-characters/ |
| 567 | Permutation in String | Medium | Same as 438 but return bool, not positions | https://leetcode.com/problems/permutation-in-string/ |
| 76 | Minimum Window Substring | Hard | Variable window, track how many chars are "satisfied" | https://leetcode.com/problems/minimum-window-substring/ |
| 424 | Longest Repeating Character Replacement | Medium | Window: (window size - max freq) <= k | https://leetcode.com/problems/longest-repeating-character-replacement/ |

### One-Minute Revision

```
ALGORITHM:       String Sliding Window
IN SIMPLE WORDS: Move a window across the string, add from right, remove from left,
                 check condition at each position using a frequency map.
USE WHEN:        Substring (contiguous) + character frequency condition
DON'T USE WHEN:  Subsequence problems, or condition requires character order inside window
CORE IDEA:       Each character enters and exits once → O(n) total work
TIME:            O(n)
SPACE:           O(1) — size-26 array for lowercase letters
COMMON TRAP:     Comparing int[] with == in Java (use Arrays.equals or a matches counter)
```

---

## 2. Two Pointer on Strings

### What is it?

Two pointer uses two index variables that move through the string — either from opposite ends toward the middle, or both from the left but at different speeds. A **palindrome** = a string that reads the same forwards and backwards (e.g., "racecar", "abba"). Two pointer is the natural tool for palindrome checking and for comparing two strings character by character.

### Visual

Problem: Check if "racecar" is a palindrome.

```
r  a  c  e  c  a  r
^                 ^
left=0          right=6

Step 1: s[0]='r' == s[6]='r' ✓ → left++, right--
Step 2: s[1]='a' == s[5]='a' ✓ → left++, right--
Step 3: s[2]='c' == s[4]='c' ✓ → left++, right--
Step 4: left=3, right=3 → left >= right → STOP → IS A PALINDROME
```

### How does it work?

1. Place `left` pointer at index 0, `right` pointer at index `n-1`.
2. While `left < right`:
   a. If the characters at both pointers match, move both inward: `left++`, `right--`.
   b. If they do not match, the string is NOT a palindrome (or handle the mismatch per the problem).
3. If the loop finishes without a mismatch, the string IS a palindrome.

For problems like "Valid Palindrome II" (allow one deletion):
- On first mismatch at `[left, right]`, try skipping either `s[left]` or `s[right]` and check if the remaining substring is a palindrome.

### Why does it work?

A palindrome is symmetric around its center. The two-pointer approach checks symmetry directly by comparing mirror-image positions. When both pointers meet in the middle, every pair has been verified — no pair was skipped.

### When to use?

- Checking if a string (or substring) is a palindrome.
- Reversing a string in-place or comparing a string to its reverse.
- Problems where you need to process characters from both ends simultaneously.
- "Is X a palindrome after at most K deletions/changes?"

### When NOT to use?

- Finding ALL palindromic substrings — use Expand Around Center (Pattern 4) instead.
- Subsequence problems — two pointer works on contiguous sequences, not scattered picks.

### How to recognize in a new problem?

Ask: "Does solving this require comparing characters at both ends of a string?" or "Does it ask me to verify symmetry?" If yes → two pointer.

Concrete signals:
- "Valid palindrome", "check if palindrome", "palindrome after removing one character"
- "Reverse string", "check if string equals its reverse"
- "Move all vowels to the end" — two pointers swapping from opposite ends

### Simple Example

Input: `s = "A man a plan a canal Panama"` (ignore non-alphanumeric, case-insensitive)
Expected output: `true`

Trace (after cleaning to "amanaplanacanalpanama"):
```
a m a n a p l a n a c a n a l p a n a m a
^                                       ^
left=0                               right=20

s[0]='a' == s[20]='a' ✓
s[1]='m' == s[19]='m' ✓
s[2]='a' == s[18]='a' ✓
...continues matching...
→ IS PALINDROME
```

### Code

```java
// Java — Valid Palindrome (with alphanumeric filtering)
public boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        // Skip non-alphanumeric from left
        while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
        // Skip non-alphanumeric from right
        while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
        // Compare (case-insensitive)
        if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
```

```javascript
// JavaScript — Valid Palindrome
function isPalindrome(s) {
    let left = 0, right = s.length - 1;
    while (left < right) {
        while (left < right && !/[a-zA-Z0-9]/.test(s[left])) left++;
        while (left < right && !/[a-zA-Z0-9]/.test(s[right])) right--;
        if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
        left++;
        right--;
    }
    return true;
}
```

### Dry Run

`s = "race a car"` (cleaned: "raceacar")

| Step | left | right | s[left] | s[right] | Match? |
|------|------|-------|---------|----------|--------|
| 1    | 0    | 7     | 'r'     | 'r'      | Yes    |
| 2    | 1    | 6     | 'a'     | 'a'      | Yes    |
| 3    | 2    | 5     | 'c'     | 'c'      | Yes    |
| 4    | 3    | 4     | 'e'     | 'a'      | **No** → return false |

### Complexity

```
Time:  O(n) — each character is visited at most once by either pointer
Space: O(1) — only two index variables, no extra data structures
```

### Common Trap

- **Forgetting to skip non-alphanumeric characters** in problems like "Valid Palindrome I" — the problem says ignore spaces and punctuation.
- **Off-by-one when checking `left < right`:** The loop condition must be strictly less than. If `left == right`, we're at the middle character of an odd-length string, which always matches itself.

### Experience Tip

**Experience Tip:** For "Valid Palindrome II" (at most one deletion), on the first mismatch at `[left, right]`, call a helper `isPalin(s, left+1, right) || isPalin(s, left, right-1)`. This pattern extends cleanly to "at most K deletions" with a recursive depth counter.

### Do Not Confuse With

**Sliding Window:** Sliding window moves both pointers rightward (same direction). Two pointer (for palindromes) moves pointers inward from opposite ends. Sliding window = substring problems. Two pointer = symmetry/comparison problems.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 125 | Valid Palindrome | Easy | Skip non-alphanumeric, case-insensitive compare | https://leetcode.com/problems/valid-palindrome/ |
| 680 | Valid Palindrome II | Easy | On mismatch, try skipping left or right | https://leetcode.com/problems/valid-palindrome-ii/ |
| 344 | Reverse String | Easy | Classic in-place two pointer swap | https://leetcode.com/problems/reverse-string/ |
| 392 | Is Subsequence | Easy | Two pointers on two strings (one moves only on match) | https://leetcode.com/problems/is-subsequence/ |
| 167 | Two Sum II - Input Array Is Sorted | Medium | Two pointer on sorted array — same pattern | https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/ |

### One-Minute Revision

```
ALGORITHM:       Two Pointer on Strings
IN SIMPLE WORDS: One pointer at start, one at end, move inward comparing characters.
USE WHEN:        Palindrome check, reverse/compare from both ends, symmetric problems
DON'T USE WHEN:  Finding all palindromic substrings (use Expand Around Center instead)
CORE IDEA:       Palindrome = symmetric → check mirror positions directly
TIME:            O(n)
SPACE:           O(1)
COMMON TRAP:     Forgetting to skip non-alphanumeric characters when problem says "ignore spaces/punctuation"
```

---

## 3. KMP Pattern Matching

### What is it?

KMP (Knuth-Morris-Pratt) finds all occurrences of a short **pattern** string inside a longer **text** string in O(n + m) time. A **pattern** = the string you're searching for. A **text** = the string you're searching in. The naive approach is O(n × m) because on every mismatch it restarts from scratch. KMP avoids restarting by precomputing a "failure function" — the LPS array — that tells you how far back to jump in the pattern (not the text) on a mismatch.

### Visual

Naive search — wasted work:
```
Text:    A A A A B
Pattern: A A A B
         ✓ ✓ ✓ ✗  → restart. But we already know text[1..3] = "AAA"!
           ✓ ✓ ✗  → restart again. Wasted!
```

KMP — no restart in text:
```
Text:    A A A A B
Pattern: A A A B
i →      0 1 2 3 4   (i never goes back)
j →      0 1 2 3     (j jumps using LPS on mismatch)

text[3]='A' vs pattern[3]='B' → mismatch, j jumps to lps[2]=2
Now compare text[3]='A' vs pattern[2]='A' → match!
text[4]='B' vs pattern[3]='B' → match! Found at position 1.
```

### How does it work?

**Phase 1: Build the LPS (Longest Proper Prefix which is also Suffix) array**

The LPS array for the pattern tells you: `lps[i]` = the length of the longest prefix of `pattern[0..i]` that is ALSO a suffix of `pattern[0..i]` (but not the full string itself).

Example for pattern = "AABAAB":
```
i=0: "A"      → no proper prefix = suffix → lps[0] = 0
i=1: "AA"     → "A" is both prefix and suffix → lps[1] = 1
i=2: "AAB"    → no proper prefix = suffix → lps[2] = 0
i=3: "AABA"   → "A" is prefix AND suffix → lps[3] = 1
i=4: "AABAA"  → "AA" is prefix AND suffix → lps[4] = 2
i=5: "AABAAB" → "AAB" is prefix AND suffix → lps[5] = 3

LPS = [0, 1, 0, 1, 2, 3]
```

**Phase 2: Search using LPS**

1. `i` scans the text forward (never goes back).
2. `j` tracks the current position in the pattern.
3. If `text[i] == pattern[j]`: advance both `i++`, `j++`.
4. If `j == pattern.length`: a full match was found at position `i - j`. Set `j = lps[j-1]` to continue searching for more matches.
5. If mismatch and `j > 0`: set `j = lps[j-1]` (jump back in pattern, NOT text). Do NOT advance `i`.
6. If mismatch and `j == 0`: advance `i++`.

### Why does it work?

When a mismatch happens at `pattern[j]`, you already know that `text[i-j .. i-1]` matched `pattern[0 .. j-1]`. The LPS value `lps[j-1]` tells you the longest prefix of the pattern that also appears as a suffix of what you just matched. You can slide the pattern forward to align that prefix with where you are in the text — no need to restart from scratch. The text pointer `i` never moves backward, so each character is processed at most once.

### When to use?

- You need to find a pattern inside a text in guaranteed O(n + m) time.
- The problem involves detecting a repeated substring pattern.
- Checking if one string is a rotation of another (check if s1 is in s2+s2).
- The interviewer explicitly asks for better than O(n × m).

### When NOT to use?

- For most interview problems, built-in `indexOf` / `contains` is fine (and O(n×m) passes). Use KMP only when the time limit forces it or the problem is explicitly about pattern matching.
- Do not use KMP for subsequence matching — KMP requires contiguous matches.

### How to recognize in a new problem?

Ask: "Am I searching for a fixed pattern inside a larger string, and O(n²) might be too slow?" If yes → KMP.

Concrete signals:
- "Find the first/all occurrences of string needle in haystack"
- "Does string A contain string B as a substring?" (with tight time constraints)
- "Detect repeating unit" — KMP LPS encodes repetition structure

### Simple Example

Input: `text = "AAACAAAA"`, `pattern = "AAAA"`
Expected output: match found at index 4

LPS for "AAAA":
```
lps = [0, 1, 2, 3]
```

Trace:
```
i=0, j=0: A=A ✓ → i=1,j=1
i=1, j=1: A=A ✓ → i=2,j=2
i=2, j=2: A=A ✓ → i=3,j=3
i=3, j=3: C≠A ✗ → j=lps[2]=2
i=3, j=2: C≠A ✗ → j=lps[1]=1
i=3, j=1: C≠A ✗ → j=lps[0]=0
i=3, j=0: C≠A ✗ → i=4
i=4, j=0: A=A ✓ → i=5,j=1
i=5, j=1: A=A ✓ → i=6,j=2
i=6, j=2: A=A ✓ → i=7,j=3
i=7, j=3: A=A ✓ → i=8,j=4
j==4 (pattern length) → MATCH at i-j = 8-4 = 4
```

### Code

```java
// Java — KMP Pattern Matching
public List<Integer> kmpSearch(String text, String pattern) {
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
            matches.add(i - j);   // found a match
            j = lps[j - 1];       // don't reset to 0, reuse partial match
        } else if (i < n && text.charAt(i) != pattern.charAt(j)) {
            if (j != 0) {
                j = lps[j - 1];   // jump in PATTERN, i stays
            } else {
                i++;              // no partial match to reuse, advance text
            }
        }
    }
    return matches;
}

private int[] buildLPS(String pattern) {
    int m = pattern.length();
    int[] lps = new int[m];
    int len = 0; // length of the current longest prefix-suffix
    int i = 1;
    lps[0] = 0;  // always 0 — no proper prefix of a 1-char string

    while (i < m) {
        if (pattern.charAt(i) == pattern.charAt(len)) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len != 0) {
                len = lps[len - 1]; // key: reuse LPS, don't move i
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}
```

```javascript
// JavaScript — KMP Pattern Matching
function kmpSearch(text, pattern) {
    const n = text.length, m = pattern.length;
    const lps = buildLPS(pattern);
    const matches = [];
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

function buildLPS(pattern) {
    const m = pattern.length;
    const lps = new Array(m).fill(0);
    let len = 0, i = 1;

    while (i < m) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len !== 0) len = lps[len - 1]; // reuse, don't move i
            else { lps[i] = 0; i++; }
        }
    }
    return lps;
}
```

### Dry Run

`text = "ABABABC"`, `pattern = "ABABC"`

LPS for "ABABC":
```
i: 0  1  2  3  4
   A  B  A  B  C
   0  0  1  2  0
```

| i | j | text[i] | pattern[j] | Action             |
|---|---|---------|------------|--------------------|
| 0 | 0 | A       | A          | match, i=1, j=1    |
| 1 | 1 | B       | B          | match, i=2, j=2    |
| 2 | 2 | A       | A          | match, i=3, j=3    |
| 3 | 3 | B       | B          | match, i=4, j=4    |
| 4 | 4 | A       | C          | mismatch, j=lps[3]=2 |
| 4 | 2 | A       | A          | match, i=5, j=3    |
| 5 | 3 | B       | B          | match, i=6, j=4    |
| 6 | 4 | C       | C          | match, i=7, j=5    |
| — | 5 | —       | j==m=5     | **MATCH at 7-5=2** |

### Complexity

```
Time:  O(n + m) — O(m) to build LPS, O(n) to search (i never goes back)
Space: O(m) — the LPS array has one entry per pattern character
```

### Common Trap

- **`j = lps[j-1]` not `j = lps[j]`:** On a mismatch at position `j`, you jump using `lps[j-1]` (the LPS of the prefix you've matched so far, which ends at `j-1`). Using `lps[j]` is wrong.
- **Moving `i` back:** Never move `i` backward. The power of KMP is that `i` only moves forward. Only `j` jumps.

### Experience Tip

**Experience Tip:** The LPS build step and the search step use the SAME logic — "when mismatch, jump using the LPS value." If you understand one, you understand both. In interviews, most people code KMP wrong because they try to memorize it rather than understanding why `j = lps[j-1]` makes sense: it says "the longest prefix of the pattern that still matches what I've seen."

### Do Not Confuse With

**Rabin-Karp:** Uses rolling hash to compare windows. Same O(n+m) average time but O(nm) worst case (hash collisions). KMP is always O(n+m). Use KMP when you need a worst-case guarantee; Rabin-Karp when you need to search for multiple patterns (hash all patterns into a set, one pass over text).

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 28 | Find the Index of the First Occurrence in a String | Easy | Classic KMP application | https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/ |
| 459 | Repeated Substring Pattern | Easy | If s = repeated unit, then lps[m-1] > 0 and m % (m - lps[m-1]) == 0 | https://leetcode.com/problems/repeated-substring-pattern/ |
| 686 | Repeated String Match | Medium | How many times must A repeat to contain B? | https://leetcode.com/problems/repeated-string-match/ |
| 1392 | Longest Happy Prefix | Hard | The answer IS the LPS array's last value | https://leetcode.com/problems/longest-happy-prefix/ |
| 214 | Shortest Palindrome | Hard | Build KMP on s + "#" + reverse(s), use LPS | https://leetcode.com/problems/shortest-palindrome/ |

### One-Minute Revision

```
ALGORITHM:       KMP Pattern Matching
IN SIMPLE WORDS: Precompute LPS (prefix-suffix overlaps) for the pattern so that
                 on mismatch, you jump back in the PATTERN (not the text).
USE WHEN:        Find pattern in text with O(n+m) guarantee; repeated substring detection
DON'T USE WHEN:  Subsequence matching; when O(nm) naive search already passes constraints
CORE IDEA:       Text pointer i never goes back. Only pattern pointer j jumps on mismatch.
TIME:            O(n + m)
SPACE:           O(m) for LPS array
COMMON TRAP:     j = lps[j-1] NOT lps[j]. And never move i backward.
```

---

## 4. Palindrome — Expand Around Center

### What is it?

A **palindrome** = a string that reads the same forwards and backwards. "aba" is a palindrome. "abba" is a palindrome. "abc" is not. Expand Around Center finds the longest palindromic **substring** (contiguous characters) by treating each character (and each gap between characters) as a potential center and expanding outward as long as both sides match. There are `2n - 1` possible centers in a string of length n: n characters (odd-length palindromes) and n-1 gaps (even-length palindromes).

### Visual

`s = "cbbd"`

```
Centers and expansions:

Center 'c' (i=0):   left=0, right=0  → "c"  (length 1)
Gap c-b (i=0.5):    left=0, right=1  → s[0]='c' ≠ s[1]='b' → stop (length 0)
Center 'b' (i=1):   left=1, right=1  → "b"
                    left=0, right=2  → s[0]='c' ≠ s[2]='b' → stop (length 1)
Gap b-b (i=1.5):    left=1, right=2  → s[1]='b' == s[2]='b' ✓ → expand
                    left=0, right=3  → s[0]='c' ≠ s[3]='d' → stop (length 2) ← NEW MAX
Center 'b' (i=2):   left=2, right=2  → "b" (length 1)
Gap b-d (i=2.5):    left=2, right=3  → s[2]='b' ≠ s[3]='d' → stop
Center 'd' (i=3):   left=3, right=3  → "d" (length 1)

Longest palindromic substring: "bb" (starts at index 1, length 2)
```

### How does it work?

1. Initialize `start = 0`, `maxLen = 1` (single character is always a palindrome).
2. For each index `i` from 0 to `n-1`:
   a. **Odd-length** expansion: call `expand(i, i)` — center is a single character.
   b. **Even-length** expansion: call `expand(i, i+1)` — center is the gap between `i` and `i+1`.
3. In `expand(left, right)`:
   - While `left >= 0` AND `right < n` AND `s[left] == s[right]`: expand → `left--`, `right++`.
   - When the loop ends, the palindrome is `s[left+1 .. right-1]` (length = `right - left - 1`).
   - If this is longer than `maxLen`, update `start` and `maxLen`.
4. Return `s.substring(start, start + maxLen)`.

### Why does it work?

Every palindrome has a center. If you try every possible center and expand outward, you are guaranteed to find the longest one. Expansion stops as soon as the two sides disagree — that boundary cannot be extended. The total work across all centers is O(n²) in the worst case (e.g., "aaaaaaa" where many long palindromes overlap).

### When to use?

- Find the **longest palindromic substring** (contiguous).
- Count all palindromic substrings.
- The string length is at most ~10^4 — O(n²) is fine.

### When NOT to use?

- If you need O(n) time (very rare in interviews) → use Manacher's algorithm instead.
- If the problem asks for **palindromic subsequence** (non-contiguous) → use DP, not this.

### How to recognize in a new problem?

Ask: "Does the problem ask about palindromes that are contiguous substrings?" If yes and n is not huge → Expand Around Center.

Concrete signals:
- "Longest palindromic substring"
- "Count all palindromic substrings"
- "Is there a palindromic substring of length >= k?"

Trap to avoid: "Longest palindromic **subsequence**" is a completely different problem (DP). The word "subsequence" changes everything.

### Simple Example

Input: `s = "babad"`
Expected output: `"bab"` (or `"aba"`, both are valid)

Trace:
```
i=0, center 'b': expand(0,0) → "b" (len 1)
                 expand(0,1) → s[0]='b' ≠ s[1]='a' → no even palindrome
i=1, center 'a': expand(1,1) → s[0]='b'==s[2]='b'? expand → "bab" (len 3) ← NEW MAX
                 expand(1,2) → s[1]='a' ≠ s[2]='b' → no even palindrome
i=2, center 'b': expand(2,2) → s[1]='a'==s[3]='a'? expand → "aba" (len 3) — same max
                 expand(2,3) → s[2]='b' ≠ s[3]='a' → no even palindrome
i=3, center 'a': expand(3,3) → s[2]='b' ≠ s[4]='d' → "a" (len 1)
i=4, center 'd': expand(4,4) → "d" (len 1)

Answer: "bab" (found first, maxLen=3, start=0)
```

### Code

```java
// Java — Longest Palindromic Substring (LC 5)
public String longestPalindrome(String s) {
    int n = s.length();
    int start = 0, maxLen = 1;

    for (int i = 0; i < n; i++) {
        // Odd-length palindrome: center at i
        int len1 = expand(s, i, i);
        // Even-length palindrome: center between i and i+1
        int len2 = expand(s, i, i + 1);

        int len = Math.max(len1, len2);
        if (len > maxLen) {
            maxLen = len;
            // Derive start index from center and length
            start = i - (len - 1) / 2;
        }
    }
    return s.substring(start, start + maxLen);
}

private int expand(String s, int left, int right) {
    while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
        left--;
        right++;
    }
    // When loop exits: s[left] != s[right], so palindrome is s[left+1..right-1]
    return right - left - 1; // length of palindrome found
}
```

```javascript
// JavaScript — Longest Palindromic Substring (LC 5)
function longestPalindrome(s) {
    const n = s.length;
    let start = 0, maxLen = 1;

    function expand(l, r) {
        while (l >= 0 && r < n && s[l] === s[r]) { l--; r++; }
        return r - l - 1; // length when loop exits
    }

    for (let i = 0; i < n; i++) {
        const len1 = expand(i, i);       // odd
        const len2 = expand(i, i + 1);   // even
        const len = Math.max(len1, len2);
        if (len > maxLen) {
            maxLen = len;
            start = i - Math.floor((len - 1) / 2);
        }
    }
    return s.slice(start, start + maxLen);
}
```

### Dry Run

`s = "racecar"`

| Center | Type | Expansion | Length |
|--------|------|-----------|--------|
| 'r' (0) | odd | "r" | 1 |
| 'a' (1) | odd | "a", s[0]='r'≠s[2]='c' → stop | 1 |
| 'c' (2) | odd | "c", s[1]='a'≠s[3]='e' → stop | 1 |
| 'e' (3) | odd | expand: s[2]='c'==s[4]='c' ✓, s[1]='a'==s[5]='a' ✓, s[0]='r'==s[6]='r' ✓, l=-1 → stop | **7** |
| 'c' (4) | odd | "c" | 1 |
| 'a' (5) | odd | "a" | 1 |
| 'r' (6) | odd | "r" | 1 |
| gap 0-1 | even | 'r'≠'a' → 0 | 0 |
| ... | even | all mismatches | 0 |

Best: length 7 at center i=3, start = 3 - (7-1)/2 = 3-3 = 0 → "racecar"

### Complexity

```
Time:  O(n²) — n centers × O(n) expansion in worst case
Space: O(1) — only a few integer variables, no extra arrays
```

### Common Trap

- **Forgetting even-length palindromes:** "abba" has no single character at its center — its center is the gap between the two 'b's. If you only expand from single characters, you miss all even-length palindromes.
- **Wrong start index derivation:** After finding `len`, the start is `i - (len-1)/2`. Getting this formula wrong gives a correct length but wrong substring.

### Experience Tip

**Experience Tip:** For "Count Palindromic Substrings" (LC 647), every time the expansion at a center succeeds (the while loop body executes), that's one palindrome. Count those increments across all centers instead of returning the length.

### Do Not Confuse With

**Palindromic Subsequence:** "Longest Palindromic Subsequence" is DP-based and deals with non-contiguous characters. Expand Around Center only works for substrings (contiguous). The word "subsequence" in the problem = DP, not this algorithm.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 5 | Longest Palindromic Substring | Medium | Expand from 2n-1 centers, track max | https://leetcode.com/problems/longest-palindromic-substring/ |
| 647 | Palindromic Substrings | Medium | Count every successful expansion step | https://leetcode.com/problems/palindromic-substrings/ |
| 680 | Valid Palindrome II | Easy | Two pointer + one allowed skip | https://leetcode.com/problems/valid-palindrome-ii/ |
| 1177 | Can Make Palindrome from Substring | Medium | Frequency map: odd-count chars > 1 means not a palindrome | https://leetcode.com/problems/can-make-palindrome-from-substring/ |
| 516 | Longest Palindromic Subsequence | Medium | DO NOT use expand here — use DP (contrast problem) | https://leetcode.com/problems/longest-palindromic-subsequence/ |

### One-Minute Revision

```
ALGORITHM:       Palindrome — Expand Around Center
IN SIMPLE WORDS: Try every possible center (character or gap), expand outward
                 while both sides match, track the longest result.
USE WHEN:        Longest / count of palindromic SUBSTRINGS (contiguous)
DON'T USE WHEN:  Palindromic SUBSEQUENCE (use DP); need O(n) (use Manacher's)
CORE IDEA:       Every palindrome has a center. Try all 2n-1 centers.
TIME:            O(n²)
SPACE:           O(1)
COMMON TRAP:     Forgetting even-length centers (gaps between characters)
```

---

## 5. String DP — Longest Common Subsequence

### What is it?

Dynamic Programming on strings solves problems where you need to compare two strings character by character and build a solution from smaller subproblems. The **Longest Common Subsequence (LCS)** is the representative example: given two strings, find the longest sequence of characters that appears in both strings in the same order, but not necessarily contiguously. A **subsequence** = non-contiguous characters (order preserved). A **substring** would require contiguity — LCS does NOT require contiguity.

Example:
```
s1 = "ABCDE"
s2 = "ACE"

LCS = "ACE" (length 3)
   → 'A' from s1[0], 'C' from s1[2], 'E' from s1[4]
   → All appear in s2 in the same order
   → Characters are NOT contiguous in s1 — that's fine for subsequences
```

### Visual

`s1 = "ABC"`, `s2 = "AC"`

Build a 2D table where `dp[i][j]` = LCS length of `s1[0..i-1]` and `s2[0..j-1]`:

```
      ""  A   C
  ""   0   0   0
  A    0   1   1
  B    0   1   1
  C    0   1   2

Reading dp[3][2] = 2 → LCS length is 2 → "AC"
```

How cell `dp[2][2]` (row B, col C) is filled:
- `s1[1]='B'` vs `s2[1]='C'` → NOT equal → `dp[2][2] = max(dp[1][2], dp[2][1]) = max(1, 1) = 1`

How cell `dp[3][2]` (row C, col C) is filled:
- `s1[2]='C'` vs `s2[1]='C'` → EQUAL → `dp[3][2] = dp[2][1] + 1 = 1 + 1 = 2`

### How does it work?

1. Create a 2D array `dp` of size `(m+1) × (n+1)` where m = len(s1), n = len(s2). Fill with 0s.
2. The `+1` creates a "empty prefix" base row and column, all zeros. This handles the base case: LCS of any string with an empty string is 0.
3. Fill the table row by row, left to right:
   - If `s1[i-1] == s2[j-1]` (current characters match): `dp[i][j] = dp[i-1][j-1] + 1`
   - Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])` (best without current char of s1 or s2)
4. The answer is `dp[m][n]`.
5. To reconstruct the actual LCS string: backtrack from `dp[m][n]` — if characters matched, include the character; else go in the direction of the larger value.

### Why does it work?

The recurrence captures an exhaustive choice: at each pair of positions `(i, j)`, either the current characters match (and we extend the LCS from the previous pair), or they don't (and the best LCS is whatever we got ignoring one of the two current characters). By filling smaller subproblems first (shorter prefixes), we guarantee that when we fill `dp[i][j]`, all the values it depends on (`dp[i-1][j-1]`, `dp[i-1][j]`, `dp[i][j-1]`) are already computed.

### When to use?

- Finding the longest common subsequence / substring between two strings.
- Edit distance (minimum insertions/deletions/replacements to convert one string to another).
- The problem explicitly says "subsequence" — non-contiguous characters in order.
- Problems comparing two sequences where you choose to include or skip characters.

### When NOT to use?

- If "substring" (contiguous) is needed, LCS DP still works but with a different recurrence: `dp[i][j] = 0` on mismatch (no carry-over).
- If the strings are very long (n > 10^4) and you need O(n log n) — use patience sorting / binary search variant of LCS.

### How to recognize in a new problem?

Ask: "Does this involve comparing two strings and finding the best matching of characters (in order, with possible gaps)?" If yes → LCS-style DP.

Concrete signals:
- "Longest common subsequence" (non-contiguous)
- "Minimum edit distance" / "minimum deletions/insertions to make equal"
- "Shortest common supersequence" (builds on LCS)
- Two strings, "order preserved", "not necessarily contiguous"

Trap: "Longest common **substring**" → different recurrence (`dp[i][j]=0` on mismatch, track global max).

### Simple Example

Input: `s1 = "AGGTAB"`, `s2 = "GXTXAYB"`
Expected output: `4` (LCS = "GTAB")

Table build:
```
      ""  G   X   T   X   A   Y   B
  ""   0   0   0   0   0   0   0   0
  A    0   0   0   0   0   1   1   1
  G    0   1   1   1   1   1   1   1
  G    0   1   1   1   1   1   1   1
  T    0   1   1   2   2   2   2   2
  A    0   1   1   2   2   3   3   3
  B    0   1   1   2   2   3   3   4  ← answer: 4
```

Backtrack to find "GTAB": trace from dp[6][7] backward following the matching characters.

### Code

```java
// Java — Longest Common Subsequence (LC 1143)
public int longestCommonSubsequence(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];
    // Base case: dp[0][j] = 0 and dp[i][0] = 0 (already initialized)

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;  // characters match: extend
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // skip one
            }
        }
    }
    return dp[m][n];
}

// To reconstruct the actual LCS string:
public String reconstructLCS(String s1, String s2, int[][] dp) {
    StringBuilder sb = new StringBuilder();
    int i = s1.length(), j = s2.length();
    while (i > 0 && j > 0) {
        if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
            sb.append(s1.charAt(i - 1)); // this char is in the LCS
            i--; j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--; // came from above
        } else {
            j--; // came from left
        }
    }
    return sb.reverse().toString();
}
```

```javascript
// JavaScript — Longest Common Subsequence (LC 1143)
function longestCommonSubsequence(s1, s2) {
    const m = s1.length, n = s2.length;
    // Create (m+1) x (n+1) table filled with 0
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}
```

### Dry Run

`s1 = "ABC"`, `s2 = "BC"`

| i\j | "" | B  | C  |
|-----|----|----|-----|
| ""  | 0  | 0  | 0  |
| A   | 0  | 0  | 0  |
| B   | 0  | 1  | 1  |
| C   | 0  | 1  | 2  |

Cell-by-cell reasoning:
- `dp[1][1]`: s1[0]='A' vs s2[0]='B' → mismatch → max(dp[0][1], dp[1][0]) = max(0,0) = 0
- `dp[1][2]`: s1[0]='A' vs s2[1]='C' → mismatch → max(dp[0][2], dp[1][1]) = max(0,0) = 0
- `dp[2][1]`: s1[1]='B' vs s2[0]='B' → **MATCH** → dp[1][0] + 1 = 0 + 1 = 1
- `dp[2][2]`: s1[1]='B' vs s2[1]='C' → mismatch → max(dp[1][2], dp[2][1]) = max(0,1) = 1
- `dp[3][1]`: s1[2]='C' vs s2[0]='B' → mismatch → max(dp[2][1], dp[3][0]) = max(1,0) = 1
- `dp[3][2]`: s1[2]='C' vs s2[1]='C' → **MATCH** → dp[2][1] + 1 = 1 + 1 = **2**

Answer: 2. LCS = "BC".

### Complexity

```
Time:  O(m × n) — fill every cell of the (m+1)×(n+1) table once
Space: O(m × n) — the DP table
       Optimization: O(min(m,n)) space by keeping only two rows at a time
```

### Common Trap

- **Using 0-indexed vs 1-indexed incorrectly:** `dp[i][j]` represents the LCS of `s1[0..i-1]` and `s2[0..j-1]`. So when `s1[i-1] == s2[j-1]`, you look up `dp[i-1][j-1]`. Off-by-one errors here produce wrong answers.
- **LCS vs Longest Common Substring:** For substring (contiguous), reset `dp[i][j] = 0` on mismatch and keep a global maximum. For subsequence, take `max(dp[i-1][j], dp[i][j-1])` on mismatch. These are two different recurrences.

### Experience Tip

**Experience Tip:** LCS is the building block for many harder problems. Edit distance = LCS variant where you count mismatches differently. Shortest common supersequence = `m + n - LCS(s1, s2)`. Minimum deletions to make equal = `m + n - 2 * LCS(s1, s2)`. Master the LCS table and these all fall out naturally.

### Do Not Confuse With

**Longest Common Substring (contiguous):** Same table setup, but on mismatch set `dp[i][j] = 0` (not `max(dp[i-1][j], dp[i][j-1])`), and track a global max. Substring requires contiguity so you kill the chain on any mismatch. Subsequence survives mismatches by taking the best of skipping one character.

### LeetCode Practice

| # | Problem | Difficulty | What to Notice | Link |
|---|---------|------------|----------------|------|
| 1143 | Longest Common Subsequence | Medium | Core LCS DP — master this first | https://leetcode.com/problems/longest-common-subsequence/ |
| 72 | Edit Distance | Hard | LCS variant: each cell considers insert/delete/replace | https://leetcode.com/problems/edit-distance/ |
| 1092 | Shortest Common Supersequence | Hard | Answer length = m + n - LCS length | https://leetcode.com/problems/shortest-common-supersequence/ |
| 139 | Word Break | Medium | 1D DP: can we partition s using dictionary words? | https://leetcode.com/problems/word-break/ |
| 516 | Longest Palindromic Subsequence | Medium | LCS of s and reverse(s) | https://leetcode.com/problems/longest-palindromic-subsequence/ |

### One-Minute Revision

```
ALGORITHM:       String DP — Longest Common Subsequence
IN SIMPLE WORDS: Build a (m+1)×(n+1) table. If characters match, extend diagonal.
                 If not, take the best of skipping one character from either string.
USE WHEN:        Two strings, find best matching in order (non-contiguous OK)
DON'T USE WHEN:  Contiguous substring needed (different recurrence);
                 problem asks for sliding window over a single string
CORE IDEA:       dp[i][j] = LCS of first i chars of s1 and first j chars of s2
TIME:            O(m × n)
SPACE:           O(m × n), reducible to O(min(m, n)) with rolling array
COMMON TRAP:     LCS (subsequence, gaps OK) vs Longest Common Substring (contiguous,
                 reset to 0 on mismatch) — completely different recurrences
```

---

## Quick Reference

### Substring vs Subsequence — The Decision Tree

```
Problem keyword: "substring"?
    └── Contiguous block required
        ├── Pattern in text → KMP
        ├── Window with char conditions → Sliding Window
        ├── Palindrome → Expand Around Center
        └── Common substring (two strings) → DP (reset to 0 on mismatch)

Problem keyword: "subsequence"?
    └── Gaps allowed, order preserved
        ├── Common subsequence (two strings) → LCS DP
        ├── Palindromic subsequence → LCS of s and reverse(s)
        └── Increasing subsequence → LIS DP
```

### Pattern Selection at a Glance

| Problem Signal | Pattern | Time |
|---|---|---|
| "anagram / permutation in string" | Sliding Window + freq map | O(n) |
| "minimum window containing all chars" | Sliding Window (variable) | O(n) |
| "longest substring without repeating" | Sliding Window | O(n) |
| "palindrome check" | Two Pointer | O(n) |
| "find pattern in text, O(n+m)" | KMP | O(n+m) |
| "longest palindromic substring" | Expand Around Center | O(n²) |
| "longest common subsequence" | DP | O(m×n) |
| "edit distance" | DP | O(m×n) |
| "word break" | DP | O(n²) |

---

## 6. Rabin-Karp Algorithm

### What is it?
Imagine checking if a library book matches what you're looking for by first checking only its catalog number — a single number comparison is instant. Only when the number matches do you open the book to verify. Rabin-Karp does exactly this with strings: it computes a numeric hash for the pattern and for each same-length window of the text, comparing hashes first. If hashes match, it then confirms character by character. The key trick — the "rolling hash" — updates the window's hash in O(1) by removing the outgoing character and adding the incoming one, so each slide is O(1) instead of O(m).

### Visual
```
Pattern: "abc"   Pattern hash = 42 (example value)

Text:  x  a  b  c  d  a  b  c
       [x  a  b]             window="xab", hash=15 ≠ 42, slide
          [a  b  c]          window="abc", hash=42 = 42 → verify → MATCH at index 1
             [b  c  d]       window="bcd", hash=28 ≠ 42, slide
                [c  d  a]    window="cda", hash=19 ≠ 42, slide
                   [d  a  b] window="dab", hash=37 ≠ 42, slide
                      [a  b  c] window="abc", hash=42 → verify → MATCH at index 5

Rolling hash step (O(1)):
  new_hash = (old_hash - value(outgoing) * base^(m-1)) * base + value(incoming)
  Remove 'x', add 'd': arithmetic only — no loop over the window!
```

### How does it work?
1. Choose a **base** (e.g., 31) and a large **prime modulus** (e.g., 10^9+7) to keep numbers manageable and reduce collisions.
2. Compute the hash of the pattern (length m) and the hash of the first m characters of the text.
3. Slide the window one character at a time:
   - Compare window hash to pattern hash. If they match: verify character by character (catches rare "false positives" — different strings with the same hash).
   - If verified: record the starting index.
   - Update hash: subtract the leftmost character's contribution, multiply by base, add the new rightmost character.
4. Repeat until the window reaches the end of the text.

**Rolling hash formula:**
```
new_hash = ((old_hash - text[left] * power) * base + text[left+m]) % MOD
where power = base^(m-1) % MOD, precomputed once
```

### Why does it work?
The string is treated as a number in base `base`. Each character is a "digit." Shifting the window one position right is like shifting a number — multiply by base (shift left) and add the new digit, minus the old leading digit's contribution. Because this is pure arithmetic, it takes O(1) per step.

**Hash collisions** occur when two different strings produce the same hash — a false positive. The character-by-character check catches this. With a single hash and adversarial input, worst-case time degrades to O(nm). **Double hashing** (two independent hash functions, both must match) reduces collision probability to near zero: the probability drops from ~1/MOD to ~1/(MOD1 × MOD2), making false positives essentially impossible in practice.

### When to use?
- Searching for **multiple patterns** simultaneously — hash all patterns into a HashSet; one pass over the text checks all patterns at once (KMP cannot do this easily).
- Finding **duplicate substrings of length k** — collect all window hashes into a set, check for repeats.
- "Longest duplicate substring" — binary search on length, use rolling hash to verify.

### When NOT to use?
- When you need a worst-case O(n+m) guarantee — use KMP (Rabin-Karp has O(nm) worst case).
- For subsequence matching — rolling hash requires a contiguous window.
- For a single, one-time pattern search on small strings — `indexOf` is simpler.

### How to recognize in a new problem?
Ask: "Am I searching for a pattern (or patterns) of fixed length in a larger string, or looking for repeated substrings?"
Key signals:
- "Find all occurrences of pattern in text"
- "Find all duplicate substrings of length k"
- "Longest duplicate / repeating substring"

### Simple Example
**Input:** text = "abcabc", pattern = "abc"
**Expected Output:** [0, 3]
**Trace:**
```
m=3, base=26, MOD=101
pattern hash("abc") = (1*676 + 2*26 + 3) % 101 = 731 % 101 = 24
power = base^2 % MOD = 676 % 101 = 71

Window i=0, "abc": hash=24 → matches pattern hash → verify "abc"=="abc" → MATCH at 0
Roll: remove 'a'(val=1), add 'a'(val=1 at text[3])
Window i=1, "bca": hash = (24 - 1*71)*26 + 1) % 101 → ≠ 24 → skip
Window i=2, "cab": hash ≠ 24 → skip
Window i=3, "abc": hash=24 → verify → MATCH at 3

Output: [0, 3]
```

### Code
```java
// Java — Rabin-Karp with double hashing
public List<Integer> rabinKarp(String text, String pattern) {
    List<Integer> result = new ArrayList<>();
    int n = text.length(), m = pattern.length();
    if (m > n) return result;

    final long BASE = 31L;
    final long MOD1 = 1_000_000_007L; // two independent moduli = double hashing
    final long MOD2 = 998_244_353L;

    // Precompute base^(m-1) for rolling off the leftmost character
    long power1 = 1, power2 = 1;
    for (int i = 0; i < m - 1; i++) {
        power1 = power1 * BASE % MOD1;
        power2 = power2 * BASE % MOD2;
    }

    // Compute pattern hash and first window hash
    long pH1 = 0, pH2 = 0, wH1 = 0, wH2 = 0;
    for (int i = 0; i < m; i++) {
        long pc = pattern.charAt(i) - 'a' + 1;
        long tc = text.charAt(i) - 'a' + 1;
        pH1 = (pH1 * BASE + pc) % MOD1;
        pH2 = (pH2 * BASE + pc) % MOD2;
        wH1 = (wH1 * BASE + tc) % MOD1;
        wH2 = (wH2 * BASE + tc) % MOD2;
    }

    for (int i = 0; i <= n - m; i++) {
        // Both hashes must match (double hashing kills false positives)
        if (wH1 == pH1 && wH2 == pH2) {
            if (text.substring(i, i + m).equals(pattern)) result.add(i); // verify
        }
        if (i < n - m) {
            long out = text.charAt(i) - 'a' + 1;
            long in  = text.charAt(i + m) - 'a' + 1;
            // Roll: remove leftmost, shift, add rightmost
            wH1 = ((wH1 - out * power1 % MOD1 + MOD1) * BASE + in) % MOD1;
            wH2 = ((wH2 - out * power2 % MOD2 + MOD2) * BASE + in) % MOD2;
        }
    }
    return result;
}
```
```javascript
// JavaScript — Rabin-Karp with double hashing (BigInt for precision)
function rabinKarp(text, pattern) {
    const result = [];
    const n = text.length, m = pattern.length;
    if (m > n) return result;

    const BASE = 31n, MOD1 = 1_000_000_007n, MOD2 = 998_244_353n;
    const a = 'a'.charCodeAt(0);

    let power1 = 1n, power2 = 1n;
    for (let i = 0; i < m - 1; i++) {
        power1 = power1 * BASE % MOD1;
        power2 = power2 * BASE % MOD2;
    }

    let pH1 = 0n, pH2 = 0n, wH1 = 0n, wH2 = 0n;
    for (let i = 0; i < m; i++) {
        const pc = BigInt(pattern.charCodeAt(i) - a + 1);
        const tc = BigInt(text.charCodeAt(i) - a + 1);
        pH1 = (pH1 * BASE + pc) % MOD1; pH2 = (pH2 * BASE + pc) % MOD2;
        wH1 = (wH1 * BASE + tc) % MOD1; wH2 = (wH2 * BASE + tc) % MOD2;
    }

    for (let i = 0; i <= n - m; i++) {
        if (wH1 === pH1 && wH2 === pH2) {
            if (text.slice(i, i + m) === pattern) result.push(i);
        }
        if (i < n - m) {
            const out = BigInt(text.charCodeAt(i) - a + 1);
            const inn = BigInt(text.charCodeAt(i + m) - a + 1);
            wH1 = ((wH1 - out * power1 % MOD1 + MOD1) * BASE + inn) % MOD1;
            wH2 = ((wH2 - out * power2 % MOD2 + MOD2) * BASE + inn) % MOD2;
        }
    }
    return result;
}
```

### Dry Run

text = "aaab", pattern = "aab" (simplified hash shown as H for brevity)

| i | Window | Hash == Pattern Hash? | Verified? | Roll |
|---|--------|-----------------------|-----------|------|
| 0 | "aaa"  | No                    | —         | Remove 'a', add 'b' |
| 1 | "aab"  | Yes                   | Yes → add 1 | Remove 'a', done |

Output: [1]

### Complexity
```
Time:  O(n + m) average — O(nm) worst case if every window hash-collides (rare with double hashing)
Space: O(1) — only a handful of hash variables; O(k) if hashing k patterns into a set
```

### Common Trap
Two traps that bite everyone the first time:
1. **Forgetting the character-by-character verification after a hash match.** A hash match is a hint, not a proof. Without verification you get wrong answers on hash collisions.
2. **Negative modulo arithmetic.** When rolling off the leftmost character, `hash - val*power` can go negative in Java and JavaScript. Always add MOD before taking the modulus: `(hash - val*power % MOD + MOD) % MOD`.

### Experience Tip
Rabin-Karp's biggest interview showcase is the **"longest duplicate substring"** pattern (LC 1044): binary search on the answer length L, then use a rolling hash to check whether any substring of length L appears twice. This binary-search-on-length + Rabin-Karp-verification combination is a powerful template. Also, when a problem says "find all repeated substrings of length k," Rabin-Karp + HashSet is the clean O(n) solution.

### Do Not Confuse With

| | Rabin-Karp | KMP |
|---|---|---|
| Use case | Pattern search (especially multiple patterns at once); duplicate substring detection | Single pattern search with strict worst-case guarantee |
| Key difference | Uses rolling hash; O(nm) worst case due to collisions | Uses LPS failure function; always O(n+m) regardless of input |
| When it's better | Searching many patterns simultaneously (hash all into a Set, one pass) | When you need guaranteed O(n+m) or want to analyze pattern structure (rotation, period) |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 28 | Find the Index of the First Occurrence in a String | Easy | Classic pattern match — implement with rolling hash to learn the mechanics | https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/ |
| 187 | Repeated DNA Sequences | Medium | "Substrings of length 10 that appear more than once" — classic rolling hash + HashSet signal | https://leetcode.com/problems/repeated-dna-sequences/ |
| 718 | Maximum Length of Repeated Subarray | Medium | Longest common subarray of two arrays — binary search on length + rolling hash | https://leetcode.com/problems/maximum-length-of-repeated-subarray/ |
| 1044 | Longest Duplicate Substring | Hard | Binary search on answer length + rolling hash to verify — the canonical Rabin-Karp problem | https://leetcode.com/problems/longest-duplicate-substring/ |
| 1062 | Longest Repeating Substring | Medium | Same idea: binary search on length, hash windows | https://leetcode.com/problems/longest-repeating-substring/ |
| 2156 | Find Substring With Given Hash Value | Hard | Reverse rolling hash — tests deep understanding of the formula | https://leetcode.com/problems/find-substring-with-given-hash-value/ |

### One-Minute Revision
```
ALGORITHM:       Rabin-Karp
IN SIMPLE WORDS: Hash the pattern; slide a fixed window computing rolling hash in O(1);
                 only do full string comparison when hashes match.
USE WHEN:        Pattern search (multiple patterns at once), duplicate/repeated substrings
CORE IDEA:       Rolling hash — subtract outgoing char, multiply by base, add incoming char
TIME/SPACE:      O(n+m) average, O(nm) worst / O(1) extra space
TRAP:            Skipping verification after hash match; negative modulo (always add MOD before %)
SIGNAL:          "repeated substrings of length k", "duplicate substring", "find pattern in text"
```

---

## 7. Z-Algorithm

### What is it?
Imagine reading a book and asking: "How many words starting right here match the very beginning of the book?" The Z-algorithm answers this for every position of a string at once. Z[i] = the length of the longest substring starting at position i that is also a prefix of the full string. Z[0] is defined as 0 by convention (the whole string trivially matches itself, but we exclude that to keep it useful). This one array — computed in O(n) — enables fast pattern matching, period detection, and prefix-overlap queries.

### Visual
```
s = "aabxaab"
     0123456

What does Z[i] mean?
  Z[4] = 3 means: the substring starting at index 4 ("aab") matches the first 3 characters
                  of s ("aab"). It is the longest such match.

Computing Z step by step:
  i=0: Z[0] = 0  (convention)
  i=1: compare s[1]='a' vs s[0]='a' ✓, s[2]='b' vs s[1]='a' ✗ → Z[1] = 1
  i=2: compare s[2]='b' vs s[0]='a' ✗ → Z[2] = 0
  i=3: compare s[3]='x' vs s[0]='a' ✗ → Z[3] = 0
  i=4: compare s[4]='a'=s[0] ✓, s[5]='a'=s[1] ✓, s[6]='b'=s[2] ✓, end → Z[4] = 3
  i=5: compare s[5]='a'=s[0] ✓, s[6]='b'≠s[1]='a' ✗ → Z[5] = 1
  i=6: compare s[6]='b'≠s[0]='a' ✗ → Z[6] = 0

Z = [0, 1, 0, 0, 3, 1, 0]
                  ^
                  Z[4]=3: "aab" at position 4 matches prefix "aab"

Z-box [L, R] — the optimization:
  After computing Z[4]=3, we know s[4..6] = s[0..2] = "aab".
  This is our Z-box: L=4, R=6. For any future i inside [4,6], we get a head start:
  mirror of i around L is i' = i - L. Z[i] starts at Z[i'] (capped at R-i).
  No re-reading characters already known to match.
```

### How does it work?
1. Initialize Z[0] = 0. Maintain `L` and `R` — the left and right ends of the rightmost Z-box (the interval [L, R] where s[L..R] is known to equal s[0..R-L]).
2. For each i from 1 to n-1:
   - **If i > R** (outside any known Z-box): compare s[i], s[i+1], ... with s[0], s[1], ... from scratch until a mismatch. Set Z[i] to the match length. If Z[i] > 0, update L = i, R = i + Z[i] - 1.
   - **If i <= R** (inside the current Z-box): compute the mirror index `k = i - L`. Because s[L..R] = s[0..R-L], we know s[i..R] = s[k..R-L]:
     - If Z[k] < R - i + 1: Z[i] = Z[k] (the match ends before the box ends — no new info to gain).
     - If Z[k] >= R - i + 1: Z[i] starts at R - i + 1; try to extend beyond R. Update L and R if extended.
3. **Pattern matching trick**: construct `combined = pattern + "$" + text` (the "$" must not appear in either string — it acts as a firewall). Compute Z on `combined`. Any position i in the text portion where Z[i] >= len(pattern) is a match. Convert back: text index = i - len(pattern) - 1.

### Why does it work?
R never decreases — it only moves right. Every character that advances R is "paid for" once. Inside the Z-box, Z[k] (the mirror) gives us the answer for free — we copy it without doing new comparisons. The only new work is extending beyond R. Total comparisons that advance R: at most n. So O(n) total.

### When to use?
- Pattern matching in O(n + m) — an alternative to KMP with a different mental model.
- Detecting the shortest repeating period of a string (related to Z values).
- Problems that naturally ask "how much of the beginning does this position share?"

### When NOT to use?
- For palindrome detection — Z-algorithm compares against the beginning, not the mirror. Use Manacher's or Expand Around Center.
- For multiple distinct patterns — use Aho-Corasick (Z handles one pattern at a time).

### How to recognize in a new problem?
Ask: "Does solving this require knowing, for each position, how long a prefix of the whole string matches starting there?"
Key signals:
- "Find all occurrences of pattern in text"
- "Shortest period of the string"
- "Longest prefix that is also a suffix" (compare with KMP's LPS array)

### Simple Example
**Input:** text = "aabcaab", pattern = "aab"
**Expected Output:** [0, 4]
**Trace:**
```
combined = "aab$aabcaab"
index:      0123456789A  (A=10)

Z array on combined:
  Z[0]=0 (convention)
  Z[1]=1  ('a'='a', 'b'≠'a') → 1
  Z[2]=0  ('b'≠'a') → 0
  Z[3]=0  ('$'≠'a') → 0
  Z[4]=3  'a','a','b' match s[0..2]="aab" → Z[4]=3
  Z[5]=1  ('a'='a', 'b'='a'? no) → 1
  Z[6]=0  ('b'≠'a') → 0
  Z[7]=0  ('c'≠'a') → 0
  Z[8]=3  'a','a','b' match "aab" → Z[8]=3
  Z[9]=1  → 1
  Z[10]=0 → 0

pattern length m=3, text starts at index m+1=4 in combined.
Positions i where Z[i] >= 3: i=4 and i=8.
Text index = i - m - 1: 4-3-1=0 and 8-3-1=4.
Output: [0, 4] ✓
```

### Code
```java
// Java — Z-Algorithm for Pattern Matching
public List<Integer> zSearch(String text, String pattern) {
    // "$" separator ensures Z values never span pattern→text boundary
    String s = pattern + "$" + text;
    int n = s.length(), m = pattern.length();
    int[] z = buildZ(s);

    List<Integer> result = new ArrayList<>();
    for (int i = m + 1; i < n; i++) {
        if (z[i] >= m) result.add(i - m - 1); // map back to text index
    }
    return result;
}

private int[] buildZ(String s) {
    int n = s.length();
    int[] z = new int[n];
    int L = 0, R = 0; // Z-box: s[L..R-1] = s[0..R-L-1]

    for (int i = 1; i < n; i++) {
        if (i < R) {
            // Inside box: mirror gives us a free lower bound
            z[i] = Math.min(R - i, z[i - L]);
        }
        // Try to extend beyond R (or from scratch if i >= R)
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) {
            z[i]++;
        }
        // Update box if we pushed R further right
        if (i + z[i] > R) {
            L = i;
            R = i + z[i];
        }
    }
    return z;
}
```
```javascript
// JavaScript — Z-Algorithm for Pattern Matching
function zSearch(text, pattern) {
    const s = pattern + '$' + text;
    const n = s.length, m = pattern.length;
    const z = buildZ(s);
    const result = [];
    for (let i = m + 1; i < n; i++) {
        if (z[i] >= m) result.push(i - m - 1);
    }
    return result;
}

function buildZ(s) {
    const n = s.length;
    const z = new Array(n).fill(0);
    let L = 0, R = 0;
    for (let i = 1; i < n; i++) {
        if (i < R) z[i] = Math.min(R - i, z[i - L]); // free lower bound from mirror
        while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++; // extend
        if (i + z[i] > R) { L = i; R = i + z[i]; }               // update box
    }
    return z;
}
```

### Dry Run

s = "abab"

| i | i vs R | Mirror k=i-L | z[k] | Start z[i] | Extend? | Final z[i] | L | R |
|---|--------|--------------|------|------------|---------|------------|---|---|
| 1 | 1≥0    | —            | —    | 0          | 'b'≠'a' → no | 0 | 0 | 0 |
| 2 | 2≥0    | —            | —    | 0          | 'a'='a','b'='b',end → yes | 2 | 2 | 4 |
| 3 | 3<4    | k=3-2=1, z[1]=0 | 0 | min(1,0)=0 | 'b'≠'a' → no | 0 | 2 | 4 |

Z = [0, 0, 2, 0] — Z[2]=2 means "ab" at index 2 matches the prefix "ab" of length 2.

### Complexity
```
Time:  O(n) — R only moves right; total character comparisons that advance R is at most n
Space: O(n) — the Z array (plus O(n+m) for the combined string in pattern matching)
```

### Common Trap
Forgetting the `"$"` separator when combining `pattern + text` for pattern matching. Without it, the Z values at text positions can bleed across the boundary and count characters from both the pattern and the text — giving Z[i] values larger than the pattern length even where there is no real match. The separator character must not appear in either the pattern or the text.

### Experience Tip
Z-algorithm and KMP solve the same core problem with different perspectives. Z says: "how far does each position match the beginning?" KMP says: "when a match fails, how far can I reuse what I've matched?" For most interviewers, knowing one deeply is sufficient. Z-algorithm code is often considered slightly cleaner to implement from scratch — the `buildZ` function has no tricky index shifts like KMP's `lps[j-1]`. Practice writing `buildZ` from memory.

### Do Not Confuse With

| | Z-Algorithm | KMP |
|---|---|---|
| Use case | Pattern matching; "how much prefix does position i share?" | Pattern matching; efficient recovery on mismatch |
| Key difference | Builds Z[i] = prefix match length at every position of the full string | Builds LPS[i] = longest prefix=suffix within the pattern only |
| When it's better | When the problem involves prefix-match lengths across the whole string (e.g., string periodicity) | When you need to understand pattern structure (rotation, repetition detection via LPS) |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 28 | Find the Index of the First Occurrence in a String | Easy | Classic: use pattern+"$"+text, find Z[i]>=m | https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/ |
| 459 | Repeated Substring Pattern | Easy | Z-array reveals periodicity: if Z[i] + i == n and n % i == 0, s has period i | https://leetcode.com/problems/repeated-substring-pattern/ |
| 796 | Rotate String | Easy | Is s a rotation of goal? → check if s appears in goal+goal | https://leetcode.com/problems/rotate-string/ |
| 1392 | Longest Happy Prefix | Hard | Longest prefix which is also suffix — Z[i]+i==n means Z[i] is such a length | https://leetcode.com/problems/longest-happy-prefix/ |
| 214 | Shortest Palindrome | Hard | Find longest palindrome starting at index 0 using Z or KMP | https://leetcode.com/problems/shortest-palindrome/ |
| 3008 | Find Beautiful Indices in the Given Array II | Hard | Z-search for two patterns, then merge results | https://leetcode.com/problems/find-beautiful-indices-in-the-given-array-ii/ |

### One-Minute Revision
```
ALGORITHM:       Z-Algorithm
IN SIMPLE WORDS: For each position i, Z[i] = how many characters starting at i match
                 the beginning of the string. Computed in O(n) using a sliding Z-box.
USE WHEN:        Pattern matching (pattern+"$"+text trick); string periodicity; prefix-overlap queries
CORE IDEA:       Z-box [L,R] caches known prefix matches; R never moves left → O(n) total work
TIME/SPACE:      O(n) / O(n)
TRAP:            Missing "$" separator in combined string → wrong Z values bleed across boundary
SIGNAL:          "find all occurrences", "repeated/periodic pattern", "prefix that matches at position i"
```

---

## 8. Manacher's Algorithm

### What is it?
Finding all palindromes by expanding around each center (the simple approach) is O(n²) in the worst case. For a string like "aaaaaa", the center at position 3 alone requires 6 comparisons; repeat this for every center and you have O(n²) total. Manacher's algorithm avoids this by noticing: if you already found a large palindrome P centered at C, then every center i inside P has a **mirror** i' on the other side of C, and the palindrome at i' has already been computed. You copy that value as a free head start. Only work that pushes past the right edge of P is "new." Since the right edge only ever moves rightward, total new comparisons across all centers is O(n).

Formally: Manacher's computes, for every position, the radius of the longest palindromic substring centered there — in O(n) time, by reusing the mirror symmetry of the rightmost known palindrome.

### Visual
```
s = "abacaba"   (the whole string is a palindrome)
     0123456

p[i] = palindrome radius (how far we can expand from center i)

Step-by-step:
  i=0 ('a'): expand → only "a" → p[0]=0
  i=1 ('b'): s[0]='a'==s[2]='a' ✓, s[-1] out of bounds → p[1]=1, set C=1, R=2
  i=2 ('a'): s[1]='b'≠s[3]='c' ✗ → p[2]=0
  i=3 ('c'): s[2]='a'==s[4]='a', s[1]='b'==s[5]='b', s[0]='a'==s[6]='a', bounds → p[3]=3
             This is a big palindrome: C=3, R=6 (rightmost right edge so far)
  i=4 ('a'): i=4 < R=6 → use mirror! mirror = 2*C-i = 2*3-4 = 2, p[mirror]=p[2]=0
             R-i = 6-4 = 2 > p[mirror]=0 → p[4] starts at 0. Extend: s[3]='c'≠s[5]='b' → p[4]=0
  i=5 ('b'): i=5 < R=6 → mirror = 2*3-5=1, p[1]=1. R-i=6-5=1 == p[mirror]=1 → must check past R
             s[4]='a'==? but i+p[i]+1=7 is out of bounds → p[5]=1
  i=6 ('a'): i=6 == R → p[6]=0. Extend: out of bounds → p[6]=0

p = [0, 1, 0, 3, 0, 1, 0]
              ^
            p[3]=3: palindrome "abacaba" of radius 3 (the whole string)

Why "expand around center" is O(n²) but Manacher's is O(n):
  String "aaaaaaa":
  Naive:      center 0→1 comp, center 1→3 comps, center 2→5 comps... total = O(n²)
  Manacher's: after finding p[3]=3 (C=3, R=6), centers 4,5,6 get p[mirror] for free.
              Only new comparisons push R beyond 6. R moves at most n steps total → O(n).
```

### How does it work?

**Step 1 — Transform the string.** Insert a separator between every character to unify odd and even palindromes into one case. Add boundary characters that cannot appear in the input to avoid bounds checks:
```
"abba" → "$#a#b#b#a#@"   (even palindrome "abba" now has center '#' between the two b's)
"aba"  → "$#a#b#a#@"     (odd palindrome — center is 'b' at index 4)
```
In the transformed string, every palindrome has exactly one center character.

**Step 2 — Compute p[] using the Z-box idea:**
1. Initialize `p[i] = 0` for all i. Track `C` = center of the rightmost palindrome so far, `R` = its right edge.
2. For each center i (skip the boundary characters):
   - If `i < R`: set `p[i] = min(R - i, p[2*C - i])`. This copies the mirror's radius, capped at the box boundary.
   - Try to expand: `while t[i + p[i] + 1] == t[i - p[i] - 1]: p[i]++`. The boundary chars "$" and "@" automatically stop the loop.
   - If `i + p[i] > R`: update `C = i`, `R = i + p[i]`.
3. Find the maximum in p[]. Its index gives the center; its value gives the radius. Map back to original string coordinates: `start = (centerIndex - maxP) / 2`.

### Why does it work?
When i is inside the current rightmost palindrome [C-R', C+R'] (where R' = p[C]), center i has a mirror i' = 2C - i. Because C's palindrome is symmetric, p[i] and p[i'] describe symmetric palindromes. So p[i] >= min(p[i'], R - i). The `min` caps at the box boundary — we cannot claim anything beyond R without checking. Expansion beyond R is the only new work. Since R only moves right, the total number of such expansions across all centers is O(n).

### When to use?
- Longest palindromic substring when n > 10^4 and O(n²) times out.
- Counting all palindromic substrings in O(n).
- Any Hard problem that requires O(n) palindrome preprocessing.

### When NOT to use?
- For most interview problems (n ≤ 10^4), Expand Around Center is simpler and equally correct — prefer it unless O(n) is explicitly required.
- For palindromic **subsequences** — Manacher's only handles contiguous substrings.

### How to recognize in a new problem?
Ask: "Does the problem need palindromic substrings and is n large enough that O(n²) times out?"
Key signals:
- "Longest palindromic substring" with n up to 10^5 or 10^6
- "Count all palindromic substrings" (O(n) needed)
- "Maximum product of two non-overlapping palindromic substrings"

### Simple Example
**Input:** s = "babad"
**Expected Output:** "bab" (length 3)
**Trace (on transformed string):**
```
Transformed t = "$#b#a#b#a#d#@"
Index:           0 1 2 3 4 5 6 7 8 9 10 11 12

Key centers:
  i=4 (char 'a'): expand outward in t
    t[3]='#'==t[5]='#' ✓, t[2]='b'==t[6]='b' ✓, t[1]='#'==t[7]='#' ✓
    t[0]='$'≠t[8]='a' ✗ → p[4]=3   → Set C=4, R=7
  i=6 (char 'b'): i=6 < R=7 → mirror=2*4-6=2, p[2]=0. R-i=1 > p[mirror]=0.
    Start p[6]=0. Expand: t[5]='#'==t[7]='#' ✓, t[4]='a'==t[8]='a' ✓,
    t[3]='#'==t[9]='#' ✓, t[2]='b'==t[10]='d' ✗ → p[6]=3   → Update C=6, R=9

Max p[i]=3 (at i=4 and i=6).
For i=4: start = (4 - 3) / 2 = 0, length = 3 → s[0..2] = "bab"
Answer: "bab" ✓
```

### Code
```java
// Java — Manacher's Algorithm (O(n) longest palindromic substring)
public String longestPalindrome(String s) {
    // Transform: "abc" → "$#a#b#c#@"
    // '$' and '@' are sentinels that stop expansion without bounds checks
    StringBuilder sb = new StringBuilder("$#");
    for (char c : s.toCharArray()) { sb.append(c); sb.append('#'); }
    sb.append('@');
    String t = sb.toString();
    int n = t.length();

    int[] p = new int[n];   // p[i] = palindrome radius at center i in transformed string
    int C = 0, R = 0;       // C = center, R = right edge of rightmost palindrome

    for (int i = 1; i < n - 1; i++) {
        int mirror = 2 * C - i; // mirror of i around C
        if (i < R) {
            p[i] = Math.min(R - i, p[mirror]); // free head start from mirror
        }
        // Expand outward from i (sentinels prevent ArrayIndexOutOfBounds)
        while (t.charAt(i + p[i] + 1) == t.charAt(i - p[i] - 1)) {
            p[i]++;
        }
        // Update rightmost palindrome if we pushed R further
        if (i + p[i] > R) {
            C = i;
            R = i + p[i];
        }
    }

    // Find center with maximum radius
    int maxLen = 0, centerIdx = 0;
    for (int i = 1; i < n - 1; i++) {
        if (p[i] > maxLen) { maxLen = p[i]; centerIdx = i; }
    }
    int start = (centerIdx - maxLen) / 2; // map back to original string index
    return s.substring(start, start + maxLen);
}
```
```javascript
// JavaScript — Manacher's Algorithm
function longestPalindrome(s) {
    const t = '$#' + s.split('').join('#') + '#@';
    const n = t.length;
    const p = new Array(n).fill(0);
    let C = 0, R = 0;

    for (let i = 1; i < n - 1; i++) {
        const mirror = 2 * C - i;
        if (i < R) p[i] = Math.min(R - i, p[mirror]); // free head start
        while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++; // expand
        if (i + p[i] > R) { C = i; R = i + p[i]; }           // update box
    }

    let maxLen = 0, centerIdx = 0;
    for (let i = 1; i < n - 1; i++) {
        if (p[i] > maxLen) { maxLen = p[i]; centerIdx = i; }
    }
    const start = (centerIdx - maxLen) / 2;
    return s.slice(start, start + maxLen);
}
```

### Dry Run

s = "aba", transformed t = "$#a#b#a#@"

| i | t[i] | i vs R | mirror | p[mirror] | Start p[i] | Expansion result | Final p[i] | Update C,R? |
|---|------|--------|--------|-----------|------------|-----------------|------------|-------------|
| 1 | '#'  | 1≥0    | —      | —         | 0          | t[0]='$'≠t[2]='a' → stop | 0 | No |
| 2 | 'a'  | 2≥0    | —      | —         | 0          | t[1]='#'=t[3]='#', t[0]='$'≠t[4]='b' → 1 | 1 | C=2, R=3 |
| 3 | '#'  | 3=R    | —      | —         | 0          | t[2]='a'≠t[4]='b' → 0 | 0 | No |
| 4 | 'b'  | 4≥R    | —      | —         | 0          | t[3]='#'=t[5]='#', t[2]='a'=t[6]='a', t[1]='#'=t[7]='#', t[0]='$'≠t[8]='@' → 3 | 3 | C=4, R=7 |
| 5 | '#'  | 5<7    | 3      | p[3]=0    | min(2,0)=0 | t[4]='b'≠t[6]='a' → 0 | 0 | No |
| 6 | 'a'  | 6<7    | 2      | p[2]=1    | min(1,1)=1 | t[5]='#'=t[7]='#', t[4]='b'≠t[8]='@' → 1 (already at 1) | 1 | No |
| 7 | '#'  | 7=R    | —      | —         | 0          | t[6]='a'≠t[8]='@' → 0 | 0 | No |

Max p[i]=3 at i=4. start=(4-3)/2=0, length=3 → s[0..2]="aba" ✓

### Complexity
```
Time:  O(n) — R only moves right; total characters pushed past R across all steps is at most n
Space: O(n) — the transformed string (length 2n+3) and the p[] array
```

### Common Trap
**Forgetting the string transformation.** Without inserting "#" between characters, even-length palindromes like "abba" have no single center character — you would need separate odd/even expansion logic (exactly what Expand Around Center does). The transformation makes every palindrome have exactly one center, so one pass handles all cases. Also: forget the "$" and "@" boundary sentinels and the `while` loop will throw an index out of bounds error.

### Experience Tip
In interviews, Manacher's is a "show-stopper" algorithm — most candidates don't know it. If you can explain the mirror insight ("p[i] >= min(p[mirror], R-i); only work past R is new; R never decreases") clearly, you demonstrate deep algorithmic thinking. The code itself is ~15 lines once you have the transformation. Practice explaining the *why* before memorizing the code.

### Do Not Confuse With

| | Manacher's Algorithm | Expand Around Center |
|---|---|---|
| Use case | Palindromic substrings when O(n) is required (large n) | Palindromic substrings when O(n²) is acceptable |
| Key difference | Reuses mirror palindrome radii to skip redundant expansions | Expands from scratch at every center |
| When it's better | n > 10^4, Hard-level problems, competitive programming | Most interviews — simpler to implement and explain |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 5 | Longest Palindromic Substring | Medium | Implement both Expand Around Center and Manacher's; compare | https://leetcode.com/problems/longest-palindromic-substring/ |
| 647 | Palindromic Substrings | Medium | Sum all palindromes: each unit expansion at center i contributes 1 | https://leetcode.com/problems/palindromic-substrings/ |
| 214 | Shortest Palindrome | Hard | Find longest palindrome prefix: Manacher's or KMP on s+"#"+reverse(s) | https://leetcode.com/problems/shortest-palindrome/ |
| 1960 | Maximum Product of the Length of Two Palindromic Substrings | Hard | Manacher's gives all radii; then prefix/suffix max array | https://leetcode.com/problems/maximum-product-of-the-length-of-two-palindromic-substrings/ |
| 132 | Palindrome Partitioning II | Hard | DP + palindrome precomputation; Manacher's speeds up the is-palindrome check | https://leetcode.com/problems/palindrome-partitioning-ii/ |
| 336 | Palindrome Pairs | Hard | Hash-based; Manacher's useful for checking palindrome substrings quickly | https://leetcode.com/problems/palindrome-pairs/ |

### One-Minute Revision
```
ALGORITHM:       Manacher's Algorithm
IN SIMPLE WORDS: Compute palindrome radii for all centers in O(n) by copying the mirror's
                 radius as a free starting point, then only expanding past the known right edge.
USE WHEN:        Longest/count palindromic SUBSTRINGS when O(n²) is too slow (n > 10^4)
CORE IDEA:       p[i] >= min(p[mirror], R-i); expand past R; R never decreases → O(n) total
TIME/SPACE:      O(n) / O(n)
TRAP:            Forgetting to transform string with "#" separators (even-length palindromes break)
SIGNAL:          "palindromic substring" with large n; Hard-level palindrome problems
```

---

## 9. Suffix Arrays

### What is it?
A **suffix** of a string is any tail — the part from some position to the end. "banana" has 6 suffixes: "banana", "anana", "nana", "ana", "na", "a". A **suffix array** is the list of starting indices of all these suffixes, sorted in lexicographic (dictionary) order. It is just a sorted array of integers — no complex data structure. But because it encodes the sorted order of all n suffixes, it lets you binary-search for any pattern in O(m log n) time, and when paired with an **LCP array** (Longest Common Prefix between adjacent sorted suffixes), it solves nearly every string structure problem: longest repeated substring, longest common substring of two strings, number of distinct substrings.

### Visual
```
String s = "banana"  (length n=6)

All suffixes with their starting index:
  Index 0 → "banana"
  Index 1 → "anana"
  Index 2 → "nana"
  Index 3 → "ana"
  Index 4 → "na"
  Index 5 → "a"

Sort lexicographically (alphabetical order):
  "a"      → starts at index 5   ← smallest
  "ana"    → starts at index 3
  "anana"  → starts at index 1
  "banana" → starts at index 0
  "na"     → starts at index 4
  "nana"   → starts at index 2   ← largest

Suffix Array SA = [5, 3, 1, 0, 4, 2]
                   ^  ^  ^  ^  ^  ^
               SA[0] SA[1] ... SA[5]
               (index of 1st-smallest ... 6th-smallest suffix)

LCP Array (Longest Common Prefix between consecutive entries in SA):
  SA[0]=5 → "a"      | SA[1]=3 → "ana"    | common prefix: "a"    → LCP[1]=1
  SA[1]=3 → "ana"    | SA[2]=1 → "anana"  | common prefix: "ana"  → LCP[2]=3
  SA[2]=1 → "anana"  | SA[3]=0 → "banana" | common prefix: ""     → LCP[3]=0
  SA[3]=0 → "banana" | SA[4]=4 → "na"     | common prefix: ""     → LCP[4]=0
  SA[4]=4 → "na"     | SA[5]=2 → "nana"   | common prefix: "na"   → LCP[5]=2

LCP = [0, 1, 3, 0, 0, 2]

Key insight: max(LCP) = 3 → longest repeated substring has length 3 → "ana"
(appears at index 1 and index 3 — two different starting positions, both in SA)
```

### How does it work?

**Simple construction (interview-appropriate O(n log² n)):**
1. Create an array `sa` of indices [0, 1, 2, ..., n-1].
2. Sort `sa` by comparing the suffixes they represent: `sa.sort((a, b) -> s.substring(a).compareTo(s.substring(b)))`.
3. The sorted array is the suffix array.

**Pattern search using SA (binary search, O(m log n)):**
- Binary search for the first position where a suffix starts with the pattern.
- Binary search for the last such position.
- All positions between them (inclusive) are matches.

**LCP array construction — Kasai's algorithm (O(n)):**
1. Build a `rank` array: `rank[sa[i]] = i` (the inverse of SA — tells you where suffix i sits in the sorted order).
2. Process suffixes in original string order (i=0 to n-1). For suffix i at rank `rank[i]`, compare it with the previous suffix in sorted order, `sa[rank[i]-1]`. Extend the match as far as possible.
3. Key invariant: if suffix i has LCP length h with its neighbor, then suffix i+1 has LCP length at least h-1 with its neighbor. So h decreases by at most 1 per step → total work O(n).

### Why does it work?
Sorting brings related suffixes together. Any occurrence of a pattern P in the text starts a suffix that begins with P. All such suffixes sort into a contiguous range in the suffix array — because in lexicographic order, all strings starting with "abc..." are grouped together. Binary search finds the start and end of this range in O(m log n). The LCP array tells you exactly how much consecutive sorted suffixes overlap — the maximum LCP is the longest piece of the string that appears at two or more different positions.

### When to use?
- **Multiple pattern queries on a fixed text**: build SA once in O(n log n), answer each query in O(m log n).
- **Longest repeated substring**: the answer is `max(LCP)` and can be read off in O(n).
- **Longest common substring of two strings**: concatenate with a separator ("$"), build SA, find adjacent suffixes from different strings with maximum LCP.
- **Number of distinct substrings**: `n*(n+1)/2 - sum(LCP)`.

### When NOT to use?
- For a single pattern search on a string you won't reuse — KMP or Z-algorithm is simpler.
- For palindromes — Manacher's is purpose-built.
- For small n — the O(n log n) construction overhead is not worth it.

### How to recognize in a new problem?
Ask: "Is the text fixed while I need to answer many substring queries?" or "Does the problem involve all suffixes and their relationships (repetitions, common substrings)?"
Key signals:
- "Longest repeated substring"
- "Longest common substring of two strings"
- "Number of distinct substrings"
- "How many times does pattern P appear?" (for many different patterns P)

### Simple Example
**Input:** s = "aab"
**Expected Output:** SA = [0, 1, 2]
**Trace:**
```
Suffixes:
  Index 0 → "aab"
  Index 1 → "ab"
  Index 2 → "b"

Compare: "aab" vs "ab":  a=a, a<b → "aab" comes first
Compare: "ab"  vs "b":   a<b → "ab" comes first
Compare: "aab" vs "b":   a<b → "aab" comes first

Sorted order: "aab" (0) < "ab" (1) < "b" (2)
SA = [0, 1, 2]

LCP:
  "aab" and "ab": common prefix "a" → LCP[1]=1
  "ab"  and "b":  no common prefix → LCP[2]=0
LCP = [0, 1, 0]
```

### Code
```java
// Java — Suffix Array (simple construction + Kasai's LCP)
public int[] buildSuffixArray(String s) {
    int n = s.length();
    Integer[] sa = new Integer[n];
    for (int i = 0; i < n; i++) sa[i] = i;

    // O(n log² n): each comparison is O(n), sort is O(n log n) comparisons
    Arrays.sort(sa, (a, b) -> s.substring(a).compareTo(s.substring(b)));

    int[] result = new int[n];
    for (int i = 0; i < n; i++) result[i] = sa[i];
    return result;
}

// Kasai's algorithm: build LCP array from SA in O(n)
public int[] buildLCP(String s, int[] sa) {
    int n = s.length();
    int[] rank = new int[n]; // rank[i] = position of suffix i in SA
    for (int i = 0; i < n; i++) rank[sa[i]] = i;

    int[] lcp = new int[n]; // lcp[i] = LCP between sa[i-1] and sa[i]
    int h = 0;              // current LCP length (h decreases by at most 1 per outer step)
    for (int i = 0; i < n; i++) {
        if (rank[i] > 0) {
            int j = sa[rank[i] - 1]; // the suffix just before suffix i in sorted order
            while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--; // key: LCP can only drop by 1 when moving to next suffix
        }
    }
    return lcp;
}

// Pattern search using suffix array: O(m log n) per query
public int searchPattern(String text, String pattern, int[] sa) {
    int lo = 0, hi = sa.length - 1, m = pattern.length();
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        String suffix = text.substring(sa[mid], Math.min(sa[mid] + m, text.length()));
        int cmp = suffix.compareTo(pattern.substring(0, Math.min(m, suffix.length())));
        if (cmp == 0 && suffix.length() == m) return sa[mid]; // found
        else if (cmp < 0 || (cmp == 0 && suffix.length() < m)) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1; // not found
}
```
```javascript
// JavaScript — Suffix Array (simple construction + Kasai's LCP)
function buildSuffixArray(s) {
    const n = s.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    sa.sort((a, b) => {
        const sA = s.slice(a), sB = s.slice(b);
        return sA < sB ? -1 : sA > sB ? 1 : 0;
    });
    return sa;
}

// Kasai's LCP algorithm — O(n)
function buildLCP(s, sa) {
    const n = s.length;
    const rank = new Array(n);
    for (let i = 0; i < n; i++) rank[sa[i]] = i;
    const lcp = new Array(n).fill(0);
    let h = 0;
    for (let i = 0; i < n; i++) {
        if (rank[i] > 0) {
            const j = sa[rank[i] - 1];
            while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;
        }
    }
    return lcp;
}
```

### Dry Run

s = "cab"

| Step | Action | Result |
|------|--------|--------|
| Suffixes | 0→"cab", 1→"ab", 2→"b" | — |
| Sort | "ab" < "b" < "cab" | SA = [1, 2, 0] |
| LCP[1] | "ab" vs "b": no common prefix | 0 |
| LCP[2] | "b" vs "cab": no common prefix | 0 |
| Output | SA=[1,2,0], LCP=[0,0,0] | Longest repeated substring: length 0 (no repeats) |

### Complexity
```
Time:  O(n log² n) for simple construction (n log n comparisons, each O(n))
       O(n log n) with prefix-doubling; O(n) with SA-IS (not needed in interviews)
       O(m log n) for each pattern query after SA is built
       O(n) for LCP array construction (Kasai's algorithm)
Space: O(n) for the suffix array and LCP array
```

### Common Trap
Using `substring()` inside the sort comparator is O(n) per call — making total sort O(n² log n) instead of O(n log² n). For interview problems with n ≤ 10^4, this is usually fine. For competitive programming or n up to 10^5, use prefix-doubling with rank arrays (O(n log n)). The trap is submitting the naive version on a problem with tight time limits.

### Experience Tip
The suffix array's real power comes from pairing it with the LCP array. Know this one key formula by heart: **number of distinct substrings = n*(n+1)/2 - sum(LCP)**. It follows because each suffix contributes n-sa[i] total substrings (its full length), and LCP[i] of those were already counted by the previous suffix. Also, suffix arrays replace suffix trees for almost all practical problems — they are easier to implement and use less memory.

### Do Not Confuse With

| | Suffix Array | KMP |
|---|---|---|
| Use case | Multiple pattern queries; longest repeated/common substring; all-suffix structure | Single pattern search in a single text |
| Key difference | Builds a sorted index of all n suffixes in O(n log n); answers each query in O(m log n) | Preprocesses the pattern in O(m); searches in O(n) per search |
| When it's better | Fixed text with many different patterns; structural questions about all substrings | Single or few pattern searches; simpler to implement |

### LeetCode Practice

| # | Problem | Difficulty | Pattern Signal (What to Notice) | Link |
|---|---------|------------|----------------------------------|------|
| 1044 | Longest Duplicate Substring | Hard | max(LCP) gives the answer; SA + Kasai's LCP is the clean O(n log n) solution | https://leetcode.com/problems/longest-duplicate-substring/ |
| 1062 | Longest Repeating Substring | Medium | Same as 1044 — max value in LCP array | https://leetcode.com/problems/longest-repeating-substring/ |
| 1163 | Last Substring in Lexicographical Order | Hard | Find the largest suffix lexicographically — the last entry in a suffix array | https://leetcode.com/problems/last-substring-in-lexicographical-order/ |
| 718 | Maximum Length of Repeated Subarray | Medium | Concat with separator, build SA, find adjacent LCP from different strings | https://leetcode.com/problems/maximum-length-of-repeated-subarray/ |
| 1698 | Number of Distinct Substrings in a String | Medium | n*(n+1)/2 - sum(LCP) — direct application of suffix array + LCP | https://leetcode.com/problems/number-of-distinct-substrings-in-a-string/ |
| 3076 | Shortest Uncommon Substring in an Array | Medium | Build SA per string; binary search for unique substrings | https://leetcode.com/problems/shortest-uncommon-substring-in-an-array/ |

### One-Minute Revision
```
ALGORITHM:       Suffix Arrays
IN SIMPLE WORDS: Sort all suffixes of the string; store their starting indices.
                 Binary-search for any pattern in O(m log n) after O(n log n) build.
USE WHEN:        Many pattern queries on fixed text; longest repeated/common substring;
                 distinct substring count
CORE IDEA:       Sorted suffixes let you binary-search for patterns; LCP array reveals repetition
TIME/SPACE:      O(n log² n) build, O(m log n) query, O(n) LCP / O(n) space
TRAP:            substring() in sort comparator is O(n) per call → O(n² log n) for large n
SIGNAL:          "longest repeated substring", "distinct substrings", "many pattern queries on one text"
```

---

*Next: [18-INTERVAL-AND-SWEEP-LINE.md](18-INTERVAL-AND-SWEEP-LINE.md)*
