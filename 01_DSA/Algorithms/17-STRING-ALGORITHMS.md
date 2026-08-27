# String Algorithms

> **4 algorithms covered:** String Sliding Window · Two Pointers on Strings · KMP Pattern Matching · Palindrome (Expand Around Center)

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

*Next: [18-INTERVAL-AND-SWEEP-LINE.md](18-INTERVAL-AND-SWEEP-LINE.md)*
