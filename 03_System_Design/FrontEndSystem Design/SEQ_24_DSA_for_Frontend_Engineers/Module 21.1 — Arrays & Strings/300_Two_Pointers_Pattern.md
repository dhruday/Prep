# 300 – Two Pointers Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Two pointers technique uses two indices moving through a sorted array (or from both ends toward the center) to solve problems in O(n) instead of O(n²). Common uses: pair sum, removing duplicates, palindrome check, container with most water.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// Pattern 1: Opposite ends (sorted array)
function twoSum(nums: number[], target: number): [number, number] | null {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    sum < target ? left++ : right--;
  }
  return null;
}

// Pattern 2: Same direction (fast/slow)
function removeDuplicates(nums: number[]): number {
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) { slow++; nums[slow] = nums[fast]; }
  }
  return slow + 1;
}

// Pattern 3: Palindrome check
function isPalindrome(s: string): boolean {
  let l = 0, r = s.length - 1;
  while (l < r) {
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Two pointers works on sorted arrays or strings from both ends. Time: O(n), Space: O(1). I use it for: pair sum, palindrome, container with most water, removing duplicates."*

## 4. 💻 FRONTEND APPLICATION
```typescript
// Frontend: Find complementary items in sorted price list
function findBundledItems(prices: number[], budget: number): [number, number][] {
  const sorted = [...prices].sort((a, b) => a - b);
  const pairs: [number, number][] = [];
  let l = 0, r = sorted.length - 1;
  while (l < r) {
    const sum = sorted[l] + sorted[r];
    if (sum === budget) { pairs.push([sorted[l], sorted[r]]); l++; r--; }
    else if (sum < budget) l++;
    else r--;
  }
  return pairs;
}
```

## 5. 🧠 MEMORY AID
**"Sorted array + pair problem = Two Pointers from ends. Duplicate removal = slow/fast same direction."**

## 6. 🎯 COMPLEXITY
Time: O(n) | Space: O(1)
