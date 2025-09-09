/*
Line Through Points

Problem Statement:
You're given an array of points plotted on a 2D coordinate system. Each point is represented by an array
of two integers [x, y]. Write a function that returns the maximum number of points that a single line
(defined by a slope and a y-intercept) can pass through.

A line can pass through at least two points if the points are not identical.

The input array will contain at least one point.

Sample Input:
points = [
  [1, 1],
  [2, 2],
  [3, 3],
  [0, 4],
  [-2, 6],
  [4, 0],
  [2, 1],
]

Sample Output:
3 // A line passes through points [1, 1], [2, 2], and [3, 3]

Test Cases:
1. points = [[1, 1], [2, 2], [3, 3], [0, 4], [-2, 6], [4, 0], [2, 1]]
   Expected Output: 3

2. points = [[3, 3], [0, 0], [-1, -1], [2, 2]]
   Expected Output: 4

3. points = [[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]
   Expected Output: 3

4. points = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]
   Expected Output: 6

5. points = [[-1, 1], [1, 1], [-2, 2], [2, 2], [-3, 3], [3, 3]]
   Expected Output: 3

Solution Approaches:
1. Slope Calculation: O(n²) time | O(n) space
   - For each point, calculate slopes to all other points
   - Track points with same slope
   - Find maximum count
*/

function lineThroughPoints(points) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        points: [[1, 1], [2, 2], [3, 3], [0, 4], [-2, 6], [4, 0], [2, 1]],
        expected: 3
    },
    {
        points: [[3, 3], [0, 0], [-1, -1], [2, 2]],
        expected: 4
    },
    {
        points: [[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]],
        expected: 3
    },
    {
        points: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]],
        expected: 6
    },
    {
        points: [[-1, 1], [1, 1], [-2, 2], [2, 2], [-3, 3], [3, 3]],
        expected: 3
    },
    {
        points: [[1, 1], [2, 2], [2, 0], [3, 3], [1, -1], [4, 2]],
        expected: 3
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = lineThroughPoints(
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
