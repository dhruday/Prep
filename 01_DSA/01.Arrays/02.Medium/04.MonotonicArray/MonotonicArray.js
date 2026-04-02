/*
Monotonic Array

Problem Statement:
Write a function that takes in an array of integers and returns a boolean representing whether
the array is monotonic. An array is monotonic if it's either monotonically increasing or monotonically decreasing.

An array is monotonically increasing if for all i <= j, array[i] <= array[j].
An array is monotonically decreasing if for all i <= j, array[i] >= array[j].

Empty arrays and arrays of one element are monotonic.

Sample Input:
array = [-1, -5, -10, -1100, -1100, -1101, -1102, -9001]

Sample Output:
true // The array is monotonically decreasing

Test Cases:
1. array = [-1, -5, -10, -1100, -1100, -1101, -1102, -9001]
   Expected Output: true

2. array = [1, 1, 2, 3, 4, 5, 5, 5, 6, 7, 8, 8, 9, 10, 11]
   Expected Output: true

3. array = [1, 2, 0]
   Expected Output: false

4. array = [1]
   Expected Output: true

5. array = []
   Expected Output: true

Solution Approaches:
1. One Pass: O(n) time | O(1) space
   - Track if array is non-increasing and non-decreasing
   - If either remains true, array is monotonic
*/

function isMonotonic(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [-1, -5, -10, -1100, -1100, -1101, -1102, -9001],
        expected: true
    },
    {
        array: [1, 1, 2, 3, 4, 5, 5, 5, 6, 7, 8, 8, 9, 10, 11],
        expected: true
    },
    {
        array: [1, 2, 0],
        expected: false
    },
    {
        array: [1],
        expected: true
    },
    {
        array: [],
        expected: true
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = isMonotonic([...testCase.array]);
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
