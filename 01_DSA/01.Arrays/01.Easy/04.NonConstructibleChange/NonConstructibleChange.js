/*
Non-Constructible Change

Problem Statement:
Given an array of positive integers representing the values of coins in your possession, write a function
that returns the minimum amount of change (the minimum sum of money) that you cannot create.
The given coins can have any positive integer value and aren't necessarily unique (you can have multiple coins of the same value).

For example, if you're given coins = [1, 2, 5], the minimum amount of change that you can't create is 4.
If you're given no coins, the minimum amount of change that you can't create is 1.

Sample Input:
coins = [5, 7, 1, 1, 2, 3, 22]

Sample Output:
20

Explanation:
After sorting the coins array, we have [1, 1, 2, 3, 5, 7, 22]. With these values:
- We can make all amounts from 1 to 19
- We cannot make 20
- Therefore, 20 is the minimum amount of change that we cannot create

Test Cases:
1. coins = [5, 7, 1, 1, 2, 3, 22]
   Expected Output: 20
2. coins = [1, 1, 1, 1, 1]
   Expected Output: 6
3. coins = [1, 5, 1, 1, 1, 10, 15, 20, 100]
   Expected Output: 55
4. coins = [6, 4, 5, 1, 1, 8, 9]
   Expected Output: 3
5. coins = []
   Expected Output: 1

Solution Approaches:
1. Greedy Solution: O(nlog(n)) time | O(1) space
   - Sort the coins array
   - Keep track of the change we can create up to a point
   - If next coin > change + 1, we found our answer
*/

function nonConstructibleChange(coins) {
    // Write your code here
}

// Test Cases
const testCases = [
    {
        coins: [5, 7, 1, 1, 2, 3, 22],
        expected: 20
    },
    {
        coins: [1, 1, 1, 1, 1],
        expected: 6
    },
    {
        coins: [1, 5, 1, 1, 1, 10, 15, 20, 100],
        expected: 55
    },
    {
        coins: [6, 4, 5, 1, 1, 8, 9],
        expected: 3
    },
    {
        coins: [],
        expected: 1
    }
];

// Test runner
function runTests() {
    testCases.forEach((testCase, index) => {
        const result = nonConstructibleChange([...testCase.coins]); // Create a copy to avoid modifying original array
        console.log(`Test Case ${index + 1}:`);
        console.log(`Coins: [${testCase.coins}]`);
        console.log(`Your Output: ${result}`);
        console.log(`Expected Output: ${testCase.expected}`);
        console.log(`Status: ${result === testCase.expected ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log('-'.repeat(50));
    });
}

// Run the tests
runTests();
