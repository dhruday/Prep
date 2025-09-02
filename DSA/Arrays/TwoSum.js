// can you explain algorithm with step by step flow

// Step-by-step algorithm explanation:
// 1. Create a Map to store numbers and their indices as we iterate through the array.
// 2. For each element, calculate its complement (target - current element).
// 3. If the complement exists in the Map, return the indices.
// 4. Otherwise, store the current element and its index in the Map.

function twoSum(arr, target) {
    const numMap = new Map();
    for (let i = 0; i < arr.length; i++) {
        const complement = target - arr[i];
        if (numMap.has(complement)) {
            return [numMap.get(complement), i];
        }
        numMap.set(arr[i], i);
    }
    // If no solution is found, return null
    return null;
}

// Output results for each test case
console.log(twoSum([2, 7, 11, 15], 9)); // Output: [0, 1]
console.log(twoSum([3, 2, 4], 6)); // Output: [1, 2]
console.log(twoSum([3, 3], 6)); // Output: [0, 1]
console.log(twoSum([1, 5, 3, 2], 4)); // Output: [0, 3]
console.log(twoSum([0, -1, 2, -3, 1], -2)); // Output: [1, 3]
console.log(twoSum([-3, 4, 3, 90], 0)); // Output: [0, 2]