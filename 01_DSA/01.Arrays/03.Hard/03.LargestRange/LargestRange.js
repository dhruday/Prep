/*
Largest Range

Problem Statement:
Write a function that takes in an array of integers and returns an array of length 2 representing the largest
range of integers contained in that array.

The first number in the output array should be the first number in the range, while the second number should
be the last number in the range.

A range of numbers is defined as a set of numbers that come right after each other in the set of real integers.
For instance, the output array [2, 6] represents the range {2, 3, 4, 5, 6}, which is a range of length 5. Note
that numbers don't need to be sorted or adjacent in the input array in order to form a range.

You can assume that there will only be one largest range.

Sample Input:
array = [1, 11, 3, 0, 15, 5, 2, 4, 10, 7, 12, 6]

Sample Output:
[0, 7] // The numbers 0, 1, 2, 3, 4, 5, 6, 7 form the largest range

Test Cases:
1. array = [1, 11, 3, 0, 15, 5, 2, 4, 10, 7, 12, 6]
   Expected Output: [0, 7]

2. array = [1]
   Expected Output: [1, 1]

3. array = [1, 2]
   Expected Output: [1, 2]

4. array = [4, 2, 1, 3]
   Expected Output: [1, 4]

5. array = [1, 1, 1, 3, 4]
   Expected Output: [3, 4]

Solution Approaches:
1. Hash Set Approach: O(n) time | O(n) space
   - Store numbers in hash set
   - For each number, explore potential ranges
   - Keep track of longest range found
*/

function largestRange(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [1, 11, 3, 0, 15, 5, 2, 4, 10, 7, 12, 6],
        expected: [0, 7]
    },
    {
        array: [1],
        expected: [1, 1]
    },
    {
        array: [1, 2],
        expected: [1, 2]
    },
    {
        array: [4, 2, 1, 3],
        expected: [1, 4]
    },
    {
        array: [1, 1, 1, 3, 4],
        expected: [3, 4]
    },
    {
        array: [19, -1, 18, 17, 2, 10, 3, 12, 5, 16, 4, 11, 8, 7, 6, 15, 12, 12, 2, 1, 6, 13, 14],
        expected: [10, 19]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = largestRange([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
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
