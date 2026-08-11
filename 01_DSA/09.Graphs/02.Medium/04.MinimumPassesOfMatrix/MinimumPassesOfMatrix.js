/*
Minimum Passes of Matrix

Problem Statement:
Write a function that takes in an integer matrix of potentially unequal height and
width and returns the minimum number of passes required to convert all negative
integers in the matrix to positive integers.

A negative integer in the matrix can only be converted to a positive integer if one
or more of its adjacent elements (elements that are to its left, right, above, or
below) are positive. Note that after each pass, more negative integers may become 
positive. However, negative integers that can't be converted by the end of a pass 
remain the same for the next pass.

The function should return -1 if some negative integers are still present in the
matrix after the negative integers stop being converted to positive integers.

Sample Input:
matrix = [
  [0, -1, -3,  2,  0],
  [1, -2, -5, -1, -3],
  [3,  0,  0, -4, -1]
]

Sample Output:
3

// Pass 1:
[
  [0, -1, -3,  2,  0],
  [1, -2, -5,  2, -3],
  [3,  0,  0, -4, -1]
]

// Pass 2:
[
  [0,  1, -3,  2,  0],
  [1,  2, -5,  2,  2],
  [3,  0,  0,  2,  2]
]

// Pass 3:
[
  [0,  1,  1,  2,  0],
  [1,  2,  2,  2,  2],
  [3,  0,  0,  2,  2]
]

Constraints:
- The input matrix will be a rectangular 2D array of integers
- The matrix can be of any size (including empty)
- The integers in the matrix will be between -10^9 and 10^9
*/

function minimumPassesOfMatrix(matrix) {
    if (matrix.length === 0 || matrix[0].length === 0) return 0;

    const queue = [];
    for (let row = 0; row < matrix.length; row++) {
        for (let column = 0; column < matrix[0].length; column++) {
            if (matrix[row][column] > 0) queue.push([row, column]);
        }
    }

    let passes = 0;
    let levelStart = 0;
    while (levelStart < queue.length) {
        const levelEnd = queue.length;
        let converted = false;
        for (let index = levelStart; index < levelEnd; index++) {
            const [row, column] = queue[index];
            for (const [rowOffset, columnOffset] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nextRow = row + rowOffset;
                const nextColumn = column + columnOffset;
                if (nextRow < 0 || nextRow >= matrix.length || nextColumn < 0 || nextColumn >= matrix[0].length) continue;
                if (matrix[nextRow][nextColumn] >= 0) continue;
                matrix[nextRow][nextColumn] *= -1;
                queue.push([nextRow, nextColumn]);
                converted = true;
            }
        }
        if (converted) passes++;
        levelStart = levelEnd;
    }

    return matrix.some(row => row.some(value => value < 0)) ? -1 : passes;
}

// Helper function to create a deep copy of a matrix
function copyMatrix(matrix) {
    return matrix.map(row => [...row]);
}

// Helper function to check if matrix contains any negative numbers
function hasNegatives(matrix) {
    for (let row of matrix) {
        for (let value of row) {
            if (value < 0) return true;
        }
    }
    return false;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            matrix: [
                [0, -1, -3, 2, 0],
                [1, -2, -5, -1, -3],
                [3, 0, 0, -4, -1]
            ],
            expected: 3,
            description: "Sample test case"
        },
        {
            matrix: [
                [1]
            ],
            expected: 0,
            description: "Single positive number"
        },
        {
            matrix: [
                [-1]
            ],
            expected: -1,
            description: "Single negative number"
        },
        {
            matrix: [
                [1, -1],
                [-1, 1]
            ],
            expected: 1,
            description: "Checkerboard pattern"
        },
        {
            matrix: [
                [-1, -9, -2],
                [-3, -4, -5],
                [-8, -7, -6]
            ],
            expected: -1,
            description: "All negative numbers, no conversion possible"
        },
        {
            matrix: [
                [1, 0, 0],
                [-1, -1, -1],
                [-1, -1, -1]
            ],
            expected: 4,
            description: "Gradual conversion from corner"
        },
        {
            matrix: [
                [-1, 2, -3],
                [2, -5, 2],
                [-3, 2, -1]
            ],
            expected: 2,
            description: "Multiple positive sources"
        },
        {
            matrix: [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ],
            expected: 0,
            description: "All positive numbers"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Make a copy of input matrix
        const matrix = copyMatrix(testCase.matrix);
        
        // Calculate minimum passes
        const result = minimumPassesOfMatrix(matrix);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log("Input:");
        testCase.matrix.forEach(row => console.log(row.join(" ")));
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
