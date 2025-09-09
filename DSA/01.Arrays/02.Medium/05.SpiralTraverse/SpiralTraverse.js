/*
Spiral Traverse

Problem Statement:
Write a function that takes in an n x m two-dimensional array (that can be square-shaped when n == m)
and returns a one-dimensional array of all the array's elements in spiral order.

Spiral order starts at the top left corner of the two-dimensional array, goes to the right,
and proceeds in a spiral pattern all the way until every element has been visited.

Sample Input:
array = [
  [1,  2,  3,  4],
  [12, 13, 14, 5],
  [11, 16, 15, 6],
  [10, 9,  8,  7]
]

Sample Output:
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

Test Cases:
1. array = [
     [1,  2,  3,  4],
     [12, 13, 14, 5],
     [11, 16, 15, 6],
     [10, 9,  8,  7]
   ]
   Expected Output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

2. array = [[1]]
   Expected Output: [1]

3. array = [
     [1, 2, 3],
     [8, 9, 4],
     [7, 6, 5]
   ]
   Expected Output: [1, 2, 3, 4, 5, 6, 7, 8, 9]

4. array = [
     [1, 2],
     [4, 3]
   ]
   Expected Output: [1, 2, 3, 4]

Solution Approaches:
1. Iterative: O(n) time | O(n) space
   - Keep track of boundaries
   - Move in spiral pattern
   - Update boundaries after each direction change

2. Recursive: O(n) time | O(n) space
   - Recursively traverse perimeter
   - Update boundaries at each step
*/

function spiralTraverse(array) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [
            [1, 2, 3, 4],
            [12, 13, 14, 5],
            [11, 16, 15, 6],
            [10, 9, 8, 7]
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
            [8, 9, 4],
            [7, 6, 5]
        ],
        expected: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    {
        array: [
            [1, 2],
            [4, 3]
        ],
        expected: [1, 2, 3, 4]
    }
];

// Helper function to create deep copy of 2D array
function deepCopy(arr) {
    return arr.map(row => [...row]);
}

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = spiralTraverse(deepCopy(testCase.array));
        console.log(`Test Case ${index + 1}:`);
        console.log('Input Array:');
        testCase.array.forEach(row => console.log(row));
        console.log(`Your Output: [${result}]`);
        console.log(`Expected Output: [${testCase.expected}]`);
        console.log(`Status: ${JSON.stringify(result) === JSON.stringify(testCase.expected) ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
