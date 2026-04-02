/*
Heap Sort

Problem Statement:
Write a function that takes in an array of integers and returns a sorted version of that array.
Use the Heap Sort algorithm to sort the array.

Heap Sort works by:
1. Building a max heap from the input array
2. Repeatedly extracting the maximum element from the heap and placing it at the end
3. Maintaining the heap property after each extraction

Note: The array should be sorted in ascending order.

Sample Input:
array = [8, 5, 2, 9, 5, 6, 3]

Sample Output:
[2, 3, 5, 5, 6, 8, 9]

Test Cases:
1. array = [8, 5, 2, 9, 5, 6, 3]
   Expected Output: [2, 3, 5, 5, 6, 8, 9]

2. array = [1]
   Expected Output: [1]

3. array = [1, 2, 3, 4, 5]
   Expected Output: [1, 2, 3, 4, 5]

4. array = [5, 4, 3, 2, 1]
   Expected Output: [1, 2, 3, 4, 5]

5. array = [-4, 5, 10, 8, -10, -6, -4, -2, -5, 3, 5, -4, -5, -1, 1, 6, -7, -6, -7, 8]
   Expected Output: [-10, -7, -7, -6, -6, -5, -5, -4, -4, -4, -2, -1, 1, 3, 5, 5, 6, 8, 8, 10]

Solution Approaches:
1. Heap Sort: O(n log(n)) time | O(1) space
   - Build max heap: O(n)
   - Extract max n times: O(n log(n))
   - Heapify after each extraction: O(log(n))
   - In-place sorting, no extra space needed besides variables
*/

function heapSort(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [8, 5, 2, 9, 5, 6, 3],
        expected: [2, 3, 5, 5, 6, 8, 9]
    },
    {
        array: [1],
        expected: [1]
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: [1, 2, 3, 4, 5]
    },
    {
        array: [5, 4, 3, 2, 1],
        expected: [1, 2, 3, 4, 5]
    },
    {
        array: [-4, 5, 10, 8, -10, -6, -4, -2, -5, 3, 5, -4, -5, -1, 1, 6, -7, -6, -7, 8],
        expected: [-10, -7, -7, -6, -6, -5, -5, -4, -4, -4, -2, -1, 1, 3, 5, 5, 6, 8, 8, 10]
    },
    {
        array: [99, 44, 6, 2, 1, 5, 63, 87, 283, 4, 0],
        expected: [0, 1, 2, 4, 5, 6, 44, 63, 87, 99, 283]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = heapSort([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
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
