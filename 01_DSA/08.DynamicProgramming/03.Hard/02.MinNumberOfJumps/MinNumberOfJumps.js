/*
Min Number of Jumps

Problem Statement:
You're given a non-empty array of positive integers where each integer represents the
maximum number of steps you can take forward in the array. For example, if the element
at index 0 is 3, you can go from index 0 to index 1, 2, or 3.

Write a function that returns the minimum number of jumps needed to reach the final index.
Note that jumping from index i to index i + x always constitutes one jump, no matter how
large x is.

Sample Input:
array = [3, 4, 2, 1, 2, 3, 7, 1, 1, 1, 3]

Sample Output:
4 // 3 → 4 → 2 → 7 → 3

Constraints:
- 2 ≤ array.length ≤ 100
- 1 ≤ array[i] ≤ 100
- You can always reach the last index
*/

function minNumberOfJumps(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [3, 4, 2, 1, 2, 3, 7, 1, 1, 1, 3],
            expected: 4,
            description: "Sample test case"
        },
        {
            input: [1],
            expected: 0,
            description: "Single element"
        },
        {
            input: [1, 1],
            expected: 1,
            description: "Two elements"
        },
        {
            input: [2, 1, 1],
            expected: 1,
            description: "Can jump directly to end"
        },
        {
            input: [1, 1, 1, 1],
            expected: 3,
            description: "Must take one step at a time"
        },
        {
            input: [3, 1, 1, 1],
            expected: 1,
            description: "Can jump to end from start"
        },
        {
            input: [2, 3, 1, 1, 4],
            expected: 2,
            description: "Multiple possible paths"
        },
        {
            input: [1, 2, 5, 2, 1, 1, 1, 1],
            expected: 4,
            description: "Optimal path not obvious"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate minimum jumps
        const result = minNumberOfJumps(testCase.input);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input: ${JSON.stringify(testCase.input)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
