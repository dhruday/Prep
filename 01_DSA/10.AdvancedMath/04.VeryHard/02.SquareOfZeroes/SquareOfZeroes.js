/*
Square of Zeroes

Write a function that takes in a square matrix of 1s and 0s and returns a boolean
representing whether the matrix contains a square of zeroes of size at least 2 x 2.

A square of zeroes is a square submatrix whose border consists of only zeroes.
The square must have zeroes on all of its edges and can contain anything in its
inside. For example, a 2x2 square of zeroes is:

[0, 0]
[0, 0]

A 3x3 square of zeroes could be:
[0, 0, 0]
[0, 1, 0]
[0, 0, 0]

Sample Input:
matrix = [
  [1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 0, 1],
  [0, 0, 0, 1, 0, 1],
  [0, 1, 1, 1, 0, 1],
  [0, 0, 0, 0, 0, 1],
]

Sample Output: true
// The bottom left 3x3 square is a square of zeroes:
// [0, 0, 0]
// [0, 1, 0]
// [0, 0, 0]
*/

function squareOfZeroes(matrix) {
    const n = matrix.length;
    
    // Create auxiliary arrays to store counts of continuous zeroes
    const rightZeros = Array(n).fill().map(() => Array(n).fill(0));
    const belowZeros = Array(n).fill().map(() => Array(n).fill(0));
    
    // Fill auxiliary arrays
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            if (matrix[row][col] === 0) {
                // Count continuous zeros to the right
                rightZeros[row][col] = 1;
                if (col > 0) {
                    rightZeros[row][col] += rightZeros[row][col - 1];
                }
                
                // Count continuous zeros below
                belowZeros[row][col] = 1;
                if (row > 0) {
                    belowZeros[row][col] += belowZeros[row - 1][col];
                }
            }
        }
    }
    
    // Check every possible square size from 2 to n
    for (let size = 2; size <= n; size++) {
        // Check every possible top-left corner of the square
        for (let row = 0; row <= n - size; row++) {
            for (let col = 0; col <= n - size; col++) {
                if (isSquareOfZeroes(row, col, size, rightZeros, belowZeros)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function isSquareOfZeroes(row, col, size, rightZeros, belowZeros) {
    // Check if we have enough zeros in each direction to form a square
    const bottomRow = row + size - 1;
    const rightCol = col + size - 1;
    
    // Top edge
    if (rightZeros[row][col] < size) return false;
    
    // Bottom edge
    if (rightZeros[bottomRow][col] < size) return false;
    
    // Left edge
    if (belowZeros[row][col] < size) return false;
    
    // Right edge
    if (belowZeros[row][rightCol] < size) return false;
    
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            matrix: [
                [1, 1, 1, 0, 1, 0],
                [0, 0, 0, 0, 0, 1],
                [0, 1, 1, 1, 0, 1],
                [0, 0, 0, 1, 0, 1],
                [0, 1, 1, 1, 0, 1],
                [0, 0, 0, 0, 0, 1],
            ],
            expected: true,
            description: "Sample test case"
        },
        {
            matrix: [
                [0, 0],
                [0, 0]
            ],
            expected: true,
            description: "2x2 square of zeroes"
        },
        {
            matrix: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0]
            ],
            expected: true,
            description: "3x3 square with non-zero center"
        },
        {
            matrix: [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1]
            ],
            expected: false,
            description: "Single zero in center"
        },
        {
            matrix: [
                [0, 0, 0, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 0, 0, 0]
            ],
            expected: true,
            description: "4x4 square with non-zero center"
        },
        {
            matrix: [
                [1]
            ],
            expected: false,
            description: "1x1 matrix with 1"
        },
        {
            matrix: [
                [0]
            ],
            expected: false,
            description: "1x1 matrix with 0"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        console.log("Matrix:");
        testCase.matrix.forEach(row => console.log(row.join(" ")));
        
        const result = squareOfZeroes(testCase.matrix);
        console.log("Expected:", testCase.expected);
        console.log("Got:", result);
        
        const passed = result === testCase.expected;
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
