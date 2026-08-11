/*
Coin Change

Problem Statement:
Return the fewest coins needed to make amount, or -1 if the amount is impossible.
Each denomination may be used any number of times.

Solution:
Let dp[value] be the fewest coins required for value. Build from 0 to amount so
every subproblem needed by a denomination has already been solved.

Complexity: O(amount × number of coins) time | O(amount) space
*/

function minimumCoins(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;

    for (let value = 1; value <= amount; value++) {
        for (const coin of coins) {
            if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1);
        }
    }

    return dp[amount] === Infinity ? -1 : dp[amount];
}

function runTests() {
    const passed = minimumCoins([1, 2, 5], 11) === 3
        && minimumCoins([2], 3) === -1 && minimumCoins([1], 0) === 0;
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { minimumCoins };
