/*
Zigzag Traverse

Problem Statement:
Write a function that takes in an n x m two-dimensional array (that can be square-shaped when n == m) and
returns a one-dimensional array of all the array's elements in zigzag order.

Zigzag order starts at the top left corner of the two-dimensional array, goes down by one element, and
proceeds in a zigzag pattern all the way to the bottom right corner.

Sample Input:
array = [
  [1,  3,  4, 10],
  [2,  5,  9, 11],
  [6,  8, 12, 15],
  [7, 13, 14, 16],
]

Sample Output:
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

Test Cases:
1. array = [
     [1, 3, 4, 10],
     [2, 5, 9, 11],
     [6, 8, 12, 15],
     [7, 13, 14, 16],
   ]
   Expected Output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

2. array = [[1]]
   Expected Output: [1]

3. array = [
     [1, 2, 3],
     [4, 5, 6],
     [7, 8, 9],
   ]
   Expected Output: [1, 4, 2, 3, 5, 7, 8, 6, 9]

4. array = [
     [1, 2],
     [3, 4],
     [5, 6],
   ]
   Expected Output: [1, 3, 2, 4, 5, 6]

5. array = [
     [1, 2, 3, 4],
     [5, 6, 7, 8],
     [9, 10, 11, 12],
   ]
   Expected Output: [1, 5, 2, 3, 6, 9, 10, 7, 4, 8, 11, 12]

Solution Approaches:
1. Direction-based Approach: O(n) time | O(n) space
   - Track current position and direction
   - Handle boundary cases and direction changes
   - Build result array
*/

function zigzagTraverse(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [
            [1, 3, 4, 10],
            [2, 5, 9, 11],
            [6, 8, 12, 15],
            [7, 13, 14, 16]
        ],
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    },
    {
        array: [[1]],
        expected: [1]
    },
    {
        array: [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ],
        expected: [1, 4, 2, 3, 5, 7, 8, 6, 9]
    },
    {
        array: [
            [1, 2],
            [3, 4],
            [5, 6]
        ],
        expected: [1, 3, 2, 4, 5, 6]
    },
    {
        array: [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12]
        ],
        expected: [1, 5, 2, 3, 6, 9, 10, 7, 4, 8, 11, 12]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = zigzagTraverse(testCase.array.map(row => [...row]));
        console.log(`Test Case ${index + 1}:`);
        console.log('Array:');
        testCase.array.forEach(row => console.log(`  [${row}]`));
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
