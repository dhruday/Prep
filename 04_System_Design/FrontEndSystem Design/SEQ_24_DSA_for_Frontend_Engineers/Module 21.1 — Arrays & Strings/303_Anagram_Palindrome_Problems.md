# 303 – Anagram / Palindrome Problems

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Anagram**: two strings with the same character frequencies. **Palindrome**: reads the same forwards and backwards. Both rely on **frequency counting** (Map or array[26]) or **two pointers**. Common problems: valid anagram, group anagrams, longest palindromic substring, palindrome partitioning.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Valid anagram: O(n) frequency count
function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (const c of t) {
    const count = freq.get(c) || 0;
    if (count === 0) return false;
    freq.set(c, count - 1);
  }
  return true;
}

// Group anagrams: sort each word as key
function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const key = [...s].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.values()];
}

// Longest palindromic substring: expand around center
function longestPalindrome(s: string): string {
  let result = '';
  function expand(l: number, r: number) {
    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
    if (r - l - 1 > result.length) result = s.slice(l + 1, r);
  }
  for (let i = 0; i < s.length; i++) {
    expand(i, i);     // odd length
    expand(i, i + 1); // even length
  }
  return result;
}

// Valid palindrome with alphanumeric only
function isPalindrome(s: string): boolean {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) { if (clean[l++] !== clean[r--]) return false; }
  return true;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Anagrams: frequency map comparison O(n). Group anagrams: sorted string as hash key. Palindrome: two pointers from ends, or expand-around-center for longest palindromic substring O(n²)."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Search suggestion — find anagram matches
function findAnagramMatches(query: string, words: string[]): string[] {
  const sortedQuery = [...query.toLowerCase()].sort().join('');
  return words.filter(w => [...w.toLowerCase()].sort().join('') === sortedQuery);
}
```

## 5. 🧠 MEMORY AID
**"Anagram = same frequency. Palindrome = same from both ends. Tools: frequency map, two pointers, expand-around-center."**

## 6. 🎯 COMPLEXITY
Anagram: O(n) | Group: O(n·k·log k) | Longest Palindrome: O(n²)
