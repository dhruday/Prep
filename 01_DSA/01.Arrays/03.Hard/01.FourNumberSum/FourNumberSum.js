/*
Four Number Sum

Problem Statement:
Write a function that takes in a non-empty array of distinct integers and an integer representing a target sum.
The function should find all quadruplets in the array that sum up to the target sum and return a two-dimensional
array of all these quadruplets in no particular order.

If no four numbers sum up to the target sum, the function should return an empty array.

Sample Input:
array = [7, 6, 4, -1, 1, 2]
targetSum = 16

Sample Output:
[[7, 6, 4, -1], [7, 6, 1, 2]]  // the quadruplets could be ordered differently

Test Cases:
1. array = [7, 6, 4, -1, 1, 2], targetSum = 16
   Expected Output: [[7, 6, 4, -1], [7, 6, 1, 2]]

2. array = [1, 2, 3, 4, 5, 6, 7], targetSum = 10
   Expected Output: [[1, 2, 3, 4]]

3. array = [5, -5, -2, 2, 3, -3], targetSum = 0
   Expected Output: [[5, -5, -2, 2], [5, -5, 3, -3], [-2, 2, 3, -3]]

4. array = [-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9], targetSum = 4
   Expected Output: [[-2, -1, 1, 6], [-2, 1, 2, 3], [-2, -1, 2, 5], [-1, 1, 2, 2]]

5. array = [1, 2, 3, 4, 5], targetSum = 100
   Expected Output: []

Solution Approaches:
1. Hash Table Approach: Average: O(n²) time | O(n²) space
   - Store pair sums in hash table
   - For each pair, look for complementary pair
   - Handle duplicates and maintain uniqueness
*/

function fourNumberSum(array, targetSum) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [7, 6, 4, -1, 1, 2],
        targetSum: 16,
        expected: [[7, 6, 4, -1], [7, 6, 1, 2]]
    },
    {
        array: [1, 2, 3, 4, 5, 6, 7],
        targetSum: 10,
        expected: [[1, 2, 3, 4]]
    },
    {
        array: [5, -5, -2, 2, 3, -3],
        targetSum: 0,
        expected: [[5, -5, -2, 2], [5, -5, 3, -3], [-2, 2, 3, -3]]
    },
    {
        array: [-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        targetSum: 4,
        expected: [[-2, -1, 1, 6], [-2, 1, 2, 3], [-2, -1, 2, 5], [-1, 1, 2, 2]]
    },
    {
        array: [1, 2, 3, 4, 5],
        targetSum: 100,
        expected: []
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = fourNumberSum([...testCase.array], testCase.targetSum);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Array: [${testCase.array}]`);
        console.log(`Target Sum: ${testCase.targetSum}`);
        console.log(`Your Output: [${result.map(quad => '[' + quad + ']')}]`);
        console.log(`Expected Output: [${testCase.expected.map(quad => '[' + quad + ']')}]`);
        const passed = areQuadrupletsEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare quadruplets
function areQuadrupletsEqual(quads1, quads2) {
    if (quads1.length !== quads2.length) return false;
    
    // Sort each quadruplet and the arrays of quadruplets for consistent comparison
    const sortQuad = quad => quad.slice().sort((a, b) => a - b);
    const sortedQuads1 = quads1.map(sortQuad).sort((a, b) => {
        for (let i = 0; i < 4; i++) {
            if (a[i] !== b[i]) return a[i] - b[i];
        }
        return 0;
    });
    const sortedQuads2 = quads2.map(sortQuad).sort((a, b) => {
        for (let i = 0; i < 4; i++) {
            if (a[i] !== b[i]) return a[i] - b[i];
        }
        return 0;
    });
    
    // Compare sorted quadruplets
    for (let i = 0; i < sortedQuads1.length; i++) {
        for (let j = 0; j < 4; j++) {
            if (sortedQuads1[i][j] !== sortedQuads2[i][j]) return false;
        }
    }
    return true;
}

// Run the tests
runTests();
