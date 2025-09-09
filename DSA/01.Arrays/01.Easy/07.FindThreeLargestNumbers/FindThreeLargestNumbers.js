/*
Find Three Largest Numbers

Problem Statement:
Write a function that takes in an array of at least three integers and, without sorting the input array,
returns a sorted array of the three largest integers in the input array.

The function should return duplicate integers if necessary; for example, it should return [10, 10, 12]
for an input array of [10, 5, 9, 10, 12].

Sample Input:
array = [141, 1, 17, -7, -17, -27, 18, 541, 8, 7, 7]

Sample Output:
[18, 141, 541]

Test Cases:
1. array = [141, 1, 17, -7, -17, -27, 18, 541, 8, 7, 7]
   Expected Output: [18, 141, 541]

2. array = [55, 7, 8, 3, 43, 11, 55, 55]
   Expected Output: [55, 55, 55]

3. array = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]
   Expected Output: [7, 7, 7]

4. array = [-1, -2, -3, -7, -17, -27, -18, -541, -8, -7, -7]
   Expected Output: [-3, -2, -1]

5. array = [10, 5, 9, 10, 12]
   Expected Output: [10, 10, 12]

Solution Approaches:
1. Linear Scan: O(n) time | O(1) space
   - Initialize array of three largest numbers
   - Update array by comparing each number
   - Maintain sorted order while updating
*/

function findThreeLargestNumbers(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [141, 1, 17, -7, -17, -27, 18, 541, 8, 7, 7],
        expected: [18, 141, 541]
    },
    {
        array: [55, 7, 8, 3, 43, 11, 55, 55],
        expected: [55, 55, 55]
    },
    {
        array: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
        expected: [7, 7, 7]
    },
    {
        array: [-1, -2, -3, -7, -17, -27, -18, -541, -8, -7, -7],
        expected: [-3, -2, -1]
    },
    {
        array: [10, 5, 9, 10, 12],
        expected: [10, 10, 12]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = findThreeLargestNumbers([...testCase.array]);
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
