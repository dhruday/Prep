/*
Maximum Sum Submatrix

Problem Statement:
You're given a two-dimensional array (a matrix) of integers and a integer size. Write a function
that returns the maximum sum that can be generated from a submatrix of size x size.

A submatrix is any group of numbers in the matrix that form a square/rectangle of size x size.

For example, a 2 x 2 submatrix would be any group of numbers in the matrix that form a 2 x 2 square.

Sample Input:
matrix = [
  [5, 3, -1, 5],
  [-7, 3, 7, 4],
  [12, 8, 0, 0],
  [1, -8, -8, 2],
]
size = 2

Sample Output:
18
// [
//   [., ., ., .],
//   [., 3, 7, .],
//   [., 8, 0, .],
//   [., ., ., .],
// ]

Test Cases:
1. matrix = [
     [5, 3, -1, 5],
     [-7, 3, 7, 4],
     [12, 8, 0, 0],
     [1, -8, -8, 2],
   ]
   size = 2
   Expected Output: 18

2. matrix = [
     [1, 2, 3],
     [4, 5, 6],
     [7, 8, 9],
   ]
   size = 2
   Expected Output: 28

3. matrix = [
     [5, 3, -1, 5],
     [-7, 3, 7, 4],
     [12, 8, 0, 0],
     [1, -8, -8, 2],
   ]
   size = 3
   Expected Output: 33

4. matrix = [[1]]
   size = 1
   Expected Output: 1

5. matrix = [
     [-1, -1],
     [-1, -1],
   ]
   size = 2
   Expected Output: -4

Solution Approaches:
1. Brute Force: O(w * h * size²) time | O(1) space
   - Check every possible submatrix
   - Calculate sum for each

2. Sliding Window: O(w * h) time | O(w * h) space
   - Use prefix sum matrix
   - Calculate sums efficiently
*/

function maximumSumSubmatrix(matrix, size) {
    if (size <= 0 || matrix.length < size || matrix[0].length < size) return null;

    const sums = Array.from({ length: matrix.length + 1 }, () => new Array(matrix[0].length + 1).fill(0));
    for (let row = 1; row <= matrix.length; row++) {
        for (let column = 1; column <= matrix[0].length; column++) {
            sums[row][column] = matrix[row - 1][column - 1]
                + sums[row - 1][column]
                + sums[row][column - 1]
                - sums[row - 1][column - 1];
        }
    }

    let maximum = -Infinity;
    for (let row = size; row <= matrix.length; row++) {
        for (let column = size; column <= matrix[0].length; column++) {
            const total = sums[row][column] - sums[row - size][column]
                - sums[row][column - size] + sums[row - size][column - size];
            maximum = Math.max(maximum, total);
        }
    }

    return maximum;
}

// Test Cases
const testCases = [
    {
        matrix: [
            [5, 3, -1, 5],
            [-7, 3, 7, 4],
            [12, 8, 0, 0],
            [1, -8, -8, 2]
        ],
        size: 2,
        expected: 18
    },
    {
        matrix: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ],
        size: 2,
        expected: 28
    },
    {
        matrix: [
            [5, 3, -1, 5],
            [-7, 3, 7, 4],
            [12, 8, 0, 0],
            [1, -8, -8, 2]
        ],
        size: 3,
        expected: 30
    },
    {
        matrix: [[1]],
        size: 1,
        expected: 1
    },
    {
        matrix: [
            [-1, -1],
            [-1, -1]
        ],
        size: 2,
        expected: -4
    },
    {
        matrix: [
            [2, 4],
            [5, 6],
            [2, 4]
        ],
        size: 2,
        expected: 17
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = maximumSumSubmatrix(
            testCase.matrix.map(row => [...row]),
            testCase.size
        );
        console.log(`Test Case ${index + 1}:`);
        console.log('Matrix:');
        testCase.matrix.forEach(row => console.log(`  [${row}]`));
        console.log(`Size: ${testCase.size}`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
