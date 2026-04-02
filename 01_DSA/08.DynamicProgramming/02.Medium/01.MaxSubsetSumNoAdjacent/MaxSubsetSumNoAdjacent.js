/*
Max Subset Sum No Adjacent

Problem Statement:
Write a function that takes in an array of positive integers and returns the maximum sum
that can be obtained by summing up numbers in the array without summing up adjacent
elements.

For example, given array = [7, 10, 12, 7, 9, 14], your function should return 33
(achieved by summing 7, 12, and 14).

Sample Input:
array = [7, 10, 12, 7, 9, 14]

Sample Output:
33 // 7 + 12 + 14

Constraints:
- 1 ≤ array.length ≤ 100
- 0 ≤ array[i] ≤ 1000
- All numbers in the input array will be positive integers
*/

function maxSubsetSumNoAdjacent(array) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            input: [7, 10, 12, 7, 9, 14],
            expected: 33,
            description: "Sample test case"
        },
        {
            input: [],
            expected: 0,
            description: "Empty array"
        },
        {
            input: [1],
            expected: 1,
            description: "Single element"
        },
        {
            input: [1, 2],
            expected: 2,
            description: "Two elements"
        },
        {
            input: [1, 2, 3, 1],
            expected: 4,
            description: "Small array"
        },
        {
            input: [75, 105, 120, 75, 90, 135],
            expected: 330,
            description: "Large numbers"
        },
        {
            input: [4, 3, 5, 200, 5, 3],
            expected: 207,
            description: "One very large number"
        },
        {
            input: [30, 25, 50, 55, 100, 120],
            expected: 205,
            description: "Increasing sequence"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate max subset sum
        const result = maxSubsetSumNoAdjacent(testCase.input);
        
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
