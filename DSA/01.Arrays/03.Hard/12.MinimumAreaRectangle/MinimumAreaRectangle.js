/*
Minimum Area Rectangle

Problem Statement:
You're given an array of points plotted on a 2D coordinate system. Each point is represented by an
array of two integers [x, y]. Write a function that returns the minimum area of any rectangle that
can be formed using any 4 of these points, with sides parallel to the x and y axes (i.e., only
rectangles with horizontal and vertical sides should be considered).

If no rectangle can be formed, your function should return 0.

Sample Input:
points = [
  [1, 5],
  [5, 1],
  [4, 2],
  [2, 4],
  [2, 2],
  [1, 2],
  [4, 5],
  [2, 5],
  [-1, -2],
]

Sample Output:
3
// The rectangle with area 3 can be formed with points [1, 5], [2, 5], [1, 2], and [2, 2]

Test Cases:
1. points = [[1, 5], [5, 1], [4, 2], [2, 4], [2, 2], [1, 2], [4, 5], [2, 5], [-1, -2]]
   Expected Output: 3

2. points = [[1, 1], [1, 2], [2, 1], [2, 2]]
   Expected Output: 1

3. points = [[1, 1], [1, 2], [2, 2]]
   Expected Output: 0

4. points = [[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]
   Expected Output: 16

5. points = [[0, 0], [1, 1], [2, 2]]
   Expected Output: 0

Solution Approaches:
1. Hash Set Approach: O(n²) time | O(n) space
   - Store points in hash set
   - Find diagonal points and check for other corners
   - Track minimum area found
*/

function minimumAreaRectangle(points) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        points: [[1, 5], [5, 1], [4, 2], [2, 4], [2, 2], [1, 2], [4, 5], [2, 5], [-1, -2]],
        expected: 3
    },
    {
        points: [[1, 1], [1, 2], [2, 1], [2, 2]],
        expected: 1
    },
    {
        points: [[1, 1], [1, 2], [2, 2]],
        expected: 0
    },
    {
        points: [[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]],
        expected: 16
    },
    {
        points: [[0, 0], [1, 1], [2, 2]],
        expected: 0
    },
    {
        points: [[1, 1], [1, 3], [3, 1], [3, 3], [2, 2]],
        expected: 4
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = minimumAreaRectangle(
            testCase.points.map(point => [...point])
        );
        console.log(`Test Case ${index + 1}:`);
        console.log(`Points: [${testCase.points.map(point => `[${point}]`)}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
