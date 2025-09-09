/*
Max Profits With K Transactions

Problem Statement:
Write a function that takes in an array of positive integers representing the prices
of a single stock on different days, and an integer k representing the maximum number
of transactions that can be made. A transaction consists of buying and selling one
share of the stock on different, not necessarily consecutive days.

The function should return the maximum profit that can be made by buying and selling
the stock, given that you can only engage in at most k transactions.

Note: You can only hold one share of the stock at a time; in other words, you can't
buy more than one share of the stock on any given day, and you can't buy a share if
you're still holding one.

Sample Input:
prices = [5, 11, 3, 50, 60, 90]
k = 2

Sample Output:
93 // Buy: 5, Sell: 11; Buy: 3, Sell: 90

Constraints:
- 0 ≤ k ≤ 100
- 0 ≤ prices.length ≤ 1000
- 0 ≤ prices[i] ≤ 1000
*/

function maxProfitWithKTransactions(prices, k) {
    // Write your code here
}

// Test Cases
function runTests() {
    const testCases = [
        {
            prices: [5, 11, 3, 50, 60, 90],
            k: 2,
            expected: 93,
            description: "Sample test case"
        },
        {
            prices: [1],
            k: 1,
            expected: 0,
            description: "Single price"
        },
        {
            prices: [1, 2],
            k: 1,
            expected: 1,
            description: "Two prices, one transaction"
        },
        {
            prices: [1, 2, 3, 4, 5],
            k: 2,
            expected: 4,
            description: "Strictly increasing prices"
        },
        {
            prices: [5, 4, 3, 2, 1],
            k: 2,
            expected: 0,
            description: "Strictly decreasing prices"
        },
        {
            prices: [1, 10, 1, 10, 1, 10],
            k: 3,
            expected: 27,
            description: "Multiple identical opportunities"
        },
        {
            prices: [10, 20, 5, 15, 25, 30, 15, 40],
            k: 3,
            expected: 60,
            description: "Complex price movements"
        },
        {
            prices: [1, 100, 2, 200, 3, 300],
            k: 2,
            expected: 497,
            description: "Large price differences"
        },
        {
            prices: [10, 5, 10, 5, 10, 5],
            k: 4,
            expected: 20,
            description: "Alternating prices"
        }
    ];

    let allTestsPassed = true;
    testCases.forEach((testCase, index) => {
        console.log(`\nTest Case ${index + 1} (${testCase.description}):`);
        
        // Calculate maximum profit
        const result = maxProfitWithKTransactions(testCase.prices, testCase.k);
        
        // Compare with expected
        const passed = result === testCase.expected;
        
        console.log(`Input:`);
        console.log(`  Prices: ${JSON.stringify(testCase.prices)}`);
        console.log(`  k: ${testCase.k}`);
        console.log(`Expected: ${testCase.expected}`);
        console.log(`Actual: ${result}`);
        console.log(`Status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        if (!passed) allTestsPassed = false;
    });

    console.log(`\nOverall Result: ${allTestsPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

// Run the tests
runTests();
