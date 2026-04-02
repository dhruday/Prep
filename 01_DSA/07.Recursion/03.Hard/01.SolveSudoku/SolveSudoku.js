/*
Solve Sudoku (LeetCode 37: Sudoku Solver)

Problem Statement:
Write a function that takes in a 9x9 2D array representing a partially filled Sudoku board
and modifies the board to create a solution to the given Sudoku problem. The function should
follow the rules of Sudoku:
1. Each row must contain the digits 1-9 without repetition
2. Each column must contain the digits 1-9 without repetition
3. Each of the 9 3x3 sub-boxes must contain the digits 1-9 without repetition

The input board will contain digits 1-9 and 0's, where 0 represents empty cells that need
to be filled.

Note: The board will be modified in place.

Sample Input:
[
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
]

Sample Output:
[
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9]
]

Constraints:
- board.length == 9
- board[i].length == 9
- board[i][j] is a digit 0-9
- It is guaranteed that the input board has only one solution
*/

function solveSudoku(board) {
    // Write your code here
}

// Helper functions for testing
function isValidSolution(board) {
    // Check rows
    for (let row = 0; row < 9; row++) {
        const seen = new Set();
        for (let col = 0; col < 9; col++) {
            const num = board[row][col];
            if (num === 0) return false;
            if (seen.has(num)) return false;
            seen.add(num);
        }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
        const seen = new Set();
        for (let row = 0; row < 9; row++) {
            const num = board[row][col];
            if (seen.has(num)) return false;
            seen.add(num);
        }
    }

    // Check 3x3 sub-boxes
    for (let box = 0; box < 9; box++) {
        const seen = new Set();
        const rowStart = Math.floor(box / 3) * 3;
        const colStart = (box % 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const num = board[rowStart + i][colStart + j];
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
    }

    return true;
}

function deepCopy(board) {
    return board.map(row => [...row]);
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [
                [5,3,0,0,7,0,0,0,0],
                [6,0,0,1,9,5,0,0,0],
                [0,9,8,0,0,0,0,6,0],
                [8,0,0,0,6,0,0,0,3],
                [4,0,0,8,0,3,0,0,1],
                [7,0,0,0,2,0,0,0,6],
                [0,6,0,0,0,0,2,8,0],
                [0,0,0,4,1,9,0,0,5],
                [0,0,0,0,8,0,0,7,9]
            ],
            description: "Sample test case"
        },
        {
            input: [
                [0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,3,0,8,5],
                [0,0,1,0,2,0,0,0,0],
                [0,0,0,5,0,7,0,0,0],
                [0,0,4,0,0,0,1,0,0],
                [0,9,0,0,0,0,0,0,0],
                [5,0,0,0,0,0,0,7,3],
                [0,0,2,0,1,0,0,0,0],
                [0,0,0,0,4,0,0,0,9]
            ],
            description: "Almost empty board"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Make a copy of the input board
        const board = deepCopy(testCase.input);
        
        console.log("Input Board:");
        console.log(board.map(row => row.join(" ")).join("\n"));
        
        // Solve the board
        solveSudoku(board);
        
        // Verify the solution
        const isValid = isValidSolution(board);
        
        console.log("\nOutput Board:");
        console.log(board.map(row => row.join(" ")).join("\n"));
        console.log(`Status: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!isValid) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
