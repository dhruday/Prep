/*
Sunset Views

Problem Statement:
Given an array of buildings and a direction that all of the buildings face, return an array of the
indices of the buildings that can see the sunset.

A building can see the sunset if it's strictly taller than all of the buildings that come after it
in the direction that it faces.

The input array named buildings contains positive, non-zero integers representing the heights of
the buildings. A building at index i thus has a height denoted by buildings[i]. All of the
buildings face the same direction, and this direction is either east or west, denoted by the
input string named direction, which will always be either "EAST" or "WEST". In relation to the
input array, you can interpret these directions as right for east and left for west.

Important note: the indices in the output array should be sorted in ascending order.

Sample Input:
buildings = [3, 5, 4, 4, 3, 1, 3, 2]
direction = "EAST"

Sample Output:
[1, 3, 6, 7]
// Below is a visual representation of the sample input.
// Building heights: [3, 5, 4, 4, 3, 1, 3, 2]
// Building indices: [0, 1, 2, 3, 4, 5, 6, 7]
// The buildings are facing east, so building 7 can see the sunset because it's not blocked
// Building 6 is taller than building 7, so it can see the sunset
// Building 5 is shorter than building 6, so it cannot see the sunset
// Building 4 is shorter than building 6, so it cannot see the sunset
// Building 3 is taller than buildings 4, 5, 6, and 7, so it can see the sunset
// Building 2 is shorter than building 3, so it cannot see the sunset
// Building 1 is taller than buildings 2, 3, 4, 5, 6, and 7, so it can see the sunset
// Building 0 is shorter than building 1, so it cannot see the sunset

Test Cases:
1. buildings = [3, 5, 4, 4, 3, 1, 3, 2], direction = "EAST"
   Expected Output: [1, 3, 6, 7]

2. buildings = [3, 5, 4, 4, 3, 1, 3, 2], direction = "WEST"
   Expected Output: [0, 1]

3. buildings = [10, 11], direction = "EAST"
   Expected Output: [1]

4. buildings = [2, 4], direction = "WEST"
   Expected Output: [0, 1]

5. buildings = [1], direction = "EAST"
   Expected Output: [0]

Solution Approaches:
1. Iterative Approach: O(n) time | O(n) space
   - For EAST direction: Iterate right to left, keep track of max height
   - For WEST direction: Iterate left to right, keep track of max height
*/

function sunsetViews(buildings, direction) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        buildings: [3, 5, 4, 4, 3, 1, 3, 2],
        direction: "EAST",
        expected: [1, 3, 6, 7]
    },
    {
        buildings: [3, 5, 4, 4, 3, 1, 3, 2],
        direction: "WEST",
        expected: [0, 1]
    },
    {
        buildings: [10, 11],
        direction: "EAST",
        expected: [1]
    },
    {
        buildings: [2, 4],
        direction: "WEST",
        expected: [0, 1]
    },
    {
        buildings: [1],
        direction: "EAST",
        expected: [0]
    },
    {
        buildings: [7, 1, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        direction: "EAST",
        expected: [4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = sunsetViews([...testCase.buildings], testCase.direction);
        console.log(`Test Case ${index + 1}:`);
        console.log(`Buildings: [${testCase.buildings}]`);
        console.log(`Direction: ${testCase.direction}`);
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
