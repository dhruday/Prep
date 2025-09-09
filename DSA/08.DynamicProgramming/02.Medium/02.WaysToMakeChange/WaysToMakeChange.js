/*
Ways to Make Change

Problem Statement:
Write a function that takes in an array of distinct positive integers representing coin
denominations and a single non-negative integer n representing a target amount of money.
The function should return the number of ways to make change for that target amount
using the given coin denominations.

Note that an unlimited amount of coins is at your disposal.

Sample Input:
n = 6
denoms = [1, 5]

Sample Output:
2 // 1x1 + 1x5 and 6x1

Constraints:
- 1 ≤ denoms.length ≤ 100
- 1 ≤ denoms[i] ≤ 100
- All numbers in denoms will be unique
- 0 ≤ n ≤ 1000
*/

function numberOfWaysToMakeChange(n, denoms) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            n: 6,
            denoms: [1, 5],
            expected: 2,
            description: "Sample test case"
        },
        {
            n: 0,
            denoms: [2, 3, 4, 7],
            expected: 1,
            description: "Zero amount"
        },
        {
            n: 10,
            denoms: [1, 2, 5],
            expected: 10,
            description: "Classic coin denominations"
        },
        {
            n: 25,
            denoms: [1, 5, 10, 25],
            expected: 13,
            description: "US coin denominations"
        },
        {
            n: 7,
            denoms: [2, 4],
            expected: 0,
            description: "Impossible amount"
        },
        {
            n: 4,
            denoms: [1, 2, 3],
            expected: 4,
            description: "Small amount, multiple ways"
        },
        {
            n: 12,
            denoms: [2, 3, 7],
            expected: 4,
            description: "No ones available"
        },
        {
            n: 100,
            denoms: [1, 5, 10, 25],
            expected: 242,
            description: "Large amount"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate number of ways
        const result = numberOfWaysToMakeChange(testCase.n, testCase.denoms);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(`  Amount: ${testCase.n}`);
        console.log(`  Denominations: ${JSON.stringify(testCase.denoms)}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
