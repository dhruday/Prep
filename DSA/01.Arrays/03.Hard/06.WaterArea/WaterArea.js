/*
Water Area

Problem Statement:
You're given an array of non-negative integers where each non-zero integer represents the height of a
pillar of width 1. Imagine water being poured over all of the pillars.

Write a function that returns the surface area of water trapped between the pillars viewed from the front.
Note that spilled water should be ignored.

Sample Input:
heights = [0, 8, 0, 0, 5, 0, 0, 10, 0, 0, 1, 1, 0, 3]

Sample Output:
48

// Below is a visual representation of the sample input:
//        |
//        |
// |      |
// |      |
// |      ||     |
// |      ||     |
// |  |   ||     |
// |  |   ||    |
// |  |   ||    |
// |  |   ||    |
// ________________
// The dots and vertical lines represent trapped water and pillars, respectively.
// Each vertical line and dot represents a unit of surface area.

Test Cases:
1. heights = [0, 8, 0, 0, 5, 0, 0, 10, 0, 0, 1, 1, 0, 3]
   Expected Output: 48

2. heights = [0, 1, 0, 2]
   Expected Output: 1

3. heights = []
   Expected Output: 0

4. heights = [0, 1, 2, 3, 4]
   Expected Output: 0

5. heights = [5, 0, 5]
   Expected Output: 5

Solution Approaches:
1. Two Pointer Approach: O(n) time | O(1) space
   - Track max heights from left and right
   - Calculate water at each position

2. Array Approach: O(n) time | O(n) space
   - Calculate max heights to left and right of each position
   - Calculate water at each position based on min of maxes
*/

function waterArea(heights) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        heights: [0, 8, 0, 0, 5, 0, 0, 10, 0, 0, 1, 1, 0, 3],
        expected: 48
    },
    {
        heights: [0, 1, 0, 2],
        expected: 1
    },
    {
        heights: [],
        expected: 0
    },
    {
        heights: [0, 1, 2, 3, 4],
        expected: 0
    },
    {
        heights: [5, 0, 5],
        expected: 5
    },
    {
        heights: [4, 2, 0, 3, 2, 5],
        expected: 9
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = waterArea([...testCase.heights]);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Heights: [${testCase.heights}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
