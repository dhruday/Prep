/*
Waterfall Streams

Problem Statement:
You're given a two-dimensional array that represents a structure of water sources and walls. The array
contains only 0s and 1s, where each 1 represents a wall and each 0 represents a water source or a free
space that water can flow through.

Water is poured from the top of the structure at a source represented by the first 0 in the first row
of the array. Water can only flow downwards and to the left and right of its current position if there
is a free space (0) in those directions. If water hits a wall (1), it splits evenly to the left and
right if possible. If one direction is blocked by a wall (1), all the water flows in the available
direction. If both directions are blocked, the water is trapped and can't flow further in that path.

Write a function that returns an array that contains the percentage of water that ends at each position
in the final row of the array. Percentages should be represented as decimals, with exactly two decimal
places (e.g., 0.25 represents 25%). The length of the returned array should be equal to the width of
the input array.

Sample Input:
array = [
  [0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 0, 1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0],
]
source = 3 // Water starts at index 3

Sample Output:
[0.00, 0.00, 0.00, 25.00, 0.00, 0.00, 0.00]
// The water flows as follows:
//  - First row: Water falls straight down at column 3
//  - Second row: Water hits a wall and splits evenly to the left and right
//  - Third row: Water on the right hits a wall and flows back left
//  - Fourth row: Water converges at column 3
//  - Fifth row: Water hits wall and stops
//  - Sixth row: 25% of the water ends up at column 3

Test Cases:
1. array = [
     [0, 0, 0, 0, 0, 0, 0],
     [1, 1, 1, 0, 1, 1, 1],
     [0, 0, 1, 0, 1, 0, 0],
     [0, 0, 0, 0, 0, 0, 0],
     [1, 1, 1, 1, 1, 1, 1],
     [0, 0, 0, 0, 0, 0, 0],
   ]
   source = 3
   Expected Output: [0.00, 0.00, 0.00, 25.00, 0.00, 0.00, 0.00]

2. array = [
     [0, 0, 0],
     [1, 0, 1],
     [1, 0, 1],
     [0, 0, 0],
   ]
   source = 1
   Expected Output: [0.00, 100.00, 0.00]

3. array = [
     [0, 0, 0, 0],
     [1, 1, 0, 1],
     [0, 0, 0, 0],
   ]
   source = 2
   Expected Output: [0.00, 0.00, 50.00, 50.00]

4. array = [
     [0, 0, 0, 0, 0],
     [1, 1, 0, 1, 1],
     [1, 1, 0, 1, 1],
     [1, 1, 0, 1, 1],
     [1, 1, 0, 1, 1],
   ]
   source = 2
   Expected Output: [0.00, 0.00, 100.00, 0.00, 0.00]

5. array = [
     [0],
     [0],
   ]
   source = 0
   Expected Output: [100.00]

Solution Approaches:
1. Simulation Approach: O(w * h * log(w)) time | O(w) space
   - Track water flow using percentages
   - Handle splits and merges
   - Calculate final percentages
*/

function waterfallStreams(array, source) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        array: [
            [0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 0, 1, 1, 1],
            [0, 0, 1, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        source: 3,
        expected: [0.00, 0.00, 0.00, 25.00, 0.00, 0.00, 0.00]
    },
    {
        array: [
            [0, 0, 0],
            [1, 0, 1],
            [1, 0, 1],
            [0, 0, 0],
        ],
        source: 1,
        expected: [0.00, 100.00, 0.00]
    },
    {
        array: [
            [0, 0, 0, 0],
            [1, 1, 0, 1],
            [0, 0, 0, 0],
        ],
        source: 2,
        expected: [0.00, 0.00, 50.00, 50.00]
    },
    {
        array: [
            [0, 0, 0, 0, 0],
            [1, 1, 0, 1, 1],
            [1, 1, 0, 1, 1],
            [1, 1, 0, 1, 1],
            [1, 1, 0, 1, 1],
        ],
        source: 2,
        expected: [0.00, 0.00, 100.00, 0.00, 0.00]
    },
    {
        array: [
            [0],
            [0],
        ],
        source: 0,
        expected: [100.00]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = waterfallStreams(
            testCase.array.map(row => [...row]),
            testCase.source
        );
        console.log(`Test Case ${index + 1}:`);
        console.log('Array:');
        testCase.array.forEach(row => console.log(`  [${row}]`));
        console.log(`Source: ${testCase.source}`);
        console.log(`Your Output: [${result.map(x => x.toFixed(2))}]`);
        console.log(`Expected Output: [${testCase.expected.map(x => x.toFixed(2))}]`);
        const passed = areArraysEqual(result, testCase.expected);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Helper function to compare arrays with floating point numbers
function areArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const epsilon = 0.01; // Allow small floating point differences
    for (let i = 0; i < arr1.length; i++) {
        if (Math.abs(arr1[i] - arr2[i]) > epsilon) return false;
    }
    return true;
}

// Run the tests
runTests();
