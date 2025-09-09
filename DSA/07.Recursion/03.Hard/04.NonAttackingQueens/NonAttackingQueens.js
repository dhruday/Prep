/*
Non-Attacking Queens (LeetCode 51: N-Queens)

Problem Statement:
Write a function that takes in a positive integer n and returns the number of valid
arrangements of n queens on an n x n chessboard. A valid arrangement is one where no
queens can attack each other. Queens can attack horizontally, vertically, and diagonally.

For example, for n = 4, there are 2 valid arrangements:
[
  [".Q..",    ["..Q.",
   "...Q",     "Q...",
   "Q...",     "...Q",
   "..Q."],    ".Q.."]
]

Sample Input:
n = 4

Sample Output:
2
// There are only 2 valid ways to arrange 4 queens on a 4x4 chessboard
// where they can't attack each other

Constraints:
- 1 ≤ n ≤ 12
- Return value should be an integer representing the number of valid arrangements
*/

function nonAttackingQueens(n) {
    // Write your code here
}

// Helper function to verify a board configuration
function isValidBoard(board) {
    const n = board.length;
    
    // Check each queen against all other queens
    for (let row = 0; row < n; row++) {
        const col = board[row];
        
        // Check against each other queen
        for (let otherRow = 0; otherRow < n; otherRow++) {
            if (otherRow === row) continue;
            
            const otherCol = board[otherRow];
            
            // Check if queens are in same column
            if (col === otherCol) return false;
            
            // Check if queens are in same diagonal
            if (Math.abs(row - otherRow) === Math.abs(col - otherCol)) return false;
        }
    }
    
    return true;
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: 4,
            expected: 2,
            description: "Sample test case (4x4 board)"
        },
        {
            input: 1,
            expected: 1,
            description: "Smallest possible board"
        },
        {
            input: 2,
            expected: 0,
            description: "Impossible case"
        },
        {
            input: 3,
            expected: 0,
            description: "Another impossible case"
        },
        {
            input: 5,
            expected: 10,
            description: "5x5 board"
        },
        {
            input: 6,
            expected: 4,
            description: "6x6 board"
        },
        {
            input: 7,
            expected: 40,
            description: "7x7 board"
        },
        {
            input: 8,
            expected: 92,
            description: "8x8 board (standard chess board)"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Count valid arrangements
        const result = nonAttackingQueens(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: n = ${testCase.input}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
