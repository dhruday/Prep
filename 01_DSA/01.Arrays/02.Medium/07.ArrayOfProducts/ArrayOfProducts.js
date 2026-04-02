/*
Array of Products

Problem Statement:
Write a function that takes in a non-empty array of integers and returns an array of the same length, where each element
in the output array is equal to the product of every other number in the input array.

In other words, the value at output[i] is equal to the product of every number in the input array other than input[i].

Note: You're expected to solve this problem without using division.

Sample Input:
array = [5, 1, 4, 2]

Sample Output:
[8, 40, 10, 20]
// 8  is equal to 1 × 4 × 2
// 40 is equal to 5 × 4 × 2
// 10 is equal to 5 × 1 × 2
// 20 is equal to 5 × 1 × 4

Test Cases:
1. array = [5, 1, 4, 2]
   Expected Output: [8, 40, 10, 20]

2. array = [1, 8, 6, 2, 4]
   Expected Output: [384, 48, 64, 192, 96]

3. array = [-5, 2, -4, 14, -6]
   Expected Output: [672, -1680, 840, -240, 560]

4. array = [0, 1, 2, 3, 4]
   Expected Output: [24, 0, 0, 0, 0]

5. array = [1]
   Expected Output: [1]

Solution Approaches:
1. Brute Force: O(n²) time | O(n) space
   - For each index, iterate through array and multiply all other numbers

2. Left and Right Products: O(n) time | O(n) space
   - Calculate products of all numbers to the left of each index
   - Calculate products of all numbers to the right of each index
   - Multiply left and right products for each index
*/

function arrayOfProducts(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [5, 1, 4, 2],
        expected: [8, 40, 10, 20]
    },
    {
        array: [1, 8, 6, 2, 4],
        expected: [384, 48, 64, 192, 96]
    },
    {
        array: [-5, 2, -4, 14, -6],
        expected: [672, -1680, 840, -240, 560]
    },
    {
        array: [0, 1, 2, 3, 4],
        expected: [24, 0, 0, 0, 0]
    },
    {
        array: [1],
        expected: [1]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = arrayOfProducts([...testCase.array]);
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
