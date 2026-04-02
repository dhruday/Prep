/*
Kadane's Algorithm

Problem Statement:
Write a function that takes in a non-empty array of integers and returns the maximum sum that can be obtained
by summing up all the numbers in a non-empty subarray of the input array.

A subarray must only contain adjacent numbers (numbers next to each other in the input array).

Sample Input:
array = [3, 5, -9, 1, 3, -2, 3, 4, 7, 2, -9, 6, 3, 1, -5, 4]

Sample Output:
19 // [1, 3, -2, 3, 4, 7, 2] has the largest sum of 19

Test Cases:
1. array = [3, 5, -9, 1, 3, -2, 3, 4, 7, 2, -9, 6, 3, 1, -5, 4]
   Expected Output: 19

2. array = [1, 2, 3, 4, 5]
   Expected Output: 15

3. array = [-1, -2, -3, -4, -5]
   Expected Output: -1

4. array = [-10, -2, -9, -4, -8, -6, -7, -1, -3, -5]
   Expected Output: -1

5. array = [1, -1, 2, -2, 3, -3]
   Expected Output: 3

Solution Approaches:
1. Kadane's Algorithm: O(n) time | O(1) space
   - Keep track of max sum at each position
   - Compare local max (including current number) with global max
*/

function kadanesAlgorithm(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [3, 5, -9, 1, 3, -2, 3, 4, 7, 2, -9, 6, 3, 1, -5, 4],
        expected: 19
    },
    {
        array: [1, 2, 3, 4, 5],
        expected: 15
    },
    {
        array: [-1, -2, -3, -4, -5],
        expected: -1
    },
    {
        array: [-10, -2, -9, -4, -8, -6, -7, -1, -3, -5],
        expected: -1
    },
    {
        array: [1, -1, 2, -2, 3, -3],
        expected: 3
    },
    {
        array: [-2, 1, -3, 4, -1, 2, 1, -5, 4],
        expected: 6
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = kadanesAlgorithm([...testCase.array]);
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
