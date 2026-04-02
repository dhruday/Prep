/*
Min Number of Coins For Change

Problem Statement:
Write a function that takes in an array of positive integers representing coin denominations
and a single non-negative integer n representing a target amount of money. The function
should return the minimum number of coins needed to make change for that target amount
using the given coin denominations.

If it's impossible to make change for the target amount, return -1.

Note that you have access to an unlimited amount of coins.

Sample Input:
n = 7
denoms = [1, 5, 10]

Sample Output:
3 // 2x1 + 1x5

Constraints:
- 1 ≤ denoms.length ≤ 100
- 1 ≤ denoms[i] ≤ 100
- All numbers in denoms will be unique
- 0 ≤ n ≤ 1000
*/

function minNumberOfCoinsForChange(n, denoms) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            n: 7,
            denoms: [1, 5, 10],
            expected: 3,
            description: "Sample test case"
        },
        {
            n: 0,
            denoms: [2, 3, 4, 7],
            expected: 0,
            description: "Zero amount"
        },
        {
            n: 3,
            denoms: [2],
            expected: -1,
            description: "Impossible amount"
        },
        {
            n: 4,
            denoms: [1, 2, 3],
            expected: 2,
            description: "Small amount"
        },
        {
            n: 135,
            denoms: [39, 45, 130, 40, 4, 1],
            expected: 3,
            description: "Large amount with various coins"
        },
        {
            n: 10,
            denoms: [1, 3, 4],
            expected: 3,
            description: "Multiple solutions possible"
        },
        {
            n: 7,
            denoms: [2, 4],
            expected: -1,
            description: "No solution possible"
        },
        {
            n: 11,
            denoms: [1, 5, 10],
            expected: 2,
            description: "Greedy approach would fail"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate minimum coins needed
        const result = minNumberOfCoinsForChange(testCase.n, testCase.denoms);
        
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
