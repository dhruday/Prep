/*
Insertion Sort

Problem Statement:
Write a function that takes in an array of integers and returns a sorted version of that array.
Use the Insertion Sort algorithm to sort the array.

Insertion Sort works by building up a sorted array one element at a time. It takes each element
from the unsorted portion and inserts it into its correct position in the sorted portion.

Sample Input:
array = [8, 5, 2, 9, 5, 6, 3]

Sample Output:
[2, 3, 5, 5, 6, 8, 9]

Test Cases:
1. array = [8, 5, 2, 9, 5, 6, 3]
   Expected Output: [2, 3, 5, 5, 6, 8, 9]

2. array = [1]
   Expected Output: [1]

3. array = [3, 1, 2]
   Expected Output: [1, 2, 3]

4. array = []
   Expected Output: []

5. array = [1, 2, 3]
   Expected Output: [1, 2, 3]

Solution Approaches:
1. Insertion Sort: O(n²) time | O(1) space
   - Iterate through array starting from second element
   - Compare with previous elements
   - Insert into correct position in sorted portion
*/

function insertionSort(array) {
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
        array: [3, 1, 2],
        expected: [1, 2, 3]
    },
    {
        array: [],
        expected: []
    },
    {
        array: [1, 2, 3],
        expected: [1, 2, 3]
    },
    {
        array: [-4, 5, 10, 8, -10, -6, -4, -2, -5, 3, 5, -4, -5, -1, 1, 6, -7, -6, -7, 8],
        expected: [-10, -7, -7, -6, -6, -5, -5, -4, -4, -4, -2, -1, 1, 3, 5, 5, 6, 8, 8, 10]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = insertionSort([...testCase.array]);
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
