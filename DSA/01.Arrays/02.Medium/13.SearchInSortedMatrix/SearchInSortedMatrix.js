/*
Search in Sorted Matrix

Problem Statement:
You're given a two-dimensional array (a matrix) of distinct integers and a target integer. Each row
in the matrix is sorted, and each column is also sorted; the matrix doesn't necessarily have the
same height and width.

Write a function that returns an array of the row and column indices of the target integer if it's
contained in the matrix, otherwise [-1, -1].

Sample Input:
matrix = [
  [1, 4, 7, 12, 15, 1000],
  [2, 5, 19, 31, 32, 1001],
  [3, 8, 24, 33, 35, 1002],
  [40, 41, 42, 44, 45, 1003],
  [99, 100, 103, 106, 128, 1004],
]
target = 44

Sample Output:
[3, 3]  // The target value 44 is located at row 3, column 3

Test Cases:
1. matrix = [
     [1, 4, 7, 12, 15, 1000],
     [2, 5, 19, 31, 32, 1001],
     [3, 8, 24, 33, 35, 1002],
     [40, 41, 42, 44, 45, 1003],
     [99, 100, 103, 106, 128, 1004],
   ]
   target = 44
   Expected Output: [3, 3]

2. matrix = [
     [1, 4, 7, 12, 15, 1000],
     [2, 5, 19, 31, 32, 1001],
     [3, 8, 24, 33, 35, 1002],
     [40, 41, 42, 44, 45, 1003],
     [99, 100, 103, 106, 128, 1004],
   ]
   target = 1
   Expected Output: [0, 0]

3. matrix = [
     [1, 4, 7, 12, 15, 1000],
     [2, 5, 19, 31, 32, 1001],
     [3, 8, 24, 33, 35, 1002],
     [40, 41, 42, 44, 45, 1003],
     [99, 100, 103, 106, 128, 1004],
   ]
   target = 2000
   Expected Output: [-1, -1]

4. matrix = [[1]]
   target = 1
   Expected Output: [0, 0]

5. matrix = [[1]]
   target = 2
   Expected Output: [-1, -1]

Solution Approaches:
1. Start from Top Right: O(n + m) time | O(1) space
   - Start at top right corner
   - If target is smaller, move left
   - If target is larger, move down
*/

function searchInSortedMatrix(matrix, target) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        matrix: [
            [1, 4, 7, 12, 15, 1000],
            [2, 5, 19, 31, 32, 1001],
            [3, 8, 24, 33, 35, 1002],
            [40, 41, 42, 44, 45, 1003],
            [99, 100, 103, 106, 128, 1004],
        ],
        target: 44,
        expected: [3, 3]
    },
    {
        matrix: [
            [1, 4, 7, 12, 15, 1000],
            [2, 5, 19, 31, 32, 1001],
            [3, 8, 24, 33, 35, 1002],
            [40, 41, 42, 44, 45, 1003],
            [99, 100, 103, 106, 128, 1004],
        ],
        target: 1,
        expected: [0, 0]
    },
    {
        matrix: [
            [1, 4, 7, 12, 15, 1000],
            [2, 5, 19, 31, 32, 1001],
            [3, 8, 24, 33, 35, 1002],
            [40, 41, 42, 44, 45, 1003],
            [99, 100, 103, 106, 128, 1004],
        ],
        target: 2000,
        expected: [-1, -1]
    },
    {
        matrix: [[1]],
        target: 1,
        expected: [0, 0]
    },
    {
        matrix: [[1]],
        target: 2,
        expected: [-1, -1]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = searchInSortedMatrix(testCase.matrix.map(row => [...row]), testCase.target);
        console.log(`Test Case ${index + 1}:`);
        console.log('Matrix:');
        testCase.matrix.forEach(row => console.log(`  [${row}]`));
        console.log(`Target: ${testCase.target}`);
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
