/*
Sorted Square Array

Problem Statement:
Write a function that takes in a non-empty array of integers that are sorted in ascending order
and returns a new array of the same length with the squares of the original integers also sorted
in ascending order.

Note that the input array can contain negative numbers, but the output array should only contain
non-negative numbers (squares).

Sample Input:
array = [1, 2, 3, 5, 6, 8, 9]

Sample Output:
[1, 4, 9, 25, 36, 64, 81]

Test Cases:
1. array = [1, 2, 3, 5, 6, 8, 9]
   Expected Output: [1, 4, 9, 25, 36, 64, 81]

2. array = [-10, -5, 0, 5, 10]
   Expected Output: [0, 25, 25, 100, 100]

3. array = [-7, -3, 1, 9, 22, 30]
   Expected Output: [1, 9, 49, 81, 484, 900]

4. array = [-50, -13, -2, -1, 0, 0, 1, 1, 2, 3, 19, 20]
   Expected Output: [0, 0, 1, 1, 1, 4, 4, 9, 169, 361, 400, 2500]

5. array = [-1, -1, 2, 3, 3, 3, 4]
   Expected Output: [1, 1, 4, 9, 9, 9, 16]

Solution Approaches:
1. Naive Solution: O(nlog(n)) time | O(n) space
   - Square each number
   - Sort the result

2. Two Pointer Solution: O(n) time | O(n) space
   - Use two pointers (left and right)
   - Compare absolute values and build result array from right to left
*/

function sortedSquaredArray(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [1, 2, 3, 5, 6, 8, 9],
        expected: [1, 4, 9, 25, 36, 64, 81]
    },
    {
        array: [-10, -5, 0, 5, 10],
        expected: [0, 25, 25, 100, 100]
    },
    {
        array: [-7, -3, 1, 9, 22, 30],
        expected: [1, 9, 49, 81, 484, 900]
    },
    {
        array: [-50, -13, -2, -1, 0, 0, 1, 1, 2, 3, 19, 20],
        expected: [0, 0, 1, 1, 1, 4, 4, 9, 169, 361, 400, 2500]
    },
    {
        array: [-1, -1, 2, 3, 3, 3, 4],
        expected: [1, 1, 4, 9, 9, 9, 16]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = sortedSquaredArray([...testCase.array]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        console.log(`Status: ${JSON.stringify(result) === JSON.stringify(testCase.expected) ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
