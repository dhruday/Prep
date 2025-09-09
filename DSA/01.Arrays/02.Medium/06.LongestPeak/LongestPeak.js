/*
Longest Peak

Problem Statement:
Write a function that takes in an array of integers and returns the length of the longest peak in the array.

A peak is defined as adjacent integers in the array that are strictly increasing until they reach a tip (the highest value
in the peak), at which point they become strictly decreasing. At least three integers are required to form a peak.

For example, the integers [1, 4, 10, 2] form a peak, but the integers [4, 0, 10] don't and neither do the integers
[1, 2, 2, 0]. Similarly, the integers [1, 2, 3] don't form a peak because they aren't strictly decreasing.

Sample Input:
array = [1, 2, 3, 3, 4, 0, 10, 6, 5, -1, -3, 2, 3]

Sample Output:
6 // The peak is [0, 10, 6, 5, -1, -3]

Test Cases:
1. array = [1, 2, 3, 3, 4, 0, 10, 6, 5, -1, -3, 2, 3]
   Expected Output: 6

2. array = []
   Expected Output: 0

3. array = [1, 2, 3, 4, 5, 1]
   Expected Output: 6

4. array = [5, 4, 3, 2, 1, 2, 1]
   Expected Output: 3

5. array = [1, 1, 1, 2, 3, 10, 12, -3, -3, 2, 3, 45, 800, 99, 98, 0, -1, -1, 2, 3, 4, 5, 0, -1]
   Expected Output: 9

Solution Approaches:
1. Linear traverse: O(n) time | O(1) space
   - Find potential peaks by looking for tips
   - Expand around tips to find peak lengths
   - Track longest peak found
*/

function longestPeak(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [1, 2, 3, 3, 4, 0, 10, 6, 5, -1, -3, 2, 3],
        expected: 6
    },
    {
        array: [],
        expected: 0
    },
    {
        array: [1, 2, 3, 4, 5, 1],
        expected: 6
    },
    {
        array: [5, 4, 3, 2, 1, 2, 1],
        expected: 3
    },
    {
        array: [1, 1, 1, 2, 3, 10, 12, -3, -3, 2, 3, 45, 800, 99, 98, 0, -1, -1, 2, 3, 4, 5, 0, -1],
        expected: 9
    },
    {
        array: [1, 2, 3],
        expected: 0
    },
    {
        array: [1, 2, 3, 2],
        expected: 4
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = longestPeak([...testCase.array]);
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
