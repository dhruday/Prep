/*
Three Number Sum

Problem Statement:
Write a function that takes in a non-empty array of distinct integers and an integer representing a target sum.
The function should find all triplets in the array that sum up to the target sum and return a two-dimensional
array of all these triplets. The numbers in each triplet should be ordered in ascending order, and the triplets
themselves should be ordered in ascending order with respect to the numbers they hold.

If no three numbers sum up to the target sum, the function should return an empty array.

Sample Input:
array = [12, 3, 1, 2, -6, 5, -8, 6]
targetSum = 0

Sample Output:
[[-8, 2, 6], [-8, 3, 5], [-6, 1, 5]]
// The triplets should be ordered ascending by the first number, then second number, then third number
// Each number in each triplet should be ordered ascending

Test Cases:
1. array = [12, 3, 1, 2, -6, 5, -8, 6], targetSum = 0
   Expected Output: [[-8, 2, 6], [-8, 3, 5], [-6, 1, 5]]

2. array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15], targetSum = 18
   Expected Output: [[1, 2, 15], [1, 8, 9], [2, 7, 9], [3, 6, 9], [3, 7, 8], [4, 5, 9], [4, 6, 8], [5, 6, 7]]

3. array = [1, 2, 3], targetSum = 7
   Expected Output: []

4. array = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], targetSum = 7
   Expected Output: [[-1, 1, 7], [-1, 2, 6], [-1, 3, 5], [0, 1, 6], [0, 2, 5], [0, 3, 4], [1, 2, 4]]

Solution Approaches:
1. Three Pointers: O(n²) time | O(n) space
   - Sort the array first
   - Fix one number and use two pointers for remaining sum
   - Move pointers based on current sum vs target sum
*/

function threeNumberSum(array, targetSum) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [12, 3, 1, 2, -6, 5, -8, 6],
        targetSum: 0,
        expected: [[-8, 2, 6], [-8, 3, 5], [-6, 1, 5]]
    },
    {
        array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 15],
        targetSum: 18,
        expected: [[1, 2, 15], [1, 8, 9], [2, 7, 9], [3, 6, 9], [3, 7, 8], [4, 5, 9], [4, 6, 8], [5, 6, 7]]
    },
    {
        array: [1, 2, 3],
        targetSum: 7,
        expected: []
    },
    {
        array: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        targetSum: 7,
        expected: [[-1, 1, 7], [-1, 2, 6], [-1, 3, 5], [0, 1, 6], [0, 2, 5], [0, 3, 4], [1, 2, 4]]
    }
];

// Helper function to check if two arrays of triplets are equal
function areTripletsEqual(triplets1, triplets2) {
    if (triplets1.length !== triplets2.length) return false;
    for (let i = 0; i < triplets1.length; i++) {
        if (triplets1[i].length !== triplets2[i].length) return false;
        for (let j = 0; j < triplets1[i].length; j++) {
            if (triplets1[i][j] !== triplets2[i][j]) return false;
        }
    }
    return true;
}

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = threeNumberSum([...testCase.array], testCase.targetSum);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Input Array: [${testCase.array}]`);
        console.log(`Target Sum: ${testCase.targetSum}`);
        console.log(`Your Output: ${JSON.stringify(result)}`);
        console.log(`Expected Output: ${JSON.stringify(testCase.expected)}`);
        console.log(`Status: ${areTripletsEqual(result, testCase.expected) ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
