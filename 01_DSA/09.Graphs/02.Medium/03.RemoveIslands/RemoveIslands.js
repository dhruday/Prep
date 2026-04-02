/*
Remove Islands

Problem Statement:
You're given a two-dimensional array (matrix) of potentially unequal height and width
containing only 0s and 1s. The matrix represents a two-toned image, where each 1
represents black and each 0 represents white. An island is defined as any number of
1s that are horizontally or vertically adjacent (but not diagonally adjacent) and
that don't touch the border of the image. In other words, a group of horizontally or
vertically adjacent 1s isn't an island if any of those 1s are in the first row,
last row, first column, or last column of the input matrix.

Write a function that returns a modified version of the input matrix, where all of
the islands are removed. You remove an island by replacing it with 0s.

Naturally, you're allowed to mutate the input matrix.

Sample Input:
matrix = [
  [1, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 1, 1],
  [0, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 1]
]

Sample Output:
[
  [1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1],
  [0, 0, 0, 0, 1, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 1]
]
// The islands in the input matrix are removed.

Constraints:
- The input matrix will be rectangular
- The input matrix will contain only 0s and 1s
- The input matrix will have at least one row and one column
*/

function removeIslands(matrix) {
    // Write your code here
}

// Helper function to check if two matrices are equal
function areMatricesEqual(matrix1, matrix2) {
    if (matrix1.length !== matrix2.length) return false;
    for (let i = 0; i < matrix1.length; i++) {
        if (matrix1[i].length !== matrix2[i].length) return false;
        for (let j = 0; j < matrix1[i].length; j++) {
            if (matrix1[i][j] !== matrix2[i][j]) return false;
        }
    }
    return true;
}

// Helper function to create a deep copy of a matrix
function copyMatrix(matrix) {
    return matrix.map(row => [...row]);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            matrix: [
                [1, 0, 0, 0, 0, 0],
                [0, 1, 0, 1, 1, 1],
                [0, 0, 1, 0, 1, 0],
                [1, 1, 0, 0, 1, 0],
                [1, 0, 1, 1, 0, 0],
                [1, 0, 0, 0, 0, 1]
            ],
            expected: [
                [1, 0, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1],
                [0, 0, 0, 0, 1, 0],
                [1, 1, 0, 0, 1, 0],
                [1, 0, 0, 0, 0, 0],
                [1, 0, 0, 0, 0, 1]
            ],
            description: "Sample test case"
        },
        {
            matrix: [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1]
            ],
            expected: [
                [1, 1, 1],
                [1, 0, 1],
                [1, 1, 1]
            ],
            description: "No islands (all 1s touch border)"
        },
        {
            matrix: [
                [0, 0, 0],
                [0, 1, 0],
                [0, 0, 0]
            ],
            expected: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
            ],
            description: "Single island in center"
        },
        {
            matrix: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
            ],
            expected: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0]
            ],
            description: "All zeros"
        },
        {
            matrix: [
                [1, 1],
                [1, 1]
            ],
            expected: [
                [1, 1],
                [1, 1]
            ],
            description: "Small matrix, all ones"
        },
        {
            matrix: [
                [1, 0, 1],
                [0, 1, 0],
                [1, 0, 1]
            ],
            expected: [
                [1, 0, 1],
                [0, 0, 0],
                [1, 0, 1]
            ],
            description: "Checkerboard pattern"
        },
        {
            matrix: [
                [1, 0, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 0, 0, 1]
            ],
            expected: [
                [1, 0, 1, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 1]
            ],
            description: "Complex island pattern"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Make a copy of input matrix
        const matrix = copyMatrix(testCase.matrix);
        
        // Remove islands
        const result = removeIslands(matrix);
        
        // Compare with expected
        const passed = areMatricesEqual(result, testCase.expected);
        
        console.log("Input:");
        testCase.matrix.forEach(row => console.log(row.join(" ")));
        console.log("\nExpected:");
        testCase.expected.forEach(row => console.log(row.join(" ")));
        console.log("\nActual:");
        result.forEach(row => console.log(row.join(" ")));
        console.log(`\nStatus: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
