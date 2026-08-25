# 306 – Grouping and Bucketing

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Grouping and bucketing use hashmaps to categorize elements by a computed key. Examples: group anagrams (sorted chars as key), bucket sort by frequency, group by first letter, partition arrays. Pattern: compute key → add to Map<key, bucket[]>.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Generic group-by utility
function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

// Group anagrams
const groupAnagrams = (strs: string[]) =>
  [...groupBy(strs, s => [...s].sort().join('')).values()];

// Bucket sort by frequency
function sortByFrequency(s: string): string {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  const buckets: string[][] = Array.from({ length: s.length + 1 }, () => []);
  for (const [char, count] of freq) buckets[count].push(char);
  let result = '';
  for (let i = buckets.length - 1; i > 0; i--)
    for (const c of buckets[i]) result += c.repeat(i);
  return result;
}

// Partition labels — greedy grouping
function partitionLabels(s: string): number[] {
  const lastIndex = new Map<string, number>();
  for (let i = 0; i < s.length; i++) lastIndex.set(s[i], i);
  const sizes: number[] = [];
  let start = 0, end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, lastIndex.get(s[i])!);
    if (i === end) { sizes.push(end - start + 1); start = i + 1; }
  }
  return sizes;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Grouping: compute a key for each element, collect into Map<key, items[]>. Bucketing: use array indices as keys (like bucket sort). Used for anagram grouping, frequency sorting, and interval partitioning."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Group notifications by date
interface Notification { id: string; message: string; timestamp: number; }
function groupNotificationsByDate(notifs: Notification[]): Map<string, Notification[]> {
  return groupBy(notifs, n => new Date(n.timestamp).toLocaleDateString());
}
```

## 5. 🧠 MEMORY AID
**"Group by key → Map<key, items[]>. Bucket by index → array[value] = items. Think: what property groups these elements together?"**

## 6. 🎯 COMPLEXITY
Grouping: O(n) | Bucket Sort: O(n) | Space: O(n)
