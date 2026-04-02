/*
First Duplicate Value

Problem Statement:
Given an array of integers between 1 and n, inclusive, where n is the length of the array, write a function
that returns the first integer that appears more than once (when the array is read from left to right).

In other words, out of all the integers that might occur more than once in the input array, the function
should return the one whose first duplicate value has the minimum index.

If no integer appears more than once, your function should return -1.

Note: You're allowed to mutate the input array.

Sample Input:
array = [2, 1, 5, 2, 3, 3, 4]

Sample Output:
2 // 2 is the first integer that appears more than once.
// 3 also appears more than once, but the second 3 appears after the second 2.

Test Cases:
1. array = [2, 1, 5, 2, 3, 3, 4]
   Expected Output: 2

2. array = [2, 1, 5, 3, 3, 2, 4]
   Expected Output: 3

3. array = [1, 1]
   Expected Output: 1

4. array = [1, 2, 3, 4, 5]
   Expected Output: -1

5. array = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1]
   Expected Output: 5

Solution Approaches:
1. Brute Force: O(n²) time | O(1) space
   - For each number, check if it appears later in array

2. Hash Set: O(n) time | O(n) space
   - Use a set to track seen numbers

3. Array Manipulation: O(n) time | O(1) space
   - Use array values as indices to mark visited numbers
*/

function firstDuplicateValue(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [2, 1, 5, 2, 3, 3, 4],
        expected: 2
    },
    {
        array: [2, 1, 5, 3, 3, 2, 4],
        expected: 3
    },
    {
        array: [1, 1],
        expected: 1
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: -1
    },
    {
        array: [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
        expected: 5
    },
    {
        array: [3, 1, 3, 1, 1, 4, 4],
        expected: 3
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = firstDuplicateValue([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
