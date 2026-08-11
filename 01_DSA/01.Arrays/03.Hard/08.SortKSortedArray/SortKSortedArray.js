/*
Sort K-Sorted Array

Problem Statement:
Write a function that takes in a non-negative integer k and a k-sorted array of integers. A k-sorted
array is one where each element is at most k positions away from its sorted position.

Your function should sort the array and return it.

For example, the array [3, 1, 2, 2] with k = 2 is k-sorted because:
- 3 is 2 positions away from its sorted position (at index 2)
- 1 is 1 position away from its sorted position (at index 0)
- The first 2 is 1 position away from its sorted position (at index 1)
- The second 2 is 0 positions away from its sorted position (at index 2)

Sample Input:
array = [3, 2, 1, 5, 4, 7, 6, 8, 9]
k = 3

Sample Output:
[1, 2, 3, 4, 5, 6, 7, 8, 9]

Test Cases:
1. array = [3, 2, 1, 5, 4, 7, 6, 8, 9], k = 3
   Expected Output: [1, 2, 3, 4, 5, 6, 7, 8, 9]

2. array = [5, -1, 2, 3], k = 2
   Expected Output: [-1, 2, 3, 5]

3. array = [1], k = 1
   Expected Output: [1]

4. array = [3, 1, 2, 2], k = 2
   Expected Output: [1, 2, 2, 3]

5. array = [-5, 2, 6, 8, -2, -6], k = 3
   Expected Output: [-6, -5, -2, 2, 6, 8]

Solution Approaches:
1. Min Heap: O(n * log(k)) time | O(k) space
   - Use min heap of size k
   - Process elements in order
   - Extract min to get sorted elements
*/

function sortKSortedArray(array, k) {
    const heap = [];
    const siftUp = index => {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (heap[parent] <= heap[index]) break;
            [heap[parent], heap[index]] = [heap[index], heap[parent]];
            index = parent;
        }
    };
    const siftDown = index => {
        while (true) {
            const left = index * 2 + 1;
            const right = left + 1;
            let smallest = index;
            if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
            if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
            if (smallest === index) return;
            [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
            index = smallest;
        }
    };
    const push = value => {
        heap.push(value);
        siftUp(heap.length - 1);
    };
    const pop = () => {
        const minimum = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
            heap[0] = last;
            siftDown(0);
        }
        return minimum;
    };

    const sorted = [];
    for (let index = 0; index < array.length; index++) {
        push(array[index]);
        if (heap.length > k + 1) sorted.push(pop());
    }
    while (heap.length > 0) sorted.push(pop());
    return sorted;
}

// Test Cases
const testCases = [
    {
        array: [3, 2, 1, 5, 4, 7, 6, 8, 9],
        k: 3,
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    {
        array: [5, -1, 2, 3],
        k: 3,
        expected: [-1, 2, 3, 5]
    },
    {
        array: [1],
        k: 1,
        expected: [1]
    },
    {
        array: [3, 1, 2, 2],
        k: 2,
        expected: [1, 2, 2, 3]
    },
    {
        array: [-5, 2, 6, 8, -2, -6],
        k: 5,
        expected: [-6, -5, -2, 2, 6, 8]
    },
    {
        array: [8, 5, 2, 9, 5, 6, 3],
        k: 5,
        expected: [2, 3, 5, 5, 6, 8, 9]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = sortKSortedArray([...testCase.array], testCase.k);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`k: ${testCase.k}`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        const passed = arraysEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare arrays
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// Run the tests
runTests();
