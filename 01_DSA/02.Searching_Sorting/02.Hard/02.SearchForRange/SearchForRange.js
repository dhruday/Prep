/*
Search For Range

Problem Statement:
Write a function that takes in a sorted array of integers as well as a target integer. The function
should use a variation of the Binary Search algorithm to find a range of indices in between which
the target number is contained in the array and should return this range in the form of an array.

The first number in the output array should represent the first index at which the target number
is located, while the second number should represent the last index at which the target number is
located. The function should return [-1, -1] if the integer isn't contained in the array.

Sample Input:
array = [0, 1, 21, 33, 45, 45, 45, 45, 45, 45, 61, 71, 73]
target = 45

Sample Output:
[4, 9]  // The target value 45 appears from index 4 to index 9

Test Cases:
1. array = [0, 1, 21, 33, 45, 45, 45, 45, 45, 45, 61, 71, 73], target = 45
   Expected Output: [4, 9]

2. array = [5, 7, 7, 8, 8, 10], target = 8
   Expected Output: [3, 4]

3. array = [5, 7, 7, 8, 8, 10], target = 6
   Expected Output: [-1, -1]

4. array = [], target = 0
   Expected Output: [-1, -1]

5. array = [1, 1, 1, 1, 1], target = 1
   Expected Output: [0, 4]

Solution Approaches:
1. Modified Binary Search: O(log(n)) time | O(1) space
   - Use binary search to find leftmost occurrence
   - Use binary search to find rightmost occurrence
   - Combine results into range
*/

function searchForRange(array, target) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [0, 1, 21, 33, 45, 45, 45, 45, 45, 45, 61, 71, 73],
        target: 45,
        expected: [4, 9]
    },
    {
        array: [5, 7, 7, 8, 8, 10],
        target: 8,
        expected: [3, 4]
    },
    {
        array: [5, 7, 7, 8, 8, 10],
        target: 6,
        expected: [-1, -1]
    },
    {
        array: [],
        target: 0,
        expected: [-1, -1]
    },
    {
        array: [1, 1, 1, 1, 1],
        target: 1,
        expected: [0, 4]
    },
    {
        array: [1, 2, 3, 3, 3, 4, 5, 5, 5, 5],
        target: 5,
        expected: [6, 9]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = searchForRange([...testCase.array], testCase.target);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Target: ${testCase.target}`);
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
