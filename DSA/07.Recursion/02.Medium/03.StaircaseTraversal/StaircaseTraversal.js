/*
Staircase Traversal (LeetCode 70: Climbing Stairs with modifications)

Problem Statement:
You're given two positive integers: height and maxSteps. You're currently standing at step 0,
and you want to climb to the top of a staircase that has height number of steps.
In one move, you can climb anywhere between 1 and maxSteps steps.

Write a function that returns the number of ways you can climb to the top of the staircase.

Sample Input:
height = 4
maxSteps = 2

Sample Output:
5
// You can climb in the following ways:
// 1. [1, 1, 1, 1]
// 2. [1, 1, 2]
// 3. [1, 2, 1]
// 4. [2, 1, 1]
// 5. [2, 2]

Constraints:
- 1 ≤ height ≤ 100
- 1 ≤ maxSteps ≤ height
- The answer will be less than 2^32
*/

function staircaseTraversal(height, maxSteps) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            height: 4,
            maxSteps: 2,
            expected: 5,
            description: "Sample test case"
        },
        {
            height: 1,
            maxSteps: 1,
            expected: 1,
            description: "Minimal case"
        },
        {
            height: 5,
            maxSteps: 3,
            expected: 13,
            description: "Three max steps"
        },
        {
            height: 4,
            maxSteps: 3,
            expected: 7,
            description: "Height 4 with 3 max steps"
        },
        {
            height: 10,
            maxSteps: 2,
            expected: 89,
            description: "Large height with 2 steps"
        },
        {
            height: 6,
            maxSteps: 4,
            expected: 29,
            description: "Height 6 with 4 max steps"
        },
        {
            height: 3,
            maxSteps: 3,
            expected: 4,
            description: "Equal height and maxSteps"
        },
        {
            height: 8,
            maxSteps: 3,
            expected: 81,
            description: "Larger input"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate number of ways
        const result = staircaseTraversal(testCase.height, testCase.maxSteps);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: height = ${testCase.height}, maxSteps = ${testCase.maxSteps}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
